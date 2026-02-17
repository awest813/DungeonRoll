import { RoomTemplate } from './types';
import {
  expectArray,
  expectExactKeys,
  expectNumber,
  expectObject,
  expectString,
  expectUniqueId,
} from './validation';

function loadParty(rawParty: unknown, path: string): RoomTemplate['party'] {
  const party = expectArray(rawParty, path);

  return party.map((member, index) => {
    const memberPath = `${path}[${index}]`;
    const row = expectObject(member, memberPath);
    expectExactKeys(row, ['id', 'name', 'hp', 'attack', 'armor'], memberPath);

    return {
      id: expectString(row.id, `${memberPath}.id`),
      name: expectString(row.name, `${memberPath}.name`),
      hp: expectNumber(row.hp, `${memberPath}.hp`),
      attack: expectNumber(row.attack, `${memberPath}.attack`),
      armor: expectNumber(row.armor, `${memberPath}.armor`),
    };
  });
}

function loadEncounters(rawEncounters: unknown, path: string): RoomTemplate['encounters'] {
  const encounters = expectArray(rawEncounters, path);

  return encounters.map((encounter, index) => {
    const encounterPath = `${path}[${index}]`;
    const row = expectObject(encounter, encounterPath);
    expectExactKeys(row, ['id', 'enemyId'], encounterPath);

    return {
      id: expectString(row.id, `${encounterPath}.id`),
      enemyId: expectString(row.enemyId, `${encounterPath}.enemyId`),
    };
  });
}

export function loadRooms(rawContent: unknown): Map<string, RoomTemplate> {
  const root = expectObject(rawContent, 'rooms.json');
  expectExactKeys(root, ['rooms'], 'rooms.json');

  const rooms = expectArray(root.rooms, 'rooms.json.rooms');
  const roomMap = new Map<string, RoomTemplate>();

  rooms.forEach((entry, index) => {
    const path = `rooms.json.rooms[${index}]`;
    const row = expectObject(entry, path);
    expectExactKeys(row, ['id', 'name', 'party', 'encounters'], path);

    const room: RoomTemplate = {
      id: expectString(row.id, `${path}.id`),
      name: expectString(row.name, `${path}.name`),
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
