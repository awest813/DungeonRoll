import { EquipmentTemplate } from './types';
import { CharacterClass } from '../../rules/types';
import {
  expectArray,
  expectNumber,
  expectObject,
  expectString,
  expectUniqueId,
} from './validation';

export function loadEquipment(rawContent: unknown): Map<string, EquipmentTemplate> {
  const root = expectObject(rawContent, 'equipment.json');
  const items = expectArray(root.equipment, 'equipment.json.equipment');
  const map = new Map<string, EquipmentTemplate>();

  items.forEach((entry, index) => {
    const path = `equipment.json.equipment[${index}]`;
    const row = expectObject(entry, path);

    const bonusesRaw = expectObject(row.bonuses, `${path}.bonuses`);
    const bonuses: EquipmentTemplate['bonuses'] = {};
    for (const key of ['hp', 'mp', 'attack', 'armor', 'speed'] as const) {
      if (bonusesRaw[key] !== undefined) {
        bonuses[key] = expectNumber(bonusesRaw[key], `${path}.bonuses.${key}`);
      }
    }

    const restrictionRaw = expectArray(row.classRestriction, `${path}.classRestriction`);
    const classRestriction = restrictionRaw.map(
      (c, i) => expectString(c, `${path}.classRestriction[${i}]`) as CharacterClass
    );

    const equip: EquipmentTemplate = {
      id: expectString(row.id, `${path}.id`),
      name: expectString(row.name, `${path}.name`),
      slot: expectString(row.slot, `${path}.slot`) as EquipmentTemplate['slot'],
      rarity: expectString(row.rarity, `${path}.rarity`) as EquipmentTemplate['rarity'],
      description: expectString(row.description, `${path}.description`),
      bonuses,
      classRestriction,
    };

    expectUniqueId(map, equip, path);
    map.set(equip.id, equip);
  });

  return map;
}
