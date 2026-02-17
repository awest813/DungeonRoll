// Combat UI - displays party, enemies, actions, and combat log

export interface CombatUI {
  show(): void;
  hide(): void;
  updateParty(party: { name: string; hp: number; maxHp: number; isGuarding: boolean }[]): void;
  updateEnemy(enemy: { name: string; hp: number; maxHp: number; isGuarding: boolean } | null): void;
  updateInventory(items: string[]): void;
  addLogEntry(message: string): void;
  clearLog(): void;
  onAttack(callback: (heroIndex: number) => void): void;
  onGuard(callback: (heroIndex: number) => void): void;
  onUseItem(callback: (heroIndex: number, itemId: string) => void): void;
  onEndTurn(callback: () => void): void;
  destroy(): void;
}

export function createCombatUI(): CombatUI {
  const container = document.createElement('div');
  container.id = 'combat-ui';
  container.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:800px;max-height:90vh;background:rgba(20,20,30,.95);border:2px solid #4CAF50;border-radius:10px;font-family:Courier New,monospace;color:#fff;z-index:200;display:none;overflow:hidden;';

  const title = document.createElement('div');
  title.style.cssText = 'background:#4CAF50;color:#000;padding:15px;font-size:20px;font-weight:bold;text-align:center;border-bottom:2px solid #45a049;';
  title.textContent = '⚔️ COMBAT ⚔️';

  const content = document.createElement('div');
  content.style.cssText = 'display:flex;padding:20px;gap:20px;max-height:calc(90vh - 60px);overflow-y:auto;';

  const leftPanel = document.createElement('div');
  leftPanel.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:20px;';
  leftPanel.innerHTML = `<div style="background:rgba(0,100,0,.2);border:1px solid #4CAF50;border-radius:5px;padding:10px;"><div style="font-size:16px;font-weight:bold;margin-bottom:10px;color:#4CAF50;">YOUR PARTY</div><div id="party-list"></div></div><div style="background:rgba(100,0,0,.2);border:1px solid #f44336;border-radius:5px;padding:10px;"><div style="font-size:16px;font-weight:bold;margin-bottom:10px;color:#f44336;">ENEMY</div><div id="enemy-list"></div></div>`;

  const rightPanel = document.createElement('div');
  rightPanel.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:20px;';
  rightPanel.innerHTML = `<div style="background:rgba(0,0,100,.2);border:1px solid #2196F3;border-radius:5px;padding:10px;"><div style="font-size:16px;font-weight:bold;margin-bottom:10px;color:#2196F3;">ACTIONS</div><div id="action-buttons"></div><div id="inventory-list" style="margin-top:8px;font-size:12px;color:#ddd;"></div></div><div style="background:rgba(0,0,0,.5);border:1px solid #888;border-radius:5px;padding:10px;flex:1;display:flex;flex-direction:column;"><div style="font-size:16px;font-weight:bold;margin-bottom:10px;color:#ffa500;">COMBAT LOG</div><div id="combat-log" style="flex:1;overflow-y:auto;font-size:12px;line-height:1.5;min-height:200px;max-height:400px;"></div></div>`;

  content.appendChild(leftPanel);
  content.appendChild(rightPanel);
  container.appendChild(title);
  container.appendChild(content);
  document.body.appendChild(container);

  let attackCallback: ((heroIndex: number) => void) | null = null;
  let guardCallback: ((heroIndex: number) => void) | null = null;
  let itemCallback: ((heroIndex: number, itemId: string) => void) | null = null;
  let endTurnCallback: (() => void) | null = null;
  let selectedHeroIndex = 0;

  const createActionButtons = () => {
    const actionButtons = document.getElementById('action-buttons');
    if (!actionButtons) return;
    actionButtons.innerHTML = `<div style="margin-bottom:15px;"><div style="font-size:12px;color:#aaa;margin-bottom:5px;">Select Hero:</div><div id="hero-selector"></div></div><button id="attack-btn" style="width:100%;padding:10px;margin-bottom:8px;background:#f44336;color:#fff;border:none;border-radius:5px;cursor:pointer;">⚔️ ATTACK</button><button id="guard-btn" style="width:100%;padding:10px;margin-bottom:8px;background:#2196F3;color:#fff;border:none;border-radius:5px;cursor:pointer;">🛡️ GUARD</button><button id="use-item-btn" style="width:100%;padding:10px;margin-bottom:8px;background:#9C27B0;color:#fff;border:none;border-radius:5px;cursor:pointer;">🧪 USE ITEM</button><button id="end-turn-btn" style="width:100%;padding:10px;background:#FF9800;color:#fff;border:none;border-radius:5px;cursor:pointer;">⏭️ END TURN</button>`;

    document.getElementById('attack-btn')?.addEventListener('click', () => attackCallback?.(selectedHeroIndex));
    document.getElementById('guard-btn')?.addEventListener('click', () => guardCallback?.(selectedHeroIndex));
    document.getElementById('use-item-btn')?.addEventListener('click', () => {
      const select = document.getElementById('item-select') as HTMLSelectElement | null;
      if (select?.value) {
        itemCallback?.(selectedHeroIndex, select.value);
      }
    });
    document.getElementById('end-turn-btn')?.addEventListener('click', () => endTurnCallback?.());
  };

  createActionButtons();

  return {
    show() { container.style.display = 'block'; },
    hide() { container.style.display = 'none'; },
    updateParty(party) {
      const partyList = document.getElementById('party-list');
      const heroSelector = document.getElementById('hero-selector');
      if (!partyList || !heroSelector) return;

      partyList.innerHTML = party.map(char => `<div style="padding:8px;margin-bottom:5px;background:${char.hp > 0 ? 'rgba(76,175,80,.2)' : 'rgba(100,100,100,.2)'};border:1px solid ${char.hp > 0 ? '#4CAF50' : '#666'};border-radius:3px;${char.hp <= 0 ? 'opacity:.5' : ''}"><div style="display:flex;justify-content:space-between;"><span>${char.name}${char.isGuarding ? ' 🛡️' : ''}</span><span>HP: ${char.hp}/${char.maxHp}</span></div></div>`).join('');
      heroSelector.innerHTML = party.map((char, index) => `<button id="hero-select-${index}" style="padding:5px 8px;margin:2px;background:${selectedHeroIndex === index ? '#4CAF50' : '#2e7d32'};border:1px solid #4CAF50;color:#fff;${char.hp <= 0 ? 'opacity:.3' : ''}">${char.name}</button>`).join('');
      party.forEach((char, index) => {
        if (char.hp <= 0) return;
        document.getElementById(`hero-select-${index}`)?.addEventListener('click', () => {
          selectedHeroIndex = index;
          this.updateParty(party);
        });
      });
    },
    updateEnemy(enemy) {
      const enemyList = document.getElementById('enemy-list');
      if (!enemyList) return;
      enemyList.innerHTML = enemy ? `<div>${enemy.name}${enemy.isGuarding ? ' 🛡️' : ''} - HP: ${enemy.hp}/${enemy.maxHp}</div>` : '<div>No enemy</div>';
    },
    updateInventory(items) {
      const inventory = document.getElementById('inventory-list');
      if (!inventory) return;
      inventory.innerHTML = `<div style="margin-bottom:4px;color:#9C27B0;">Inventory</div><select id="item-select" style="width:100%;padding:6px;background:#222;color:#fff;border:1px solid #555;"><option value="">Select item...</option>${items.map(item => `<option value="${item}">${item}</option>`).join('')}</select>`;
    },
    addLogEntry(message) {
      const log = document.getElementById('combat-log');
      if (!log) return;
      const entry = document.createElement('div');
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
    onUseItem(callback) { itemCallback = callback; },
    onEndTurn(callback) { endTurnCallback = callback; },
    destroy() { container.remove(); },
  };
}
