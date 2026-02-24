// Character detail panel - shows full stats, equipment, and skills for a single character

export interface CharacterDetailSkill {
  name: string;
  description: string;
  mpCost: number;
  targeting: string;
}

export interface CharacterDetailEquipment {
  slot: string;
  name: string;
  rarity: string;
  description: string;
  bonuses: Record<string, number>;
}

export interface CharacterDetailData {
  name: string;
  characterClass: string;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  armor: number;
  speed: number;
  xp: number;
  xpToNext: number;
  skills: CharacterDetailSkill[];
  equipment: CharacterDetailEquipment[];
  equipmentBonuses: Record<string, number>;
  isDead: boolean;
}

export interface CharacterDetailPanel {
  show(data: CharacterDetailData): void;
  hide(): void;
  destroy(): void;
  onClose(callback: () => void): void;
}

const RARITY_COLORS: Record<string, string> = {
  common: '#9E9E9E',
  uncommon: '#4CAF50',
  rare: '#FFD54F',
};

const CLASS_COLORS: Record<string, string> = {
  knight: '#4477BB',
  mage: '#9944CC',
  ranger: '#44AA44',
  cleric: '#CCAA44',
  rogue: '#7755AA',
};

const TARGETING_LABELS: Record<string, string> = {
  single_enemy: 'Single Enemy',
  all_enemies: 'All Enemies',
  single_ally: 'Single Ally',
  all_allies: 'All Allies',
  self: 'Self',
};

export function createCharacterDetailPanel(): CharacterDetailPanel {
  const overlay = document.createElement('div');
  overlay.id = 'character-detail-panel';
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
    width: 520px;
    max-height: 88vh;
    overflow-y: auto;
    background: rgba(20, 20, 35, 0.98);
    border: 2px solid #4CAF50;
    border-radius: 10px;
    padding: 0;
    animation: fadeIn 0.3s ease-out;
  `;

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  let closeCallback: (() => void) | null = null;

  // Close on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay && closeCallback) closeCallback();
  });

  function render(data: CharacterDetailData) {
    const classColor = CLASS_COLORS[data.characterClass] ?? '#4CAF50';
    const hpPercent = (data.hp / data.maxHp) * 100;
    const mpPercent = data.maxMp > 0 ? (data.mp / data.maxMp) * 100 : 0;
    const xpPercent = data.xpToNext > 0 ? (data.xp / data.xpToNext) * 100 : 100;
    const hpColor = hpPercent > 50 ? '#4CAF50' : hpPercent > 25 ? '#ffa500' : '#f44336';
    const eb = data.equipmentBonuses;

    // Header
    const header = `
      <div style="
        background: linear-gradient(135deg, ${classColor}40, rgba(20, 20, 35, 0.95));
        padding: 20px 24px;
        border-bottom: 2px solid ${classColor};
        border-radius: 8px 8px 0 0;
        position: relative;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 10px; color: ${classColor}; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 4px;">
              ${data.characterClass}${data.isDead ? ' <span style="color: #f44336;">[DEAD]</span>' : ''}
            </div>
            <div style="font-size: 24px; font-weight: bold; color: #fff; text-shadow: 0 0 10px ${classColor}40;">
              ${data.name}
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 28px; font-weight: bold; color: ${classColor};">Lv ${data.level}</div>
          </div>
        </div>
        <button id="char-detail-close" style="
          position: absolute; top: 12px; right: 14px;
          background: none; border: 1px solid #555; border-radius: 4px;
          color: #888; font-size: 14px; cursor: pointer; padding: 2px 8px;
          font-family: 'Courier New', monospace;
          transition: all 0.2s;
        ">ESC</button>
      </div>
    `;

    // Resource bars
    const bars = `
      <div style="padding: 16px 24px 0;">
        <div style="margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span style="font-size: 11px; color: ${hpColor}; font-weight: bold;">HP</span>
            <span style="font-size: 11px; color: ${hpColor};">${data.hp} / ${data.maxHp}</span>
          </div>
          <div style="background: rgba(0,0,0,0.5); height: 8px; border-radius: 4px; overflow: hidden; border: 1px solid #333;">
            <div style="width: ${hpPercent}%; height: 100%; background: ${hpColor}; transition: width 0.3s;"></div>
          </div>
        </div>
        <div style="margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span style="font-size: 11px; color: #64B5F6; font-weight: bold;">MP</span>
            <span style="font-size: 11px; color: #64B5F6;">${data.mp} / ${data.maxMp}</span>
          </div>
          <div style="background: rgba(0,0,0,0.5); height: 8px; border-radius: 4px; overflow: hidden; border: 1px solid #333;">
            <div style="width: ${mpPercent}%; height: 100%; background: #64B5F6; transition: width 0.3s;"></div>
          </div>
        </div>
        <div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span style="font-size: 11px; color: #CE93D8; font-weight: bold;">XP</span>
            <span style="font-size: 11px; color: #CE93D8;">${data.xp} / ${data.xpToNext}</span>
          </div>
          <div style="background: rgba(0,0,0,0.5); height: 6px; border-radius: 3px; overflow: hidden; border: 1px solid #333;">
            <div style="width: ${xpPercent}%; height: 100%; background: #CE93D8; transition: width 0.3s;"></div>
          </div>
        </div>
      </div>
    `;

    // Stats with equipment bonus breakdown
    function statRow(label: string, value: number, bonus: number, color: string): string {
      const bonusStr = bonus > 0 ? `<span style="color: #4CAF50; font-size: 10px;"> (+${bonus})</span>`
        : bonus < 0 ? `<span style="color: #f44336; font-size: 10px;"> (${bonus})</span>` : '';
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
          <span style="font-size: 12px; color: ${color}; letter-spacing: 1px;">${label}</span>
          <span style="font-size: 14px; font-weight: bold; color: #eee;">${value}${bonusStr}</span>
        </div>
      `;
    }

    const stats = `
      <div style="padding: 16px 24px 0;">
        <div style="font-size: 11px; color: #aaa; letter-spacing: 2px; margin-bottom: 8px;">STATS</div>
        <div style="background: rgba(0,0,0,0.2); border: 1px solid #333; border-radius: 6px; padding: 8px 14px;">
          ${statRow('ATK', data.attack, eb.attack ?? 0, '#f44336')}
          ${statRow('ARM', data.armor, eb.armor ?? 0, '#78909C')}
          ${statRow('SPD', data.speed, eb.speed ?? 0, '#FFD54F')}
        </div>
      </div>
    `;

    // Equipment
    const slots = ['weapon', 'armor', 'accessory'];
    const equipHtml = slots.map(slot => {
      const item = data.equipment.find(e => e.slot === slot);
      if (item) {
        const color = RARITY_COLORS[item.rarity] ?? '#9E9E9E';
        const bonuses = Object.entries(item.bonuses)
          .filter(([, v]) => v !== 0)
          .map(([k, v]) => `<span style="color: ${v > 0 ? '#4CAF50' : '#f44336'};">${k.toUpperCase()} ${v > 0 ? '+' : ''}${v}</span>`)
          .join('  ');
        return `
          <div style="padding: 8px 12px; margin-bottom: 4px; background: rgba(0,0,0,0.2); border: 1px solid ${color}30; border-radius: 5px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span style="font-size: 9px; color: #666; letter-spacing: 1px; text-transform: uppercase;">${slot}</span>
                <div style="font-size: 13px; color: ${color}; margin-top: 2px;">${item.name}</div>
              </div>
              <span style="font-size: 9px; color: ${color}; letter-spacing: 1px; text-transform: uppercase; border: 1px solid ${color}40; padding: 1px 6px; border-radius: 3px;">${item.rarity}</span>
            </div>
            ${bonuses ? `<div style="font-size: 10px; margin-top: 4px;">${bonuses}</div>` : ''}
            ${item.description ? `<div style="font-size: 10px; color: #888; margin-top: 3px; font-style: italic;">${item.description}</div>` : ''}
          </div>
        `;
      }
      return `
        <div style="padding: 8px 12px; margin-bottom: 4px; background: rgba(0,0,0,0.1); border: 1px dashed #333; border-radius: 5px;">
          <span style="font-size: 9px; color: #555; letter-spacing: 1px; text-transform: uppercase;">${slot}</span>
          <div style="font-size: 12px; color: #444; margin-top: 2px;">Empty</div>
        </div>
      `;
    }).join('');

    const equipSection = `
      <div style="padding: 16px 24px 0;">
        <div style="font-size: 11px; color: #aaa; letter-spacing: 2px; margin-bottom: 8px;">EQUIPMENT</div>
        ${equipHtml}
      </div>
    `;

    // Skills
    const skillItems = data.skills.map(skill => {
      const targetLabel = TARGETING_LABELS[skill.targeting] ?? skill.targeting;
      return `
        <div style="padding: 8px 12px; margin-bottom: 4px; background: rgba(0,0,0,0.2); border: 1px solid #333; border-radius: 5px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 13px; color: #e0e0e0; font-weight: bold;">${skill.name}</span>
            <span style="font-size: 10px; color: #64B5F6;">${skill.mpCost > 0 ? `${skill.mpCost} MP` : 'Free'}</span>
          </div>
          <div style="font-size: 10px; color: #aaa; margin-top: 3px;">${skill.description}</div>
          <div style="font-size: 9px; color: #666; margin-top: 3px; letter-spacing: 1px;">${targetLabel}</div>
        </div>
      `;
    }).join('');

    const skillSection = `
      <div style="padding: 16px 24px 20px;">
        <div style="font-size: 11px; color: #aaa; letter-spacing: 2px; margin-bottom: 8px;">SKILLS</div>
        ${skillItems.length > 0 ? skillItems : '<div style="font-size: 12px; color: #555;">No skills learned</div>'}
      </div>
    `;

    panel.innerHTML = header + bars + stats + equipSection + skillSection;

    // Wire close button
    const closeBtn = document.getElementById('char-detail-close');
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
  }

  // ESC key handler
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && overlay.style.display !== 'none' && closeCallback) {
      closeCallback();
    }
  }

  return {
    show(data) {
      render(data);
      overlay.style.display = 'flex';
      document.addEventListener('keydown', onKeyDown);
    },
    hide() {
      overlay.style.display = 'none';
      document.removeEventListener('keydown', onKeyDown);
    },
    destroy() {
      document.removeEventListener('keydown', onKeyDown);
      overlay.remove();
    },
    onClose(callback) {
      closeCallback = callback;
    },
  };
}
