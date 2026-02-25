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
  targeting: string;
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
  updateTurnCounter(turn: number): void;
  updateGold(gold: number): void;
  addLogEntry(message: string): void;
  clearLog(): void;
  onAttack(callback: (heroIndex: number, targetEnemyIndex: number) => void): void;
  onGuard(callback: (heroIndex: number) => void): void;
  onSkill(callback: (heroIndex: number, skillId: string, targetIndex: number, isAlly: boolean) => void): void;
  onItem(callback: (heroIndex: number, itemId: string, targetIndex: number) => void): void;
  onEndTurn(callback: () => void): void;
  onHeroSelect(callback: (heroIndex: number) => void): void;
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
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.4), rgba(20, 20, 30, 0.9));
    color: #4CAF50;
    padding: 10px 16px;
    font-size: 18px;
    font-weight: bold;
    text-align: center;
    letter-spacing: 4px;
    border-bottom: 2px solid #4CAF50;
    border-radius: 8px 8px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;
  const titleLabel = document.createElement('span');
  titleLabel.textContent = 'COMBAT';
  const titleInfo = document.createElement('span');
  titleInfo.style.cssText = `font-size: 11px; letter-spacing: 2px; display: flex; gap: 14px; align-items: center;`;
  titleInfo.innerHTML = `
    <span id="combat-turn-counter" style="color: #aaa;">TURN 1</span>
    <span id="combat-gold-display" style="color: #FFE082;">0g</span>
  `;
  titleEl.appendChild(titleLabel);
  titleEl.appendChild(titleInfo);

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
    background: rgba(0, 100, 0, 0.15);
    border: 1px solid rgba(76, 175, 80, 0.5);
    border-radius: 5px;
    padding: 10px;
  `;
  partySection.innerHTML = `
    <div style="font-size: 12px; font-weight: bold; margin-bottom: 8px; color: #4CAF50; letter-spacing: 2px;">YOUR PARTY</div>
    <div id="combat-party-list"></div>
  `;

  const enemySection = document.createElement('div');
  enemySection.style.cssText = `
    background: rgba(100, 0, 0, 0.15);
    border: 1px solid rgba(244, 67, 54, 0.5);
    border-radius: 5px;
    padding: 10px;
  `;
  enemySection.innerHTML = `
    <div style="font-size: 12px; font-weight: bold; margin-bottom: 8px; color: #f44336; letter-spacing: 2px;">ENEMIES</div>
    <div id="combat-enemy-list"></div>
  `;

  leftPanel.appendChild(partySection);
  leftPanel.appendChild(enemySection);

  const rightPanel = document.createElement('div');
  rightPanel.style.cssText = `flex: 1; display: flex; flex-direction: column; gap: 12px;`;

  const actionsSection = document.createElement('div');
  actionsSection.style.cssText = `
    background: rgba(0, 0, 100, 0.15);
    border: 1px solid rgba(33, 150, 243, 0.5);
    border-radius: 5px;
    padding: 10px;
  `;
  actionsSection.innerHTML = `
    <div style="font-size: 12px; font-weight: bold; margin-bottom: 8px; color: #2196F3; letter-spacing: 2px;">ACTIONS</div>
    <div id="combat-action-buttons"></div>
  `;

  const logSection = document.createElement('div');
  logSection.style.cssText = `
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(136, 136, 136, 0.4);
    border-radius: 5px;
    padding: 10px;
    flex: 1;
    display: flex;
    flex-direction: column;
  `;
  logSection.innerHTML = `
    <div style="font-size: 12px; font-weight: bold; margin-bottom: 8px; color: #ffa500; letter-spacing: 2px;">COMBAT LOG</div>
    <div id="combat-log-entries" style="
      flex: 1;
      overflow-y: auto;
      font-size: 11px;
      line-height: 1.5;
      min-height: 150px;
      max-height: 300px;
    "></div>
  `;

  rightPanel.appendChild(actionsSection);
  rightPanel.appendChild(logSection);

  contentEl.appendChild(leftPanel);
  contentEl.appendChild(rightPanel);

  // CSS hover effects — avoids per-render JS listener overhead
  const style = document.createElement('style');
  style.textContent = `
    #combat-ui .action-btn:not([disabled]):hover,
    #combat-ui .skill-btn:not([disabled]):hover,
    #combat-ui .item-btn:not([disabled]):hover {
      opacity: 0.8;
      transform: scale(1.02);
    }
  `;
  container.appendChild(style);
  container.appendChild(titleEl);
  container.appendChild(contentEl);
  document.body.appendChild(container);

  let attackCallback: ((heroIndex: number, targetEnemyIndex: number) => void) | null = null;
  let guardCallback: ((heroIndex: number) => void) | null = null;
  let skillCallback: ((heroIndex: number, skillId: string, targetIndex: number, isAlly: boolean) => void) | null = null;
  let itemCallback: ((heroIndex: number, itemId: string, targetIndex: number) => void) | null = null;
  let endTurnCallback: (() => void) | null = null;
  let heroSelectCallback: ((heroIndex: number) => void) | null = null;
  let selectedHeroIndex = 0;
  let selectedEnemyIndex = 0;
  let actionsEnabled = true;
  let currentSkills: CombatUISkill[] = [];
  let currentItems: CombatUIItem[] = [];
  let currentParty: CombatUIPartyMember[] = [];
  let currentEnemies: CombatUIEnemy[] = [];
  let currentMp = 0;
  let actionMode: 'main' | 'skills' | 'items' = 'main';
  let selectedItemTargetIndex = 0;
  let selectedAllyTargetIndex = 0;

  function actionBtnStyle(color: string, disabled: boolean): string {
    return `
      width: 100%;
      padding: 10px;
      margin-bottom: 6px;
      background: ${disabled ? 'rgba(60, 60, 60, 0.6)' : color};
      color: ${disabled ? '#666' : 'white'};
      border: 1px solid ${disabled ? '#555' : color};
      border-radius: 4px;
      font-size: 13px;
      font-family: 'Courier New', monospace;
      cursor: ${disabled ? 'not-allowed' : 'pointer'};
      font-weight: bold;
      transition: opacity 0.15s, transform 0.1s;
      outline: none;
      opacity: ${disabled ? '0.5' : '1'};
    `;
  }

  function selectBtnStyle(selected: boolean, color: string, dead: boolean): string {
    return `
      padding: 4px 10px; margin: 2px;
      background: ${dead ? 'rgba(60, 60, 60, 0.3)' : selected ? color : `${color}33`};
      color: ${dead ? '#666' : 'white'};
      border: 1px solid ${dead ? '#555' : color};
      border-radius: 3px;
      font-size: 11px; font-family: 'Courier New', monospace;
      cursor: ${dead ? 'not-allowed' : 'pointer'};
      outline: none;
      transition: background 0.15s;
      opacity: ${dead ? '0.4' : '1'};
    `;
  }

  function renderActionButtons() {
    const actionButtons = document.getElementById('combat-action-buttons');
    if (!actionButtons) return;

    const dis = !actionsEnabled;

    const heroSelector = currentParty
      .map(
        (char, index) => `
        <button class="hero-select" data-index="${index}" style="${selectBtnStyle(selectedHeroIndex === index, '#4CAF50', char.hp <= 0)}">${char.name}</button>`
      )
      .join('');

    const enemySelector = currentEnemies.length > 0
      ? `<div style="margin-bottom: 8px;">
          <div style="font-size: 10px; color: #999; margin-bottom: 4px; letter-spacing: 1px;">TARGET:</div>
          ${currentEnemies
            .map(
              (enemy, index) => `
              <button class="enemy-select" data-index="${index}" style="${selectBtnStyle(selectedEnemyIndex === index, '#f44336', enemy.hp <= 0)}">${enemy.name}</button>`
            )
            .join('')}
        </div>`
      : '';

    if (actionMode === 'main') {
      actionButtons.innerHTML = `
        <div style="margin-bottom: 8px;">
          <div style="font-size: 10px; color: #999; margin-bottom: 4px; letter-spacing: 1px;">HERO:</div>
          ${heroSelector}
        </div>
        ${enemySelector}
        <button id="combat-attack-btn" class="action-btn" style="${actionBtnStyle('#c62828', dis)}" ${dis ? 'disabled' : ''}><span style="opacity:0.5;font-size:10px;">[A]</span> ATTACK</button>
        <button id="combat-guard-btn" class="action-btn" style="${actionBtnStyle('#1565C0', dis)}" ${dis ? 'disabled' : ''}><span style="opacity:0.5;font-size:10px;">[G]</span> GUARD</button>
        <button id="combat-skills-btn" class="action-btn" style="${actionBtnStyle('#6A1B9A', dis)}" ${dis ? 'disabled' : ''}><span style="opacity:0.5;font-size:10px;">[S]</span> SKILLS</button>
        <button id="combat-items-btn" class="action-btn" style="${actionBtnStyle('#E65100', dis)}" ${dis ? 'disabled' : ''}><span style="opacity:0.5;font-size:10px;">[I]</span> ITEMS</button>
        <button id="combat-end-turn-btn" class="action-btn" style="${actionBtnStyle('#37474F', dis)}" ${dis ? 'disabled' : ''}><span style="opacity:0.5;font-size:10px;">[E]</span> END TURN</button>
      `;
    } else if (actionMode === 'skills') {
      const hasEnemySkill = currentSkills.some(s => s.targeting === 'single_enemy');
      const hasAllySkill = currentSkills.some(s => s.targeting === 'single_ally');

      const allySelector = hasAllySkill && currentParty.length > 0
        ? `<div style="margin-bottom: 8px;">
            <div style="font-size: 10px; color: #999; margin-bottom: 4px; letter-spacing: 1px;">TARGET ALLY:</div>
            ${currentParty
              .map(
                (char, index) => {
                  const hpPct = char.maxHp > 0 ? Math.round((char.hp / char.maxHp) * 100) : 0;
                  const hpCol = hpPct > 50 ? '#4CAF50' : hpPct > 25 ? '#ffa500' : '#f44336';
                  return `
                <button class="ally-select" data-index="${index}" style="${selectBtnStyle(selectedAllyTargetIndex === index, '#4CAF50', char.hp <= 0)}">${char.name} <span style="color: ${char.hp > 0 ? hpCol : '#555'}; font-size: 9px;">${char.hp}/${char.maxHp}</span></button>`;
                }
              )
              .join('')}
          </div>`
        : '';

      const skillButtons = currentSkills.map((skill, idx) => {
        const canUse = currentMp >= skill.mpCost && actionsEnabled;
        const hotkey = idx < 9 ? idx + 1 : '';
        return `
        <button class="skill-btn" data-skill-id="${skill.id}" data-targeting="${skill.targeting}" style="
          width: 100%; padding: 8px; margin-bottom: 4px;
          background: ${canUse ? 'rgba(106, 27, 154, 0.35)' : 'rgba(60, 60, 60, 0.3)'};
          color: ${canUse ? '#CE93D8' : '#666'};
          border: 1px solid ${canUse ? 'rgba(156, 39, 176, 0.6)' : '#444'};
          border-radius: 4px; font-size: 11px; font-family: 'Courier New', monospace;
          cursor: ${canUse ? 'pointer' : 'not-allowed'};
          text-align: left; transition: background 0.15s;
          outline: none; opacity: ${canUse ? '1' : '0.5'};
        " title="${skill.description}" ${!canUse ? 'disabled' : ''}>
          ${hotkey ? `<span style="opacity:0.5;font-size:10px;">[${hotkey}]</span> ` : ''}${skill.name} ${skill.mpCost > 0 ? `<span style="color: ${canUse ? '#64B5F6' : '#555'};">(${skill.mpCost} MP)</span>` : ''}
        </button>
      `}).join('');

      actionButtons.innerHTML = `
        <div style="margin-bottom: 8px;">
          <button id="combat-back-btn" style="${actionBtnStyle('#37474F', false)}"><span style="opacity:0.5;font-size:10px;">[Esc]</span> BACK</button>
        </div>
        ${hasEnemySkill ? enemySelector : ''}
        ${allySelector}
        ${skillButtons}
      `;
    } else if (actionMode === 'items') {
      // Items target party members - show party target selector
      const itemTargetSelector = currentParty.length > 0
        ? `<div style="margin-bottom: 8px;">
            <div style="font-size: 10px; color: #999; margin-bottom: 4px; letter-spacing: 1px;">USE ON:</div>
            ${currentParty
              .map(
                (char, index) => {
                  const hpPct = char.maxHp > 0 ? Math.round((char.hp / char.maxHp) * 100) : 0;
                  const hpCol = hpPct > 50 ? '#4CAF50' : hpPct > 25 ? '#ffa500' : '#f44336';
                  return `
                <button class="item-target-select" data-index="${index}" style="${selectBtnStyle(selectedItemTargetIndex === index, '#E65100', char.hp <= 0)}">${char.name} <span style="color: ${char.hp > 0 ? hpCol : '#555'}; font-size: 9px;">${char.hp}/${char.maxHp}</span></button>`;
                }
              )
              .join('')}
          </div>`
        : '';

      const itemButtons = currentItems.filter(i => i.quantity > 0).map((item, idx) => `
        <button class="item-btn" data-item-id="${item.itemId}" style="
          width: 100%; padding: 8px; margin-bottom: 4px;
          background: ${actionsEnabled ? 'rgba(230, 81, 0, 0.3)' : 'rgba(60, 60, 60, 0.3)'};
          color: ${actionsEnabled ? '#FFB74D' : '#666'};
          border: 1px solid ${actionsEnabled ? 'rgba(255, 152, 0, 0.5)' : '#444'};
          border-radius: 4px; font-size: 11px; font-family: 'Courier New', monospace;
          cursor: ${actionsEnabled ? 'pointer' : 'not-allowed'}; text-align: left;
          transition: background 0.15s; outline: none;
          opacity: ${actionsEnabled ? '1' : '0.5'};
        " ${!actionsEnabled ? 'disabled' : ''}>
          ${idx < 9 ? `<span style="opacity:0.5;font-size:10px;">[${idx + 1}]</span> ` : ''}${item.name} <span style="color: ${actionsEnabled ? '#aaa' : '#555'};">x${item.quantity}</span>
        </button>
      `).join('');

      actionButtons.innerHTML = `
        <div style="margin-bottom: 8px;">
          <button id="combat-back-btn" style="${actionBtnStyle('#37474F', false)}"><span style="opacity:0.5;font-size:10px;">[Esc]</span> BACK</button>
        </div>
        ${itemTargetSelector}
        ${itemButtons.length > 0 ? itemButtons : '<div style="color: #666; font-size: 11px; padding: 4px;">No items available</div>'}
      `;
    }

    // Wire event handlers
    actionButtons.querySelectorAll('.hero-select').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.index!, 10);
        if (currentParty[idx]?.hp > 0) {
          selectedHeroIndex = idx;
          if (heroSelectCallback) heroSelectCallback(idx);
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

    document.getElementById('combat-attack-btn')?.addEventListener('click', () => {
      if (actionsEnabled && attackCallback) attackCallback(selectedHeroIndex, selectedEnemyIndex);
    });
    document.getElementById('combat-guard-btn')?.addEventListener('click', () => {
      if (actionsEnabled && guardCallback) guardCallback(selectedHeroIndex);
    });
    document.getElementById('combat-skills-btn')?.addEventListener('click', () => {
      if (actionsEnabled) {
        actionMode = 'skills';
        selectedAllyTargetIndex = selectedHeroIndex; // default ally target = self
        renderActionButtons();
      }
    });
    document.getElementById('combat-items-btn')?.addEventListener('click', () => {
      if (actionsEnabled) {
        actionMode = 'items';
        // Auto-select lowest-HP alive ally as item target
        let lowestHpIdx = selectedHeroIndex;
        let lowestPct = 1;
        currentParty.forEach((c, i) => {
          if (c.hp > 0 && c.maxHp > 0) {
            const pct = c.hp / c.maxHp;
            if (pct < lowestPct) { lowestPct = pct; lowestHpIdx = i; }
          }
        });
        selectedItemTargetIndex = lowestHpIdx;
        renderActionButtons();
      }
    });
    document.getElementById('combat-end-turn-btn')?.addEventListener('click', () => {
      if (actionsEnabled && endTurnCallback) endTurnCallback();
    });
    document.getElementById('combat-back-btn')?.addEventListener('click', () => {
      actionMode = 'main';
      renderActionButtons();
    });

    actionButtons.querySelectorAll('.ally-select').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.index!, 10);
        if (currentParty[idx]?.hp > 0) {
          selectedAllyTargetIndex = idx;
          renderActionButtons();
        }
      });
    });

    actionButtons.querySelectorAll('.skill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!actionsEnabled) return;
        const skillId = (btn as HTMLElement).dataset.skillId!;
        const targeting = (btn as HTMLElement).dataset.targeting ?? '';
        const isAlly = targeting === 'single_ally' || targeting === 'all_allies' || targeting === 'self';
        const targetIdx = isAlly ? selectedAllyTargetIndex : selectedEnemyIndex;
        if (skillCallback) skillCallback(selectedHeroIndex, skillId, targetIdx, isAlly);
      });
    });

    actionButtons.querySelectorAll('.item-target-select').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.index!, 10);
        if (currentParty[idx]?.hp > 0) {
          selectedItemTargetIndex = idx;
          renderActionButtons();
        }
      });
    });

    actionButtons.querySelectorAll('.item-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!actionsEnabled) return;
        const itemId = (btn as HTMLElement).dataset.itemId!;
        if (itemCallback) itemCallback(selectedHeroIndex, itemId, selectedItemTargetIndex);
      });
    });

  }

  renderActionButtons();

  // --- Keyboard shortcuts ---
  function handleKeyDown(e: KeyboardEvent) {
    if (container.style.display === 'none' || !actionsEnabled) return;
    const key = e.key.toLowerCase();

    if (actionMode === 'main') {
      if (key === 'a') { document.getElementById('combat-attack-btn')?.click(); e.preventDefault(); }
      else if (key === 'g') { document.getElementById('combat-guard-btn')?.click(); e.preventDefault(); }
      else if (key === 's') { document.getElementById('combat-skills-btn')?.click(); e.preventDefault(); }
      else if (key === 'i') { document.getElementById('combat-items-btn')?.click(); e.preventDefault(); }
      else if (key === 'e') { document.getElementById('combat-end-turn-btn')?.click(); e.preventDefault(); }
      else if (key === 'tab') {
        // Cycle enemy target
        e.preventDefault();
        const aliveEnemies = currentEnemies.map((en, i) => ({ en, i })).filter(x => x.en.hp > 0);
        if (aliveEnemies.length > 0) {
          const curIdx = aliveEnemies.findIndex(x => x.i === selectedEnemyIndex);
          const nextIdx = (curIdx + 1) % aliveEnemies.length;
          selectedEnemyIndex = aliveEnemies[nextIdx].i;
          renderActionButtons();
        }
      }
    } else if (actionMode === 'skills') {
      if (key === 'escape' || key === 'b') { document.getElementById('combat-back-btn')?.click(); e.preventDefault(); }
      else if (key === 'tab') {
        // Cycle ally target in skill mode
        e.preventDefault();
        const aliveAllies = currentParty.map((c, i) => ({ c, i })).filter(x => x.c.hp > 0);
        if (aliveAllies.length > 0) {
          const curIdx = aliveAllies.findIndex(x => x.i === selectedAllyTargetIndex);
          const nextIdx = (curIdx + 1) % aliveAllies.length;
          selectedAllyTargetIndex = aliveAllies[nextIdx].i;
          renderActionButtons();
        }
      } else {
        const num = parseInt(key);
        if (num >= 1 && num <= currentSkills.length) {
          const skill = currentSkills[num - 1];
          if (skill && currentMp >= skill.mpCost) {
            // Click the button matching this skill's position (all buttons, including disabled)
            const allSkillBtns = document.querySelectorAll('.skill-btn');
            (allSkillBtns[num - 1] as HTMLElement)?.click();
            e.preventDefault();
          }
        }
      }
    } else if (actionMode === 'items') {
      if (key === 'escape' || key === 'b') { document.getElementById('combat-back-btn')?.click(); e.preventDefault(); }
      else if (key === 'tab') {
        // Cycle item target
        e.preventDefault();
        const aliveAllies = currentParty.map((c, i) => ({ c, i })).filter(x => x.c.hp > 0);
        if (aliveAllies.length > 0) {
          const curIdx = aliveAllies.findIndex(x => x.i === selectedItemTargetIndex);
          const nextIdx = (curIdx + 1) % aliveAllies.length;
          selectedItemTargetIndex = aliveAllies[nextIdx].i;
          renderActionButtons();
        }
      } else {
        const num = parseInt(key);
        const visibleItems = currentItems.filter(it => it.quantity > 0);
        if (num >= 1 && num <= visibleItems.length) {
          const itemBtns = document.querySelectorAll('.item-btn:not([disabled])');
          (itemBtns[num - 1] as HTMLElement)?.click();
          e.preventDefault();
        }
      }
    }
  }
  document.addEventListener('keydown', handleKeyDown);

  return {
    show() {
      container.style.display = 'block';
      actionMode = 'main';
      // Auto-select first alive hero
      const firstAliveHero = currentParty.findIndex(c => c.hp > 0);
      selectedHeroIndex = firstAliveHero >= 0 ? firstAliveHero : 0;
      // Auto-select first alive enemy
      const firstAliveEnemy = currentEnemies.findIndex(e => e.hp > 0);
      selectedEnemyIndex = firstAliveEnemy >= 0 ? firstAliveEnemy : 0;
      renderActionButtons();
    },

    hide() {
      container.style.display = 'none';
    },

    updateParty(party) {
      currentParty = party;
      if (party[selectedHeroIndex]?.hp <= 0) {
        const firstAlive = party.findIndex(c => c.hp > 0);
        if (firstAlive >= 0) {
          selectedHeroIndex = firstAlive;
          if (heroSelectCallback) heroSelectCallback(firstAlive);
        }
      }

      const partyList = document.getElementById('combat-party-list');
      if (!partyList) return;

      partyList.innerHTML = party
        .map(
          (char, i) => {
            const hpPercent = char.maxHp > 0 ? (char.hp / char.maxHp) * 100 : 0;
            const hpColor = hpPercent > 50 ? '#4CAF50' : hpPercent > 25 ? '#ffa500' : '#f44336';
            const isSelected = i === selectedHeroIndex;

            return `
            <div style="
              padding: 6px 8px; margin-bottom: 4px;
              background: ${char.hp > 0 ? (isSelected ? 'rgba(76, 175, 80, 0.25)' : 'rgba(76, 175, 80, 0.1)') : 'rgba(60, 60, 60, 0.2)'};
              border: 1px solid ${char.hp > 0 ? (isSelected ? '#4CAF50' : 'rgba(76, 175, 80, 0.4)') : '#555'};
              border-radius: 4px;
              ${char.hp <= 0 ? 'opacity: 0.4;' : ''}
            ">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: bold; font-size: 12px;">
                  ${char.name}
                  <span style="color: #aaa; font-weight: normal; font-size: 10px;">Lv${char.level}</span>
                  ${char.isGuarding ? ' <span style="color: #64B5F6;">[G]</span>' : ''}
                  ${char.statuses.length > 0 ? ' <span style="color: #ffa500; font-size: 10px;">' + char.statuses.join(' ') + '</span>' : ''}
                </span>
              </div>
              <div style="display: flex; gap: 8px; margin-top: 4px; align-items: center;">
                <div style="flex: 1;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                    <span style="font-size: 9px; color: ${hpColor};">HP</span>
                    <span style="font-size: 9px; color: ${hpColor};">${char.hp}/${char.maxHp}</span>
                  </div>
                  <div style="background: rgba(0,0,0,0.4); height: 5px; border-radius: 3px; overflow: hidden;">
                    <div style="width: ${hpPercent}%; height: 100%; background: ${hpColor}; transition: width 0.3s;"></div>
                  </div>
                </div>
                <div style="flex: 1;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                    <span style="font-size: 9px; color: #64B5F6;">MP</span>
                    <span style="font-size: 9px; color: #64B5F6;">${char.mp}/${char.maxMp}</span>
                  </div>
                  <div style="background: rgba(0,0,0,0.4); height: 5px; border-radius: 3px; overflow: hidden;">
                    <div style="width: ${char.maxMp > 0 ? (char.mp / char.maxMp) * 100 : 0}%; height: 100%; background: #64B5F6; transition: width 0.3s;"></div>
                  </div>
                </div>
              </div>
            </div>
          `})
        .join('');

      renderActionButtons();
    },

    updateEnemies(enemies) {
      currentEnemies = enemies;
      if (!enemies[selectedEnemyIndex] || enemies[selectedEnemyIndex]?.hp <= 0) {
        const firstAlive = enemies.findIndex(e => e.hp > 0);
        if (firstAlive >= 0) selectedEnemyIndex = firstAlive;
      }

      const enemyList = document.getElementById('combat-enemy-list');
      if (!enemyList) return;

      if (enemies.length === 0) {
        enemyList.innerHTML = '<div style="color: #666; font-style: italic; font-size: 11px;">No enemies</div>';
        return;
      }

      enemyList.innerHTML = enemies
        .map(
          (enemy) => {
            const hpPercent = enemy.maxHp > 0 ? (enemy.hp / enemy.maxHp) * 100 : 0;
            const hpColor = hpPercent > 50 ? '#f44336' : hpPercent > 25 ? '#ffa500' : '#666';

            return `
            <div style="
              padding: 6px 8px; margin-bottom: 4px;
              background: ${enemy.hp > 0 ? 'rgba(244, 67, 54, 0.1)' : 'rgba(60, 60, 60, 0.2)'};
              border: 1px solid ${enemy.hp > 0 ? 'rgba(244, 67, 54, 0.4)' : '#555'};
              border-radius: 4px;
              ${enemy.hp <= 0 ? 'opacity: 0.4;' : ''}
            ">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: bold; font-size: 12px;">
                  ${enemy.name}
                  ${enemy.isGuarding ? ' <span style="color: #64B5F6;">[G]</span>' : ''}
                  ${enemy.statuses.length > 0 ? ' <span style="color: #ffa500; font-size: 10px;">' + enemy.statuses.join(' ') + '</span>' : ''}
                </span>
                <span style="font-size: 10px; color: ${enemy.hp > 0 ? hpColor : '#555'};">${enemy.hp}/${enemy.maxHp}</span>
              </div>
              <div style="margin-top: 3px; background: rgba(0,0,0,0.4); height: 5px; border-radius: 3px; overflow: hidden;">
                <div style="width: ${hpPercent}%; height: 100%; background: ${hpColor}; transition: width 0.3s;"></div>
              </div>
            </div>
          `})
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

    updateTurnCounter(turn) {
      const el = document.getElementById('combat-turn-counter');
      if (el) el.textContent = `TURN ${turn}`;
    },

    updateGold(gold) {
      const el = document.getElementById('combat-gold-display');
      if (el) el.textContent = `${gold}g`;
    },

    addLogEntry(message) {
      const log = document.getElementById('combat-log-entries');
      if (!log) return;
      const entry = document.createElement('div');
      if (message === '') {
        entry.style.cssText = `height: 6px;`;
      } else if (message.startsWith('===')) {
        entry.style.cssText = `padding: 2px 0; color: #ffa500; font-weight: bold; font-size: 11px;`;
      } else if (message.startsWith('  ')) {
        // Sub-messages: color by content
        let color = '#bbb';
        if (message.includes('defeated')) color = '#f44336';
        else if (message.includes('recovers') || message.includes('regenerates')) color = '#66BB6A';
        else if (message.includes('Critical hit')) color = '#FFD54F';
        else if (message.includes('poison damage')) color = '#AB47BC';
        else if (message.includes('is poisoned') || message.includes('is stunned') || message.includes('is weakened')) color = '#AB47BC';
        else if (message.includes('is buffed') || message.includes('is shielded') || message.includes('gains')) color = '#64B5F6';
        else if (message.includes('guard is broken')) color = '#FF8A65';
        else if (message.includes('armor blocks')) color = '#78909C';
        entry.style.cssText = `padding: 1px 0; color: ${color}; font-size: 10px; padding-left: 8px;`;
      } else {
        // Top-level messages
        let color = '#ddd';
        if (message.includes('uses') && !message.includes('no')) color = '#CE93D8';
        else if (message.includes('attacks')) color = '#ef9a9a';
        else if (message.includes('defensive stance')) color = '#64B5F6';
        else if (message.includes('stunned and cannot')) color = '#AB47BC';
        entry.style.cssText = `padding: 1px 0; color: ${color}; font-size: 11px;`;
      }
      entry.textContent = message;
      log.appendChild(entry);
      log.scrollTop = log.scrollHeight;
    },

    clearLog() {
      const log = document.getElementById('combat-log-entries');
      if (log) log.innerHTML = '';
    },

    onAttack(callback) { attackCallback = callback; },
    onGuard(callback) { guardCallback = callback; },
    onSkill(callback) { skillCallback = callback; },
    onItem(callback) { itemCallback = callback; },
    onEndTurn(callback) { endTurnCallback = callback; },
    onHeroSelect(callback) { heroSelectCallback = callback; },

    setActionsEnabled(enabled) {
      actionsEnabled = enabled;
      renderActionButtons();
    },

    destroy() {
      document.removeEventListener('keydown', handleKeyDown);
      container.remove();
    },
  };
}
