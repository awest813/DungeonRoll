import { RoomTemplate } from './types';
import {
  expectArray,
  expectNumber,
  expectObject,
  expectString,
  expectUniqueId,
} from './validation';

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

    const nextRoomsRaw = row.nextRooms !== undefined
      ? expectArray(row.nextRooms, `${path}.nextRooms`)
      : [];
    const nextRooms = nextRoomsRaw.map((s, i) => expectString(s, `${path}.nextRooms[${i}]`));

    const dropTableRaw = row.dropTable !== undefined
      ? expectArray(row.dropTable, `${path}.dropTable`)
      : [];
    const dropTable = dropTableRaw.map((s, i) => expectString(s, `${path}.dropTable[${i}]`));

    const encounters = row.encounters !== undefined
      ? loadEncounters(row.encounters, `${path}.encounters`)
      : [];

    const room: RoomTemplate = {
      id: expectString(row.id, `${path}.id`),
      name: expectString(row.name, `${path}.name`),
      description: expectString(row.description, `${path}.description`),
      recommendedLevel: expectNumber(row.recommendedLevel, `${path}.recommendedLevel`),
      encounters,
      nextRooms,
      dropTable,
    };

    if (row.narrativeEventId !== undefined) {
      room.narrativeEventId = expectString(row.narrativeEventId, `${path}.narrativeEventId`);
    }

    if (room.encounters.length === 0 && !room.narrativeEventId) {
      throw new Error(`${path} must have at least one encounter or a narrativeEventId`);
    }

    expectUniqueId(roomMap, room, path);
    roomMap.set(room.id, room);
  });

  return roomMap;
}
