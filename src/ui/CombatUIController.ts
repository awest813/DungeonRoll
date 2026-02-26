// Crimson Shroud-style turn order controller - individual speed-based turns
// Bonus dice pool, element chains, individual actor management

import { Character, Enemy, CombatAction, ElementType } from '../rules/types';
import { CombatEngine } from '../rules/combat';
import { CombatLog } from '../rules/log';
import { CombatUI } from './createCombatUI';
import { CombatRenderer } from '../render/CombatRenderer';
import { GameContent, EnemyAIRole } from '../content/loaders/types';
import { decideEnemyAction } from '../rules/enemyAI';

const STATUS_LABELS: Record<string, string> = {
  poisoned: '[PSN]',
  stunned: '[STN]',
  buffed: '[BUF]',
  weakened: '[WEK]',
  shielded: '[SHD]',
  regenerating: '[RGN]',
};

export class CombatUIController {
  private combat: CombatEngine;
  private log: CombatLog;
  private ui: CombatUI;
  private party: Character[];
  private enemies: Enemy[];
  private content: GameContent;
  private renderer?: CombatRenderer;
  private onCombatEndCallback?: (victor: 'party' | 'enemy') => void;
  private hasCombatEnded: boolean = false;
  private currentHeroIndex: number = -1;  // -1 = no party member acting
  private bonusDiceToSpend: number = 0;
  private gold: number = 0;

  constructor(
    combat: CombatEngine,
    log: CombatLog,
    ui: CombatUI,
    party: Character[],
    enemies: Enemy[],
    content: GameContent,
    renderer?: CombatRenderer,
    onCombatEnd?: (victor: 'party' | 'enemy') => void,
    gold: number = 0
  ) {
    this.combat = combat;
    this.log = log;
    this.ui = ui;
    this.party = party;
    this.enemies = enemies;
    this.content = content;
    this.renderer = renderer;
    this.onCombatEndCallback = onCombatEnd;
    this.gold = gold;

    this.setupEventHandlers();
    this.combat.startCombat();
    this.refresh();
    this.proceedToNextTurn();
  }

  private setupEventHandlers() {
    // Attack action
    this.ui.onAttack((heroIndex, targetEnemyIndex) => {
      if (this.currentHeroIndex < 0) return;
      const hero = this.party[this.currentHeroIndex];
      const target = this.enemies[targetEnemyIndex];
      if (!hero || hero.hp <= 0 || !target || target.hp <= 0) return;

      if (this.renderer) {
        this.renderer.playAttackAnimation(hero.id, target.id, () => {
          const hpBefore = target.hp;
          this.combat.executeAction({
            type: 'attack',
            actorId: hero.id,
            targetId: target.id,
            bonusDiceCount: this.bonusDiceToSpend,
          });
          const damage = hpBefore - target.hp;
          if (damage > 0) {
            this.renderer!.playHitAnimation(target.id);
            this.renderer!.updateUnitHP(target.id, target.hp, target.maxHp);
            this.renderer!.showDamageNumber(target.id, damage, 'damage');
          } else {
            this.renderer!.showDamageNumber(target.id, 0, 'miss');
          }
          this.advanceAndProceed();
        });
      } else {
        this.combat.executeAction({
          type: 'attack',
          actorId: hero.id,
          targetId: target.id,
          bonusDiceCount: this.bonusDiceToSpend,
        });
        this.advanceAndProceed();
      }
    });

    // Guard action
    this.ui.onGuard((heroIndex) => {
      if (this.currentHeroIndex < 0) return;
      const hero = this.party[this.currentHeroIndex];
      if (!hero || hero.hp <= 0) return;

      this.combat.executeAction({
        type: 'guard',
        actorId: hero.id,
      });
      if (this.renderer) {
        this.renderer.playGuardAnimation(hero.id, true);
      }
      this.advanceAndProceed();
    });

    // Skill action
    this.ui.onSkill((heroIndex, skillId, targetIndex, isAlly) => {
      if (this.currentHeroIndex < 0) return;
      const hero = this.party[this.currentHeroIndex];
      if (!hero || hero.hp <= 0) return;

      const skill = this.content.skills.get(skillId);
      if (!skill) return;

      let targetId: string | undefined;
      if (skill.targeting === 'single_enemy') {
        targetId = this.enemies[targetIndex]?.id;
      } else if (skill.targeting === 'single_ally') {
        const allyTarget = this.party[targetIndex];
        targetId = (allyTarget && allyTarget.hp > 0) ? allyTarget.id : hero.id;
      } else if (skill.targeting === 'self') {
        targetId = hero.id;
      }

      const executeSkill = () => {
        const enemyHpBefore = new Map(this.enemies.map(e => [e.id, e.hp]));
        const partyHpBefore = new Map(this.party.map(c => [c.id, c.hp]));

        this.combat.executeAction({
          type: 'skill',
          actorId: hero.id,
          skillId,
          targetId,
          bonusDiceCount: this.bonusDiceToSpend,
        });

        if (this.renderer) {
          this.enemies.forEach(e => {
            this.renderer!.updateUnitHP(e.id, e.hp, e.maxHp);
            const before = enemyHpBefore.get(e.id) ?? e.hp;
            const diff = before - e.hp;
            if (diff > 0) {
              this.renderer!.playHitAnimation(e.id);
              this.renderer!.showDamageNumber(e.id, diff, 'damage');
            }
          });
          this.party.forEach(c => {
            this.renderer!.updateUnitHP(c.id, c.hp, c.maxHp);
            const before = partyHpBefore.get(c.id) ?? c.hp;
            const diff = c.hp - before;
            if (diff > 0) {
              this.renderer!.showDamageNumber(c.id, diff, 'heal');
            } else if (diff < 0) {
              this.renderer!.showDamageNumber(c.id, -diff, 'damage');
            }
          });
        }
        this.advanceAndProceed();
      };

      // Use skill element for renderer effect type
      const effectType = skill.element ?? 'none';
      if (this.renderer) {
        this.renderer.playSkillAnimation(hero.id, targetId, effectType as string, executeSkill);
      } else {
        executeSkill();
      }
    });

    // Item action
    this.ui.onItem((heroIndex, itemId, targetIndex) => {
      if (this.currentHeroIndex < 0) return;
      const hero = this.party[this.currentHeroIndex];
      if (!hero || hero.hp <= 0) return;

      const targetCandidate = this.party[targetIndex];
      const targetId = (targetCandidate && targetCandidate.hp > 0) ? targetCandidate.id : hero.id;

      const hpBefore = new Map(this.party.map(c => [c.id, c.hp]));

      this.combat.executeAction({
        type: 'item',
        actorId: hero.id,
        itemId,
        targetId,
      });

      if (this.renderer) {
        this.party.forEach(c => {
          this.renderer!.updateUnitHP(c.id, c.hp, c.maxHp);
          const before = hpBefore.get(c.id) ?? c.hp;
          const diff = c.hp - before;
          if (diff > 0) {
            this.renderer!.showDamageNumber(c.id, diff, 'heal');
          } else if (diff < 0) {
            this.renderer!.showDamageNumber(c.id, -diff, 'damage');
          }
        });
      }
      this.advanceAndProceed();
    });

    // Bonus dice selection
    this.ui.onBonusDiceChange((count) => {
      this.bonusDiceToSpend = Math.max(0, Math.min(count, this.combat.getBonusDicePool()));
    });
  }

  private proceedToNextTurn(): void {
    if (this.combat.isOver()) {
      this.checkCombatEnd();
      return;
    }

    const actor = this.combat.getCurrentActor();
    if (!actor) return;

    this.bonusDiceToSpend = 0;
    this.refresh();

    if (this.combat.isPartyMember(actor.id)) {
      // Party member's turn - enable UI for this hero
      const heroIndex = this.party.findIndex(c => c.id === actor.id);
      if (heroIndex >= 0) {
        this.currentHeroIndex = heroIndex;
        this.ui.setActionsEnabled(true);
        this.ui.setCurrentActor(actor.id);
      }
    } else {
      // Enemy's turn - execute AI with animation delay
      this.currentHeroIndex = -1;
      this.ui.setActionsEnabled(false);
      this.ui.setCurrentActor(actor.id);
      setTimeout(() => this.executeEnemyTurn(actor as Enemy), 500);
    }
  }

  private executeEnemyTurn(enemy: Enemy): void {
    if (this.combat.isOver()) {
      this.checkCombatEnd();
      return;
    }

    const aliveParty = this.party.filter(c => c.hp > 0);
    if (aliveParty.length === 0) {
      this.checkCombatEnd();
      return;
    }

    // Get AI decision
    const templateId = enemy.id.replace(/-\d+$/, '');
    const template = this.content.enemies.get(templateId);
    const aiRole: EnemyAIRole = template?.aiRole ?? 'basic';
    const action = decideEnemyAction(enemy, aiRole, this.party, this.enemies, this.content);

    const executeAction = () => {
      if (action.type === 'guard') {
        this.combat.executeAction(action);
        if (this.renderer) {
          this.renderer.playGuardAnimation(enemy.id, true);
        }
        this.refresh();
        setTimeout(() => this.advanceAndProceed(), 300);
      } else if (action.type === 'skill' && action.skillId) {
        const skill = this.content.skills.get(action.skillId);
        if (!skill) {
          // Fallback to attack
          this.executeEnemyAttack(enemy, aliveParty[0]);
        } else {
          const partyHpBefore = new Map(this.party.map(c => [c.id, c.hp]));
          const enemyHpBefore = new Map(this.enemies.map(e => [e.id, e.hp]));

          this.combat.executeAction(action);

          if (this.renderer) {
            this.party.forEach(c => {
              this.renderer!.updateUnitHP(c.id, c.hp, c.maxHp);
              const before = partyHpBefore.get(c.id) ?? c.hp;
              const diff = before - c.hp;
              if (diff > 0) {
                this.renderer!.playHitAnimation(c.id);
                this.renderer!.showDamageNumber(c.id, diff, 'damage');
              }
            });
            this.enemies.forEach(e => {
              const before = enemyHpBefore.get(e.id) ?? e.hp;
              const diff = e.hp - before;
              if (diff > 0) {
                this.renderer!.updateUnitHP(e.id, e.hp, e.maxHp);
                this.renderer!.showDamageNumber(e.id, diff, 'heal');
              }
            });
          }
          this.refresh();
          setTimeout(() => this.advanceAndProceed(), 300);
        }
      } else {
        // Basic attack
        const target = aliveParty.find(c => c.id === action.targetId && c.hp > 0) ?? aliveParty[0];
        this.executeEnemyAttack(enemy, target);
      }
    };

    if (action.type === 'skill' && action.skillId) {
      const skill = this.content.skills.get(action.skillId);
      if (skill && this.renderer) {
        const effectType = skill.element ?? 'none';
        this.renderer.playSkillAnimation(enemy.id, action.targetId, effectType as string, executeAction);
        return;
      }
    }

    executeAction();
  }

  private executeEnemyAttack(enemy: Enemy, target: Character): void {
    if (this.renderer) {
      this.renderer.playAttackAnimation(enemy.id, target.id, () => {
        const hpBefore = target.hp;
        this.combat.executeAction({
          type: 'attack',
          actorId: enemy.id,
          targetId: target.id,
        });
        const damage = hpBefore - target.hp;
        if (damage > 0) {
          this.renderer!.playHitAnimation(target.id);
          this.renderer!.updateUnitHP(target.id, target.hp, target.maxHp);
          this.renderer!.showDamageNumber(target.id, damage, 'damage');
        } else {
          this.renderer!.showDamageNumber(target.id, 0, 'miss');
        }
        if (!target.isGuarding && this.renderer) {
          this.renderer.playGuardAnimation(target.id, false);
        }
        this.refresh();
        setTimeout(() => this.advanceAndProceed(), 300);
      });
    } else {
      this.combat.executeAction({
        type: 'attack',
        actorId: enemy.id,
        targetId: target.id,
      });
      this.refresh();
      setTimeout(() => this.advanceAndProceed(), 100);
    }
  }

  private advanceAndProceed(): void {
    this.refresh();
    if (this.combat.isOver()) {
      this.checkCombatEnd();
      return;
    }
    this.combat.advanceTurn();
    this.proceedToNextTurn();
  }

  private refresh(): void {
    const state = this.combat.getState();

    // Update party display
    this.ui.updateParty(
      this.party.map(char => ({
        name: char.name,
        hp: char.hp,
        maxHp: char.maxHp,
        mp: char.mp,
        maxMp: char.maxMp,
        isGuarding: char.isGuarding,
        statuses: char.statuses.map(s => STATUS_LABELS[s.type] ?? s.type),
        level: char.level,
      }))
    );

    // Update enemy display with weakness/resistance
    this.ui.updateEnemies(
      this.enemies.map(enemy => ({
        id: enemy.id,
        name: enemy.name,
        hp: enemy.hp,
        maxHp: enemy.maxHp,
        isGuarding: enemy.isGuarding,
        statuses: enemy.statuses.map(s => STATUS_LABELS[s.type] ?? s.type),
        weakness: enemy.weakness,
        resistance: enemy.resistance,
      }))
    );

    // Update skills and items for current hero
    this.refreshSkillsAndItems();

    // Update renderer
    if (this.renderer) {
      this.party.forEach(char => {
        this.renderer!.playGuardAnimation(char.id, char.isGuarding);
        if (!char.isGuarding) {
          this.renderer!.updateStatusVisuals(char.id, char.statuses.map(s => STATUS_LABELS[s.type] ?? s.type));
        }
      });
      this.enemies.forEach(enemy => {
        this.renderer!.playGuardAnimation(enemy.id, enemy.isGuarding);
        if (!enemy.isGuarding) {
          this.renderer!.updateStatusVisuals(enemy.id, enemy.statuses.map(s => STATUS_LABELS[s.type] ?? s.type));
        }
      });
    }

    // Update UI state
    this.ui.updateTurnCounter(state.turnNumber);
    this.ui.updateGold(this.gold);
    this.ui.updateBonusDice(state.bonusDicePool, state.maxBonusDice);
    this.ui.updateElementChain(state.lastElement, state.elementChainCount);

    // Update turn order bar
    const turnOrderEntries = state.turnOrder.map((id, i) => {
      const combatant = this.combat.findCombatant(id);
      return {
        id,
        name: combatant?.name ?? id,
        isParty: this.combat.isPartyMember(id),
        isCurrent: i === state.currentActorIndex,
        isDead: !combatant || combatant.hp <= 0,
      };
    });
    this.ui.updateTurnOrder(turnOrderEntries);

    // Update log
    const messages = this.log.getMessages();
    const lastMessages = messages.slice(Math.max(0, messages.length - 30));
    this.ui.clearLog();
    lastMessages.forEach(msg => this.ui.addLogEntry(msg));
  }

  private refreshSkillsAndItems(): void {
    if (this.currentHeroIndex < 0) return;
    const hero = this.party[this.currentHeroIndex];
    if (!hero || hero.hp <= 0) return;

    const skills = hero.skillIds
      .map(id => this.content.skills.get(id))
      .filter((s): s is NonNullable<typeof s> => !!s)
      .map(s => ({
        id: s.id,
        name: s.name,
        mpCost: s.mpCost,
        description: s.description,
        targeting: s.targeting,
        element: s.element,
      }));
    this.ui.updateSkills(skills, hero.mp);

    const items = hero.inventory
      .filter(e => e.quantity > 0)
      .map(e => {
        const template = this.content.items.get(e.itemId);
        return {
          itemId: e.itemId,
          name: template?.name ?? e.itemId,
          quantity: e.quantity,
        };
      });
    this.ui.updateItems(items);
  }

  private checkCombatEnd(): void {
    if (this.combat.isOver() && !this.hasCombatEnded) {
      this.hasCombatEnded = true;
      this.ui.setActionsEnabled(false);
      const victor = this.combat.getVictor();
      if (!victor) return;

      const xpReward = this.combat.getTotalXpReward();
      const goldReward = this.combat.getTotalGoldReward();

      if (victor === 'party') {
        this.ui.addLogEntry('');
        this.ui.addLogEntry('=================================');
        this.ui.addLogEntry('VICTORY! The party wins!');
        this.ui.addLogEntry(`Earned ${xpReward} XP and ${goldReward} gold!`);
        this.ui.addLogEntry('=================================');
      } else {
        this.ui.addLogEntry('');
        this.ui.addLogEntry('=================================');
        this.ui.addLogEntry('DEFEAT! The party is defeated!');
        this.ui.addLogEntry('=================================');
      }

      if (this.onCombatEndCallback) {
        setTimeout(() => this.onCombatEndCallback!(victor), 1500);
      }
    }
  }

  show() { this.ui.show(); }
  hide() { this.ui.hide(); }
  clearLog() { this.ui.clearLog(); }
}
