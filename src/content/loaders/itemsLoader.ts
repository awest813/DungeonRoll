import { ItemTemplate } from './types';
import {
  expectArray,
  expectExactKeys,
  expectNumber,
  expectObject,
  expectString,
  expectUniqueId,
} from './validation';

export function loadItems(rawContent: unknown): Map<string, ItemTemplate> {
  const root = expectObject(rawContent, 'items.json');
  expectExactKeys(root, ['items'], 'items.json');

  const items = expectArray(root.items, 'items.json.items');
  const itemMap = new Map<string, ItemTemplate>();

  items.forEach((entry, index) => {
    const path = `items.json.items[${index}]`;
    const row = expectObject(entry, path);
    expectExactKeys(row, ['id', 'name', 'description', 'effect'], path);

    const effectPath = `${path}.effect`;
    const effect = expectObject(row.effect, effectPath);
    expectExactKeys(effect, ['type', 'value'], effectPath);

    const effectType = expectString(effect.type, `${effectPath}.type`);
    if (effectType !== 'heal') {
      throw new Error(`${effectPath}.type must be \"heal\"`);
    }

    const item: ItemTemplate = {
      id: expectString(row.id, `${path}.id`),
      name: expectString(row.name, `${path}.name`),
      description: expectString(row.description, `${path}.description`),
      effect: {
        type: effectType,
        value: expectNumber(effect.value, `${effectPath}.value`),
      },
    };

    expectUniqueId(itemMap, item, path);
    itemMap.set(item.id, item);
  });

  return itemMap;
}
