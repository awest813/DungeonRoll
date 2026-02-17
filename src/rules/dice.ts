// Pure dice rolling - no Babylon imports

export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

const diceSides: Record<DiceType, number> = {
  'd4': 4,
  'd6': 6,
  'd8': 8,
  'd10': 10,
  'd12': 12,
  'd20': 20,
};

/**
 * Roll a single die (1 to N)
 */
export function rollDie(sides: number): number {
  if (sides < 1) {
    throw new Error(`Invalid die: must have at least 1 side (got ${sides})`);
  }
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Roll a specific die type (d4, d6, etc.)
 */
export function rollDiceType(type: DiceType): number {
  return rollDie(diceSides[type]);
}

/**
 * Parse and roll dice expression like "2d6+3" or "1d20-1"
 * Supports: NdM, NdM+K, NdM-K, dM (treated as 1dM)
 */
export function rollDiceExpression(expression: string): number {
  const cleaned = expression.toLowerCase().replace(/\s/g, '');

  // Match pattern: (optional N)d(M)(optional +/-K)
  const match = cleaned.match(/^(\d*)d(\d+)([+-]\d+)?$/);

  if (!match) {
    throw new Error(`Invalid dice expression: ${expression}`);
  }

  const numDice = match[1] ? parseInt(match[1], 10) : 1;
  const sides = parseInt(match[2], 10);
  const modifier = match[3] ? parseInt(match[3], 10) : 0;

  if (numDice < 1 || sides < 1) {
    throw new Error(`Invalid dice expression: ${expression} (must have at least 1 die with 1 side)`);
  }

  if (numDice > 100) {
    throw new Error(`Too many dice: ${numDice} (max 100)`);
  }

  if (sides > 1000) {
    throw new Error(`Too many sides: ${sides} (max 1000)`);
  }

  let total = 0;
  for (let i = 0; i < numDice; i++) {
    total += rollDie(sides);
  }

  return total + modifier;
}

/**
 * Roll multiple dice and return individual results
 */
export function rollMultiple(count: number, sides: number): number[] {
  if (count < 1) {
    throw new Error(`Invalid count: ${count} (must be at least 1)`);
  }
  if (count > 100) {
    throw new Error(`Too many dice: ${count} (max 100)`);
  }

  const results: number[] = [];
  for (let i = 0; i < count; i++) {
    results.push(rollDie(sides));
  }
  return results;
}

/**
 * Roll with advantage (roll twice, take higher)
 */
export function rollWithAdvantage(sides: number): number {
  const roll1 = rollDie(sides);
  const roll2 = rollDie(sides);
  return Math.max(roll1, roll2);
}

/**
 * Roll with disadvantage (roll twice, take lower)
 */
export function rollWithDisadvantage(sides: number): number {
  const roll1 = rollDie(sides);
  const roll2 = rollDie(sides);
  return Math.min(roll1, roll2);
}
