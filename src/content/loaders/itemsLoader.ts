import { ItemTemplate } from './types';
import {
  expectArray,
  expectNumber,
  expectObject,
  expectString,
  expectUniqueId,
} from './validation';

export function loadItems(rawContent: unknown): Map<string, ItemTemplate> {
  const root = expectObject(rawContent, 'items.json');

  const items = expectArray(root.items, 'items.json.items');
  const itemMap = new Map<string, ItemTemplate>();

  items.forEach((entry, index) => {
    const path = `items.json.items[${index}]`;
    const row = expectObject(entry, path);

    const effectPath = `${path}.effect`;
    const effectRaw = expectObject(row.effect, effectPath);

    const effectType = expectString(effectRaw.type, `${effectPath}.type`);
    const value = expectNumber(effectRaw.value, `${effectPath}.value`);

    const effect: ItemTemplate['effect'] = {
      type: effectType as ItemTemplate['effect']['type'],
      value,
    };

    if (effectRaw.statusCured !== undefined) {
      effect.statusCured = expectString(effectRaw.statusCured, `${effectPath}.statusCured`) as any;
    }
    if (effectRaw.statusApplied !== undefined) {
      effect.statusApplied = expectString(effectRaw.statusApplied, `${effectPath}.statusApplied`) as any;
    }
    if (effectRaw.statusDuration !== undefined) {
      effect.statusDuration = expectNumber(effectRaw.statusDuration, `${effectPath}.statusDuration`);
    }

    const item: ItemTemplate = {
      id: expectString(row.id, `${path}.id`),
      name: expectString(row.name, `${path}.name`),
      description: expectString(row.description, `${path}.description`),
      effect,
    };

    expectUniqueId(itemMap, item, path);
    itemMap.set(item.id, item);
  });

  return itemMap;
}
