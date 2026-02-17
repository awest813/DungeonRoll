import enemiesRaw from '../enemies.json';
import itemsRaw from '../items.json';
import roomsRaw from '../rooms.json';
import skillsRaw from '../skills.json';
import { Character, Enemy } from '../../rules/types';
import { loadEnemies } from './enemiesLoader';
import { loadItems } from './itemsLoader';
import { loadRooms } from './roomsLoader';
import { loadSkills } from './skillsLoader';
import { EncounterSetup, GameContent } from './types';

function toCharacter(character: {
  id: string;
  name: string;
  hp: number;
  attack: number;
  armor: number;
}): Character {
  return {
    id: character.id,
    name: character.name,
    hp: character.hp,
    maxHp: character.hp,
    attack: character.attack,
    armor: character.armor,
    isGuarding: false,
    statuses: [],
  };
}

function toEnemy(enemy: {
  id: string;
  name: string;
  hp: number;
  attack: number;
  armor: number;
}): Enemy {
  return {
    id: enemy.id,
    name: enemy.name,
    hp: enemy.hp,
    maxHp: enemy.hp,
    attack: enemy.attack,
    armor: enemy.armor,
    isGuarding: false,
    statuses: [],
  };
}

export function loadGameContent(): GameContent {
  const enemies = loadEnemies(enemiesRaw);
  const skills = loadSkills(skillsRaw);
  const items = loadItems(itemsRaw);
  const rooms = loadRooms(roomsRaw);

  for (const room of rooms.values()) {
    for (const encounter of room.encounters) {
      if (!enemies.has(encounter.enemyId)) {
        throw new Error(
          `rooms.json room \"${room.id}\" encounter \"${encounter.id}\" references missing enemy \"${encounter.enemyId}\"`
        );
      }
    }
  }

  return { enemies, skills, items, rooms };
}

export function createEncounterFromRoom(
  content: GameContent,
  roomId: string,
  encounterId: string
): EncounterSetup {
  const room = content.rooms.get(roomId);
  if (!room) {
    throw new Error(`Unknown room id \"${roomId}\"`);
  }

  const encounter = room.encounters.find((entry) => entry.id === encounterId);
  if (!encounter) {
    throw new Error(`Unknown encounter id \"${encounterId}\" in room \"${roomId}\"`);
  }

  const enemyTemplate = content.enemies.get(encounter.enemyId);
  if (!enemyTemplate) {
    throw new Error(
      `Encounter \"${encounterId}\" in room \"${roomId}\" references missing enemy \"${encounter.enemyId}\"`
    );
  }

  return {
    roomId,
    encounterId,
    party: room.party.map((member) => toCharacter(member)),
    enemy: toEnemy(enemyTemplate),
  };
}
