import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';

export const WEAPON_DEFS = [
  { id: 'ar17', name: 'AR-17 CARBINE', short: 'AR-17', role: 'CARBINE', caliber: '5.56 × 45', mode: 'AUTO', kind: 'rifle', magazine: 30, reserve: 120, rpm: 690, damage: 34, headDamage: 112, spread: .014, recoil: .025, reload: 1.72, range: 65, sound: 'rifle', desc: 'MODULAR 5.56 / SELECT FIRE' },
  { id: 'v9', name: 'V9 COMPACT', short: 'V9', role: 'SIDEARM', caliber: '9 × 19', mode: 'SEMI', kind: 'pistol', magazine: 15, reserve: 60, rpm: 330, damage: 37, headDamage: 105, spread: .021, recoil: .036, reload: 1.38, range: 42, sound: 'pistol', desc: 'COMPACT 9 MM / SEMI-AUTO' },
  { id: 'sg12', name: 'SG-12 BREACHER', short: 'SG-12', role: 'SHOTGUN', caliber: '12 GA / 00', mode: 'PUMP', kind: 'shotgun', magazine: 8, reserve: 40, rpm: 92, damage: 15, headDamage: 19, pellets: 8, spread: .075, recoil: .072, reload: .62, range: 24, sound: 'shotgun', desc: '12 GA / 8-PELLET LOAD' },
  { id: 'dmr7', name: 'DMR-7 DESIGNATED', short: 'DMR-7', role: 'MARKSMAN', caliber: '7.62 × 51', mode: 'SEMI', kind: 'dmr', magazine: 10, reserve: 40, rpm: 210, damage: 73, headDamage: 150, spread: .005, recoil: .059, reload: 1.92, range: 90, sound: 'dmr', desc: 'PRECISION SEMI-AUTO' },
  { id: 'mx9', name: 'MX-9 COMPACT', short: 'MX-9', role: 'SUBMACHINE GUN', caliber: '9 × 19', mode: 'AUTO', kind: 'smg', magazine: 32, reserve: 128, rpm: 870, damage: 23, headDamage: 92, spread: .019, recoil: .021, reload: 1.43, range: 43, sound: 'smg', desc: '9 MM / COMPACT SELECT FIRE' },
  { id: 'br08', name: 'BR-08 BATTLE RIFLE', short: 'BR-08', role: 'BATTLE RIFLE', caliber: '7.62 × 39', mode: 'AUTO', kind: 'battle', magazine: 25, reserve: 75, rpm: 565, damage: 43, headDamage: 128, spread: .014, recoil: .04, reload: 1.95, range: 62, sound: 'rifle', desc: 'HEAVY SELECT FIRE' },
  { id: 'sr04', name: 'SR-04 BOLT RIFLE', short: 'SR-04', role: 'BOLT-ACTION', caliber: '7.62 × 51', mode: 'BOLT', kind: 'bolt', magazine: 5, reserve: 25, rpm: 48, damage: 104, headDamage: 200, spread: .0025, recoil: .083, reload: 2.25, range: 100, sound: 'dmr', desc: 'MANUAL BOLT / 5-ROUND' },
  { id: 'lm60', name: 'LM-60 SUPPORT', short: 'LM-60', role: 'LIGHT MACHINE GUN', caliber: '5.56 × 45', mode: 'AUTO', kind: 'lmg', magazine: 50, reserve: 150, rpm: 760, damage: 30, headDamage: 100, spread: .024, recoil: .036, reload: 2.5, range: 58, sound: 'rifle', desc: '50-ROUND BOX / FULL AUTO' },
];

export const DEFAULT_ATTACHMENTS = { optic: 'reflex', muzzle: 'standard', grip: 'vertical' };

function pbr(scene, name, hex, roughness = .48, metallic = .58, emissive = null) {
  const material = new PBRMaterial(name, scene);
  material.albedoColor = Color3.FromHexString(hex);
  material.roughness = roughness;
  material.metallic = metallic;
  material.directIntensity = 1.25;
  if (emissive) material.emissiveColor = Color3.FromHexString(emissive);
  return material;
}

function makeGun(scene, camera, def, attachment) {
  const root = new TransformNode(`${def.id} viewmodel`, scene);
  root.parent = camera;
  root.position.set(.31, -.29, .68);
  const receiver = pbr(scene, `${def.id} receiver`, '#323b36', .42, .68);
  const polymer = pbr(scene, `${def.id} polymer`, '#202723', .72, .16);
  const steel = pbr(scene, `${def.id} edges`, '#7c877c', .36, .82);
  const rubber = pbr(scene, `${def.id} rubber`, '#141917', .9, .02);
  const brass = pbr(scene, `${def.id} brass`, '#ad8344', .4, .72);
  const glass = new StandardMaterial(`${def.id} optic glass`, scene);
  glass.diffuseColor = new Color3(.24, .5, .48);
  glass.emissiveColor = new Color3(.045, .13, .11);
  glass.alpha = .72;
  glass.specularColor = new Color3(.8, .9, .8);
  const parts = [];
  const box = (name, x, y, z, width, height, depth, material, rotZ = 0) => {
    const mesh = MeshBuilder.CreateBox(`${def.id} ${name}`, { width, height, depth }, scene);
    mesh.position.set(x, y, z);
    mesh.rotation.z = rotZ;
    mesh.material = material;
    mesh.parent = root;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    mesh.renderingGroupId = 1;
    parts.push(mesh);
    return mesh;
  };
  const cylinder = (name, x, y, z, diameter, length, material) => {
    const mesh = MeshBuilder.CreateCylinder(`${def.id} ${name}`, { diameter, height: length, tessellation: 12 }, scene);
    mesh.position.set(x, y, z);
    mesh.rotation.x = Math.PI / 2;
    mesh.material = material;
    mesh.parent = root;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    mesh.renderingGroupId = 1;
    parts.push(mesh);
    return mesh;
  };

  let pump = null;
  let boltHandle = null;
  let mag = null;
  if (def.kind === 'pistol') {
    box('slide', 0, .025, .02, .14, .13, .37, receiver);
    box('slide top', 0, .092, .005, .1, .018, .3, steel);
    box('grip', 0, -.12, .07, .12, .24, .14, polymer, -.08);
    box('grip heel', 0, -.235, .075, .135, .032, .14, rubber);
    cylinder('barrel', 0, .026, .35, .07, .24, steel);
    box('trigger guard', 0, -.065, .045, .05, .085, .045, steel);
    box('under rail', 0, -.048, .26, .07, .045, .16, polymer);
  } else if (def.kind === 'shotgun') {
    box('receiver', 0, .01, .015, .21, .15, .38, receiver);
    box('receiver rail', 0, .1, .02, .17, .025, .3, steel);
    cylinder('long barrel', 0, .02, .55, .11, .78, steel);
    cylinder('tube magazine', 0, -.08, .42, .092, .63, polymer);
    pump = box('sliding forend', 0, -.095, .32, .19, .12, .24, polymer);
    box('stock', 0, -.12, -.3, .16, .2, .42, rubber, -.02);
    box('stock cheek', 0, -.035, -.31, .19, .12, .21, polymer);
    for (let i = 0; i < 4; i++) cylinder(`brass shell ${i}`, .13, -.02 + i * .036, .05, .044, .16, brass);
  } else {
    const longRifle = def.kind === 'dmr' || def.kind === 'bolt';
    const compact = def.kind === 'smg';
    const lmg = def.kind === 'lmg';
    box('upper receiver', 0, .01, 0, longRifle ? .2 : compact ? .16 : .19, .15, longRifle ? .56 : compact ? .4 : .48, receiver);
    box('top rail', 0, .096, -.015, .18, .032, .34, steel);
    box('stock', 0, -.035, -.31, .16, .12, .36, polymer);
    box('stock pad', 0, -.055, -.48, .2, .14, .1, rubber);
    const barrelLength = def.kind === 'bolt' ? 1.02 : def.kind === 'dmr' ? .74 : compact ? .48 : .63;
    const barrelCenter = def.kind === 'bolt' ? .68 : def.kind === 'dmr' ? .52 : compact ? .4 : .48;
    cylinder('barrel', 0, .022, barrelCenter, .075, barrelLength, steel);
    box('handguard', 0, -.04, .32, compact ? .13 : .15, .17, .2, polymer);
    box('foregrip', 0, -.15, .31, .07, .13, .1, rubber);
    box('pistol grip', 0, -.1, -.02, .075, .16, .12, polymer, -.08);
    mag = box('magazine', 0, -.18, -.015, lmg ? .21 : compact ? .14 : longRifle ? .15 : .15, lmg ? .36 : .27, lmg ? .22 : .18, polymer);
    box('charging handle', -.11, .04, -.06, .03, .07, .19, rubber);
    box('ejection port', .075, .015, -.01, .08, .025, .1, brass);
    box('rear sight', 0, .15, -.08, .065, .05, .06, steel);
    box('front post', 0, .12, .4, .035, .08, .035, steel);
    if (def.kind === 'bolt') boltHandle = box('bolt lever', .125, .045, -.01, .03, .11, .04, steel);
  }

  // Gloved hands and sleeves sit behind the receiver to sell the body-mounted point of view.
  const sleeve = pbr(scene, `${def.id} sleeve`, '#3a453d', .92, .02);
  const leftSleeve = MeshBuilder.CreateCapsule(`${def.id} support sleeve`, { height: .48, radius: .075, tessellation: 7 }, scene);
  leftSleeve.parent = root;
  leftSleeve.position.set(-.19, -.26, -.04);
  leftSleeve.rotation.z = -.52;
  leftSleeve.material = sleeve;
  leftSleeve.isPickable = false;
  leftSleeve.renderingGroupId = 1;
  parts.push(leftSleeve);
  const rightSleeve = MeshBuilder.CreateCapsule(`${def.id} trigger sleeve`, { height: .44, radius: .07, tessellation: 7 }, scene);
  rightSleeve.parent = root;
  rightSleeve.position.set(.15, -.25, -.09);
  rightSleeve.rotation.z = .46;
  rightSleeve.material = sleeve;
  rightSleeve.isPickable = false;
  rightSleeve.renderingGroupId = 1;
  parts.push(rightSleeve);
  box('support glove', -.085, -.16, .12, .12, .075, .15, rubber);
  box('trigger glove', .06, -.125, -.08, .1, .07, .12, rubber);

  let optic = null;
  if (attachment.optic === 'reflex' || attachment.optic === '2x') {
    const opticScale = attachment.optic === '2x' ? 1.18 : 1;
    box('optic foot', 0, .142, -.035, .12, .03, .13, polymer);
    box('optic shell', 0, .205, -.055, .11 * opticScale, .1 * opticScale, .085, receiver);
    box('optic lens', 0, .205, -.101, .082 * opticScale, .062 * opticScale, .009, glass);
    box('optic rear lens', 0, .205, -.01, .082 * opticScale, .062 * opticScale, .009, glass);
    optic = box('illuminated reticle', 0, .205, -.105, .009, .009, .012, pbr(scene, `${def.id} reticle`, '#c9f18d', .2, .1, '#8fcf4f'));
  } else {
    box('iron rear notch', 0, .143, -.07, .045, .045, .025, steel);
  }

  if (attachment.grip !== 'none' && (def.kind !== 'pistol' || attachment.grip === 'laser')) {
    const gripMat = attachment.grip === 'laser'
      ? pbr(scene, `${def.id} laser housing`, '#25342f', .42, .44, '#102c1d')
      : polymer;
    box('underbarrel attachment', .105, -.12, .31, .075, .14, .12, gripMat);
    if (attachment.grip === 'laser') box('laser emitter', .15, -.105, .39, .026, .025, .045, pbr(scene, `${def.id} laser emitter`, '#79f2ae', .2, .1, '#62f8a2'));
  }

  let muzzleAttachment = null;
  if (attachment.muzzle === 'suppressor') {
    const muzzleZ = def.kind === 'bolt' ? 1.19 : def.kind === 'dmr' ? .91 : def.kind === 'smg' ? .65 : def.kind === 'shotgun' ? 1.07 : def.kind === 'pistol' ? .52 : .82;
    const diameter = def.kind === 'shotgun' ? .16 : def.kind === 'pistol' ? .1 : .115;
    muzzleAttachment = cylinder('suppressor', 0, .022, muzzleZ, diameter, .3, polymer);
    cylinder('suppressor collar', 0, .022, muzzleZ - .1, diameter * 1.06, .035, steel);
  } else if (attachment.muzzle === 'compensator') {
    const muzzleZ = def.kind === 'bolt' ? 1.2 : def.kind === 'dmr' ? .91 : def.kind === 'smg' ? .65 : def.kind === 'shotgun' ? 1 : def.kind === 'pistol' ? .49 : .82;
    muzzleAttachment = cylinder('compensator', 0, .022, muzzleZ, def.kind === 'shotgun' ? .14 : .11, .11, steel);
  }

  const flashMat = new StandardMaterial(`${def.id} muzzle flash`, scene);
  flashMat.diffuseColor = new Color3(1, .54, .19);
  flashMat.emissiveColor = new Color3(1, .42, .09);
  flashMat.disableDepthWrite = true;
  const flash = MeshBuilder.CreateSphere(`${def.id} muzzle flash`, { diameter: .17, segments: 6 }, scene);
  flash.parent = root;
  const barrelEnd = def.kind === 'bolt' ? 1.28 : def.kind === 'dmr' ? 1.02 : def.kind === 'smg' ? .74 : def.kind === 'shotgun' ? .98 : def.kind === 'pistol' ? .52 : .94;
  flash.position.set(0, .02, attachment.muzzle === 'suppressor' ? barrelEnd + .16 : barrelEnd);
  flash.material = flashMat;
  flash.isVisible = false;
  flash.isPickable = false;
  flash.renderingGroupId = 1;
  parts.push(flash);

  // Dark, low-glare PBR geometry; keep the gun in a late rendering group so it stays legible.
  parts.forEach((mesh) => {
    mesh.renderingGroupId = 1;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
  });
  return { root, flash, pump, boltHandle, mag, optic, muzzleAttachment, parts, kick: 0, flashTimer: 0, pumpKick: 0 };
}

export function createWeaponSystem(scene, camera, attachmentsByWeapon) {
  const runtime = WEAPON_DEFS.map((def) => ({ def, mag: def.magazine, reserve: def.reserve, reload: null, lastShot: -Infinity }));
  const rigs = runtime.map((state) => makeGun(scene, camera, state.def, attachmentsByWeapon[state.def.id] || { ...DEFAULT_ATTACHMENTS }));
  let selected = 0;
  let visible = false;
  let swayX = 0;
  let swayY = 0;

  function refreshVisibility() {
    rigs.forEach((rig, index) => { rig.root.setEnabled(visible && index === selected); });
  }
  refreshVisibility();

  function equip(index) {
    selected = (index + runtime.length) % runtime.length;
    refreshVisibility();
    currentRig().kick = 0;
    return current();
  }
  function current() { return runtime[selected]; }
  function currentRig() { return rigs[selected]; }

  function setVisible(next) {
    visible = Boolean(next);
    refreshVisibility();
  }

  function configure(index, attachment) {
    const safeIndex = (index + runtime.length) % runtime.length;
    const oldRig = rigs[safeIndex];
    const oldMaterials = new Set(oldRig.parts.map((mesh) => mesh.material).filter(Boolean));
    oldRig.root.dispose(false, false);
    oldMaterials.forEach((material) => material.dispose(false, false));
    rigs[safeIndex] = makeGun(scene, camera, runtime[safeIndex].def, attachment || { ...DEFAULT_ATTACHMENTS });
    rigs[safeIndex].root.setEnabled(visible && safeIndex === selected);
  }

  function fireVisual(recoilScale = 1) {
    const rig = currentRig();
    const baseKick = Math.max(.3, current().def.recoil * 13);
    rig.kick = Math.min(1.1, rig.kick + baseKick * recoilScale);
    rig.flash.isVisible = true;
    rig.flashTimer = .07;
    if (current().def.kind === 'shotgun' || current().def.kind === 'bolt') rig.pumpKick = 1;
  }

  function update(dt, { aiming, sprinting, moving, crouched, reloading, lightOn }) {
    const rig = currentRig();
    if (!rig) return;
    rig.kick = Math.max(0, rig.kick - dt * 4.8);
    rig.pumpKick = Math.max(0, rig.pumpKick - dt * 4.4);
    if (rig.flashTimer > 0) {
      rig.flashTimer -= dt;
      if (rig.flashTimer <= 0) rig.flash.isVisible = false;
    }
    const targetX = aiming ? -.005 : .31;
    const targetY = (aiming ? -.16 : -.29) + (sprinting ? -.16 : 0) + (crouched ? -.03 : 0) + (reloading ? -.12 : 0);
    const targetZ = aiming ? .56 : .68;
    const smoothing = 1 - Math.exp(-dt * (aiming ? 15 : 10));
    rig.root.position.x += (targetX + swayX - rig.root.position.x) * smoothing;
    rig.root.position.y += (targetY + swayY - rig.kick * .035 - rig.root.position.y) * smoothing;
    rig.root.position.z += (targetZ + rig.kick * .035 - rig.root.position.z) * smoothing;
    rig.root.rotation.x += (((aiming ? 0 : -.018) + (sprinting ? -.14 : 0) + (reloading ? .38 : 0) - rig.kick * .065) - rig.root.rotation.x) * smoothing;
    rig.root.rotation.y += ((sprinting ? -.08 : 0) + swayX * .12 - rig.root.rotation.y) * smoothing;
    rig.root.rotation.z += ((sprinting ? -.16 : aiming ? 0 : .025) - rig.root.rotation.z) * smoothing;
    if (rig.pump && current().def.kind === 'shotgun') rig.pump.position.z = .32 - rig.pumpKick * .16;
    if (rig.boltHandle) rig.boltHandle.rotation.x = -.1 + rig.pumpKick * .64;
    if (rig.mag) rig.mag.rotation.x = reloading ? .34 : 0;
    if (rig.optic) rig.optic.material.emissiveColor = lightOn ? new Color3(.3, .72, .36) : new Color3(.1, .22, .11);
    swayX += (0 - swayX) * Math.min(1, dt * 7);
    swayY += (0 - swayY) * Math.min(1, dt * 7);
    return { kick: rig.kick, moving };
  }

  function addSway(dx, dy) {
    swayX = Math.max(-.032, Math.min(.032, swayX - dx * .00004));
    swayY = Math.max(-.025, Math.min(.025, swayY - dy * .000035));
  }

  return {
    runtime,
    get current() { return current(); },
    get currentIndex() { return selected; },
    get currentRig() { return currentRig(); },
    equip,
    setVisible,
    configure,
    fireVisual,
    update,
    addSway,
  };
}
