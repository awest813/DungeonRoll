// Pure game logic orchestrator - no Babylon imports allowed
import { createStateMachine, StateMachine, GameState, GameEvent, RunContext } from './stateMachine';

export interface GameConfig {
  onStateChange?: (state: GameState) => void;
}

export class Game {
  private stateMachine: StateMachine;
  private onStateChangeCallback?: (state: GameState) => void;

  constructor(config: GameConfig) {
    this.onStateChangeCallback = config.onStateChange;
    this.stateMachine = createStateMachine('TITLE');
  }

  dispatch(event: GameEvent): void {
    const result = this.stateMachine.dispatch(event);
    if (!result.ok) {
      const errorMessage = `[StateMachine:${result.error.code}] ${result.error.message}`;
      console.error(errorMessage, { state: result.error.state, event: result.error.event });
      return;
    }

    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(this.stateMachine.currentState);
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
}
