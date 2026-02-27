import enemiesRaw from '../enemies.json';
import itemsRaw from '../items.json';
import roomsRaw from '../rooms.json';
import skillsRaw from '../skills.json';
import classesRaw from '../classes.json';
import equipmentRaw from '../equipment.json';
import eventsRaw from '../events.json';
import { Character, Enemy, CharacterClass } from '../../rules/types';
import { loadEnemies } from './enemiesLoader';
import { loadItems } from './itemsLoader';
import { loadRooms } from './roomsLoader';
import { loadSkills } from './skillsLoader';
import { loadClasses } from './classesLoader';
import { loadEquipment } from './equipmentLoader';
import { loadEvents } from './eventsLoader';
import { EncounterSetup, GameContent, EnemyTemplate, ClassTemplate } from './types';

function toEnemy(template: EnemyTemplate, instanceIndex: number): Enemy {
  const suffix = instanceIndex > 0 ? ` ${String.fromCharCode(65 + instanceIndex)}` : '';
  return {
    id: instanceIndex > 0 ? `${template.id}-${instanceIndex}` : template.id,
    name: `${template.name}${suffix}`,
    hp: template.hp,
    maxHp: template.hp,
    mp: template.mp,
    maxMp: template.mp,
    attack: template.attack,
    armor: template.armor,
    speed: template.speed,
    isGuarding: false,
    statuses: [],
    skillIds: [...template.skillIds],
    xpReward: template.xpReward,
    goldReward: template.goldReward,
    weakness: template.weakness,
    resistance: template.resistance,
  };
}

export function calculateXpToNext(level: number): number {
  return Math.floor(50 * Math.pow(1.5, level - 1));
}

export function loadGameContent(): GameContent {
  const enemies = loadEnemies(enemiesRaw);
  const skills = loadSkills(skillsRaw);
  const items = loadItems(itemsRaw);
  const rooms = loadRooms(roomsRaw);
  const classes = loadClasses(classesRaw);
  const equipment = loadEquipment(equipmentRaw);
  const events = loadEvents(eventsRaw);

  for (const room of rooms.values()) {
    for (const encounter of room.encounters) {
      for (const enemyId of encounter.enemyIds) {
        if (!enemies.has(enemyId)) {
          throw new Error(
            `rooms.json room "${room.id}" encounter "${encounter.id}" references missing enemy "${enemyId}"`
          );
        }
      }
    }
    if (room.narrativeEventId && !events.has(room.narrativeEventId)) {
      throw new Error(
        `rooms.json room "${room.id}" references missing event "${room.narrativeEventId}"`
      );
    }
  }

  return { enemies, skills, items, equipment, rooms, classes, events };
}

export function createEncounterFromRoom(
  content: GameContent,
  roomId: string,
  encounterId: string
): EncounterSetup {
  const room = content.rooms.get(roomId);
  if (!room) {
    throw new Error(`Unknown room id "${roomId}"`);
  }

  const encounter = room.encounters.find((entry) => entry.id === encounterId);
  if (!encounter) {
    throw new Error(`Unknown encounter id "${encounterId}" in room "${roomId}"`);
  }

  // Track how many of each enemy type we've created for unique IDs
  const enemyCounts = new Map<string, number>();
  const enemies: Enemy[] = encounter.enemyIds.map((enemyId) => {
    const template = content.enemies.get(enemyId);
    if (!template) {
      throw new Error(
        `Encounter "${encounterId}" in room "${roomId}" references missing enemy "${enemyId}"`
      );
    }
    const count = enemyCounts.get(enemyId) ?? 0;
    enemyCounts.set(enemyId, count + 1);
    return toEnemy(template, count);
  });

  return {
    roomId,
    encounterId,
    party: [], // Party is managed by GameSession from party select
    enemies,
  };
}

const DEFAULT_NAMES: Record<string, string> = {
  knight: 'Sir Aldric',
  mage: 'Elara',
  ranger: 'Finn',
  cleric: 'Helena',
  rogue: 'Shade',
};

export function createCharacterFromClass(
  classTemplate: ClassTemplate,
  index: number
): Character {
  return {
    id: `party-${classTemplate.id}`,
    name: DEFAULT_NAMES[classTemplate.id] ?? classTemplate.name,
    characterClass: classTemplate.id,
    hp: classTemplate.baseHp,
    maxHp: classTemplate.baseHp,
    mp: classTemplate.baseMp,
    maxMp: classTemplate.baseMp,
    attack: classTemplate.baseAttack,
    armor: classTemplate.baseArmor,
    speed: classTemplate.baseSpeed,
    attackBuff: 0,
    level: 1,
    xp: 0,
    xpToNext: calculateXpToNext(1),
    isGuarding: false,
    statuses: [],
    skillIds: [...classTemplate.startingSkills],
    inventory: [
      { itemId: 'small-potion', quantity: 3 },
      { itemId: 'ether', quantity: 1 },
    ],
    equipment: [],
  };
}
