// Combat UI - displays party, enemies, actions, and combat log

export interface UIHeroSkill {
  id: string;
  name: string;
  apCost: number;
  description: string;
}

export interface HeroActionState {
  disabled: boolean;
  reason?: string;
  canAttack: boolean;
  canGuard: boolean;
  availableActionPoints: number;
  skills: Array<UIHeroSkill & { canUse: boolean; reason?: string }>;
}

export interface CombatUI {
  show(): void;
  hide(): void;
  updateParty(
    party: {
      name: string;
      hp: number;
      maxHp: number;
      isGuarding: boolean;
      actionPoints: number;
      maxActionPoints: number;
    }[]
  ): void;
  updateEnemy(enemy: { name: string; hp: number; maxHp: number; isGuarding: boolean } | null): void;
  updateHeroSkills(skills: UIHeroSkill[]): void;
  updateActionState(state: HeroActionState): void;
  addLogEntry(message: string): void;
  clearLog(): void;
  onAttack(callback: (heroIndex: number) => void): void;
  onGuard(callback: (heroIndex: number) => void): void;
  onSkill(callback: (heroIndex: number, skillId: string) => void): void;
  onEndTurn(callback: () => void): void;
  destroy(): void;
}

export function createCombatUI(): CombatUI {
  const container = document.createElement('div');
  container.id = 'combat-ui';
  container.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 800px;
    max-height: 90vh;
    background: rgba(20, 20, 30, 0.95);
    border: 2px solid #4CAF50;
    border-radius: 10px;
    font-family: 'Courier New', monospace;
    color: #fff;
    z-index: 200;
    display: none;
    overflow: hidden;
  `;

  const title = document.createElement('div');
  title.style.cssText = `
    background: #4CAF50;
    color: #000;
    padding: 15px;
    font-size: 20px;
    font-weight: bold;
    text-align: center;
    border-bottom: 2px solid #45a049;
  `;
  title.textContent = '⚔️ COMBAT ⚔️';

  const content = document.createElement('div');
  content.style.cssText = `
    display: flex;
    padding: 20px;
    gap: 20px;
    max-height: calc(90vh - 60px);
    overflow-y: auto;
  `;

  const leftPanel = document.createElement('div');
  leftPanel.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 20px;
  `;

  const partySection = document.createElement('div');
  partySection.style.cssText = `
    background: rgba(0, 100, 0, 0.2);
    border: 1px solid #4CAF50;
    border-radius: 5px;
    padding: 10px;
  `;
  partySection.innerHTML = `
    <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #4CAF50;">YOUR PARTY</div>
    <div id="party-list"></div>
  `;

  const enemySection = document.createElement('div');
  enemySection.style.cssText = `
    background: rgba(100, 0, 0, 0.2);
    border: 1px solid #f44336;
    border-radius: 5px;
    padding: 10px;
  `;
  enemySection.innerHTML = `
    <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #f44336;">ENEMY</div>
    <div id="enemy-list"></div>
  `;

  leftPanel.appendChild(partySection);
  leftPanel.appendChild(enemySection);

  const rightPanel = document.createElement('div');
  rightPanel.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 20px;
  `;

  const actionsSection = document.createElement('div');
  actionsSection.style.cssText = `
    background: rgba(0, 0, 100, 0.2);
    border: 1px solid #2196F3;
    border-radius: 5px;
    padding: 10px;
  `;
  actionsSection.innerHTML = `
    <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #2196F3;">ACTIONS</div>
    <div id="action-buttons"></div>
  `;

  const logSection = document.createElement('div');
  logSection.style.cssText = `
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid #888;
    border-radius: 5px;
    padding: 10px;
    flex: 1;
    display: flex;
    flex-direction: column;
  `;
  logSection.innerHTML = `
    <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #ffa500;">COMBAT LOG</div>
    <div id="combat-log" style="
      flex: 1;
      overflow-y: auto;
      font-size: 12px;
      line-height: 1.5;
      min-height: 200px;
      max-height: 400px;
    "></div>
  `;

  rightPanel.appendChild(actionsSection);
  rightPanel.appendChild(logSection);

  content.appendChild(leftPanel);
  content.appendChild(rightPanel);

  container.appendChild(title);
  container.appendChild(content);
  document.body.appendChild(container);

  let attackCallback: ((heroIndex: number) => void) | null = null;
  let guardCallback: ((heroIndex: number) => void) | null = null;
  let skillCallback: ((heroIndex: number, skillId: string) => void) | null = null;
  let endTurnCallback: (() => void) | null = null;
  let selectedHeroIndex = 0;
  let latestSkills: UIHeroSkill[] = [];

  function applyButtonState(button: HTMLElement | null, enabled: boolean, reason?: string) {
    if (!button) return;
    if (button instanceof HTMLButtonElement) {
      button.disabled = !enabled;
    }
    button.style.opacity = enabled ? '1' : '0.4';
    button.style.cursor = enabled ? 'pointer' : 'not-allowed';
    if (reason) {
      button.title = reason;
    }
  }

  function createActionButtons() {
    const actionButtons = document.getElementById('action-buttons');
    if (!actionButtons) return;

    actionButtons.innerHTML = `
      <div style="margin-bottom: 15px;">
        <div style="font-size: 12px; color: #aaa; margin-bottom: 5px;">Select Hero:</div>
        <div id="hero-selector"></div>
      </div>
      <div id="hero-ap" style="font-size: 12px; color: #90caf9; margin-bottom: 8px;"></div>
      <button id="attack-btn" style="
        width: 100%;
        padding: 12px;
        margin-bottom: 10px;
        background: #f44336;
        color: white;
        border: none;
        border-radius: 5px;
        font-size: 14px;
        font-family: 'Courier New', monospace;
        cursor: pointer;
        font-weight: bold;
      ">⚔️ ATTACK (1 AP)</button>
      <button id="guard-btn" style="
        width: 100%;
        padding: 12px;
        margin-bottom: 10px;
        background: #2196F3;
        color: white;
        border: none;
        border-radius: 5px;
        font-size: 14px;
        font-family: 'Courier New', monospace;
        cursor: pointer;
        font-weight: bold;
      ">🛡️ GUARD (1 AP)</button>
      <div id="skill-list" style="margin-bottom: 10px;"></div>
      <button id="end-turn-btn" style="
        width: 100%;
        padding: 12px;
        background: #FF9800;
        color: white;
        border: none;
        border-radius: 5px;
        font-size: 14px;
        font-family: 'Courier New', monospace;
        cursor: pointer;
        font-weight: bold;
      ">⏭️ END TURN</button>
    `;

    const attackBtn = document.getElementById('attack-btn');
    const guardBtn = document.getElementById('guard-btn');
    const endTurnBtn = document.getElementById('end-turn-btn');

    attackBtn?.addEventListener('click', () => {
      if (attackCallback) attackCallback(selectedHeroIndex);
    });

    guardBtn?.addEventListener('click', () => {
      if (guardCallback) guardCallback(selectedHeroIndex);
    });

    endTurnBtn?.addEventListener('click', () => {
      if (endTurnCallback) endTurnCallback();
    });
  }

  createActionButtons();

  return {
    show() {
      container.style.display = 'block';
    },

    hide() {
      container.style.display = 'none';
    },

    updateParty(party) {
      const partyList = document.getElementById('party-list');
      if (!partyList) return;

      partyList.innerHTML = party
        .map(
          (char) => `
          <div style="
            padding: 8px;
            margin-bottom: 5px;
            background: ${char.hp > 0 ? 'rgba(76, 175, 80, 0.2)' : 'rgba(100, 100, 100, 0.2)'};
            border: 1px solid ${char.hp > 0 ? '#4CAF50' : '#666'};
            border-radius: 3px;
            ${char.hp <= 0 ? 'opacity: 0.5;' : ''}
          ">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: bold;">${char.name}${char.isGuarding ? ' 🛡️' : ''}</span>
              <span style="font-size: 12px; color: ${char.hp > 0 ? '#4CAF50' : '#f44336'};">
                HP: ${char.hp}/${char.maxHp}
              </span>
            </div>
            <div style="margin-top: 5px; font-size: 11px; color: #9ccc65;">AP: ${char.actionPoints}/${char.maxActionPoints}</div>
          </div>
        `
        )
        .join('');

      const heroSelector = document.getElementById('hero-selector');
      if (!heroSelector) return;

      heroSelector.innerHTML = party
        .map(
          (char, index) => `
          <button id="hero-select-${index}" style="
            padding: 6px 12px;
            margin: 2px;
            background: ${selectedHeroIndex === index ? '#4CAF50' : 'rgba(76, 175, 80, 0.3)'};
            color: white;
            border: 1px solid #4CAF50;
            border-radius: 3px;
            font-size: 12px;
            font-family: 'Courier New', monospace;
            cursor: pointer;
            ${char.hp <= 0 ? 'opacity: 0.3; cursor: not-allowed;' : ''}
          ">${char.name}</button>
        `
        )
        .join('');

      party.forEach((char, index) => {
        const btn = document.getElementById(`hero-select-${index}`);
        if (btn && char.hp > 0) {
          btn.addEventListener('click', () => {
            selectedHeroIndex = index;
            this.updateParty(party);
            this.updateHeroSkills(latestSkills);
          });
        }
      });
    },

    updateEnemy(enemy) {
      const enemyList = document.getElementById('enemy-list');
      if (!enemyList) return;

      if (!enemy) {
        enemyList.innerHTML = '<div style="color: #666; font-style: italic;">No enemy</div>';
        return;
      }

      enemyList.innerHTML = `
        <div style="
          padding: 8px;
          background: ${enemy.hp > 0 ? 'rgba(244, 67, 54, 0.2)' : 'rgba(100, 100, 100, 0.2)'};
          border: 1px solid ${enemy.hp > 0 ? '#f44336' : '#666'};
          border-radius: 3px;
          ${enemy.hp <= 0 ? 'opacity: 0.5;' : ''}
        ">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: bold;">${enemy.name}${enemy.isGuarding ? ' 🛡️' : ''}</span>
            <span style="font-size: 12px; color: ${enemy.hp > 0 ? '#f44336' : '#666'};">
              HP: ${enemy.hp}/${enemy.maxHp}
            </span>
          </div>
        </div>
      `;
    },

    updateHeroSkills(skills) {
      latestSkills = skills;
      const skillList = document.getElementById('skill-list');
      if (!skillList) return;

      skillList.innerHTML = `
        <div style="font-size: 12px; color: #aaa; margin-bottom: 5px;">Skills:</div>
        ${skills
          .map(
            skill => `
          <button id="skill-btn-${skill.id}" style="
            width: 100%;
            padding: 8px;
            margin-bottom: 6px;
            background: #7b1fa2;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 12px;
            text-align: left;
            cursor: pointer;
          ">${skill.name} (${skill.apCost} AP)</button>
          <div style="font-size: 10px; color: #c5cae9; margin: -4px 0 6px 4px;">${skill.description}</div>
        `
          )
          .join('')}
      `;

      skills.forEach(skill => {
        const skillBtn = document.getElementById(`skill-btn-${skill.id}`);
        skillBtn?.addEventListener('click', () => {
          if (skillCallback) {
            skillCallback(selectedHeroIndex, skill.id);
          }
        });
      });
    },

    updateActionState(state) {
      const attackBtn = document.getElementById('attack-btn');
      const guardBtn = document.getElementById('guard-btn');
      const heroAp = document.getElementById('hero-ap');
      const isEnabled = !state.disabled;

      applyButtonState(attackBtn, isEnabled && state.canAttack, state.reason);
      applyButtonState(guardBtn, isEnabled && state.canGuard, state.reason);

      if (heroAp) {
        heroAp.textContent = `Selected Hero AP: ${state.availableActionPoints}`;
      }

      state.skills.forEach(skill => {
        const skillBtn = document.getElementById(`skill-btn-${skill.id}`);
        applyButtonState(skillBtn, isEnabled && skill.canUse, skill.reason || state.reason);
      });
    },

    addLogEntry(message) {
      const log = document.getElementById('combat-log');
      if (!log) return;

      const entry = document.createElement('div');
      entry.style.cssText = `
        padding: 2px 0;
        color: #ddd;
      `;
      entry.textContent = message;
      log.appendChild(entry);
      log.scrollTop = log.scrollHeight;
    },

    clearLog() {
      const log = document.getElementById('combat-log');
      if (log) log.innerHTML = '';
    },

    onAttack(callback) {
      attackCallback = callback;
    },

    onGuard(callback) {
      guardCallback = callback;
    },

    onSkill(callback) {
      skillCallback = callback;
    },

    onEndTurn(callback) {
      endTurnCallback = callback;
    },

    destroy() {
      container.remove();
    },
  };
}
