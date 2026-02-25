// Victory reward screen - shows XP, gold, level-ups after combat

export interface RewardLevelUp {
  characterName: string;
  oldLevel: number;
  newLevel: number;
  hpGain: number;
  mpGain: number;
  attackGain: number;
  armorGain: number;
  speedGain: number;
  newSkills: string[];
}

export interface RewardPartyMember {
  name: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  level: number;
  xp: number;
  xpToNext: number;
}

export interface RewardItemDrop {
  name: string;
  quantity: number;
}

export interface RewardData {
  xpEarned: number;
  goldEarned: number;
  levelUps: RewardLevelUp[];
  itemDrops: RewardItemDrop[];
  equipmentDrops: { name: string; rarity: string }[];
  party: RewardPartyMember[];
  roomName: string;
}

export interface RewardScreen {
  show(data: RewardData): void;
  hide(): void;
  destroy(): void;
  onContinue(callback: () => void): void;
}

export function createRewardScreen(): RewardScreen {
  const container = document.createElement('div');
  container.id = 'reward-screen';
  container.style.cssText = `
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    display: none;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 300;
    pointer-events: auto;
    background: radial-gradient(ellipse at center, rgba(10, 20, 10, 0.85) 0%, rgba(0, 0, 0, 0.95) 100%);
    font-family: 'Courier New', monospace;
    color: #fff;
  `;

  const panel = document.createElement('div');
  panel.style.cssText = `
    width: 600px;
    max-height: 85vh;
    overflow-y: auto;
    background: rgba(20, 20, 35, 0.95);
    border: 2px solid rgba(76, 175, 80, 0.6);
    border-radius: 6px;
    animation: screenFadeIn 0.4s ease-out;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.4), rgba(255, 165, 0, 0.2));
    padding: 24px;
    text-align: center;
    border-bottom: 2px solid rgba(76, 175, 80, 0.6);
    border-radius: 5px 5px 0 0;
  `;
  header.innerHTML = `
    <div style="font-size: 36px; font-weight: bold; color: #ffa500; text-shadow: 0 0 15px rgba(255, 165, 0, 0.4); letter-spacing: 6px;">
      VICTORY!
    </div>
  `;

  const contentArea = document.createElement('div');
  contentArea.id = 'reward-content';
  contentArea.style.cssText = `padding: 20px 24px;`;

  panel.appendChild(header);
  panel.appendChild(contentArea);
  container.appendChild(panel);
  document.body.appendChild(container);

  let continueCallback: (() => void) | null = null;

  function render(data: RewardData) {
    // Rewards earned
    const rewards = `
      <div style="display: flex; gap: 20px; margin-bottom: 20px;">
        <div style="
          flex: 1; text-align: center; padding: 14px;
          background: rgba(100, 100, 255, 0.1);
          border: 1px solid #64B5F6;
          border-radius: 6px;
        ">
          <div style="font-size: 11px; color: #64B5F6; letter-spacing: 2px; margin-bottom: 4px;">XP EARNED</div>
          <div style="font-size: 28px; font-weight: bold; color: #90CAF9;">${data.xpEarned}</div>
        </div>
        <div style="
          flex: 1; text-align: center; padding: 14px;
          background: rgba(255, 200, 0, 0.1);
          border: 1px solid #FFD54F;
          border-radius: 6px;
        ">
          <div style="font-size: 11px; color: #FFD54F; letter-spacing: 2px; margin-bottom: 4px;">GOLD EARNED</div>
          <div style="font-size: 28px; font-weight: bold; color: #FFE082;">${data.goldEarned}</div>
        </div>
      </div>
    `;

    // Level ups
    let levelUpHtml = '';
    if (data.levelUps.length > 0) {
      const levelUpEntries = data.levelUps.map(lu => `
        <div style="
          padding: 12px;
          background: rgba(255, 165, 0, 0.1);
          border: 1px solid #ffa500;
          border-radius: 5px;
          margin-bottom: 6px;
        ">
          <div style="font-weight: bold; font-size: 14px; color: #ffa500; margin-bottom: 6px;">
            ${lu.characterName} LEVEL UP! Lv${lu.oldLevel} &#8594; Lv${lu.newLevel}
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px; font-size: 11px; color: #ccc;">
            ${lu.hpGain > 0 ? `<span style="color: #4CAF50;">HP +${lu.hpGain}</span>` : ''}
            ${lu.mpGain > 0 ? `<span style="color: #64B5F6;">MP +${lu.mpGain}</span>` : ''}
            ${lu.attackGain > 0 ? `<span style="color: #f44336;">ATK +${lu.attackGain}</span>` : ''}
            ${lu.armorGain > 0 ? `<span style="color: #9E9E9E;">ARM +${lu.armorGain}</span>` : ''}
            ${lu.speedGain > 0 ? `<span style="color: #FFEB3B;">SPD +${lu.speedGain}</span>` : ''}
          </div>
          ${lu.newSkills.length > 0 ? `
            <div style="margin-top: 6px; font-size: 12px; color: #CE93D8;">
              Learned: ${lu.newSkills.join(', ')}
            </div>
          ` : ''}
        </div>
      `).join('');

      levelUpHtml = `
        <div style="margin-bottom: 20px;">
          <div style="font-size: 12px; color: #ffa500; letter-spacing: 2px; margin-bottom: 8px;">LEVEL UP!</div>
          ${levelUpEntries}
        </div>
      `;
    }

    // Item drops
    let itemDropsHtml = '';
    if (data.itemDrops.length > 0) {
      const dropEntries = data.itemDrops.map(drop => `
        <span style="
          display: inline-block;
          padding: 5px 12px;
          margin: 2px 4px;
          background: rgba(206, 147, 216, 0.1);
          border: 1px solid rgba(206, 147, 216, 0.4);
          border-radius: 4px;
          font-size: 12px;
          color: #CE93D8;
        ">${drop.name}${drop.quantity > 1 ? ` x${drop.quantity}` : ''}</span>
      `).join('');

      itemDropsHtml = `
        <div style="margin-bottom: 20px;">
          <div style="font-size: 12px; color: #CE93D8; letter-spacing: 2px; margin-bottom: 8px;">ITEMS FOUND</div>
          <div style="display: flex; flex-wrap: wrap; gap: 2px;">${dropEntries}</div>
        </div>
      `;
    }

    // Equipment drops
    let equipDropsHtml = '';
    if (data.equipmentDrops && data.equipmentDrops.length > 0) {
      const rarityColors: Record<string, string> = { common: '#9E9E9E', uncommon: '#4CAF50', rare: '#FFD54F' };
      const eqEntries = data.equipmentDrops.map(drop => {
        const color = rarityColors[drop.rarity] ?? '#9E9E9E';
        return `<span style="
          display: inline-block;
          padding: 5px 12px;
          margin: 2px 4px;
          background: rgba(0,0,0,0.2);
          border: 1px solid ${color}60;
          border-radius: 4px;
          font-size: 12px;
          color: ${color};
        ">${drop.name} <span style="font-size: 9px; text-transform: uppercase;">${drop.rarity}</span></span>`;
      }).join('');

      equipDropsHtml = `
        <div style="margin-bottom: 20px;">
          <div style="font-size: 12px; color: #FFD54F; letter-spacing: 2px; margin-bottom: 8px;">EQUIPMENT FOUND</div>
          <div style="display: flex; flex-wrap: wrap; gap: 2px;">${eqEntries}</div>
        </div>
      `;
    }

    // Party status
    const partyHtml = data.party.map(member => {
      const hpPercent = (member.hp / member.maxHp) * 100;
      const xpPercent = member.xpToNext > 0 ? (member.xp / member.xpToNext) * 100 : 0;
      const hpColor = hpPercent > 50 ? '#4CAF50' : hpPercent > 25 ? '#ffa500' : '#f44336';

      return `
        <div style="
          padding: 8px 12px; margin-bottom: 4px;
          background: rgba(0, 50, 0, 0.15);
          border: 1px solid rgba(76, 175, 80, 0.4);
          border-radius: 4px;
          ${member.hp <= 0 ? 'opacity: 0.4;' : ''}
        ">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-weight: bold; font-size: 12px;">${member.name} <span style="color: #aaa;">Lv${member.level}</span>${member.hp <= 0 ? ' <span style="color: #f44336; font-size: 10px;">[DEAD]</span>' : ''}</span>
            <span style="font-size: 10px; color: ${hpColor};">HP ${member.hp}/${member.maxHp}</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <div style="flex: 1;">
              <div style="background: rgba(0,0,0,0.4); height: 4px; border-radius: 2px; overflow: hidden;">
                <div style="width: ${hpPercent}%; height: 100%; background: ${hpColor};"></div>
              </div>
            </div>
            <div style="flex: 1;">
              <div style="font-size: 9px; color: #CE93D8; text-align: right; margin-bottom: 1px;">XP ${member.xp}/${member.xpToNext}</div>
              <div style="background: rgba(0,0,0,0.4); height: 4px; border-radius: 2px; overflow: hidden;">
                <div style="width: ${xpPercent}%; height: 100%; background: #CE93D8;"></div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    contentArea.innerHTML = `
      <div style="text-align: center; font-size: 13px; color: #aaa; margin-bottom: 16px;">
        ${data.roomName} cleared!
      </div>
      ${rewards}
      ${levelUpHtml}
      ${itemDropsHtml}
      ${equipDropsHtml}
      <div style="font-size: 12px; color: #aaa; letter-spacing: 2px; margin-bottom: 8px;">PARTY STATUS</div>
      ${partyHtml}
      <div style="text-align: center; margin-top: 24px;">
        <button id="reward-continue-btn" style="
          width: 220px;
          padding: 14px 32px;
          font-size: 16px;
          font-family: 'Courier New', monospace;
          font-weight: bold;
          letter-spacing: 3px;
          border: 2px solid #4CAF50;
          border-radius: 6px;
          background: rgba(76, 175, 80, 0.15);
          color: #4CAF50;
          cursor: pointer;
          transition: all 0.25s ease;
          text-transform: uppercase;
        ">Continue</button>
      </div>
    `;

    const continueBtn = document.getElementById('reward-continue-btn');
    if (continueBtn) {
      continueBtn.addEventListener('mouseenter', () => {
        continueBtn.style.background = 'rgba(76, 175, 80, 0.3)';
        continueBtn.style.transform = 'scale(1.03)';
        continueBtn.style.boxShadow = '0 0 20px rgba(76, 175, 80, 0.3)';
      });
      continueBtn.addEventListener('mouseleave', () => {
        continueBtn.style.background = 'rgba(76, 175, 80, 0.15)';
        continueBtn.style.transform = 'scale(1)';
        continueBtn.style.boxShadow = 'none';
      });
      continueBtn.addEventListener('click', () => {
        if (continueCallback) continueCallback();
      });
    }
  }

  return {
    show(data) {
      render(data);
      container.style.display = 'flex';
    },
    hide() {
      if (container.style.display !== 'none' && container.style.display !== '') {
        container.classList.add('screen-fade-out');
        setTimeout(() => {
          container.classList.remove('screen-fade-out');
          container.style.display = 'none';
        }, 250);
      } else {
        container.style.display = 'none';
      }
    },
    destroy() {
      container.remove();
    },
    onContinue(callback) {
      continueCallback = callback;
    },
  };
}
