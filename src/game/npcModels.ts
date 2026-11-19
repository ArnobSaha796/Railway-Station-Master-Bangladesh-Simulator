import * as THREE from 'three';
import { createContactShadowTexture } from './textures';
import type { NpcRole } from './types';

export type NpcAnimationPose =
  | 'walking'
  | 'running'
  | 'standing'
  | 'sitting'
  | 'talking'
  | 'looking_around'
  | 'carrying_luggage'
  | 'buying'
  | 'selling'
  | 'stumbling'
  | 'boarding'
  | 'patrolling'
  | 'investigating'
  | 'chasing'
  | 'sneaking'
  | 'panicking'
  | 'reassuring';

export interface NpcVisualAppearance {
  role: NpcRole;
  shirtHex: number;
  pantHex: number;
  accentHex?: number;
  skinHex: number;
  hairHex: number;
  heightScale: number;
  widthScale: number;
  saree?: boolean;
  lungi?: boolean;
  hijab?: boolean;
  hatStyle?: 'none' | 'cap' | 'police_cap' | 'beret' | 'gamchha' | 'sunhat' | 'hood';
  beard?: boolean;
  glasses?: boolean;
  backpack?: boolean;
}

export interface ArticulatedNpcRig {
  group: THREE.Group;
  visualRoot: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftThigh: THREE.Group;
  leftShin: THREE.Group;
  rightThigh: THREE.Group;
  rightShin: THREE.Group;
  leftUpperArm: THREE.Group;
  leftForearm: THREE.Group;
  rightUpperArm: THREE.Group;
  rightForearm: THREE.Group;
  shadowDisc: THREE.Mesh;
  headLuggage?: THREE.Group;
  handLuggage?: THREE.Group;
  markerMesh?: THREE.Mesh;
}

// Shared cached shadow texture so 35+ NPCs reuse 1 GPU texture
let cachedShadowTex: THREE.CanvasTexture | null = null;
function getSharedShadowTex(): THREE.CanvasTexture {
  if (!cachedShadowTex) {
    cachedShadowTex = createContactShadowTexture();
  }
  return cachedShadowTex;
}

function makeLimb(
  topR: number,
  botR: number,
  len: number,
  mat: THREE.Material,
  segs = 10,
): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(topR, botR, len, segs);
  geo.translate(0, -len / 2, 0);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

const SOUTH_ASIAN_SKINS = [0xd49b72, 0xc48660, 0xb2724d, 0x9c6240, 0xdeb08c];
const SHIRT_PALETTES = [0xf4efe3, 0x26547c, 0x2d6a4f, 0xc83e3b, 0xd97706, 0x4b5563, 0x0f766e, 0x7c3aed];
const SAREE_PALETTES: [number, number][] = [
  [0xb91c1c, 0xf59e0b],
  [0x15803d, 0xfde047],
  [0x1d4ed8, 0x93c5fd],
  [0x9d174d, 0xf9a8d4],
  [0x0e7490, 0xfbbf24],
];

export function buildAppearanceForRole(role: NpcRole, seed: number): NpcVisualAppearance {
  const skinHex = SOUTH_ASIAN_SKINS[seed % SOUTH_ASIAN_SKINS.length];
  const shirtHex = SHIRT_PALETTES[seed % SHIRT_PALETTES.length];
  const sareePair = SAREE_PALETTES[seed % SAREE_PALETTES.length];
  const isFemale = role !== 'porter' && role !== 'bd_police' && role !== 'railway_police' && seed % 3 === 1;

  switch (role) {
    case 'porter':
      return {
        role,
        shirtHex: 0xc82323, // iconic red Kuli vest/shirt
        pantHex: 0xf0ece1,
        accentHex: 0xe63946,
        skinHex,
        hairHex: 0x1a1715,
        heightScale: 1.0,
        widthScale: 1.06,
        lungi: seed % 2 === 0,
        hatStyle: 'gamchha',
        beard: seed % 3 === 0,
      };
    case 'tea_seller':
      return {
        role,
        shirtHex: 0xe08e36,
        pantHex: 0x334155,
        accentHex: 0xb91c1c,
        skinHex,
        hairHex: 0x1e1a18,
        heightScale: 0.98,
        widthScale: 0.96,
        lungi: seed % 2 === 1,
        hatStyle: seed % 2 === 0 ? 'cap' : 'none',
      };
    case 'food_vendor':
      return {
        role,
        shirtHex: 0x1f7a55,
        pantHex: 0x263238,
        accentHex: 0xf59e0b,
        skinHex,
        hairHex: 0x1b1817,
        heightScale: 0.97,
        widthScale: 0.98,
        hatStyle: 'none',
      };
    case 'fruit_seller':
      return {
        role,
        shirtHex: 0xd97706,
        pantHex: 0x3f2e21,
        accentHex: 0x22c55e,
        skinHex,
        hairHex: 0x1f1b19,
        heightScale: 0.98,
        widthScale: 1.02,
        lungi: true,
        hatStyle: 'gamchha',
      };
    case 'newspaper_seller':
      return {
        role,
        shirtHex: 0x3b82f6,
        pantHex: 0x1f2937,
        accentHex: 0xf8fafc,
        skinHex,
        hairHex: 0x1a1816,
        heightScale: 0.96,
        widthScale: 0.94,
        hatStyle: 'cap',
        glasses: seed % 2 === 0,
      };
    case 'beggar':
      return {
        role,
        shirtHex: 0x8b7e6d,
        pantHex: 0x574c41,
        accentHex: 0x9ca3af,
        skinHex,
        hairHex: 0x6b7280,
        heightScale: 0.93,
        widthScale: 0.88,
        lungi: true,
        beard: true,
      };
    case 'railway_employee':
      return {
        role,
        shirtHex: 0x1e40af,
        pantHex: 0x1e293b,
        accentHex: 0xf59e0b,
        skinHex,
        hairHex: 0x1b1716,
        heightScale: 1.0,
        widthScale: 1.0,
        hatStyle: 'cap',
      };
    case 'ticket_collector':
      return {
        role,
        shirtHex: 0xf8fafc, // Crisp white TC coat
        pantHex: 0x111827,
        accentHex: 0xeab308,
        skinHex,
        hairHex: 0x1d1917,
        heightScale: 1.02,
        widthScale: 1.0,
        hatStyle: 'cap',
        glasses: true,
      };
    case 'railway_police':
      return {
        role,
        shirtHex: 0x3d4d63, // GRP slate-blue tactical
        pantHex: 0x1e293b,
        accentHex: 0xdc2626,
        skinHex,
        hairHex: 0x181615,
        heightScale: 1.04,
        widthScale: 1.07,
        hatStyle: 'beret',
      };
    case 'bd_police':
      return {
        role,
        shirtHex: 0x264653, // Bangladesh Police olive-teal
        pantHex: 0x1b323d,
        accentHex: 0xe9c46a,
        skinHex,
        hairHex: 0x171514,
        heightScale: 1.05,
        widthScale: 1.08,
        hatStyle: 'police_cap',
      };
    case 'child':
      return {
        role,
        shirtHex: [0xef4444, 0xf59e0b, 0x10b981, 0x3b82f6][seed % 4],
        pantHex: 0x1e293b,
        skinHex,
        hairHex: 0x181513,
        heightScale: 0.7,
        widthScale: 0.74,
        backpack: seed % 2 === 0,
      };
    case 'elderly':
      return {
        role,
        shirtHex: isFemale ? 0xf8fafc : 0xe5e0d4,
        pantHex: isFemale ? 0xd97706 : 0xf4f1ea,
        skinHex,
        hairHex: 0xd1d5db, // Silver-white hair
        heightScale: 0.94,
        widthScale: 0.95,
        saree: isFemale,
        lungi: !isFemale && seed % 2 === 0,
        beard: !isFemale,
        glasses: true,
      };
    case 'student':
      return {
        role,
        shirtHex: [0x0ea5e9, 0x10b981, 0xf43f5e, 0x6366f1][seed % 4],
        pantHex: 0x1e293b,
        skinHex,
        hairHex: 0x181412,
        heightScale: 0.97,
        widthScale: 0.93,
        hijab: isFemale && seed % 2 === 0,
        backpack: true,
        glasses: seed % 3 === 0,
      };
    case 'tourist':
      return {
        role,
        shirtHex: [0xf59e0b, 0x06b6d4, 0xec4899][seed % 3],
        pantHex: 0x78716c,
        accentHex: 0x111827,
        skinHex: seed % 2 === 0 ? 0xe8c3a9 : skinHex,
        hairHex: seed % 2 === 0 ? 0x6b4423 : 0x1f1916,
        heightScale: 1.02,
        widthScale: 1.0,
        hatStyle: 'sunhat',
        backpack: true,
        glasses: true,
      };
    case 'family':
      return {
        role,
        shirtHex: isFemale ? sareePair[0] : 0xf3ead8,
        pantHex: isFemale ? sareePair[1] : 0x263238,
        skinHex,
        hairHex: 0x1a1715,
        heightScale: 0.99,
        widthScale: 1.0,
        saree: isFemale,
        hijab: isFemale && seed % 2 === 1,
      };
    case 'suspicious':
      return {
        role,
        shirtHex: 0x27272a,
        pantHex: 0x18181b,
        accentHex: 0x3f3f46,
        skinHex,
        hairHex: 0x141414,
        heightScale: 1.0,
        widthScale: 0.97,
        hatStyle: 'hood',
        glasses: true,
      };
    case 'pickpocket':
      return {
        role,
        shirtHex: 0x334155,
        pantHex: 0x0f172a,
        accentHex: 0x991b1b,
        skinHex,
        hairHex: 0x141414,
        heightScale: 0.96,
        widthScale: 0.89,
        hatStyle: 'cap',
      };
    case 'passenger':
    default:
      return {
        role: 'passenger',
        shirtHex: isFemale ? sareePair[0] : shirtHex,
        pantHex: isFemale ? sareePair[1] : 0x1e293b,
        skinHex,
        hairHex: 0x1a1715,
        heightScale: 0.98 + (seed % 5) * 0.015,
        widthScale: 0.95 + (seed % 4) * 0.03,
        saree: isFemale,
        hijab: isFemale && seed % 4 === 1,
        beard: !isFemale && seed % 4 === 2,
        glasses: seed % 5 === 0,
      };
  }
}

export function createArticulatedNpc(app: NpcVisualAppearance): ArticulatedNpcRig {
  const group = new THREE.Group();
  const visualRoot = new THREE.Group();
  visualRoot.scale.set(app.widthScale, app.heightScale, app.widthScale);
  group.add(visualRoot);

  const skinMat = new THREE.MeshPhysicalMaterial({
    color: app.skinHex,
    roughness: 0.56,
    clearcoat: 0.06,
  });
  const shirtMat = new THREE.MeshStandardMaterial({ color: app.shirtHex, roughness: 0.64 });
  const pantMat = new THREE.MeshStandardMaterial({ color: app.pantHex, roughness: 0.76 });
  const accentMat = new THREE.MeshStandardMaterial({
    color: app.accentHex ?? 0xd97706,
    roughness: 0.48,
  });
  const hairMat = new THREE.MeshStandardMaterial({ color: app.hairHex, roughness: 0.82 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.45 });
  const scleraMat = new THREE.MeshStandardMaterial({ color: 0xfbfaf6, roughness: 0.25 });
  const irisMat = new THREE.MeshStandardMaterial({ color: 0x261a14, roughness: 0.15 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.28, metalness: 0.82 });

  // Ground contact shadow
  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.46 * app.widthScale, 18),
    new THREE.MeshBasicMaterial({
      map: getSharedShadowTex(),
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    }),
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.02;
  group.add(shadowDisc);

  // Articulated 2-segment legs (hip height y = 0.88)
  const makeLeg = (ox: number) => {
    const thighPivot = new THREE.Group();
    thighPivot.position.set(ox, 0.88, 0);
    const thighMesh = makeLimb(0.084, 0.064, 0.42, app.lungi ? shirtMat : pantMat, 10);
    thighPivot.add(thighMesh);

    const shinPivot = new THREE.Group();
    shinPivot.position.set(0, -0.42, 0);
    const shinMesh = makeLimb(0.062, 0.046, 0.38, app.lungi ? skinMat : pantMat, 10);
    shinPivot.add(shinMesh);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.075, 0.2), shoeMat);
    shoe.position.set(0, -0.415, 0.04);
    shoe.castShadow = true;
    shinPivot.add(shoe);

    thighPivot.add(shinPivot);
    visualRoot.add(thighPivot);
    return { thighPivot, shinPivot };
  };
  const leftLeg = makeLeg(-0.095);
  const rightLeg = makeLeg(0.095);

  // Tapered Torso
  const torso = new THREE.Group();
  torso.position.set(0, 0.88, 0);
  visualRoot.add(torso);

  const pelvis = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.165, 0.13, 12),
    app.lungi ? pantMat : pantMat,
  );
  pelvis.scale.set(1.14, 1, 0.78);
  pelvis.position.y = 0.04;
  torso.add(pelvis);

  const chest = new THREE.Mesh(
    new THREE.CylinderGeometry(0.195, 0.148, 0.44, 14),
    shirtMat,
  );
  chest.scale.set(1.12, 1, 0.72);
  chest.position.y = 0.34;
  chest.castShadow = true;
  torso.add(chest);

  // Saree drape or Lungi wrap
  if (app.saree) {
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.158, 0.21, 0.76, 14), pantMat);
    skirt.position.y = -0.34;
    skirt.castShadow = true;
    torso.add(skirt);

    const anchol = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.54, 0.16), pantMat);
    anchol.position.set(-0.1, 0.28, 0.03);
    anchol.rotation.z = 0.22;
    torso.add(anchol);
  } else if (app.lungi) {
    const lungiWrap = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.185, 0.68, 12), pantMat);
    lungiWrap.position.y = -0.3;
    lungiWrap.castShadow = true;
    torso.add(lungiWrap);
  }

  // Uniform belt / sash / porter vest trim + police walkie-talkie & baton
  if (
    app.role === 'bd_police' ||
    app.role === 'railway_police' ||
    app.role === 'railway_employee' ||
    app.role === 'ticket_collector'
  ) {
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.162, 0.162, 0.05, 14), shoeMat);
    belt.scale.set(1.12, 1, 0.78);
    belt.position.y = 0.11;
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.025), accentMat);
    badge.position.set(0.08, 0.42, 0.14);
    torso.add(belt, badge);

    if (app.role === 'bd_police' || app.role === 'railway_police') {
      const radio = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.11, 0.04), shoeMat);
      radio.position.set(-0.12, 0.46, 0.13);
      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.09, 6), metalMat);
      antenna.position.set(-0.12, 0.55, 0.13);
      const baton = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.016, 0.34, 8), shoeMat);
      baton.position.set(0.19, -0.02, 0.02);
      baton.rotation.z = -0.15;
      torso.add(radio, antenna, baton);
    }
  }

  // Backpack for students & tourists
  if (app.backpack) {
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.34, 0.13), accentMat);
    pack.position.set(0, 0.34, -0.17);
    pack.castShadow = true;
    torso.add(pack);
  }

  // Articulated 2-segment arms
  const makeArm = (ox: number) => {
    const upperPivot = new THREE.Group();
    upperPivot.position.set(ox, 0.5, 0);

    const deltoid = new THREE.Mesh(new THREE.SphereGeometry(0.062, 10, 8), shirtMat);
    upperPivot.add(deltoid);
    const upper = makeLimb(0.056, 0.044, 0.24, shirtMat, 10);
    upperPivot.add(upper);

    const forearmPivot = new THREE.Group();
    forearmPivot.position.set(0, -0.24, 0);
    const fore = makeLimb(0.042, 0.033, 0.22, skinMat, 10);
    forearmPivot.add(fore);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 8), skinMat);
    hand.position.set(0, -0.23, 0);
    forearmPivot.add(hand);

    upperPivot.add(forearmPivot);
    torso.add(upperPivot);
    return { upperPivot, forearmPivot };
  };
  const leftArm = makeArm(-0.245);
  const rightArm = makeArm(0.245);

  // Role-specific props held by NPCs
  let headLuggage: THREE.Group | undefined;
  let handLuggage: THREE.Group | undefined;

  if (app.role === 'tea_seller') {
    const kettle = new THREE.Group();
    kettle.position.set(0, -0.24, 0.06);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.17, 12), metalMat);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.024, 0.12, 8), metalMat);
    spout.rotation.x = 0.8;
    spout.position.set(0, 0.04, 0.1);
    kettle.add(body, spout);
    rightArm.forearmPivot.add(kettle);

    const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.02, 12), accentMat);
    tray.position.set(0, -0.22, 0.08);
    leftArm.forearmPivot.add(tray);
  } else if (app.role === 'food_vendor') {
    const trayBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.12, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x8d5524, roughness: 0.7 }),
    );
    trayBox.position.set(0, 0.18, 0.26);
    const snacks = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, 0.08, 5),
      new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.6 }),
    );
    snacks.position.set(-0.08, 0.09, 0);
    trayBox.add(snacks);
    torso.add(trayBox);
  } else if (app.role === 'fruit_seller') {
    const basket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.11, 0.14, 12),
      new THREE.MeshStandardMaterial({ color: 0xb07d44, roughness: 0.88 }),
    );
    basket.position.set(0, -0.22, 0.12);
    const fruits = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.55 }),
    );
    fruits.scale.set(1.1, 0.55, 1.1);
    fruits.position.y = 0.06;
    basket.add(fruits);
    leftArm.forearmPivot.add(basket);
  } else if (app.role === 'newspaper_seller') {
    const bundle = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.08, 0.24),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.85 }),
    );
    bundle.position.set(0.02, -0.2, 0.06);
    leftArm.forearmPivot.add(bundle);
  } else if (app.role === 'elderly') {
    const cane = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.013, 0.82, 8),
      new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.7 }),
    );
    cane.position.set(0, -0.58, 0.05);
    rightArm.forearmPivot.add(cane);
  } else if (app.role === 'ticket_collector' || app.role === 'railway_employee') {
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.22, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 }),
    );
    board.position.set(0, -0.22, 0.07);
    board.rotation.x = 0.4;
    rightArm.forearmPivot.add(board);
  } else if (app.role === 'beggar') {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.055, 0.06, 10), metalMat);
    bowl.position.set(0, -0.22, 0.09);
    rightArm.forearmPivot.add(bowl);
  } else if (app.role === 'porter') {
    headLuggage = new THREE.Group();
    const suitcase = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.24, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.62 }),
    );
    suitcase.castShadow = true;
    const strap = new THREE.Mesh(
      new THREE.BoxGeometry(0.43, 0.05, 0.31),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 }),
    );
    headLuggage.add(suitcase, strap);
    headLuggage.position.set(0, 0.22, 0);
  } else if (app.role === 'passenger' || app.role === 'tourist') {
    if (Math.round(app.heightScale * 100) % 2 === 0) {
      handLuggage = new THREE.Group();
      const bag = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.28, 0.24),
        new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.65 }),
      );
      bag.position.set(0.04, -0.34, 0.02);
      handLuggage.add(bag);
      rightArm.forearmPivot.add(handLuggage);
    }
  }

  // Head & Face
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.056, 0.09, 10), skinMat);
  neck.position.y = 0.57;
  torso.add(neck);

  const head = new THREE.Group();
  head.position.set(0, 0.69, 0);
  torso.add(head);

  if (headLuggage) {
    head.add(headLuggage);
  }

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.108, 14, 12), skinMat);
  cranium.scale.set(0.92, 1.06, 0.96);
  cranium.castShadow = true;
  head.add(cranium);

  const jaw = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.056, 0.09, 10), skinMat);
  jaw.scale.set(0.92, 1, 0.9);
  jaw.position.set(0, -0.06, 0.015);
  head.add(jaw);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.044, 6), skinMat);
  nose.rotation.x = Math.PI * 0.42;
  nose.position.set(0, -0.012, 0.108);
  head.add(nose);

  [-1, 1].forEach((side) => {
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), scleraMat);
    sclera.scale.set(1.1, 0.72, 0.55);
    sclera.position.set(side * 0.038, 0.014, 0.094);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 6), irisMat);
    iris.position.set(side * 0.038, 0.014, 0.103);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.009, 0.014), hairMat);
    brow.position.set(side * 0.038, 0.034, 0.098);
    head.add(sclera, iris, brow);

    if (app.glasses) {
      const lens = new THREE.Mesh(
        new THREE.TorusGeometry(0.022, 0.004, 6, 12),
        new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.2, metalness: 0.7 }),
      );
      lens.position.set(side * 0.038, 0.014, 0.108);
      head.add(lens);
    }
  });

  if (app.beard) {
    const beardMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.092, 10, 8, 0, Math.PI * 2, Math.PI * 0.48, Math.PI * 0.52),
      hairMat,
    );
    beardMesh.position.set(0, -0.042, 0.02);
    head.add(beardMesh);
  }

  // Hair / Hijab / Headwear
  if (app.hijab) {
    const hijabWrap = new THREE.Mesh(new THREE.SphereGeometry(0.118, 14, 12), pantMat);
    hijabWrap.scale.set(0.98, 1.08, 1.02);
    hijabWrap.position.set(0, 0.005, -0.01);
    const drape = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.145, 0.18, 12), pantMat);
    drape.position.set(0, -0.1, -0.01);
    head.add(hijabWrap, drape);
  } else {
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.113, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.64),
      hairMat,
    );
    hair.position.set(0, 0.02, -0.012);
    hair.rotation.x = -0.25;
    head.add(hair);
  }

  if (app.hatStyle === 'cap' || app.hatStyle === 'police_cap') {
    const capColor = app.hatStyle === 'police_cap' ? app.pantHex : app.shirtHex;
    const capMat = new THREE.MeshStandardMaterial({ color: capColor, roughness: 0.5 });
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.116, 0.11, 0.065, 14), capMat);
    crown.position.y = 0.095;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.12, 0.014, 12, 1, false, -1, 2), shoeMat);
    brim.position.set(0, 0.065, 0.045);
    brim.rotation.x = 0.18;
    head.add(crown, brim);
  } else if (app.hatStyle === 'beret') {
    const beret = new THREE.Mesh(
      new THREE.SphereGeometry(0.115, 12, 8),
      new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.65 }),
    );
    beret.scale.set(1.12, 0.45, 1.12);
    beret.position.set(0.015, 0.095, 0);
    beret.rotation.z = -0.18;
    head.add(beret);
  } else if (app.hatStyle === 'gamchha') {
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.112, 0.024, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.78 }),
    );
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.055;
    head.add(band);
  } else if (app.hatStyle === 'sunhat') {
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.24, 0.018, 16),
      new THREE.MeshStandardMaterial({ color: 0xe5d3a1, roughness: 0.8 }),
    );
    brim.position.y = 0.085;
    const crown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.105, 0.115, 0.08, 14),
      new THREE.MeshStandardMaterial({ color: 0xd9be82, roughness: 0.8 }),
    );
    crown.position.y = 0.125;
    head.add(brim, crown);
  } else if (app.hatStyle === 'hood') {
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.128, 12, 10), shirtMat);
    hood.position.set(0, 0.02, -0.025);
    head.add(hood);
  }

  // Floating interaction/incident diamond marker (hidden by default, shown when NPC wants to talk/incident)
  const markerMesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.13, 0),
    new THREE.MeshBasicMaterial({ color: 0xfacc15 }),
  );
  markerMesh.position.set(0, 2.25, 0);
  markerMesh.visible = false;
  group.add(markerMesh);

  return {
    group,
    visualRoot,
    torso,
    head,
    leftThigh: leftLeg.thighPivot,
    leftShin: leftLeg.shinPivot,
    rightThigh: rightLeg.thighPivot,
    rightShin: rightLeg.shinPivot,
    leftUpperArm: leftArm.upperPivot,
    leftForearm: leftArm.forearmPivot,
    rightUpperArm: rightArm.upperPivot,
    rightForearm: rightArm.forearmPivot,
    shadowDisc,
    headLuggage,
    handLuggage,
    markerMesh,
  };
}

/**
 * Updates articulated NPC limbs smoothly for every requested pose/activity.
 */
export function animateNpcRig(
  rig: ArticulatedNpcRig,
  pose: NpcAnimationPose,
  phase: number,
  speedRatio: number,
  dt: number,
  stumbleTimer: number,
): void {
  const smooth = 1 - Math.exp(-12 * dt);

  let lThigh = 0;
  let rThigh = 0;
  let lShin = 0;
  let rShin = 0;
  let lUpper = 0;
  let rUpper = 0;
  let lFore = -0.18;
  let rFore = -0.18;
  let torsoX = 0;
  let torsoY = 0;
  let torsoPosY = 0.88;
  let headY = 0;
  let headX = 0;

  if (pose === 'stumbling') {
    const wob = Math.sin(stumbleTimer * 18) * 0.45;
    torsoX = -0.22 + Math.abs(wob) * 0.15;
    torsoY = wob * 0.4;
    lUpper = -0.85 + wob;
    rUpper = -0.85 - wob;
    lFore = -0.45;
    rFore = -0.45;
    lThigh = -0.25;
    rThigh = 0.3;
    rShin = 0.45;
    headX = -0.18;
  } else if (pose === 'sitting') {
    torsoPosY = 0.56;
    lThigh = -Math.PI * 0.48;
    rThigh = -Math.PI * 0.48;
    lShin = Math.PI * 0.48;
    rShin = Math.PI * 0.48;
    lUpper = -0.15;
    rUpper = -0.15;
    lFore = -0.55;
    rFore = -0.55;
    headY = Math.sin(phase * 0.4) * 0.25;
    torsoX = 0.04 + Math.sin(phase * 0.7) * 0.015;
  } else if (pose === 'chasing') {
    // Fast security/suspect sprint with forward lean & vigorous arm drive
    const swing = Math.sin(phase * 1.25) * 0.85;
    lThigh = swing;
    rThigh = -swing;
    lShin = Math.max(0, -Math.cos(phase * 1.25) * 0.65);
    rShin = Math.max(0, Math.cos(phase * 1.25) * 0.65);
    lUpper = -swing * 0.9;
    rUpper = swing * 0.9 - 0.35; // Slight forward baton/reach arm
    lFore = -0.75;
    rFore = -0.75;
    torsoX = 0.22;
    torsoY = Math.sin(phase) * 0.08;
  } else if (pose === 'patrolling') {
    // Authoritative steady police patrol stride with subtle chest-up posture
    const swing = Math.sin(phase) * 0.44 * Math.max(0.45, speedRatio);
    lThigh = swing;
    rThigh = -swing;
    lShin = Math.max(0, -Math.cos(phase) * 0.42);
    rShin = Math.max(0, Math.cos(phase) * 0.42);
    lUpper = -swing * 0.55;
    rUpper = swing * 0.55;
    lFore = -0.22;
    rFore = -0.3;
    torsoX = -0.02;
    headY = Math.sin(phase * 0.45) * 0.32; // scanning platform left/right
  } else if (pose === 'sneaking') {
    // Low crouched shifty suspect walk checking over shoulder
    const swing = Math.sin(phase) * 0.35;
    torsoPosY = 0.79;
    torsoX = 0.24;
    lThigh = swing - 0.15;
    rThigh = -swing - 0.15;
    lShin = 0.35 + Math.max(0, -Math.cos(phase) * 0.25);
    rShin = 0.35 + Math.max(0, Math.cos(phase) * 0.25);
    lUpper = -0.4;
    rUpper = -0.5;
    lFore = -0.7;
    rFore = -0.75;
    headY = Math.sin(phase * 1.3) * 0.75;
  } else if (pose === 'investigating') {
    // Police officer inspecting clues / speaking into shoulder radio
    torsoX = 0.08;
    lUpper = -0.95; // Left hand raised near shoulder radio
    lFore = -1.25;
    rUpper = -0.35 + Math.sin(phase * 1.2) * 0.15;
    rFore = -0.45;
    headY = Math.sin(phase * 0.85) * 0.48;
    headX = 0.16;
  } else if (pose === 'panicking') {
    // Worried guardian / victim waving hands urgently for help
    const wave = Math.sin(phase * 2.4);
    lUpper = -1.55 + wave * 0.35;
    rUpper = -1.55 - wave * 0.35;
    lFore = -0.65;
    rFore = -0.65;
    torsoX = Math.sin(phase * 1.8) * 0.06;
    headY = Math.sin(phase * 1.7) * 0.42;
  } else if (pose === 'reassuring') {
    // Calm comforting gesture (security / staff assisting elderly or child)
    rUpper = -0.65 + Math.sin(phase * 0.9) * 0.12;
    rFore = -0.55;
    lUpper = -0.35;
    lFore = -0.4;
    headX = 0.1;
  } else if (pose === 'walking' || pose === 'running' || pose === 'boarding' || pose === 'carrying_luggage') {
    const amp = pose === 'running' ? 0.72 : 0.48 * Math.max(0.45, speedRatio);
    const swing = Math.sin(phase) * amp;
    lThigh = swing;
    rThigh = -swing;
    lShin = Math.max(0, -Math.cos(phase) * 0.48 * Math.max(0.4, speedRatio));
    rShin = Math.max(0, Math.cos(phase) * 0.48 * Math.max(0.4, speedRatio));

    if (pose === 'carrying_luggage' && rig.headLuggage) {
      // Arms raised balancing suitcase on head
      lUpper = -2.35;
      rUpper = -2.35;
      lFore = -0.95;
      rFore = -0.95;
      torsoX = 0.04;
    } else {
      lUpper = -swing * 0.75;
      rUpper = swing * 0.75;
      lFore = -0.22 - Math.max(0, swing) * 0.25;
      rFore = -0.22 - Math.max(0, -swing) * 0.25;
      torsoX = pose === 'running' ? 0.14 : 0.04;
      torsoY = Math.sin(phase) * 0.06;
    }
  } else if (pose === 'talking') {
    const gesture = Math.sin(phase * 1.6);
    rUpper = -0.55 + gesture * 0.25;
    rFore = -0.75 + Math.cos(phase * 1.9) * 0.2;
    lUpper = -0.35 - gesture * 0.15;
    lFore = -0.65;
    headY = Math.sin(phase * 0.9) * 0.18;
    headX = Math.sin(phase * 1.4) * 0.08;
  } else if (pose === 'selling') {
    // Hawker waving hand & calling customers
    rUpper = -1.15 + Math.sin(phase * 2.2) * 0.35;
    rFore = -0.6;
    lUpper = -0.45;
    lFore = -0.85;
    headY = Math.sin(phase * 0.8) * 0.35;
  } else if (pose === 'buying') {
    rUpper = -0.65 + Math.sin(phase * 1.2) * 0.12;
    rFore = -0.55;
    lUpper = -0.25;
    headX = 0.08;
  } else if (pose === 'looking_around') {
    headY = Math.sin(phase * 0.75) * 0.55;
    headX = Math.sin(phase * 0.45) * 0.12;
    torsoX = Math.sin(phase * 0.6) * 0.02;
  } else {
    // standing idle breathing
    torsoX = Math.sin(phase * 0.6) * 0.015;
    headY = Math.sin(phase * 0.38) * 0.2;
  }

  rig.torso.position.y += (torsoPosY - rig.torso.position.y) * smooth;
  rig.torso.rotation.x += (torsoX - rig.torso.rotation.x) * smooth;
  rig.torso.rotation.y += (torsoY - rig.torso.rotation.y) * smooth;
  rig.head.rotation.y += (headY - rig.head.rotation.y) * smooth;
  rig.head.rotation.x += (headX - rig.head.rotation.x) * smooth;

  rig.leftThigh.rotation.x += (lThigh - rig.leftThigh.rotation.x) * smooth;
  rig.rightThigh.rotation.x += (rThigh - rig.rightThigh.rotation.x) * smooth;
  rig.leftShin.rotation.x += (lShin - rig.leftShin.rotation.x) * smooth;
  rig.rightShin.rotation.x += (rShin - rig.rightShin.rotation.x) * smooth;

  rig.leftUpperArm.rotation.x += (lUpper - rig.leftUpperArm.rotation.x) * smooth;
  rig.rightUpperArm.rotation.x += (rUpper - rig.rightUpperArm.rotation.x) * smooth;
  rig.leftForearm.rotation.x += (lFore - rig.leftForearm.rotation.x) * smooth;
  rig.rightForearm.rotation.x += (rFore - rig.rightForearm.rotation.x) * smooth;

  if (rig.headLuggage) {
    rig.headLuggage.visible = pose === 'carrying_luggage';
  }
}
