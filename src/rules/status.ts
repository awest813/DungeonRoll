// Pure status effect system - no Babylon imports

import {
  StatusType,
  StatusEffect,
  Character,
  Enemy,
  StatusPayload,
  StatusTimingWindow,
} from './types';

export type Combatant = Character | Enemy;

export interface StatusTickResult {
  status: StatusType;
  expired: boolean;
  damage?: number;
}

/**
 * Add a status effect to a character/enemy with stack handling.
 */
export function addStatus(
  holder: Combatant,
  type: StatusType,
  payload: StatusPayload
): void {
  const existing = holder.statuses.find(s => s.type === type);

  if (!existing) {
    holder.statuses.push({
      type,
      duration: payload.duration,
      value: payload.value,
      stacks: 1,
      stackRule: payload.stackRule,
      timingWindow: payload.timingWindow,
    });
    return;
  }

  switch (payload.stackRule) {
    case 'replace':
      existing.duration = payload.duration;
      existing.value = payload.value;
      existing.stacks = 1;
      break;
    case 'stackDuration':
      existing.duration += payload.duration;
      existing.value = payload.value ?? existing.value;
      break;
    case 'stackIntensity':
      existing.stacks += 1;
      existing.duration = Math.max(existing.duration, payload.duration);
      existing.value = payload.value ?? existing.value;
      break;
  }

  existing.stackRule = payload.stackRule;
  existing.timingWindow = payload.timingWindow;
}

/**
 * Remove a specific status effect
 */
export function removeStatus(holder: Combatant, type: StatusType): void {
  holder.statuses = holder.statuses.filter(s => s.type !== type);
}

/**
 * Check if holder has a specific status
 */
export function hasStatus(holder: Combatant, type: StatusType): boolean {
  return holder.statuses.some(s => s.type === type);
}

/**
 * Get a specific status effect
 */
export function getStatus(holder: Combatant, type: StatusType): StatusEffect | undefined {
  return holder.statuses.find(s => s.type === type);
}

/**
 * Process statuses for a specific phase and decrement their durations.
 */
export function tickStatusesByPhase(
  holder: Combatant,
  phase: StatusTimingWindow
): StatusTickResult[] {
  const ticks: StatusTickResult[] = [];

  holder.statuses.forEach(status => {
    if (status.timingWindow !== phase) {
      return;
    }

    const result: StatusTickResult = {
      status: status.type,
      expired: false,
    };

    if (status.type === 'poisoned') {
      const poisonDamage = (status.value ?? 1) * Math.max(1, status.stacks);
      holder.hp = Math.max(0, holder.hp - poisonDamage);
      result.damage = poisonDamage;
    }

    status.duration -= 1;
    result.expired = status.duration <= 0;
    ticks.push(result);
  });

  holder.statuses = holder.statuses.filter(s => s.duration > 0);
  return ticks;
}

/**
 * Clear all statuses
 */
export function clearStatuses(holder: Combatant): void {
  holder.statuses = [];
}
