// Test harness for rules engine - no Babylon imports

import { CombatEngine } from './combat';
import { CombatLog } from './log';
import { rollDiceExpression } from './dice';
import { loadGameContent } from '../content/loaders';
import { createInitialRun } from '../game/bootstrap/createInitialRun';

/**
 * Run a simulated combat encounter to test the rules engine
 */
export function runCombatTest(): void {
  console.log('Initializing combat test...\n');

  const content = loadGameContent();
  const { party, enemies } = createInitialRun(content);
  const [tank, second, third] = party;

  if (!tank || !second || !third) {
    throw new Error('Initial run must contain at least 3 party members for runCombatTest');
  }

  // Create combat log
  const log = new CombatLog();

  // Initialize combat engine with multi-enemy support
  const combat = new CombatEngine(party, enemies, log, content);

  console.log('Party:');
  party.forEach((char) => {
    console.log(
      `  ${char.name} (Lv${char.level} ${char.characterClass}): ` +
      `HP ${char.hp}/${char.maxHp}, MP ${char.mp}/${char.maxMp}, ` +
      `ATK ${char.attack}, ARM ${char.armor}, SPD ${char.speed}`
    );
    if (char.skillIds.length > 0) {
      const skillNames = char.skillIds.map(id => content.skills.get(id)?.name ?? id);
      console.log(`    Skills: ${skillNames.join(', ')}`);
    }
  });

  console.log(`\nEnemies:`);
  enemies.forEach((enemy) => {
    console.log(
      `  ${enemy.name}: HP ${enemy.hp}/${enemy.maxHp}, MP ${enemy.mp}/${enemy.maxMp}, ` +
      `ATK ${enemy.attack}, ARM ${enemy.armor}, SPD ${enemy.speed} (${enemy.xpReward} XP)`
    );
  });
  console.log('');

  // Test dice rolling
  console.log('--- Dice Roll Tests ---');
  console.log(`d6: ${rollDiceExpression('1d6')}`);
  console.log(`2d6+3: ${rollDiceExpression('2d6+3')}`);
  console.log(`d20: ${rollDiceExpression('1d20')}`);
  console.log(`3d8-2: ${rollDiceExpression('3d8-2')}`);
  console.log('');

  const firstEnemy = enemies[0];
  if (!firstEnemy) {
    throw new Error('No enemies in encounter');
  }

  // Turn 1: first party member guards, others attack
  combat.startTurn();

  combat.executeAction({
    type: 'guard',
    actorId: tank.id,
  });

  combat.executeAction({
    type: 'attack',
    actorId: second.id,
    targetId: firstEnemy.id,
  });

  combat.executeAction({
    type: 'attack',
    actorId: third.id,
    targetId: firstEnemy.id,
  });

  // First enemy attacks tank
  combat.executeAction({
    type: 'attack',
    actorId: firstEnemy.id,
    targetId: tank.id,
  });

  console.log('');

  // Turn 2: Test skill usage
  combat.startTurn();

  // Tank uses a skill if available
  const tankSkill = tank.skillIds.find(id => {
    const s = content.skills.get(id);
    return s && s.id !== 'basic-attack' && tank.mp >= s.mpCost;
  });

  if (tankSkill) {
    combat.executeAction({
      type: 'skill',
      actorId: tank.id,
      skillId: tankSkill,
      targetId: firstEnemy.id,
    });
  } else {
    combat.executeAction({
      type: 'attack',
      actorId: tank.id,
      targetId: firstEnemy.id,
    });
  }

  // Second party member attacks
  const aliveEnemy = enemies.find(e => e.hp > 0) ?? firstEnemy;
  combat.executeAction({
    type: 'attack',
    actorId: second.id,
    targetId: aliveEnemy.id,
  });

  // Third party member uses item
  if (third.inventory.length > 0) {
    combat.executeAction({
      type: 'item',
      actorId: third.id,
      itemId: third.inventory[0].itemId,
      targetId: third.id,
    });
  }

  // Remaining enemies attack
  for (const enemy of enemies) {
    if (enemy.hp <= 0) continue;
    const target = party.find(c => c.hp > 0);
    if (!target) break;
    combat.executeAction({
      type: 'attack',
      actorId: enemy.id,
      targetId: target.id,
    });
  }

  console.log('');

  // Turn 3: All-out attack
  combat.startTurn();

  for (const char of party) {
    if (char.hp <= 0) continue;
    const target = enemies.find(e => e.hp > 0);
    if (!target) break;
    combat.executeAction({
      type: 'attack',
      actorId: char.id,
      targetId: target.id,
    });
  }

  console.log('');

  // Print combat log
  console.log('--- Complete Combat Log ---');
  log.print();

  console.log('');
  console.log('--- Final State ---');
  const state = combat.getState();
  console.log('Party:');
  state.party.forEach((char) => {
    console.log(`  ${char.name}: HP ${char.hp}/${char.maxHp}, MP ${char.mp}/${char.maxMp}`);
  });
  console.log('Enemies:');
  state.enemies.forEach((enemy) => {
    console.log(`  ${enemy.name}: HP ${enemy.hp}/${enemy.maxHp}`);
  });

  if (combat.isOver()) {
    const victor = combat.getVictor();
    console.log(`\nCombat Over! Winner: ${victor}`);
    if (victor === 'party') {
      console.log(`XP Reward: ${combat.getTotalXpReward()}`);
      console.log(`Gold Reward: ${combat.getTotalGoldReward()}`);
    }
  } else {
    console.log(`\nCombat continues...`);
  }

  console.log('\n=== Test Complete ===\n');
}
