// Combat renderer - creates and animates 3D meshes for combat units

import * as BABYLON from 'babylonjs';
import { Character, Enemy } from '../rules/types';

export interface UnitMesh {
  id: string;
  mesh: BABYLON.Mesh;
  nameLabel: BABYLON.Mesh;
  hpBar: BABYLON.Mesh;
  hpBarBackground: BABYLON.Mesh;
}

export class CombatRenderer {
  private scene: BABYLON.Scene;
  private unitMeshes: Map<string, UnitMesh> = new Map();
  private animationQueue: Array<() => void> = [];

  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
  }

  /**
   * Create meshes for party members
   */
  createPartyMeshes(party: Character[]): void {
    party.forEach((char, index) => {
      const position = this.getPartyPosition(index);
      const unitMesh = this.createUnitMesh(char.id, char.name, position, 'party');
      this.unitMeshes.set(char.id, unitMesh);
      this.updateUnitHP(char.id, char.hp, char.maxHp);
    });
  }

  /**
   * Create mesh for enemy
   */
  createEnemyMesh(enemy: Enemy): void {
    const position = this.getEnemyPosition();
    const unitMesh = this.createUnitMesh(enemy.id, enemy.name, position, 'enemy');
    this.unitMeshes.set(enemy.id, unitMesh);
    this.updateUnitHP(enemy.id, enemy.hp, enemy.maxHp);
  }

  /**
   * Create a unit mesh (character or enemy)
   */
  private createUnitMesh(
    id: string,
    name: string,
    position: BABYLON.Vector3,
    type: 'party' | 'enemy'
  ): UnitMesh {
    // Create main body (cylinder for now)
    const body = BABYLON.MeshBuilder.CreateCylinder(
      `unit_${id}`,
      { height: 1.5, diameter: 0.8 },
      this.scene
    );
    body.position = position;

    // Set color based on type
    const material = new BABYLON.StandardMaterial(`mat_${id}`, this.scene);
    material.diffuseColor = type === 'party'
      ? new BABYLON.Color3(0.3, 0.6, 0.3) // Green for party
      : new BABYLON.Color3(0.8, 0.2, 0.2); // Red for enemy
    material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    material.alpha = 1.0;
    body.material = material;

    // Enable shadows
    body.receiveShadows = true;
    const shadowGenerator = (this.scene as any).shadowGenerator;
    if (shadowGenerator) {
      shadowGenerator.addShadowCaster(body);
    }

    // Create name label with dynamic texture
    const nameLabel = BABYLON.MeshBuilder.CreatePlane(
      `name_${id}`,
      { width: 1.5, height: 0.3 },
      this.scene
    );
    nameLabel.position = position.add(new BABYLON.Vector3(0, 1.2, 0));
    nameLabel.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

    // Create dynamic texture for name text
    const nameTexture = new BABYLON.DynamicTexture(
      `nameTexture_${id}`,
      { width: 256, height: 64 },
      this.scene,
      false
    );
    const nameMat = new BABYLON.StandardMaterial(`nameMat_${id}`, this.scene);
    nameMat.diffuseTexture = nameTexture;
    nameMat.emissiveColor = new BABYLON.Color3(0.8, 0.8, 0.8);
    nameMat.alpha = 1.0;
    nameMat.backFaceCulling = false;
    nameLabel.material = nameMat;

    // Draw text on texture
    const ctx = nameTexture.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, 256, 64);
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 128, 32);
    nameTexture.update();

    // Create HP bar background
    const hpBarBg = BABYLON.MeshBuilder.CreateBox(
      `hpBarBg_${id}`,
      { width: 1.0, height: 0.1, depth: 0.05 },
      this.scene
    );
    hpBarBg.position = position.add(new BABYLON.Vector3(0, -1.0, 0));

    const hpBgMat = new BABYLON.StandardMaterial(`hpBgMat_${id}`, this.scene);
    hpBgMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    hpBgMat.alpha = 1.0;
    hpBarBg.material = hpBgMat;

    // Create HP bar (foreground)
    const hpBar = BABYLON.MeshBuilder.CreateBox(
      `hpBar_${id}`,
      { width: 1.0, height: 0.1, depth: 0.06 },
      this.scene
    );
    hpBar.position = position.add(new BABYLON.Vector3(0, -1.0, 0.01));

    const hpMat = new BABYLON.StandardMaterial(`hpMat_${id}`, this.scene);
    hpMat.diffuseColor = new BABYLON.Color3(0.2, 0.8, 0.2);
    hpMat.emissiveColor = new BABYLON.Color3(0.1, 0.4, 0.1);
    hpMat.alpha = 1.0;
    hpBar.material = hpMat;

    return {
      id,
      mesh: body,
      nameLabel,
      hpBar,
      hpBarBackground: hpBarBg,
    };
  }

  /**
   * Get position for party member
   */
  private getPartyPosition(index: number): BABYLON.Vector3 {
    const spacing = 2.5;
    const startX = -spacing;
    const z = -3;
    return new BABYLON.Vector3(startX + index * spacing, 0.75, z);
  }

  /**
   * Get position for enemy
   */
  private getEnemyPosition(): BABYLON.Vector3 {
    return new BABYLON.Vector3(0, 0.75, 3);
  }

  /**
   * Update unit HP bar and color
   */
  updateUnitHP(id: string, currentHP: number, maxHP: number): void {
    const unitMesh = this.unitMeshes.get(id);
    if (!unitMesh) return;

    const hpPercent = Math.max(0, currentHP / maxHP);

    // Update HP bar width and position
    unitMesh.hpBar.scaling.x = hpPercent;
    const offset = (1.0 - hpPercent) / 2;
    unitMesh.hpBar.position.x = unitMesh.hpBarBackground.position.x - offset;

    // Update HP bar color based on percentage
    const hpMat = unitMesh.hpBar.material as BABYLON.StandardMaterial;
    if (hpPercent > 0.5) {
      hpMat.diffuseColor = new BABYLON.Color3(0.2, 0.8, 0.2); // Green
      hpMat.emissiveColor = new BABYLON.Color3(0.1, 0.4, 0.1);
    } else if (hpPercent > 0.25) {
      hpMat.diffuseColor = new BABYLON.Color3(1.0, 0.65, 0.0); // Orange
      hpMat.emissiveColor = new BABYLON.Color3(0.5, 0.3, 0.0);
    } else {
      hpMat.diffuseColor = new BABYLON.Color3(0.8, 0.2, 0.2); // Red
      hpMat.emissiveColor = new BABYLON.Color3(0.4, 0.1, 0.1);
    }

    // If dead, fade out
    if (currentHP <= 0) {
      this.playDeathAnimation(id);
    }
  }

  /**
   * Play hit animation (shake)
   */
  playHitAnimation(id: string): void {
    const unitMesh = this.unitMeshes.get(id);
    if (!unitMesh) return;

    const originalPos = unitMesh.mesh.position.clone();
    const shakeIntensity = 0.15;
    const shakeDuration = 300; // ms
    const shakeSteps = 6;
    const stepDuration = shakeDuration / shakeSteps;

    let step = 0;
    const shakeInterval = setInterval(() => {
      if (step >= shakeSteps) {
        unitMesh.mesh.position = originalPos;
        clearInterval(shakeInterval);
        return;
      }

      // Random shake
      const offsetX = (Math.random() - 0.5) * shakeIntensity;
      const offsetZ = (Math.random() - 0.5) * shakeIntensity;
      unitMesh.mesh.position = originalPos.add(new BABYLON.Vector3(offsetX, 0, offsetZ));

      step++;
    }, stepDuration);
  }

  /**
   * Play death animation (fade and scale down)
   */
  private playDeathAnimation(id: string): void {
    const unitMesh = this.unitMeshes.get(id);
    if (!unitMesh) return;

    const duration = 60; // frames
    let frame = 0;

    const animate = () => {
      if (frame >= duration) {
        // Hide completely
        unitMesh.mesh.setEnabled(false);
        unitMesh.hpBar.setEnabled(false);
        unitMesh.hpBarBackground.setEnabled(false);
        unitMesh.nameLabel.setEnabled(false);
        return;
      }

      const progress = frame / duration;
      const scale = 1.0 - progress * 0.5;
      const alpha = 1.0 - progress;

      unitMesh.mesh.scaling = new BABYLON.Vector3(scale, scale, scale);

      // Fade materials
      const meshMat = unitMesh.mesh.material as BABYLON.StandardMaterial;
      if (meshMat) {
        meshMat.alpha = alpha;
      }

      const nameMat = unitMesh.nameLabel.material as BABYLON.StandardMaterial;
      if (nameMat) {
        nameMat.alpha = alpha;
      }

      const hpMat = unitMesh.hpBar.material as BABYLON.StandardMaterial;
      if (hpMat) {
        hpMat.alpha = alpha;
      }

      const hpBgMat = unitMesh.hpBarBackground.material as BABYLON.StandardMaterial;
      if (hpBgMat) {
        hpBgMat.alpha = alpha;
      }

      frame++;
      requestAnimationFrame(animate);
    };

    animate();
  }

  /**
   * Play guard animation (blue glow)
   */
  playGuardAnimation(id: string, isGuarding: boolean): void {
    const unitMesh = this.unitMeshes.get(id);
    if (!unitMesh) return;

    const material = unitMesh.mesh.material as BABYLON.StandardMaterial;
    if (!material) return;

    if (isGuarding) {
      // Add blue emissive glow
      material.emissiveColor = new BABYLON.Color3(0.2, 0.4, 0.8);
    } else {
      // Remove glow
      material.emissiveColor = new BABYLON.Color3(0, 0, 0);
    }
  }

  /**
   * Play attack animation (lunge forward)
   */
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
    const lungeDistance = 1.0;
    const lungePos = startPos.add(direction.scale(lungeDistance));

    const lungeDuration = 15; // frames
    const returnDuration = 15; // frames
    let frame = 0;

    const animate = () => {
      if (frame < lungeDuration) {
        // Lunge forward
        const progress = frame / lungeDuration;
        const eased = this.easeOutQuad(progress);
        attackerMesh.mesh.position = BABYLON.Vector3.Lerp(startPos, lungePos, eased);
        frame++;
        requestAnimationFrame(animate);
      } else if (frame < lungeDuration + returnDuration) {
        // Return to start
        const progress = (frame - lungeDuration) / returnDuration;
        const eased = this.easeInQuad(progress);
        attackerMesh.mesh.position = BABYLON.Vector3.Lerp(lungePos, startPos, eased);
        frame++;
        requestAnimationFrame(animate);
      } else {
        // Ensure exactly at start position
        attackerMesh.mesh.position = startPos;
        onComplete?.();
      }
    };

    animate();
  }

  /**
   * Easing function for smooth animation
   */
  private easeOutQuad(t: number): number {
    return t * (2 - t);
  }

  private easeInQuad(t: number): number {
    return t * t;
  }

  /**
   * Clear all unit meshes
   */
  clear(): void {
    this.unitMeshes.forEach(unitMesh => {
      unitMesh.mesh.dispose();
      unitMesh.nameLabel.dispose();
      unitMesh.hpBar.dispose();
      unitMesh.hpBarBackground.dispose();
    });
    this.unitMeshes.clear();
  }

  /**
   * Get all unit meshes (for debugging)
   */
  getUnitMeshes(): Map<string, UnitMesh> {
    return this.unitMeshes;
  }
}
