import { GameState } from '../game/stateMachine';

export interface UI {
  updateState(state: GameState): void;
  onAdvance(callback: () => void): void;
  onResetRun(callback: () => void): void;
  destroy(): void;
}

type StatePresentation = {
  label: string;
  title: string;
  description: string;
  accent: string;
  primaryAction: string;
  showResetAction: boolean;
};

const STATE_PRESENTATION: Record<GameState, StatePresentation> = {
  TITLE: {
    label: 'Main Menu',
    title: 'Dungeon Roll',
    description: 'Assemble your party and begin a new run through the cursed halls.',
    accent: '#64ffda',
    primaryAction: 'Start New Run',
    showResetAction: false,
  },
  MAP: {
    label: 'Exploration',
    title: 'Map Navigation',
    description: 'Your party advances deeper into the dungeon. Pick the next room.',
    accent: '#90caf9',
    primaryAction: 'Enter Next Room',
    showResetAction: true,
  },
  EVENT: {
    label: 'Encounter Event',
    title: 'Room Event',
    description: 'Something stirs in the shadows. Resolve the event to continue.',
    accent: '#ffcc80',
    primaryAction: 'Resolve Event',
    showResetAction: true,
  },
  COMBAT: {
    label: 'Battle',
    title: 'Combat In Progress',
    description: 'Use the combat interface to issue commands. The menu is paused for tactical actions.',
    accent: '#ef9a9a',
    primaryAction: 'Await Combat Resolution',
    showResetAction: true,
  },
  REWARD: {
    label: 'Loot',
    title: 'Rewards Available',
    description: 'Victory! Claim your reward and prepare for the next challenge.',
    accent: '#ce93d8',
    primaryAction: 'Claim Reward',
    showResetAction: true,
  },
  DEFEAT: {
    label: 'Defeat',
    title: 'Run Failed',
    description: 'Your party was defeated. Regroup and launch another attempt.',
    accent: '#f48fb1',
    primaryAction: 'Return to Title',
    showResetAction: true,
  },
};

export function createUI(): UI {
  const container = document.createElement('div');
  container.id = 'ui-overlay';
  container.style.cssText = `
    position: absolute;
    inset: 0;
    z-index: 100;
    pointer-events: none;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 24px;
    font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
    color: #e7edf6;
  `;

  const panel = document.createElement('div');
  panel.style.cssText = `
    width: min(920px, calc(100vw - 40px));
    background: linear-gradient(155deg, rgba(17, 25, 40, 0.9), rgba(15, 23, 32, 0.88));
    border: 1px solid rgba(145, 158, 171, 0.3);
    border-radius: 16px;
    box-shadow: 0 14px 48px rgba(5, 12, 20, 0.55);
    overflow: hidden;
    pointer-events: auto;
    backdrop-filter: blur(10px);
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(145, 158, 171, 0.3);
    background: rgba(255, 255, 255, 0.02);
  `;

  const label = document.createElement('div');
  label.style.cssText = 'font-size: 12px; text-transform: uppercase; letter-spacing: 0.18em; color: #a0afc2;';

  const stateBadge = document.createElement('div');
  stateBadge.style.cssText = `
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.24);
    color: #e7edf6;
  `;

  header.appendChild(label);
  header.appendChild(stateBadge);

  const body = document.createElement('div');
  body.style.cssText = `
    padding: 20px;
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 20px;
  `;

  const leftCol = document.createElement('div');
  const rightCol = document.createElement('div');

  const title = document.createElement('h2');
  title.style.cssText = 'margin: 0 0 10px; font-size: 32px; font-weight: 700; line-height: 1.15;';

  const description = document.createElement('p');
  description.style.cssText = 'margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #bfd0e4;';

  const progressCard = document.createElement('div');
  progressCard.style.cssText = `
    border: 1px solid rgba(145, 158, 171, 0.3);
    border-radius: 12px;
    padding: 14px;
    background: rgba(255, 255, 255, 0.02);
  `;

  const progressTitle = document.createElement('div');
  progressTitle.textContent = 'Run Flow';
  progressTitle.style.cssText = 'font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #9fb0c3; margin-bottom: 8px;';

  const flow = document.createElement('div');
  flow.style.cssText = 'display: flex; flex-wrap: wrap; gap: 6px;';
  const flowStates: GameState[] = ['TITLE', 'MAP', 'EVENT', 'COMBAT', 'REWARD', 'DEFEAT'];
  const flowChips = flowStates.map((state) => {
    const chip = document.createElement('span');
    chip.textContent = state;
    chip.style.cssText = `
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 999px;
      border: 1px solid rgba(145, 158, 171, 0.3);
      color: #c0cedf;
      transition: all 0.15s ease;
    `;
    flow.appendChild(chip);
    return { state, chip };
  });

  progressCard.appendChild(progressTitle);
  progressCard.appendChild(flow);

  leftCol.appendChild(title);
  leftCol.appendChild(description);
  leftCol.appendChild(progressCard);

  const actionsCard = document.createElement('div');
  actionsCard.style.cssText = `
    border: 1px solid rgba(145, 158, 171, 0.3);
    border-radius: 12px;
    padding: 14px;
    background: rgba(255, 255, 255, 0.02);
    display: flex;
    flex-direction: column;
    gap: 10px;
    height: 100%;
  `;

  const actionsTitle = document.createElement('div');
  actionsTitle.textContent = 'Actions';
  actionsTitle.style.cssText = 'font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #9fb0c3;';

  const actionHint = document.createElement('p');
  actionHint.style.cssText = 'font-size: 12px; line-height: 1.45; color: #90a4b8; margin: 0;';

  const primaryButton = document.createElement('button');
  primaryButton.id = 'ui-primary-action';
  primaryButton.style.cssText = `
    border: none;
    border-radius: 10px;
    padding: 12px;
    font-size: 14px;
    font-weight: 700;
    color: #0f1720;
    background: #64ffda;
    cursor: pointer;
    transition: transform 0.1s ease, opacity 0.2s ease;
  `;

  const resetButton = document.createElement('button');
  resetButton.id = 'ui-reset-action';
  resetButton.textContent = 'Reset Run';
  resetButton.style.cssText = `
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 10px;
    padding: 10px;
    font-size: 13px;
    color: #d4dce7;
    background: rgba(255, 255, 255, 0.02);
    cursor: pointer;
    transition: opacity 0.2s ease;
  `;

  actionsCard.appendChild(actionsTitle);
  actionsCard.appendChild(actionHint);
  actionsCard.appendChild(primaryButton);
  actionsCard.appendChild(resetButton);
  rightCol.appendChild(actionsCard);

  body.appendChild(leftCol);
  body.appendChild(rightCol);

  const footer = document.createElement('div');
  footer.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 12px 20px 16px;
    border-top: 1px solid rgba(145, 158, 171, 0.2);
    font-size: 12px;
    color: #8ea3b9;
  `;
  footer.innerHTML = '<span>Enter: primary action</span><span>R: reset run</span>';

  panel.appendChild(header);
  panel.appendChild(body);
  panel.appendChild(footer);
  container.appendChild(panel);
  document.body.appendChild(container);

  let currentState: GameState = 'TITLE';
  let advanceCallback: (() => void) | null = null;
  let resetCallback: (() => void) | null = null;

  const handleAdvance = () => {
    if (advanceCallback && currentState !== 'COMBAT') {
      advanceCallback();
    }
  };

  const handleReset = () => {
    if (resetCallback) {
      resetCallback();
    }
  };

  const keyHandler = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleAdvance();
    }

    if (event.key.toLowerCase() === 'r') {
      handleReset();
    }
  };

  primaryButton.addEventListener('click', handleAdvance);
  resetButton.addEventListener('click', handleReset);
  window.addEventListener('keydown', keyHandler);

  function render(state: GameState): void {
    currentState = state;
    const presentation = STATE_PRESENTATION[state];

    label.textContent = presentation.label;
    stateBadge.textContent = state;
    stateBadge.style.borderColor = presentation.accent;
    stateBadge.style.color = presentation.accent;

    title.textContent = presentation.title;
    title.style.color = presentation.accent;
    description.textContent = presentation.description;

    primaryButton.textContent = presentation.primaryAction;
    primaryButton.style.background = presentation.accent;
    primaryButton.style.opacity = state === 'COMBAT' ? '0.6' : '1';
    primaryButton.disabled = state === 'COMBAT';
    primaryButton.style.cursor = state === 'COMBAT' ? 'not-allowed' : 'pointer';

    resetButton.style.display = presentation.showResetAction ? 'block' : 'none';
    actionHint.textContent =
      state === 'COMBAT'
        ? 'Combat controls are active in the combat panel. Return here when battle ends.'
        : 'Advance the run with the primary action, or reset to return to the title screen.';

    flowChips.forEach(({ state: chipState, chip }) => {
      const isActive = chipState === state;
      chip.style.background = isActive ? `${presentation.accent}22` : 'transparent';
      chip.style.borderColor = isActive ? presentation.accent : 'rgba(145, 158, 171, 0.3)';
      chip.style.color = isActive ? presentation.accent : '#c0cedf';
    });
  }

  render('TITLE');

  return {
    updateState(state: GameState) {
      render(state);
    },

    onAdvance(callback: () => void) {
      advanceCallback = callback;
    },

    onResetRun(callback: () => void) {
      resetCallback = callback;
    },

    destroy() {
      window.removeEventListener('keydown', keyHandler);
      container.remove();
    },
  };
}
