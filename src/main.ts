import * as BABYLON from 'babylonjs';
import { Game } from './game/Game';
import { createScene } from './render/createScene';
import { createUI } from './ui/createUI';
import { GameState } from './game/stateMachine';
import { runCombatTest } from './rules/testHarness';
import { createCombatUI } from './ui/createCombatUI';
import { CombatUIController } from './ui/CombatUIController';
import { Character, Enemy } from './rules/types';
import { CombatEngine } from './rules/combat';
import { CombatLog } from './rules/log';

console.log('Dungeon Roll - JRPG Engine starting...');

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;

  // Initialize Babylon engine
  const engine = new BABYLON.Engine(canvas, true);

  // Create scene with diorama board
  const scene = createScene(engine, canvas);

  // Create UI overlay
  const ui = createUI();

  // Create game instance with state change callback
  const game = new Game({
    ui,
    onStateChange: (state: GameState) => {
      console.log(`Scene responding to state: ${state}`);
      // Future: Update scene based on state (add/remove meshes, etc.)
    },
  });

  // Handle window resize
  window.addEventListener('resize', () => {
    engine.resize();
  });

  // Start render loop
  engine.runRenderLoop(() => {
    scene.render();
  });

  console.log('Game initialized. Current state:', game.getCurrentState());

  // Run combat test harness
  console.log('\n=== Running Combat Test Harness ===');
  runCombatTest();

  // Expose test function to window for manual testing
  (window as any).runCombatTest = runCombatTest;
  console.log('Tip: Run runCombatTest() in console to test combat again');

  // Initialize Combat UI
  console.log('\n=== Initializing Combat UI ===');

  // Create party
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

  // Create combat log
  const combatLog = new CombatLog();

  // Create combat engine
  const combatEngine = new CombatEngine(party, enemy, combatLog);

  // Create combat UI
  const combatUI = createCombatUI();

  // Create controller to bridge rules and UI
  const combatController = new CombatUIController(
    combatEngine,
    combatLog,
    combatUI,
    party,
    enemy
  );

  // Start combat and show UI
  combatController.startTurn();
  combatController.show();

  console.log('Combat UI ready! Click Attack or Guard buttons to play.');

  // Expose combat controller for testing
  (window as any).combat = combatController;
  console.log('Tip: combat.enemyTurn() to make enemy attack');
});
