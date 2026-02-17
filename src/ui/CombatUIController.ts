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
  private inventory: string[];
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
    inventory: string[],
    renderer?: CombatRenderer,
    onCombatEnd?: (victor: 'party' | 'enemy') => void
  ) {
    this.combat = combat;
    this.log = log;
    this.ui = ui;
    this.party = party;
    this.enemy = enemy;
    this.inventory = inventory;
    this.renderer = renderer;
    this.onCombatEndCallback = onCombatEnd;

    this.setupEventHandlers();
    this.refresh();
  }

  private setupEventHandlers() {
    this.ui.onAttack((heroIndex) => {
      const hero = this.party[heroIndex];
      if (!hero || hero.hp <= 0) return;
      this.combat.executeAction({ type: 'attack', actorId: hero.id, targetId: this.enemy.id });
      this.refresh();
      this.checkCombatEnd();
    });

    this.ui.onGuard((heroIndex) => {
      const hero = this.party[heroIndex];
      if (!hero || hero.hp <= 0) return;
      this.combat.executeAction({ type: 'guard', actorId: hero.id });
      this.refresh();
    });

    this.ui.onUseItem((heroIndex, itemId) => {
      const hero = this.party[heroIndex];
      if (!hero || hero.hp <= 0) return;

      const itemIndex = this.inventory.indexOf(itemId);
      if (itemIndex === -1) {
        this.ui.addLogEntry(`${hero.name} does not have ${itemId}.`);
        return;
      }

      this.combat.executeAction({
        type: 'item',
        actorId: hero.id,
        targetId: hero.id,
        itemId,
      });

      this.inventory.splice(itemIndex, 1);
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
  }

  enemyTurn() {
    if (this.enemy.hp <= 0) return;
    const aliveParty = this.party.filter(char => char.hp > 0);
    if (aliveParty.length === 0) return;
    const target = aliveParty[Math.floor(Math.random() * aliveParty.length)];
    this.combat.executeAction({ type: 'attack', actorId: this.enemy.id, targetId: target.id });
    this.refresh();
    this.checkCombatEnd();
  }

  private refresh() {
    this.ui.updateParty(this.party.map(char => ({ name: char.name, hp: char.hp, maxHp: char.maxHp, isGuarding: char.isGuarding })));
    this.ui.updateEnemy({ name: this.enemy.name, hp: this.enemy.hp, maxHp: this.enemy.maxHp, isGuarding: this.enemy.isGuarding });
    this.ui.updateInventory(this.inventory);

    if (this.renderer) {
      this.party.forEach(char => this.renderer!.playGuardAnimation(char.id, char.isGuarding));
      this.renderer.playGuardAnimation(this.enemy.id, this.enemy.isGuarding);
      this.party.forEach(char => this.renderer!.updateUnitHP(char.id, char.hp, char.maxHp));
      this.renderer.updateUnitHP(this.enemy.id, this.enemy.hp, this.enemy.maxHp);
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
      if (victor && this.onCombatEndCallback) {
        this.onCombatEndCallback(victor);
      }
    }
  }

  show() { this.ui.show(); }
  hide() { this.ui.hide(); }
  clearLog() { this.ui.clearLog(); }
}
