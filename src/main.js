import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Ray } from '@babylonjs/core/Culling/ray.js';
import { PointerEventTypes } from '@babylonjs/core/Events/pointerEvents.js';
import { SpotLight } from '@babylonjs/core/Lights/spotLight.js';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { AudioDirector } from './audio.js';
import { createEnemy, createEnemyPalette, destroyEnemy, updateEnemyPose } from './entities.js';
import { createWorld } from './world.js';
import { createWeaponSystem, DEFAULT_ATTACHMENTS, WEAPON_DEFS } from './weapons.js';
import { createInterface } from './ui.js';
import './style.css';

const canvas = document.getElementById('game-canvas');
const bootOverlay = document.getElementById('boot-overlay');
const fatalError = document.getElementById('fatal-error');
const damageFlash = document.getElementById('damage-flash');
const mobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760;
const STORAGE_KEY = 'max-fps-field-profile-v2';
const DEFAULT_SETTINGS = { sensitivity: 'standard', fov: 'standard', quality: 'balanced', invertY: false, haptics: true };
const SENSITIVITY = { low: .00135, standard: .0021, high: .0031 };
const FOV = { narrow: .78, standard: .94, wide: 1.08 };

function loadProfile() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      settings: { ...DEFAULT_SETTINGS, ...(stored.settings || {}) },
      attachments: stored.attachments || {},
    };
  } catch {
    return { settings: { ...DEFAULT_SETTINGS }, attachments: {} };
  }
}

const profile = loadProfile();
const settings = profile.settings;
const attachmentsByWeapon = Object.fromEntries(WEAPON_DEFS.map((def) => [
  def.id,
  { ...DEFAULT_ATTACHMENTS, ...(profile.attachments[def.id] || {}) },
]));
function saveProfile() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings, attachments: attachmentsByWeapon })); }
  catch (error) { console.warn('Could not save the field profile.', error); }
}

let engine;
let scene;
let camera;
let world;
let audio;
let weaponSystem;
let ui;
let enemyPalette;
let weaponLight;
let laserLine;
let grenadeMaterial;
let explosionMaterial;
let grenades = [];
let explosions = [];
let enemies = [];
let collisionBoxes = [];
let hudClock = 0;
let desktopPointerLocked = false;
let lookPointerId = null;
let lastLookX = 0;
let lastLookY = 0;
let pointerObserver;
let lastUiToast = '';

const game = {
  screen: 'menu',
  wave: 0,
  waveTotal: 0,
  waveKills: 0,
  kills: 0,
  score: 0,
  elapsed: 0,
  health: 100,
  armor: 100,
  fragCount: 2,
  hitmarker: 0,
  damageTimer: 0,
  damageShake: 0,
  crouched: false,
  sprintToggled: false,
  aimToggled: false,
  lightOn: false,
  fireHeld: false,
  firePressed: false,
  mouseAim: false,
  joystickX: 0,
  joystickY: 0,
  nextFootstep: 0,
  nextEnemyId: 0,
  nextToast: '',
};
const keys = new Set();

function qualityKey() {
  const key = String(settings.quality || 'balanced').toLowerCase();
  return key === 'saver' ? 'saver' : key === 'high' ? 'cinematic' : 'balanced';
}
function hardwareScale() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const quality = String(settings.quality || 'balanced').toLowerCase();
  const allowance = quality === 'saver' ? 1.72 : quality === 'high' ? 1.12 : 1.4;
  return Math.min(2, Math.max(1, dpr / allowance));
}
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function randomBetween(min, max) { return min + Math.random() * (max - min); }
function profileSave() { saveProfile(); }

function requestPointerLock() {
  if (mobile || !canvas?.requestPointerLock) return;
  try {
    const result = canvas.requestPointerLock();
    if (result?.catch) result.catch(() => {});
  } catch { /* Pointer lock is optional; free look remains available. */ }
}
function releasePointerLock() {
  if (document.pointerLockElement === canvas && document.exitPointerLock) document.exitPointerLock();
}
function setScreen(next) {
  game.screen = next;
  ui?.setScreen(next);
  if (next !== 'playing') {
    game.fireHeld = false;
    game.firePressed = false;
    game.mouseAim = false;
    game.joystickX = 0;
    game.joystickY = 0;
    game.damageTimer = 0;
    damageFlash?.classList.remove('active');
    if (laserLine) laserLine.isVisible = false;
    lookPointerId = null;
    weaponSystem?.setVisible(false);
    releasePointerLock();
  } else {
    weaponSystem?.setVisible(true);
  }
}
function haptic(duration = 9) {
  if (mobile && settings.haptics && navigator.vibrate) navigator.vibrate(duration);
}
function announceToast(message) {
  if (!message) return;
  lastUiToast = message;
  ui?.showToast(message);
}

function clearEnemies() {
  for (const enemy of enemies) enemy.root.dispose(false, false);
  enemies = [];
}
function clearGrenades() {
  for (const grenade of grenades) grenade.mesh.dispose();
  grenades = [];
  for (const explosion of explosions) {
    explosion.mesh.dispose();
    explosion.ring.dispose();
    explosion.light.dispose();
  }
  explosions = [];
}
function resetWeaponInventory() {
  for (const state of weaponSystem.runtime) {
    state.mag = state.def.magazine;
    state.reserve = state.def.reserve;
    state.reload = null;
    state.lastShot = -Infinity;
  }
}

function spawnWave() {
  clearEnemies();
  game.wave += 1;
  const count = Math.min(6 + Math.floor((game.wave - 1) * .65), 11);
  const candidates = world.spawns.filter((spawn) => {
    const dx = spawn.x - camera.position.x;
    const dz = spawn.z - camera.position.z;
    return Math.hypot(dx, dz) > 9;
  });
  const pool = [...(candidates.length >= count ? candidates : world.spawns)];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  game.waveTotal = count;
  game.waveKills = 0;
  for (let i = 0; i < count; i++) {
    const spawn = pool[i % pool.length].clone();
    const enemy = createEnemy(scene, spawn, game.nextEnemyId++, enemyPalette, world.shadows);
    enemy.health = 100 + Math.min(30, Math.floor((game.wave - 1) * 4));
    enemies.push(enemy);
  }
  game.nextToast = `HOSTILE CELL  /  ${count} CONTACTS`;
  if (game.wave > 1) {
    const bonus = Math.min(24, game.wave * 4);
    for (const state of weaponSystem.runtime) state.reserve = Math.min(state.def.reserve * 2, state.reserve + bonus);
    game.armor = Math.min(100, game.armor + 16);
    game.health = Math.min(100, game.health + 12);
    game.fragCount = Math.min(3, game.fragCount + 1);
  }
  audio?.playWave();
  ui?.showBanner(`WAVE ${String(game.wave).padStart(2, '0')}`, `${count} HOSTILES  /  KEEP YOUR PLATE INTACT`, 2.0);
}

function startGame() {
  if (!engine || !scene) return;
  audio.start();
  clearEnemies();
  clearGrenades();
  resetWeaponInventory();
  game.wave = 0;
  game.waveTotal = 0;
  game.waveKills = 0;
  game.kills = 0;
  game.score = 0;
  game.elapsed = 0;
  game.health = 100;
  game.armor = 100;
  game.fragCount = 2;
  game.hitmarker = 0;
  game.damageTimer = 0;
  game.damageShake = 0;
  game.crouched = false;
  game.sprintToggled = false;
  game.aimToggled = false;
  game.lightOn = false;
  game.nextFootstep = 0;
  game.waveBreak = 0;
  game.aiming = false;
  game.sprinting = false;
  game.nextToast = '';
  keys.clear();
  game.joystickX = 0;
  game.joystickY = 0;
  camera.position.set(0, 1.66, -18);
  game.yaw = 0;
  game.pitch = 0;
  camera.rotation.set(0, 0, 0);
  weaponSystem.equip(weaponSystem.currentIndex);
  weaponSystem.setVisible(true);
  setScreen('playing');
  spawnWave();
  ui?.setTouchState({});
  requestPointerLock();
  canvas.focus?.({ preventScroll: true });
}

function pauseGame() {
  if (game.screen !== 'playing') return;
  setScreen('pause');
}
function resumeGame() {
  if (game.screen !== 'pause') return;
  setScreen('playing');
  requestPointerLock();
}
function returnToMenu() {
  clearEnemies();
  clearGrenades();
  game.crouched = false;
  game.sprintToggled = false;
  game.aimToggled = false;
  game.lightOn = false;
  if (weaponLight) weaponLight.intensity = 0;
  setScreen('menu');
}

function toggleSprint() {
  game.sprintToggled = !game.sprintToggled;
  if (game.sprintToggled) game.crouched = false;
  audio?.playClick();
  ui?.setTouchState({ sprinting: game.sprintToggled, crouched: game.crouched, aiming: game.aimToggled, lightOn: game.lightOn });
}
function toggleCrouch() {
  game.crouched = !game.crouched;
  if (game.crouched) game.sprintToggled = false;
  audio?.playClick();
  ui?.setTouchState({ sprinting: game.sprintToggled, crouched: game.crouched, aiming: game.aimToggled, lightOn: game.lightOn });
}
function toggleAim() {
  game.aimToggled = !game.aimToggled;
  if (game.aimToggled) game.sprintToggled = false;
  audio?.playClick();
  ui?.setTouchState({ sprinting: game.sprintToggled, crouched: game.crouched, aiming: game.aimToggled, lightOn: game.lightOn });
}
function toggleLight() {
  game.lightOn = !game.lightOn;
  audio?.playClick();
  ui?.setTouchState({ sprinting: game.sprintToggled, crouched: game.crouched, aiming: game.aimToggled, lightOn: game.lightOn });
}

function startReload() {
  if (game.screen !== 'playing') return;
  const state = weaponSystem.current;
  const def = state.def;
  if (state.reload || state.mag >= def.magazine || state.reserve <= 0) {
    if (state.reserve <= 0 && state.mag < def.magazine) announceToast('NO RESERVE AMMUNITION');
    return;
  }
  if (def.kind === 'shotgun') {
    state.reload = { elapsed: 0, nextShellAt: .32 };
    audio.playReload('pump');
  } else {
    state.reload = { elapsed: 0, duration: def.reload };
    audio.playReload('mag-out');
  }
}
function updateReloads(dt) {
  for (const state of weaponSystem.runtime) {
    if (!state.reload) continue;
    const def = state.def;
    if (def.kind === 'shotgun') {
      state.reload.elapsed += dt;
      if (state.reload.elapsed >= state.reload.nextShellAt) {
        if (state.mag < def.magazine && state.reserve > 0) {
          state.mag += 1;
          state.reserve -= 1;
          audio.playReload('shell');
          haptic(5);
        }
        state.reload.nextShellAt += def.reload;
        if (state.mag >= def.magazine || state.reserve <= 0) {
          state.reload = null;
          audio.playReload('pump');
        }
      }
    } else {
      state.reload.elapsed += dt;
      if (state.reload.elapsed >= state.reload.duration) {
        const transfer = Math.min(def.magazine - state.mag, state.reserve);
        state.mag += transfer;
        state.reserve -= transfer;
        state.reload = null;
        audio.playReload('mag-in');
        haptic(8);
      }
    }
  }
}

function makeShotDirection(spread) {
  const direction = camera.getDirection(new Vector3(0, 0, 1)).normalize();
  const right = camera.getDirection(new Vector3(1, 0, 0)).normalize();
  const up = camera.getDirection(new Vector3(0, 1, 0)).normalize();
  direction.addInPlace(right.scale(randomBetween(-spread, spread)));
  direction.addInPlace(up.scale(randomBetween(-spread, spread)));
  return direction.normalize();
}

function hitEnemy(enemy, zone, damage) {
  if (!enemy?.alive) return false;
  const headshot = zone === 'head';
  enemy.health -= damage;
  enemy.flashTimer = .12;
  game.hitmarker = headshot ? .15 : .105;
  audio.playImpact(headshot);
  if (headshot) game.score += 60;
  else game.score += 25;
  if (enemy.health <= 0) {
    destroyEnemy(enemy);
    game.kills += 1;
    game.waveKills += 1;
    game.score += 175;
    haptic(13);
    if (enemies.every((entry) => !entry.alive)) {
      game.waveBreak = 3.2;
      game.nextToast = 'SECTOR CLEAR  /  RELOAD AND REPOSITION';
      ui.showBanner('WAVE SECURED', 'SECTOR CLEAR  /  RELOAD AND REPOSITION', 2.4);
    }
  }
  return true;
}

function shoot() {
  const state = weaponSystem.current;
  const def = state.def;
  if (state.reload) {
    if (def.kind === 'shotgun' && state.mag > 0) {
      state.reload = null;
      audio.playReload('pump');
    } else return;
  }
  if (state.mag <= 0) {
    audio.playDry();
    if (state.reserve > 0) startReload();
    else announceToast('MAGAZINE EMPTY  /  NO RESERVE');
    game.firePressed = false;
    return;
  }
  const secondsPerShot = 60 / def.rpm;
  if (game.elapsed - state.lastShot < secondsPerShot) return;
  state.lastShot = game.elapsed;
  state.mag -= 1;
  const moving = Math.abs(game.joystickX) + Math.abs(game.joystickY) > .2 || keys.has('KeyW') || keys.has('KeyA') || keys.has('KeyS') || keys.has('KeyD');
  const sprinting = (keys.has('ShiftLeft') || keys.has('ShiftRight') || game.sprintToggled) && moving && !game.crouched && !game.aiming;
  const attachment = attachmentsByWeapon[def.id] || DEFAULT_ATTACHMENTS;
  const suppressed = attachment.muzzle === 'suppressor';
  const gripSpread = attachment.grip === 'vertical' ? .88 : attachment.grip === 'none' ? 1.08 : 1;
  const baseSpread = def.spread * (game.aiming ? .38 : 1) * (moving ? 1.33 : 1) * (sprinting ? 1.62 : 1) * (game.crouched ? .78 : 1) * gripSpread;
  const recoilScale = (attachment.muzzle === 'compensator' ? .72 : 1) * (attachment.grip === 'vertical' ? .88 : 1);
  const pelletCount = def.pellets || 1;
  const originDirection = camera.getDirection(new Vector3(0, 0, 1)).normalize();
  const origin = camera.position.add(originDirection.scale(.28));
  const effectiveRange = def.range * (suppressed ? .92 : 1);
  const damageScale = suppressed ? .95 : 1;
  let anyHit = false;
  for (let i = 0; i < pelletCount; i++) {
    const direction = makeShotDirection(baseSpread * (def.pellets ? 1.35 : 1));
    const ray = new Ray(origin, direction, effectiveRange);
    const pick = scene.pickWithRay(ray, (mesh) => {
      const metadata = mesh.metadata;
      return mesh.isPickable && Boolean(metadata?.blocksShots || (metadata?.enemyRef?.alive));
    });
    if (!pick?.hit || !pick.pickedMesh) continue;
    const metadata = pick.pickedMesh.metadata;
    const enemy = metadata?.enemyRef;
    if (!enemy?.alive) continue;
    const distance = pick.distance || Vector3.Distance(origin, pick.pickedPoint || enemy.root.position);
    const falloff = Math.max(.48, 1 - (distance / effectiveRange) * .44);
    const zone = metadata.hitZone || 'body';
    const damage = (zone === 'head' ? def.headDamage : def.damage) * falloff * damageScale;
    if (hitEnemy(enemy, zone, damage)) anyHit = true;
  }
  weaponSystem.fireVisual(recoilScale);
  audio.playShot(def.sound, { suppressed, player: true });
  if (anyHit) game.hitmarker = Math.max(game.hitmarker, .14);
  haptic(4);
  if (def.kind === 'bolt') announceToast('BOLT ACTION  /  CYCLE READY');
  game.firePressed = false;
}

function throwGrenade() {
  if (game.screen !== 'playing') return;
  if (game.fragCount <= 0) {
    audio.playDry();
    announceToast('NO FRAG GRENADES');
    return;
  }
  game.fragCount -= 1;
  const forward = camera.getDirection(new Vector3(0, 0, 1)).normalize();
  const material = grenadeMaterial;
  const mesh = MeshBuilder.CreateSphere('M67 training frag', { diameter: .16, segments: 8 }, scene);
  mesh.position.copyFrom(camera.position.add(forward.scale(.62)).add(new Vector3(0, -.13, 0)));
  mesh.material = material;
  mesh.isPickable = false;
  mesh.checkCollisions = false;
  const velocity = forward.scale(13.6).add(new Vector3(0, 3.6, 0));
  grenades.push({ mesh, velocity, fuse: 2.05, age: 0, bounce: 0 });
  audio.playReload('click');
  haptic(11);
  announceToast(`FRAG OUT  /  ${game.fragCount} REMAINING`);
}

function createExplosion(position) {
  const mesh = MeshBuilder.CreateSphere('grenade blast bloom', { diameter: 1, segments: 12 }, scene);
  mesh.position.copyFrom(position);
  mesh.material = explosionMaterial;
  mesh.isPickable = false;
  mesh.checkCollisions = false;
  const ring = MeshBuilder.CreateTorus('grenade shock ring', { diameter: 1, thickness: .07, tessellation: 24 }, scene);
  ring.position.copyFrom(position);
  ring.position.y = Math.max(.12, position.y);
  ring.rotation.x = Math.PI / 2;
  ring.material = explosionMaterial;
  ring.isPickable = false;
  ring.checkCollisions = false;
  const light = new SpotLight(`blast flash ${explosions.length}`, position.clone(), new Vector3(0, -1, 0), Math.PI / 2, 2, scene);
  light.diffuse = new Color3(1, .56, .25);
  light.intensity = 24;
  light.range = 10;
  explosions.push({ mesh, ring, light, age: 0 });
  audio.playExplosion();
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const target = enemy.root.position.add(new Vector3(0, 1.1, 0));
    const distance = Vector3.Distance(position, target);
    if (distance > 5.2) continue;
    const rayDirection = target.subtract(position).normalize();
    const obstruction = scene.pickWithRay(new Ray(position, rayDirection, distance), (candidate) => candidate.metadata?.staticWorld && candidate.metadata?.blocksShots);
    if (obstruction?.hit && obstruction.distance < distance - .4) continue;
    const amount = 180 * Math.max(.1, 1 - distance / 6);
    hitEnemy(enemy, distance < 2.5 ? 'head' : 'body', amount);
  }
  const playerDistance = Vector3.Distance(position, camera.position);
  if (playerDistance < 3) damagePlayer((1 - playerDistance / 3) * 20);
}

function updateGrenades(dt) {
  for (let i = grenades.length - 1; i >= 0; i--) {
    const grenade = grenades[i];
    grenade.age += dt;
    grenade.fuse -= dt;
    grenade.velocity.y -= 9.3 * dt;
    const previous = grenade.mesh.position.clone();
    grenade.mesh.position.addInPlace(grenade.velocity.scale(dt));
    if (grenade.mesh.position.y < .13) {
      grenade.mesh.position.y = .13;
      grenade.velocity.y = Math.abs(grenade.velocity.y) * .45;
      grenade.velocity.x *= .74;
      grenade.velocity.z *= .74;
      grenade.bounce += 1;
    }
    if (collides(grenade.mesh.position.x, grenade.mesh.position.z, .13)) {
      grenade.mesh.position.x = previous.x;
      grenade.mesh.position.z = previous.z;
      grenade.velocity.x *= -.38;
      grenade.velocity.z *= -.38;
    }
    grenade.mesh.rotation.x += dt * 7;
    grenade.mesh.rotation.z += dt * 5;
    if (grenade.fuse <= 0) {
      const position = grenade.mesh.position.clone();
      grenade.mesh.dispose();
      grenades.splice(i, 1);
      createExplosion(position);
    }
  }
  for (let i = explosions.length - 1; i >= 0; i--) {
    const fx = explosions[i];
    fx.age += dt;
    const t = Math.min(1, fx.age / .62);
    const radius = .7 + t * 6;
    fx.mesh.scaling.setAll(radius);
    fx.mesh.visibility = Math.max(0, 1 - t);
    fx.ring.scaling.setAll(radius * 1.25);
    fx.ring.visibility = Math.max(0, 1 - t);
    fx.light.intensity = Math.max(0, 24 * (1 - t * 2.5));
    if (fx.age >= .68) {
      fx.mesh.dispose(); fx.ring.dispose(); fx.light.dispose();
      explosions.splice(i, 1);
    }
  }
}

function damagePlayer(amount) {
  if (game.screen !== 'playing' || amount <= 0) return;
  const armourLoss = Math.min(game.armor, amount * .82);
  game.armor = Math.max(0, game.armor - armourLoss);
  game.health = Math.max(0, game.health - (game.armor > 0 ? amount * .42 : amount));
  game.damageTimer = .24;
  game.damageShake = .22;
  damageFlash?.classList.add('active');
  audio.playHurt();
  haptic(24);
  if (game.health <= 0) {
    game.screen = 'debrief';
    setScreen('debrief');
    game.fireHeld = false;
    game.nextToast = '';
  }
}

function collides(x, z, radius = .34) {
  for (const box of collisionBoxes) {
    if (box.maxY < .38) continue;
    const closestX = clamp(x, box.minX, box.maxX);
    const closestZ = clamp(z, box.minZ, box.maxZ);
    const dx = x - closestX;
    const dz = z - closestZ;
    if (dx * dx + dz * dz < radius * radius) return true;
  }
  return false;
}
function movePlayer(dx, dz) {
  const nextX = camera.position.x + dx;
  if (!collides(nextX, camera.position.z)) camera.position.x = nextX;
  const nextZ = camera.position.z + dz;
  if (!collides(camera.position.x, nextZ)) camera.position.z = nextZ;
}

function lineOfSightToPlayer(enemy, distance) {
  const matrix = enemy.root.computeWorldMatrix(true);
  const muzzle = Vector3.TransformCoordinates(enemy.muzzle, matrix);
  const destination = camera.position.clone();
  const direction = destination.subtract(muzzle).normalize();
  const blocking = scene.pickWithRay(new Ray(muzzle, direction, distance), (mesh) => mesh.metadata?.staticWorld && mesh.metadata?.blocksShots);
  return !blocking?.hit || blocking.distance >= distance - .35;
}

function enemyFire(enemy, distance, moving) {
  if (enemy.fireTimer > 0 || distance > 38 || !enemy.alive) return;
  enemy.fireTimer = randomBetween(1.45, 2.6) * Math.max(.72, 1 - game.wave * .025);
  if (!lineOfSightToPlayer(enemy, distance)) return;
  audio.playShot('smg', { player: false, distance });
  const baseAccuracy = clamp(.62 - distance * .011 + Math.min(.1, game.wave * .008), .16, .62);
  const chance = baseAccuracy * (moving ? .68 : 1) * (game.crouched ? .76 : 1) * (game.aiming ? 1.04 : 1);
  if (Math.random() < chance) {
    const amount = randomBetween(7.5, 11.5) * (1 + Math.min(.5, game.wave * .045));
    damagePlayer(amount);
  }
}

function updateLaser() {
  const def = weaponSystem.current.def;
  const attachment = attachmentsByWeapon[def.id] || DEFAULT_ATTACHMENTS;
  const shouldShow = attachment.grip === 'laser' && game.screen === 'playing';
  if (!shouldShow) {
    if (laserLine) laserLine.isVisible = false;
    return;
  }
  const direction = camera.getDirection(new Vector3(0, 0, 1)).normalize();
  const origin = camera.position.add(direction.scale(.38));
  const pick = scene.pickWithRay(new Ray(origin, direction, 45), (mesh) => mesh.isPickable && Boolean(mesh.metadata?.blocksShots || mesh.metadata?.enemyRef?.alive));
  const endpoint = pick?.hit && pick.pickedPoint ? pick.pickedPoint : origin.add(direction.scale(45));
  const points = [origin, endpoint];
  if (!laserLine) {
    laserLine = MeshBuilder.CreateLines('laser designator line', { points, updatable: true }, scene);
    laserLine.color = new Color3(.43, 1, .57);
    laserLine.alpha = .62;
    laserLine.isPickable = false;
    laserLine.alwaysSelectAsActiveMesh = true;
  } else {
    laserLine = MeshBuilder.CreateLines('laser designator line', { points, instance: laserLine });
    laserLine.isVisible = true;
  }
}

function updateGame(dt) {
  game.elapsed += dt;
  if (game.hitmarker > 0) game.hitmarker = Math.max(0, game.hitmarker - dt);
  if (game.damageTimer > 0) {
    game.damageTimer = Math.max(0, game.damageTimer - dt);
    if (game.damageTimer === 0) damageFlash?.classList.remove('active');
  }
  if (game.damageShake > 0) game.damageShake = Math.max(0, game.damageShake - dt);

  const yaw = game.yaw || 0;
  let moveX = game.joystickX + (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
  let moveY = game.joystickY + (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
  const moveLength = Math.hypot(moveX, moveY);
  if (moveLength > 1) { moveX /= moveLength; moveY /= moveLength; }
  const moving = Math.abs(moveX) + Math.abs(moveY) > .045;
  game.aiming = game.mouseAim || game.aimToggled;
  const sprintRequested = (keys.has('ShiftLeft') || keys.has('ShiftRight') || game.sprintToggled) && !game.crouched && !game.aiming;
  game.sprinting = sprintRequested && moving;
  const speed = game.crouched ? 2.2 : game.sprinting ? 6.7 : game.aiming ? 3.2 : 4.55;
  const forward = new Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const right = new Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const dx = (forward.x * moveY + right.x * moveX) * speed * dt;
  const dz = (forward.z * moveY + right.z * moveX) * speed * dt;
  movePlayer(dx, dz);

  const desiredEyeHeight = game.crouched ? 1.15 : 1.66;
  const bob = moving ? Math.sin(game.elapsed * (game.sprinting ? 15 : 10)) * (game.sprinting ? .046 : .023) : 0;
  camera.position.y += (desiredEyeHeight + bob - camera.position.y) * Math.min(1, dt * 12);
  const isMoving = Math.abs(dx) + Math.abs(dz) > .002;
  if (isMoving && game.elapsed >= game.nextFootstep) {
    audio.playFootstep(game.crouched, game.sprinting);
    game.nextFootstep = game.elapsed + (game.sprinting ? .29 : game.crouched ? .65 : .47);
  }

  const fovBase = FOV[settings.fov] || FOV.standard;
  const selectedAttachment = attachmentsByWeapon[weaponSystem.current.def.id] || DEFAULT_ATTACHMENTS;
  const aimZoom = selectedAttachment.optic === '2x' ? .67 : selectedAttachment.optic === 'iron' ? .92 : .83;
  const targetFov = game.aiming ? fovBase * aimZoom : fovBase;
  camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 13);
  const recoilShake = game.damageShake > 0 ? Math.sin(game.elapsed * 67) * game.damageShake * .075 : 0;
  camera.rotation.x = (game.pitch || 0) + recoilShake;
  camera.rotation.y = yaw;
  camera.rotation.z = moving ? Math.sin(game.elapsed * 5) * .004 * (game.sprinting ? 2 : 1) : 0;

  if (game.lightOn) {
    weaponLight.position.copyFrom(camera.position);
    weaponLight.direction.copyFrom(camera.getDirection(new Vector3(0, 0, 1)).normalize());
    weaponLight.intensity = 23;
  } else weaponLight.intensity = 0;

  updateReloads(dt);
  const weaponPose = weaponSystem.update(dt, {
    aiming: game.aiming,
    sprinting: game.sprinting,
    moving,
    crouched: game.crouched,
    reloading: Boolean(weaponSystem.current.reload),
    lightOn: game.lightOn,
  });
  if (game.fireHeld && (weaponSystem.current.def.mode === 'AUTO' || game.firePressed)) shoot();
  updateGrenades(dt);

  for (const enemy of enemies) {
    if (game.screen !== 'playing') break;
    updateEnemyPose(enemy, dt, camera.position, game.elapsed, game.crouched);
    if (!enemy.alive) continue;
    const distance = Vector3.Distance(camera.position, enemy.root.position);
    enemyFire(enemy, distance, isMoving);
  }

  if (game.waveBreak > 0) {
    game.waveBreak -= dt;
    if (game.waveBreak <= 0 && game.screen === 'playing') {
      game.waveBreak = 0;
      spawnWave();
    }
  }
  updateLaser();
  const uiState = {
    screen: game.screen,
    elapsed: game.elapsed,
    wave: game.wave,
    waveTotal: game.waveTotal,
    waveKills: game.waveKills,
    kills: game.kills,
    score: game.score,
    health: game.health,
    armor: game.armor,
    grenades: game.fragCount,
    hitmarker: game.hitmarker,
    weapon: weaponSystem.current.def,
    mag: weaponSystem.current.mag,
    reserve: weaponSystem.current.reserve,
    reloading: Boolean(weaponSystem.current.reload),
    reloadHint: weaponSystem.current.reload ? 'RELOADING' : `FRAG × ${game.fragCount}`,
    aiming: game.aiming,
    sprinting: game.sprinting,
    moving,
    recoil: weaponPose?.kick || 0,
    objective: 'Clear the hostile cell.',
    objectiveSub: 'Confirm targets · stay operational',
  };
  if (game.screen === 'debrief') uiState.kills = game.kills;
  hudClock += dt;
  if (hudClock > .075) {
    ui.update(uiState, hudClock);
    hudClock = 0;
    ui.setTouchState({ sprinting: game.sprintToggled || keys.has('ShiftLeft') || keys.has('ShiftRight'), crouched: game.crouched, aiming: game.aiming, lightOn: game.lightOn });
    if (game.nextToast && game.nextToast !== lastUiToast) announceToast(game.nextToast);
    game.nextToast = '';
  }
}

function setSetting(key, value) {
  settings[key] = value;
  profileSave();
  if (key === 'quality') {
    engine.setHardwareScalingLevel(hardwareScale());
  }
  if (key === 'fov') camera.fov = FOV[value] || FOV.standard;
  if (key === 'haptics' && !value && navigator.vibrate) navigator.vibrate(0);
}
function applySettings() {
  engine.setHardwareScalingLevel(hardwareScale());
  camera.fov = FOV[settings.fov] || FOV.standard;
  profileSave();
  announceToast('FIELD PROFILE SAVED');
}
function setAttachment(weaponId, key, value) {
  attachmentsByWeapon[weaponId] ||= { ...DEFAULT_ATTACHMENTS };
  attachmentsByWeapon[weaponId][key] = value;
  const index = WEAPON_DEFS.findIndex((def) => def.id === weaponId);
  if (index >= 0) weaponSystem.configure(index, attachmentsByWeapon[weaponId]);
  profileSave();
}
function selectWeapon(index) {
  weaponSystem.equip(index);
  game.fireHeld = false;
  game.firePressed = false;
  const def = weaponSystem.current.def;
  announceToast(`${def.short}  /  ${def.role}`);
  audio.playClick();
}
function cycleWeapon(direction = 1) {
  const count = weaponSystem.runtime.length;
  selectWeapon((weaponSystem.currentIndex + direction + count) % count);
}

const actions = {
  startGame,
  resumeGame,
  toMenu: returnToMenu,
  pause: pauseGame,
  reload: startReload,
  swapWeapon: () => cycleWeapon(1),
  throwGrenade,
  toggleSprint,
  toggleCrouch,
  toggleAim,
  toggleLight,
  fireDown: () => { game.fireHeld = true; game.firePressed = true; },
  fireUp: () => { game.fireHeld = false; game.firePressed = false; },
  joystickStart: () => {},
  joystickMove: (x, y) => { game.joystickX = x; game.joystickY = y; },
  joystickEnd: () => { game.joystickX = 0; game.joystickY = 0; },
  setSetting,
  applySettings,
  setAttachment,
  equipWeapon: selectWeapon,
  getWeaponIndex: () => weaponSystem?.currentIndex ?? 0,
};

function setupPointerInput() {
  const mask = PointerEventTypes.POINTERDOWN | PointerEventTypes.POINTERUP | PointerEventTypes.POINTERMOVE;
  pointerObserver = scene.onPrePointerObservable.add((info) => {
    if (info.skipOnPointerObservable || game.screen !== 'playing') return;
    const event = info.event;
    if (!event) return;
    const pointerId = event.pointerId ?? 1;
    const isTouchPointer = mobile && (event.pointerType === 'touch' || event.pointerType === 'pen');
    if (info.type === PointerEventTypes.POINTERDOWN) {
      if (isTouchPointer) {
        lookPointerId = pointerId;
        lastLookX = event.clientX;
        lastLookY = event.clientY;
        return;
      }
      if (event.button === 0) {
        if (!desktopPointerLocked) {
          lookPointerId = pointerId;
          lastLookX = event.clientX;
          lastLookY = event.clientY;
          requestPointerLock();
        }
        game.fireHeld = true;
        game.firePressed = true;
      } else if (event.button === 2) {
        game.mouseAim = true;
        if (!desktopPointerLocked) {
          lookPointerId = pointerId;
          lastLookX = event.clientX;
          lastLookY = event.clientY;
        }
      }
    } else if (info.type === PointerEventTypes.POINTERMOVE) {
      let dx = 0;
      let dy = 0;
      if (desktopPointerLocked && !isTouchPointer) {
        dx = event.movementX || 0;
        dy = event.movementY || 0;
      } else if (lookPointerId === pointerId) {
        dx = event.clientX - lastLookX;
        dy = event.clientY - lastLookY;
        lastLookX = event.clientX;
        lastLookY = event.clientY;
      }
      if (dx || dy) {
        const settingFactor = (SENSITIVITY[settings.sensitivity] || SENSITIVITY.standard) / SENSITIVITY.standard;
        const factor = (isTouchPointer || mobile ? .0042 : .0021) * settingFactor;
        game.yaw = (game.yaw || 0) + dx * factor;
        const pitchDelta = dy * factor * (settings.invertY ? -1 : 1);
        game.pitch = clamp((game.pitch || 0) + pitchDelta, -.94, .9);
        weaponSystem.addSway(dx, dy);
      }
    } else if (info.type === PointerEventTypes.POINTERUP) {
      if (lookPointerId === pointerId) lookPointerId = null;
      if (!isTouchPointer && event.button === 0) { game.fireHeld = false; game.firePressed = false; }
      if (!isTouchPointer && event.button === 2) game.mouseAim = false;
    }
  }, mask);

  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  document.addEventListener('pointerlockchange', () => {
    desktopPointerLocked = document.pointerLockElement === canvas;
    if (!desktopPointerLocked && !mobile && game.screen === 'playing') pauseGame();
  });
  window.addEventListener('blur', () => {
    keys.clear();
    game.fireHeld = false;
    game.firePressed = false;
    game.mouseAim = false;
    game.joystickX = 0;
    game.joystickY = 0;
    if (!mobile && game.screen === 'playing') pauseGame();
  });
  window.addEventListener('wheel', (event) => {
    if (game.screen === 'playing' && !mobile) cycleWeapon(event.deltaY > 0 ? 1 : -1);
  }, { passive: true });
}

function setupKeyboardInput() {
  const handled = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', 'KeyC', 'KeyR', 'KeyQ', 'KeyF', 'Escape', 'KeyP', 'Tab', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8']);
  window.addEventListener('keydown', (event) => {
    if (handled.has(event.code)) event.preventDefault();
    if (event.repeat && ['Escape', 'KeyP', 'KeyC', 'KeyR', 'KeyQ', 'KeyF', 'Tab'].includes(event.code)) return;
    if (event.code === 'Escape') {
      if (ui.activeLayer === 'armory' || ui.activeLayer === 'settings') ui.closeSub();
      else if (game.screen === 'playing') pauseGame();
      else if (game.screen === 'pause') resumeGame();
      return;
    }
    if (event.code === 'KeyP') { game.screen === 'playing' ? pauseGame() : game.screen === 'pause' ? resumeGame() : null; return; }
    if (game.screen !== 'playing') return;
    keys.add(event.code);
    if (event.code === 'KeyC') toggleCrouch();
    else if (event.code === 'KeyR') startReload();
    else if (event.code === 'KeyQ') throwGrenade();
    else if (event.code === 'KeyF') toggleLight();
    else if (event.code === 'Tab') { pauseGame(); ui.openArmory('pause'); }
    else if (/^Digit[1-8]$/.test(event.code)) selectWeapon(Number(event.code.slice(-1)) - 1);
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') game.sprintToggled = false;
  });
}

function createMaterials(sceneRef) {
  const grenade = new PBRMaterial('frag | olive polymer', sceneRef);
  grenade.albedoColor = Color3.FromHexString('#596b4e');
  grenade.roughness = .7;
  grenade.metallic = .18;
  grenadeMaterial = grenade;

  const blast = new StandardMaterial('blast bloom | amber', sceneRef);
  blast.diffuseColor = new Color3(1, .42, .16);
  blast.emissiveColor = new Color3(1, .35, .08);
  blast.alpha = .78;
  blast.disableDepthWrite = true;
  explosionMaterial = blast;
}

function updateCollisionCache() {
  collisionBoxes = world.occluders.map((mesh) => {
    mesh.computeWorldMatrix(true);
    const bounds = mesh.getBoundingInfo().boundingBox;
    return {
      minX: bounds.minimumWorld.x,
      maxX: bounds.maximumWorld.x,
      minY: bounds.minimumWorld.y,
      maxY: bounds.maximumWorld.y,
      minZ: bounds.minimumWorld.z,
      maxZ: bounds.maximumWorld.z,
    };
  });
}

function boot() {
  try {
    if (!canvas) throw new Error('Game canvas is missing.');
    const caps = Engine.IsSupported();
    if (!caps) throw new Error('WebGL is unavailable in this browser.');
    engine = new Engine(canvas, true, {
      preserveDrawingBuffer: false,
      stencil: true,
      adaptToDeviceRatio: true,
      powerPreference: 'high-performance',
      antialias: !mobile,
    });
    engine.setHardwareScalingLevel(hardwareScale());
    engine.setSize(window.innerWidth, window.innerHeight);
    scene = new Scene(engine);
    scene.skipPointerMovePicking = true;
    scene.autoClear = true;
    scene.autoClearDepthAndStencil = true;
    scene.imageProcessingConfiguration.applyByPostProcess = true;
    world = createWorld(scene, { mobile, quality: qualityKey() });
    camera = new UniversalCamera('operator bodycam', new Vector3(0, 1.66, -18), scene);
    camera.minZ = .045;
    camera.maxZ = 115;
    camera.fov = FOV[settings.fov] || FOV.standard;
    camera.inertia = 0;
    camera.speed = 0;
    camera.rotation.set(0, 0, 0);
    camera.inputs.clear();
    camera.layerMask = 0x0fffffff;
    scene.activeCamera = camera;
    scene.gravity.set(0, -9.81, 0);
    scene.collisionsEnabled = false;
    enemyPalette = createEnemyPalette(scene);
    audio = new AudioDirector();
    weaponSystem = createWeaponSystem(scene, camera, attachmentsByWeapon);
    weaponSystem.equip(0);
    createMaterials(scene);
    weaponLight = new SpotLight('operator weapon light', camera.position.clone(), new Vector3(0, 0, 1), Math.PI / 3.5, 5, scene);
    weaponLight.diffuse = new Color3(.84, .93, .78);
    weaponLight.specular = new Color3(.72, .84, .74);
    weaponLight.range = 23;
    weaponLight.intensity = 0;
    weaponLight.parent = null;
    updateCollisionCache();
    ui = createInterface(scene, actions, { mobile, settings, attachmentsByWeapon });
    ui.setScreen('menu');
    setupPointerInput();
    setupKeyboardInput();
    window.addEventListener('resize', () => engine.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && game.screen === 'playing') pauseGame();
    });
    scene.executeWhenReady(() => {
      bootOverlay?.classList.add('fade-out');
      setTimeout(() => bootOverlay?.remove(), 520);
    });
    engine.runRenderLoop(() => {
      const dt = Math.min(.05, engine.getDeltaTime() / 1000);
      const now = performance.now() / 1000;
      if (game.screen === 'playing') updateGame(dt);
      else {
        if (game.screen === 'menu') {
          const t = now * .05;
          camera.rotation.y = Math.sin(t) * .025;
          camera.rotation.x = Math.sin(t * .73) * .008;
        }
        const screenState = {
          screen: game.screen,
          elapsed: game.elapsed,
          wave: game.wave,
          kills: game.kills,
          score: game.score,
          health: game.health,
          armor: game.armor,
          hitmarker: 0,
        };
        hudClock += dt;
        if (hudClock > .12) { ui.update(screenState, hudClock); hudClock = 0; }
      }
      scene.render();
    });
  } catch (error) {
    console.error('MAX-FPS could not initialize.', error);
    bootOverlay?.classList.add('fade-out');
    fatalError?.classList.remove('hidden');
  }
}

boot();
