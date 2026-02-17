// Test harness for rules engine - no Babylon imports

import { Character, Enemy } from './types';
import { CombatEngine } from './combat';
import { CombatLog } from './log';
import { rollDiceExpression } from './dice';

/**
 * Run a simulated combat turn to test the rules engine
 */
export function runCombatTest(): void {
  console.log('Initializing combat test...\n');

  // Create combat log
  const log = new CombatLog();

  // Create party (3 characters)
  const party: Character[] = [
    {
      id: 'hero1',
      name: 'Knight',
      hp: 30,
      maxHp: 30,
      attack: 5,
      armor: 3,
      isGuarding: false,
      statuses: [],
    },
    {
      id: 'hero2',
      name: 'Mage',
      hp: 20,
      maxHp: 20,
      attack: 7,
      armor: 1,
      isGuarding: false,
      statuses: [],
    },
    {
      id: 'hero3',
      name: 'Ranger',
      hp: 25,
      maxHp: 25,
      attack: 6,
      armor: 2,
      isGuarding: false,
      statuses: [],
    },
  ];

  // Create enemy
  const enemy: Enemy = {
    id: 'goblin1',
    name: 'Goblin Chief',
    hp: 40,
    maxHp: 40,
    attack: 4,
    armor: 2,
    isGuarding: false,
    statuses: [],
  };

  // Initialize combat engine
  const combat = new CombatEngine(party, enemy, log);

  console.log('Party:');
  party.forEach(char => {
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

  // Turn 1: Knight guards, Mage and Ranger attack
  combat.startTurn();

  combat.executeAction({
    type: 'guard',
    actorId: 'hero1',
  });

  combat.executeAction({
    type: 'attack',
    actorId: 'hero2',
    targetId: 'goblin1',
  });

  combat.executeAction({
    type: 'attack',
    actorId: 'hero3',
    targetId: 'goblin1',
  });

  // Enemy attacks the Knight
  combat.executeAction({
    type: 'attack',
    actorId: 'goblin1',
    targetId: 'hero1',
  });

  console.log('');

  // Turn 2: All party members attack
  combat.startTurn();

  combat.executeAction({
    type: 'attack',
    actorId: 'hero1',
    targetId: 'goblin1',
  });

  combat.executeAction({
    type: 'attack',
    actorId: 'hero2',
    targetId: 'goblin1',
  });

  combat.executeAction({
    type: 'attack',
    actorId: 'hero3',
    targetId: 'goblin1',
  });

  // Enemy attacks the Mage
  combat.executeAction({
    type: 'attack',
    actorId: 'goblin1',
    targetId: 'hero2',
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
      actorId: 'hero1',
      targetId: 'goblin1',
    });
  }

  // Test: Try to have party member attack another party member
  console.log('Testing friendly fire prevention...');
  combat.executeAction({
    type: 'attack',
    actorId: 'hero1',
    targetId: 'hero2',
  });

  console.log('');

  // Print combat log
  console.log('--- Complete Combat Log ---');
  log.print();

  console.log('');
  console.log('--- Final State ---');
  state = combat.getState();
  console.log('Party:');
  state.party.forEach(char => {
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
