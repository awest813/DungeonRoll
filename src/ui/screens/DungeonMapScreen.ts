// Dungeon map screen - shows room progression and party status between combats

export interface DungeonRoomInfo {
  id: string;
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
  xp: number;
  xpToNext: number;
}

export interface DungeonMapData {
  rooms: DungeonRoomInfo[];
  currentRoomId: string;
  visitedRoomIds: string[];
  roomConnections: { from: string; to: string }[];
  party: DungeonPartyMember[];
  encounterPreview: string[];
  encounterTotalHp: number;
  encounterIndex: number;
  totalEncounters: number;
  gold: number;
  restCost: number;
  nextRoomChoices: { id: string; name: string; recommendedLevel: number; description: string }[];
  roomCleared: boolean;
  dungeonComplete: boolean;
  partyEquipment: Record<string, { id: string; name: string; rarity: string }>[];
  availableEquipment: {
    id: string; name: string; slot: string; rarity: string;
    description: string; bonuses: Record<string, number>;
    classRestriction: string[];
  }[];
}

export interface DungeonMapScreen {
  show(data: DungeonMapData): void;
  hide(): void;
  destroy(): void;
  onEnterRoom(callback: () => void): void;
  onDungeonComplete(callback: () => void): void;
  onRest(callback: () => void): void;
  onChooseRoom(callback: (roomId: string) => void): void;
  onEquip(callback: (charIndex: number, equipmentId: string) => void): void;
  onUnequip(callback: (charIndex: number, slot: string) => void): void;
  onViewCharacter(callback: (charIndex: number) => void): void;
  onOpenInventory(callback: () => void): void;
}

const RARITY_COLORS: Record<string, string> = {
  common: '#9E9E9E',
  uncommon: '#4CAF50',
  rare: '#FFD54F',
};

function buildMinimap(
  rooms: DungeonRoomInfo[],
  connections: { from: string; to: string }[],
  visitedIds: string[],
  currentId: string,
  nextIds: string[],
): string {
  if (rooms.length === 0) return '';

  // Find root (no incoming connections)
  const targetIds = new Set(connections.map(c => c.to));
  const rootId = rooms.find(r => !targetIds.has(r.id))?.id ?? rooms[0].id;

  // BFS to assign depths
  const depth = new Map<string, number>();
  const queue = [rootId];
  depth.set(rootId, 0);
  while (queue.length > 0) {
    const id = queue.shift()!;
    const d = depth.get(id)!;
    for (const c of connections) {
      if (c.from === id && !depth.has(c.to)) {
        depth.set(c.to, d + 1);
        queue.push(c.to);
      }
    }
  }
  // Any rooms not reached get depth maxDepth+1 (disconnected)
  const reachableMax = depth.size > 0 ? Math.max(...depth.values()) : 0;
  for (const r of rooms) {
    if (!depth.has(r.id)) depth.set(r.id, reachableMax + 1);
  }

  const byDepth = new Map<number, string[]>();
  for (const [id, d] of depth) {
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d)!.push(id);
  }

  const maxDepth = depth.size > 0 ? Math.max(...depth.values()) : 0;
  const numLevels = maxDepth + 1;
  const byDepthArrays = Array.from(byDepth.values());
  const maxPerLevel = byDepthArrays.length > 0 ? Math.max(...byDepthArrays.map(v => v.length)) : 1;

  const svgW = 640;
  const nodeR = 12;
  const xPad = 30;
  const yPad = 24;
  const xStep = numLevels <= 1 ? 0 : (svgW - xPad * 2) / (numLevels - 1);
  const rowH = 48;
  const svgH = Math.max(80, maxPerLevel * rowH + yPad * 2);
  const yCenter = svgH / 2;

  const pos = new Map<string, { x: number; y: number }>();
  for (const [d, ids] of byDepth) {
    const x = xPad + d * xStep;
    ids.forEach((id, i) => {
      const totalSpan = (ids.length - 1) * rowH;
      const y = ids.length === 1 ? yCenter : yCenter - totalSpan / 2 + i * rowH;
      pos.set(id, { x, y });
    });
  }

  const visitedSet = new Set(visitedIds);
  const nextSet = new Set(nextIds);

  function vis(id: string): 'current' | 'visited' | 'next' | 'hidden' {
    if (id === currentId) return 'current';
    if (visitedSet.has(id)) return 'visited';
    if (nextSet.has(id)) return 'next';
    return 'hidden';
  }

  function abbrev(id: string): string {
    const room = rooms.find(r => r.id === id);
    if (!room) return '???';
    return room.name.split(/[\s-]/)[0].substring(0, 3).toUpperCase();
  }

  // Edges
  const edgeSvg = connections.map(c => {
    const from = pos.get(c.from);
    const to = pos.get(c.to);
    if (!from || !to) return '';
    const vF = vis(c.from);
    const vT = vis(c.to);
    let stroke = '#1e1e2e';
    let opacity = '0.35';
    let extra = '';
    if ((vF === 'visited' || vF === 'current') && (vT === 'visited' || vT === 'current')) {
      stroke = '#4CAF50'; opacity = '0.5';
    } else if ((vF === 'visited' || vF === 'current') && vT === 'next') {
      stroke = '#ffa500'; opacity = '0.45'; extra = 'stroke-dasharray="4 3"';
    } else if (vF === 'next' || vT === 'next' || vF === 'visited' || vT === 'visited') {
      stroke = '#555'; opacity = '0.3';
    }
    const fx = from.x.toFixed(1); const fy = from.y.toFixed(1);
    const tx = to.x.toFixed(1); const ty = to.y.toFixed(1);
    return `<line x1="${fx}" y1="${fy}" x2="${tx}" y2="${ty}" stroke="${stroke}" stroke-width="1.5" opacity="${opacity}" ${extra}/>`;
  }).join('');

  // Nodes
  const nodeSvg = Array.from(pos.entries()).map(([id, p]) => {
    const v = vis(id);
    let fill: string, stroke: string, sw: string, textFill: string, opacity: string, r: number;
    switch (v) {
      case 'current':
        fill = '#ffa500'; stroke = '#ffd060'; sw = '2.5'; textFill = '#1a0e00'; opacity = '1'; r = nodeR + 3; break;
      case 'visited':
        fill = '#1a3a1a'; stroke = '#4CAF50'; sw = '1.5'; textFill = '#66BB6A'; opacity = '1'; r = nodeR; break;
      case 'next':
        fill = '#1a1200'; stroke = '#886600'; sw = '1.5'; textFill = '#997722'; opacity = '1'; r = nodeR; break;
      default:
        fill = '#0e0e18'; stroke = '#252535'; sw = '1'; textFill = '#333344'; opacity = '0.5'; r = nodeR;
    }
    const label = v === 'hidden' ? '???' : abbrev(id);
    const cx = p.x.toFixed(1); const cy = p.y.toFixed(1);
    const ty = (p.y + 2.5).toFixed(1);
    return `<g opacity="${opacity}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/><text x="${cx}" y="${ty}" text-anchor="middle" dominant-baseline="middle" font-size="7" font-family="Courier New,monospace" font-weight="bold" fill="${textFill}">${label}</text></g>`;
  }).join('');

  const legend = [
    { color: '#ffa500', border: '', label: 'CURRENT' },
    { color: '#1a3a1a', border: '1px solid #4CAF50', label: 'CLEARED' },
    { color: '#1a1200', border: '1px solid #886600', label: 'AVAILABLE' },
    { color: '#0e0e18', border: '1px solid #252535', label: 'UNKNOWN' },
  ].map(({ color, border, label }) =>
    `<span style="display:inline-flex;align-items:center;gap:4px;">` +
    `<span style="width:8px;height:8px;border-radius:50%;background:${color};${border ? `border:${border};` : ''}display:inline-block;"></span>` +
    `<span style="color:#666;font-size:9px;">${label}</span></span>`
  ).join('');

  return `
    <div style="margin-bottom: 20px;">
      <div style="font-size: 12px; color: #aaa; letter-spacing: 2px; margin-bottom: 8px;">DUNGEON MAP</div>
      <div style="background: rgba(0,0,0,0.35); border: 1px solid #222232; border-radius: 6px; padding: 8px 6px 6px;">
        <svg width="${svgW}" height="${svgH}" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:auto;">
          ${edgeSvg}
          ${nodeSvg}
        </svg>
        <div style="display:flex;gap:14px;justify-content:center;margin-top:6px;font-family:'Courier New',monospace;flex-wrap:wrap;">
          ${legend}
        </div>
      </div>
    </div>
  `;
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
    border-radius: 8px 8px 0 0;
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
  let dungeonCompleteCallback: (() => void) | null = null;
  let restCallback: (() => void) | null = null;
  let chooseRoomCallback: ((roomId: string) => void) | null = null;
  let equipCallback: ((charIndex: number, equipmentId: string) => void) | null = null;
  let unequipCallback: ((charIndex: number, slot: string) => void) | null = null;
  let viewCharCallback: ((charIndex: number) => void) | null = null;
  let inventoryCallback: (() => void) | null = null;

  function render(data: DungeonMapData) {
    const currentRoom = data.rooms.find(r => r.id === data.currentRoomId);

    // Header
    header.innerHTML = `
      <div style="font-size: 12px; color: #aaa; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 6px;">
        Rooms Cleared: ${data.visitedRoomIds.length} / ${data.rooms.length}
      </div>
      <div style="font-size: 28px; font-weight: bold; color: #ffa500; text-shadow: 0 0 10px rgba(255, 165, 0, 0.3);">
        ${data.dungeonComplete ? 'Dungeon Complete' : currentRoom ? currentRoom.name : 'Unknown'}
      </div>
      ${currentRoom && !data.dungeonComplete ? `<div style="font-size: 13px; color: #ccc; margin-top: 6px;">${currentRoom.description}</div>` : ''}
    `;

    // Progress bar
    const progressPercent = data.rooms.length > 0 ? (data.visitedRoomIds.length / data.rooms.length) * 100 : 0;
    const progressBar = `
      <div style="margin-bottom: 20px;">
        <div style="background: rgba(0,0,0,0.4); height: 8px; border-radius: 4px; overflow: hidden; border: 1px solid #333;">
          <div style="width: ${progressPercent}%; height: 100%; background: linear-gradient(90deg, #4CAF50, #66BB6A); transition: width 0.5s;"></div>
        </div>
      </div>
    `;

    // Journey list: visited rooms + current room
    const journeyEntries: { room: DungeonRoomInfo; cleared: boolean }[] = [];
    for (const vid of data.visitedRoomIds) {
      const r = data.rooms.find(rm => rm.id === vid);
      if (r) journeyEntries.push({ room: r, cleared: true });
    }
    if (currentRoom && !data.visitedRoomIds.includes(currentRoom.id)) {
      journeyEntries.push({ room: currentRoom, cleared: false });
    }

    const roomList = journeyEntries.map(({ room, cleared }) => {
      const isCurrent = room.id === data.currentRoomId;
      const borderColor = cleared ? '#4CAF50' : '#ffa500';
      const bgColor = cleared ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 165, 0, 0.15)';
      const icon = cleared ? '&#10003;' : '&#9654;';
      const statusLabel = cleared ? 'CLEARED' : (data.roomCleared ? 'CLEARED' : 'CURRENT');

      return `
        <div style="
          display: flex; align-items: center; gap: 12px;
          padding: 8px 12px; margin-bottom: 4px;
          background: ${isCurrent && data.roomCleared ? 'rgba(76, 175, 80, 0.1)' : bgColor};
          border-left: 3px solid ${isCurrent && data.roomCleared ? '#4CAF50' : borderColor};
          border-radius: 0 4px 4px 0;
        ">
          <span style="font-size: 14px; color: ${borderColor}; width: 20px; text-align: center;">${isCurrent && data.roomCleared ? '&#10003;' : icon}</span>
          <span style="flex: 1; font-size: 13px; color: #ddd;">${room.name}</span>
          <span style="font-size: 10px; color: ${borderColor}; letter-spacing: 1px;">${isCurrent && data.roomCleared ? 'CLEARED' : statusLabel}</span>
        </div>
      `;
    }).join('');

    // Party status with equipment
    const partyStatus = data.party.map((member, idx) => {
      const hpPercent = (member.hp / member.maxHp) * 100;
      const mpPercent = member.maxMp > 0 ? (member.mp / member.maxMp) * 100 : 0;
      const hpColor = hpPercent > 50 ? '#4CAF50' : hpPercent > 25 ? '#ffa500' : '#f44336';
      const xpPercent = member.xpToNext > 0 ? (member.xp / member.xpToNext) * 100 : 100;
      const isDead = member.hp <= 0;

      // Equipment for this character
      const equipped = data.partyEquipment[idx] ?? {};
      const equipSlots = ['weapon', 'armor', 'accessory'].map(slot => {
        const item = equipped[slot];
        if (item) {
          const color = RARITY_COLORS[item.rarity] ?? '#9E9E9E';
          return `<span style="font-size: 10px;">
            <span style="color: #777;">${slot[0].toUpperCase()}:</span>
            <span style="color: ${color};">${item.name}</span>
            <span class="unequip-btn" data-char="${idx}" data-slot="${slot}" style="color: #f44336; cursor: pointer; margin-left: 2px;" title="Unequip">&#10005;</span>
          </span>`;
        }
        return `<span style="font-size: 10px; color: #555;">${slot[0].toUpperCase()}: &#8212;</span>`;
      }).join('<span style="margin: 0 4px; color: #333;">|</span>');

      return `
        <div class="party-card" data-char-idx="${idx}" style="
          padding: 10px 12px; margin-bottom: 6px;
          background: ${isDead ? 'rgba(60, 30, 30, 0.2)' : 'rgba(0, 50, 0, 0.2)'};
          border: 1px solid ${isDead ? '#555' : '#4CAF50'};
          border-radius: 5px;
          cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s;
          ${isDead ? 'opacity: 0.5;' : ''}
        ">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-weight: bold; font-size: 13px;">${member.name}${isDead ? ' <span style="color: #f44336; font-size: 10px;">[DEAD]</span>' : ''}</span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 11px; color: #aaa;">Lv${member.level} ${member.characterClass.toUpperCase()}</span>
              <span style="font-size: 9px; color: #666; letter-spacing: 1px;">DETAILS &#9656;</span>
            </div>
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
          <div style="margin-top: 4px;">
            <div style="font-size: 9px; color: #CE93D8; margin-bottom: 2px;">XP ${member.xp}/${member.xpToNext}</div>
            <div style="background: rgba(0,0,0,0.4); height: 3px; border-radius: 2px; overflow: hidden;">
              <div style="width: ${xpPercent}%; height: 100%; background: #CE93D8; transition: width 0.3s;"></div>
            </div>
          </div>
          <div style="margin-top: 6px; display: flex; gap: 4px; flex-wrap: wrap; align-items: center;">
            ${equipSlots}
          </div>
        </div>
      `;
    }).join('');

    // Gold & rest
    const canRest = data.gold >= data.restCost && data.party.some(m => m.hp > 0 && (m.hp < m.maxHp || m.mp < m.maxMp));
    const goldAndRest = `
      <div style="
        display: flex; align-items: center; justify-content: space-between;
        padding: 10px 14px; margin-bottom: 16px;
        background: rgba(255, 200, 0, 0.08);
        border: 1px solid rgba(255, 215, 0, 0.3);
        border-radius: 5px;
      ">
        <div>
          <span style="font-size: 11px; color: #FFD54F; letter-spacing: 2px;">GOLD</span>
          <span style="font-size: 20px; font-weight: bold; color: #FFE082; margin-left: 10px;">${data.gold}</span>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button id="inventory-btn" style="
            padding: 8px 14px;
            font-size: 12px;
            font-family: 'Courier New', monospace;
            font-weight: bold;
            letter-spacing: 2px;
            border: 1px solid #CE93D8;
            border-radius: 4px;
            background: rgba(206, 147, 216, 0.1);
            color: #CE93D8;
            cursor: pointer;
            transition: all 0.2s;
          ">ITEMS</button>
          <button id="rest-btn" style="
            padding: 8px 18px;
            font-size: 12px;
            font-family: 'Courier New', monospace;
            font-weight: bold;
            letter-spacing: 2px;
            border: 1px solid ${canRest ? '#4CAF50' : '#555'};
            border-radius: 4px;
            background: ${canRest ? 'rgba(76, 175, 80, 0.15)' : 'rgba(40, 40, 40, 0.4)'};
            color: ${canRest ? '#4CAF50' : '#666'};
            cursor: ${canRest ? 'pointer' : 'not-allowed'};
            transition: all 0.2s;
          " ${canRest ? '' : 'disabled'}>REST (${data.restCost}g) +50% HP/MP</button>
        </div>
      </div>
    `;

    // Available equipment section
    let equipmentHtml = '';
    if (data.availableEquipment.length > 0) {
      const equipItems = data.availableEquipment.map(eq => {
        const color = RARITY_COLORS[eq.rarity] ?? '#9E9E9E';
        const bonusStr = Object.entries(eq.bonuses)
          .filter(([, v]) => v !== 0)
          .map(([k, v]) => `${k.toUpperCase()} ${v > 0 ? '+' : ''}${v}`)
          .join(', ');

        const eligibleChars = data.party
          .map((m, i) => ({ name: m.name, cls: m.characterClass, index: i, alive: m.hp > 0 }))
          .filter(c => c.alive && (eq.classRestriction.length === 0 || eq.classRestriction.includes(c.cls)));

        const charButtons = eligibleChars.map(c =>
          `<span class="equip-btn" data-char="${c.index}" data-equip="${eq.id}"
             style="padding: 2px 6px; font-size: 9px; cursor: pointer; border: 1px solid ${color};
             border-radius: 3px; color: ${color}; background: rgba(0,0,0,0.3); transition: all 0.2s;"
            title="Equip to ${c.name}">${c.name.split(' ').pop()}</span>`
        ).join(' ');

        return `
          <div style="padding: 6px 10px; margin-bottom: 4px; background: rgba(0,0,0,0.2); border: 1px solid ${color}30; border-radius: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 12px; color: ${color};">${eq.name} <span style="font-size: 9px; color: #777;">(${eq.slot})</span></span>
              <span style="font-size: 9px; color: #aaa; text-transform: uppercase; letter-spacing: 1px;">${eq.rarity}</span>
            </div>
            ${bonusStr ? `<div style="font-size: 10px; color: #aaa; margin: 2px 0;">${bonusStr}</div>` : ''}
            <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px;">${charButtons}</div>
          </div>
        `;
      }).join('');

      equipmentHtml = `
        <div style="margin-bottom: 16px;">
          <div style="font-size: 12px; color: #CE93D8; letter-spacing: 2px; margin-bottom: 8px;">EQUIPMENT</div>
          ${equipItems}
        </div>
      `;
    }

    // Encounter preview with difficulty
    let encounterInfo = '';
    if (data.encounterPreview.length > 0 && !data.roomCleared) {
      const partyTotalHp = data.party.reduce((s, m) => s + m.hp, 0);
      const partyAvgLevel = data.party.length > 0 ? data.party.reduce((s, m) => s + m.level, 0) / data.party.length : 1;
      let diffLabel = '';
      let diffColor = '#4CAF50';
      if (currentRoom) {
        const levelDiff = currentRoom.recommendedLevel - partyAvgLevel;
        const hpRatio = data.encounterTotalHp / Math.max(partyTotalHp, 1);
        if (levelDiff >= 3 || hpRatio > 2.5) { diffLabel = 'DEADLY'; diffColor = '#f44336'; }
        else if (levelDiff >= 1 || hpRatio > 1.5) { diffLabel = 'HARD'; diffColor = '#ffa500'; }
        else if (levelDiff >= -1 || hpRatio > 0.8) { diffLabel = 'MEDIUM'; diffColor = '#FFD54F'; }
        else { diffLabel = 'EASY'; diffColor = '#4CAF50'; }
      }

      const encounterCounterHtml = data.totalEncounters > 1
        ? `<span style="font-size: 10px; color: #aaa; letter-spacing: 1px;">Encounter ${data.encounterIndex + 1}/${data.totalEncounters}</span>`
        : '';

      encounterInfo = `
        <div style="margin-top: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 12px; color: #f44336; letter-spacing: 2px;">ENEMIES AHEAD</span>
              ${encounterCounterHtml}
            </div>
            ${diffLabel ? `<span style="font-size: 10px; font-weight: bold; color: ${diffColor}; letter-spacing: 2px; padding: 2px 8px; border: 1px solid ${diffColor}; border-radius: 3px;">${diffLabel}</span>` : ''}
          </div>
          <div style="
            padding: 10px 14px;
            background: rgba(100, 0, 0, 0.15);
            border: 1px solid rgba(244, 67, 54, 0.4);
            border-radius: 5px;
            font-size: 13px;
            color: #e88;
          ">
            ${data.encounterPreview.join(', ')}
            <span style="float: right; font-size: 10px; color: #f44336;">HP: ${data.encounterTotalHp}</span>
          </div>
        </div>
      `;
    }

    // Buttons: enter room, choose next path, or dungeon complete
    let buttonHtml = '';
    if (data.dungeonComplete) {
      buttonHtml = `
        <div style="text-align: center; margin-top: 20px;">
          <div style="color: #4CAF50; font-size: 22px; font-weight: bold; letter-spacing: 3px; margin-bottom: 16px;">
            *** DUNGEON CLEARED! ***
          </div>
          <div style="color: #aaa; font-size: 13px; margin-bottom: 20px;">
            All rooms have been conquered. Your party is victorious!
          </div>
          <button id="dungeon-complete-btn" style="
            width: 260px;
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
          ">Return to Title</button>
        </div>
      `;
    } else if (data.roomCleared && data.nextRoomChoices.length > 0) {
      const choices = data.nextRoomChoices.map(choice => `
        <button class="choose-room-btn" data-room-id="${choice.id}" style="
          width: 100%;
          padding: 12px 16px;
          margin-bottom: 8px;
          font-size: 13px;
          font-family: 'Courier New', monospace;
          font-weight: bold;
          border: 2px solid #ffa500;
          border-radius: 6px;
          background: rgba(255, 165, 0, 0.1);
          color: #ffa500;
          cursor: pointer;
          transition: all 0.25s ease;
          text-align: left;
        ">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>${choice.name}</span>
            <span style="font-size: 10px; color: #aaa;">Lv${choice.recommendedLevel}</span>
          </div>
          <div style="font-size: 10px; color: #aaa; font-weight: normal; margin-top: 4px;">${choice.description}</div>
        </button>
      `).join('');

      buttonHtml = `
        <div style="margin-top: 20px;">
          <div style="text-align: center; font-size: 12px; color: #ffa500; letter-spacing: 2px; margin-bottom: 12px;">CHOOSE NEXT PATH</div>
          ${choices}
        </div>
      `;
    } else if (!data.roomCleared) {
      buttonHtml = `
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
      `;
    }

    const minimap = buildMinimap(
      data.rooms,
      data.roomConnections,
      data.visitedRoomIds,
      data.currentRoomId,
      data.nextRoomChoices.map(c => c.id),
    );

    contentArea.innerHTML = `
      ${minimap}
      ${progressBar}
      <div style="font-size: 12px; color: #aaa; letter-spacing: 2px; margin-bottom: 8px;">JOURNEY</div>
      <div style="margin-bottom: 20px;">${roomList}</div>
      ${goldAndRest}
      <div style="font-size: 12px; color: #aaa; letter-spacing: 2px; margin-bottom: 8px;">PARTY STATUS</div>
      ${partyStatus}
      ${equipmentHtml}
      ${encounterInfo}
      ${buttonHtml}
    `;

    // Wire up enter room button
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

    // Wire up dungeon complete button
    const completeBtn = document.getElementById('dungeon-complete-btn');
    if (completeBtn) {
      completeBtn.addEventListener('mouseenter', () => {
        (completeBtn as HTMLButtonElement).style.background = 'rgba(76, 175, 80, 0.3)';
        (completeBtn as HTMLButtonElement).style.transform = 'scale(1.03)';
        (completeBtn as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(76, 175, 80, 0.3)';
      });
      completeBtn.addEventListener('mouseleave', () => {
        (completeBtn as HTMLButtonElement).style.background = 'rgba(76, 175, 80, 0.15)';
        (completeBtn as HTMLButtonElement).style.transform = 'scale(1)';
        (completeBtn as HTMLButtonElement).style.boxShadow = 'none';
      });
      completeBtn.addEventListener('click', () => {
        if (dungeonCompleteCallback) dungeonCompleteCallback();
      });
    }

    // Wire up rest button
    const restBtn = document.getElementById('rest-btn');
    if (restBtn && canRest) {
      restBtn.addEventListener('mouseenter', () => {
        (restBtn as HTMLButtonElement).style.background = 'rgba(76, 175, 80, 0.3)';
        (restBtn as HTMLButtonElement).style.boxShadow = '0 0 12px rgba(76, 175, 80, 0.2)';
      });
      restBtn.addEventListener('mouseleave', () => {
        (restBtn as HTMLButtonElement).style.background = 'rgba(76, 175, 80, 0.15)';
        (restBtn as HTMLButtonElement).style.boxShadow = 'none';
      });
      restBtn.addEventListener('click', () => {
        if (restCallback) restCallback();
      });
    }

    // Wire up room choice buttons
    contentArea.querySelectorAll('.choose-room-btn').forEach(btn => {
      const roomId = (btn as HTMLElement).dataset.roomId;
      btn.addEventListener('mouseenter', () => {
        (btn as HTMLButtonElement).style.background = 'rgba(255, 165, 0, 0.25)';
        (btn as HTMLButtonElement).style.boxShadow = '0 0 15px rgba(255, 165, 0, 0.2)';
      });
      btn.addEventListener('mouseleave', () => {
        (btn as HTMLButtonElement).style.background = 'rgba(255, 165, 0, 0.1)';
        (btn as HTMLButtonElement).style.boxShadow = 'none';
      });
      btn.addEventListener('click', () => {
        if (chooseRoomCallback && roomId) chooseRoomCallback(roomId);
      });
    });

    // Wire up equip buttons
    contentArea.querySelectorAll('.equip-btn').forEach(btn => {
      const el = btn as HTMLElement;
      const charIdx = parseInt(el.dataset.char ?? '-1', 10);
      const equipId = el.dataset.equip ?? '';
      btn.addEventListener('mouseenter', () => {
        el.style.background = 'rgba(255, 255, 255, 0.1)';
      });
      btn.addEventListener('mouseleave', () => {
        el.style.background = 'rgba(0, 0, 0, 0.3)';
      });
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (equipCallback && charIdx >= 0 && equipId) equipCallback(charIdx, equipId);
      });
    });

    // Wire up unequip buttons
    contentArea.querySelectorAll('.unequip-btn').forEach(btn => {
      const el = btn as HTMLElement;
      const charIdx = parseInt(el.dataset.char ?? '-1', 10);
      const slot = el.dataset.slot ?? '';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (unequipCallback && charIdx >= 0 && slot) unequipCallback(charIdx, slot);
      });
    });

    // Wire up party card clicks (view character details)
    contentArea.querySelectorAll('.party-card').forEach(card => {
      const el = card as HTMLElement;
      const charIdx = parseInt(el.dataset.charIdx ?? '-1', 10);
      el.addEventListener('mouseenter', () => {
        el.style.borderColor = '#66BB6A';
        el.style.boxShadow = '0 0 8px rgba(76, 175, 80, 0.15)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.borderColor = data.party[charIdx]?.hp <= 0 ? '#555' : '#4CAF50';
        el.style.boxShadow = 'none';
      });
      el.addEventListener('click', () => {
        if (viewCharCallback && charIdx >= 0) viewCharCallback(charIdx);
      });
    });

    // Wire up inventory button
    const invBtn = document.getElementById('inventory-btn');
    if (invBtn) {
      invBtn.addEventListener('mouseenter', () => {
        invBtn.style.background = 'rgba(206, 147, 216, 0.25)';
        invBtn.style.boxShadow = '0 0 10px rgba(206, 147, 216, 0.2)';
      });
      invBtn.addEventListener('mouseleave', () => {
        invBtn.style.background = 'rgba(206, 147, 216, 0.1)';
        invBtn.style.boxShadow = 'none';
      });
      invBtn.addEventListener('click', () => {
        if (inventoryCallback) inventoryCallback();
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
    onEnterRoom(callback) {
      enterCallback = callback;
    },
    onDungeonComplete(callback) {
      dungeonCompleteCallback = callback;
    },
    onRest(callback) {
      restCallback = callback;
    },
    onChooseRoom(callback) {
      chooseRoomCallback = callback;
    },
    onEquip(callback) {
      equipCallback = callback;
    },
    onUnequip(callback) {
      unequipCallback = callback;
    },
    onViewCharacter(callback) {
      viewCharCallback = callback;
    },
    onOpenInventory(callback) {
      inventoryCallback = callback;
    },
  };
}
