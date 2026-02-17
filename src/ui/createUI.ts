import { GameState } from '../game/stateMachine';

export interface UI {
  updateState(state: GameState): void;
  onAdvance(callback: () => void): void;
  destroy(): void;
}

export function createUI(): UI {
  // Create overlay container
  const container = document.createElement('div');
  container.id = 'ui-overlay';
  container.style.cssText = `
    position: absolute;
    top: 20px;
    left: 20px;
    font-family: 'Courier New', monospace;
    color: #fff;
    z-index: 100;
    pointer-events: none;
  `;

  // State display
  const stateDisplay = document.createElement('div');
  stateDisplay.style.cssText = `
    background: rgba(0, 0, 0, 0.7);
    padding: 15px 20px;
    border-radius: 5px;
    margin-bottom: 10px;
  `;
  stateDisplay.innerHTML = `
    <div style="font-size: 12px; color: #aaa;">Current State:</div>
    <div id="state-value" style="font-size: 24px; font-weight: bold; margin-top: 5px;">TITLE</div>
  `;

  // Next button
  const button = document.createElement('button');
  button.id = 'next-button';
  button.textContent = 'Next';
  button.style.cssText = `
    background: #4CAF50;
    color: white;
    border: none;
    padding: 12px 24px;
    font-size: 14px;
    font-family: 'Courier New', monospace;
    border-radius: 5px;
    cursor: pointer;
    pointer-events: auto;
    transition: background 0.2s;
  `;
  button.onmouseenter = () => {
    button.style.background = '#45a049';
  };
  button.onmouseleave = () => {
    button.style.background = '#4CAF50';
  };

  container.appendChild(stateDisplay);
  container.appendChild(button);
  document.body.appendChild(container);

  let advanceCallback: (() => void) | null = null;

  button.addEventListener('click', () => {
    if (advanceCallback) {
      advanceCallback();
    }
  });

  return {
    updateState(state: GameState) {
      const stateValue = document.getElementById('state-value');
      if (stateValue) {
        stateValue.textContent = state;
      }
    },

    onAdvance(callback: () => void) {
      advanceCallback = callback;
    },

    destroy() {
      container.remove();
    },
  };
}
