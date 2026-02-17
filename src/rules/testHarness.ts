// Test harness for rules engine - no Babylon imports

import { CombatEngine } from './combat';
import { CombatLog } from './log';
import { rollDiceExpression } from './dice';
import { loadGameContent } from '../content/loaders';
import { createInitialRun } from '../game/bootstrap/createInitialRun';

/**
 * Run a simulated combat turn to test the rules engine
 */
export function runCombatTest(): void {
  console.log('Initializing combat test...\n');

  const { party, enemy } = createInitialRun(loadGameContent());
  const [tank, second, third] = party;

  if (!tank || !second || !third) {
    throw new Error('Initial run must contain at least 3 party members for runCombatTest');
  }

  // Create combat log
  const log = new CombatLog();

  // Initialize combat engine
  const combat = new CombatEngine(party, enemy, log);

  console.log('Party:');
  party.forEach((char) => {
    console.log(`  ${char.name}: HP ${char.hp}/${char.maxHp}, ATK ${char.attack}, ARM ${char.armor}`);
  });
  console.log(`\nEnemy:`);
  console.log(`  ${enemy.name}: HP ${enemy.hp}/${enemy.maxHp}, ATK ${enemy.attack}, ARM ${enemy.armor}`);
  console.log('');

  // Test dice rolling
  console.log('--- Dice Roll Tests ---');
  console.log(`d6: ${rollDiceExpression('1d6')}`);
  console.log(`2d6+3: ${rollDiceExpression('2d6+3')}`);
  console.log(`d20: ${rollDiceExpression('1d20')}`);
  console.log(`3d8-2: ${rollDiceExpression('3d8-2')}`);
  console.log('');

  // Turn 1: first party member guards, others attack
  combat.startTurn();

  combat.executeAction({
    type: 'guard',
    actorId: tank.id,
  });

  combat.executeAction({
    type: 'attack',
    actorId: second.id,
    targetId: enemy.id,
  });

  combat.executeAction({
    type: 'attack',
    actorId: third.id,
    targetId: enemy.id,
  });

  // Enemy attacks first party member
  combat.executeAction({
    type: 'attack',
    actorId: enemy.id,
    targetId: tank.id,
  });

  console.log('');

  // Turn 2: All party members attack
  combat.startTurn();

  combat.executeAction({
    type: 'attack',
    actorId: tank.id,
    targetId: enemy.id,
  });

  combat.executeAction({
    type: 'attack',
    actorId: second.id,
    targetId: enemy.id,
  });

  combat.executeAction({
    type: 'attack',
    actorId: third.id,
    targetId: enemy.id,
  });

  // Enemy attacks second party member
  combat.executeAction({
    type: 'attack',
    actorId: enemy.id,
    targetId: second.id,
  });

  console.log('');

  // Turn 3: Test edge cases
  combat.startTurn();

  // Get current state for testing
  let state = combat.getState();

  // Test: Try to attack already defeated enemy (if defeated)
  if (state.enemy && state.enemy.hp <= 0) {
    console.log('Testing dead target validation...');
    combat.executeAction({
      type: 'attack',
      actorId: tank.id,
      targetId: enemy.id,
    });
  }

  // Test: Try to have party member attack another party member
  console.log('Testing friendly fire prevention...');
  combat.executeAction({
    type: 'attack',
    actorId: tank.id,
    targetId: second.id,
  });

  console.log('');

  // Print combat log
  console.log('--- Complete Combat Log ---');
  log.print();

  console.log('');
  console.log('--- Final State ---');
  state = combat.getState();
  console.log('Party:');
  state.party.forEach((char) => {
    console.log(`  ${char.name}: HP ${char.hp}/${char.maxHp}`);
  });
  if (state.enemy) {
    console.log(`Enemy:`);
    console.log(`  ${state.enemy.name}: HP ${state.enemy.hp}/${state.enemy.maxHp}`);
  }

  if (combat.isOver()) {
    const victor = combat.getVictor();
    console.log(`\nCombat Over! Winner: ${victor}`);
  } else {
    console.log(`\nCombat continues...`);
  }

  console.log('\n=== Test Complete ===\n');
}
