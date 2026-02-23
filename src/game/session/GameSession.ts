import * as BABYLON from 'babylonjs';
import { Game } from '../Game';
import { GameState } from '../stateMachine';
import { CombatLog } from '../../rules/log';
import { CombatEngine } from '../../rules/combat';
import { createCombatUI, CombatUI } from '../../ui/createCombatUI';
import { CombatUIController } from '../../ui/CombatUIController';
import { CombatRenderer } from '../../render/CombatRenderer';
import { GameContent, RoomTemplate } from '../../content/loaders/types';
import { Character, Enemy } from '../../rules/types';
import { createEncounterFromRoom } from '../../content/loaders';
import { awardXp, LevelUpResult } from '../../rules/leveling';
import { createMainMenuScreen, MainMenuScreen } from '../../ui/screens/MainMenuScreen';
import { createDungeonMapScreen, DungeonMapScreen, DungeonRoomInfo } from '../../ui/screens/DungeonMapScreen';
import { createRewardScreen, RewardScreen, RewardData, RewardLevelUp } from '../../ui/screens/RewardScreen';
import { createDefeatScreen, DefeatScreen } from '../../ui/screens/DefeatScreen';

export interface GameSessionConfig {
  scene: BABYLON.Scene;
  content: GameContent;
  onStateChange?: (state: GameState) => void;
}

const DUNGEON_ORDER = [
  'entry-hall',
  'goblin-den',
  'bone-corridor',
  'wolf-den',
  'troll-bridge',
  'dark-sanctum',
  'dragon-lair',
];

export class GameSession {
  private readonly game: Game;
  private readonly scene: BABYLON.Scene;
  private readonly onStateChangeCallback?: (state: GameState) => void;
  private readonly content: GameContent;

  // Screen UIs
  private mainMenu: MainMenuScreen;
  private dungeonMap: DungeonMapScreen;
  private rewardScreen: RewardScreen;
  private defeatScreen: DefeatScreen;
  private combatUI?: CombatUI;
  private combatController?: CombatUIController;
  private combatRenderer?: CombatRenderer;

  // Game state
  private persistentParty: Character[] | null = null;
  private currentRoomIndex: number = 0;
  private currentEncounterIndex: number = 0;
  private pendingRewardData: RewardData | null = null;

  constructor(config: GameSessionConfig) {
    this.scene = config.scene;
    this.content = config.content;
    this.onStateChangeCallback = config.onStateChange;

    this.game = new Game({
      onStateChange: (state) => this.handleStateChange(state),
    });

    // Create screen UIs
    this.mainMenu = createMainMenuScreen();
    this.dungeonMap = createDungeonMapScreen();
    this.rewardScreen = createRewardScreen();
    this.defeatScreen = createDefeatScreen();

    this.wireScreenCallbacks();
  }

  private wireScreenCallbacks(): void {
    this.mainMenu.onNewGame(() => {
      this.startNewGame();
    });

    this.dungeonMap.onEnterRoom(() => {
      // MAP -> EVENT -> COMBAT (auto-transition through EVENT)
      this.game.dispatch('ENTER_ROOM');
      this.game.dispatch('RESOLVE_EVENT');
    });

    this.rewardScreen.onContinue(() => {
      this.game.dispatch('CLAIM_REWARD');
    });

    this.defeatScreen.onReturnToTitle(() => {
      this.game.dispatch('START_RUN');
    });
  }

  start(): void {
    this.handleStateChange(this.game.getCurrentState());
  }

  getCurrentState(): GameState {
    return this.game.getCurrentState();
  }

  private startNewGame(): void {
    this.persistentParty = null;
    this.currentRoomIndex = 0;
    this.currentEncounterIndex = 0;
    this.pendingRewardData = null;
    this.game.dispatch('START_RUN');
  }

  private handleStateChange(state: GameState): void {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(state);
    }

    this.hideAllScreens();

    switch (state) {
      case 'TITLE':
        this.mainMenu.show();
        break;
      case 'MAP':
        this.showDungeonMap();
        break;
      case 'COMBAT':
        this.startCombatEncounter();
        break;
      case 'REWARD':
        this.showRewardScreen();
        break;
      case 'DEFEAT':
        this.defeatScreen.show();
        break;
    }
  }

  private hideAllScreens(): void {
    this.mainMenu.hide();
    this.dungeonMap.hide();
    this.rewardScreen.hide();
    this.defeatScreen.hide();
    this.hideCombat();
  }

  private getDungeonRoomInfos(): DungeonRoomInfo[] {
    return DUNGEON_ORDER.map(roomId => {
      const room = this.content.rooms.get(roomId);
      return {
        name: room?.name ?? roomId,
        description: room?.description ?? '',
        recommendedLevel: room?.recommendedLevel ?? 1,
      };
    });
  }

  private showDungeonMap(): void {
    const room = this.getCurrentRoom();
    const encounterIndex = room ? this.currentEncounterIndex % room.encounters.length : 0;
    const encounter = room?.encounters[encounterIndex];

    // Build encounter preview from enemy names
    const encounterPreview: string[] = [];
    if (encounter) {
      for (const enemyId of encounter.enemyIds) {
        const template = this.content.enemies.get(enemyId);
        if (template) encounterPreview.push(template.name);
      }
    }

    // Build party data
    const party = this.persistentParty ?? this.getDefaultParty();

    this.dungeonMap.show({
      rooms: this.getDungeonRoomInfos(),
      currentRoomIndex: this.currentRoomIndex,
      party: party.map(c => ({
        name: c.name,
        characterClass: c.characterClass,
        hp: c.hp,
        maxHp: c.maxHp,
        mp: c.mp,
        maxMp: c.maxMp,
        level: c.level,
      })),
      encounterPreview,
    });
  }

  private getDefaultParty(): Character[] {
    const firstRoom = this.content.rooms.get(DUNGEON_ORDER[0]);
    if (!firstRoom) return [];
    const setup = createEncounterFromRoom(this.content, firstRoom.id, firstRoom.encounters[0].id);
    return setup.party;
  }

  private getCurrentRoom(): RoomTemplate | null {
    if (this.currentRoomIndex >= DUNGEON_ORDER.length) return null;
    const roomId = DUNGEON_ORDER[this.currentRoomIndex];
    return this.content.rooms.get(roomId) ?? null;
  }

  private startCombatEncounter(): void {
    const room = this.getCurrentRoom();
    if (!room) {
      console.error('No room found for current index:', this.currentRoomIndex);
      return;
    }

    const encounterIndex = this.currentEncounterIndex % room.encounters.length;
    const encounter = room.encounters[encounterIndex];

    const setup = createEncounterFromRoom(this.content, room.id, encounter.id);

    // Use persistent party if available (carry HP/MP/XP between combats)
    let party: Character[];
    if (this.persistentParty) {
      party = this.persistentParty;
    } else {
      party = setup.party;
      this.persistentParty = party;
    }

    const enemies = setup.enemies;

    const combatLog = new CombatLog();
    combatLog.add(`=== ${room.name}: ${room.description} ===`);
    combatLog.add(`Encounter: ${enemies.map(e => e.name).join(', ')}`);
    combatLog.add('');

    const combatEngine = new CombatEngine(party, enemies, combatLog, this.content);

    if (!this.combatUI) {
      this.combatUI = createCombatUI();
    }

    if (this.combatRenderer) {
      this.combatRenderer.clear();
    }

    const combatRenderer = new CombatRenderer(this.scene);
    this.combatRenderer = combatRenderer;
    combatRenderer.createPartyMeshes(party);
    combatRenderer.createEnemyMeshes(enemies);

    this.combatController = new CombatUIController(
      combatEngine,
      combatLog,
      this.combatUI,
      party,
      enemies,
      this.content,
      combatRenderer,
      (victor) => this.onCombatEnd(victor, party, enemies, room)
    );

    this.combatController.startTurn();
    this.combatController.show();
  }

  private onCombatEnd(
    victor: 'party' | 'enemy',
    party: Character[],
    enemies: Enemy[],
    room: RoomTemplate
  ): void {
    if (victor === 'party') {
      // Award XP and check for level ups
      const totalXp = enemies.reduce((sum, e) => sum + e.xpReward, 0);
      const totalGold = enemies.reduce((sum, e) => sum + e.goldReward, 0);
      const levelUps = awardXp(party, totalXp, this.content.classes as any);

      // Prepare reward data for the reward screen
      const rewardLevelUps: RewardLevelUp[] = levelUps.map((lu: LevelUpResult) => ({
        characterName: lu.character.name,
        oldLevel: lu.oldLevel,
        newLevel: lu.newLevel,
        hpGain: lu.hpGain,
        mpGain: lu.mpGain,
        attackGain: lu.attackGain,
        armorGain: lu.armorGain,
        speedGain: lu.speedGain,
        newSkills: lu.newSkills.map(id => this.content.skills.get(id)?.name ?? id),
      }));

      this.pendingRewardData = {
        xpEarned: totalXp,
        goldEarned: totalGold,
        levelUps: rewardLevelUps,
        party: party.map(c => ({
          name: c.name,
          hp: c.hp,
          maxHp: c.maxHp,
          mp: c.mp,
          maxMp: c.maxMp,
          level: c.level,
          xp: c.xp,
          xpToNext: c.xpToNext,
        })),
        roomName: room.name,
      };

      // Advance to next encounter/room
      this.currentEncounterIndex++;
      if (this.currentEncounterIndex >= room.encounters.length) {
        this.currentEncounterIndex = 0;
        this.currentRoomIndex++;
      }

      this.game.dispatch('WIN_COMBAT');
    } else {
      // Reset on defeat
      this.persistentParty = null;
      this.currentRoomIndex = 0;
      this.currentEncounterIndex = 0;
      this.game.dispatch('LOSE_COMBAT');
    }
  }

  private showRewardScreen(): void {
    if (this.pendingRewardData) {
      this.rewardScreen.show(this.pendingRewardData);
      this.pendingRewardData = null;
    }
  }

  private hideCombat(): void {
    if (this.combatController) {
      this.combatController.hide();
    }
  }
}
