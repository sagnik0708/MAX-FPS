import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';

export function createEnemyPalette(scene) {
  const make = (name, hex, roughness = .86, metallic = 0.02, emissive = null) => {
    const material = new PBRMaterial(name, scene);
    material.albedoColor = Color3.FromHexString(hex);
    material.roughness = roughness;
    material.metallic = metallic;
    material.directIntensity = 1.1;
    material.environmentIntensity = .2;
    if (emissive) material.emissiveColor = Color3.FromHexString(emissive);
    return material;
  };
  return {
    cloth: [make('operator cloth | ranger', '#4a5148'), make('operator cloth | slate', '#424943'), make('operator cloth | umber', '#514e43')],
    vest: [make('operator carrier | olive', '#303933'), make('operator carrier | dark', '#293330'), make('operator carrier | tan', '#39382f')],
    helmet: make('operator helmet', '#3d463c', .72, .12),
    boot: make('operator boots', '#1b211e', .91, .03),
    glove: make('operator gloves', '#242b27', .93, .02),
    strap: make('webbing and straps', '#6e694d', .88, .04),
    hostile: make('hostile ID tab', '#b84b35', .75, .04, '#321008'),
    weapon: make('operator weapon', '#252d29', .48, .56),
    weaponEdge: make('operator weapon edge', '#68736c', .4, .68),
    glass: (() => {
      const material = new StandardMaterial('dark operator visor', scene);
      material.diffuseColor = new Color3(.035, .07, .06);
      material.emissiveColor = new Color3(.015, .035, .03);
      material.specularColor = new Color3(.22, .3, .25);
      return material;
    })(),
  };
}

export function createEnemy(scene, position, seed = 0, palette, shadowGenerator = null) {
  const variation = seed % 3;
  const root = new TransformNode(`operator ${seed + 1}`, scene);
  root.position.copyFrom(position);
  const parts = [];
  const staticPieces = [];

  function addMesh(mesh, x, y, z, material, zone = 'body', shadow = false) {
    mesh.position.set(x, y, z);
    mesh.material = material;
    mesh.parent = root;
    mesh.isPickable = true;
    mesh.checkCollisions = false;
    mesh.receiveShadows = false;
    mesh.metadata = { enemyRef: enemy, hitZone: zone, blocksShots: false };
    parts.push(mesh);
    if (shadow && shadowGenerator) {
      shadowGenerator.addShadowCaster(mesh, true);
      staticPieces.push(mesh);
    }
    return mesh;
  }

  let enemy = {
    root,
    parts,
    health: 100,
    alive: true,
    deadTimer: 0,
    fireTimer: 1.25 + (seed % 5) * .34,
    moveTimer: 2.4 + (seed % 4) * .47,
    phase: seed * 1.63,
    strafeSign: seed % 2 ? 1 : -1,
    spawn: position.clone(),
    flashTimer: 0,
    muzzle: new Vector3(.04, 1.03, .62),
  };

  const torso = MeshBuilder.CreateCapsule(`operator torso ${seed}`, { height: 1.05, radius: .27, tessellation: 8, subdivisions: 2 }, scene);
  addMesh(torso, 0, 1.18, 0, palette.cloth[variation], 'body', true);
  const plate = MeshBuilder.CreateBox(`plate carrier ${seed}`, { width: .48, height: .52, depth: .16 }, scene);
  addMesh(plate, 0, 1.25, .14, palette.vest[variation]);
  const upperPlate = MeshBuilder.CreateBox(`upper armour ${seed}`, { width: .34, height: .11, depth: .05 }, scene);
  addMesh(upperPlate, 0, 1.48, .225, palette.strap);
  for (let i = 0; i < 3; i++) {
    const pouch = MeshBuilder.CreateBox(`mag pouch ${seed}-${i}`, { width: .09, height: .15, depth: .045 }, scene);
    addMesh(pouch, -.12 + i * .12, 1.03, .24, palette.boot);
  }
  const hostileMark = MeshBuilder.CreateBox(`hostile identifier ${seed}`, { width: .18, height: .055, depth: .03 }, scene);
  addMesh(hostileMark, 0, 1.32, .24, palette.hostile);
  const shoulderMark = MeshBuilder.CreateBox(`hostile shoulder ${seed}`, { width: .08, height: .12, depth: .19 }, scene);
  addMesh(shoulderMark, -.28, 1.34, .035, palette.hostile);

  for (const side of [-1, 1]) {
    const leg = MeshBuilder.CreateCapsule(`leg ${seed}-${side}`, { height: .76, radius: .105, tessellation: 7, subdivisions: 1 }, scene);
    addMesh(leg, side * .13, .52, 0, palette.cloth[variation], 'body');
    const knee = MeshBuilder.CreateBox(`knee pad ${seed}-${side}`, { width: .19, height: .15, depth: .2 }, scene);
    addMesh(knee, side * .13, .32, .045, palette.vest[variation]);
    const boot = MeshBuilder.CreateBox(`boot ${seed}-${side}`, { width: .22, height: .18, depth: .34 }, scene);
    addMesh(boot, side * .13, .1, .055, palette.boot);

    const upperArm = MeshBuilder.CreateCapsule(`sleeve ${seed}-${side}`, { height: .55, radius: .09, tessellation: 7, subdivisions: 1 }, scene);
    upperArm.rotation.z = side * .31;
    addMesh(upperArm, side * .33, 1.27, .03, palette.cloth[variation]);
    const forearm = MeshBuilder.CreateCapsule(`forearm ${seed}-${side}`, { height: .44, radius: .075, tessellation: 7, subdivisions: 1 }, scene);
    forearm.rotation.z = side * .23;
    addMesh(forearm, side * .39, 1.02, .13, palette.cloth[variation]);
    const cuff = MeshBuilder.CreateBox(`arm band ${seed}-${side}`, { width: .12, height: .08, depth: .17 }, scene);
    addMesh(cuff, side * .36, 1.14, .15, palette.hostile);
    const glove = MeshBuilder.CreateBox(`glove ${seed}-${side}`, { width: .14, height: .11, depth: .15 }, scene);
    addMesh(glove, side * .4, .82, .2, palette.glove);
  }

  const head = MeshBuilder.CreateSphere(`head hit area ${seed}`, { diameter: .33, segments: 10 }, scene);
  addMesh(head, 0, 1.82, .015, palette.strap, 'head', true);
  const helmet = MeshBuilder.CreateSphere(`helmet shell ${seed}`, { diameter: .41, segments: 9, slice: .55 }, scene);
  addMesh(helmet, 0, 1.95, -.005, palette.helmet, 'head');
  const visor = MeshBuilder.CreateBox(`visor ${seed}`, { width: .27, height: .075, depth: .035 }, scene);
  addMesh(visor, 0, 1.81, .17, palette.glass, 'head');
  const helmetTag = MeshBuilder.CreateBox(`helmet tab ${seed}`, { width: .05, height: .04, depth: .08 }, scene);
  addMesh(helmetTag, .17, 1.97, .02, palette.hostile, 'head');
  const pack = MeshBuilder.CreateBox(`operator pack ${seed}`, { width: .31, height: .42, depth: .13 }, scene);
  addMesh(pack, 0, 1.31, -.19, palette.vest[variation]);

  // Compact low-poly service rifle, carried low and aimed toward the player's position.
  const receiver = MeshBuilder.CreateBox(`carried receiver ${seed}`, { width: .12, height: .1, depth: .34 }, scene);
  receiver.parent = root;
  receiver.position.set(.055, 1.03, .2);
  receiver.material = palette.weapon;
  receiver.isPickable = true;
  receiver.checkCollisions = false;
  receiver.metadata = { enemyRef: enemy, hitZone: 'body', blocksShots: false };
  parts.push(receiver);
  const barrel = MeshBuilder.CreateCylinder(`carried barrel ${seed}`, { height: .43, diameter: .045, tessellation: 8 }, scene);
  barrel.parent = root;
  barrel.position.set(.055, 1.045, .56);
  barrel.rotation.x = Math.PI / 2;
  barrel.material = palette.weaponEdge;
  barrel.isPickable = true;
  barrel.checkCollisions = false;
  barrel.metadata = { enemyRef: enemy, hitZone: 'body', blocksShots: false };
  parts.push(barrel);
  const magazine = MeshBuilder.CreateBox(`carried magazine ${seed}`, { width: .08, height: .19, depth: .1 }, scene);
  magazine.parent = root;
  magazine.position.set(.055, .9, .19);
  magazine.material = palette.weapon;
  magazine.isPickable = true;
  magazine.checkCollisions = false;
  magazine.metadata = { enemyRef: enemy, hitZone: 'body', blocksShots: false };
  parts.push(magazine);

  root.metadata = { enemyRef: enemy };
  enemy.staticPieces = staticPieces;
  return enemy;
}

export function destroyEnemy(enemy) {
  if (!enemy || !enemy.alive) return false;
  enemy.alive = false;
  enemy.deadTimer = 0;
  return true;
}

export function updateEnemyPose(enemy, dt, playerPosition, time, crouched = false) {
  if (!enemy.alive) {
    enemy.deadTimer += dt;
    const fall = Math.min(1, enemy.deadTimer * 2.4);
    enemy.root.rotation.z = enemy.strafeSign * fall * 1.18;
    enemy.root.rotation.x = fall * .08;
    enemy.root.position.y = -fall * .28;
    return;
  }
  const dx = playerPosition.x - enemy.root.position.x;
  const dz = playerPosition.z - enemy.root.position.z;
  enemy.root.rotation.y = Math.atan2(dx, dz);
  enemy.root.position.y = Math.sin(time * 2.2 + enemy.phase) * .012;
  enemy.root.position.x = enemy.spawn.x + Math.sin(time * .74 + enemy.phase) * (crouched ? .05 : .24) * enemy.strafeSign;
  enemy.fireTimer -= dt;
  enemy.moveTimer -= dt;
  if (enemy.moveTimer <= 0) {
    enemy.moveTimer = 2.6 + Math.random() * 2.8;
    enemy.strafeSign *= -1;
  }
  if (enemy.flashTimer > 0) enemy.flashTimer = Math.max(0, enemy.flashTimer - dt);
}
