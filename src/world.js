import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { PointLight } from '@babylonjs/core/Lights/pointLight.js';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import '@babylonjs/core/Meshes/instancedMesh.js';

function seededRandom(seed = 1) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function noiseTexture(scene, name, base, accent, seed, repeat = 1, size = 256) {
  const texture = new DynamicTexture(name, { width: size, height: size }, scene, false, Texture.TRILINEAR_SAMPLINGMODE);
  const context = texture.getContext();
  const random = seededRandom(seed);
  context.fillStyle = base;
  context.fillRect(0, 0, size, size);
  for (let i = 0; i < 5600; i++) {
    const alpha = .025 + random() * .105;
    const s = .4 + random() * 2.4;
    context.fillStyle = random() > .52 ? `rgba(232,237,223,${alpha})` : `rgba(4,9,8,${alpha * 1.5})`;
    context.fillRect(random() * size, random() * size, s, s);
  }
  for (let i = 0; i < 22; i++) {
    const x = random() * size;
    const y = random() * size;
    const w = 12 + random() * 70;
    const gradient = context.createLinearGradient(x, y, x + w, y + 30);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(.52, accent);
    gradient.addColorStop(1, 'transparent');
    context.fillStyle = gradient;
    context.fillRect(x, y, w, 18 + random() * 58);
  }
  texture.update(false);
  texture.wrapU = Texture.WRAP_ADDRESSMODE;
  texture.wrapV = Texture.WRAP_ADDRESSMODE;
  texture.uScale = repeat;
  texture.vScale = repeat;
  texture.anisotropicFilteringLevel = 4;
  return texture;
}

function makeMaterial(scene, name, color, roughness = .82, metallic = 0, texture = null) {
  const material = new PBRMaterial(name, scene);
  material.albedoColor = Color3.FromHexString(color);
  material.roughness = roughness;
  material.metallic = metallic;
  material.directIntensity = 1.05;
  material.environmentIntensity = .28;
  if (texture) material.albedoTexture = texture;
  return material;
}

export function createWorld(scene, { mobile = false, quality = 'balanced' } = {}) {
  scene.clearColor = new Color4(.035, .049, .046, 1);
  scene.fogMode = 2;
  scene.fogColor = new Color3(.08, .11, .1);
  scene.fogDensity = .011;
  scene.collisionsEnabled = true;
  scene.gravity = new Vector3(0, -9.81, 0);
  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.toneMappingType = 1;
  scene.imageProcessingConfiguration.exposure = 1.16;
  scene.imageProcessingConfiguration.contrast = 1.17;

  const hemi = new HemisphericLight('soft warehouse bounce', new Vector3(0, 1, 0), scene);
  hemi.intensity = 1.05;
  hemi.groundColor = new Color3(.12, .15, .14);
  hemi.diffuse = new Color3(.72, .8, .74);

  const sun = new DirectionalLight('high loading-bay spill', new Vector3(.28, -1, -.2), scene);
  sun.position.set(-10, 17, -8);
  sun.intensity = 1.75;
  sun.diffuse = new Color3(.83, .88, .8);

  let shadows = null;
  if (quality !== 'saver') {
    shadows = new ShadowGenerator(mobile ? 512 : quality === 'cinematic' ? 1536 : 1024, sun);
    shadows.usePercentageCloserFiltering = true;
    shadows.filteringQuality = mobile ? ShadowGenerator.QUALITY_LOW : ShadowGenerator.QUALITY_MEDIUM;
    shadows.bias = .00045;
    shadows.normalBias = .035;
    shadows.darkness = .3;
    shadows.transparencyShadow = true;
  }

  const lamps = [];
  const lampPositions = mobile
    ? [[0, 6.35, 0]]
    : [[-10, 6.25, -9], [0, 6.25, 4], [11, 6.25, 13]];
  lampPositions.forEach(([x, y, z], index) => {
    const light = new PointLight(`overhead sodium ${index + 1}`, new Vector3(x, y, z), scene);
    light.intensity = mobile ? 17 : 22;
    light.range = 22;
    light.diffuse = index === 0 ? new Color3(.78, .86, .72) : new Color3(.9, .72, .5);
    lamps.push(light);
  });

  const floorTex = noiseTexture(scene, 'sealed concrete albedo', '#383d39', 'rgba(165,150,121,.5)', 71, 13);
  const wallTex = noiseTexture(scene, 'aged plaster albedo', '#676e67', 'rgba(100,88,71,.42)', 43, 9);
  const metalTex = noiseTexture(scene, 'painted steel albedo', '#37423d', 'rgba(138,86,48,.68)', 22, 5);
  const asphalt = makeMaterial(scene, 'floor | rough concrete', '#adb2a8', .95, .02, floorTex);
  const concrete = makeMaterial(scene, 'walls | chipped concrete', '#b5b8ae', .92, .01, wallTex);
  const steel = makeMaterial(scene, 'steel | worn olive paint', '#c0c5b8', .56, .38, metalTex);
  const darkSteel = makeMaterial(scene, 'dark structural steel', '#303936', .59, .58);
  const blackRubber = makeMaterial(scene, 'black rubber', '#171e1b', .94, .02);
  const ochre = makeMaterial(scene, 'old safety paint', '#b2a04a', .73, .1);
  const olive = makeMaterial(scene, 'container | forest green', '#57695b', .84, .17, metalTex);
  const sand = makeMaterial(scene, 'container | faded sand', '#81775c', .84, .14, metalTex);
  const blue = makeMaterial(scene, 'container | oxidized blue', '#485b5c', .82, .2, metalTex);
  const emissive = new StandardMaterial('fluorescent glass', scene);
  emissive.diffuseColor = new Color3(.74, .84, .72);
  emissive.emissiveColor = new Color3(.65, .88, .61);
  emissive.specularColor = Color3.Black();
  const warmEmissive = new StandardMaterial('amber warning glow', scene);
  warmEmissive.diffuseColor = new Color3(.86, .52, .23);
  warmEmissive.emissiveColor = new Color3(1, .38, .12);
  warmEmissive.specularColor = Color3.Black();
  const glass = new StandardMaterial('dirty reinforced glass', scene);
  glass.diffuseColor = new Color3(.14, .24, .23);
  glass.emissiveColor = new Color3(.025, .06, .055);
  glass.alpha = .8;
  glass.specularColor = new Color3(.28, .34, .31);

  const materialCache = new Map();
  for (const material of [asphalt, concrete, steel, darkSteel, blackRubber, ochre, olive, sand, blue, emissive, warmEmissive, glass]) {
    materialCache.set(material.name, material);
  }
  const occluders = [];
  const shadowCasters = [];
  const staticMeshes = [];
  const allMaterials = [asphalt, concrete, steel, darkSteel, blackRubber, ochre, olive, sand, blue, emissive, warmEmissive, glass];

  function addBox(name, x, y, z, width, height, depth, material, { solid = true, castShadow = false, receiveShadow = true, rotationY = 0 } = {}) {
    const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, scene);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotationY;
    mesh.material = material;
    mesh.checkCollisions = solid;
    mesh.isPickable = solid;
    mesh.metadata = { ...(mesh.metadata || {}), blocksShots: solid, staticWorld: true, mergeable: !solid && !castShadow };
    mesh.receiveShadows = receiveShadow;
    if (castShadow && shadows) {
      shadows.addShadowCaster(mesh, true);
      shadowCasters.push(mesh);
    }
    if (solid) occluders.push(mesh);
    staticMeshes.push(mesh);
    return mesh;
  }

  function addInstance(source, name, x, y, z, rotationY = 0, solid = false) {
    const instance = source.createInstance(name);
    instance.position.set(x, y, z);
    instance.rotation.y = rotationY;
    instance.checkCollisions = solid;
    instance.isPickable = solid;
    instance.metadata = { blocksShots: solid, staticWorld: true, mergeable: false };
    if (solid) occluders.push(instance);
    staticMeshes.push(instance);
    return instance;
  }

  // One textured slab and a clear central lane for readable encounters.
  addBox('continuous concrete floor', 0, -.18, 0, 49, .36, 49, asphalt, { castShadow: false });
  floorTex.uScale = floorTex.vScale = 13;

  // Exterior shell, with a service shutter at the long sight line.
  addBox('west boundary', -23.55, 4.1, 0, .9, 8.2, 48, concrete, { castShadow: true });
  addBox('east boundary', 23.55, 4.1, 0, .9, 8.2, 48, concrete, { castShadow: true });
  addBox('entry wall west', -16.3, 4.1, -23.55, 13.4, 8.2, .9, concrete, { castShadow: true });
  addBox('entry wall east', 16.3, 4.1, -23.55, 13.4, 8.2, .9, concrete, { castShadow: true });
  addBox('entry header', 0, 7.3, -23.55, 12.8, 1.8, .9, concrete, { castShadow: true });
  addBox('rear wall west', -16.3, 4.1, 23.55, 13.4, 8.2, .9, concrete, { castShadow: true });
  addBox('rear wall east', 16.3, 4.1, 23.55, 13.4, 8.2, .9, concrete, { castShadow: true });
  addBox('rear header', 0, 7.3, 23.55, 12.8, 1.8, .9, concrete, { castShadow: true });
  addBox('rear shutter', 0, 3.05, 23.05, 12.2, 6.1, .2, darkSteel, { castShadow: true });
  const shutterRib = MeshBuilder.CreateBox('shutter rib source', { width: 12.15, height: .045, depth: .12 }, scene);
  shutterRib.material = steel;
  shutterRib.position.set(0, .25, 23.15);
  shutterRib.checkCollisions = false;
  shutterRib.isPickable = false;
  for (let i = 1; i < 22; i++) addInstance(shutterRib, `shutter rib ${i}`, 0, .25 + i * .265, 23.15, 0, false);
  addBox('shutter top lip', 0, 6.18, 22.88, 12.7, .2, .38, ochre, { solid: false });
  addBox('shutter jamb west', -6.36, 3.05, 22.88, .22, 6.3, .38, ochre, { solid: false });
  addBox('shutter jamb east', 6.36, 3.05, 22.88, .22, 6.3, .38, ochre, { solid: false });

  // Roof structure reads as a real warehouse while leaving the view open overhead.
  for (let z = -20; z <= 20; z += 6.5) {
    addBox(`roof truss ${z}`, 0, 7.8, z, 46, .32, .42, darkSteel, { solid: false });
    addBox(`truss edge ${z}`, 0, 7.59, z - .07, 46, .055, .07, steel, { solid: false });
  }
  for (const side of [-1, 1]) {
    addBox('high cable trunk', side * 22.8, 6.52, 0, .18, .18, 46, darkSteel, { solid: false });
    for (let i = 0; i < 4; i++) {
      const z = -15 + i * 10;
      addBox('window recess', side * 23.04, 5.15, z, .12, 1.48, 5.85, darkSteel, { solid: false });
      addBox('smoked glass', side * 22.96, 5.15, z, .05, 1.24, 5.48, glass, { solid: false });
      for (const dz of [-2.8, 0, 2.8]) addBox('window mullion', side * 22.9, 5.15, z + dz, .12, 1.55, .09, steel, { solid: false });
      addBox('window sill', side * 22.9, 4.37, z, .13, .09, 6, steel, { solid: false });
      addBox('window lintel', side * 22.9, 5.93, z, .13, .09, 6, steel, { solid: false });
    }
  }

  // Support columns and chipped hazard paint.
  for (const x of [-10.3, 10.3]) {
    for (const z of [-14.2, 0, 14.2]) {
      addBox('structural support', x, 3.55, z, .62, 7.1, .62, darkSteel, { castShadow: true });
      addBox('column foot paint', x, .21, z, .9, .42, .9, ochre, { solid: true, castShadow: false });
      addBox('column cap', x, 7.12, z, .9, .2, .9, steel, { solid: false });
      addBox('column service tag', x + (x > 0 ? -.33 : .33), 4.1, z, .035, .72, .38, sand, { solid: false });
    }
  }

  // Four battered freight containers, modelled with instanced ribs instead of hundreds of unique meshes.
  function addContainer(name, x, z, width, depth, material) {
    addBox(`${name} hull`, x, 1.62, z, width, 3.24, depth, material, { castShadow: true });
    addBox(`${name} top rail`, x, 3.28, z, width + .12, .15, depth + .12, darkSteel, { solid: false });
    const rib = MeshBuilder.CreateBox(`${name} corrugation source`, { width: .045, height: 3.05, depth: .08 }, scene);
    rib.material = darkSteel;
    rib.position.set(x - width / 2 + .2, 1.62, z + depth / 2 + .045);
    rib.isPickable = false;
    rib.checkCollisions = false;
    for (let i = 1; i < Math.floor(width / .42); i++) {
      addInstance(rib, `${name} rib ${i}`, x - width / 2 + .2 + i * .42, 1.62, z + depth / 2 + .045, 0, false);
    }
    for (const edge of [-1, 1]) {
      addBox(`${name} corner post`, x + edge * (width / 2 - .09), 1.62, z + depth / 2 + .08, .17, 3.38, .16, steel, { solid: false });
    }
    addBox(`${name} ID plate`, x + width * .2, 2.65, z + depth / 2 + .095, width * .3, .24, .045, ochre, { solid: false });
  }
  addContainer('FOREST / 14', -15.1, 7.1, 5.6, 8.4, olive);
  addContainer('SAND / 22', 15.1, 6.6, 5.6, 9.1, sand);
  addContainer('OXIDE / 31', -15.1, -7.2, 5.5, 8.2, blue);
  addContainer('FOREST / 08', 15.1, -7.4, 5.7, 8.1, olive);

  // Jersey barriers form alternating cover positions without blocking the central lane.
  const barriers = [
    [-7.4, -9.2, 5.2, 1.15, .9], [7.4, -8.7, 4.8, 1.2, .9],
    [-7.7, 3, 4.3, 1.2, .9], [8, 4.1, 4.3, 1.2, .9],
    [-2.2, 8.8, 2.2, 1.12, .85], [3.1, -1.7, 2.3, 1.12, .85],
  ];
  barriers.forEach(([x, z, width, height, depth], i) => {
    addBox(`cast concrete barrier ${i + 1}`, x, height / 2, z, width, height, depth, concrete, { castShadow: true });
    addBox(`barrier safety stripe ${i + 1}`, x, .27, z + depth / 2 + .012, width * .58, .16, .035, i % 2 ? ochre : sand, { solid: false });
  });

  function addCrate(name, x, z, width, height, depth, material) {
    addBox(`${name} body`, x, height / 2, z, width, height, depth, material, { castShadow: true });
    addBox(`${name} strap front`, x, height / 2, z + depth / 2 + .025, .065, height * .88, .045, darkSteel, { solid: false });
    addBox(`${name} strap side`, x + width / 2 + .02, height / 2, z, .045, height * .88, .065, steel, { solid: false });
  }
  addCrate('case A', -5.8, -15.2, 2, 1.1, 1.2, steel);
  addCrate('case B', 5.9, -15.3, 1.9, 1.15, 1.3, darkSteel);
  addCrate('case C', -10.8, 10.5, 1.55, 1.25, 1.4, steel);
  addCrate('case D', 10.9, -1.8, 1.55, 1.18, 1.35, steel);
  addCrate('case E', 3.2, 13.8, 1.3, .85, 1.1, darkSteel);
  addCrate('case F', -3.8, -3.2, 1.35, .95, 1.1, darkSteel);

  const drumMat = makeMaterial(scene, 'drum | faded olive', '#5e6849', .66, .3, metalTex);
  for (const [x, z] of [[-11.7, -2.7], [11.8, -2.4], [-12.2, 16.1], [12.1, 15.3]]) {
    const drum = MeshBuilder.CreateCylinder('empty fuel drum', { diameter: .8, height: 1.18, tessellation: 12 }, scene);
    drum.position.set(x, .59, z);
    drum.material = drumMat;
    drum.checkCollisions = true;
    drum.isPickable = true;
    drum.metadata = { blocksShots: true, staticWorld: true };
    if (shadows) shadows.addShadowCaster(drum, true);
    occluders.push(drum);
    staticMeshes.push(drum);
    for (const y of [.15, 1.03]) {
      const rim = MeshBuilder.CreateTorus('drum rolled rim', { diameter: .82, thickness: .045, tessellation: 16 }, scene);
      rim.position.set(x, y, z);
      rim.material = darkSteel;
      rim.checkCollisions = false;
      rim.isPickable = false;
      rim.metadata = { blocksShots: false, staticWorld: true, mergeable: true };
      staticMeshes.push(rim);
    }
  }

  // Faded floor guides, drain slots and route marks.
  for (const x of [-18.5, 18.5]) addBox('yellow floor route', x, .009, 0, .11, .018, 43, ochre, { solid: false });
  for (let z = -18; z <= 18; z += 6) {
    addBox('linear floor drain', 0, .005, z, .12, .012, 3.8, blackRubber, { solid: false });
    for (const x of [-.28, -.1, .1, .28]) addBox('drain tooth', x, .015, z, .035, .012, 3.5, steel, { solid: false });
  }
  for (const side of [-1, 1]) {
    const x = side * 21.6;
    for (const z of [-12, 2, 15]) {
      addBox('wall breaker cabinet', x, 2.5, z, .28, 1.05, .8, darkSteel, { solid: false });
      addBox('cabinet warning card', x + side * .15, 2.58, z, .025, .16, .24, ochre, { solid: false });
      addBox('cable conduit', x, 1.8, z, .06, .55, .08, steel, { solid: false });
    }
  }

  // Practical emissive fixtures; lights themselves are intentionally sparse for mobile GPU budgets.
  for (let z = -16; z <= 16; z += 8) {
    for (const x of [-11.5, 0, 11.5]) {
      addBox('caged strip fixture', x, 7.02, z, 3.3, .13, .42, darkSteel, { solid: false });
      addBox('fluorescent lens', x, 6.92, z, 2.95, .035, .22, emissive, { solid: false });
    }
  }
  for (const [x, z] of [[-7, -16], [7, -16], [-8, 22.8], [8, 22.8]]) {
    addBox('amber safety beacon', x, 5.42, z, .34, .38, .26, warmEmissive, { solid: false });
  }
  // A glazed control-room face and silhouetted catwalk create a more authored composition.
  addBox('control room canopy', 0, 6.4, -20, 9.5, .28, .34, darkSteel, { solid: false });
  for (const x of [-4.5, -2.25, 0, 2.25, 4.5]) addBox('control room pane', x, 4.9, -21.25, 2.08, 2.2, .09, glass, { solid: false });
  addBox('control room fascia', 0, 6.07, -21.22, 9.65, .15, .16, steel, { solid: false });
  addBox('service door leaf', -22.92, 2.1, 0, .12, 4.2, 2.9, darkSteel, { castShadow: true });
  addBox('service door glass', -22.84, 2.95, 0, .04, .92, 1.05, glass, { solid: false });

  const spawns = [
    new Vector3(-11, 0, 13), new Vector3(-1.5, 0, 16.5), new Vector3(11, 0, 13), new Vector3(17, 0, -1),
    new Vector3(-17, 0, -1), new Vector3(-6.3, 0, 5), new Vector3(6.6, 0, 5), new Vector3(0, 0, 20),
    new Vector3(-12, 0, -14), new Vector3(12, 0, -14), new Vector3(-1.5, 0, -4), new Vector3(2, 0, 10),
  ];

  // Batch non-collidable dressing by material: preserve gameplay hitboxes, reduce mobile draw calls.
  const retainedMeshes = [];
  const mergeGroups = new Map();
  for (const mesh of staticMeshes) {
    if (!mesh.metadata?.mergeable || !mesh.material || mesh.getClassName() !== 'Mesh') {
      retainedMeshes.push(mesh);
      continue;
    }
    const key = `${mesh.material.uniqueId}:${mesh.receiveShadows ? 1 : 0}`;
    if (!mergeGroups.has(key)) mergeGroups.set(key, { material: mesh.material, receiveShadows: mesh.receiveShadows, meshes: [] });
    mergeGroups.get(key).meshes.push(mesh);
  }
  for (const { material, receiveShadows, meshes } of mergeGroups.values()) {
    if (meshes.length === 1) {
      retainedMeshes.push(meshes[0]);
      continue;
    }
    meshes.forEach((mesh) => mesh.computeWorldMatrix(true));
    const merged = Mesh.MergeMeshes(meshes, true, true, undefined, false, true);
    if (!merged) {
      retainedMeshes.push(...meshes);
      continue;
    }
    merged.name = `dressing batch | ${material.name}`;
    merged.material = material;
    merged.receiveShadows = receiveShadows;
    merged.isPickable = false;
    merged.checkCollisions = false;
    merged.metadata = { staticWorld: true, blocksShots: false, batchedDressing: true };
    merged.freezeWorldMatrix();
    retainedMeshes.push(merged);
  }
  staticMeshes.length = 0;
  staticMeshes.push(...retainedMeshes);
  return { occluders, staticMeshes, spawns, shadows, materials: materialCache, lampPositions };
}
