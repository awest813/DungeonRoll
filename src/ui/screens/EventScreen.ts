// Event screen - pre-combat preview OR narrative event with choices

export interface EventData {
  roomName: string;
  roomDescription: string;
  encounterPreview: string[];
  roomIndex: number;
  totalRooms: number;
  flavorText: string;
}

export interface NarrativeEventChoice {
  id: string;
  label: string;
  description: string;
  goldCost?: number;
  enabled: boolean;
}

export interface NarrativeEventData {
  roomName: string;
  roomDescription: string;
  eventName: string;
  eventDescription: string;
  flavorText: string;
  choices: NarrativeEventChoice[];
  roomIndex: number;
  totalRooms: number;
}

export interface EventScreen {
  show(data: EventData): void;
  showNarrative(data: NarrativeEventData): void;
  showOutcome(message: string): void;
  hide(): void;
  destroy(): void;
  onProceed(callback: () => void): void;
  onChoice(callback: (choiceId: string) => void): void;
  onOutcomeDismiss(callback: () => void): void;
}

const ROOM_FLAVOR: Record<string, string> = {
  'entry-hall': 'Torchlight flickers against damp stone walls. The sound of scurrying feet echoes from deeper within the dungeon.',
  'goblin-den': 'The stench of goblin nests fills the air. Crude weapons and stolen trinkets litter the ground.',
  'bone-corridor': 'Ancient bones rattle as an unnatural chill sweeps through the corridor. The dead do not rest here.',
  'wolf-den': 'Low growls reverberate through a cavernous chamber. Claw marks scar the stone floor.',
  'troll-bridge': 'A massive stone bridge spans a bottomless chasm. Something enormous blocks the way forward.',
  'dark-sanctum': 'Dark energy crackles in the air. Profane symbols glow with malevolent light on the walls.',
  'dragon-lair': 'Waves of heat wash over you. Mountains of scorched gold glitter in the firelight ahead.',
};

export function createEventScreen(): EventScreen {
  const container = document.createElement('div');
  container.id = 'event-screen';
  container.style.cssText = `
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    display: none;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 300;
    pointer-events: auto;
    background: radial-gradient(ellipse at center, rgba(10, 10, 20, 0.9) 0%, rgba(0, 0, 0, 0.97) 100%);
    font-family: 'Courier New', monospace;
    color: #fff;
  `;

  const panel = document.createElement('div');
  panel.style.cssText = `
    width: 560px;
    max-height: 90vh;
    overflow-y: auto;
    background: rgba(20, 20, 35, 0.95);
    border: 2px solid rgba(255, 165, 0, 0.7);
    border-radius: 6px;
    animation: screenFadeIn 0.4s ease-out;
  `;

  const contentArea = document.createElement('div');
  panel.appendChild(contentArea);
  container.appendChild(panel);
  document.body.appendChild(container);

  let proceedCallback: (() => void) | null = null;
  let choiceCallback: ((choiceId: string) => void) | null = null;
  let outcomeDismissCallback: (() => void) | null = null;

  function renderCombatEvent(data: EventData) {
    const flavor = ROOM_FLAVOR[data.roomName.toLowerCase().replace(/[^a-z-]/g, '')] ??
                   ROOM_FLAVOR[Object.keys(ROOM_FLAVOR).find(k => data.roomName.toLowerCase().includes(k.split('-')[0])) ?? ''] ??
                   data.flavorText;

    contentArea.innerHTML = `
      <div style="
        background: linear-gradient(135deg, rgba(255, 165, 0, 0.2), rgba(20, 20, 30, 0.9));
        padding: 24px;
        border-bottom: 1px solid rgba(255, 165, 0, 0.3);
        border-radius: 5px 5px 0 0;
        text-align: center;
      ">
        <div style="font-size: 11px; color: #888; letter-spacing: 3px; margin-bottom: 6px;">
          ROOM ${data.roomIndex + 1} OF ${data.totalRooms}
        </div>
        <div style="font-size: 26px; font-weight: bold; color: #ffa500; text-shadow: 0 0 12px rgba(255, 165, 0, 0.3); letter-spacing: 3px;">
          ${data.roomName}
        </div>
        <div style="font-size: 12px; color: #ccc; margin-top: 6px;">
          ${data.roomDescription}
        </div>
      </div>

      <div style="padding: 24px;">
        <div style="
          font-size: 13px;
          color: #aaa;
          line-height: 1.7;
          margin-bottom: 24px;
          font-style: italic;
          padding: 14px;
          border-left: 3px solid rgba(255, 165, 0, 0.4);
          background: rgba(255, 165, 0, 0.05);
          border-radius: 0 4px 4px 0;
        ">
          ${flavor}
        </div>

        ${data.encounterPreview.length > 0 ? `
          <div style="margin-bottom: 24px;">
            <div style="font-size: 11px; color: #f44336; letter-spacing: 2px; margin-bottom: 8px;">ENEMIES ENCOUNTERED</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${data.encounterPreview.map(name => `
                <span style="
                  padding: 5px 12px;
                  background: rgba(244, 67, 54, 0.15);
                  border: 1px solid rgba(244, 67, 54, 0.4);
                  border-radius: 4px;
                  font-size: 12px;
                  color: #e88;
                ">${name}</span>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div style="text-align: center;">
          <button id="event-proceed-btn" style="
            width: 240px;
            padding: 14px 32px;
            font-size: 16px;
            font-family: 'Courier New', monospace;
            font-weight: bold;
            letter-spacing: 3px;
            border: 2px solid #f44336;
            border-radius: 6px;
            background: rgba(244, 67, 54, 0.15);
            color: #f44336;
            cursor: pointer;
            transition: all 0.25s ease;
            text-transform: uppercase;
          ">Enter Battle</button>
        </div>
      </div>
    `;

    const proceedBtn = document.getElementById('event-proceed-btn');
    if (proceedBtn) {
      proceedBtn.addEventListener('mouseenter', () => {
        proceedBtn.style.background = 'rgba(244, 67, 54, 0.3)';
        proceedBtn.style.transform = 'scale(1.03)';
        proceedBtn.style.boxShadow = '0 0 20px rgba(244, 67, 54, 0.3)';
      });
      proceedBtn.addEventListener('mouseleave', () => {
        proceedBtn.style.background = 'rgba(244, 67, 54, 0.15)';
        proceedBtn.style.transform = 'scale(1)';
        proceedBtn.style.boxShadow = 'none';
      });
      proceedBtn.addEventListener('click', () => {
        if (proceedCallback) proceedCallback();
      });
    }
  }

  function renderNarrativeEvent(data: NarrativeEventData) {
    contentArea.innerHTML = `
      <div style="
        background: linear-gradient(135deg, rgba(100, 180, 255, 0.2), rgba(20, 20, 30, 0.9));
        padding: 24px;
        border-bottom: 1px solid rgba(100, 180, 255, 0.3);
        border-radius: 5px 5px 0 0;
        text-align: center;
      ">
        <div style="font-size: 11px; color: #888; letter-spacing: 3px; margin-bottom: 6px;">
          ROOM ${data.roomIndex + 1} OF ${data.totalRooms}
        </div>
        <div style="font-size: 26px; font-weight: bold; color: #64b5f6; text-shadow: 0 0 12px rgba(100, 180, 255, 0.3); letter-spacing: 3px;">
          ${data.eventName}
        </div>
        <div style="font-size: 12px; color: #ccc; margin-top: 6px;">
          ${data.eventDescription}
        </div>
      </div>

      <div style="padding: 24px;">
        <div style="
          font-size: 13px;
          color: #aaa;
          line-height: 1.7;
          margin-bottom: 24px;
          font-style: italic;
          padding: 14px;
          border-left: 3px solid rgba(100, 180, 255, 0.4);
          background: rgba(100, 180, 255, 0.05);
          border-radius: 0 4px 4px 0;
        ">
          ${data.flavorText}
        </div>

        <div style="font-size: 11px; color: #64b5f6; letter-spacing: 2px; margin-bottom: 12px;">CHOOSE YOUR ACTION</div>
        <div id="event-choices-container" style="display: flex; flex-direction: column; gap: 10px;"></div>
      </div>
    `;

    const choicesContainer = document.getElementById('event-choices-container');
    if (!choicesContainer) return;

    data.choices.forEach(choice => {
      const btn = document.createElement('button');
      btn.style.cssText = `
        width: 100%;
        padding: 14px 20px;
        font-size: 13px;
        font-family: 'Courier New', monospace;
        border: 1px solid ${choice.enabled ? 'rgba(100, 180, 255, 0.5)' : 'rgba(100, 100, 100, 0.3)'};
        border-radius: 6px;
        background: ${choice.enabled ? 'rgba(100, 180, 255, 0.1)' : 'rgba(50, 50, 50, 0.2)'};
        color: ${choice.enabled ? '#e0e0e0' : '#666'};
        cursor: ${choice.enabled ? 'pointer' : 'not-allowed'};
        transition: all 0.2s ease;
        text-align: left;
        opacity: ${choice.enabled ? '1' : '0.6'};
      `;
      btn.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 4px; color: ${choice.enabled ? '#64b5f6' : '#666'};">
          ${choice.label}
        </div>
        <div style="font-size: 11px; color: ${choice.enabled ? '#aaa' : '#555'};">
          ${choice.description}${!choice.enabled && choice.goldCost ? ' (Not enough gold)' : ''}
        </div>
      `;

      if (choice.enabled) {
        btn.addEventListener('mouseenter', () => {
          btn.style.background = 'rgba(100, 180, 255, 0.25)';
          btn.style.borderColor = 'rgba(100, 180, 255, 0.8)';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.background = 'rgba(100, 180, 255, 0.1)';
          btn.style.borderColor = 'rgba(100, 180, 255, 0.5)';
        });
        btn.addEventListener('click', () => {
          if (choiceCallback) choiceCallback(choice.id);
        });
      }

      choicesContainer.appendChild(btn);
    });
  }

  function renderOutcome(message: string) {
    contentArea.innerHTML = `
      <div style="padding: 30px; text-align: center;">
        <div style="
          font-size: 14px;
          color: #e0e0e0;
          line-height: 1.8;
          margin-bottom: 30px;
          padding: 20px;
          border: 1px solid rgba(100, 180, 255, 0.3);
          border-radius: 6px;
          background: rgba(100, 180, 255, 0.05);
        ">
          ${message}
        </div>
        <button id="event-outcome-btn" style="
          width: 200px;
          padding: 14px 32px;
          font-size: 14px;
          font-family: 'Courier New', monospace;
          font-weight: bold;
          letter-spacing: 2px;
          border: 2px solid #64b5f6;
          border-radius: 6px;
          background: rgba(100, 180, 255, 0.15);
          color: #64b5f6;
          cursor: pointer;
          transition: all 0.25s ease;
        ">CONTINUE</button>
      </div>
    `;

    const btn = document.getElementById('event-outcome-btn');
    if (btn) {
      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'rgba(100, 180, 255, 0.3)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'rgba(100, 180, 255, 0.15)';
      });
      btn.addEventListener('click', () => {
        if (outcomeDismissCallback) outcomeDismissCallback();
      });
    }
  }

  return {
    show(data) {
      renderCombatEvent(data);
      container.style.display = 'flex';
    },
    showNarrative(data) {
      renderNarrativeEvent(data);
      container.style.display = 'flex';
    },
    showOutcome(message) {
      renderOutcome(message);
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
    onProceed(callback) {
      proceedCallback = callback;
    },
    onChoice(callback) {
      choiceCallback = callback;
    },
    onOutcomeDismiss(callback) {
      outcomeDismissCallback = callback;
    },
  };
}
