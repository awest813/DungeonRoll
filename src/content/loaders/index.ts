import enemiesRaw from '../enemies.json';
import itemsRaw from '../items.json';
import roomsRaw from '../rooms.json';
import skillsRaw from '../skills.json';
import classesRaw from '../classes.json';
import { Character, Enemy, CharacterClass } from '../../rules/types';
import { loadEnemies } from './enemiesLoader';
import { loadItems } from './itemsLoader';
import { loadRooms } from './roomsLoader';
import { loadSkills } from './skillsLoader';
import { loadClasses } from './classesLoader';
import { EncounterSetup, GameContent, PartyTemplate, EnemyTemplate } from './types';

function toCharacter(member: PartyTemplate): Character {
  return {
    id: member.id,
    name: member.name,
    characterClass: member.characterClass,
    hp: member.hp,
    maxHp: member.hp,
    mp: member.mp,
    maxMp: member.mp,
    attack: member.attack,
    armor: member.armor,
    speed: member.speed,
    level: member.level,
    xp: 0,
    xpToNext: calculateXpToNext(member.level),
    isGuarding: false,
    statuses: [],
    skillIds: [...member.skillIds],
    inventory: [
      { itemId: 'small-potion', quantity: 3 },
      { itemId: 'ether', quantity: 1 },
    ],
  };
}

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
  }

  return { enemies, skills, items, rooms, classes };
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
    party: room.party.map((member) => toCharacter(member)),
    enemies,
  };
}
