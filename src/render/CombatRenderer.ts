// Combat renderer - creates and animates 3D miniature-style meshes for combat units

import * as BABYLON from 'babylonjs';
import { Character, Enemy } from '../rules/types';

export interface UnitMesh {
  id: string;
  mesh: BABYLON.Mesh;         // root transform node (parent of all parts)
  bodyParts: BABYLON.Mesh[];  // body, head, base, extras
  nameLabel: BABYLON.Mesh;
  hpBar: BABYLON.Mesh;
  hpBarBackground: BABYLON.Mesh;
  type: 'party' | 'enemy';
  baseY: number;
  alive: boolean;
  visual: ClassVisual;
}

// Class-specific visual config
interface ClassVisual {
  bodyColor: BABYLON.Color3;
  accentColor: BABYLON.Color3;
  emissive: BABYLON.Color3;
  bodyHeight: number;
  bodyDiameter: number;
  headDiameter: number;
  extras?: 'shield' | 'staff' | 'bow' | 'halo' | 'daggers';
}

const CLASS_VISUALS: Record<string, ClassVisual> = {
  knight: {
    bodyColor: new BABYLON.Color3(0.25, 0.35, 0.65),
    accentColor: new BABYLON.Color3(0.5, 0.5, 0.55),
    emissive: new BABYLON.Color3(0.05, 0.08, 0.15),
    bodyHeight: 1.2,
    bodyDiameter: 0.7,
    headDiameter: 0.45,
    extras: 'shield',
  },
  mage: {
    bodyColor: new BABYLON.Color3(0.45, 0.2, 0.6),
    accentColor: new BABYLON.Color3(0.7, 0.4, 0.9),
    emissive: new BABYLON.Color3(0.12, 0.05, 0.18),
    bodyHeight: 1.4,
    bodyDiameter: 0.55,
    headDiameter: 0.4,
    extras: 'staff',
  },
  ranger: {
    bodyColor: new BABYLON.Color3(0.2, 0.45, 0.2),
    accentColor: new BABYLON.Color3(0.4, 0.3, 0.15),
    emissive: new BABYLON.Color3(0.05, 0.1, 0.05),
    bodyHeight: 1.1,
    bodyDiameter: 0.6,
    headDiameter: 0.42,
    extras: 'bow',
  },
  cleric: {
    bodyColor: new BABYLON.Color3(0.7, 0.6, 0.3),
    accentColor: new BABYLON.Color3(0.9, 0.85, 0.6),
    emissive: new BABYLON.Color3(0.15, 0.12, 0.05),
    bodyHeight: 1.15,
    bodyDiameter: 0.65,
    headDiameter: 0.43,
    extras: 'halo',
  },
  rogue: {
    bodyColor: new BABYLON.Color3(0.2, 0.2, 0.25),
    accentColor: new BABYLON.Color3(0.5, 0.15, 0.15),
    emissive: new BABYLON.Color3(0.05, 0.02, 0.05),
    bodyHeight: 1.05,
    bodyDiameter: 0.55,
    headDiameter: 0.38,
    extras: 'daggers',
  },
};

// Enemy visual styles by name keywords
function getEnemyVisual(name: string): { color: BABYLON.Color3; emissive: BABYLON.Color3; scale: number } {
  const n = name.toLowerCase();
  if (n.includes('dragon') || n.includes('wyrm')) {
    return { color: new BABYLON.Color3(0.6, 0.15, 0.15), emissive: new BABYLON.Color3(0.2, 0.05, 0.0), scale: 1.4 };
  }
  if (n.includes('skeleton') || n.includes('undead') || n.includes('lich')) {
    return { color: new BABYLON.Color3(0.7, 0.7, 0.65), emissive: new BABYLON.Color3(0.1, 0.15, 0.1), scale: 1.0 };
  }
  if (n.includes('goblin') || n.includes('imp')) {
    return { color: new BABYLON.Color3(0.3, 0.5, 0.2), emissive: new BABYLON.Color3(0.05, 0.1, 0.02), scale: 0.8 };
  }
  if (n.includes('orc') || n.includes('ogre') || n.includes('troll')) {
    return { color: new BABYLON.Color3(0.35, 0.4, 0.2), emissive: new BABYLON.Color3(0.05, 0.08, 0.02), scale: 1.25 };
  }
  if (n.includes('slime') || n.includes('ooze') || n.includes('blob')) {
    return { color: new BABYLON.Color3(0.2, 0.6, 0.3), emissive: new BABYLON.Color3(0.05, 0.15, 0.05), scale: 0.9 };
  }
  if (n.includes('spider') || n.includes('scorpion')) {
    return { color: new BABYLON.Color3(0.3, 0.15, 0.3), emissive: new BABYLON.Color3(0.08, 0.02, 0.08), scale: 0.95 };
  }
  if (n.includes('wolf') || n.includes('beast') || n.includes('bat')) {
    return { color: new BABYLON.Color3(0.35, 0.25, 0.2), emissive: new BABYLON.Color3(0.05, 0.03, 0.02), scale: 0.95 };
  }
  if (n.includes('golem') || n.includes('construct')) {
    return { color: new BABYLON.Color3(0.4, 0.38, 0.35), emissive: new BABYLON.Color3(0.05, 0.05, 0.04), scale: 1.3 };
  }
  if (n.includes('demon') || n.includes('fiend')) {
    return { color: new BABYLON.Color3(0.5, 0.1, 0.1), emissive: new BABYLON.Color3(0.15, 0.03, 0.0), scale: 1.2 };
  }
  if (n.includes('mage') || n.includes('wizard') || n.includes('sorcerer') || n.includes('necromancer')) {
    return { color: new BABYLON.Color3(0.3, 0.15, 0.5), emissive: new BABYLON.Color3(0.08, 0.03, 0.15), scale: 1.05 };
  }
  // Default enemy
  return { color: new BABYLON.Color3(0.6, 0.2, 0.2), emissive: new BABYLON.Color3(0.12, 0.03, 0.03), scale: 1.0 };
}

export class CombatRenderer {
  private scene: BABYLON.Scene;
  private unitMeshes: Map<string, UnitMesh> = new Map();
  private idleBobObserver: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>> = null;
  private bobTime: number = 0;
  private disposed: boolean = false;
  private activeTimers: Set<number> = new Set();

  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
    this.startIdleBob();
  }

  createPartyMeshes(party: Character[]): void {
    party.forEach((char, index) => {
      const position = this.getPartyPosition(index, party.length);
      const visual = CLASS_VISUALS[char.characterClass] ?? CLASS_VISUALS['knight'];
      const unitMesh = this.createMiniatureMesh(char.id, char.name, position, 'party', visual);
      this.unitMeshes.set(char.id, unitMesh);
      this.updateUnitHP(char.id, char.hp, char.maxHp);
    });
  }

  createEnemyMesh(enemy: Enemy): void {
    const position = this.getEnemyPosition();
    const enemyVis = getEnemyVisual(enemy.name);
    const visual: ClassVisual = {
      bodyColor: enemyVis.color,
      accentColor: enemyVis.color.scale(1.3),
      emissive: enemyVis.emissive,
      bodyHeight: 1.2 * enemyVis.scale,
      bodyDiameter: 0.7 * enemyVis.scale,
      headDiameter: 0.45 * enemyVis.scale,
    };
    const unitMesh = this.createMiniatureMesh(enemy.id, enemy.name, position, 'enemy', visual);
    this.unitMeshes.set(enemy.id, unitMesh);
    this.updateUnitHP(enemy.id, enemy.hp, enemy.maxHp);
  }

  createEnemyMeshes(enemies: Enemy[]): void {
    enemies.forEach((enemy, index) => {
      const position = this.getEnemyPositionByIndex(index, enemies.length);
      const enemyVis = getEnemyVisual(enemy.name);
      const visual: ClassVisual = {
        bodyColor: enemyVis.color,
        accentColor: enemyVis.color.scale(1.3),
        emissive: enemyVis.emissive,
        bodyHeight: 1.2 * enemyVis.scale,
        bodyDiameter: 0.7 * enemyVis.scale,
        headDiameter: 0.45 * enemyVis.scale,
      };
      const unitMesh = this.createMiniatureMesh(enemy.id, enemy.name, position, 'enemy', visual);
      this.unitMeshes.set(enemy.id, unitMesh);
      this.updateUnitHP(enemy.id, enemy.hp, enemy.maxHp);
    });
  }

  private createMiniatureMesh(
    id: string,
    name: string,
    position: BABYLON.Vector3,
    type: 'party' | 'enemy',
    visual: ClassVisual
  ): UnitMesh {
    const shadowGenerator = (this.scene as any).shadowGenerator as BABYLON.ShadowGenerator | undefined;
    const bodyParts: BABYLON.Mesh[] = [];

    // Root transform
    const root = new BABYLON.Mesh(`unit_${id}`, this.scene);
    root.position = position;

    // --- Circular base (like a tabletop miniature stand) ---
    const base = BABYLON.MeshBuilder.CreateCylinder(
      `base_${id}`,
      { height: 0.08, diameter: visual.bodyDiameter + 0.3, tessellation: 24 },
      this.scene
    );
    base.position.y = 0.04;
    base.parent = root;
    const baseMat = new BABYLON.StandardMaterial(`baseMat_${id}`, this.scene);
    baseMat.diffuseColor = new BABYLON.Color3(0.12, 0.1, 0.08);
    baseMat.specularColor = new BABYLON.Color3(0.15, 0.12, 0.1);
    baseMat.specularPower = 32;
    base.material = baseMat;
    base.receiveShadows = true;
    bodyParts.push(base);

    // --- Base ring (colored ring around base) ---
    const ringColor = type === 'party'
      ? new BABYLON.Color3(0.2, 0.7, 0.3)
      : new BABYLON.Color3(0.8, 0.2, 0.15);
    const ring = BABYLON.MeshBuilder.CreateTorus(
      `ring_${id}`,
      { diameter: visual.bodyDiameter + 0.25, thickness: 0.04, tessellation: 24 },
      this.scene
    );
    ring.position.y = 0.06;
    ring.parent = root;
    const ringMat = new BABYLON.StandardMaterial(`ringMat_${id}`, this.scene);
    ringMat.diffuseColor = ringColor;
    ringMat.emissiveColor = ringColor.scale(0.4);
    ring.material = ringMat;
    bodyParts.push(ring);

    // --- Body (tapered cylinder) ---
    const body = BABYLON.MeshBuilder.CreateCylinder(
      `body_${id}`,
      {
        height: visual.bodyHeight,
        diameterTop: visual.bodyDiameter * 0.7,
        diameterBottom: visual.bodyDiameter,
        tessellation: 12,
      },
      this.scene
    );
    body.position.y = 0.08 + visual.bodyHeight / 2;
    body.parent = root;
    const bodyMat = new BABYLON.StandardMaterial(`bodyMat_${id}`, this.scene);
    bodyMat.diffuseColor = visual.bodyColor;
    bodyMat.specularColor = new BABYLON.Color3(0.12, 0.12, 0.12);
    bodyMat.specularPower = 48;
    bodyMat.emissiveColor = visual.emissive;
    body.material = bodyMat;
    body.receiveShadows = true;
    if (shadowGenerator) shadowGenerator.addShadowCaster(body);
    bodyParts.push(body);

    // --- Head (sphere) ---
    const head = BABYLON.MeshBuilder.CreateSphere(
      `head_${id}`,
      { diameter: visual.headDiameter, segments: 12 },
      this.scene
    );
    head.position.y = 0.08 + visual.bodyHeight + visual.headDiameter * 0.35;
    head.parent = root;
    const headMat = new BABYLON.StandardMaterial(`headMat_${id}`, this.scene);
    headMat.diffuseColor = new BABYLON.Color3(0.75, 0.6, 0.5); // skin tone
    headMat.specularColor = new BABYLON.Color3(0.08, 0.08, 0.08);
    head.material = headMat;
    if (shadowGenerator) shadowGenerator.addShadowCaster(head);
    bodyParts.push(head);

    // --- Shoulders / pauldrons ---
    const shoulderWidth = visual.bodyDiameter * 0.65;
    [-1, 1].forEach((side, si) => {
      const shoulder = BABYLON.MeshBuilder.CreateSphere(
        `shoulder_${id}_${si}`,
        { diameter: 0.2, segments: 8 },
        this.scene
      );
      shoulder.position.set(side * shoulderWidth * 0.55, 0.08 + visual.bodyHeight * 0.85, 0);
      shoulder.parent = root;
      shoulder.material = bodyMat;
      if (shadowGenerator) shadowGenerator.addShadowCaster(shoulder);
      bodyParts.push(shoulder);
    });

    // --- Class-specific extras ---
    if (visual.extras === 'shield') {
      const shield = BABYLON.MeshBuilder.CreateBox(
        `shield_${id}`,
        { width: 0.35, height: 0.5, depth: 0.08 },
        this.scene
      );
      shield.position.set(-shoulderWidth * 0.7, 0.08 + visual.bodyHeight * 0.5, 0.1);
      shield.parent = root;
      const shieldMat = new BABYLON.StandardMaterial(`shieldMat_${id}`, this.scene);
      shieldMat.diffuseColor = visual.accentColor;
      shieldMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.25);
      shieldMat.specularPower = 24;
      shield.material = shieldMat;
      if (shadowGenerator) shadowGenerator.addShadowCaster(shield);
      bodyParts.push(shield);
    }

    if (visual.extras === 'staff') {
      const staff = BABYLON.MeshBuilder.CreateCylinder(
        `staff_${id}`,
        { height: visual.bodyHeight + 0.8, diameter: 0.06, tessellation: 6 },
        this.scene
      );
      staff.position.set(shoulderWidth * 0.65, 0.08 + (visual.bodyHeight + 0.8) / 2, 0);
      staff.parent = root;
      const staffMat = new BABYLON.StandardMaterial(`staffMat_${id}`, this.scene);
      staffMat.diffuseColor = new BABYLON.Color3(0.35, 0.2, 0.1);
      staff.material = staffMat;
      bodyParts.push(staff);

      // Staff orb
      const orb = BABYLON.MeshBuilder.CreateSphere(
        `orb_${id}`,
        { diameter: 0.18, segments: 8 },
        this.scene
      );
      orb.position.set(shoulderWidth * 0.65, 0.08 + visual.bodyHeight + 0.85, 0);
      orb.parent = root;
      const orbMat = new BABYLON.StandardMaterial(`orbMat_${id}`, this.scene);
      orbMat.diffuseColor = visual.accentColor;
      orbMat.emissiveColor = visual.accentColor.scale(0.6);
      orb.material = orbMat;
      bodyParts.push(orb);
    }

    if (visual.extras === 'bow') {
      // Curved bow using a thin cylinder
      const bow = BABYLON.MeshBuilder.CreateCylinder(
        `bow_${id}`,
        { height: 0.7, diameter: 0.04, tessellation: 6 },
        this.scene
      );
      bow.position.set(shoulderWidth * 0.65, 0.08 + visual.bodyHeight * 0.55, 0.15);
      bow.rotation.z = 0.3;
      bow.parent = root;
      const bowMat = new BABYLON.StandardMaterial(`bowMat_${id}`, this.scene);
      bowMat.diffuseColor = visual.accentColor;
      bow.material = bowMat;
      bodyParts.push(bow);
    }

    if (visual.extras === 'halo') {
      const halo = BABYLON.MeshBuilder.CreateTorus(
        `halo_${id}`,
        { diameter: visual.headDiameter + 0.15, thickness: 0.03, tessellation: 20 },
        this.scene
      );
      halo.position.y = 0.08 + visual.bodyHeight + visual.headDiameter * 0.75;
      halo.parent = root;
      const haloMat = new BABYLON.StandardMaterial(`haloMat_${id}`, this.scene);
      haloMat.diffuseColor = new BABYLON.Color3(1.0, 0.9, 0.4);
      haloMat.emissiveColor = new BABYLON.Color3(0.6, 0.5, 0.15);
      halo.material = haloMat;
      bodyParts.push(halo);
    }

    if (visual.extras === 'daggers') {
      [-1, 1].forEach((side, di) => {
        const dagger = BABYLON.MeshBuilder.CreateCylinder(
          `dagger_${id}_${di}`,
          { height: 0.4, diameterTop: 0.0, diameterBottom: 0.06, tessellation: 4 },
          this.scene
        );
        dagger.position.set(side * shoulderWidth * 0.7, 0.08 + visual.bodyHeight * 0.35, 0.15);
        dagger.rotation.x = -Math.PI / 6;
        dagger.parent = root;
        const daggerMat = new BABYLON.StandardMaterial(`daggerMat_${id}_${di}`, this.scene);
        daggerMat.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.65);
        daggerMat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.35);
        dagger.material = daggerMat;
        bodyParts.push(dagger);
      });
    }

    // --- Enemy-specific: horns/spikes for certain types ---
    if (type === 'enemy') {
      const n = name.toLowerCase();
      if (n.includes('dragon') || n.includes('demon') || n.includes('fiend')) {
        [-1, 1].forEach((side, hi) => {
          const horn = BABYLON.MeshBuilder.CreateCylinder(
            `horn_${id}_${hi}`,
            { height: 0.3, diameterTop: 0, diameterBottom: 0.08, tessellation: 6 },
            this.scene
          );
          horn.position.set(
            side * visual.headDiameter * 0.35,
            0.08 + visual.bodyHeight + visual.headDiameter * 0.5,
            -0.05
          );
          horn.rotation.z = side * 0.4;
          horn.parent = root;
          const hornMat = new BABYLON.StandardMaterial(`hornMat_${id}_${hi}`, this.scene);
          hornMat.diffuseColor = new BABYLON.Color3(0.3, 0.15, 0.1);
          horn.material = hornMat;
          bodyParts.push(horn);
        });
      }

      // Eyes glow for enemies
      const eyeGlow = BABYLON.MeshBuilder.CreateSphere(
        `eyeGlow_${id}`,
        { diameter: 0.08, segments: 6 },
        this.scene
      );
      eyeGlow.position.set(0, 0.08 + visual.bodyHeight + visual.headDiameter * 0.35, visual.headDiameter * 0.22);
      eyeGlow.parent = root;
      const eyeMat = new BABYLON.StandardMaterial(`eyeMat_${id}`, this.scene);
      eyeMat.diffuseColor = new BABYLON.Color3(1.0, 0.3, 0.1);
      eyeMat.emissiveColor = new BABYLON.Color3(0.8, 0.2, 0.05);
      eyeGlow.material = eyeMat;
      bodyParts.push(eyeGlow);
    }

    // --- Name label ---
    const labelY = 0.08 + visual.bodyHeight + visual.headDiameter + 0.3;
    const nameLabel = BABYLON.MeshBuilder.CreatePlane(
      `name_${id}`,
      { width: 1.8, height: 0.3 },
      this.scene
    );
    nameLabel.position = new BABYLON.Vector3(0, labelY, 0);
    nameLabel.parent = root;
    nameLabel.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

    const nameTexture = new BABYLON.DynamicTexture(
      `nameTexture_${id}`,
      { width: 256, height: 48 },
      this.scene,
      false
    );
    const nameMat = new BABYLON.StandardMaterial(`nameMat_${id}`, this.scene);
    nameMat.diffuseTexture = nameTexture;
    nameMat.diffuseTexture.hasAlpha = true;
    nameMat.useAlphaFromDiffuseTexture = true;
    nameMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
    nameMat.disableLighting = true;
    nameMat.backFaceCulling = false;
    nameLabel.material = nameMat;

    const ctx = nameTexture.getContext() as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, 256, 48);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    const rr = 8;
    this.roundRect(ctx, 4, 4, 248, 40, rr);
    ctx.fill();
    ctx.font = 'bold 22px Courier New';
    ctx.fillStyle = type === 'party' ? '#8fd694' : '#e88888';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 128, 24);
    nameTexture.update();

    // --- HP bar background ---
    const hpBarY = -0.06;
    const hpBarBg = BABYLON.MeshBuilder.CreateBox(
      `hpBarBg_${id}`,
      { width: 0.9, height: 0.08, depth: 0.04 },
      this.scene
    );
    hpBarBg.position = new BABYLON.Vector3(0, hpBarY, 0);
    hpBarBg.parent = root;
    const hpBgMat = new BABYLON.StandardMaterial(`hpBgMat_${id}`, this.scene);
    hpBgMat.diffuseColor = new BABYLON.Color3(0.15, 0.15, 0.15);
    hpBgMat.emissiveColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    hpBarBg.material = hpBgMat;

    // --- HP bar ---
    const hpBar = BABYLON.MeshBuilder.CreateBox(
      `hpBar_${id}`,
      { width: 0.9, height: 0.08, depth: 0.05 },
      this.scene
    );
    hpBar.position = new BABYLON.Vector3(0, hpBarY, 0.01);
    hpBar.parent = root;
    const hpMat = new BABYLON.StandardMaterial(`hpMat_${id}`, this.scene);
    hpMat.diffuseColor = new BABYLON.Color3(0.2, 0.8, 0.2);
    hpMat.emissiveColor = new BABYLON.Color3(0.1, 0.4, 0.1);
    hpBar.material = hpMat;

    return {
      id,
      mesh: root,
      bodyParts,
      nameLabel,
      hpBar,
      hpBarBackground: hpBarBg,
      type,
      baseY: position.y,
      alive: true,
      visual,
    };
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // --- Idle bob animation ---
  private startIdleBob(): void {
    this.idleBobObserver = this.scene.onBeforeRenderObservable.add(() => {
      this.bobTime += this.scene.getEngine().getDeltaTime() * 0.001;
      this.unitMeshes.forEach(unit => {
        if (!unit.alive) return;
        const bobOffset = Math.sin(this.bobTime * 1.8 + hashStr(unit.id) * 6.28) * 0.06;
        unit.mesh.position.y = unit.baseY + bobOffset;
      });
    });
  }

  // --- Positioning ---

  private getPartyPosition(index: number, total: number): BABYLON.Vector3 {
    const spacing = 2.5;
    const startX = -((total - 1) * spacing) / 2;
    return new BABYLON.Vector3(startX + index * spacing, 0.0, -3);
  }

  private getEnemyPosition(): BABYLON.Vector3 {
    return new BABYLON.Vector3(0, 0.0, 3);
  }

  private getEnemyPositionByIndex(index: number, total: number): BABYLON.Vector3 {
    const spacing = 2.5;
    const startX = -((total - 1) * spacing) / 2;
    return new BABYLON.Vector3(startX + index * spacing, 0.0, 3);
  }

  // --- HP update ---

  updateUnitHP(id: string, currentHP: number, maxHP: number): void {
    const unitMesh = this.unitMeshes.get(id);
    if (!unitMesh) return;

    const hpPercent = Math.max(0, currentHP / maxHP);

    unitMesh.hpBar.scaling.x = hpPercent;
    const offset = (1.0 - hpPercent) * 0.45; // half of bar width 0.9
    unitMesh.hpBar.position.x = -offset;

    const hpMat = unitMesh.hpBar.material as BABYLON.StandardMaterial;
    if (hpPercent > 0.5) {
      hpMat.diffuseColor = new BABYLON.Color3(0.2, 0.8, 0.2);
      hpMat.emissiveColor = new BABYLON.Color3(0.1, 0.4, 0.1);
    } else if (hpPercent > 0.25) {
      hpMat.diffuseColor = new BABYLON.Color3(1.0, 0.65, 0.0);
      hpMat.emissiveColor = new BABYLON.Color3(0.5, 0.3, 0.0);
    } else {
      hpMat.diffuseColor = new BABYLON.Color3(0.8, 0.2, 0.2);
      hpMat.emissiveColor = new BABYLON.Color3(0.4, 0.1, 0.1);
    }

    if (currentHP <= 0 && unitMesh.alive) {
      this.playDeathAnimation(id);
    }
  }

  // --- Timer management ---

  private safeSetInterval(fn: () => void, ms: number): number {
    const id = window.setInterval(() => {
      if (this.disposed) { clearInterval(id); this.activeTimers.delete(id); return; }
      fn();
    }, ms);
    this.activeTimers.add(id);
    return id;
  }

  private safeClearInterval(id: number): void {
    clearInterval(id);
    this.activeTimers.delete(id);
  }

  private safeSetTimeout(fn: () => void, ms: number): number {
    const id = window.setTimeout(() => {
      this.activeTimers.delete(id);
      if (!this.disposed) fn();
    }, ms);
    this.activeTimers.add(id);
    return id;
  }

  private clearAllTimers(): void {
    this.activeTimers.forEach(id => {
      clearInterval(id);
      clearTimeout(id);
    });
    this.activeTimers.clear();
  }

  // --- Animations ---

  playHitAnimation(id: string): void {
    const unitMesh = this.unitMeshes.get(id);
    if (!unitMesh || this.disposed) return;

    // Shake
    const originalPos = unitMesh.mesh.position.clone();
    const shakeIntensity = 0.15;
    const shakeSteps = 6;
    const stepDuration = 50;

    let step = 0;
    const shakeInterval = this.safeSetInterval(() => {
      if (step >= shakeSteps || this.disposed) {
        if (!this.disposed) {
          unitMesh.mesh.position.x = originalPos.x;
          unitMesh.mesh.position.z = originalPos.z;
        }
        this.safeClearInterval(shakeInterval);
        return;
      }
      const ox = (Math.random() - 0.5) * shakeIntensity;
      const oz = (Math.random() - 0.5) * shakeIntensity;
      unitMesh.mesh.position.x = originalPos.x + ox;
      unitMesh.mesh.position.z = originalPos.z + oz;
      step++;
    }, stepDuration);

    // Hit spark particles
    this.spawnHitSparks(unitMesh.mesh.position.clone().add(new BABYLON.Vector3(0, 0.8, 0)));

    // Flash body red briefly
    const bodyPart = unitMesh.bodyParts.find(p => p.name.startsWith('body_'));
    if (bodyPart) {
      const mat = bodyPart.material as BABYLON.StandardMaterial;
      if (mat) {
        const origEmissive = mat.emissiveColor.clone();
        mat.emissiveColor = new BABYLON.Color3(0.6, 0.1, 0.05);
        this.safeSetTimeout(() => {
          mat.emissiveColor = origEmissive;
        }, 200);
      }
    }
  }

  private playDeathAnimation(id: string): void {
    const unitMesh = this.unitMeshes.get(id);
    if (!unitMesh || this.disposed) return;

    unitMesh.alive = false;

    // Death poof particles
    this.spawnDeathPoof(unitMesh.mesh.position.clone().add(new BABYLON.Vector3(0, 0.6, 0)));

    const duration = 45;
    let frame = 0;

    const animate = () => {
      if (this.disposed) return;
      if (frame >= duration) {
        unitMesh.mesh.setEnabled(false);
        return;
      }

      const progress = frame / duration;
      const scale = 1.0 - progress * 0.6;
      const alpha = 1.0 - progress;

      unitMesh.mesh.scaling = new BABYLON.Vector3(scale, scale, scale);

      const fadeParts = [...unitMesh.bodyParts, unitMesh.nameLabel, unitMesh.hpBar, unitMesh.hpBarBackground];
      fadeParts.forEach(part => {
        const mat = part.material as BABYLON.StandardMaterial;
        if (mat) mat.alpha = alpha;
      });

      frame++;
      requestAnimationFrame(animate);
    };

    animate();
  }

  playGuardAnimation(id: string, isGuarding: boolean): void {
    const unitMesh = this.unitMeshes.get(id);
    if (!unitMesh) return;

    const bodyPart = unitMesh.bodyParts.find(p => p.name.startsWith('body_'));
    if (!bodyPart) return;

    const mat = bodyPart.material as BABYLON.StandardMaterial;
    if (!mat) return;

    if (isGuarding) {
      mat.emissiveColor = new BABYLON.Color3(0.15, 0.3, 0.7);

      // Guard shield particle effect
      const glowLayer = (this.scene as any).glowLayer as BABYLON.GlowLayer | undefined;
      if (glowLayer) {
        glowLayer.addIncludedOnlyMesh(bodyPart);
      }
    } else {
      // Restore class emissive
      const origVisual = this.getVisualForUnit(unitMesh);
      mat.emissiveColor = origVisual.emissive.clone();

      const glowLayer = (this.scene as any).glowLayer as BABYLON.GlowLayer | undefined;
      if (glowLayer) {
        glowLayer.removeIncludedOnlyMesh(bodyPart);
      }
    }
  }

  updateStatusVisuals(id: string, statuses: string[]): void {
    const unitMesh = this.unitMeshes.get(id);
    if (!unitMesh || !unitMesh.alive) return;

    const bodyPart = unitMesh.bodyParts.find(p => p.name.startsWith('body_'));
    if (!bodyPart) return;
    const mat = bodyPart.material as BABYLON.StandardMaterial;
    if (!mat) return;

    // Don't override guard glow
    if (statuses.length === 0) {
      mat.emissiveColor = unitMesh.visual.emissive.clone();
      return;
    }

    // Priority: poisoned (green) > stunned (yellow) > weakened (dark red) > buffed (gold) > shielded (blue) > regen (bright green)
    const statusStr = statuses.join(' ');
    if (statusStr.includes('PSN')) {
      mat.emissiveColor = new BABYLON.Color3(0.05, 0.25, 0.05);
    } else if (statusStr.includes('STN')) {
      mat.emissiveColor = new BABYLON.Color3(0.25, 0.2, 0.0);
    } else if (statusStr.includes('WEK')) {
      mat.emissiveColor = new BABYLON.Color3(0.25, 0.05, 0.05);
    } else if (statusStr.includes('BUF')) {
      mat.emissiveColor = new BABYLON.Color3(0.2, 0.18, 0.05);
    } else if (statusStr.includes('SHD')) {
      mat.emissiveColor = new BABYLON.Color3(0.05, 0.1, 0.25);
    } else if (statusStr.includes('RGN')) {
      mat.emissiveColor = new BABYLON.Color3(0.05, 0.2, 0.1);
    } else {
      mat.emissiveColor = unitMesh.visual.emissive.clone();
    }
  }

  playAttackAnimation(attackerId: string, targetId: string, onComplete?: () => void): void {
    const attackerMesh = this.unitMeshes.get(attackerId);
    const targetMesh = this.unitMeshes.get(targetId);

    if (!attackerMesh || !targetMesh) {
      onComplete?.();
      return;
    }

    const startPos = attackerMesh.mesh.position.clone();
    const targetPos = targetMesh.mesh.position.clone();
    const direction = targetPos.subtract(startPos).normalize();
    const lungeDistance = 1.2;
    const lungePos = startPos.add(direction.scale(lungeDistance));

    const lungeDuration = 12;
    const returnDuration = 18;
    let frame = 0;

    const attackerBaseY = attackerMesh.baseY;

    const animate = () => {
      if (this.disposed) return;

      if (frame < lungeDuration) {
        const progress = frame / lungeDuration;
        const eased = this.easeOutQuad(progress);
        attackerMesh.mesh.position = BABYLON.Vector3.Lerp(startPos, lungePos, eased);
        attackerMesh.mesh.rotation.x = eased * 0.15;
        frame++;
        requestAnimationFrame(animate);
      } else if (frame < lungeDuration + returnDuration) {
        const progress = (frame - lungeDuration) / returnDuration;
        const eased = this.easeInQuad(progress);
        attackerMesh.mesh.position = BABYLON.Vector3.Lerp(lungePos, startPos, eased);
        attackerMesh.mesh.rotation.x = (1 - eased) * 0.15;
        frame++;
        requestAnimationFrame(animate);
      } else {
        attackerMesh.mesh.position = startPos;
        attackerMesh.mesh.rotation.x = 0;
        attackerMesh.baseY = attackerBaseY;
        onComplete?.();
      }
    };

    animate();
  }

  // --- Particle Effects ---

  private spawnHitSparks(position: BABYLON.Vector3): void {
    const ps = new BABYLON.ParticleSystem(`hitSparks_${Date.now()}`, 30, this.scene);
    ps.emitter = position;
    ps.createPointEmitter(
      new BABYLON.Vector3(-0.5, -0.2, -0.5),
      new BABYLON.Vector3(0.5, 1.0, 0.5)
    );
    ps.minSize = 0.03;
    ps.maxSize = 0.08;
    ps.minLifeTime = 0.15;
    ps.maxLifeTime = 0.4;
    ps.emitRate = 200;
    ps.color1 = new BABYLON.Color4(1.0, 0.9, 0.3, 1.0);
    ps.color2 = new BABYLON.Color4(1.0, 0.5, 0.1, 0.8);
    ps.colorDead = new BABYLON.Color4(0.8, 0.2, 0.0, 0.0);
    ps.gravity = new BABYLON.Vector3(0, -3, 0);
    ps.minEmitPower = 1.5;
    ps.maxEmitPower = 3.0;
    ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    ps.targetStopDuration = 0.15;
    ps.disposeOnStop = true;
    ps.start();
  }

  private spawnDeathPoof(position: BABYLON.Vector3): void {
    const ps = new BABYLON.ParticleSystem(`deathPoof_${Date.now()}`, 50, this.scene);
    ps.emitter = position;
    ps.createSphereEmitter(0.4);
    ps.minSize = 0.08;
    ps.maxSize = 0.2;
    ps.minLifeTime = 0.4;
    ps.maxLifeTime = 1.0;
    ps.emitRate = 200;
    ps.color1 = new BABYLON.Color4(0.5, 0.5, 0.5, 0.8);
    ps.color2 = new BABYLON.Color4(0.3, 0.3, 0.3, 0.6);
    ps.colorDead = new BABYLON.Color4(0.1, 0.1, 0.1, 0.0);
    ps.gravity = new BABYLON.Vector3(0, 1.5, 0);
    ps.minEmitPower = 0.5;
    ps.maxEmitPower = 1.5;
    ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
    ps.targetStopDuration = 0.3;
    ps.disposeOnStop = true;
    ps.start();
  }

  // --- Floating damage/heal numbers ---

  showDamageNumber(targetId: string, amount: number, type: 'damage' | 'heal' | 'miss'): void {
    const unitMesh = this.unitMeshes.get(targetId);
    if (!unitMesh || this.disposed) return;

    const worldPos = unitMesh.mesh.position.clone();
    const yOffset = unitMesh.visual.bodyHeight + unitMesh.visual.headDiameter + 0.6;
    worldPos.y += yOffset;

    // Create a plane billboard for the number
    const label = BABYLON.MeshBuilder.CreatePlane(
      `dmgNum_${Date.now()}`,
      { width: 1.6, height: 0.5 },
      this.scene
    );
    label.position = worldPos.clone();
    label.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

    const texture = new BABYLON.DynamicTexture(
      `dmgTex_${Date.now()}`,
      { width: 256, height: 64 },
      this.scene,
      false
    );
    const mat = new BABYLON.StandardMaterial(`dmgMat_${Date.now()}`, this.scene);
    mat.diffuseTexture = texture;
    mat.diffuseTexture.hasAlpha = true;
    mat.useAlphaFromDiffuseTexture = true;
    mat.emissiveColor = new BABYLON.Color3(1, 1, 1);
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    label.material = mat;

    const ctx = texture.getContext() as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, 256, 64);

    let text: string;
    let color: string;
    if (type === 'miss') {
      text = 'MISS';
      color = '#aaaaaa';
    } else if (type === 'heal') {
      text = `+${amount}`;
      color = '#66ff66';
    } else {
      text = `-${amount}`;
      color = amount >= 20 ? '#ff4444' : '#ffaa44';
    }

    ctx.font = `bold ${amount >= 20 || type === 'miss' ? 36 : 30}px Courier New`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillText(text, 130, 34);
    // Main text
    ctx.fillStyle = color;
    ctx.fillText(text, 128, 32);
    texture.update();

    // Animate: float up + fade out
    const startY = worldPos.y;
    const duration = 50;
    let frame = 0;
    const xDrift = (Math.random() - 0.5) * 0.4;

    const animate = () => {
      if (this.disposed || frame >= duration) {
        label.dispose();
        mat.dispose();
        texture.dispose();
        return;
      }
      const progress = frame / duration;
      label.position.y = startY + progress * 1.5;
      label.position.x = worldPos.x + xDrift * progress;
      mat.alpha = 1.0 - progress * progress;
      // Scale up slightly for big hits
      if (type === 'damage' && amount >= 20) {
        const scale = 1.0 + (1 - progress) * 0.3;
        label.scaling = new BABYLON.Vector3(scale, scale, scale);
      }
      frame++;
      requestAnimationFrame(animate);
    };
    animate();
  }

  // --- Helpers ---

  private getVisualForUnit(unit: UnitMesh): ClassVisual {
    return unit.visual;
  }

  private easeOutQuad(t: number): number {
    return t * (2 - t);
  }

  private easeInQuad(t: number): number {
    return t * t;
  }

  clear(): void {
    this.disposed = true;

    // Cancel all pending timers
    this.clearAllTimers();

    // Stop idle bob
    if (this.idleBobObserver) {
      this.scene.onBeforeRenderObservable.remove(this.idleBobObserver);
      this.idleBobObserver = null;
    }

    this.unitMeshes.forEach(unitMesh => {
      unitMesh.bodyParts.forEach(part => part.dispose());
      unitMesh.nameLabel.dispose();
      unitMesh.hpBar.dispose();
      unitMesh.hpBarBackground.dispose();
      unitMesh.mesh.dispose();
    });
    this.unitMeshes.clear();
  }

  getUnitMeshes(): Map<string, UnitMesh> {
    return this.unitMeshes;
  }
}

// Simple string hash for desynchronizing idle bob per unit
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return (h & 0x7fffffff) / 0x7fffffff;
}
