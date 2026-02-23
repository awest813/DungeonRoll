// Dungeon map screen - shows room progression and party status between combats

export interface DungeonRoomInfo {
  name: string;
  description: string;
  recommendedLevel: number;
}

export interface DungeonPartyMember {
  name: string;
  characterClass: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  level: number;
}

export interface DungeonMapData {
  rooms: DungeonRoomInfo[];
  currentRoomIndex: number;
  party: DungeonPartyMember[];
  encounterPreview: string[];
}

export interface DungeonMapScreen {
  show(data: DungeonMapData): void;
  hide(): void;
  destroy(): void;
  onEnterRoom(callback: () => void): void;
}

export function createDungeonMapScreen(): DungeonMapScreen {
  const container = document.createElement('div');
  container.id = 'dungeon-map-screen';
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
    width: 700px;
    max-height: 90vh;
    overflow-y: auto;
    background: rgba(20, 20, 35, 0.95);
    border: 2px solid #4CAF50;
    border-radius: 10px;
    padding: 0;
    animation: fadeIn 0.4s ease-out;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.3), rgba(30, 30, 50, 0.9));
    padding: 20px 24px;
    border-bottom: 2px solid #4CAF50;
    text-align: center;
  `;

  const contentArea = document.createElement('div');
  contentArea.id = 'dungeon-map-content';
  contentArea.style.cssText = `padding: 20px 24px;`;

  panel.appendChild(header);
  panel.appendChild(contentArea);
  container.appendChild(panel);
  document.body.appendChild(container);

  let enterCallback: (() => void) | null = null;

  function render(data: DungeonMapData) {
    const currentRoom = data.rooms[data.currentRoomIndex];
    const dungeonProgress = Math.min(data.currentRoomIndex, data.rooms.length);

    header.innerHTML = `
      <div style="font-size: 12px; color: #aaa; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 6px;">
        Dungeon Progress: ${dungeonProgress} / ${data.rooms.length}
      </div>
      <div style="font-size: 28px; font-weight: bold; color: #ffa500; text-shadow: 0 0 10px rgba(255, 165, 0, 0.3);">
        ${currentRoom ? currentRoom.name : 'Dungeon Complete'}
      </div>
      ${currentRoom ? `<div style="font-size: 13px; color: #ccc; margin-top: 6px;">${currentRoom.description}</div>` : ''}
    `;

    // Progress bar
    const progressPercent = (dungeonProgress / data.rooms.length) * 100;
    const progressBar = `
      <div style="margin-bottom: 20px;">
        <div style="background: rgba(0,0,0,0.4); height: 8px; border-radius: 4px; overflow: hidden; border: 1px solid #333;">
          <div style="width: ${progressPercent}%; height: 100%; background: linear-gradient(90deg, #4CAF50, #66BB6A); transition: width 0.5s;"></div>
        </div>
      </div>
    `;

    // Room list
    const roomList = data.rooms.map((room, i) => {
      let status: string;
      let borderColor: string;
      let bgColor: string;
      let icon: string;

      if (i < data.currentRoomIndex) {
        status = 'CLEARED';
        borderColor = '#4CAF50';
        bgColor = 'rgba(76, 175, 80, 0.1)';
        icon = '&#10003;';
      } else if (i === data.currentRoomIndex) {
        status = 'NEXT';
        borderColor = '#ffa500';
        bgColor = 'rgba(255, 165, 0, 0.15)';
        icon = '&#9654;';
      } else {
        status = `Lv${room.recommendedLevel}`;
        borderColor = '#444';
        bgColor = 'rgba(30, 30, 40, 0.5)';
        icon = '&#9632;';
      }

      return `
        <div style="
          display: flex; align-items: center; gap: 12px;
          padding: 8px 12px; margin-bottom: 4px;
          background: ${bgColor};
          border-left: 3px solid ${borderColor};
          border-radius: 0 4px 4px 0;
          ${i > data.currentRoomIndex ? 'opacity: 0.5;' : ''}
        ">
          <span style="font-size: 14px; color: ${borderColor}; width: 20px; text-align: center;">${icon}</span>
          <span style="flex: 1; font-size: 13px; color: ${i <= data.currentRoomIndex ? '#ddd' : '#777'};">${room.name}</span>
          <span style="font-size: 10px; color: ${borderColor}; letter-spacing: 1px;">${status}</span>
        </div>
      `;
    }).join('');

    // Party status
    const partyStatus = data.party.map(member => {
      const hpPercent = (member.hp / member.maxHp) * 100;
      const mpPercent = member.maxMp > 0 ? (member.mp / member.maxMp) * 100 : 0;
      const hpColor = hpPercent > 50 ? '#4CAF50' : hpPercent > 25 ? '#ffa500' : '#f44336';

      return `
        <div style="
          padding: 10px 12px; margin-bottom: 6px;
          background: rgba(0, 50, 0, 0.2);
          border: 1px solid #4CAF50;
          border-radius: 5px;
        ">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-weight: bold; font-size: 13px;">${member.name}</span>
            <span style="font-size: 11px; color: #aaa;">Lv${member.level} ${member.characterClass.toUpperCase()}</span>
          </div>
          <div style="display: flex; gap: 12px;">
            <div style="flex: 1;">
              <div style="font-size: 10px; color: ${hpColor}; margin-bottom: 2px;">HP ${member.hp}/${member.maxHp}</div>
              <div style="background: rgba(0,0,0,0.4); height: 5px; border-radius: 3px; overflow: hidden;">
                <div style="width: ${hpPercent}%; height: 100%; background: ${hpColor}; transition: width 0.3s;"></div>
              </div>
            </div>
            <div style="flex: 1;">
              <div style="font-size: 10px; color: #64B5F6; margin-bottom: 2px;">MP ${member.mp}/${member.maxMp}</div>
              <div style="background: rgba(0,0,0,0.4); height: 5px; border-radius: 3px; overflow: hidden;">
                <div style="width: ${mpPercent}%; height: 100%; background: #64B5F6; transition: width 0.3s;"></div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Encounter preview
    const encounterInfo = data.encounterPreview.length > 0
      ? `
        <div style="margin-top: 16px;">
          <div style="font-size: 12px; color: #f44336; letter-spacing: 2px; margin-bottom: 8px;">ENEMIES AHEAD</div>
          <div style="
            padding: 10px 14px;
            background: rgba(100, 0, 0, 0.15);
            border: 1px solid rgba(244, 67, 54, 0.4);
            border-radius: 5px;
            font-size: 13px;
            color: #e88;
          ">${data.encounterPreview.join(', ')}</div>
        </div>
      `
      : '';

    // Enter room button
    const buttonHtml = currentRoom
      ? `
        <div style="text-align: center; margin-top: 20px;">
          <button id="enter-room-btn" style="
            width: 240px;
            padding: 14px 32px;
            font-size: 16px;
            font-family: 'Courier New', monospace;
            font-weight: bold;
            letter-spacing: 3px;
            border: 2px solid #ffa500;
            border-radius: 6px;
            background: rgba(255, 165, 0, 0.15);
            color: #ffa500;
            cursor: pointer;
            transition: all 0.25s ease;
            text-transform: uppercase;
          ">Enter Room</button>
        </div>
      `
      : `
        <div style="text-align: center; margin-top: 20px; color: #4CAF50; font-size: 18px; font-weight: bold;">
          Dungeon Cleared!
        </div>
      `;

    contentArea.innerHTML = `
      ${progressBar}
      <div style="font-size: 12px; color: #aaa; letter-spacing: 2px; margin-bottom: 8px;">DUNGEON ROOMS</div>
      <div style="margin-bottom: 20px;">${roomList}</div>
      <div style="font-size: 12px; color: #aaa; letter-spacing: 2px; margin-bottom: 8px;">PARTY STATUS</div>
      ${partyStatus}
      ${encounterInfo}
      ${buttonHtml}
    `;

    const enterBtn = document.getElementById('enter-room-btn');
    if (enterBtn) {
      enterBtn.addEventListener('mouseenter', () => {
        enterBtn.style.background = 'rgba(255, 165, 0, 0.3)';
        enterBtn.style.transform = 'scale(1.03)';
        enterBtn.style.boxShadow = '0 0 20px rgba(255, 165, 0, 0.3)';
      });
      enterBtn.addEventListener('mouseleave', () => {
        enterBtn.style.background = 'rgba(255, 165, 0, 0.15)';
        enterBtn.style.transform = 'scale(1)';
        enterBtn.style.boxShadow = 'none';
      });
      enterBtn.addEventListener('click', () => {
        if (enterCallback) enterCallback();
      });
    }
  }

  return {
    show(data) {
      render(data);
      container.style.display = 'flex';
    },
    hide() {
      container.style.display = 'none';
    },
    destroy() {
      container.remove();
    },
    onEnterRoom(callback) {
      enterCallback = callback;
    },
  };
}
