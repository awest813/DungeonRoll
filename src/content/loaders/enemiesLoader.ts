import { EnemyTemplate } from './types';
import {
  expectArray,
  expectNumber,
  expectObject,
  expectString,
  expectUniqueId,
} from './validation';

export function loadEnemies(rawContent: unknown): Map<string, EnemyTemplate> {
  const root = expectObject(rawContent, 'enemies.json');

  const enemies = expectArray(root.enemies, 'enemies.json.enemies');
  const enemyMap = new Map<string, EnemyTemplate>();

  enemies.forEach((entry, index) => {
    const path = `enemies.json.enemies[${index}]`;
    const row = expectObject(entry, path);

    const skillIdsRaw = expectArray(row.skillIds, `${path}.skillIds`);
    const skillIds = skillIdsRaw.map((s, i) => expectString(s, `${path}.skillIds[${i}]`));

    const aiRole = row.aiRole !== undefined
      ? expectString(row.aiRole, `${path}.aiRole`) as EnemyTemplate['aiRole']
      : 'basic' as const;

    const enemy: EnemyTemplate = {
      id: expectString(row.id, `${path}.id`),
      name: expectString(row.name, `${path}.name`),
      hp: expectNumber(row.hp, `${path}.hp`),
      mp: expectNumber(row.mp, `${path}.mp`),
      attack: expectNumber(row.attack, `${path}.attack`),
      armor: expectNumber(row.armor, `${path}.armor`),
      speed: expectNumber(row.speed, `${path}.speed`),
      xpReward: expectNumber(row.xpReward, `${path}.xpReward`),
      goldReward: expectNumber(row.goldReward, `${path}.goldReward`),
      skillIds,
      aiRole,
    };

    expectUniqueId(enemyMap, enemy, path);
    enemyMap.set(enemy.id, enemy);
  });

  if (enemyMap.size === 0) {
    throw new Error('enemies.json.enemies must contain at least one enemy');
  }

  return enemyMap;
}
