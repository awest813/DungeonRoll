import { ClassTemplate } from './types';
import { CharacterClass } from '../../rules/types';
import {
  expectArray,
  expectNumber,
  expectObject,
  expectString,
} from './validation';

export function loadClasses(rawContent: unknown): Map<CharacterClass, ClassTemplate> {
  const root = expectObject(rawContent, 'classes.json');

  const classes = expectArray(root.classes, 'classes.json.classes');
  const classMap = new Map<CharacterClass, ClassTemplate>();

  classes.forEach((entry, index) => {
    const path = `classes.json.classes[${index}]`;
    const row = expectObject(entry, path);

    const startingSkillsRaw = expectArray(row.startingSkills, `${path}.startingSkills`);
    const startingSkills = startingSkillsRaw.map((s, i) =>
      expectString(s, `${path}.startingSkills[${i}]`)
    );

    const learnableSkillsRaw = expectArray(row.learnableSkills, `${path}.learnableSkills`);
    const learnableSkills = learnableSkillsRaw.map((s, i) => {
      const skillPath = `${path}.learnableSkills[${i}]`;
      const skillRow = expectObject(s, skillPath);
      return {
        skillId: expectString(skillRow.skillId, `${skillPath}.skillId`),
        level: expectNumber(skillRow.level, `${skillPath}.level`),
      };
    });

    const classTemplate: ClassTemplate = {
      id: expectString(row.id, `${path}.id`) as CharacterClass,
      name: expectString(row.name, `${path}.name`),
      baseHp: expectNumber(row.baseHp, `${path}.baseHp`),
      baseMp: expectNumber(row.baseMp, `${path}.baseMp`),
      baseAttack: expectNumber(row.baseAttack, `${path}.baseAttack`),
      baseArmor: expectNumber(row.baseArmor, `${path}.baseArmor`),
      baseSpeed: expectNumber(row.baseSpeed, `${path}.baseSpeed`),
      hpGrowth: expectNumber(row.hpGrowth, `${path}.hpGrowth`),
      mpGrowth: expectNumber(row.mpGrowth, `${path}.mpGrowth`),
      attackGrowth: expectNumber(row.attackGrowth, `${path}.attackGrowth`),
      armorGrowth: expectNumber(row.armorGrowth, `${path}.armorGrowth`),
      speedGrowth: expectNumber(row.speedGrowth, `${path}.speedGrowth`),
      startingSkills,
      learnableSkills,
    };

    if (classMap.has(classTemplate.id)) {
      throw new Error(`${path} contains duplicate class id "${classTemplate.id}"`);
    }
    classMap.set(classTemplate.id, classTemplate);
  });

  return classMap;
}
