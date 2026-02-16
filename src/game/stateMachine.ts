// Pure state machine - no rendering dependencies
export type GameState = 'TITLE' | 'MAP' | 'EVENT' | 'COMBAT' | 'REWARD';

export interface StateMachine {
  currentState: GameState;
  advance(): void;
  getCurrentState(): GameState;
}

export function createStateMachine(initialState: GameState = 'TITLE'): StateMachine {
  let currentState = initialState;

  // State transition map: TITLE -> MAP -> EVENT -> COMBAT -> REWARD -> MAP (loop)
  const transitions: Record<GameState, GameState> = {
    TITLE: 'MAP',
    MAP: 'EVENT',
    EVENT: 'COMBAT',
    COMBAT: 'REWARD',
    REWARD: 'MAP',
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

    getCurrentState() {
      return currentState;
    },
  };
}
