import { GameState } from '../game/stateMachine';
import { RewardEntry } from '../content/gameContent';

export interface TitleOptions {
  canContinue: boolean;
  summary: string;
}

export interface UI {
  updateState(state: GameState): void;
  onAdvance(callback: () => void): void;
  onRestart(callback: () => void): void;
  onRewardSelect(callback: (rewardId: string) => void): void;
  setTitleOptions(options: TitleOptions): void;
  showRewardChoices(rewards: RewardEntry[]): void;
  clearRewardChoices(): void;
  destroy(): void;
}

export function createUI(): UI {
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
    max-width: 420px;
  `;

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
    <div id="run-summary" style="font-size: 12px; color: #8bc34a; margin-top: 8px;"></div>
  `;

  const button = document.createElement('button');
  button.id = 'next-button';
  button.textContent = 'Start Run';
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
    margin-right: 8px;
  `;

  const restartButton = document.createElement('button');
  restartButton.id = 'restart-button';
  restartButton.textContent = 'New Run';
  restartButton.style.cssText = `
    background: #f44336;
    color: white;
    border: none;
    padding: 12px 24px;
    font-size: 14px;
    font-family: 'Courier New', monospace;
    border-radius: 5px;
    cursor: pointer;
    pointer-events: auto;
    transition: background 0.2s;
    display: none;
  `;

  const rewardPanel = document.createElement('div');
  rewardPanel.id = 'reward-panel';
  rewardPanel.style.cssText = `
    margin-top: 10px;
    background: rgba(0, 0, 0, 0.75);
    border: 1px solid #ffc107;
    border-radius: 5px;
    padding: 10px;
    display: none;
    pointer-events: auto;
  `;

  container.appendChild(stateDisplay);
  container.appendChild(button);
  container.appendChild(restartButton);
  container.appendChild(rewardPanel);
  document.body.appendChild(container);

  let advanceCallback: (() => void) | null = null;
  let restartCallback: (() => void) | null = null;
  let rewardCallback: ((rewardId: string) => void) | null = null;

  button.addEventListener('click', () => advanceCallback?.());
  restartButton.addEventListener('click', () => restartCallback?.());

  return {
    updateState(state: GameState) {
      const stateValue = document.getElementById('state-value');
      if (stateValue) {
        stateValue.textContent = state;
      }

      const isReward = state === 'REWARD';
      button.style.display = isReward ? 'none' : 'inline-block';
      restartButton.style.display = state === 'TITLE' ? 'inline-block' : 'none';
      if (!isReward) {
        rewardPanel.style.display = 'none';
      }
    },

    onAdvance(callback: () => void) {
      advanceCallback = callback;
    },

    onRestart(callback: () => void) {
      restartCallback = callback;
    },

    onRewardSelect(callback: (rewardId: string) => void) {
      rewardCallback = callback;
    },

    setTitleOptions(options: TitleOptions) {
      button.textContent = options.canContinue ? 'Continue Run' : 'Start Run';
      restartButton.style.display = options.canContinue ? 'inline-block' : 'none';
      const summary = document.getElementById('run-summary');
      if (summary) {
        summary.textContent = options.summary;
      }
    },

    showRewardChoices(rewards: RewardEntry[]) {
      rewardPanel.style.display = 'block';
      rewardPanel.innerHTML = `
        <div style="font-size: 14px; color: #ffc107; margin-bottom: 8px;">Choose a reward:</div>
        ${rewards
          .map(
            reward => `<button data-reward-id="${reward.id}" style="display:block;width:100%;margin-bottom:6px;padding:8px;background:#333;border:1px solid #666;color:#fff;cursor:pointer;">${reward.label}</button>`
          )
          .join('')}
      `;

      rewardPanel.querySelectorAll('button[data-reward-id]').forEach((element) => {
        element.addEventListener('click', () => {
          const rewardId = element.getAttribute('data-reward-id');
          if (rewardId && rewardCallback) {
            rewardCallback(rewardId);
          }
        });
      });
    },

    clearRewardChoices() {
      rewardPanel.innerHTML = '';
      rewardPanel.style.display = 'none';
    },

    destroy() {
      container.remove();
    },
  };
}
