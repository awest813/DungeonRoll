// Party selection screen - choose 3 heroes from 5 classes

export interface PartyClassInfo {
  id: string;
  name: string;
  role: string;
  hp: number;
  mp: number;
  attack: number;
  armor: number;
  speed: number;
  skills: string[];
  color: string;
}

export interface PartySelectScreen {
  show(classes: PartyClassInfo[]): void;
  hide(): void;
  destroy(): void;
  onConfirm(callback: (selectedClassIds: string[]) => void): void;
}

const CLASS_ROLES: Record<string, string> = {
  knight: 'Armored Tank',
  mage: 'Arcane DPS',
  ranger: 'Swift Archer',
  cleric: 'Holy Healer',
  rogue: 'Shadow Striker',
};

const CLASS_COLORS: Record<string, string> = {
  knight: '#4477BB',
  mage: '#9944CC',
  ranger: '#44AA44',
  cleric: '#CCAA44',
  rogue: '#7755AA',
};

export function createPartySelectScreen(): PartySelectScreen {
  const container = document.createElement('div');
  container.id = 'party-select-screen';
  container.style.cssText = `
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    display: none;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 300;
    pointer-events: auto;
    background: radial-gradient(ellipse at center, rgba(10, 10, 30, 0.85) 0%, rgba(0, 0, 0, 0.95) 100%);
    font-family: 'Courier New', monospace;
    color: #fff;
  `;

  const panel = document.createElement('div');
  panel.style.cssText = `
    width: 860px;
    max-height: 92vh;
    overflow-y: auto;
    background: rgba(20, 20, 35, 0.95);
    border: 2px solid rgba(76, 175, 80, 0.6);
    border-radius: 6px;
    animation: screenFadeIn 0.4s ease-out;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.3), rgba(30, 30, 50, 0.9));
    padding: 20px 24px;
    border-bottom: 2px solid rgba(76, 175, 80, 0.6);
    border-radius: 5px 5px 0 0;
    text-align: center;
  `;
  header.innerHTML = `
    <div style="font-size: 28px; font-weight: bold; color: #ffa500; text-shadow: 0 0 10px rgba(255, 165, 0, 0.3); letter-spacing: 4px;">
      CHOOSE YOUR PARTY
    </div>
    <div style="font-size: 12px; color: #aaa; margin-top: 6px; letter-spacing: 2px;">
      Select 3 heroes for your adventure
    </div>
  `;

  const contentArea = document.createElement('div');
  contentArea.style.cssText = `padding: 20px 24px;`;

  panel.appendChild(header);
  panel.appendChild(contentArea);
  container.appendChild(panel);
  document.body.appendChild(container);

  let confirmCallback: ((selectedClassIds: string[]) => void) | null = null;
  let selected: Set<string> = new Set();

  function render(classes: PartyClassInfo[]) {
    selected.clear();

    function renderCards() {
      const cards = classes.map(cls => {
        const isSelected = selected.has(cls.id);
        const color = CLASS_COLORS[cls.id] ?? '#888';
        const role = CLASS_ROLES[cls.id] ?? cls.role;
        const canSelect = selected.size < 3 || isSelected;

        return `
        <div class="class-card" data-class-id="${cls.id}" style="
          flex: 1;
          min-width: 140px;
          padding: 14px;
          background: ${isSelected ? `${color}22` : 'rgba(30, 30, 40, 0.6)'};
          border: 2px solid ${isSelected ? color : '#444'};
          border-radius: 8px;
          cursor: ${canSelect ? 'pointer' : 'not-allowed'};
          transition: all 0.2s ease;
          opacity: ${canSelect ? '1' : '0.4'};
          ${isSelected ? `box-shadow: 0 0 15px ${color}44;` : ''}
        ">
          <div style="text-align: center; margin-bottom: 10px;">
            <div style="font-size: 16px; font-weight: bold; color: ${color}; letter-spacing: 2px;">
              ${cls.name.toUpperCase()}
            </div>
            <div style="font-size: 10px; color: #aaa; margin-top: 2px; letter-spacing: 1px;">
              ${role}
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3px; font-size: 10px; margin-bottom: 10px;">
            <div style="color: #4CAF50;">HP <span style="color: #ccc; float: right;">${cls.hp}</span></div>
            <div style="color: #64B5F6;">MP <span style="color: #ccc; float: right;">${cls.mp}</span></div>
            <div style="color: #f44336;">ATK <span style="color: #ccc; float: right;">${cls.attack}</span></div>
            <div style="color: #9E9E9E;">ARM <span style="color: #ccc; float: right;">${cls.armor}</span></div>
            <div style="color: #FFEB3B;">SPD <span style="color: #ccc; float: right;">${cls.speed}</span></div>
          </div>

          <div style="border-top: 1px solid #333; padding-top: 8px;">
            <div style="font-size: 9px; color: #888; letter-spacing: 1px; margin-bottom: 4px;">SKILLS</div>
            ${cls.skills.map(s => `<div style="font-size: 10px; color: #CE93D8; margin-bottom: 1px;">- ${s}</div>`).join('')}
          </div>

          ${isSelected ? `<div style="text-align: center; margin-top: 8px; font-size: 11px; color: ${color}; font-weight: bold; letter-spacing: 1px;">SELECTED</div>` : ''}
        </div>
      `;
      }).join('');

      const canConfirm = selected.size === 3;
      contentArea.innerHTML = `
        <div style="display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;">
          ${cards}
        </div>
        <div style="text-align: center; margin-bottom: 8px;">
          <span style="font-size: 12px; color: ${canConfirm ? '#4CAF50' : '#888'}; letter-spacing: 2px;">
            ${selected.size} / 3 SELECTED
          </span>
        </div>
        <div style="text-align: center;">
          <button id="party-confirm-btn" style="
            width: 260px;
            padding: 14px 32px;
            font-size: 16px;
            font-family: 'Courier New', monospace;
            font-weight: bold;
            letter-spacing: 3px;
            border: 2px solid ${canConfirm ? '#4CAF50' : '#555'};
            border-radius: 6px;
            background: ${canConfirm ? 'rgba(76, 175, 80, 0.15)' : 'rgba(40, 40, 40, 0.5)'};
            color: ${canConfirm ? '#4CAF50' : '#666'};
            cursor: ${canConfirm ? 'pointer' : 'not-allowed'};
            transition: all 0.25s ease;
            text-transform: uppercase;
          " ${canConfirm ? '' : 'disabled'}>Begin Adventure</button>
        </div>
      `;

      // Wire card clicks
      contentArea.querySelectorAll('.class-card').forEach(card => {
        card.addEventListener('click', () => {
          const classId = (card as HTMLElement).dataset.classId!;
          if (selected.has(classId)) {
            selected.delete(classId);
          } else if (selected.size < 3) {
            selected.add(classId);
          }
          renderCards();
        });

        // Hover effect
        const el = card as HTMLElement;
        const classId = el.dataset.classId!;
        const canHover = selected.size < 3 || selected.has(classId);
        if (canHover) {
          el.addEventListener('mouseenter', () => {
            if (!selected.has(classId)) {
              el.style.borderColor = '#666';
              el.style.background = 'rgba(50, 50, 60, 0.6)';
            }
          });
          el.addEventListener('mouseleave', () => {
            if (!selected.has(classId)) {
              el.style.borderColor = '#444';
              el.style.background = 'rgba(30, 30, 40, 0.6)';
            }
          });
        }
      });

      // Wire confirm button
      const confirmBtn = document.getElementById('party-confirm-btn');
      if (confirmBtn && canConfirm) {
        confirmBtn.addEventListener('mouseenter', () => {
          confirmBtn.style.background = 'rgba(76, 175, 80, 0.3)';
          confirmBtn.style.transform = 'scale(1.03)';
          confirmBtn.style.boxShadow = '0 0 20px rgba(76, 175, 80, 0.3)';
        });
        confirmBtn.addEventListener('mouseleave', () => {
          confirmBtn.style.background = 'rgba(76, 175, 80, 0.15)';
          confirmBtn.style.transform = 'scale(1)';
          confirmBtn.style.boxShadow = 'none';
        });
        confirmBtn.addEventListener('click', () => {
          if (confirmCallback && selected.size === 3) {
            confirmCallback(Array.from(selected));
          }
        });
      }
    }

    renderCards();
  }

  return {
    show(classes) {
      render(classes);
      container.style.display = 'flex';
    },
    hide() {
      container.style.display = 'none';
    },
    destroy() {
      container.remove();
    },
    onConfirm(callback) {
      confirmCallback = callback;
    },
  };
}
