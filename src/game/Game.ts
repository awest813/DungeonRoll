// Pure game logic orchestrator - no Babylon imports allowed
import { createStateMachine, StateMachine, GameState } from './stateMachine';
import { UI } from '../ui/createUI';

export interface GameConfig {
  ui: UI;
  onStateChange?: (state: GameState) => void;
}

export class Game {
  private stateMachine: StateMachine;
  private ui: UI;
  private onStateChangeCallback?: (state: GameState) => void;

  constructor(config: GameConfig) {
    this.ui = config.ui;
    this.onStateChangeCallback = config.onStateChange;
    this.stateMachine = createStateMachine('TITLE');

    // Wire up UI button to advance state
    this.ui.onAdvance(() => this.advance());

    // Initialize UI with current state
    this.ui.updateState(this.stateMachine.currentState);
  }

  advance(): void {
    this.stateMachine.advance();
    const newState = this.stateMachine.currentState;

    // Update UI
    this.ui.updateState(newState);

    // Notify renderer if callback exists
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(newState);
    }
  }

  getCurrentState(): GameState {
    return this.stateMachine.currentState;
  }
}
