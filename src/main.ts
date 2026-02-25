import * as BABYLON from 'babylonjs';
import { createScene } from './render/createScene';
import { GameState } from './game/stateMachine';
import { GameSession } from './game/session/GameSession';
import { loadGameContent } from './content/loaders';

const isDev = import.meta.env.DEV;

console.log('Dungeon Roll - JRPG Engine starting...');

window.addEventListener('DOMContentLoaded', () => {
  const loadingDiv = document.getElementById('loading');
  if (loadingDiv) {
    setTimeout(() => {
      loadingDiv.classList.add('fade-out');
      setTimeout(() => loadingDiv.remove(), 600);
    }, 800);
  }

  const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }

  const engine = new BABYLON.Engine(canvas, true);
  const scene = createScene(engine, canvas);

  let content;
  try {
    content = loadGameContent();
  } catch (error) {
    console.error('Failed to load content:', error);
    throw error;
  }

  const session = new GameSession({
    scene,
    content,
    onStateChange: (state: GameState) => {
      console.log(`State: ${state}`);
    },
  });

  window.addEventListener('resize', () => {
    engine.resize();
  });

  engine.runRenderLoop(() => {
    scene.render();
  });

  session.start();
  console.log('Game initialized. Current state:', session.getCurrentState());

  if (isDev) {
    import('./rules/testHarness').then(({ runCombatTest }) => {
      console.log('\n=== Running Combat Test Harness ===');
      runCombatTest();
      (window as any).runCombatTest = runCombatTest;
      console.log('Tip: Run runCombatTest() in console to test combat again');
    });
  }

  console.log('=== Initialization Complete ===');
});
