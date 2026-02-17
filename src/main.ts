import * as BABYLON from 'babylonjs';
import { Game } from './game/Game';
import { createScene } from './render/createScene';
import { createUI } from './ui/createUI';
import { GameState } from './game/stateMachine';
import { runCombatTest } from './rules/testHarness';

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
});
