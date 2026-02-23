import * as BABYLON from 'babylonjs';

export function createScene(engine: BABYLON.Engine, canvas: HTMLCanvasElement): BABYLON.Scene {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.03, 0.03, 0.06, 1.0);

  // Fog for depth
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.015;
  scene.fogColor = new BABYLON.Color3(0.03, 0.03, 0.06);

  // Isometric diorama camera
  const camera = new BABYLON.ArcRotateCamera(
    'camera',
    -Math.PI / 2,
    Math.PI / 3,
    16,
    new BABYLON.Vector3(0, 0.5, 0),
    scene
  );
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 10;
  camera.upperRadiusLimit = 22;
  camera.lowerAlphaLimit = -Math.PI;
  camera.upperAlphaLimit = Math.PI;
  camera.lowerBetaLimit = Math.PI / 6;
  camera.upperBetaLimit = Math.PI / 2.2;
  camera.wheelDeltaPercentage = 0.01;

  // --- Lighting ---

  // Cool ambient fill from above
  const ambientLight = new BABYLON.HemisphericLight(
    'ambientLight',
    new BABYLON.Vector3(0, 1, 0),
    scene
  );
  ambientLight.intensity = 0.35;
  ambientLight.diffuse = new BABYLON.Color3(0.6, 0.65, 0.8);
  ambientLight.groundColor = new BABYLON.Color3(0.15, 0.1, 0.2);

  // Main directional (sun-like, warm)
  const dirLight = new BABYLON.DirectionalLight(
    'dirLight',
    new BABYLON.Vector3(-1, -3, -1.5),
    scene
  );
  dirLight.intensity = 0.6;
  dirLight.diffuse = new BABYLON.Color3(1.0, 0.95, 0.85);

  // Shadows
  const shadowGenerator = new BABYLON.ShadowGenerator(2048, dirLight);
  shadowGenerator.useBlurExponentialShadowMap = true;
  shadowGenerator.blurScale = 4;
  shadowGenerator.blurBoxOffset = 2;
  shadowGenerator.setDarkness(0.4);

  // Glow layer for emissive effects
  const glowLayer = new BABYLON.GlowLayer('glow', scene);
  glowLayer.intensity = 0.6;

  // --- Board / Ground ---

  // Main board surface
  const ground = BABYLON.MeshBuilder.CreateGround(
    'ground',
    { width: 13, height: 13, subdivisions: 26 },
    scene
  );

  const groundMat = new BABYLON.StandardMaterial('groundMat', scene);
  groundMat.diffuseColor = new BABYLON.Color3(0.22, 0.18, 0.14);
  groundMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
  groundMat.specularPower = 64;
  ground.material = groundMat;
  ground.receiveShadows = true;

  // Grid lines overlay
  const gridOverlay = BABYLON.MeshBuilder.CreateGround(
    'gridOverlay',
    { width: 12, height: 12 },
    scene
  );
  gridOverlay.position.y = 0.005;
  const gridMat = new BABYLON.StandardMaterial('gridMat', scene);
  const gridTexture = new BABYLON.DynamicTexture('gridTex', 512, scene, false);
  const ctx = gridTexture.getContext() as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, 512, 512);
  ctx.strokeStyle = 'rgba(100, 200, 120, 0.12)';
  ctx.lineWidth = 1;
  const cellSize = 512 / 12;
  for (let i = 0; i <= 12; i++) {
    const pos = i * cellSize;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(512, pos);
    ctx.stroke();
  }
  gridTexture.update();
  gridMat.diffuseTexture = gridTexture;
  gridMat.diffuseTexture.hasAlpha = true;
  gridMat.useAlphaFromDiffuseTexture = true;
  gridMat.emissiveColor = new BABYLON.Color3(0.15, 0.3, 0.15);
  gridMat.alpha = 1.0;
  gridMat.zOffset = -1;
  gridOverlay.material = gridMat;

  // Board border/frame (bevelled edge)
  const borderOuter = BABYLON.MeshBuilder.CreateBox(
    'borderOuter',
    { width: 14, height: 0.4, depth: 14 },
    scene
  );
  borderOuter.position.y = -0.2;
  const borderOuterMat = new BABYLON.StandardMaterial('borderOuterMat', scene);
  borderOuterMat.diffuseColor = new BABYLON.Color3(0.08, 0.06, 0.03);
  borderOuterMat.specularColor = new BABYLON.Color3(0.02, 0.02, 0.02);
  borderOuter.material = borderOuterMat;

  const borderTrim = BABYLON.MeshBuilder.CreateBox(
    'borderTrim',
    { width: 13.3, height: 0.08, depth: 13.3 },
    scene
  );
  borderTrim.position.y = 0.01;
  const trimMat = new BABYLON.StandardMaterial('trimMat', scene);
  trimMat.diffuseColor = new BABYLON.Color3(0.35, 0.28, 0.15);
  trimMat.specularColor = new BABYLON.Color3(0.15, 0.12, 0.08);
  trimMat.specularPower = 32;
  borderTrim.material = trimMat;

  // --- Corner Pillars with Torches ---

  const pillarPositions = [
    new BABYLON.Vector3(-6.2, 0, -6.2),
    new BABYLON.Vector3(6.2, 0, -6.2),
    new BABYLON.Vector3(-6.2, 0, 6.2),
    new BABYLON.Vector3(6.2, 0, 6.2),
  ];

  pillarPositions.forEach((pos, i) => {
    // Stone pillar
    const pillar = BABYLON.MeshBuilder.CreateCylinder(
      `pillar_${i}`,
      { height: 3.0, diameter: 0.6, tessellation: 8 },
      scene
    );
    pillar.position = pos.add(new BABYLON.Vector3(0, 1.5, 0));
    const pillarMat = new BABYLON.StandardMaterial(`pillarMat_${i}`, scene);
    pillarMat.diffuseColor = new BABYLON.Color3(0.25, 0.22, 0.2);
    pillarMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    pillar.material = pillarMat;
    pillar.receiveShadows = true;
    shadowGenerator.addShadowCaster(pillar);

    // Pillar cap
    const cap = BABYLON.MeshBuilder.CreateCylinder(
      `pillarCap_${i}`,
      { height: 0.2, diameterTop: 0.75, diameterBottom: 0.6, tessellation: 8 },
      scene
    );
    cap.position = pos.add(new BABYLON.Vector3(0, 3.1, 0));
    cap.material = pillarMat;

    // Torch flame (emissive sphere)
    const flame = BABYLON.MeshBuilder.CreateSphere(
      `flame_${i}`,
      { diameter: 0.35, segments: 8 },
      scene
    );
    flame.position = pos.add(new BABYLON.Vector3(0, 3.4, 0));
    const flameMat = new BABYLON.StandardMaterial(`flameMat_${i}`, scene);
    flameMat.diffuseColor = new BABYLON.Color3(1.0, 0.6, 0.1);
    flameMat.emissiveColor = new BABYLON.Color3(1.0, 0.5, 0.1);
    flameMat.alpha = 0.9;
    flame.material = flameMat;

    // Point light from torch
    const torchLight = new BABYLON.PointLight(
      `torchLight_${i}`,
      pos.add(new BABYLON.Vector3(0, 3.4, 0)),
      scene
    );
    torchLight.intensity = 0.4;
    torchLight.diffuse = new BABYLON.Color3(1.0, 0.7, 0.3);
    torchLight.range = 10;

    // Animate flame flicker
    const flickerAnim = new BABYLON.Animation(
      `flameFlicker_${i}`,
      'scaling',
      30,
      BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
      BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
    );
    const keys = [
      { frame: 0, value: new BABYLON.Vector3(1, 1, 1) },
      { frame: 8, value: new BABYLON.Vector3(1.15, 1.3, 1.15) },
      { frame: 15, value: new BABYLON.Vector3(0.9, 1.1, 0.9) },
      { frame: 22, value: new BABYLON.Vector3(1.1, 1.25, 1.1) },
      { frame: 30, value: new BABYLON.Vector3(1, 1, 1) },
    ];
    flickerAnim.setKeys(keys);
    flame.animations.push(flickerAnim);
    scene.beginAnimation(flame, 0, 30, true);

    // Flicker the torch light intensity too
    const lightFlicker = new BABYLON.Animation(
      `lightFlicker_${i}`,
      'intensity',
      30,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
    );
    const lightKeys = [
      { frame: 0, value: 0.4 },
      { frame: 7, value: 0.5 },
      { frame: 14, value: 0.35 },
      { frame: 21, value: 0.48 },
      { frame: 30, value: 0.4 },
    ];
    lightFlicker.setKeys(lightKeys);
    torchLight.animations.push(lightFlicker);
    scene.beginAnimation(torchLight, 0, 30, true);
  });

  // --- Center battle divider line ---
  const dividerLine = BABYLON.MeshBuilder.CreateBox(
    'dividerLine',
    { width: 12, height: 0.02, depth: 0.06 },
    scene
  );
  dividerLine.position.y = 0.01;
  const dividerMat = new BABYLON.StandardMaterial('dividerMat', scene);
  dividerMat.diffuseColor = new BABYLON.Color3(0.4, 0.35, 0.2);
  dividerMat.emissiveColor = new BABYLON.Color3(0.15, 0.12, 0.05);
  dividerLine.material = dividerMat;

  // --- Ambient dust particles ---
  const dustPS = new BABYLON.ParticleSystem('dust', 80, scene);
  dustPS.createPointEmitter(
    new BABYLON.Vector3(-6, 0, -6),
    new BABYLON.Vector3(6, 4, 6)
  );
  dustPS.emitter = new BABYLON.Vector3(0, 2, 0);
  dustPS.minSize = 0.02;
  dustPS.maxSize = 0.06;
  dustPS.minLifeTime = 3;
  dustPS.maxLifeTime = 8;
  dustPS.emitRate = 10;
  dustPS.color1 = new BABYLON.Color4(0.8, 0.75, 0.5, 0.15);
  dustPS.color2 = new BABYLON.Color4(0.6, 0.6, 0.4, 0.08);
  dustPS.colorDead = new BABYLON.Color4(0.5, 0.5, 0.4, 0);
  dustPS.gravity = new BABYLON.Vector3(0, -0.02, 0);
  dustPS.direction1 = new BABYLON.Vector3(-0.3, 0.1, -0.3);
  dustPS.direction2 = new BABYLON.Vector3(0.3, 0.3, 0.3);
  dustPS.minEmitPower = 0.05;
  dustPS.maxEmitPower = 0.15;
  dustPS.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
  dustPS.start();

  // Store references on scene for combat renderer
  (scene as any).shadowGenerator = shadowGenerator;
  (scene as any).glowLayer = glowLayer;

  return scene;
}
