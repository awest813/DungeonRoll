// Bridges the rules engine with the combat UI and 3D renderer

import { Character, Enemy } from '../rules/types';
import { CombatEngine } from '../rules/combat';
import { CombatLog } from '../rules/log';
import { CombatUI } from './createCombatUI';
import { CombatRenderer } from '../render/CombatRenderer';

export class CombatUIController {
  private combat: CombatEngine;
  private log: CombatLog;
  private ui: CombatUI;
  private party: Character[];
  private enemy: Enemy;
  private currentTurn: number = 0;
  private renderer?: CombatRenderer;

  constructor(
    combat: CombatEngine,
    log: CombatLog,
    ui: CombatUI,
    party: Character[],
    enemy: Enemy,
    renderer?: CombatRenderer
  ) {
    this.combat = combat;
    this.log = log;
    this.ui = ui;
    this.party = party;
    this.enemy = enemy;
    this.renderer = renderer;

    this.setupEventHandlers();
    this.refresh();
  }

  private setupEventHandlers() {
    // Handle attack button
    this.ui.onAttack((heroIndex) => {
      const hero = this.party[heroIndex];
      if (!hero || hero.hp <= 0) {
        console.log(`${hero?.name || 'Hero'} cannot attack (defeated)`);
        return;
      }

      console.log(`${hero.name} attacks!`);

      // Play attack animation first, then execute combat
      if (this.renderer) {
        this.renderer.playAttackAnimation(hero.id, this.enemy.id, () => {
          const enemyHPBefore = this.enemy.hp;

          this.combat.executeAction({
            type: 'attack',
            actorId: hero.id,
            targetId: this.enemy.id,
          });

          // Play hit animation if damage was dealt
          if (this.enemy.hp < enemyHPBefore) {
            this.renderer!.playHitAnimation(this.enemy.id);
            this.renderer!.updateUnitHP(this.enemy.id, this.enemy.hp, this.enemy.maxHp);
          }

          this.refresh();
          this.checkCombatEnd();
        });
      } else {
        this.combat.executeAction({
          type: 'attack',
          actorId: hero.id,
          targetId: this.enemy.id,
        });

        this.refresh();
        this.checkCombatEnd();
      }
    });

    // Handle guard button
    this.ui.onGuard((heroIndex) => {
      const hero = this.party[heroIndex];
      if (!hero || hero.hp <= 0) {
        console.log(`${hero?.name || 'Hero'} cannot guard (defeated)`);
        return;
      }

      console.log(`${hero.name} guards!`);
      this.combat.executeAction({
        type: 'guard',
        actorId: hero.id,
      });

      // Play guard animation
      if (this.renderer) {
        this.renderer.playGuardAnimation(hero.id, true);
      }

      this.refresh();
    });

    // Handle end turn button
    this.ui.onEndTurn(() => {
      console.log('End Turn - Enemy\'s turn begins');
      this.enemyTurn();
    });
  }

  /**
   * Start a new combat turn
   */
  startTurn() {
    this.currentTurn++;
    this.combat.startTurn();
    this.refresh();
  }

  /**
   * Enemy takes its turn (simple AI: always attack random alive party member)
   */
  enemyTurn() {
    if (this.enemy.hp <= 0) {
      console.log('Enemy is defeated, cannot act');
      return;
    }

    // Find alive party members
    const aliveParty = this.party.filter(char => char.hp > 0);
    if (aliveParty.length === 0) {
      console.log('No party members alive');
      return;
    }

    // Pick random target
    const target = aliveParty[Math.floor(Math.random() * aliveParty.length)];

    console.log(`Enemy turn: attacking ${target.name}`);

    // Play attack animation first, then execute combat
    if (this.renderer) {
      this.renderer.playAttackAnimation(this.enemy.id, target.id, () => {
        const targetHPBefore = target.hp;
        const wasGuarding = target.isGuarding;

        this.combat.executeAction({
          type: 'attack',
          actorId: this.enemy.id,
          targetId: target.id,
        });

        // Play hit animation if damage was dealt
        if (target.hp < targetHPBefore) {
          this.renderer!.playHitAnimation(target.id);
          this.renderer!.updateUnitHP(target.id, target.hp, target.maxHp);
        }

        // Update guard visual if guard was broken
        if (wasGuarding && !target.isGuarding) {
          this.renderer!.playGuardAnimation(target.id, false);
        }

        this.refresh();
        this.checkCombatEnd();
      });
    } else {
      this.combat.executeAction({
        type: 'attack',
        actorId: this.enemy.id,
        targetId: target.id,
      });

      this.refresh();
      this.checkCombatEnd();
    }
  }

  /**
   * Refresh UI with current combat state
   */
  private refresh() {
    // Update party display
    this.ui.updateParty(
      this.party.map(char => ({
        name: char.name,
        hp: char.hp,
        maxHp: char.maxHp,
        isGuarding: char.isGuarding,
      }))
    );

    // Update enemy display
    this.ui.updateEnemy({
      name: this.enemy.name,
      hp: this.enemy.hp,
      maxHp: this.enemy.maxHp,
      isGuarding: this.enemy.isGuarding,
    });

    // Update 3D visuals if renderer exists
    if (this.renderer) {
      // Update party HP bars (skip HP update during animations as it's handled there)
      this.party.forEach(char => {
        this.renderer!.playGuardAnimation(char.id, char.isGuarding);
      });

      // Update enemy guard status
      this.renderer.playGuardAnimation(this.enemy.id, this.enemy.isGuarding);
    }

    // Update combat log (get recent entries)
    const messages = this.log.getMessages();
    const lastMessages = messages.slice(
      Math.max(0, messages.length - 20),
      messages.length
    );

    // Clear and re-populate log (only show recent entries to avoid clutter)
    this.ui.clearLog();
    lastMessages.forEach(msg => this.ui.addLogEntry(msg));
  }

  /**
   * Check if combat is over and display result
   */
  private checkCombatEnd() {
    if (this.combat.isOver()) {
      const victor = this.combat.getVictor();
      if (victor === 'party') {
        this.ui.addLogEntry('');
        this.ui.addLogEntry('=================================');
        this.ui.addLogEntry('🎉 VICTORY! The party wins! 🎉');
        this.ui.addLogEntry('=================================');
        console.log('VICTORY! Party wins!');
      } else {
        this.ui.addLogEntry('');
        this.ui.addLogEntry('=================================');
        this.ui.addLogEntry('💀 DEFEAT! The party is defeated! 💀');
        this.ui.addLogEntry('=================================');
        console.log('DEFEAT! Party loses!');
      }
    }
  }

  /**
   * Show the combat UI
   */
  show() {
    this.ui.show();
  }

  /**
   * Hide the combat UI
   */
  hide() {
    this.ui.hide();
  }

  /**
   * Reset combat log display
   */
  clearLog() {
    this.ui.clearLog();
  }
}
