import * as BABYLON from 'babylonjs';
import { Game } from '../Game';
import { GameState } from '../stateMachine';
import { UI } from '../../ui/createUI';
import { CombatLog } from '../../rules/log';
import { CombatEngine } from '../../rules/combat';
import { createCombatUI, CombatUI } from '../../ui/createCombatUI';
import { CombatUIController } from '../../ui/CombatUIController';
import { CombatRenderer } from '../../render/CombatRenderer';
import { GameContent, RoomTemplate } from '../../content/loaders/types';
import { Character, Enemy } from '../../rules/types';
import { createEncounterFromRoom } from '../../content/loaders';
import { awardXp } from '../../rules/leveling';

export interface GameSessionConfig {
  ui: UI;
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
  private combatUI?: CombatUI;
  private combatController?: CombatUIController;
  private combatRenderer?: CombatRenderer;

  private persistentParty: Character[] | null = null;
  private currentRoomIndex: number = 0;
  private currentEncounterIndex: number = 0;

  constructor(config: GameSessionConfig) {
    this.scene = config.scene;
    this.content = config.content;
    this.onStateChangeCallback = config.onStateChange;
    this.game = new Game({
      ui: config.ui,
      onStateChange: (state) => this.handleStateChange(state),
    });
  }

  start(): void {
    this.handleStateChange(this.game.getCurrentState());
  }

  getCurrentState(): GameState {
    return this.game.getCurrentState();
  }

  private handleStateChange(state: GameState): void {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(state);
    }

    if (state === 'COMBAT') {
      this.startCombatEncounter();
      return;
    }

    this.hideCombat();
  }

  private getCurrentRoom(): RoomTemplate | null {
    const roomId = DUNGEON_ORDER[this.currentRoomIndex % DUNGEON_ORDER.length];
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
      (victor) => this.onCombatEnd(victor, party, enemies)
    );

    this.combatController.startTurn();
    this.combatController.show();
  }

  private onCombatEnd(victor: 'party' | 'enemy', party: Character[], enemies: Enemy[]): void {
    if (victor === 'party') {
      // Award XP and check for level ups
      const totalXp = enemies.reduce((sum, e) => sum + e.xpReward, 0);
      const levelUps = awardXp(party, totalXp, this.content.classes as any);

      for (const result of levelUps) {
        console.log(
          `${result.character.name} leveled up! Lv${result.oldLevel} -> Lv${result.newLevel} ` +
          `(HP+${result.hpGain}, MP+${result.mpGain}, ATK+${result.attackGain})`
        );
        if (result.newSkills.length > 0) {
          const skillNames = result.newSkills.map(id => this.content.skills.get(id)?.name ?? id);
          console.log(`  Learned: ${skillNames.join(', ')}`);
        }
      }

      // Advance to next encounter/room
      const room = this.getCurrentRoom();
      if (room) {
        this.currentEncounterIndex++;
        if (this.currentEncounterIndex >= room.encounters.length) {
          this.currentEncounterIndex = 0;
          this.currentRoomIndex++;
        }
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

  private hideCombat(): void {
    if (this.combatController) {
      this.combatController.hide();
    }
  }
}
