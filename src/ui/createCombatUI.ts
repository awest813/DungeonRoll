// Combat UI - displays party, enemies, actions, and combat log

export interface CombatUI {
  show(): void;
  hide(): void;
  updateParty(party: { name: string; hp: number; maxHp: number; isGuarding: boolean }[]): void;
  updateEnemy(enemy: { name: string; hp: number; maxHp: number; isGuarding: boolean } | null): void;
  addLogEntry(message: string): void;
  clearLog(): void;
  onAttack(callback: (heroIndex: number) => void): void;
  onGuard(callback: (heroIndex: number) => void): void;
  onEndTurn(callback: () => void): void;
  destroy(): void;
}

export function createCombatUI(): CombatUI {
  // Create combat panel container
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

  // Title
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

  // Main content area
  const content = document.createElement('div');
  content.style.cssText = `
    display: flex;
    padding: 20px;
    gap: 20px;
    max-height: calc(90vh - 60px);
    overflow-y: auto;
  `;

  // Left panel: Party & Enemy
  const leftPanel = document.createElement('div');
  leftPanel.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 20px;
  `;

  // Party section
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

  // Enemy section
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

  // Right panel: Actions & Log
  const rightPanel = document.createElement('div');
  rightPanel.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 20px;
  `;

  // Actions section
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

  // Combat log section
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
  let endTurnCallback: (() => void) | null = null;
  let selectedHeroIndex = 0;

  function createActionButtons() {
    const actionButtons = document.getElementById('action-buttons');
    if (!actionButtons) return;

    actionButtons.innerHTML = `
      <div style="margin-bottom: 15px;">
        <div style="font-size: 12px; color: #aaa; margin-bottom: 5px;">Select Hero:</div>
        <div id="hero-selector"></div>
      </div>
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
      ">⚔️ ATTACK</button>
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
      ">🛡️ GUARD</button>
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

    // Hover effects
    [attackBtn, guardBtn, endTurnBtn].forEach(btn => {
      if (!btn) return;
      btn.addEventListener('mouseenter', () => {
        btn.style.opacity = '0.8';
        btn.style.transform = 'scale(1.05)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.opacity = '1';
        btn.style.transform = 'scale(1)';
      });
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
          (char, index) => `
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
            <div style="
              margin-top: 5px;
              background: rgba(0, 0, 0, 0.3);
              height: 8px;
              border-radius: 4px;
              overflow: hidden;
            ">
              <div style="
                width: ${(char.hp / char.maxHp) * 100}%;
                height: 100%;
                background: ${char.hp > char.maxHp * 0.5 ? '#4CAF50' : char.hp > char.maxHp * 0.25 ? '#ffa500' : '#f44336'};
                transition: width 0.3s;
              "></div>
            </div>
          </div>
        `
        )
        .join('');

      // Update hero selector
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

      // Add click handlers for hero selection
      party.forEach((char, index) => {
        const btn = document.getElementById(`hero-select-${index}`);
        if (btn && char.hp > 0) {
          btn.addEventListener('click', () => {
            selectedHeroIndex = index;
            // Re-render to update button states
            this.updateParty(party);
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
          <div style="
            margin-top: 5px;
            background: rgba(0, 0, 0, 0.3);
            height: 8px;
            border-radius: 4px;
            overflow: hidden;
          ">
            <div style="
              width: ${(enemy.hp / enemy.maxHp) * 100}%;
              height: 100%;
              background: ${enemy.hp > enemy.maxHp * 0.5 ? '#f44336' : enemy.hp > enemy.maxHp * 0.25 ? '#ffa500' : '#666'};
              transition: width 0.3s;
            "></div>
          </div>
        </div>
      `;
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

      // Auto-scroll to bottom
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

    onEndTurn(callback) {
      endTurnCallback = callback;
    },

    destroy() {
      container.remove();
    },
  };
}
