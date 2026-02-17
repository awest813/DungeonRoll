// Pure leveling system - no Babylon imports

import { Character } from './types';
import { ClassTemplate } from '../content/loaders/types';
import { calculateXpToNext } from '../content/loaders';

export interface LevelUpResult {
  character: Character;
  oldLevel: number;
  newLevel: number;
  hpGain: number;
  mpGain: number;
  attackGain: number;
  armorGain: number;
  speedGain: number;
  newSkills: string[];
}

export function awardXp(party: Character[], xp: number, classes: Map<string, ClassTemplate>): LevelUpResult[] {
  const results: LevelUpResult[] = [];
  const xpPerMember = Math.floor(xp / party.filter(c => c.hp > 0).length);

  for (const character of party) {
    if (character.hp <= 0) continue;

    character.xp += xpPerMember;

    while (character.xp >= character.xpToNext) {
      character.xp -= character.xpToNext;
      const result = levelUp(character, classes);
      if (result) {
        results.push(result);
      }
    }
  }

  return results;
}

function levelUp(character: Character, classes: Map<string, ClassTemplate>): LevelUpResult | null {
  const classTemplate = classes.get(character.characterClass);
  if (!classTemplate) return null;

  const oldLevel = character.level;
  character.level++;

  const hpGain = classTemplate.hpGrowth;
  const mpGain = classTemplate.mpGrowth;
  const attackGain = classTemplate.attackGrowth;
  const armorGain = classTemplate.armorGrowth;
  const speedGain = classTemplate.speedGrowth;

  character.maxHp += hpGain;
  character.hp += hpGain;
  character.maxMp += mpGain;
  character.mp += mpGain;
  character.attack += attackGain;
  character.armor += armorGain;
  character.speed += speedGain;
  character.xpToNext = calculateXpToNext(character.level);

  // Check for new skills
  const newSkills: string[] = [];
  for (const learnable of classTemplate.learnableSkills) {
    if (learnable.level === character.level && !character.skillIds.includes(learnable.skillId)) {
      character.skillIds.push(learnable.skillId);
      newSkills.push(learnable.skillId);
    }
  }

  return {
    character,
    oldLevel,
    newLevel: character.level,
    hpGain,
    mpGain,
    attackGain,
    armorGain,
    speedGain,
    newSkills,
  };
}
