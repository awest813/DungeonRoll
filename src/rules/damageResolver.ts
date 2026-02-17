import { Character, DamageResult, Enemy } from './types';
import { rollDiceExpression } from './dice';

export interface DamageFormula {
  diceExpression?: string;
  flatPower?: number;
  attackerStatScale?: number;
  ignoreArmor?: boolean;
  minimumDamage?: number;
}

export interface ResolvedDamage extends DamageResult {
  rollTotal: number;
}

export function resolveDamage(
  attacker: Character | Enemy,
  target: Character | Enemy,
  formula: DamageFormula
): ResolvedDamage {
  const rollTotal = formula.diceExpression ? rollDiceExpression(formula.diceExpression) : 0;
  const scaledAttack = Math.floor(attacker.attack * (formula.attackerStatScale ?? 1));
  const rawDamage = Math.max(0, rollTotal + (formula.flatPower ?? 0) + scaledAttack);

  if (formula.ignoreArmor) {
    return {
      rollTotal,
      rawDamage,
      finalDamage: Math.max(formula.minimumDamage ?? 0, rawDamage),
      blocked: 0,
    };
  }

  let armor = target.armor;
  if (target.isGuarding) {
    armor *= 2;
  }

  const blocked = Math.min(rawDamage, armor);
  const reducedDamage = Math.max(0, rawDamage - blocked);

  return {
    rollTotal,
    rawDamage,
    finalDamage: Math.max(formula.minimumDamage ?? 0, reducedDamage),
    blocked,
  };
}
