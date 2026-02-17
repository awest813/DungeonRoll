import * as BABYLON from 'babylonjs';
import { Game } from './game/Game';
import { createScene } from './render/createScene';
import { createUI } from './ui/createUI';
import { GameState } from './game/stateMachine';
import { runCombatTest } from './rules/testHarness';
import { createCombatUI } from './ui/createCombatUI';
import { CombatUIController } from './ui/CombatUIController';
import { CombatRenderer } from './render/CombatRenderer';
import { Character, Enemy } from './rules/types';
import { CombatEngine } from './rules/combat';
import { CombatLog } from './rules/log';

console.log('Dungeon Roll - JRPG Engine starting...');

window.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded event fired');

  // Hide loading indicator
  const loadingDiv = document.getElementById('loading');
  if (loadingDiv) {
    setTimeout(() => {
      loadingDiv.style.display = 'none';
    }, 1000);
  }

  const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }
  console.log('Canvas element found');

  // Initialize Babylon engine
  const engine = new BABYLON.Engine(canvas, true);
  console.log('Babylon engine initialized');

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

  // Run combat test harness (wrapped in try-catch to prevent blocking)
  try {
    console.log('\n=== Running Combat Test Harness ===');
    runCombatTest();
  } catch (error) {
    console.error('Error in combat test harness:', error);
  }

  // Expose test function to window for manual testing
  (window as any).runCombatTest = runCombatTest;
  console.log('Tip: Run runCombatTest() in console to test combat again');

  // Initialize Combat UI (wrapped in try-catch)
  try {
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

  // Create 3D combat renderer
  const combatRenderer = new CombatRenderer(scene);
  combatRenderer.createPartyMeshes(party);
  combatRenderer.createEnemyMesh(enemy);
  console.log('Combat renderer created with party and enemy meshes');

  // Create controller to bridge rules, UI, and 3D renderer
  const combatController = new CombatUIController(
    combatEngine,
    combatLog,
    combatUI,
    party,
    enemy,
    combatRenderer
  );

    // Start combat and show UI
    combatController.startTurn();
    combatController.show();

    console.log('Combat UI ready! Click Attack or Guard buttons to play.');

    // Expose combat controller for testing
    (window as any).combat = combatController;
    console.log('Tip: combat.enemyTurn() to make enemy attack');
  } catch (error) {
    console.error('Error initializing Combat UI:', error);
    console.log('Combat UI failed to initialize. Check console for errors.');
  }

  console.log('=== Initialization Complete ===');
});
