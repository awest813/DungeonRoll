// Inventory screen - manage and use items between combats

export interface InventoryItemData {
  itemId: string;
  name: string;
  description: string;
  quantity: number;
  effectLabel: string;
  canUse: boolean;
}

export interface InventoryPartyMember {
  name: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  alive: boolean;
}

export interface InventoryData {
  items: InventoryItemData[];
  party: InventoryPartyMember[];
  gold: number;
}

export interface InventoryScreen {
  show(data: InventoryData): void;
  hide(): void;
  destroy(): void;
  onClose(callback: () => void): void;
  onUseItem(callback: (itemId: string, charIndex: number) => void): void;
}

export function createInventoryScreen(): InventoryScreen {
  const overlay = document.createElement('div');
  overlay.id = 'inventory-screen';
  overlay.style.cssText = `
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 400;
    pointer-events: auto;
    background: rgba(0, 0, 0, 0.7);
    font-family: 'Courier New', monospace;
    color: #fff;
  `;

  const panel = document.createElement('div');
  panel.style.cssText = `
    width: 580px;
    max-height: 88vh;
    overflow-y: auto;
    background: rgba(20, 20, 35, 0.98);
    border: 2px solid rgba(206, 147, 216, 0.7);
    border-radius: 6px;
    padding: 0;
    animation: screenFadeIn 0.35s ease-out;
  `;

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  let closeCallback: (() => void) | null = null;
  let useItemCallback: ((itemId: string, charIndex: number) => void) | null = null;

  // Currently selected item for targeting
  let selectedItemId: string | null = null;
  let currentData: InventoryData | null = null;

  // Close on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      if (selectedItemId) {
        selectedItemId = null;
        if (currentData) render(currentData);
      } else if (closeCallback) {
        closeCallback();
      }
    }
  });

  function render(data: InventoryData) {
    currentData = data;

    // Header
    const header = `
      <div style="
        background: linear-gradient(135deg, rgba(206, 147, 216, 0.25), rgba(20, 20, 35, 0.95));
        padding: 20px 24px;
        border-bottom: 2px solid #CE93D8;
        border-radius: 8px 8px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <div>
          <div style="font-size: 22px; font-weight: bold; color: #CE93D8; text-shadow: 0 0 10px rgba(206, 147, 216, 0.3);">
            Inventory
          </div>
          <div style="font-size: 11px; color: #aaa; margin-top: 4px;">
            ${data.items.length > 0 ? `${data.items.reduce((s, i) => s + i.quantity, 0)} items` : 'No items'}
            &nbsp;&middot;&nbsp;
            <span style="color: #FFE082;">${data.gold} gold</span>
          </div>
        </div>
        <button id="inv-close-btn" style="
          background: none; border: 1px solid #555; border-radius: 4px;
          color: #888; font-size: 14px; cursor: pointer; padding: 2px 8px;
          font-family: 'Courier New', monospace;
          transition: all 0.2s;
        ">ESC</button>
      </div>
    `;

    // Target selection mode
    if (selectedItemId) {
      const item = data.items.find(i => i.itemId === selectedItemId);
      const targetHtml = data.party.map((member, idx) => {
        const hpPercent = (member.hp / member.maxHp) * 100;
        const hpColor = hpPercent > 50 ? '#4CAF50' : hpPercent > 25 ? '#ffa500' : '#f44336';
        const canTarget = member.alive;
        return `
          <button class="inv-target-btn" data-char="${idx}" style="
            width: 100%;
            padding: 10px 14px;
            margin-bottom: 6px;
            font-family: 'Courier New', monospace;
            background: ${canTarget ? 'rgba(0, 50, 0, 0.2)' : 'rgba(40, 20, 20, 0.2)'};
            border: 1px solid ${canTarget ? '#4CAF50' : '#555'};
            border-radius: 5px;
            color: ${canTarget ? '#ddd' : '#666'};
            cursor: ${canTarget ? 'pointer' : 'not-allowed'};
            text-align: left;
            transition: all 0.2s;
            ${!canTarget ? 'opacity: 0.4;' : ''}
          " ${canTarget ? '' : 'disabled'}>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 13px; font-weight: bold;">${member.name}</span>
              ${!member.alive ? '<span style="font-size: 10px; color: #f44336;">[DEAD]</span>' : ''}
            </div>
            <div style="display: flex; gap: 16px; margin-top: 6px;">
              <div style="flex: 1;">
                <div style="font-size: 9px; color: ${hpColor};">HP ${member.hp}/${member.maxHp}</div>
                <div style="background: rgba(0,0,0,0.5); height: 4px; border-radius: 2px; overflow: hidden; margin-top: 2px;">
                  <div style="width: ${hpPercent}%; height: 100%; background: ${hpColor};"></div>
                </div>
              </div>
              <div style="flex: 1;">
                <div style="font-size: 9px; color: #64B5F6;">MP ${member.mp}/${member.maxMp}</div>
                <div style="background: rgba(0,0,0,0.5); height: 4px; border-radius: 2px; overflow: hidden; margin-top: 2px;">
                  <div style="width: ${member.maxMp > 0 ? (member.mp / member.maxMp) * 100 : 0}%; height: 100%; background: #64B5F6;"></div>
                </div>
              </div>
            </div>
          </button>
        `;
      }).join('');

      panel.innerHTML = header + `
        <div style="padding: 20px 24px;">
          <div style="margin-bottom: 16px;">
            <div style="font-size: 11px; color: #aaa; letter-spacing: 2px; margin-bottom: 4px;">USING</div>
            <div style="
              padding: 10px 14px;
              background: rgba(206, 147, 216, 0.1);
              border: 1px solid #CE93D8;
              border-radius: 5px;
            ">
              <span style="font-size: 14px; color: #CE93D8; font-weight: bold;">${item?.name ?? 'Unknown'}</span>
              <span style="font-size: 11px; color: #aaa; margin-left: 8px;">${item?.effectLabel ?? ''}</span>
            </div>
          </div>
          <div style="font-size: 11px; color: #aaa; letter-spacing: 2px; margin-bottom: 8px;">SELECT TARGET</div>
          ${targetHtml}
          <button id="inv-cancel-target" style="
            width: 100%;
            padding: 8px;
            margin-top: 8px;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            letter-spacing: 2px;
            background: rgba(40, 40, 40, 0.4);
            border: 1px solid #555;
            border-radius: 4px;
            color: #888;
            cursor: pointer;
            transition: all 0.2s;
          ">CANCEL</button>
        </div>
      `;

      wireTargetButtons();
      return;
    }

    // Normal item list
    let itemListHtml: string;
    if (data.items.length === 0) {
      itemListHtml = `
        <div style="text-align: center; padding: 30px 0; color: #555;">
          <div style="font-size: 32px; margin-bottom: 10px;">&#9776;</div>
          <div style="font-size: 13px;">No items collected yet</div>
          <div style="font-size: 11px; color: #444; margin-top: 4px;">Defeat enemies to find potions and supplies</div>
        </div>
      `;
    } else {
      itemListHtml = data.items.map(item => {
        return `
          <div style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 14px;
            margin-bottom: 4px;
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid #333;
            border-radius: 5px;
            transition: border-color 0.2s;
          ">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 14px; color: #e0e0e0; font-weight: bold;">${item.name}</span>
                <span style="font-size: 11px; color: #CE93D8; background: rgba(206, 147, 216, 0.1); padding: 1px 6px; border-radius: 3px;">x${item.quantity}</span>
              </div>
              <div style="font-size: 10px; color: #888; margin-top: 3px;">${item.description}</div>
              <div style="font-size: 9px; color: #CE93D8; margin-top: 2px;">${item.effectLabel}</div>
            </div>
            ${item.canUse ? `
              <button class="inv-use-btn" data-item="${item.itemId}" style="
                padding: 6px 14px;
                font-family: 'Courier New', monospace;
                font-size: 11px;
                font-weight: bold;
                letter-spacing: 1px;
                background: rgba(206, 147, 216, 0.1);
                border: 1px solid #CE93D8;
                border-radius: 4px;
                color: #CE93D8;
                cursor: pointer;
                transition: all 0.2s;
                white-space: nowrap;
              ">USE</button>
            ` : `
              <span style="font-size: 10px; color: #555; padding: 6px 14px;">&#8212;</span>
            `}
          </div>
        `;
      }).join('');
    }

    panel.innerHTML = header + `
      <div style="padding: 20px 24px;">
        <div style="font-size: 11px; color: #aaa; letter-spacing: 2px; margin-bottom: 8px;">ITEMS</div>
        ${itemListHtml}
      </div>
    `;

    wireButtons();
  }

  function wireButtons() {
    const closeBtn = document.getElementById('inv-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.borderColor = '#aaa';
        closeBtn.style.color = '#ddd';
      });
      closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.borderColor = '#555';
        closeBtn.style.color = '#888';
      });
      closeBtn.addEventListener('click', () => {
        if (closeCallback) closeCallback();
      });
    }

    document.querySelectorAll('.inv-use-btn').forEach(btn => {
      const el = btn as HTMLElement;
      const itemId = el.dataset.item ?? '';
      el.addEventListener('mouseenter', () => {
        el.style.background = 'rgba(206, 147, 216, 0.25)';
        el.style.boxShadow = '0 0 8px rgba(206, 147, 216, 0.2)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.background = 'rgba(206, 147, 216, 0.1)';
        el.style.boxShadow = 'none';
      });
      el.addEventListener('click', () => {
        selectedItemId = itemId;
        if (currentData) render(currentData);
      });
    });
  }

  function wireTargetButtons() {
    const closeBtn = document.getElementById('inv-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (closeCallback) closeCallback();
      });
    }

    const cancelBtn = document.getElementById('inv-cancel-target');
    if (cancelBtn) {
      cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.borderColor = '#888';
        cancelBtn.style.color = '#ccc';
      });
      cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.borderColor = '#555';
        cancelBtn.style.color = '#888';
      });
      cancelBtn.addEventListener('click', () => {
        selectedItemId = null;
        if (currentData) render(currentData);
      });
    }

    document.querySelectorAll('.inv-target-btn').forEach(btn => {
      const el = btn as HTMLButtonElement;
      if (el.disabled) return;
      const charIdx = parseInt(el.dataset.char ?? '-1', 10);
      el.addEventListener('mouseenter', () => {
        el.style.background = 'rgba(0, 80, 0, 0.3)';
        el.style.borderColor = '#66BB6A';
        el.style.boxShadow = '0 0 10px rgba(76, 175, 80, 0.2)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.background = 'rgba(0, 50, 0, 0.2)';
        el.style.borderColor = '#4CAF50';
        el.style.boxShadow = 'none';
      });
      el.addEventListener('click', () => {
        if (useItemCallback && selectedItemId && charIdx >= 0) {
          useItemCallback(selectedItemId, charIdx);
        }
      });
    });
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && overlay.style.display !== 'none') {
      if (selectedItemId) {
        selectedItemId = null;
        if (currentData) render(currentData);
      } else if (closeCallback) {
        closeCallback();
      }
    }
  }

  return {
    show(data) {
      selectedItemId = null;
      render(data);
      overlay.style.display = 'flex';
      document.addEventListener('keydown', onKeyDown);
    },
    hide() {
      overlay.style.display = 'none';
      selectedItemId = null;
      document.removeEventListener('keydown', onKeyDown);
    },
    destroy() {
      document.removeEventListener('keydown', onKeyDown);
      overlay.remove();
    },
    onClose(callback) {
      closeCallback = callback;
    },
    onUseItem(callback) {
      useItemCallback = callback;
    },
  };
}
