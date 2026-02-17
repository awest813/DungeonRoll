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

    this.ui.onAdvance(() => this.advance());
    this.ui.updateState(this.stateMachine.currentState);
  }

  advance(): void {
    this.stateMachine.advance();
    this.emitState();
  }

  transitionTo(state: GameState): void {
    this.stateMachine.transitionTo(state);
    this.emitState();
  }

  private emitState(): void {
    const newState = this.stateMachine.currentState;
    this.ui.updateState(newState);

    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(newState);
    }
  }

  getCurrentState(): GameState {
    return this.stateMachine.currentState;
  }
}
