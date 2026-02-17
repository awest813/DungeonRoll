import { RoomTemplate, PartyTemplate } from './types';
import { CharacterClass } from '../../rules/types';
import {
  expectArray,
  expectNumber,
  expectObject,
  expectString,
  expectUniqueId,
} from './validation';

function loadParty(rawParty: unknown, path: string): PartyTemplate[] {
  const party = expectArray(rawParty, path);

  return party.map((member, index) => {
    const memberPath = `${path}[${index}]`;
    const row = expectObject(member, memberPath);

    const skillIdsRaw = expectArray(row.skillIds, `${memberPath}.skillIds`);
    const skillIds = skillIdsRaw.map((s, i) => expectString(s, `${memberPath}.skillIds[${i}]`));

    return {
      id: expectString(row.id, `${memberPath}.id`),
      name: expectString(row.name, `${memberPath}.name`),
      characterClass: expectString(row.characterClass, `${memberPath}.characterClass`) as CharacterClass,
      hp: expectNumber(row.hp, `${memberPath}.hp`),
      mp: expectNumber(row.mp, `${memberPath}.mp`),
      attack: expectNumber(row.attack, `${memberPath}.attack`),
      armor: expectNumber(row.armor, `${memberPath}.armor`),
      speed: expectNumber(row.speed, `${memberPath}.speed`),
      level: expectNumber(row.level, `${memberPath}.level`),
      skillIds,
    };
  });
}

function loadEncounters(rawEncounters: unknown, path: string): RoomTemplate['encounters'] {
  const encounters = expectArray(rawEncounters, path);

  return encounters.map((encounter, index) => {
    const encounterPath = `${path}[${index}]`;
    const row = expectObject(encounter, encounterPath);

    const enemyIdsRaw = expectArray(row.enemyIds, `${encounterPath}.enemyIds`);
    const enemyIds = enemyIdsRaw.map((s, i) => expectString(s, `${encounterPath}.enemyIds[${i}]`));

    return {
      id: expectString(row.id, `${encounterPath}.id`),
      enemyIds,
    };
  });
}

export function loadRooms(rawContent: unknown): Map<string, RoomTemplate> {
  const root = expectObject(rawContent, 'rooms.json');

  const rooms = expectArray(root.rooms, 'rooms.json.rooms');
  const roomMap = new Map<string, RoomTemplate>();

  rooms.forEach((entry, index) => {
    const path = `rooms.json.rooms[${index}]`;
    const row = expectObject(entry, path);

    const room: RoomTemplate = {
      id: expectString(row.id, `${path}.id`),
      name: expectString(row.name, `${path}.name`),
      description: expectString(row.description, `${path}.description`),
      recommendedLevel: expectNumber(row.recommendedLevel, `${path}.recommendedLevel`),
      party: loadParty(row.party, `${path}.party`),
      encounters: loadEncounters(row.encounters, `${path}.encounters`),
    };

    if (room.party.length === 0) {
      throw new Error(`${path}.party must include at least one character`);
    }

    if (room.encounters.length === 0) {
      throw new Error(`${path}.encounters must include at least one encounter`);
    }

    expectUniqueId(roomMap, room, path);
    roomMap.set(room.id, room);
  });

  return roomMap;
}
