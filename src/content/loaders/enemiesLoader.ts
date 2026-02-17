import { EnemyTemplate } from './types';
import {
  expectArray,
  expectExactKeys,
  expectNumber,
  expectObject,
  expectString,
  expectUniqueId,
} from './validation';

export function loadEnemies(rawContent: unknown): Map<string, EnemyTemplate> {
  const root = expectObject(rawContent, 'enemies.json');
  expectExactKeys(root, ['enemies'], 'enemies.json');

  const enemies = expectArray(root.enemies, 'enemies.json.enemies');
  const enemyMap = new Map<string, EnemyTemplate>();

  enemies.forEach((entry, index) => {
    const path = `enemies.json.enemies[${index}]`;
    const row = expectObject(entry, path);
    expectExactKeys(row, ['id', 'name', 'hp', 'attack', 'armor'], path);

    const enemy: EnemyTemplate = {
      id: expectString(row.id, `${path}.id`),
      name: expectString(row.name, `${path}.name`),
      hp: expectNumber(row.hp, `${path}.hp`),
      attack: expectNumber(row.attack, `${path}.attack`),
      armor: expectNumber(row.armor, `${path}.armor`),
    };

    expectUniqueId(enemyMap, enemy, path);
    enemyMap.set(enemy.id, enemy);
  });

  if (enemyMap.size === 0) {
    throw new Error('enemies.json.enemies must contain at least one enemy');
  }

  return enemyMap;
}
