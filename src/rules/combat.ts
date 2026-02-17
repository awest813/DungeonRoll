// Pure combat engine - no Babylon imports

import { Character, Enemy, CombatAction, CombatState, DamageResult } from './types';
import { rollDiceExpression } from './dice';
import { CombatLog } from './log';

export class CombatEngine {
  private state: CombatState;
  private log: CombatLog;

  constructor(party: Character[], enemy: Enemy, log: CombatLog) {
    this.state = {
      party,
      enemy,
      turnNumber: 0,
      isActive: true,
    };
    this.log = log;
  }

  getState(): CombatState {
    return this.state;
  }

  /**
   * Execute a combat action
   */
  executeAction(action: CombatAction): void {
    const actor = this.findCombatant(action.actorId);
    if (!actor) {
      this.log.add(`Error: Actor ${action.actorId} not found`);
      return;
    }

    switch (action.type) {
      case 'attack':
        this.executeAttack(actor, action.targetId);
        break;
      case 'guard':
        this.executeGuard(actor);
        break;
    }
  }

  /**
   * Execute an attack action
   */
  private executeAttack(
    attacker: Character | Enemy,
    targetId?: string
  ): void {
    if (!targetId) {
      this.log.add(`${attacker.name} has no target!`);
      return;
    }

    const target = this.findCombatant(targetId);
    if (!target) {
      this.log.add(`Target ${targetId} not found`);
      return;
    }

    // Roll attack damage (d6 + attacker's attack stat)
    const roll = rollDiceExpression('1d6');
    const rawDamage = roll + attacker.attack;

    // Calculate final damage
    const damageResult = this.calculateDamage(rawDamage, target);

    // Apply damage
    target.hp = Math.max(0, target.hp - damageResult.finalDamage);

    // Log the attack
    this.log.add(
      `${attacker.name} attacks ${target.name} for ${rawDamage} damage (rolled ${roll}+${attacker.attack})`
    );

    if (damageResult.blocked > 0) {
      this.log.add(
        `  ${target.name}'s armor blocks ${damageResult.blocked} damage`
      );
    }

    this.log.add(
      `  ${target.name} takes ${damageResult.finalDamage} damage (HP: ${target.hp}/${target.maxHp})`
    );

    // Clear guard status if character was guarding
    if ('isGuarding' in target && target.isGuarding) {
      target.isGuarding = false;
    }

    // Check for defeat
    if (target.hp <= 0) {
      this.log.add(`  ${target.name} is defeated!`);
    }
  }

  /**
   * Execute a guard action
   */
  private executeGuard(character: Character | Enemy): void {
    if ('isGuarding' in character) {
      character.isGuarding = true;
      this.log.add(`${character.name} takes a defensive stance!`);
    }
  }

  /**
   * Calculate damage with armor reduction
   */
  private calculateDamage(
    rawDamage: number,
    target: Character | Enemy
  ): DamageResult {
    let armor = target.armor;

    // Double armor if guarding
    if ('isGuarding' in target && target.isGuarding) {
      armor *= 2;
    }

    const blocked = Math.min(rawDamage, armor);
    const finalDamage = Math.max(0, rawDamage - blocked);

    return {
      rawDamage,
      finalDamage,
      blocked,
    };
  }

  /**
   * Find a combatant by ID
   */
  private findCombatant(id: string): Character | Enemy | null {
    // Check party
    const partyMember = this.state.party.find(c => c.id === id);
    if (partyMember) return partyMember;

    // Check enemy
    if (this.state.enemy?.id === id) return this.state.enemy;

    return null;
  }

  /**
   * Start a new turn
   */
  startTurn(): void {
    this.state.turnNumber++;
    this.log.addTurnStart(this.state.turnNumber);

    // Clear guard status at start of turn
    this.state.party.forEach(char => {
      char.isGuarding = false;
    });
  }

  /**
   * Check if combat is over
   */
  isOver(): boolean {
    const partyAlive = this.state.party.some(c => c.hp > 0);
    const enemyAlive = this.state.enemy && this.state.enemy.hp > 0;

    if (!partyAlive || !enemyAlive) {
      this.state.isActive = false;
      return true;
    }

    return false;
  }

  /**
   * Get victory status
   */
  getVictor(): 'party' | 'enemy' | null {
    if (!this.isOver()) return null;

    const partyAlive = this.state.party.some(c => c.hp > 0);
    return partyAlive ? 'party' : 'enemy';
  }
}
