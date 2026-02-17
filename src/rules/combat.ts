// Pure combat engine - no Babylon imports

import { Character, Enemy, CombatAction, CombatState, DamageResult } from './types';
import { rollDiceExpression } from './dice';
import { CombatLog } from './log';
import { ITEM_DEFINITIONS } from '../content/gameContent';

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

    // Dead characters can't act
    if (actor.hp <= 0) {
      this.log.add(`${actor.name} is defeated and cannot act!`);
      return;
    }

    switch (action.type) {
      case 'attack':
        this.executeAttack(actor, action.targetId);
        break;
      case 'guard':
        this.executeGuard(actor);
        break;
      case 'item':
        this.executeItem(actor, action.itemId, action.targetId);
        break;
    }
  }

  private executeItem(
    actor: Character | Enemy,
    itemId?: string,
    targetId?: string
  ): void {
    if (!itemId) {
      this.log.add(`${actor.name} tried to use an unknown item.`);
      return;
    }

    const item = ITEM_DEFINITIONS[itemId];
    if (!item) {
      this.log.add(`${actor.name} tried to use invalid item: ${itemId}.`);
      return;
    }

    switch (item.effect.type) {
      case 'heal': {
        const target = targetId ? this.findCombatant(targetId) : actor;
        if (!target) {
          this.log.add(`${actor.name} has no valid heal target.`);
          return;
        }
        const before = target.hp;
        target.hp = Math.min(target.maxHp, target.hp + item.effect.value);
        this.log.add(
          `${actor.name} uses ${item.name} on ${target.name} (+${target.hp - before} HP).`
        );
        break;
      }
      case 'damage': {
        const target = targetId ? this.findCombatant(targetId) : this.state.enemy;
        if (!target) {
          this.log.add(`${actor.name} has no valid damage target.`);
          return;
        }
        target.hp = Math.max(0, target.hp - item.effect.value);
        this.log.add(
          `${actor.name} uses ${item.name} on ${target.name} for ${item.effect.value} damage.`
        );
        break;
      }
      case 'armor_boost': {
        const target = targetId ? this.findCombatant(targetId) : actor;
        if (!target) {
          this.log.add(`${actor.name} has no valid armor target.`);
          return;
        }
        target.armor += item.effect.value;
        this.log.add(
          `${actor.name} uses ${item.name} on ${target.name} (+${item.effect.value} armor).`
        );
        break;
      }
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

    // Can't attack dead targets
    if (target.hp <= 0) {
      this.log.add(`${target.name} is already defeated!`);
      return;
    }

    // Validate target is an enemy (party can't attack party, enemy can't attack enemy)
    const attackerIsParty = this.state.party.some(c => c.id === attacker.id);
    const targetIsParty = this.state.party.some(c => c.id === target.id);

    if (attackerIsParty === targetIsParty) {
      this.log.add(`${attacker.name} cannot attack ${target.name}!`);
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

    // Clear guard status when taking damage
    if (target.isGuarding) {
      target.isGuarding = false;
      this.log.add(`  ${target.name}'s guard is broken!`);
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
    character.isGuarding = true;
    this.log.add(`${character.name} takes a defensive stance!`);
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
    if (target.isGuarding) {
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
