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
import { GameContent } from '../../content/loaders/types';

export interface GameSessionConfig {
  ui: UI;
  scene: BABYLON.Scene;
  content: GameContent;
  onStateChange?: (state: GameState) => void;
}

export class GameSession {
  private readonly game: Game;
  private readonly scene: BABYLON.Scene;
  private readonly onStateChangeCallback?: (state: GameState) => void;
  private readonly content: GameContent;
  private combatUI?: CombatUI;
  private combatController?: CombatUIController;

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

  private startCombatEncounter(): void {
    const { party, enemy } = createInitialRun(this.content);
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
      combatRenderer,
      (victor) => this.game.dispatch(victor === 'party' ? 'WIN_COMBAT' : 'LOSE_COMBAT')
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
