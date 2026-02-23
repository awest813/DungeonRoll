// Bridges the rules engine with the combat UI and 3D renderer

import { Character, Enemy } from '../rules/types';
import { CombatEngine } from '../rules/combat';
import { CombatLog } from '../rules/log';
import { CombatUI } from './createCombatUI';
import { CombatRenderer } from '../render/CombatRenderer';
import { GameContent } from '../content/loaders/types';

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
  private selectedHeroIndex: number = 0;

  constructor(
    combat: CombatEngine,
    log: CombatLog,
    ui: CombatUI,
    party: Character[],
    enemies: Enemy[],
    content: GameContent,
    renderer?: CombatRenderer,
    onCombatEnd?: (victor: 'party' | 'enemy') => void
  ) {
    this.combat = combat;
    this.log = log;
    this.ui = ui;
    this.party = party;
    this.enemies = enemies;
    this.content = content;
    this.renderer = renderer;
    this.onCombatEndCallback = onCombatEnd;

    // Initialize selected hero to first alive
    const firstAlive = party.findIndex(c => c.hp > 0);
    this.selectedHeroIndex = firstAlive >= 0 ? firstAlive : 0;

    this.setupEventHandlers();
    this.refresh();
  }

  private setupEventHandlers() {
    // Track hero selection changes to update skills/items display
    this.ui.onHeroSelect((heroIndex) => {
      this.selectedHeroIndex = heroIndex;
      this.refreshSkillsAndItems();
    });

    this.ui.onAttack((heroIndex, targetEnemyIndex) => {
      const hero = this.party[heroIndex];
      const target = this.enemies[targetEnemyIndex];
      if (!hero || hero.hp <= 0 || !target || target.hp <= 0) return;

      if (this.renderer) {
        this.renderer.playAttackAnimation(hero.id, target.id, () => {
          const hpBefore = target.hp;
          this.combat.executeAction({
            type: 'attack',
            actorId: hero.id,
            targetId: target.id,
          });
          if (target.hp < hpBefore) {
            this.renderer!.playHitAnimation(target.id);
            this.renderer!.updateUnitHP(target.id, target.hp, target.maxHp);
          }
          this.refresh();
          this.checkCombatEnd();
        });
      } else {
        this.combat.executeAction({
          type: 'attack',
          actorId: hero.id,
          targetId: target.id,
        });
        this.refresh();
        this.checkCombatEnd();
      }
    });

    this.ui.onGuard((heroIndex) => {
      const hero = this.party[heroIndex];
      if (!hero || hero.hp <= 0) return;

      this.combat.executeAction({
        type: 'guard',
        actorId: hero.id,
      });
      if (this.renderer) {
        this.renderer.playGuardAnimation(hero.id, true);
      }
      this.refresh();
    });

    this.ui.onSkill((heroIndex, skillId, targetIndex, _isAlly) => {
      const hero = this.party[heroIndex];
      if (!hero || hero.hp <= 0) return;

      const skill = this.content.skills.get(skillId);
      if (!skill) return;

      let targetId: string | undefined;
      if (skill.targeting === 'single_enemy') {
        targetId = this.enemies[targetIndex]?.id;
      } else if (skill.targeting === 'single_ally') {
        // Target the selected hero (self-heal or ally-buff)
        targetId = this.party[heroIndex]?.id;
      } else if (skill.targeting === 'self') {
        targetId = hero.id;
      }

      this.combat.executeAction({
        type: 'skill',
        actorId: hero.id,
        skillId,
        targetId,
      });

      if (this.renderer) {
        this.enemies.forEach(e => {
          this.renderer!.updateUnitHP(e.id, e.hp, e.maxHp);
        });
        this.party.forEach(c => {
          this.renderer!.updateUnitHP(c.id, c.hp, c.maxHp);
        });
      }
      this.refresh();
      this.checkCombatEnd();
    });

    this.ui.onItem((heroIndex, itemId, targetIndex) => {
      const hero = this.party[heroIndex];
      if (!hero || hero.hp <= 0) return;

      const targetId = this.party[targetIndex]?.id ?? hero.id;
      this.combat.executeAction({
        type: 'item',
        actorId: hero.id,
        itemId,
        targetId,
      });
      this.refresh();
    });

    this.ui.onEndTurn(() => {
      this.enemyTurn();
    });
  }

  startTurn() {
    this.combat.startTurn();
    this.refresh();
  }

  private enemyTurn() {
    const aliveEnemies = this.enemies.filter(e => e.hp > 0);
    if (aliveEnemies.length === 0) return;

    const aliveParty = this.party.filter(c => c.hp > 0);
    if (aliveParty.length === 0) return;

    this.ui.setActionsEnabled(false);

    let enemyIndex = 0;
    const processNextEnemy = () => {
      if (enemyIndex >= aliveEnemies.length || this.combat.isOver()) {
        this.ui.setActionsEnabled(true);
        this.startTurn();
        this.checkCombatEnd();
        return;
      }

      const enemy = aliveEnemies[enemyIndex];
      enemyIndex++;

      const availableSkills = enemy.skillIds
        .map(id => this.content.skills.get(id))
        .filter(s => s && s.id !== 'basic-attack' && enemy.mp >= s.mpCost);

      const currentAliveParty = this.party.filter(c => c.hp > 0);
      if (currentAliveParty.length === 0) {
        this.refresh();
        this.checkCombatEnd();
        return;
      }
      const target = currentAliveParty[Math.floor(Math.random() * currentAliveParty.length)];

      if (availableSkills.length > 0 && Math.random() < 0.4) {
        const skill = availableSkills[Math.floor(Math.random() * availableSkills.length)]!;
        this.combat.executeAction({
          type: 'skill',
          actorId: enemy.id,
          skillId: skill.id,
          targetId: target.id,
        });
        if (this.renderer) {
          this.party.forEach(c => {
            this.renderer!.updateUnitHP(c.id, c.hp, c.maxHp);
          });
        }
        this.refresh();
        setTimeout(processNextEnemy, 600);
      } else {
        if (this.renderer) {
          this.renderer.playAttackAnimation(enemy.id, target.id, () => {
            const hpBefore = target.hp;
            this.combat.executeAction({
              type: 'attack',
              actorId: enemy.id,
              targetId: target.id,
            });
            if (target.hp < hpBefore) {
              this.renderer!.playHitAnimation(target.id);
              this.renderer!.updateUnitHP(target.id, target.hp, target.maxHp);
            }
            if (!target.isGuarding && this.renderer) {
              this.renderer.playGuardAnimation(target.id, false);
            }
            this.refresh();
            setTimeout(processNextEnemy, 300);
          });
        } else {
          this.combat.executeAction({
            type: 'attack',
            actorId: enemy.id,
            targetId: target.id,
          });
          this.refresh();
          setTimeout(processNextEnemy, 100);
        }
      }
    };

    processNextEnemy();
  }

  private refresh() {
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

    this.ui.updateEnemies(
      this.enemies.map(enemy => ({
        id: enemy.id,
        name: enemy.name,
        hp: enemy.hp,
        maxHp: enemy.maxHp,
        isGuarding: enemy.isGuarding,
        statuses: enemy.statuses.map(s => STATUS_LABELS[s.type] ?? s.type),
      }))
    );

    this.refreshSkillsAndItems();

    if (this.renderer) {
      this.party.forEach(char => {
        this.renderer!.playGuardAnimation(char.id, char.isGuarding);
      });
      this.enemies.forEach(enemy => {
        this.renderer!.playGuardAnimation(enemy.id, enemy.isGuarding);
      });
    }

    const messages = this.log.getMessages();
    const lastMessages = messages.slice(Math.max(0, messages.length - 30));
    this.ui.clearLog();
    lastMessages.forEach(msg => this.ui.addLogEntry(msg));
  }

  private refreshSkillsAndItems() {
    // Use the selected hero for skills/items display (not always first alive)
    const selectedHero = this.party[this.selectedHeroIndex];
    const hero = (selectedHero && selectedHero.hp > 0) ? selectedHero : this.party.find(c => c.hp > 0);
    if (!hero) return;

    const skills = hero.skillIds
      .map(id => this.content.skills.get(id))
      .filter((s): s is NonNullable<typeof s> => !!s)
      .map(s => ({
        id: s.id,
        name: s.name,
        mpCost: s.mpCost,
        description: s.description,
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

  private checkCombatEnd() {
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
