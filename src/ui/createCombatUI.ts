// Combat UI - displays party, enemies, actions, and combat log

export interface CombatUIPartyMember {
  name: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  isGuarding: boolean;
  statuses: string[];
  level: number;
}

export interface CombatUIEnemy {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  isGuarding: boolean;
  statuses: string[];
}

export interface CombatUISkill {
  id: string;
  name: string;
  mpCost: number;
  description: string;
}

export interface CombatUIItem {
  itemId: string;
  name: string;
  quantity: number;
}

export interface CombatUI {
  show(): void;
  hide(): void;
  updateParty(party: CombatUIPartyMember[]): void;
  updateEnemies(enemies: CombatUIEnemy[]): void;
  updateSkills(skills: CombatUISkill[], currentMp: number): void;
  updateItems(items: CombatUIItem[]): void;
  addLogEntry(message: string): void;
  clearLog(): void;
  onAttack(callback: (heroIndex: number, targetEnemyIndex: number) => void): void;
  onGuard(callback: (heroIndex: number) => void): void;
  onSkill(callback: (heroIndex: number, skillId: string, targetIndex: number, isAlly: boolean) => void): void;
  onItem(callback: (heroIndex: number, itemId: string, targetIndex: number) => void): void;
  onEndTurn(callback: () => void): void;
  setActionsEnabled(enabled: boolean): void;
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
    width: 860px;
    max-height: 92vh;
    background: rgba(20, 20, 30, 0.95);
    border: 2px solid #4CAF50;
    border-radius: 10px;
    font-family: 'Courier New', monospace;
    color: #fff;
    z-index: 200;
    display: none;
    overflow: hidden;
  `;

  const titleEl = document.createElement('div');
  titleEl.style.cssText = `
    background: #4CAF50;
    color: #000;
    padding: 12px;
    font-size: 18px;
    font-weight: bold;
    text-align: center;
    border-bottom: 2px solid #45a049;
  `;
  titleEl.textContent = 'COMBAT';

  const contentEl = document.createElement('div');
  contentEl.style.cssText = `
    display: flex;
    padding: 15px;
    gap: 15px;
    max-height: calc(92vh - 50px);
    overflow-y: auto;
  `;

  const leftPanel = document.createElement('div');
  leftPanel.style.cssText = `flex: 1; display: flex; flex-direction: column; gap: 12px;`;

  const partySection = document.createElement('div');
  partySection.style.cssText = `
    background: rgba(0, 100, 0, 0.2);
    border: 1px solid #4CAF50;
    border-radius: 5px;
    padding: 8px;
  `;
  partySection.innerHTML = `
    <div style="font-size: 14px; font-weight: bold; margin-bottom: 8px; color: #4CAF50;">YOUR PARTY</div>
    <div id="party-list"></div>
  `;

  const enemySection = document.createElement('div');
  enemySection.style.cssText = `
    background: rgba(100, 0, 0, 0.2);
    border: 1px solid #f44336;
    border-radius: 5px;
    padding: 8px;
  `;
  enemySection.innerHTML = `
    <div style="font-size: 14px; font-weight: bold; margin-bottom: 8px; color: #f44336;">ENEMIES</div>
    <div id="enemy-list"></div>
  `;

  leftPanel.appendChild(partySection);
  leftPanel.appendChild(enemySection);

  const rightPanel = document.createElement('div');
  rightPanel.style.cssText = `flex: 1; display: flex; flex-direction: column; gap: 12px;`;

  const actionsSection = document.createElement('div');
  actionsSection.style.cssText = `
    background: rgba(0, 0, 100, 0.2);
    border: 1px solid #2196F3;
    border-radius: 5px;
    padding: 8px;
  `;
  actionsSection.innerHTML = `
    <div style="font-size: 14px; font-weight: bold; margin-bottom: 8px; color: #2196F3;">ACTIONS</div>
    <div id="action-buttons"></div>
  `;

  const logSection = document.createElement('div');
  logSection.style.cssText = `
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid #888;
    border-radius: 5px;
    padding: 8px;
    flex: 1;
    display: flex;
    flex-direction: column;
  `;
  logSection.innerHTML = `
    <div style="font-size: 14px; font-weight: bold; margin-bottom: 8px; color: #ffa500;">COMBAT LOG</div>
    <div id="combat-log" style="
      flex: 1;
      overflow-y: auto;
      font-size: 11px;
      line-height: 1.4;
      min-height: 150px;
      max-height: 300px;
    "></div>
  `;

  rightPanel.appendChild(actionsSection);
  rightPanel.appendChild(logSection);

  contentEl.appendChild(leftPanel);
  contentEl.appendChild(rightPanel);

  container.appendChild(titleEl);
  container.appendChild(contentEl);
  document.body.appendChild(container);

  let attackCallback: ((heroIndex: number, targetEnemyIndex: number) => void) | null = null;
  let guardCallback: ((heroIndex: number) => void) | null = null;
  let skillCallback: ((heroIndex: number, skillId: string, targetIndex: number, isAlly: boolean) => void) | null = null;
  let itemCallback: ((heroIndex: number, itemId: string, targetIndex: number) => void) | null = null;
  let endTurnCallback: (() => void) | null = null;
  let selectedHeroIndex = 0;
  let selectedEnemyIndex = 0;
  let actionsEnabled = true;
  let currentSkills: CombatUISkill[] = [];
  let currentItems: CombatUIItem[] = [];
  let currentParty: CombatUIPartyMember[] = [];
  let currentEnemies: CombatUIEnemy[] = [];
  let currentMp = 0;
  let actionMode: 'main' | 'skills' | 'items' = 'main';

  function actionBtnStyle(color: string): string {
    return `
      width: 100%;
      padding: 10px;
      margin-bottom: 6px;
      background: ${color};
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 13px;
      font-family: 'Courier New', monospace;
      cursor: pointer;
      font-weight: bold;
      transition: opacity 0.2s, transform 0.1s;
    `;
  }

  function renderActionButtons() {
    const actionButtons = document.getElementById('action-buttons');
    if (!actionButtons) return;

    const heroSelector = currentParty
      .map(
        (char, index) => `
        <button class="hero-select" data-index="${index}" style="
          padding: 4px 10px; margin: 2px;
          background: ${selectedHeroIndex === index ? '#4CAF50' : 'rgba(76, 175, 80, 0.3)'};
          color: white; border: 1px solid #4CAF50; border-radius: 3px;
          font-size: 11px; font-family: 'Courier New', monospace; cursor: pointer;
          transition: background 0.2s;
          ${char.hp <= 0 ? 'opacity: 0.3; cursor: not-allowed;' : ''}
        ">${char.name}</button>`
      )
      .join('');

    const enemySelector = currentEnemies.length > 0
      ? `<div style="margin-bottom: 8px;">
          <div style="font-size: 11px; color: #aaa; margin-bottom: 4px;">Target:</div>
          ${currentEnemies
            .map(
              (enemy, index) => `
              <button class="enemy-select" data-index="${index}" style="
                padding: 4px 10px; margin: 2px;
                background: ${selectedEnemyIndex === index ? '#f44336' : 'rgba(244, 67, 54, 0.3)'};
                color: white; border: 1px solid #f44336; border-radius: 3px;
                font-size: 11px; font-family: 'Courier New', monospace; cursor: pointer;
                ${enemy.hp <= 0 ? 'opacity: 0.3; cursor: not-allowed;' : ''}
              ">${enemy.name}</button>`
            )
            .join('')}
        </div>`
      : '';

    if (actionMode === 'main') {
      actionButtons.innerHTML = `
        <div style="margin-bottom: 8px;">
          <div style="font-size: 11px; color: #aaa; margin-bottom: 4px;">Hero:</div>
          ${heroSelector}
        </div>
        ${enemySelector}
        <button id="attack-btn" class="action-btn" style="${actionBtnStyle('#f44336')}" ${!actionsEnabled ? 'disabled' : ''}>ATTACK</button>
        <button id="guard-btn" class="action-btn" style="${actionBtnStyle('#2196F3')}" ${!actionsEnabled ? 'disabled' : ''}>GUARD</button>
        <button id="skills-btn" class="action-btn" style="${actionBtnStyle('#9C27B0')}" ${!actionsEnabled ? 'disabled' : ''}>SKILLS</button>
        <button id="items-btn" class="action-btn" style="${actionBtnStyle('#FF9800')}" ${!actionsEnabled ? 'disabled' : ''}>ITEMS</button>
        <button id="end-turn-btn" class="action-btn" style="${actionBtnStyle('#607D8B')}" ${!actionsEnabled ? 'disabled' : ''}>END TURN</button>
      `;
    } else if (actionMode === 'skills') {
      const skillButtons = currentSkills.map(skill => `
        <button class="skill-btn" data-skill-id="${skill.id}" style="
          width: 100%; padding: 8px; margin-bottom: 4px;
          background: ${currentMp >= skill.mpCost ? 'rgba(156, 39, 176, 0.4)' : 'rgba(100, 100, 100, 0.3)'};
          color: ${currentMp >= skill.mpCost ? 'white' : '#888'};
          border: 1px solid ${currentMp >= skill.mpCost ? '#9C27B0' : '#555'};
          border-radius: 4px; font-size: 11px; font-family: 'Courier New', monospace;
          cursor: ${currentMp >= skill.mpCost ? 'pointer' : 'not-allowed'};
          text-align: left; transition: background 0.2s;
        " title="${skill.description}" ${currentMp < skill.mpCost || !actionsEnabled ? 'disabled' : ''}>
          ${skill.name} ${skill.mpCost > 0 ? `(${skill.mpCost} MP)` : ''}
        </button>
      `).join('');

      actionButtons.innerHTML = `
        <div style="margin-bottom: 8px;">
          <button id="back-btn" style="${actionBtnStyle('#607D8B')}">BACK</button>
        </div>
        ${enemySelector}
        ${skillButtons}
      `;
    } else if (actionMode === 'items') {
      const itemButtons = currentItems.filter(i => i.quantity > 0).map(item => `
        <button class="item-btn" data-item-id="${item.itemId}" style="
          width: 100%; padding: 8px; margin-bottom: 4px;
          background: rgba(255, 152, 0, 0.4); color: white;
          border: 1px solid #FF9800; border-radius: 4px;
          font-size: 11px; font-family: 'Courier New', monospace;
          cursor: pointer; text-align: left; transition: background 0.2s;
        " ${!actionsEnabled ? 'disabled' : ''}>
          ${item.name} x${item.quantity}
        </button>
      `).join('');

      actionButtons.innerHTML = `
        <div style="margin-bottom: 8px;">
          <button id="back-btn" style="${actionBtnStyle('#607D8B')}">BACK</button>
        </div>
        ${itemButtons.length > 0 ? itemButtons : '<div style="color: #888; font-size: 11px;">No items available</div>'}
      `;
    }

    // Wire event handlers
    actionButtons.querySelectorAll('.hero-select').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.index!, 10);
        if (currentParty[idx]?.hp > 0) {
          selectedHeroIndex = idx;
          renderActionButtons();
        }
      });
    });

    actionButtons.querySelectorAll('.enemy-select').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.index!, 10);
        if (currentEnemies[idx]?.hp > 0) {
          selectedEnemyIndex = idx;
          renderActionButtons();
        }
      });
    });

    document.getElementById('attack-btn')?.addEventListener('click', () => {
      if (actionsEnabled && attackCallback) attackCallback(selectedHeroIndex, selectedEnemyIndex);
    });
    document.getElementById('guard-btn')?.addEventListener('click', () => {
      if (actionsEnabled && guardCallback) guardCallback(selectedHeroIndex);
    });
    document.getElementById('skills-btn')?.addEventListener('click', () => {
      actionMode = 'skills';
      renderActionButtons();
    });
    document.getElementById('items-btn')?.addEventListener('click', () => {
      actionMode = 'items';
      renderActionButtons();
    });
    document.getElementById('end-turn-btn')?.addEventListener('click', () => {
      if (actionsEnabled && endTurnCallback) endTurnCallback();
    });
    document.getElementById('back-btn')?.addEventListener('click', () => {
      actionMode = 'main';
      renderActionButtons();
    });

    actionButtons.querySelectorAll('.skill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!actionsEnabled) return;
        const skillId = (btn as HTMLElement).dataset.skillId!;
        if (skillCallback) skillCallback(selectedHeroIndex, skillId, selectedEnemyIndex, false);
      });
    });

    actionButtons.querySelectorAll('.item-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!actionsEnabled) return;
        const itemId = (btn as HTMLElement).dataset.itemId!;
        if (itemCallback) itemCallback(selectedHeroIndex, itemId, selectedHeroIndex);
      });
    });

    // Hover effects
    actionButtons.querySelectorAll('.action-btn, .skill-btn, .item-btn').forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        (btn as HTMLElement).style.opacity = '0.85';
        (btn as HTMLElement).style.transform = 'scale(1.02)';
      });
      btn.addEventListener('mouseleave', () => {
        (btn as HTMLElement).style.opacity = '1';
        (btn as HTMLElement).style.transform = 'scale(1)';
      });
    });
  }

  renderActionButtons();

  return {
    show() {
      container.style.display = 'block';
      actionMode = 'main';
      selectedHeroIndex = 0;
      selectedEnemyIndex = 0;
      renderActionButtons();
    },

    hide() {
      container.style.display = 'none';
    },

    updateParty(party) {
      currentParty = party;
      if (party[selectedHeroIndex]?.hp <= 0) {
        const firstAlive = party.findIndex(c => c.hp > 0);
        if (firstAlive >= 0) selectedHeroIndex = firstAlive;
      }

      const partyList = document.getElementById('party-list');
      if (!partyList) return;

      partyList.innerHTML = party
        .map(
          (char) => `
          <div style="
            padding: 6px; margin-bottom: 4px;
            background: ${char.hp > 0 ? 'rgba(76, 175, 80, 0.2)' : 'rgba(100, 100, 100, 0.2)'};
            border: 1px solid ${char.hp > 0 ? '#4CAF50' : '#666'};
            border-radius: 3px;
            ${char.hp <= 0 ? 'opacity: 0.5;' : ''}
          ">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: bold; font-size: 12px;">${char.name} Lv${char.level}${char.isGuarding ? ' [G]' : ''}${char.statuses.length > 0 ? ' ' + char.statuses.join(' ') : ''}</span>
              <span style="font-size: 11px; color: ${char.hp > 0 ? '#4CAF50' : '#f44336'};">HP:${char.hp}/${char.maxHp}</span>
            </div>
            <div style="display: flex; gap: 6px; margin-top: 3px;">
              <div style="flex: 1; background: rgba(0,0,0,0.3); height: 6px; border-radius: 3px; overflow: hidden;">
                <div style="width: ${(char.hp / char.maxHp) * 100}%; height: 100%; background: ${char.hp > char.maxHp * 0.5 ? '#4CAF50' : char.hp > char.maxHp * 0.25 ? '#ffa500' : '#f44336'}; transition: width 0.3s;"></div>
              </div>
            </div>
            <div style="display: flex; justify-content: flex-end; margin-top: 2px;">
              <span style="font-size: 10px; color: #64B5F6;">MP:${char.mp}/${char.maxMp}</span>
            </div>
          </div>
        `
        )
        .join('');

      renderActionButtons();
    },

    updateEnemies(enemies) {
      currentEnemies = enemies;
      if (!enemies[selectedEnemyIndex] || enemies[selectedEnemyIndex]?.hp <= 0) {
        const firstAlive = enemies.findIndex(e => e.hp > 0);
        if (firstAlive >= 0) selectedEnemyIndex = firstAlive;
      }

      const enemyList = document.getElementById('enemy-list');
      if (!enemyList) return;

      if (enemies.length === 0) {
        enemyList.innerHTML = '<div style="color: #666; font-style: italic;">No enemies</div>';
        return;
      }

      enemyList.innerHTML = enemies
        .map(
          (enemy) => `
          <div style="
            padding: 6px; margin-bottom: 4px;
            background: ${enemy.hp > 0 ? 'rgba(244, 67, 54, 0.2)' : 'rgba(100, 100, 100, 0.2)'};
            border: 1px solid ${enemy.hp > 0 ? '#f44336' : '#666'};
            border-radius: 3px;
            ${enemy.hp <= 0 ? 'opacity: 0.5;' : ''}
          ">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: bold; font-size: 12px;">${enemy.name}${enemy.isGuarding ? ' [G]' : ''}${enemy.statuses.length > 0 ? ' ' + enemy.statuses.join(' ') : ''}</span>
              <span style="font-size: 11px; color: ${enemy.hp > 0 ? '#f44336' : '#666'};">HP:${enemy.hp}/${enemy.maxHp}</span>
            </div>
            <div style="margin-top: 3px; background: rgba(0,0,0,0.3); height: 6px; border-radius: 3px; overflow: hidden;">
              <div style="width: ${(enemy.hp / enemy.maxHp) * 100}%; height: 100%; background: ${enemy.hp > enemy.maxHp * 0.5 ? '#f44336' : enemy.hp > enemy.maxHp * 0.25 ? '#ffa500' : '#666'}; transition: width 0.3s;"></div>
            </div>
          </div>
        `
        )
        .join('');

      renderActionButtons();
    },

    updateSkills(skills, mp) {
      currentSkills = skills;
      currentMp = mp;
      if (actionMode === 'skills') renderActionButtons();
    },

    updateItems(items) {
      currentItems = items;
      if (actionMode === 'items') renderActionButtons();
    },

    addLogEntry(message) {
      const log = document.getElementById('combat-log');
      if (!log) return;
      const entry = document.createElement('div');
      entry.style.cssText = `padding: 1px 0; color: #ddd;`;
      entry.textContent = message;
      log.appendChild(entry);
      log.scrollTop = log.scrollHeight;
    },

    clearLog() {
      const log = document.getElementById('combat-log');
      if (log) log.innerHTML = '';
    },

    onAttack(callback) { attackCallback = callback; },
    onGuard(callback) { guardCallback = callback; },
    onSkill(callback) { skillCallback = callback; },
    onItem(callback) { itemCallback = callback; },
    onEndTurn(callback) { endTurnCallback = callback; },

    setActionsEnabled(enabled) {
      actionsEnabled = enabled;
      renderActionButtons();
    },

    destroy() {
      container.remove();
    },
  };
}
