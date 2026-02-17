// Pure state machine - no rendering dependencies
export type GameState = 'TITLE' | 'MAP' | 'EVENT' | 'COMBAT' | 'REWARD' | 'LOSE_COMBAT';

export interface StateMachine {
  currentState: GameState;
  advance(): void;
  transitionTo(state: GameState): void;
  getCurrentState(): GameState;
}

export function createStateMachine(initialState: GameState = 'TITLE'): StateMachine {
  let currentState = initialState;

  const transitions: Record<GameState, GameState> = {
    TITLE: 'MAP',
    MAP: 'EVENT',
    EVENT: 'COMBAT',
    COMBAT: 'REWARD',
    REWARD: 'MAP',
    LOSE_COMBAT: 'TITLE',
  };

  return {
    get currentState() {
      return currentState;
    },

    advance() {
      const nextState = transitions[currentState];
      console.log(`State transition: ${currentState} -> ${nextState}`);
      currentState = nextState;
    },

    transitionTo(state: GameState) {
      console.log(`State transition: ${currentState} -> ${state}`);
      currentState = state;
    },

    getCurrentState() {
      return currentState;
    },
  };
}
