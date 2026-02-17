// Pure combat engine - no Babylon imports

import { Character, Enemy, CombatAction, CombatState, SkillDefinition } from './types';
import { CombatLog } from './log';
import { resolveDamage } from './damageResolver';
import { addStatus, hasStatus, tickStatusesByPhase } from './status';

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

    // Dead or stunned characters can't act
    if (actor.hp <= 0) {
      this.log.add(`${actor.name} is defeated and cannot act!`);
      return;
    }

    if (hasStatus(actor, 'stunned')) {
      this.log.add(`${actor.name} is stunned and loses their action!`);
      return;
    }

    switch (action.type) {
      case 'attack':
        if (!this.spendActionPoints(actor, 1)) return;
        this.executeAttack(actor, action.targetId);
        break;
      case 'guard':
        if (!this.spendActionPoints(actor, 1)) return;
        this.executeGuard(actor);
        break;
      case 'skill':
        this.executeSkill(actor, action.skillId, action.targetId);
        break;
      case 'item':
        this.executeItem(actor, action.itemId, action.targetId);
        break;
      case 'wait':
        this.log.add(`${actor.name} waits and conserves energy.`);
        break;
    }
  }

  getActionReadiness(actorId: string): { canAttack: boolean; canGuard: boolean; availableSkills: SkillDefinition[] } {
    const actor = this.findCombatant(actorId);
    if (!actor || actor.hp <= 0 || hasStatus(actor, 'stunned')) {
      return { canAttack: false, canGuard: false, availableSkills: [] };
    }

    return {
      canAttack: actor.resources.actionPoints >= 1,
      canGuard: actor.resources.actionPoints >= 1,
      availableSkills: actor.skills.filter(skill => skill.apCost <= actor.resources.actionPoints),
    };
  }

  /**
   * Execute an attack action
   */
  private executeAttack(attacker: Character | Enemy, targetId?: string): void {
    const target = this.validateOpposingTarget(attacker, targetId);
    if (!target) {
      return;
    }

    const damage = resolveDamage(attacker, target, {
      diceExpression: '1d6',
      attackerStatScale: 1,
    });

    this.applyDamage(attacker, target, damage.rawDamage, damage.finalDamage, damage.blocked, `attacks`);
  }

  private executeSkill(attacker: Character | Enemy, skillId?: string, targetId?: string): void {
    const skill = attacker.skills.find(s => s.id === skillId);
    if (!skill) {
      this.log.add(`${attacker.name} tried to use an unknown skill.`);
      return;
    }

    if (!this.spendActionPoints(attacker, skill.apCost)) {
      return;
    }

    const targetIdToUse = skill.target === 'self' ? attacker.id : targetId;
    const target = this.validateTargetBySkill(attacker, targetIdToUse, skill.target);
    if (!target) {
      attacker.resources.actionPoints += skill.apCost;
      return;
    }

    if (skill.effectType === 'damage') {
      const damage = resolveDamage(attacker, target, {
        diceExpression: skill.diceExpression ?? '1d6',
        flatPower: skill.flatPower,
      });
      this.applyDamage(
        attacker,
        target,
        damage.rawDamage,
        damage.finalDamage,
        damage.blocked,
        `casts ${skill.name}`
      );
      return;
    }

    if (skill.effectType === 'status' && skill.statusPayload) {
      addStatus(target, skill.statusPayload.statusType, skill.statusPayload);
      this.log.add(`${attacker.name} uses ${skill.name} on ${target.name}.`);
      this.log.add(`  ${target.name} is now ${skill.statusPayload.statusType}.`);
      return;
    }

    this.log.add(`${attacker.name} uses ${skill.name}, but nothing happens.`);
  }

  private executeItem(actor: Character | Enemy, itemId?: string, targetId?: string): void {
    if (!actor.items) {
      this.log.add(`${actor.name} has no usable items.`);
      return;
    }

    const item = actor.items.find(i => i.id === itemId && i.quantity > 0);
    if (!item) {
      this.log.add(`${actor.name} cannot use that item right now.`);
      return;
    }

    if (!this.spendActionPoints(actor, item.apCost)) {
      return;
    }

    const target = this.validateTargetBySkill(actor, item.target === 'self' ? actor.id : targetId, item.target);
    if (!target) {
      actor.resources.actionPoints += item.apCost;
      return;
    }

    item.quantity -= 1;
    if (item.target === 'self' && item.flatPower && item.flatPower > 0) {
      target.hp = Math.min(target.maxHp, target.hp + item.flatPower);
      this.log.add(`${actor.name} uses ${item.name} and restores ${item.flatPower} HP.`);
      return;
    }

    const damage = resolveDamage(actor, target, {
      diceExpression: item.diceExpression,
      flatPower: item.flatPower,
      attackerStatScale: 0,
    });
    this.applyDamage(actor, target, damage.rawDamage, damage.finalDamage, damage.blocked, `uses ${item.name}`);
  }

  /**
   * Execute a guard action
   */
  private executeGuard(character: Character | Enemy): void {
    character.isGuarding = true;
    this.log.add(`${character.name} takes a defensive stance!`);
  }

  private spendActionPoints(actor: Character | Enemy, cost: number): boolean {
    if (actor.resources.actionPoints < cost) {
      this.log.add(`${actor.name} does not have enough AP (${actor.resources.actionPoints}/${cost}).`);
      return false;
    }

    actor.resources.actionPoints -= cost;
    return true;
  }

  private applyDamage(
    attacker: Character | Enemy,
    target: Character | Enemy,
    rawDamage: number,
    finalDamage: number,
    blocked: number,
    verb: string
  ): void {
    target.hp = Math.max(0, target.hp - finalDamage);

    this.log.add(`${attacker.name} ${verb} ${target.name} for ${rawDamage} damage`);

    if (blocked > 0) {
      this.log.add(`  ${target.name}'s armor blocks ${blocked} damage`);
    }

    this.log.add(`  ${target.name} takes ${finalDamage} damage (HP: ${target.hp}/${target.maxHp})`);

    if (target.isGuarding && finalDamage > 0) {
      target.isGuarding = false;
      this.log.add(`  ${target.name}'s guard is broken!`);
    }

    if (target.hp <= 0) {
      this.log.add(`  ${target.name} is defeated!`);
    }
  }

  private validateTargetBySkill(
    attacker: Character | Enemy,
    targetId: string | undefined,
    targetType: 'enemy' | 'self'
  ): Character | Enemy | null {
    if (targetType === 'self') {
      return attacker;
    }

    return this.validateOpposingTarget(attacker, targetId);
  }

  private validateOpposingTarget(attacker: Character | Enemy, targetId?: string): Character | Enemy | null {
    if (!targetId) {
      this.log.add(`${attacker.name} has no target!`);
      return null;
    }

    const target = this.findCombatant(targetId);
    if (!target) {
      this.log.add(`Target ${targetId} not found`);
      return null;
    }

    if (target.hp <= 0) {
      this.log.add(`${target.name} is already defeated!`);
      return null;
    }

    const attackerIsParty = this.state.party.some(c => c.id === attacker.id);
    const targetIsParty = this.state.party.some(c => c.id === target.id);

    if (attackerIsParty === targetIsParty) {
      this.log.add(`${attacker.name} cannot target ${target.name}!`);
      return null;
    }

    return target;
  }

  /**
   * Find a combatant by ID
   */
  private findCombatant(id: string): Character | Enemy | null {
    const partyMember = this.state.party.find(c => c.id === id);
    if (partyMember) return partyMember;

    if (this.state.enemy?.id === id) return this.state.enemy;

    return null;
  }

  /**
   * Start a new turn
   */
  startTurn(): void {
    this.state.turnNumber++;
    this.log.addTurnStart(this.state.turnNumber);

    const combatants = [...this.state.party, this.state.enemy].filter((c): c is Character | Enemy => Boolean(c));
    combatants.forEach(combatant => {
      if (combatant.hp <= 0) return;
      combatant.resources.actionPoints = combatant.resources.maxActionPoints;

      const ticks = tickStatusesByPhase(combatant, 'turnStart');
      ticks.forEach(tick => {
        if (tick.damage) {
          this.log.add(`  ${combatant.name} takes ${tick.damage} damage from ${tick.status}.`);
        }
        if (tick.expired) {
          this.log.add(`  ${combatant.name}'s ${tick.status} wears off.`);
        }
      });
    });
  }

  endTurn(): void {
    const combatants = [...this.state.party, this.state.enemy].filter((c): c is Character | Enemy => Boolean(c));
    combatants.forEach(combatant => {
      if (combatant.hp <= 0) return;
      const ticks = tickStatusesByPhase(combatant, 'turnEnd');
      ticks.forEach(tick => {
        if (tick.damage) {
          this.log.add(`  ${combatant.name} takes ${tick.damage} damage from ${tick.status}.`);
        }
        if (tick.expired) {
          this.log.add(`  ${combatant.name}'s ${tick.status} wears off.`);
        }
      });
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
