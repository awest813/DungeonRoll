import * as BABYLON from 'babylonjs';
import { createScene } from './render/createScene';
import { createUI } from './ui/createUI';
import { GameState } from './game/stateMachine';
import { runCombatTest } from './rules/testHarness';
import { GameSession } from './game/session/GameSession';

const isDev = import.meta.env.DEV;

console.log('Dungeon Roll - JRPG Engine starting...');

window.addEventListener('DOMContentLoaded', () => {
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

  const engine = new BABYLON.Engine(canvas, true);
  const scene = createScene(engine, canvas);
  const ui = createUI();

  const session = new GameSession({
    ui,
    scene,
    onStateChange: (state: GameState) => {
      console.log(`Scene responding to state: ${state}`);
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
    console.log('\n=== Running Combat Test Harness ===');
    runCombatTest();

    (window as any).runCombatTest = runCombatTest;
    console.log('Tip: Run runCombatTest() in console to test combat again');
  }

  console.log('=== Initialization Complete ===');
});
