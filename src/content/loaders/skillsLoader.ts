import { SkillTemplate } from './types';
import {
  expectArray,
  expectNumber,
  expectObject,
  expectString,
  expectUniqueId,
} from './validation';

export function loadSkills(rawContent: unknown): Map<string, SkillTemplate> {
  const root = expectObject(rawContent, 'skills.json');

  const skills = expectArray(root.skills, 'skills.json.skills');
  const skillMap = new Map<string, SkillTemplate>();

  skills.forEach((entry, index) => {
    const path = `skills.json.skills[${index}]`;
    const row = expectObject(entry, path);
    const effectPath = `${path}.effect`;
    const effectRaw = expectObject(row.effect, effectPath);

    const effect: SkillTemplate['effect'] = {
      damageType: expectString(effectRaw.damageType, `${effectPath}.damageType`) as SkillTemplate['effect']['damageType'],
    };

    if (effectRaw.diceExpression !== undefined) {
      effect.diceExpression = expectString(effectRaw.diceExpression, `${effectPath}.diceExpression`);
    }
    if (effectRaw.statScaling !== undefined) {
      effect.statScaling = expectString(effectRaw.statScaling, `${effectPath}.statScaling`) as 'attack' | 'mp';
    }
    if (effectRaw.scalingFactor !== undefined) {
      effect.scalingFactor = expectNumber(effectRaw.scalingFactor, `${effectPath}.scalingFactor`);
    }
    if (effectRaw.statusApplied !== undefined) {
      effect.statusApplied = expectString(effectRaw.statusApplied, `${effectPath}.statusApplied`) as any;
    }
    if (effectRaw.statusDuration !== undefined) {
      effect.statusDuration = expectNumber(effectRaw.statusDuration, `${effectPath}.statusDuration`);
    }
    if (effectRaw.statusValue !== undefined) {
      effect.statusValue = expectNumber(effectRaw.statusValue, `${effectPath}.statusValue`);
    }
    if (effectRaw.healDice !== undefined) {
      effect.healDice = expectString(effectRaw.healDice, `${effectPath}.healDice`);
    }

    const skill: SkillTemplate = {
      id: expectString(row.id, `${path}.id`),
      name: expectString(row.name, `${path}.name`),
      description: expectString(row.description, `${path}.description`),
      mpCost: expectNumber(row.mpCost, `${path}.mpCost`),
      targeting: expectString(row.targeting, `${path}.targeting`) as SkillTemplate['targeting'],
      effect,
    };

    expectUniqueId(skillMap, skill, path);
    skillMap.set(skill.id, skill);
  });

  return skillMap;
}
