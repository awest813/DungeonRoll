// Crimson Shroud-style combat engine
// Individual speed-based turn order, bonus dice pool, element chains

import { Character, Enemy, CombatAction, CombatState, DamageResult, ElementType, DiceRollResult } from './types';
import { rollDiceExpression, rollDie, rollMultiple } from './dice';
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
      roundNumber: 0,
      isActive: true,
      turnOrder,
      currentActorIndex: 0,
      bonusDicePool: 0,
      maxBonusDice: 10,
      lastElement: 'none',
      elementChainCount: 0,
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
    all.sort((a, b) => b.speed - a.speed || a.index - b.index);
    return all.map(c => c.id);
  }

  getCurrentActor(): Combatant | null {
    if (!this.state.isActive) return null;
    const id = this.state.turnOrder[this.state.currentActorIndex];
    if (!id) return null;
    return this.findCombatant(id);
  }

  isPartyMember(id: string): boolean {
    return this.state.party.some(c => c.id === id);
  }

  advanceTurn(): void {
    const total = this.state.turnOrder.length;
    let attempts = 0;
    do {
      this.state.currentActorIndex++;
      if (this.state.currentActorIndex >= total) {
        this.state.currentActorIndex = 0;
        this.startNewRound();
      }
      attempts++;
      if (attempts > total) break;
    } while (this.getCurrentActor()?.hp === 0 || !this.getCurrentActor());
  }

  private startNewRound(): void {
    this.state.roundNumber++;
    this.state.turnNumber++;
    this.log.addTurnStart(this.state.roundNumber);

    for (const c of this.state.party) {
      if (c.isGuarding) c.isGuarding = false;
    }
    for (const e of this.state.enemies) {
      if (e.isGuarding) e.isGuarding = false;
    }

    this.processStatusEffects();
  }

  startCombat(): void {
    this.state.roundNumber = 1;
    this.state.turnNumber = 1;
    this.log.addTurnStart(1);

    const actor = this.getCurrentActor();
    if (actor && actor.hp <= 0) {
      this.advanceTurn();
    }
  }

  // --- Bonus Dice Pool (Crimson Shroud signature mechanic) ---
  addBonusDice(count: number, reason: string): void {
    const before = this.state.bonusDicePool;
    this.state.bonusDicePool = Math.min(this.state.maxBonusDice, this.state.bonusDicePool + count);
    const gained = this.state.bonusDicePool - before;
    if (gained > 0) {
      this.log.add(`  +${gained} bonus dice! (${reason}) [Pool: ${this.state.bonusDicePool}/${this.state.maxBonusDice}]`);
    }
  }

  spendBonusDice(count: number): number[] {
    const actual = Math.min(count, this.state.bonusDicePool);
    this.state.bonusDicePool -= actual;
    if (actual <= 0) return [];
    return rollMultiple(actual, 6);
  }

  getBonusDicePool(): number {
    return this.state.bonusDicePool;
  }

  // --- Element Chain (Crimson Shroud Gift system) ---
  private updateElementChain(element: ElementType): void {
    if (element === 'none' || element === 'physical') {
      this.state.elementChainCount = 0;
      this.state.lastElement = 'none';
      return;
    }

    if (element === this.state.lastElement) {
      this.state.elementChainCount++;
      if (this.state.elementChainCount >= 2) {
        const chainBonus = Math.min(3, this.state.elementChainCount - 1);
        this.addBonusDice(chainBonus, `${element} chain x${this.state.elementChainCount}!`);
      }
    } else {
      this.state.elementChainCount = 1;
    }
    this.state.lastElement = element;
  }

  // --- Element Weakness/Resistance ---
  private getElementMultiplier(element: ElementType, target: Combatant): { mult: number; isWeak: boolean; isResisted: boolean } {
    const enemy = target as Enemy;
    if (!enemy.weakness && !enemy.resistance) {
      return { mult: 1, isWeak: false, isResisted: false };
    }

    if (enemy.weakness === element) {
      return { mult: 1.5, isWeak: true, isResisted: false };
    }
    if (enemy.resistance === element) {
      return { mult: 0.5, isWeak: false, isResisted: true };
    }
    return { mult: 1, isWeak: false, isResisted: false };
  }

  // --- Core dice roll with bonus dice support ---
  private rollWithBonus(expression: string, bonusDiceCount: number, modifier: number): DiceRollResult {
    const match = expression.toLowerCase().replace(/\s/g, '').match(/^(\d*)d(\d+)([+-]\d+)?$/);
    if (!match) {
      const total = rollDiceExpression(expression) + modifier;
      return { dice: [total], bonusDice: [], modifier, total, expression: `${expression}+${modifier}` };
    }

    const numDice = match[1] ? parseInt(match[1], 10) : 1;
    const sides = parseInt(match[2], 10);
    const exprMod = match[3] ? parseInt(match[3], 10) : 0;

    const dice = rollMultiple(numDice, sides);
    const bonusDice = this.spendBonusDice(bonusDiceCount);

    const diceSum = dice.reduce((a, b) => a + b, 0);
    const bonusSum = bonusDice.reduce((a, b) => a + b, 0);
    const total = diceSum + bonusSum + exprMod + modifier;

    const parts: string[] = [];
    parts.push(`[${dice.join('][')}]`);
    if (bonusDice.length > 0) parts.push(`+bonus[${bonusDice.join('][')}]`);
    if (exprMod) parts.push(`${exprMod > 0 ? '+' : ''}${exprMod}`);
    if (modifier) parts.push(`+${modifier}ATK`);

    return {
      dice,
      bonusDice,
      modifier: exprMod + modifier,
      total,
      expression: parts.join(' '),
    };
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
        this.executeAttack(actor, action.targetId, action.bonusDiceCount ?? 0);
        break;
      case 'guard':
        this.executeGuard(actor);
        break;
      case 'skill':
        this.executeSkill(actor, action.skillId, action.targetId, action.bonusDiceCount ?? 0);
        break;
      case 'item':
        this.executeItem(actor, action.itemId, action.targetId);
        break;
    }
  }

  private executeAttack(attacker: Combatant, targetId?: string, bonusDiceCount: number = 0): void {
    if (!targetId) { this.log.add(`${attacker.name} has no target!`); return; }
    const target = this.findCombatant(targetId);
    if (!target) { this.log.add(`Target ${targetId} not found`); return; }
    if (target.hp <= 0) { this.log.add(`${target.name} is already defeated!`); return; }
    if (!this.isValidTarget(attacker, target, false)) { this.log.add(`${attacker.name} cannot attack ${target.name}!`); return; }

    let attackPower = attacker.attack;
    const atkBuff = getStatus(attacker, 'buffed');
    if (atkBuff) attackPower += atkBuff.value ?? 0;
    const atkDebuff = getStatus(attacker, 'weakened');
    if (atkDebuff) attackPower = Math.max(0, attackPower - (atkDebuff.value ?? 0));

    const rollResult = this.rollWithBonus('1d6', bonusDiceCount, attackPower);
    const rawDamage = Math.max(0, rollResult.total);

    const element: ElementType = 'physical';
    const { mult, isWeak, isResisted } = this.getElementMultiplier(element, target);
    const elementAdjusted = Math.floor(rawDamage * mult);

    const damageResult = this.calculateDamage(elementAdjusted, target, element, isWeak, isResisted, rollResult);
    target.hp = Math.max(0, target.hp - damageResult.finalDamage);

    this.log.add(`${attacker.name} attacks ${target.name}! ${rollResult.expression} = ${rollResult.total}`);
    if (damageResult.blocked > 0) this.log.add(`  ${target.name}'s armor blocks ${damageResult.blocked} damage`);
    if (damageResult.isCritical) { this.log.add(`  CRITICAL HIT!`); if (this.isPartyMember(attacker.id)) this.addBonusDice(1, 'critical hit'); }
    if (isWeak) { this.log.add(`  It's super effective!`); if (this.isPartyMember(attacker.id)) this.addBonusDice(1, 'weakness exploit'); }
    if (isResisted) this.log.add(`  Resisted...`);
    this.log.add(`  ${target.name} takes ${damageResult.finalDamage} damage (HP: ${target.hp}/${target.maxHp})`);
    if (target.isGuarding) { target.isGuarding = false; this.log.add(`  ${target.name}'s guard is broken!`); }
    if (target.hp <= 0) { this.log.add(`  ${target.name} is defeated!`); if (this.isPartyMember(attacker.id)) this.addBonusDice(1, 'enemy defeated'); }

    this.updateElementChain(element);
  }

  private executeGuard(character: Combatant): void {
    character.isGuarding = true;
    this.log.add(`${character.name} takes a defensive stance!`);
    if (this.isPartyMember(character.id)) {
      this.addBonusDice(1, 'guard stance');
    }
  }

  private executeSkill(actor: Combatant, skillId?: string, targetId?: string, bonusDiceCount: number = 0): void {
    if (!skillId) { this.log.add(`${actor.name} has no skill selected!`); return; }
    const skill = this.content.skills.get(skillId);
    if (!skill) { this.log.add(`Unknown skill: ${skillId}`); return; }
    if (actor.mp < skill.mpCost) { this.log.add(`${actor.name} doesn't have enough MP for ${skill.name}! (${actor.mp}/${skill.mpCost})`); return; }

    const targets = this.resolveSkillTargets(actor, skill, targetId);
    if (targets.length === 0) { this.log.add(`${actor.name} tries to use ${skill.name} but there are no valid targets!`); return; }

    actor.mp -= skill.mpCost;
    const element = skill.element ?? 'none';

    this.log.add(`${actor.name} uses ${skill.name}!${skill.mpCost > 0 ? ` (${skill.mpCost} MP)` : ''}`);

    for (const target of targets) {
      if (skill.effect.damageType === 'heal') {
        this.applyHeal(target, skill, bonusDiceCount);
      } else if (skill.effect.damageType === 'physical' || skill.effect.damageType === 'magical') {
        this.applySkillDamage(actor, target, skill, bonusDiceCount);
      }

      if (skill.effect.statusApplied && skill.effect.statusDuration) {
        addStatus(target, skill.effect.statusApplied, skill.effect.statusDuration, skill.effect.statusValue);
        this.log.add(`  ${target.name} is ${skill.effect.statusApplied}! (${skill.effect.statusDuration} turns)`);
      }
    }

    if (this.isPartyMember(actor.id)) {
      this.updateElementChain(element);
    }
  }

  private applyHeal(target: Combatant, skill: SkillTemplate, bonusDiceCount: number): void {
    if (!skill.effect.healDice) return;
    const rollResult = this.rollWithBonus(skill.effect.healDice, bonusDiceCount, 0);
    const healAmount = Math.max(0, rollResult.total);
    const oldHp = target.hp;
    target.hp = Math.min(target.maxHp, target.hp + healAmount);
    const healed = target.hp - oldHp;
    this.log.add(`  ${target.name} recovers ${healed} HP ${rollResult.expression} (HP: ${target.hp}/${target.maxHp})`);
  }

  private applySkillDamage(actor: Combatant, target: Combatant, skill: SkillTemplate, bonusDiceCount: number): void {
    const effect = skill.effect;
    const element = skill.element ?? 'none';

    let modifier = 0;
    if (effect.statScaling && effect.scalingFactor) {
      const stat = effect.statScaling === 'attack' ? actor.attack : actor.mp;
      modifier = Math.floor(stat * effect.scalingFactor);
    }

    const skillBuff = getStatus(actor, 'buffed');
    if (skillBuff) modifier += skillBuff.value ?? 0;
    const skillDebuff = getStatus(actor, 'weakened');
    if (skillDebuff) modifier = Math.max(0, modifier - (skillDebuff.value ?? 0));

    const diceExpr = effect.diceExpression ?? '1d6';
    const rollResult = this.rollWithBonus(diceExpr, bonusDiceCount, modifier);
    const rawDamage = Math.max(0, rollResult.total);

    const { mult, isWeak, isResisted } = this.getElementMultiplier(element, target);
    const elementAdjusted = Math.floor(rawDamage * mult);

    const armorReduction = effect.damageType === 'magical' ? Math.floor(target.armor / 2) : target.armor;
    const damageResult = this.calculateDamageWithArmor(elementAdjusted, target, armorReduction, element, isWeak, isResisted, rollResult);
    target.hp = Math.max(0, target.hp - damageResult.finalDamage);

    this.log.add(`  ${rollResult.expression} = ${rollResult.total}${mult !== 1 ? ` x${mult}` : ''}`);
    if (damageResult.blocked > 0) this.log.add(`  ${target.name}'s armor blocks ${damageResult.blocked} damage`);
    if (damageResult.isCritical) { this.log.add(`  CRITICAL HIT!`); if (this.isPartyMember(actor.id)) this.addBonusDice(1, 'critical hit'); }
    if (isWeak) { this.log.add(`  It's super effective!`); if (this.isPartyMember(actor.id)) this.addBonusDice(1, 'weakness exploit'); }
    if (isResisted) this.log.add(`  Resisted...`);
    this.log.add(`  ${target.name} takes ${damageResult.finalDamage} ${element} damage (HP: ${target.hp}/${target.maxHp})`);
    if (target.isGuarding) { target.isGuarding = false; this.log.add(`  ${target.name}'s guard is broken!`); }
    if (target.hp <= 0) { this.log.add(`  ${target.name} is defeated!`); if (this.isPartyMember(actor.id)) this.addBonusDice(1, 'enemy defeated'); }
  }

  private executeItem(actor: Combatant, itemId?: string, targetId?: string): void {
    if (!itemId) { this.log.add(`${actor.name} has no item selected!`); return; }
    const item = this.content.items.get(itemId);
    if (!item) { this.log.add(`Unknown item: ${itemId}`); return; }
    const character = this.state.party.find(c => c.id === actor.id);
    if (!character) { this.log.add(`${actor.name} cannot use items!`); return; }
    const invEntry = character.inventory.find(e => e.itemId === itemId);
    if (!invEntry || invEntry.quantity <= 0) { this.log.add(`${actor.name} has no ${item.name} left!`); return; }
    const target = targetId ? this.findCombatant(targetId) : actor;
    if (!target) { this.log.add(`Target not found!`); return; }
    if (target.hp <= 0 && item.effect.type !== 'damage') { this.log.add(`${target.name} is defeated and cannot be helped!`); return; }

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
        if (item.effect.statusCured) { removeStatus(target, item.effect.statusCured); this.log.add(`  ${target.name} is cured of ${item.effect.statusCured}!`); }
        break;
      }
      case 'buff': {
        if (item.effect.statusApplied && item.effect.statusDuration) { addStatus(target, item.effect.statusApplied, item.effect.statusDuration, item.effect.value); this.log.add(`  ${target.name} gains ${item.effect.statusApplied}! (${item.effect.statusDuration} turns)`); }
        break;
      }
      case 'damage': {
        target.hp = Math.max(0, target.hp - item.effect.value);
        this.log.add(`  ${target.name} takes ${item.effect.value} damage (HP: ${target.hp}/${target.maxHp})`);
        if (target.hp <= 0) this.log.add(`  ${target.name} is defeated!`);
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
      case 'all_enemies':
        return actorIsParty ? this.state.enemies.filter(e => e.hp > 0) : this.state.party.filter(c => c.hp > 0);
      case 'single_ally': {
        if (!targetId) return [actor];
        const target = this.findCombatant(targetId);
        if (!target || target.hp <= 0) return [];
        if (!this.isValidTarget(actor, target, true)) return [];
        return [target];
      }
      case 'all_allies':
        return actorIsParty ? this.state.party.filter(c => c.hp > 0) : this.state.enemies.filter(e => e.hp > 0);
      case 'self':
        return [actor];
      default:
        return [];
    }
  }

  private isValidTarget(attacker: Combatant, target: Combatant, isAllySkill: boolean): boolean {
    const attackerIsParty = this.state.party.some(c => c.id === attacker.id);
    const targetIsParty = this.state.party.some(c => c.id === target.id);
    return isAllySkill ? (attackerIsParty === targetIsParty) : (attackerIsParty !== targetIsParty);
  }

  private calculateDamage(rawDamage: number, target: Combatant, element: ElementType, isWeak: boolean, isResisted: boolean, roll?: DiceRollResult): DamageResult {
    return this.calculateDamageWithArmor(rawDamage, target, target.armor, element, isWeak, isResisted, roll);
  }

  private calculateDamageWithArmor(rawDamage: number, target: Combatant, baseArmor: number, element: ElementType, isWeak: boolean, isResisted: boolean, roll?: DiceRollResult): DamageResult {
    let armor = baseArmor;
    if (target.isGuarding) armor *= 2;
    const shield = getStatus(target, 'shielded');
    if (shield) armor += shield.value ?? 0;

    const isCritical = rollDie(20) === 20;
    const effectiveArmor = isCritical ? Math.floor(armor / 2) : armor;
    const blocked = Math.min(rawDamage, effectiveArmor);
    const finalDamage = rawDamage > 0 ? Math.max(1, rawDamage - blocked) : 0;

    return { rawDamage, finalDamage, blocked, isCritical, isWeak, isResisted, element, diceRoll: roll };
  }

  findCombatant(id: string): Combatant | null {
    return this.state.party.find(c => c.id === id) ?? this.state.enemies.find(e => e.id === id) ?? null;
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
          if (combatant.hp <= 0) this.log.add(`  ${combatant.name} is defeated by poison!`);
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
      for (const status of expired) this.log.add(`  ${combatant.name}'s ${status} wore off.`);
    }
  }

  isOver(): boolean {
    const partyAlive = this.state.party.some(c => c.hp > 0);
    const enemyAlive = this.state.enemies.some(e => e.hp > 0);
    if (!partyAlive || !enemyAlive) { this.state.isActive = false; return true; }
    return false;
  }

  getVictor(): 'party' | 'enemy' | null {
    if (!this.isOver()) return null;
    return this.state.party.some(c => c.hp > 0) ? 'party' : 'enemy';
  }

  getTotalXpReward(): number {
    return this.state.enemies.reduce((sum, e) => sum + e.xpReward, 0);
  }

  getTotalGoldReward(): number {
    return this.state.enemies.reduce((sum, e) => sum + e.goldReward, 0);
  }
}
