// Pure status effect system - no Babylon imports

import { StatusType, StatusEffect, Character, Enemy } from './types';

export type Combatant = Character | Enemy;

/**
 * Add a status effect to a character/enemy
 */
export function addStatus(
  holder: Combatant,
  type: StatusType,
  duration: number,
  value?: number
): void {
  // Remove existing status of same type
  holder.statuses = holder.statuses.filter(s => s.type !== type);

  holder.statuses.push({
    type,
    duration,
    value,
  });
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
 * Tick down all status durations and remove expired ones
 */
export function tickStatuses(holder: Combatant): StatusType[] {
  const expired: StatusType[] = [];

  holder.statuses = holder.statuses.filter(status => {
    status.duration--;
    if (status.duration <= 0) {
      expired.push(status.type);
      return false;
    }
    return true;
  });

  return expired;
}

/**
 * Clear all statuses
 */
export function clearStatuses(holder: Combatant): void {
  holder.statuses = [];
}
