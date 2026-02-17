import { SkillTemplate } from './types';
import {
  expectArray,
  expectExactKeys,
  expectObject,
  expectString,
  expectUniqueId,
} from './validation';

export function loadSkills(rawContent: unknown): Map<string, SkillTemplate> {
  const root = expectObject(rawContent, 'skills.json');
  expectExactKeys(root, ['skills'], 'skills.json');

  const skills = expectArray(root.skills, 'skills.json.skills');
  const skillMap = new Map<string, SkillTemplate>();

  skills.forEach((entry, index) => {
    const path = `skills.json.skills[${index}]`;
    const row = expectObject(entry, path);
    expectExactKeys(row, ['id', 'name', 'description'], path);

    const skill: SkillTemplate = {
      id: expectString(row.id, `${path}.id`),
      name: expectString(row.name, `${path}.name`),
      description: expectString(row.description, `${path}.description`),
    };

    expectUniqueId(skillMap, skill, path);
    skillMap.set(skill.id, skill);
  });

  return skillMap;
}
