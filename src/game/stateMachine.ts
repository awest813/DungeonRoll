// Pure state machine - no rendering dependencies
export type GameState = 'TITLE' | 'MAP' | 'EVENT' | 'COMBAT' | 'REWARD' | 'DEFEAT';

export type GameEvent =
  | 'START_RUN'
  | 'ENTER_ROOM'
  | 'RESOLVE_EVENT'
  | 'WIN_COMBAT'
  | 'LOSE_COMBAT'
  | 'CLAIM_REWARD';

export interface RunContext {
  currentRoom: number;
  encounterSeed: number;
  rewardsPending: boolean;
}

export interface TransitionResult {
  from: GameState;
  to: GameState;
  event: GameEvent;
}

export interface TransitionError {
  code: 'INVALID_TRANSITION' | 'INVALID_CONTEXT';
  message: string;
  state: GameState;
  event: GameEvent;
}

type TransitionOutcome =
  | { ok: true; nextState: GameState }
  | { ok: false; error: TransitionError };

export interface StateMachine {
  currentState: GameState;
  context: RunContext;
  dispatch(event: GameEvent): { ok: true; transition: TransitionResult } | { ok: false; error: TransitionError };
  updateContext(updates: Partial<RunContext>): void;
  getCurrentState(): GameState;
  getContext(): RunContext;
}

export function createStateMachine(
  initialState: GameState = 'TITLE',
  initialContext: Partial<RunContext> = {}
): StateMachine {
  let currentState = initialState;
  let context: RunContext = {
    currentRoom: initialContext.currentRoom ?? 0,
    encounterSeed: initialContext.encounterSeed ?? Date.now(),
    rewardsPending: initialContext.rewardsPending ?? false,
  };

  const resolveTransition = (state: GameState, event: GameEvent): TransitionOutcome => {
    switch (state) {
      case 'TITLE':
        if (event !== 'START_RUN') {
          return {
            ok: false,
            error: {
              code: 'INVALID_TRANSITION',
              message: `Event ${event} is not valid while in ${state}`,
              state,
              event,
            },
          };
        }

        return { ok: true, nextState: 'MAP' };

      case 'MAP':
        if (event !== 'ENTER_ROOM') {
          return {
            ok: false,
            error: {
              code: 'INVALID_TRANSITION',
              message: `Event ${event} is not valid while in ${state}`,
              state,
              event,
            },
          };
        }

        return { ok: true, nextState: 'EVENT' };

      case 'EVENT':
        if (event !== 'RESOLVE_EVENT') {
          return {
            ok: false,
            error: {
              code: 'INVALID_TRANSITION',
              message: `Event ${event} is not valid while in ${state}`,
              state,
              event,
            },
          };
        }

        if (context.encounterSeed % 5 === 0) {
          return { ok: true, nextState: 'REWARD' };
        }

        return { ok: true, nextState: 'COMBAT' };

      case 'COMBAT':
        if (event !== 'WIN_COMBAT' && event !== 'LOSE_COMBAT') {
          return {
            ok: false,
            error: {
              code: 'INVALID_TRANSITION',
              message: `Event ${event} is not valid while in ${state}`,
              state,
              event,
            },
          };
        }

        return { ok: true, nextState: event === 'WIN_COMBAT' ? 'REWARD' : 'DEFEAT' };

      case 'REWARD':
        if (event !== 'CLAIM_REWARD') {
          return {
            ok: false,
            error: {
              code: 'INVALID_TRANSITION',
              message: `Event ${event} is not valid while in ${state}`,
              state,
              event,
            },
          };
        }

        if (!context.rewardsPending) {
          return {
            ok: false,
            error: {
              code: 'INVALID_CONTEXT',
              message: 'Cannot claim rewards when rewardsPending is false',
              state,
              event,
            },
          };
        }

        return { ok: true, nextState: 'MAP' };

      case 'DEFEAT':
        if (event !== 'START_RUN') {
          return {
            ok: false,
            error: {
              code: 'INVALID_TRANSITION',
              message: `Event ${event} is not valid while in ${state}`,
              state,
              event,
            },
          };
        }

        return { ok: true, nextState: 'TITLE' };
    }
  };

  return {
    get currentState() {
      return currentState;
    },

    get context() {
      return context;
    },

    dispatch(event) {
      const transition = resolveTransition(currentState, event);
      if (!transition.ok) {
        return { ok: false, error: transition.error };
      }

      const previousState = currentState;
      currentState = transition.nextState;

      if (event === 'START_RUN') {
        context = {
          ...context,
          currentRoom: 0,
          rewardsPending: false,
          encounterSeed: Date.now(),
        };
      }

      if (event === 'ENTER_ROOM') {
        context = {
          ...context,
          currentRoom: context.currentRoom + 1,
          encounterSeed: context.encounterSeed + 1,
          rewardsPending: false,
        };
      }

      if (event === 'WIN_COMBAT') {
        context = {
          ...context,
          rewardsPending: true,
        };
      }

      if (event === 'LOSE_COMBAT') {
        context = {
          ...context,
          rewardsPending: false,
        };
      }

      if (event === 'CLAIM_REWARD') {
        context = {
          ...context,
          rewardsPending: false,
        };
      }

      if (event === 'RESOLVE_EVENT' && transition.nextState === 'REWARD') {
        context = {
          ...context,
          rewardsPending: true,
        };
      }

      return {
        ok: true,
        transition: {
          from: previousState,
          to: currentState,
          event,
        },
      };
    },

    updateContext(updates) {
      context = {
        ...context,
        ...updates,
      };
    },

    getCurrentState() {
      return currentState;
    },

    getContext() {
      return context;
    },
  };
}
