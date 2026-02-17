import * as BABYLON from 'babylonjs';
import { Game } from '../Game';
import { GameState } from '../stateMachine';
import { UI } from '../../ui/createUI';
import { CombatLog } from '../../rules/log';
import { CombatEngine } from '../../rules/combat';
import { createCombatUI, CombatUI } from '../../ui/createCombatUI';
import { CombatUIController } from '../../ui/CombatUIController';
import { CombatRenderer } from '../../render/CombatRenderer';
import { createInitialRun } from '../bootstrap/createInitialRun';
import {
  applyRewardChoice,
  clearRunSnapshot,
  createRunState,
  generateRewardChoices,
  loadRunSnapshot,
  RunState,
  saveRunSnapshot,
} from '../RunState';

export interface GameSessionConfig {
  ui: UI;
  scene: BABYLON.Scene;
  onStateChange?: (state: GameState) => void;
}

export class GameSession {
  private readonly game: Game;
  private readonly ui: UI;
  private readonly scene: BABYLON.Scene;
  private readonly onStateChangeCallback?: (state: GameState) => void;
  private combatUI?: CombatUI;
  private combatController?: CombatUIController;
  private runState: RunState | null;

  constructor(config: GameSessionConfig) {
    this.ui = config.ui;
    this.scene = config.scene;
    this.onStateChangeCallback = config.onStateChange;
    this.runState = loadRunSnapshot();

    this.game = new Game({
      ui: config.ui,
      onStateChange: (state) => this.handleStateChange(state),
    });

    this.ui.onRestart(() => {
      this.startNewRun();
      this.game.transitionTo('MAP');
    });

    this.ui.onRewardSelect((rewardId) => {
      if (!this.runState) {
        return;
      }
      const selected = this.runState.currentRewards.find((reward) => reward.id === rewardId);
      if (!selected) {
        return;
      }
      applyRewardChoice(this.runState, selected);
      saveRunSnapshot(this.runState);
      this.ui.clearRewardChoices();
      this.game.advance();
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

    if (state === 'TITLE') {
      const summary = this.runState
        ? `Room ${this.runState.room} · Gold ${this.runState.gold} · Items ${this.runState.inventory.length}`
        : 'No saved run yet.';
      this.ui.setTitleOptions({ canContinue: Boolean(this.runState), summary });
      this.hideCombat();
      return;
    }

    if (state === 'MAP') {
      if (!this.runState) {
        this.startNewRun();
      }
      this.ui.clearRewardChoices();
      saveRunSnapshot(this.runState!);
      this.hideCombat();
      return;
    }

    if (state === 'COMBAT') {
      this.startCombatEncounter();
      return;
    }

    if (state === 'REWARD') {
      if (!this.runState) {
        return;
      }
      this.runState.currentRewards = generateRewardChoices();
      this.ui.showRewardChoices(this.runState.currentRewards);
      this.hideCombat();
      return;
    }

    if (state === 'LOSE_COMBAT') {
      this.hideCombat();
      this.game.advance();
      return;
    }

    this.hideCombat();
  }

  private startNewRun(): void {
    this.runState = createRunState();
    clearRunSnapshot();
    saveRunSnapshot(this.runState);
  }

  private startCombatEncounter(): void {
    if (!this.runState) {
      this.startNewRun();
    }

    const run = this.runState!;
    const fallbackEnemy = createInitialRun().enemy;
    const party = run.party;
    const enemy = {
      ...fallbackEnemy,
      id: `enemy_room_${run.room}`,
      name: `Goblin Chief (Room ${run.room})`,
      hp: fallbackEnemy.maxHp + run.roomsCleared * 4,
      maxHp: fallbackEnemy.maxHp + run.roomsCleared * 4,
      attack: fallbackEnemy.attack + Math.floor(run.roomsCleared / 2),
    };

    const combatLog = new CombatLog();
    const combatEngine = new CombatEngine(party, enemy, combatLog);

    if (!this.combatUI) {
      this.combatUI = createCombatUI();
    }

    const combatRenderer = new CombatRenderer(this.scene);
    combatRenderer.createPartyMeshes(party);
    combatRenderer.createEnemyMesh(enemy);

    this.combatController = new CombatUIController(
      combatEngine,
      combatLog,
      this.combatUI,
      party,
      enemy,
      run.inventory,
      combatRenderer,
      (victor) => {
        if (victor === 'party') {
          this.game.advance();
          return;
        }

        this.game.transitionTo('LOSE_COMBAT');
      }
    );

    this.combatController.startTurn();
    this.combatController.show();
  }

  private hideCombat(): void {
    if (this.combatController) {
      this.combatController.hide();
    }
  }
}
