// Pure combat engine - no Babylon imports

import { Character, Enemy, CombatAction, CombatState, DamageResult } from './types';
import { rollDiceExpression } from './dice';
import { CombatLog } from './log';
import { addStatus, getStatus, hasStatus, removeStatus, tickStatuses } from './status';
import { SkillTemplate, GameContent } from '../content/loaders/types';

export type Combatant = Character | Enemy;

export class CombatEngine {
  private state: CombatState;
  private log: CombatLog;
  private content: GameContent;

  constructor(party: Character[], enemies: Enemy[], log: CombatLog, content: GameContent) {
    const turnOrder = this.calculateTurnOrder(party, enemies);
    this.state = {
      party,
      enemies,
      turnNumber: 0,
      isActive: true,
      turnOrder,
      currentActorIndex: 0,
    };
    this.log = log;
    this.content = content;
  }

  getState(): CombatState {
    return this.state;
  }

  private calculateTurnOrder(party: Character[], enemies: Enemy[]): string[] {
    const all: { id: string; speed: number; index: number }[] = [
      ...party.map((c, i) => ({ id: c.id, speed: c.speed, index: i })),
      ...enemies.map((e, i) => ({ id: e.id, speed: e.speed, index: party.length + i })),
    ];
    // Sort by speed descending, then by original index ascending for deterministic tiebreak
    all.sort((a, b) => b.speed - a.speed || a.index - b.index);
    return all.map(c => c.id);
  }

  executeAction(action: CombatAction): void {
    const actor = this.findCombatant(action.actorId);
    if (!actor) {
      this.log.add(`Error: Actor ${action.actorId} not found`);
      return;
    }

    if (actor.hp <= 0) {
      this.log.add(`${actor.name} is defeated and cannot act!`);
      return;
    }

    if (hasStatus(actor, 'stunned')) {
      this.log.add(`${actor.name} is stunned and cannot act!`);
      removeStatus(actor, 'stunned');
      return;
    }

    switch (action.type) {
      case 'attack':
        this.executeAttack(actor, action.targetId);
        break;
      case 'guard':
        this.executeGuard(actor);
        break;
      case 'skill':
        this.executeSkill(actor, action.skillId, action.targetId);
        break;
      case 'item':
        this.executeItem(actor, action.itemId, action.targetId);
        break;
    }
  }

  private executeAttack(attacker: Combatant, targetId?: string): void {
    if (!targetId) {
      this.log.add(`${attacker.name} has no target!`);
      return;
    }

    const target = this.findCombatant(targetId);
    if (!target) {
      this.log.add(`Target ${targetId} not found`);
      return;
    }

    if (target.hp <= 0) {
      this.log.add(`${target.name} is already defeated!`);
      return;
    }

    if (!this.isValidTarget(attacker, target, false)) {
      this.log.add(`${attacker.name} cannot attack ${target.name}!`);
      return;
    }

    const roll = rollDiceExpression('1d6');
    let attackPower = attacker.attack;
    const atkBuff = getStatus(attacker, 'buffed');
    if (atkBuff) attackPower += atkBuff.value ?? 0;
    const atkDebuff = getStatus(attacker, 'weakened');
    if (atkDebuff) attackPower = Math.max(0, attackPower - (atkDebuff.value ?? 0));
    const rawDamage = roll + attackPower;

    const damageResult = this.calculateDamage(rawDamage, target);
    target.hp = Math.max(0, target.hp - damageResult.finalDamage);

    this.log.add(
      `${attacker.name} attacks ${target.name} for ${rawDamage} damage (rolled ${roll}+${attackPower})`
    );

    if (damageResult.blocked > 0) {
      this.log.add(`  ${target.name}'s armor blocks ${damageResult.blocked} damage`);
    }
    if (damageResult.isCritical) {
      this.log.add(`  Critical hit!`);
    }

    this.log.add(
      `  ${target.name} takes ${damageResult.finalDamage} damage (HP: ${target.hp}/${target.maxHp})`
    );

    if (target.isGuarding) {
      target.isGuarding = false;
      this.log.add(`  ${target.name}'s guard is broken!`);
    }

    if (target.hp <= 0) {
      this.log.add(`  ${target.name} is defeated!`);
    }
  }

  private executeGuard(character: Combatant): void {
    character.isGuarding = true;
    this.log.add(`${character.name} takes a defensive stance!`);
  }

  private executeSkill(actor: Combatant, skillId?: string, targetId?: string): void {
    if (!skillId) {
      this.log.add(`${actor.name} has no skill selected!`);
      return;
    }

    const skill = this.content.skills.get(skillId);
    if (!skill) {
      this.log.add(`Unknown skill: ${skillId}`);
      return;
    }

    if (actor.mp < skill.mpCost) {
      this.log.add(`${actor.name} doesn't have enough MP for ${skill.name}! (${actor.mp}/${skill.mpCost})`);
      return;
    }

    const targets = this.resolveSkillTargets(actor, skill, targetId);
    if (targets.length === 0) {
      this.log.add(`${actor.name} tries to use ${skill.name} but there are no valid targets!`);
      return;
    }

    actor.mp -= skill.mpCost;

    this.log.add(`${actor.name} uses ${skill.name}!${skill.mpCost > 0 ? ` (${skill.mpCost} MP)` : ''}`);

    for (const target of targets) {
      if (skill.effect.damageType === 'heal') {
        this.applyHeal(target, skill);
      } else if (skill.effect.damageType === 'physical' || skill.effect.damageType === 'magical') {
        this.applySkillDamage(actor, target, skill);
      }

      if (skill.effect.statusApplied && skill.effect.statusDuration) {
        addStatus(target, skill.effect.statusApplied, skill.effect.statusDuration, skill.effect.statusValue);
        this.log.add(`  ${target.name} is ${skill.effect.statusApplied}! (${skill.effect.statusDuration} turns)`);
      }
    }
  }

  private applyHeal(target: Combatant, skill: SkillTemplate): void {
    if (!skill.effect.healDice) return;
    const healAmount = rollDiceExpression(skill.effect.healDice);
    const oldHp = target.hp;
    target.hp = Math.min(target.maxHp, target.hp + healAmount);
    const healed = target.hp - oldHp;
    this.log.add(`  ${target.name} recovers ${healed} HP (HP: ${target.hp}/${target.maxHp})`);
  }

  private applySkillDamage(actor: Combatant, target: Combatant, skill: SkillTemplate): void {
    const effect = skill.effect;
    let rawDamage = 0;

    if (effect.diceExpression) {
      rawDamage += rollDiceExpression(effect.diceExpression);
    }

    if (effect.statScaling && effect.scalingFactor) {
      const stat = effect.statScaling === 'attack' ? actor.attack : actor.mp;
      rawDamage += Math.floor(stat * effect.scalingFactor);
    }

    const skillBuff = getStatus(actor, 'buffed');
    if (skillBuff) rawDamage += skillBuff.value ?? 0;
    const skillDebuff = getStatus(actor, 'weakened');
    if (skillDebuff) rawDamage = Math.max(0, rawDamage - (skillDebuff.value ?? 0));

    const armorReduction = effect.damageType === 'magical' ? Math.floor(target.armor / 2) : target.armor;
    const damageResult = this.calculateDamageWithArmor(rawDamage, target, armorReduction);
    target.hp = Math.max(0, target.hp - damageResult.finalDamage);

    if (damageResult.blocked > 0) {
      this.log.add(`  ${target.name}'s armor blocks ${damageResult.blocked} damage`);
    }
    this.log.add(
      `  ${target.name} takes ${damageResult.finalDamage} ${effect.damageType} damage (HP: ${target.hp}/${target.maxHp})`
    );

    if (target.isGuarding) {
      target.isGuarding = false;
      this.log.add(`  ${target.name}'s guard is broken!`);
    }

    if (target.hp <= 0) {
      this.log.add(`  ${target.name} is defeated!`);
    }
  }

  private executeItem(actor: Combatant, itemId?: string, targetId?: string): void {
    if (!itemId) {
      this.log.add(`${actor.name} has no item selected!`);
      return;
    }

    const item = this.content.items.get(itemId);
    if (!item) {
      this.log.add(`Unknown item: ${itemId}`);
      return;
    }

    const character = this.state.party.find(c => c.id === actor.id);
    if (!character) {
      this.log.add(`${actor.name} cannot use items!`);
      return;
    }

    const invEntry = character.inventory.find(e => e.itemId === itemId);
    if (!invEntry || invEntry.quantity <= 0) {
      this.log.add(`${actor.name} has no ${item.name} left!`);
      return;
    }

    const target = targetId ? this.findCombatant(targetId) : actor;
    if (!target) {
      this.log.add(`Target not found!`);
      return;
    }

    if (target.hp <= 0 && item.effect.type !== 'damage') {
      this.log.add(`${target.name} is defeated and cannot be helped!`);
      return;
    }

    invEntry.quantity--;
    this.log.add(`${actor.name} uses ${item.name} on ${target.name}!`);

    switch (item.effect.type) {
      case 'heal': {
        const oldHp = target.hp;
        target.hp = Math.min(target.maxHp, target.hp + item.effect.value);
        this.log.add(`  ${target.name} recovers ${target.hp - oldHp} HP (HP: ${target.hp}/${target.maxHp})`);
        break;
      }
      case 'mp_restore': {
        const oldMp = target.mp;
        target.mp = Math.min(target.maxMp, target.mp + item.effect.value);
        this.log.add(`  ${target.name} recovers ${target.mp - oldMp} MP (MP: ${target.mp}/${target.maxMp})`);
        break;
      }
      case 'cure_status': {
        if (item.effect.statusCured) {
          removeStatus(target, item.effect.statusCured);
          this.log.add(`  ${target.name} is cured of ${item.effect.statusCured}!`);
        }
        break;
      }
      case 'buff': {
        if (item.effect.statusApplied && item.effect.statusDuration) {
          addStatus(target, item.effect.statusApplied, item.effect.statusDuration, item.effect.value);
          this.log.add(`  ${target.name} gains ${item.effect.statusApplied}! (${item.effect.statusDuration} turns)`);
        }
        break;
      }
      case 'damage': {
        target.hp = Math.max(0, target.hp - item.effect.value);
        this.log.add(`  ${target.name} takes ${item.effect.value} damage (HP: ${target.hp}/${target.maxHp})`);
        if (target.hp <= 0) {
          this.log.add(`  ${target.name} is defeated!`);
        }
        break;
      }
    }
  }

  private resolveSkillTargets(actor: Combatant, skill: SkillTemplate, targetId?: string): Combatant[] {
    const actorIsParty = this.state.party.some(c => c.id === actor.id);

    switch (skill.targeting) {
      case 'single_enemy': {
        if (!targetId) return [];
        const target = this.findCombatant(targetId);
        if (!target || target.hp <= 0) return [];
        if (!this.isValidTarget(actor, target, false)) return [];
        return [target];
      }
      case 'all_enemies': {
        if (actorIsParty) {
          return this.state.enemies.filter(e => e.hp > 0);
        } else {
          return this.state.party.filter(c => c.hp > 0);
        }
      }
      case 'single_ally': {
        if (!targetId) return [actor];
        const target = this.findCombatant(targetId);
        if (!target || target.hp <= 0) return [];
        if (!this.isValidTarget(actor, target, true)) return [];
        return [target];
      }
      case 'all_allies': {
        if (actorIsParty) {
          return this.state.party.filter(c => c.hp > 0);
        } else {
          return this.state.enemies.filter(e => e.hp > 0);
        }
      }
      case 'self':
        return [actor];
    }
  }

  private isValidTarget(attacker: Combatant, target: Combatant, isAllySkill: boolean): boolean {
    const attackerIsParty = this.state.party.some(c => c.id === attacker.id);
    const targetIsParty = this.state.party.some(c => c.id === target.id);

    if (isAllySkill) {
      return attackerIsParty === targetIsParty;
    }
    return attackerIsParty !== targetIsParty;
  }

  private calculateDamage(rawDamage: number, target: Combatant): DamageResult {
    return this.calculateDamageWithArmor(rawDamage, target, target.armor);
  }

  private calculateDamageWithArmor(rawDamage: number, target: Combatant, baseArmor: number): DamageResult {
    let armor = baseArmor;

    if (target.isGuarding) {
      armor *= 2;
    }
    const shield = getStatus(target, 'shielded');
    if (shield) armor += shield.value ?? 0;

    const isCritical = rollDiceExpression('1d20') === 20;
    const effectiveArmor = isCritical ? Math.floor(armor / 2) : armor;

    const blocked = Math.min(rawDamage, effectiveArmor);
    const finalDamage = Math.max(0, rawDamage - blocked);

    return {
      rawDamage,
      finalDamage,
      blocked,
      isCritical,
      isWeak: false,
    };
  }

  findCombatant(id: string): Combatant | null {
    const partyMember = this.state.party.find(c => c.id === id);
    if (partyMember) return partyMember;

    const enemy = this.state.enemies.find(e => e.id === id);
    if (enemy) return enemy;

    return null;
  }

  startTurn(): void {
    this.state.turnNumber++;
    this.log.addTurnStart(this.state.turnNumber);
    // Clear guard at start of each turn - guard only lasts one round
    for (const c of this.state.party) {
      if (c.isGuarding) {
        c.isGuarding = false;
      }
    }
    for (const e of this.state.enemies) {
      if (e.isGuarding) {
        e.isGuarding = false;
      }
    }
    this.processStatusEffects();
  }

  private processStatusEffects(): void {
    const allCombatants: Combatant[] = [...this.state.party, ...this.state.enemies];

    for (const combatant of allCombatants) {
      if (combatant.hp <= 0) continue;

      if (hasStatus(combatant, 'poisoned')) {
        const poison = combatant.statuses.find(s => s.type === 'poisoned');
        if (poison?.value) {
          combatant.hp = Math.max(0, combatant.hp - poison.value);
          this.log.add(`  ${combatant.name} takes ${poison.value} poison damage (HP: ${combatant.hp}/${combatant.maxHp})`);
          if (combatant.hp <= 0) {
            this.log.add(`  ${combatant.name} is defeated by poison!`);
          }
        }
      }

      if (hasStatus(combatant, 'regenerating')) {
        const regen = combatant.statuses.find(s => s.type === 'regenerating');
        if (regen?.value) {
          const oldHp = combatant.hp;
          combatant.hp = Math.min(combatant.maxHp, combatant.hp + regen.value);
          this.log.add(`  ${combatant.name} regenerates ${combatant.hp - oldHp} HP (HP: ${combatant.hp}/${combatant.maxHp})`);
        }
      }

      const expired = tickStatuses(combatant);
      for (const status of expired) {
        this.log.add(`  ${combatant.name}'s ${status} wore off.`);
      }
    }
  }

  isOver(): boolean {
    const partyAlive = this.state.party.some(c => c.hp > 0);
    const enemyAlive = this.state.enemies.some(e => e.hp > 0);

    if (!partyAlive || !enemyAlive) {
      this.state.isActive = false;
      return true;
    }

    return false;
  }

  getVictor(): 'party' | 'enemy' | null {
    if (!this.isOver()) return null;
    const partyAlive = this.state.party.some(c => c.hp > 0);
    return partyAlive ? 'party' : 'enemy';
  }

  getTotalXpReward(): number {
    return this.state.enemies.reduce((sum, e) => sum + e.xpReward, 0);
  }

  getTotalGoldReward(): number {
    return this.state.enemies.reduce((sum, e) => sum + e.goldReward, 0);
  }
}
