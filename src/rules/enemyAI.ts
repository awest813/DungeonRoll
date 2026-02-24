// Enemy AI system - decides what action an enemy takes based on its role

import { Character, Enemy, CombatAction } from './types';
import { EnemyAIRole, GameContent, SkillTemplate } from '../content/loaders/types';
import { hasStatus } from './status';

export function decideEnemyAction(
  enemy: Enemy,
  aiRole: EnemyAIRole,
  party: Character[],
  allies: Enemy[],
  content: GameContent
): CombatAction {
  const aliveParty = party.filter(c => c.hp > 0);
  if (aliveParty.length === 0) {
    // All party dead — combat should have ended. Guard action as fallback.
    return { type: 'guard', actorId: enemy.id };
  }

  const availableSkills = enemy.skillIds
    .map(id => content.skills.get(id))
    .filter((s): s is SkillTemplate => !!s && s.id !== 'basic-attack' && enemy.mp >= s.mpCost);

  switch (aiRole) {
    case 'healer':
      return healerAI(enemy, availableSkills, aliveParty, allies, content);
    case 'caster':
      return casterAI(enemy, availableSkills, aliveParty);
    case 'sniper':
      return sniperAI(enemy, availableSkills, aliveParty);
    case 'tank':
      return tankAI(enemy, availableSkills, aliveParty);
    case 'bruiser':
      return bruiserAI(enemy, availableSkills, aliveParty);
    case 'boss':
      return bossAI(enemy, availableSkills, aliveParty, allies, content);
    default:
      return basicAI(enemy, availableSkills, aliveParty);
  }
}

function basicAI(enemy: Enemy, skills: SkillTemplate[], party: Character[]): CombatAction {
  const target = pickRandom(party);
  if (skills.length > 0 && Math.random() < 0.25) {
    const skill = pickRandom(skills);
    return { type: 'skill', actorId: enemy.id, skillId: skill.id, targetId: target.id };
  }
  return { type: 'attack', actorId: enemy.id, targetId: target.id };
}

function healerAI(
  enemy: Enemy,
  skills: SkillTemplate[],
  party: Character[],
  allies: Enemy[],
  content: GameContent
): CombatAction {
  const aliveAllies = allies.filter(a => a.hp > 0);

  // Check if any ally (including self) needs healing
  const woundedAlly = aliveAllies
    .filter(a => a.hp < a.maxHp * 0.6)
    .sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];

  if (woundedAlly) {
    const healSkill = skills.find(s => s.effect.damageType === 'heal');
    if (healSkill) {
      return { type: 'skill', actorId: enemy.id, skillId: healSkill.id, targetId: woundedAlly.id };
    }
  }

  // Use buff skills if no one needs healing
  const buffSkill = skills.find(s =>
    s.effect.statusApplied === 'buffed' || s.effect.statusApplied === 'shielded'
  );
  if (buffSkill && Math.random() < 0.5) {
    const buffTarget = aliveAllies.find(a => !hasStatus(a, 'buffed')) ?? aliveAllies[0];
    return { type: 'skill', actorId: enemy.id, skillId: buffSkill.id, targetId: buffTarget.id };
  }

  // Fall back to attacking the weakest party member
  const target = pickWeakest(party);
  const attackSkill = skills.find(s => s.effect.damageType === 'magical' || s.effect.damageType === 'physical');
  if (attackSkill && Math.random() < 0.3) {
    return { type: 'skill', actorId: enemy.id, skillId: attackSkill.id, targetId: target.id };
  }
  return { type: 'attack', actorId: enemy.id, targetId: target.id };
}

function casterAI(enemy: Enemy, skills: SkillTemplate[], party: Character[]): CombatAction {
  // Prefer AoE skills when 2+ enemies alive
  if (party.length >= 2) {
    const aoeSkill = skills.find(s => s.targeting === 'all_enemies');
    if (aoeSkill && Math.random() < 0.6) {
      return { type: 'skill', actorId: enemy.id, skillId: aoeSkill.id, targetId: party[0].id };
    }
  }

  // Use debuff skills on unbuffed targets
  const debuffSkill = skills.find(s =>
    s.effect.statusApplied === 'weakened' || s.effect.statusApplied === 'poisoned'
  );
  if (debuffSkill && Math.random() < 0.4) {
    const unpoisoned = party.find(c => !hasStatus(c, 'poisoned') && !hasStatus(c, 'weakened'));
    const target = unpoisoned ?? party[0];
    return { type: 'skill', actorId: enemy.id, skillId: debuffSkill.id, targetId: target.id };
  }

  // Single target damage spell
  const damageSkill = skills.find(s =>
    s.targeting === 'single_enemy' && (s.effect.damageType === 'magical' || s.effect.damageType === 'physical')
  );
  if (damageSkill && Math.random() < 0.7) {
    const target = pickWeakest(party);
    return { type: 'skill', actorId: enemy.id, skillId: damageSkill.id, targetId: target.id };
  }

  const target = pickRandom(party);
  return { type: 'attack', actorId: enemy.id, targetId: target.id };
}

function sniperAI(enemy: Enemy, skills: SkillTemplate[], party: Character[]): CombatAction {
  // Target the squishiest (lowest armor) or lowest HP
  const target = [...party].sort((a, b) => a.armor - b.armor || a.hp - b.hp)[0];

  // Prefer high-damage single-target skills
  const singleDamage = skills
    .filter(s => s.targeting === 'single_enemy' && s.effect.damageType !== 'none')
    .sort((a, b) => (b.effect.scalingFactor ?? 0) - (a.effect.scalingFactor ?? 0));

  if (singleDamage.length > 0 && Math.random() < 0.65) {
    return { type: 'skill', actorId: enemy.id, skillId: singleDamage[0].id, targetId: target.id };
  }

  return { type: 'attack', actorId: enemy.id, targetId: target.id };
}

function tankAI(enemy: Enemy, skills: SkillTemplate[], party: Character[]): CombatAction {
  // Self-buff if not already buffed
  const selfBuff = skills.find(s =>
    (s.targeting === 'self' || s.targeting === 'single_ally') &&
    (s.effect.statusApplied === 'shielded' || s.effect.statusApplied === 'buffed')
  );
  if (selfBuff && !hasStatus(enemy, 'shielded') && Math.random() < 0.4) {
    return { type: 'skill', actorId: enemy.id, skillId: selfBuff.id, targetId: enemy.id };
  }

  // Use stun/CC on highest damage dealer
  const ccSkill = skills.find(s => s.effect.statusApplied === 'stunned');
  if (ccSkill) {
    const highDamage = [...party].sort((a, b) => b.attack - a.attack)[0];
    if (!hasStatus(highDamage, 'stunned') && Math.random() < 0.45) {
      return { type: 'skill', actorId: enemy.id, skillId: ccSkill.id, targetId: highDamage.id };
    }
  }

  // Guard when low HP
  if (enemy.hp < enemy.maxHp * 0.3 && !enemy.isGuarding && Math.random() < 0.5) {
    return { type: 'guard', actorId: enemy.id };
  }

  const target = pickRandom(party);
  const damageSkill = skills.find(s => s.effect.damageType === 'physical');
  if (damageSkill && Math.random() < 0.4) {
    return { type: 'skill', actorId: enemy.id, skillId: damageSkill.id, targetId: target.id };
  }
  return { type: 'attack', actorId: enemy.id, targetId: target.id };
}

function bruiserAI(enemy: Enemy, skills: SkillTemplate[], party: Character[]): CombatAction {
  // Always go for the kill on low-HP targets
  const lowHp = party.find(c => c.hp < c.maxHp * 0.25);
  const target = lowHp ?? pickRandom(party);

  // Use high-damage skills frequently
  const damageSkills = skills
    .filter(s => s.effect.damageType === 'physical' || s.effect.damageType === 'magical')
    .sort((a, b) => (b.effect.scalingFactor ?? 0) - (a.effect.scalingFactor ?? 0));

  if (damageSkills.length > 0 && Math.random() < 0.55) {
    return { type: 'skill', actorId: enemy.id, skillId: damageSkills[0].id, targetId: target.id };
  }

  return { type: 'attack', actorId: enemy.id, targetId: target.id };
}

function bossAI(
  enemy: Enemy,
  skills: SkillTemplate[],
  party: Character[],
  allies: Enemy[],
  content: GameContent
): CombatAction {
  const hpPercent = enemy.hp / enemy.maxHp;

  // Enrage phase: use strongest skills when below 40% HP
  if (hpPercent < 0.4) {
    const strongest = [...skills]
      .filter(s => s.effect.damageType !== 'none' && s.effect.damageType !== 'heal')
      .sort((a, b) => (b.effect.scalingFactor ?? 0) - (a.effect.scalingFactor ?? 0));
    if (strongest.length > 0) {
      const target = pickWeakest(party);
      return { type: 'skill', actorId: enemy.id, skillId: strongest[0].id, targetId: target.id };
    }
  }

  // AoE when party is clustered (3+ alive)
  if (party.length >= 3) {
    const aoe = skills.find(s => s.targeting === 'all_enemies');
    if (aoe && Math.random() < 0.5) {
      return { type: 'skill', actorId: enemy.id, skillId: aoe.id, targetId: party[0].id };
    }
  }

  // Buff allies
  const buffSkill = skills.find(s =>
    s.effect.statusApplied === 'buffed' && (s.targeting === 'all_allies' || s.targeting === 'single_ally')
  );
  const aliveAllies = allies.filter(a => a.hp > 0);
  if (buffSkill && aliveAllies.length > 1 && Math.random() < 0.3) {
    return { type: 'skill', actorId: enemy.id, skillId: buffSkill.id, targetId: enemy.id };
  }

  // Debuff the healer/mage if present
  const debuff = skills.find(s => s.effect.statusApplied === 'weakened' || s.effect.statusApplied === 'poisoned');
  if (debuff && Math.random() < 0.35) {
    const healer = party.find(c => c.characterClass === 'cleric') ??
                   party.find(c => c.characterClass === 'mage');
    const target = healer ?? pickRandom(party);
    if (!hasStatus(target, debuff.effect.statusApplied!)) {
      return { type: 'skill', actorId: enemy.id, skillId: debuff.id, targetId: target.id };
    }
  }

  // Default: strongest single-target damage
  const singleDmg = skills
    .filter(s => s.targeting === 'single_enemy' && s.effect.damageType !== 'none')
    .sort((a, b) => (b.effect.scalingFactor ?? 0) - (a.effect.scalingFactor ?? 0));
  if (singleDmg.length > 0 && Math.random() < 0.6) {
    const target = pickWeakest(party);
    return { type: 'skill', actorId: enemy.id, skillId: singleDmg[0].id, targetId: target.id };
  }

  const target = pickRandom(party);
  return { type: 'attack', actorId: enemy.id, targetId: target.id };
}

function pickRandom<T>(arr: T[]): T {
  if (arr.length === 0) throw new Error('pickRandom called on empty array');
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickWeakest(party: Character[]): Character {
  if (party.length === 0) throw new Error('pickWeakest called on empty array');
  return [...party].sort((a, b) => a.hp - b.hp)[0];
}
