import * as BABYLON from 'babylonjs';

export function createScene(engine: BABYLON.Engine, canvas: HTMLCanvasElement): BABYLON.Scene {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.15, 1.0);

  // Isometric-ish camera (ArcRotate positioned at 45 degrees)
  const camera = new BABYLON.ArcRotateCamera(
    'camera',
    Math.PI / 4,        // Alpha: 45 degrees horizontal
    Math.PI / 3,        // Beta: 60 degrees from vertical (isometric-ish)
    15,                 // Radius: distance from target
    BABYLON.Vector3.Zero(),
    scene
  );
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 10;
  camera.upperRadiusLimit = 30;

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

  return scene;
}
