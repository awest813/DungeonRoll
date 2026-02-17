import * as BABYLON from 'babylonjs';

export function createScene(engine: BABYLON.Engine, canvas: HTMLCanvasElement): BABYLON.Scene {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.15, 1.0);

  // Locked isometric-ish camera for diorama view
  const camera = new BABYLON.ArcRotateCamera(
    'camera',
    Math.PI / 4,        // Alpha: 45 degrees horizontal
    Math.PI / 3.5,      // Beta: comfy angle from vertical
    12,                 // Radius: distance from target
    BABYLON.Vector3.Zero(),
    scene
  );
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 12;
  camera.upperRadiusLimit = 12;  // Lock zoom
  camera.lowerAlphaLimit = Math.PI / 4;
  camera.upperAlphaLimit = Math.PI / 4;  // Lock rotation
  camera.lowerBetaLimit = Math.PI / 3.5;
  camera.upperBetaLimit = Math.PI / 3.5;  // Lock tilt

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

  // Add simple minis (cylinders) to represent game pieces
  const mini1 = BABYLON.MeshBuilder.CreateCylinder(
    'mini1',
    { height: 1.5, diameter: 0.5 },
    scene
  );
  mini1.position.set(-2, 0.75, -2);

  const mini1Material = new BABYLON.StandardMaterial('mini1Mat', scene);
  mini1Material.diffuseColor = new BABYLON.Color3(0.2, 0.5, 0.8); // Blue
  mini1.material = mini1Material;

  const mini2 = BABYLON.MeshBuilder.CreateCylinder(
    'mini2',
    { height: 1.5, diameter: 0.5 },
    scene
  );
  mini2.position.set(2, 0.75, 1);

  const mini2Material = new BABYLON.StandardMaterial('mini2Mat', scene);
  mini2Material.diffuseColor = new BABYLON.Color3(0.8, 0.3, 0.2); // Red
  mini2.material = mini2Material;

  return scene;
}
