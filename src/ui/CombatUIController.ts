// Bridges the rules engine with the combat UI and 3D renderer

import { Character, Enemy } from '../rules/types';
import { CombatEngine } from '../rules/combat';
import { CombatLog } from '../rules/log';
import { CombatUI } from './createCombatUI';
import { CombatRenderer } from '../render/CombatRenderer';
import { hasStatus } from '../rules/status';

export class CombatUIController {
  private combat: CombatEngine;
  private log: CombatLog;
  private ui: CombatUI;
  private party: Character[];
  private enemy: Enemy;
  private currentTurn: number = 0;
  private renderer?: CombatRenderer;
  private onCombatEndCallback?: (victor: 'party' | 'enemy') => void;
  private hasCombatEnded: boolean = false;

  constructor(
    combat: CombatEngine,
    log: CombatLog,
    ui: CombatUI,
    party: Character[],
    enemy: Enemy,
    renderer?: CombatRenderer,
    onCombatEnd?: (victor: 'party' | 'enemy') => void
  ) {
    this.combat = combat;
    this.log = log;
    this.ui = ui;
    this.party = party;
    this.enemy = enemy;
    this.renderer = renderer;
    this.onCombatEndCallback = onCombatEnd;

    this.setupEventHandlers();
    this.refresh();
  }

  private setupEventHandlers() {
    this.ui.onAttack((heroIndex) => {
      const hero = this.party[heroIndex];
      if (!hero || hero.hp <= 0) {
        return;
      }

      if (this.renderer) {
        this.renderer.playAttackAnimation(hero.id, this.enemy.id, () => {
          const enemyHPBefore = this.enemy.hp;

          this.combat.executeAction({
            type: 'attack',
            actorId: hero.id,
            targetId: this.enemy.id,
          });

          if (this.enemy.hp < enemyHPBefore) {
            this.renderer!.playHitAnimation(this.enemy.id);
            this.renderer!.updateUnitHP(this.enemy.id, this.enemy.hp, this.enemy.maxHp);
          }

          this.refresh();
          this.checkCombatEnd();
        });
        return;
      }

      this.combat.executeAction({
        type: 'attack',
        actorId: hero.id,
        targetId: this.enemy.id,
      });

      this.refresh();
      this.checkCombatEnd();
    });

    this.ui.onGuard((heroIndex) => {
      const hero = this.party[heroIndex];
      if (!hero || hero.hp <= 0) {
        return;
      }

      this.combat.executeAction({
        type: 'guard',
        actorId: hero.id,
      });

      if (this.renderer) {
        this.renderer.playGuardAnimation(hero.id, true);
      }

      this.refresh();
    });

    this.ui.onSkill((heroIndex, skillId) => {
      const hero = this.party[heroIndex];
      if (!hero || hero.hp <= 0) {
        return;
      }

      this.combat.executeAction({
        type: 'skill',
        actorId: hero.id,
        targetId: this.enemy.id,
        skillId,
      });

      this.refresh();
      this.checkCombatEnd();
    });

    this.ui.onEndTurn(() => {
      this.enemyTurn();
    });
  }

  startTurn() {
    this.currentTurn++;
    this.combat.startTurn();
    this.refresh();
    this.checkCombatEnd();
  }

  enemyTurn() {
    if (this.enemy.hp <= 0) {
      return;
    }

    const aliveParty = this.party.filter(char => char.hp > 0);
    if (aliveParty.length === 0) {
      return;
    }

    const target = aliveParty[Math.floor(Math.random() * aliveParty.length)];

    if (this.renderer) {
      this.renderer.playAttackAnimation(this.enemy.id, target.id, () => {
        const targetHPBefore = target.hp;
        const wasGuarding = target.isGuarding;

        this.combat.executeAction({
          type: 'attack',
          actorId: this.enemy.id,
          targetId: target.id,
        });

        if (target.hp < targetHPBefore) {
          this.renderer!.playHitAnimation(target.id);
          this.renderer!.updateUnitHP(target.id, target.hp, target.maxHp);
        }

        if (wasGuarding && !target.isGuarding) {
          this.renderer!.playGuardAnimation(target.id, false);
        }

        this.combat.endTurn();
        this.startTurn();
        this.refresh();
        this.checkCombatEnd();
      });
      return;
    }

    this.combat.executeAction({
      type: 'attack',
      actorId: this.enemy.id,
      targetId: target.id,
    });

    this.combat.endTurn();
    this.startTurn();
    this.refresh();
    this.checkCombatEnd();
  }

  private refresh() {
    this.ui.updateParty(
      this.party.map(char => ({
        name: char.name,
        hp: char.hp,
        maxHp: char.maxHp,
        isGuarding: char.isGuarding,
        actionPoints: char.resources.actionPoints,
        maxActionPoints: char.resources.maxActionPoints,
      }))
    );

    this.ui.updateEnemy({
      name: this.enemy.name,
      hp: this.enemy.hp,
      maxHp: this.enemy.maxHp,
      isGuarding: this.enemy.isGuarding,
    });

    const selectedHero = this.party.find(char => char.hp > 0) ?? this.party[0];
    const readiness = this.combat.getActionReadiness(selectedHero.id);

    this.ui.updateHeroSkills(
      selectedHero.skills.map(skill => ({
        id: skill.id,
        name: skill.name,
        apCost: skill.apCost,
        description: skill.description,
      }))
    );

    this.ui.updateActionState({
      disabled: selectedHero.hp <= 0 || hasStatus(selectedHero, 'stunned'),
      reason: hasStatus(selectedHero, 'stunned') ? 'Stunned' : undefined,
      canAttack: readiness.canAttack,
      canGuard: readiness.canGuard,
      availableActionPoints: selectedHero.resources.actionPoints,
      skills: selectedHero.skills.map(skill => ({
        id: skill.id,
        name: skill.name,
        apCost: skill.apCost,
        description: skill.description,
        canUse: skill.apCost <= selectedHero.resources.actionPoints,
        reason: skill.apCost <= selectedHero.resources.actionPoints ? undefined : 'Not enough AP',
      })),
    });

    if (this.renderer) {
      this.party.forEach(char => {
        this.renderer!.playGuardAnimation(char.id, char.isGuarding);
      });

      this.renderer.playGuardAnimation(this.enemy.id, this.enemy.isGuarding);
    }

    const messages = this.log.getMessages();
    const lastMessages = messages.slice(Math.max(0, messages.length - 20), messages.length);

    this.ui.clearLog();
    lastMessages.forEach(msg => this.ui.addLogEntry(msg));
  }

  private checkCombatEnd() {
    if (this.combat.isOver() && !this.hasCombatEnded) {
      this.hasCombatEnded = true;
      const victor = this.combat.getVictor();
      if (!victor) {
        return;
      }

      if (victor === 'party') {
        this.ui.addLogEntry('');
        this.ui.addLogEntry('=================================');
        this.ui.addLogEntry('🎉 VICTORY! The party wins! 🎉');
        this.ui.addLogEntry('=================================');
      } else {
        this.ui.addLogEntry('');
        this.ui.addLogEntry('=================================');
        this.ui.addLogEntry('💀 DEFEAT! The party is defeated! 💀');
        this.ui.addLogEntry('=================================');
      }

      if (this.onCombatEndCallback) {
        this.onCombatEndCallback(victor);
      }
    }
  }

  show() {
    this.ui.show();
  }

  hide() {
    this.ui.hide();
  }

  clearLog() {
    this.ui.clearLog();
  }
}
