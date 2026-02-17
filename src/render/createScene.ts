import * as BABYLON from 'babylonjs';

export function createScene(engine: BABYLON.Engine, canvas: HTMLCanvasElement): BABYLON.Scene {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.15, 1.0);

  // Locked isometric-ish camera for diorama view
  const camera = new BABYLON.ArcRotateCamera(
    'camera',
    -Math.PI / 2,       // Alpha: View from the side
    Math.PI / 3,        // Beta: Look down at 60 degrees
    15,                 // Radius: distance from target
    new BABYLON.Vector3(0, 0, 0),  // Look at center
    scene
  );
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 10;
  camera.upperRadiusLimit = 20;  // Allow some zoom
  camera.lowerAlphaLimit = -Math.PI;
  camera.upperAlphaLimit = Math.PI;  // Allow rotation
  camera.lowerBetaLimit = Math.PI / 6;
  camera.upperBetaLimit = Math.PI / 2.2;  // Prevent going under ground

  // Lighting setup for tabletop feel
  const ambientLight = new BABYLON.HemisphericLight(
    'ambientLight',
    new BABYLON.Vector3(0, 1, 0),
    scene
  );
  ambientLight.intensity = 0.6;

  const directionalLight = new BABYLON.DirectionalLight(
    'dirLight',
    new BABYLON.Vector3(-1, -2, -1),
    scene
  );
  directionalLight.intensity = 0.5;

  // Enable shadows
  const shadowGenerator = new BABYLON.ShadowGenerator(1024, directionalLight);
  shadowGenerator.useBlurExponentialShadowMap = true;
  shadowGenerator.blurScale = 2;

  // Diorama board (ground)
  const ground = BABYLON.MeshBuilder.CreateGround(
    'ground',
    { width: 12, height: 12 },
    scene
  );

  const groundMaterial = new BABYLON.StandardMaterial('groundMat', scene);
  groundMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.25, 0.2); // Brownish tabletop
  groundMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
  ground.material = groundMaterial;
  ground.receiveShadows = true;

  // Add a simple grid or border to make it feel like a board
  const border = BABYLON.MeshBuilder.CreateBox(
    'border',
    { width: 12.5, height: 0.3, depth: 12.5 },
    scene
  );
  border.position.y = -0.15;

  const borderMaterial = new BABYLON.StandardMaterial('borderMat', scene);
  borderMaterial.diffuseColor = new BABYLON.Color3(0.15, 0.1, 0.05);
  border.material = borderMaterial;

  // Store shadow generator on scene for combat renderer to use
  (scene as any).shadowGenerator = shadowGenerator;

  return scene;
}
