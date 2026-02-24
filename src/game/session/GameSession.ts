import * as BABYLON from 'babylonjs';
import { Game } from '../Game';
import { GameState } from '../stateMachine';
import { CombatLog } from '../../rules/log';
import { CombatEngine } from '../../rules/combat';
import { createCombatUI, CombatUI } from '../../ui/createCombatUI';
import { CombatUIController } from '../../ui/CombatUIController';
import { CombatRenderer } from '../../render/CombatRenderer';
import { GameContent, RoomTemplate } from '../../content/loaders/types';
import { Character, Enemy, CharacterClass } from '../../rules/types';
import { createEncounterFromRoom, createCharacterFromClass } from '../../content/loaders';
import { awardXp, LevelUpResult } from '../../rules/leveling';
import { createMainMenuScreen, MainMenuScreen } from '../../ui/screens/MainMenuScreen';
import { createDungeonMapScreen, DungeonMapScreen, DungeonRoomInfo } from '../../ui/screens/DungeonMapScreen';
import { createRewardScreen, RewardScreen, RewardData, RewardLevelUp } from '../../ui/screens/RewardScreen';
import { createDefeatScreen, DefeatScreen } from '../../ui/screens/DefeatScreen';
import { createPartySelectScreen, PartySelectScreen, PartyClassInfo } from '../../ui/screens/PartySelectScreen';
import { createEventScreen, EventScreen } from '../../ui/screens/EventScreen';

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

const REST_COST = 20;

export class GameSession {
  private readonly game: Game;
  private readonly scene: BABYLON.Scene;
  private readonly onStateChangeCallback?: (state: GameState) => void;
  private readonly content: GameContent;

  // Screen UIs
  private mainMenu: MainMenuScreen;
  private partySelectScreen: PartySelectScreen;
  private dungeonMap: DungeonMapScreen;
  private eventScreen: EventScreen;
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
  private gold: number = 0;

  constructor(config: GameSessionConfig) {
    this.scene = config.scene;
    this.content = config.content;
    this.onStateChangeCallback = config.onStateChange;

    this.game = new Game({
      onStateChange: (state) => this.handleStateChange(state),
    });

    // Create screen UIs
    this.mainMenu = createMainMenuScreen();
    this.partySelectScreen = createPartySelectScreen();
    this.dungeonMap = createDungeonMapScreen();
    this.eventScreen = createEventScreen();
    this.rewardScreen = createRewardScreen();
    this.defeatScreen = createDefeatScreen();

    this.wireScreenCallbacks();
  }

  private wireScreenCallbacks(): void {
    this.mainMenu.onNewGame(() => {
      this.showPartySelect();
    });

    this.partySelectScreen.onConfirm((selectedClassIds) => {
      this.partySelectScreen.hide();
      // Create characters from selected class templates
      this.persistentParty = selectedClassIds.map((classId, index) => {
        const classTemplate = this.content.classes.get(classId as CharacterClass);
        if (!classTemplate) throw new Error(`Unknown class: ${classId}`);
        return createCharacterFromClass(classTemplate, index);
      });
      this.gold = 0;
      this.currentRoomIndex = 0;
      this.currentEncounterIndex = 0;
      this.game.dispatch('START_RUN');
    });

    this.dungeonMap.onEnterRoom(() => {
      // MAP -> EVENT (event screen shows narrative before combat)
      this.game.dispatch('ENTER_ROOM');
    });

    this.dungeonMap.onDungeonComplete(() => {
      this.persistentParty = null;
      this.gold = 0;
      this.currentRoomIndex = 0;
      this.currentEncounterIndex = 0;
      this.game.reset();
    });

    this.dungeonMap.onRest(() => {
      if (this.gold >= REST_COST && this.persistentParty) {
        this.gold -= REST_COST;
        for (const char of this.persistentParty) {
          if (char.hp > 0) {
            char.hp = Math.min(char.maxHp, char.hp + Math.floor(char.maxHp * 0.5));
            char.mp = Math.min(char.maxMp, char.mp + Math.floor(char.maxMp * 0.5));
          }
        }
        this.showDungeonMap(); // refresh display
      }
    });

    this.eventScreen.onProceed(() => {
      // EVENT -> COMBAT
      this.game.dispatch('RESOLVE_EVENT');
    });

    this.rewardScreen.onContinue(() => {
      this.game.dispatch('CLAIM_REWARD');
    });

    this.defeatScreen.onReturnToTitle(() => {
      this.persistentParty = null;
      this.gold = 0;
      this.currentRoomIndex = 0;
      this.currentEncounterIndex = 0;
      this.game.reset();
    });
  }

  start(): void {
    this.handleStateChange(this.game.getCurrentState());
  }

  getCurrentState(): GameState {
    return this.game.getCurrentState();
  }

  private showPartySelect(): void {
    this.mainMenu.hide();
    const classInfos: PartyClassInfo[] = [];
    for (const [, cls] of this.content.classes) {
      classInfos.push({
        id: cls.id,
        name: cls.name,
        role: '',
        hp: cls.baseHp,
        mp: cls.baseMp,
        attack: cls.baseAttack,
        armor: cls.baseArmor,
        speed: cls.baseSpeed,
        skills: cls.startingSkills
          .filter(id => id !== 'basic-attack')
          .map(id => this.content.skills.get(id)?.name ?? id),
        color: '',
      });
    }
    this.partySelectScreen.show(classInfos);
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
      case 'EVENT':
        this.showEventScreen();
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
    this.partySelectScreen.hide();
    this.dungeonMap.hide();
    this.eventScreen.hide();
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
    const party = this.persistentParty ?? [];

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
      gold: this.gold,
      restCost: REST_COST,
    });
  }

  private showEventScreen(): void {
    const room = this.getCurrentRoom();
    if (!room) return;

    const encounterIndex = this.currentEncounterIndex % room.encounters.length;
    const encounter = room.encounters[encounterIndex];
    const encounterPreview: string[] = [];
    if (encounter) {
      for (const enemyId of encounter.enemyIds) {
        const template = this.content.enemies.get(enemyId);
        if (template) encounterPreview.push(template.name);
      }
    }

    this.eventScreen.show({
      roomName: room.name,
      roomDescription: room.description,
      encounterPreview,
      roomIndex: this.currentRoomIndex,
      totalRooms: DUNGEON_ORDER.length,
      flavorText: '',
    });
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

    // Use persistent party (carry HP/MP/XP between combats)
    const party = this.persistentParty ?? setup.party;
    if (!this.persistentParty) {
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
      this.gold += totalGold;
      const levelUps = awardXp(party, totalXp, this.content.classes as any);

      // Generate item drops
      const itemDrops = this.generateItemDrops(enemies);
      // Add dropped items to first alive party member's inventory
      if (itemDrops.length > 0) {
        const receiver = party.find(c => c.hp > 0) ?? party[0];
        for (const drop of itemDrops) {
          const existing = receiver.inventory.find(e => e.itemId === drop.itemId);
          if (existing) {
            existing.quantity += drop.quantity;
          } else {
            receiver.inventory.push({ itemId: drop.itemId, quantity: drop.quantity });
          }
        }
      }

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
        itemDrops: itemDrops.map(d => ({ name: d.name, quantity: d.quantity })),
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

      // Clear combat-only status effects between encounters
      for (const char of party) {
        char.statuses = [];
        char.isGuarding = false;
      }

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

  private generateItemDrops(enemies: Enemy[]): { itemId: string; name: string; quantity: number }[] {
    const drops = new Map<string, number>();

    const addDrop = (itemId: string, qty: number) => {
      drops.set(itemId, (drops.get(itemId) ?? 0) + qty);
    };

    for (const enemy of enemies) {
      const n = enemy.name.toLowerCase();

      // Common enemies drop basic supplies
      if (n.includes('goblin') || n.includes('wolf') || n.includes('bat')) {
        if (Math.random() < 0.3) addDrop('small-potion', 1);
      }

      // Magic enemies drop MP restoration
      if (n.includes('mage') || n.includes('shaman') || n.includes('sorcerer') || n.includes('necromancer')) {
        if (Math.random() < 0.4) addDrop('ether', 1);
      }

      // Undead drop antidotes (they often poison)
      if (n.includes('skeleton') || n.includes('undead') || n.includes('lich')) {
        if (Math.random() < 0.2) addDrop('antidote', 1);
      }

      // Boss-tier enemies (high HP) drop better items
      if (enemy.maxHp >= 60) {
        if (Math.random() < 0.5) addDrop('medium-potion', 1);
        if (Math.random() < 0.25) addDrop('strength-tonic', 1);
      }

      // Dragon drops premium items
      if (n.includes('dragon')) {
        if (Math.random() < 0.6) addDrop('large-potion', 1);
        if (Math.random() < 0.4) addDrop('mega-ether', 1);
      }
    }

    return Array.from(drops.entries()).map(([itemId, quantity]) => ({
      itemId,
      name: this.content.items.get(itemId)?.name ?? itemId,
      quantity,
    }));
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
    if (this.combatRenderer) {
      this.combatRenderer.clear();
      this.combatRenderer = undefined;
    }
  }
}
