// Pure game logic orchestrator - no Babylon imports allowed
import { createStateMachine, StateMachine, GameState, GameEvent, RunContext } from './stateMachine';
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

    // Wire up UI button to semantic state events
    this.ui.onAdvance(() => {
      const event = this.getDefaultEventForCurrentState();
      if (event) {
        this.dispatch(event);
      }
    });

    // Initialize UI with current state
    this.ui.updateState(this.stateMachine.currentState);
  }

  dispatch(event: GameEvent): void {
    const result = this.stateMachine.dispatch(event);
    if (!result.ok) {
      const errorMessage = `[StateMachine:${result.error.code}] ${result.error.message}`;
      console.error(errorMessage, { state: result.error.state, event: result.error.event });
      return;
    }

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

  getRunContext(): RunContext {
    return this.stateMachine.getContext();
  }

  updateRunContext(updates: Partial<RunContext>): void {
    this.stateMachine.updateContext(updates);
  }

  private getDefaultEventForCurrentState(): GameEvent | null {
    switch (this.stateMachine.currentState) {
      case 'TITLE':
        return 'START_RUN';
      case 'MAP':
        return 'ENTER_ROOM';
      case 'EVENT':
        return 'RESOLVE_EVENT';
      case 'REWARD':
        return 'CLAIM_REWARD';
      case 'DEFEAT':
        return 'START_RUN';
      case 'COMBAT':
        return null;
    }
  }
}
