import * as THREE from 'three';
import {
  createBrickTexturePair,
  createCityBillboardTexture,
  createClockFaceTexture,
  createCoachNumberPlateTexture,
  createContactShadowTexture,
  createCorrugatedTexture,
  createSignboardTexture,
} from './textures';
import type { SignalAspect, SwitchPosition, TrainCategory } from './types';

export interface CharacterRig {
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
}

export interface FirstPersonArmsRig {
  group: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
}

function createSculptedLimbSegment(
  topRadius: number,
  botRadius: number,
  length: number,
  mat: THREE.Material,
  radialSegments = 12,
): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(topRadius, botRadius, length, radialSegments);
  geo.translate(0, -length / 2, 0);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

function createBoot(shoeMat: THREE.Material, soleMat: THREE.Material): THREE.Group {
  const boot = new THREE.Group();
  const ankle = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.062, 0.08, 10), shoeMat);
  ankle.position.set(0, -0.02, 0);
  ankle.castShadow = true;

  const vamp = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.14, 6, 10), shoeMat);
  vamp.rotation.x = Math.PI / 2;
  vamp.scale.set(1.0, 1.0, 0.78);
  vamp.position.set(0, -0.06, 0.06);
  vamp.castShadow = true;

  const sole = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.026, 0.25), soleMat);
  sole.position.set(0, -0.098, 0.055);
  boot.add(ankle, vamp, sole);
  return boot;
}

function createSculptedHand(skinMat: THREE.Material): THREE.Group {
  const hand = new THREE.Group();
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.09, 0.042), skinMat);
  palm.position.set(0, -0.045, 0);
  palm.castShadow = true;

  const fingers = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.048, 4, 8), skinMat);
  fingers.scale.set(1.15, 1, 0.65);
  fingers.position.set(0, -0.095, 0.008);

  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.015, 0.036, 4, 6), skinMat);
  thumb.position.set(0, -0.048, 0.032);
  thumb.rotation.x = 0.5;

  hand.add(palm, fingers, thumb);
  return hand;
}

export function createStationMasterCharacter(): CharacterRig {
  const group = new THREE.Group();
  const visualRoot = new THREE.Group();
  group.add(visualRoot);

  // Stylized VALORANT-inspired crisp PBR fabrics & skin
  const trouserMat = new THREE.MeshStandardMaterial({ color: 0x1e2a36, roughness: 0.74, metalness: 0.05 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0xf4f0e6, roughness: 0.58 });
  const vestMat = new THREE.MeshPhysicalMaterial({
    color: 0x134a36,
    roughness: 0.52,
    metalness: 0.08,
    sheen: 0.4,
    sheenColor: new THREE.Color(0x2e7d5b),
  });
  const lapelMat = new THREE.MeshStandardMaterial({ color: 0x0e3828, roughness: 0.48 });
  const skinMat = new THREE.MeshPhysicalMaterial({
    color: 0xc5855e,
    roughness: 0.56,
    clearcoat: 0.08,
    clearcoatRoughness: 0.7,
  });
  const shoeMat = new THREE.MeshPhysicalMaterial({
    color: 0x191716,
    roughness: 0.32,
    metalness: 0.12,
    clearcoat: 0.35,
  });
  const soleMat = new THREE.MeshStandardMaterial({ color: 0x2c2521, roughness: 0.85 });
  const beltMat = new THREE.MeshStandardMaterial({ color: 0x3b2416, roughness: 0.42 });
  const capTopMat = new THREE.MeshStandardMaterial({ color: 0xf5f1e8, roughness: 0.5 });
  const capBandMat = new THREE.MeshStandardMaterial({ color: 0xc22724, roughness: 0.42 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xebb846, roughness: 0.22, metalness: 0.88 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x1b1716, roughness: 0.78 });
  const scleraMat = new THREE.MeshStandardMaterial({ color: 0xfbfaf6, roughness: 0.25 });
  const irisMat = new THREE.MeshStandardMaterial({ color: 0x291c15, roughness: 0.15 });

  // Ground contact shadow disc
  const shadowTex = createContactShadowTexture();
  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.56, 24),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.58, depthWrite: false }),
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.02;
  group.add(shadowDisc);

  // 1. Articulated 2-segment Legs (hip height y = 0.92, total height ~1.84m athletic human proportions)
  const makeLeg = (offsetX: number) => {
    const thighPivot = new THREE.Group();
    thighPivot.position.set(offsetX, 0.92, 0);

    const thighMesh = createSculptedLimbSegment(0.095, 0.072, 0.44, trouserMat, 12);
    thighPivot.add(thighMesh);

    const kneeCap = new THREE.Mesh(new THREE.SphereGeometry(0.072, 10, 8), trouserMat);
    kneeCap.position.y = -0.44;
    thighPivot.add(kneeCap);

    const shinPivot = new THREE.Group();
    shinPivot.position.set(0, -0.44, 0);
    const shinMesh = createSculptedLimbSegment(0.07, 0.052, 0.39, trouserMat, 12);
    shinPivot.add(shinMesh);

    const boot = createBoot(shoeMat, soleMat);
    boot.position.set(0, -0.39, 0);
    shinPivot.add(boot);

    thighPivot.add(shinPivot);
    visualRoot.add(thighPivot);
    return { thighPivot, shinPivot };
  };

  const leftLeg = makeLeg(-0.11);
  const rightLeg = makeLeg(0.11);

  // 2. Sculpted Pelvis + Athletic Tapered Torso + Tailored Station Master Tunic
  const torso = new THREE.Group();
  torso.position.set(0, 0.92, 0);
  visualRoot.add(torso);

  const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.18, 0.14, 14), trouserMat);
  pelvis.scale.set(1.18, 1, 0.8);
  pelvis.position.y = 0.04;
  pelvis.castShadow = true;
  torso.add(pelvis);

  // Waist belt + brass buckle
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.055, 16), beltMat);
  belt.scale.set(1.18, 1, 0.82);
  belt.position.y = 0.11;
  torso.add(belt);

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.058, 0.03), brassMat);
  buckle.position.set(0, 0.11, 0.142);
  torso.add(buckle);

  // Tapered chest / waistcoat (broad heroic shoulders, narrow waist)
  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.162, 0.46, 16), vestMat);
  chest.scale.set(1.12, 1, 0.72);
  chest.position.y = 0.36;
  chest.castShadow = true;
  torso.add(chest);

  // Crisp white shirt front V-insert & crimson tie
  const shirtV = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.24, 4), shirtMat);
  shirtV.rotation.z = Math.PI;
  shirtV.scale.set(1, 1, 0.32);
  shirtV.position.set(0, 0.48, 0.142);
  torso.add(shirtV);

  const tie = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.22, 0.02), capBandMat);
  tie.position.set(0, 0.44, 0.158);
  torso.add(tie);

  // Tailored coat lapels & brass buttons
  [-1, 1].forEach((side) => {
    const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.25, 0.025), lapelMat);
    lapel.position.set(side * 0.068, 0.47, 0.148);
    lapel.rotation.z = side * 0.22;
    torso.add(lapel);

    // Shoulder epaulets with gold stripe
    const epaulet = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.024, 0.075), lapelMat);
    epaulet.position.set(side * 0.2, 0.585, 0);
    epaulet.rotation.z = -side * 0.14;
    torso.add(epaulet);

    const pip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.028, 0.078), brassMat);
    pip.position.set(side * 0.23, 0.583, 0);
    torso.add(pip);
  });

  for (let i = 0; i < 3; i++) {
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.017, 10, 10), brassMat);
    btn.position.set(0, 0.19 + i * 0.075, 0.158);
    torso.add(btn);
  }

  // Subtle coat tails over hips
  const coatSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.205, 0.14, 16, 1, true), vestMat);
  coatSkirt.scale.set(1.14, 1, 0.78);
  coatSkirt.position.y = 0.03;
  torso.add(coatSkirt);

  // 3. Articulated 2-segment Arms with rolled cuffs & sculpted hands
  const makeArm = (offsetX: number, withSignalFlag: boolean) => {
    const upperPivot = new THREE.Group();
    upperPivot.position.set(offsetX, 0.535, 0);

    const shoulderDeltoid = new THREE.Mesh(new THREE.SphereGeometry(0.072, 12, 10), vestMat);
    shoulderDeltoid.castShadow = true;
    upperPivot.add(shoulderDeltoid);

    const upperArmMesh = createSculptedLimbSegment(0.064, 0.052, 0.26, vestMat, 12);
    upperPivot.add(upperArmMesh);

    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), shirtMat);
    elbow.position.y = -0.26;
    upperPivot.add(elbow);

    const forearmPivot = new THREE.Group();
    forearmPivot.position.set(0, -0.26, 0);

    const sleeveCuff = createSculptedLimbSegment(0.05, 0.044, 0.11, shirtMat, 10);
    forearmPivot.add(sleeveCuff);

    const bareForearm = createSculptedLimbSegment(0.042, 0.035, 0.14, skinMat, 10);
    bareForearm.position.y = -0.1;
    forearmPivot.add(bareForearm);

    const hand = createSculptedHand(skinMat);
    hand.position.set(0, -0.23, 0);
    forearmPivot.add(hand);

    if (withSignalFlag) {
      // Iconic Bangladeshi Station Master green & white dispatch flag
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.013, 0.013, 0.54, 10),
        new THREE.MeshStandardMaterial({ color: 0x6b4222, roughness: 0.65 }),
      );
      pole.rotation.x = Math.PI * 0.4;
      pole.position.set(0, -0.29, 0.16);
      forearmPivot.add(pole);

      const brassTip = new THREE.Mesh(new THREE.SphereGeometry(0.019, 8, 8), brassMat);
      brassTip.position.set(0, -0.37, 0.41);
      forearmPivot.add(brassTip);

      const flagCloth = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.18, 0.26),
        new THREE.MeshStandardMaterial({ color: 0x16a856, roughness: 0.62 }),
      );
      flagCloth.rotation.x = Math.PI * 0.4;
      flagCloth.position.set(0, -0.35, 0.29);
      forearmPivot.add(flagCloth);
    }

    upperPivot.add(forearmPivot);
    torso.add(upperPivot);
    return { upperPivot, forearmPivot };
  };

  const leftArm = makeArm(-0.275, false);
  const rightArm = makeArm(0.275, true);

  // 4. Sculpted Head, Neck, Facial Features & Peaked Officer Cap
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.062, 0.11, 12), skinMat);
  neck.position.y = 0.61;
  torso.add(neck);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.095, 0.045, 14), shirtMat);
  collar.position.y = 0.585;
  torso.add(collar);

  const head = new THREE.Group();
  head.position.set(0, 0.74, 0);
  torso.add(head);

  // Cranium + tapered jawline (stylized VALORANT proportions: angular, clean silhouette)
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.118, 18, 14), skinMat);
  cranium.scale.set(0.92, 1.06, 0.98);
  cranium.position.y = 0.01;
  cranium.castShadow = true;
  head.add(cranium);

  const jaw = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.06, 0.1, 12), skinMat);
  jaw.scale.set(0.92, 1, 0.92);
  jaw.position.set(0, -0.065, 0.015);
  head.add(jaw);

  // Ears
  [-1, 1].forEach((side) => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), skinMat);
    ear.scale.set(0.55, 1.15, 0.8);
    ear.position.set(side * 0.108, -0.005, -0.005);
    head.add(ear);
  });

  // Nose bridge & tip
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.05, 6), skinMat);
  nose.rotation.x = Math.PI * 0.42;
  nose.position.set(0, -0.012, 0.118);
  head.add(nose);

  // Expressive eyes (sclera + dark iris + brow)
  [-1, 1].forEach((side) => {
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), scleraMat);
    sclera.scale.set(1.1, 0.72, 0.55);
    sclera.position.set(side * 0.042, 0.015, 0.102);

    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 8), irisMat);
    iris.position.set(side * 0.042, 0.015, 0.112);

    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.01, 0.016), hairMat);
    brow.position.set(side * 0.043, 0.036, 0.108);
    brow.rotation.z = side * -0.08;

    head.add(sclera, iris, brow);
  });

  // Distinguished Bangladeshi Station Master Mustache
  [-1, 1].forEach((side) => {
    const stache = new THREE.Mesh(new THREE.CapsuleGeometry(0.01, 0.032, 4, 6), hairMat);
    stache.rotation.z = Math.PI * 0.46 + side * 0.16;
    stache.position.set(side * 0.024, -0.046, 0.108);
    head.add(stache);
  });

  // Hairline & back hair
  const hairBack = new THREE.Mesh(new THREE.SphereGeometry(0.119, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.68), hairMat);
  hairBack.position.set(0, 0.02, -0.014);
  hairBack.rotation.x = -0.3;
  head.add(hairBack);

  // Peaked Bangladesh Railway Officer Cap
  const capGroup = new THREE.Group();
  capGroup.position.set(0, 0.095, 0.005);
  capGroup.rotation.x = -0.08;

  const capBand = new THREE.Mesh(new THREE.CylinderGeometry(0.116, 0.113, 0.055, 18), capBandMat);
  const capCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.138, 0.116, 0.068, 18), capTopMat);
  capCrown.position.y = 0.056;
  capCrown.castShadow = true;

  // Curved peaked visor
  const visorGeo = new THREE.CylinderGeometry(0.12, 0.125, 0.016, 16, 1, false, -Math.PI * 0.36, Math.PI * 0.72);
  const visor = new THREE.Mesh(visorGeo, shoeMat);
  visor.position.set(0, -0.024, 0.045);
  visor.rotation.x = 0.22;

  const crest = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.016, 0.016, 10), brassMat);
  crest.rotation.x = Math.PI / 2;
  crest.position.set(0, 0.04, 0.122);

  capGroup.add(capBand, capCrown, visor, crest);
  head.add(capGroup);

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
  };
}

export function createFirstPersonArms(): FirstPersonArmsRig {
  const group = new THREE.Group();

  const sleeveMat = new THREE.MeshStandardMaterial({ color: 0xf4f0e6, roughness: 0.56 });
  const vestCuffMat = new THREE.MeshStandardMaterial({ color: 0x134a36, roughness: 0.52 });
  const skinMat = new THREE.MeshPhysicalMaterial({ color: 0xc5855e, roughness: 0.54 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xebb846, roughness: 0.22, metalness: 0.88 });

  // Left arm: relaxed natural stance at lower-left periphery (never obstructing view)
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.34, -0.35, -0.4);
  leftArm.rotation.set(0.28, 0.52, -0.22);

  const lSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.056, 0.34, 14), sleeveMat);
  lSleeve.rotation.x = Math.PI / 2;
  lSleeve.position.z = 0.14;
  const lCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.036, 14), vestCuffMat);
  lCuff.rotation.x = Math.PI / 2;
  lCuff.position.z = -0.02;
  const lForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.044, 0.17, 14), skinMat);
  lForearm.rotation.x = Math.PI / 2;
  lForearm.position.z = -0.08;
  const lPalm = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.05, 6, 10), skinMat);
  lPalm.rotation.x = Math.PI * 0.45;
  lPalm.scale.set(1.15, 1, 0.6);
  lPalm.position.set(0.01, -0.008, -0.17);
  leftArm.add(lSleeve, lCuff, lForearm, lPalm);

  // Right arm holding Station Master's green signal flag with wrapped fingers
  const rightArm = new THREE.Group();
  rightArm.position.set(0.32, -0.3, -0.45);
  rightArm.rotation.set(0.32, -0.26, 0.14);

  const rSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.058, 0.34, 14), sleeveMat);
  rSleeve.rotation.x = Math.PI / 2;
  rSleeve.position.z = 0.14;
  const rCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.038, 14), vestCuffMat);
  rCuff.rotation.x = Math.PI / 2;
  rCuff.position.z = -0.01;
  const rForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.044, 0.17, 14), skinMat);
  rForearm.rotation.x = Math.PI / 2;
  rForearm.position.z = -0.07;

  const rGrip = new THREE.Group();
  rGrip.position.set(0, 0.01, -0.16);
  const rPalm = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.048, 6, 10), skinMat);
  rPalm.rotation.x = Math.PI * 0.5;
  rPalm.scale.set(1.1, 1, 0.68);
  rGrip.add(rPalm);

  for (let f = 0; f < 4; f++) {
    const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.034, 4, 8), skinMat);
    finger.rotation.z = Math.PI * 0.42;
    finger.position.set(-0.022, 0.018 - f * 0.014, -0.012);
    rGrip.add(finger);
  }

  // Flag held cleanly in grip
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.011, 0.011, 0.44, 10),
    new THREE.MeshStandardMaterial({ color: 0x6b4222, roughness: 0.65 }),
  );
  pole.position.set(-0.022, 0.14, -0.21);
  pole.rotation.set(-0.32, 0, 0.1);

  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.017, 10, 10), brassMat);
  finial.position.set(-0.044, 0.34, -0.28);

  const flag = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, 0.16, 0.21),
    new THREE.MeshStandardMaterial({ color: 0x16a856, roughness: 0.58 }),
  );
  flag.position.set(-0.035, 0.24, -0.16);
  flag.rotation.set(-0.32, 0.2, 0.1);

  rightArm.add(rSleeve, rCuff, rForearm, rGrip, pole, finial, flag);
  group.add(leftArm, rightArm);
  return { group, leftArm, rightArm };
}

export interface StylizedNpcRig {
  group: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  head: THREE.Group;
  baseX: number;
  baseZ: number;
  walkRadius: number;
  phaseOffset: number;
}

export function createStylizedNpc(opts: {
  shirtHex: number;
  pantHex: number;
  skinHex?: number;
  saree?: boolean;
  baseX: number;
  baseZ: number;
  walkRadius?: number;
  phaseOffset?: number;
}): StylizedNpcRig {
  const group = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: opts.skinHex ?? 0xc48660, roughness: 0.62 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: opts.shirtHex, roughness: 0.68 });
  const pantMat = new THREE.MeshStandardMaterial({ color: opts.pantHex, roughness: 0.76 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x1d1917, roughness: 0.82 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x26211e, roughness: 0.55 });

  const makeNpcLeg = (ox: number) => {
    const p = new THREE.Group();
    p.position.set(ox, 0.86, 0);
    const legMesh = createSculptedLimbSegment(0.078, 0.052, 0.78, pantMat, 10);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.2), shoeMat);
    shoe.position.set(0, -0.82, 0.04);
    p.add(legMesh, shoe);
    group.add(p);
    return p;
  };
  const leftLeg = makeNpcLeg(-0.095);
  const rightLeg = makeNpcLeg(0.095);

  // Tapered torso (plus saree anchol drape if saree)
  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.15, 0.52, 12), shirtMat);
  chest.scale.set(1.08, 1, 0.72);
  chest.position.y = 1.14;
  chest.castShadow = true;
  group.add(chest);

  if (opts.saree) {
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.21, 0.76, 12), pantMat);
    skirt.position.y = 0.54;
    skirt.castShadow = true;
    group.add(skirt);

    const anchol = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.52, 0.16), pantMat);
    anchol.position.set(-0.1, 1.15, 0.02);
    anchol.rotation.z = 0.24;
    group.add(anchol);
  }

  const makeNpcArm = (ox: number) => {
    const p = new THREE.Group();
    p.position.set(ox, 1.35, 0);
    const sleeve = createSculptedLimbSegment(0.055, 0.042, 0.24, shirtMat, 8);
    const forearm = createSculptedLimbSegment(0.04, 0.032, 0.24, skinMat, 8);
    forearm.position.y = -0.24;
    p.add(sleeve, forearm);
    group.add(p);
    return p;
  };
  const leftArm = makeNpcArm(-0.23);
  const rightArm = makeNpcArm(0.23);

  const head = new THREE.Group();
  head.position.set(0, 1.54, 0);
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.108, 14, 12), skinMat);
  cranium.scale.set(0.92, 1.06, 0.96);
  cranium.castShadow = true;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.112, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), hairMat);
  hair.position.set(0, 0.02, -0.01);
  hair.rotation.x = -0.25;
  head.add(cranium, hair);
  group.add(head);

  return {
    group,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    head,
    baseX: opts.baseX,
    baseZ: opts.baseZ,
    walkRadius: opts.walkRadius ?? 0,
    phaseOffset: opts.phaseOffset ?? 0,
  };
}

export function createStationOffice(maxAnisotropy: number): THREE.Group {
  const group = new THREE.Group();

  const brickPair = createBrickTexturePair(maxAnisotropy);
  const tinTex = createCorrugatedTexture('#1a5c40', maxAnisotropy);
  const clockTex = createClockFaceTexture(maxAnisotropy);
  const signTex = createSignboardTexture(
    'স্টেশন মাস্টার · শাপলাপুর',
    'STATION MASTER OFFICE',
    '#164c36',
    '#f8e8be',
    maxAnisotropy,
  );

  const brickMat = new THREE.MeshStandardMaterial({
    map: brickPair.map,
    bumpMap: brickPair.bumpMap,
    bumpScale: 0.035,
    color: 0xffffff,
    roughness: 0.84,
  });
  const plasterMat = new THREE.MeshStandardMaterial({ color: 0xf4e7d0, roughness: 0.74 });
  const terracottaTrimMat = new THREE.MeshStandardMaterial({ color: 0xa44632, roughness: 0.72 });
  const teakMat = new THREE.MeshStandardMaterial({ color: 0x4b2e1b, roughness: 0.56 });
  const greenIronMat = new THREE.MeshStandardMaterial({ color: 0x18573d, roughness: 0.36, metalness: 0.45 });
  const tinRoofMat = new THREE.MeshStandardMaterial({
    map: tinTex,
    color: 0xffffff,
    roughness: 0.42,
    metalness: 0.38,
  });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xe6b647, roughness: 0.22, metalness: 0.88 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x6baec4,
    roughness: 0.08,
    metalness: 0.15,
    clearcoat: 0.9,
    clearcoatRoughness: 0.08,
    reflectivity: 0.9,
  });

  // Main building body (16m wide x 4.4m tall x 5.2m deep)
  const mainBody = new THREE.Mesh(new THREE.BoxGeometry(16, 4.4, 5.2), brickMat);
  mainBody.position.set(0, 2.2, 0);
  mainBody.castShadow = true;
  mainBody.receiveShadow = true;
  group.add(mainBody);

  // Cream plaster cornice, plinth & classical pilasters
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(16.3, 0.32, 5.45), plasterMat);
  plinth.position.set(0, 0.16, 0);
  group.add(plinth);

  const cornice = new THREE.Mesh(new THREE.BoxGeometry(16.5, 0.42, 5.6), plasterMat);
  cornice.position.set(0, 4.48, 0);
  cornice.castShadow = true;
  group.add(cornice);

  [-7.5, -2.6, 2.6, 7.5].forEach((px) => {
    const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.56, 4.3, 5.48), plasterMat);
    pilaster.position.set(px, 2.15, 0);
    group.add(pilaster);
  });

  // Heritage parapet & central gable clock tower
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(16.35, 0.66, 0.36), brickMat);
  parapet.position.set(0, 4.98, 2.52);
  group.add(parapet);

  const clockTower = new THREE.Mesh(new THREE.BoxGeometry(3.25, 2.35, 1.45), plasterMat);
  clockTower.position.set(0, 5.52, 2.05);
  clockTower.castShadow = true;
  group.add(clockTower);

  const clockTrim = new THREE.Mesh(new THREE.BoxGeometry(3.48, 0.2, 1.62), terracottaTrimMat);
  clockTrim.position.set(0, 6.72, 2.05);
  group.add(clockTrim);

  const clockCap = new THREE.Mesh(new THREE.ConeGeometry(2.15, 1.32, 4), greenIronMat);
  clockCap.rotation.y = Math.PI / 4;
  clockCap.position.set(0, 7.42, 2.05);
  clockCap.castShadow = true;
  group.add(clockCap);

  const clockFinial = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.7, 8), brassMat);
  clockFinial.position.set(0, 8.25, 2.05);
  group.add(clockFinial);

  const clockRing = new THREE.Mesh(new THREE.TorusGeometry(0.77, 0.05, 10, 28), brassMat);
  clockRing.position.set(0, 5.66, 2.78);
  group.add(clockRing);

  const clockFace = new THREE.Mesh(
    new THREE.CircleGeometry(0.75, 28),
    new THREE.MeshStandardMaterial({ map: clockTex, color: 0xffffff, roughness: 0.32 }),
  );
  clockFace.position.set(0, 5.66, 2.79);
  group.add(clockFace);

  // Veranda Awning extending toward Platform 1 (+Z side) with decorative curved arches
  const awning = new THREE.Mesh(new THREE.BoxGeometry(16.6, 0.16, 3.3), tinRoofMat);
  awning.position.set(0, 3.45, 4.15);
  awning.rotation.x = 0.14;
  awning.castShadow = true;
  group.add(awning);

  // Arched colonial veranda spandrels between pillars (ExtrudeGeometry, cleanly below fascia)
  const archSpan = 4.7;
  const archShape = new THREE.Shape();
  archShape.moveTo(0, 0);
  archShape.lineTo(archSpan, 0);
  archShape.lineTo(archSpan, -0.68);
  archShape.lineTo(archSpan - 0.28, -0.68);
  archShape.absellipse(archSpan / 2, -0.68, archSpan / 2 - 0.28, 0.5, 0, Math.PI, false, 0);
  archShape.lineTo(0, -0.68);
  archShape.closePath();

  const archGeo = new THREE.ExtrudeGeometry(archShape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });

  [-7.2, -2.5, 2.5].forEach((ax) => {
    const archMesh = new THREE.Mesh(archGeo, plasterMat);
    archMesh.position.set(ax, 3.24, 5.48);
    group.add(archMesh);
  });

  // Fluted cast-iron veranda pillars with capitals
  [-7.2, -2.5, 2.5, 7.2].forEach((px) => {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.36), plasterMat);
    base.position.set(px, 0.17, 5.55);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.13, 3.15, 12), greenIronMat);
    post.position.set(px, 1.75, 5.55);
    post.castShadow = true;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.32), greenIronMat);
    cap.position.set(px, 3.22, 5.55);
    group.add(base, post, cap);
  });

  // Main arched wooden entrance doorway + flanking louvered windows
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(2.15, 2.85, 0.28), plasterMat);
  doorFrame.position.set(0, 1.42, 2.62);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.64, 2.58, 0.16), teakMat);
  door.position.set(0, 1.29, 2.69);
  const transom = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.34, 0.14), glassMat);
  transom.position.set(0, 2.45, 2.7);
  group.add(doorFrame, door, transom);

  [-5.0, 5.0].forEach((wx) => {
    const winFrame = new THREE.Mesh(new THREE.BoxGeometry(2.25, 1.72, 0.24), plasterMat);
    winFrame.position.set(wx, 2.0, 2.62);
    const winGlass = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.34, 0.14), glassMat);
    winGlass.position.set(wx, 2.0, 2.69);
    const mullionV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.34, 0.18), teakMat);
    mullionV.position.set(wx, 2.0, 2.71);
    const mullionH = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.18), teakMat);
    mullionH.position.set(wx, 2.0, 2.71);
    const shutterL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.48, 0.12), greenIronMat);
    shutterL.position.set(wx - 1.18, 2.0, 2.71);
    const shutterR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.48, 0.12), greenIronMat);
    shutterR.position.set(wx + 1.18, 2.0, 2.71);
    group.add(winFrame, winGlass, mullionV, mullionH, shutterL, shutterR);
  });

  // Office Signboard mounted cleanly on veranda fascia (never occluded by awning)
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(5.6, 1.05, 0.14),
    new THREE.MeshStandardMaterial({ map: signTex, color: 0xffffff, roughness: 0.42 }),
  );
  sign.position.set(0, 3.35, 5.72);
  group.add(sign);

  // Exterior Dispatch Desk + Brass Station Bell + Warm Desk Lamp on veranda
  const desk = new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.0, 0.92), teakMat);
  desk.position.set(2.5, 0.5, 3.6);
  desk.castShadow = true;
  group.add(desk);

  const ledger = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.08, 0.4),
    new THREE.MeshStandardMaterial({ color: 0xf9f3df, roughness: 0.7 }),
  );
  ledger.position.set(2.15, 1.04, 3.6);
  group.add(ledger);

  const bellStand = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.14, 0.35, 12), brassMat);
  bellStand.position.set(3.15, 1.18, 3.6);
  const bellDome = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), brassMat);
  bellDome.position.set(3.15, 1.32, 3.6);
  group.add(bellStand, bellDome);

  return group;
}

export type TrainLivery =
  | 'green-red'
  | 'red-cream'
  | 'teal-amber'
  | 'blue-gold'
  | 'maroon-ochre'
  | 'olive-amber'
  | 'steel-orange';

const TRAIN_PALETTES: Record<
  TrainLivery,
  { primary: number; accent: number; stripe: number; roof: number }
> = {
  'green-red': { primary: 0x0d6e45, accent: 0xd6361f, stripe: 0xf7ebd2, roof: 0xb7bcc2 },
  'red-cream': { primary: 0xb52624, accent: 0xf4e8ce, stripe: 0xebb948, roof: 0xc2c6cc },
  'teal-amber': { primary: 0x13606e, accent: 0xe68d24, stripe: 0xf7ebd2, roof: 0xbec3c7 },
  'blue-gold': { primary: 0x17488a, accent: 0xe6b437, stripe: 0xf9f3dc, roof: 0xd0d6de },
  'maroon-ochre': { primary: 0x7c2520, accent: 0xd89336, stripe: 0xf0dfb8, roof: 0x9aa0a6 },
  'olive-amber': { primary: 0x3b4d2b, accent: 0xd98218, stripe: 0xf0c94d, roof: 0x565c54 },
  'steel-orange': { primary: 0x364b63, accent: 0xe55d1c, stripe: 0xf4e9cd, roof: 0x6c757d },
};

function createLocomotive(livery: TrainLivery, facingEast: boolean): THREE.Group {
  const loco = new THREE.Group();
  const palette = TRAIN_PALETTES[livery];

  const primaryMat = new THREE.MeshPhysicalMaterial({
    color: palette.primary,
    roughness: 0.32,
    metalness: 0.28,
    clearcoat: 0.55,
    clearcoatRoughness: 0.22,
  });
  const accentMat = new THREE.MeshPhysicalMaterial({
    color: palette.accent,
    roughness: 0.34,
    metalness: 0.22,
    clearcoat: 0.5,
  });
  const stripeMat = new THREE.MeshStandardMaterial({ color: palette.stripe, roughness: 0.42 });
  const chassisMat = new THREE.MeshStandardMaterial({ color: 0x1f2328, roughness: 0.58, metalness: 0.55 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x868f99, roughness: 0.24, metalness: 0.88 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x1d3544,
    roughness: 0.08,
    metalness: 0.35,
    clearcoat: 0.95,
    reflectivity: 0.95,
  });
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xfff3c4,
    emissive: 0xffd269,
    emissiveIntensity: 1.6,
    roughness: 0.18,
  });

  // Heavy underframe chassis + fuel tank
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(11.0, 0.55, 2.48), chassisMat);
  chassis.position.y = 0.82;
  chassis.castShadow = true;
  loco.add(chassis);

  const fuelTank = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.48, 1.85), chassisMat);
  fuelTank.position.set(0, 0.52, 0);
  loco.add(fuelTank);

  // Sloped cowcatcher / buffer beam
  const bufferBeam = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.68, 2.55), accentMat);
  bufferBeam.position.set(5.55, 0.78, 0);
  loco.add(bufferBeam);

  // Detailed Bogies, coil springs & 6 pairs of steel wheels
  [-3.25, 3.25].forEach((bx) => {
    const bogieFrame = new THREE.Mesh(new THREE.BoxGeometry(3.15, 0.34, 2.15), chassisMat);
    bogieFrame.position.set(bx, 0.46, 0);
    loco.add(bogieFrame);

    [-1.0, 0, 1.0].forEach((wx) => {
      [-0.86, 0.86].forEach((wz) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.39, 0.17, 16), steelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(bx + wx, 0.39, wz);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.22, 10), chassisMat);
        hub.rotation.x = Math.PI / 2;
        hub.position.set(bx + wx, 0.39, wz);
        loco.add(wheel, hub);
      });
    });
  });

  // Sleek Beveled Diesel Hood & Sloped Cab (ExtrudeGeometry side silhouette)
  const bodyShape = new THREE.Shape();
  bodyShape.moveTo(-4.9, 1.08);
  bodyShape.lineTo(5.3, 1.08);
  bodyShape.lineTo(5.45, 2.1);
  bodyShape.lineTo(4.2, 2.48);
  bodyShape.lineTo(3.95, 3.38);
  bodyShape.lineTo(1.5, 3.45);
  bodyShape.lineTo(1.3, 3.16);
  bodyShape.lineTo(-4.9, 3.16);
  bodyShape.closePath();

  const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, {
    depth: 2.26,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.07,
    bevelSegments: 2,
  });
  bodyGeo.translate(0, 0, -1.13);
  const bodyMesh = new THREE.Mesh(bodyGeo, primaryMat);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  loco.add(bodyMesh);

  // Accent nose & cab band
  const cabBand = new THREE.Mesh(new THREE.BoxGeometry(2.45, 1.25, 2.44), accentMat);
  cabBand.position.set(2.75, 2.25, 0);
  loco.add(cabBand);

  // Crisp livery stripe along full flank
  const stripeL = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.2, 2.45), stripeMat);
  stripeL.position.set(0.2, 1.6, 0);
  loco.add(stripeL);

  // Angled cab windshields + side cab windows + grab handrails
  const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.66, 1.88), glassMat);
  frontGlass.position.set(4.1, 2.94, 0);
  frontGlass.rotation.z = 0.24;
  loco.add(frontGlass);

  const sideWin = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.62, 2.46), glassMat);
  sideWin.position.set(2.75, 2.86, 0);
  loco.add(sideWin);

  [-1.18, 1.18].forEach((gz) => {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 8.8, 8), steelMat);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(-0.3, 1.22, gz);
    loco.add(rail);
  });

  // Roof exhaust stack & twin cooling fans
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.45, 12), chassisMat);
  exhaust.position.set(-1.1, 3.36, 0);
  [-2.6, -3.9].forEach((fx) => {
    const fanRim = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.56, 0.16, 14), steelMat);
    fanRim.position.set(fx, 3.24, 0);
    loco.add(fanRim);
  });
  loco.add(exhaust);

  // Headlamp bezel & warm beam lens
  const lampBezel = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.14, 14), steelMat);
  lampBezel.rotation.z = Math.PI / 2;
  lampBezel.position.set(5.44, 2.18, 0);
  const headlamp = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.16, 14), lampMat);
  headlamp.rotation.z = Math.PI / 2;
  headlamp.position.set(5.46, 2.18, 0);
  loco.add(lampBezel, headlamp);

  if (!facingEast) {
    loco.rotation.y = Math.PI;
  }
  return loco;
}

function createWagonUnderframe(): THREE.Group {
  const base = new THREE.Group();
  const chassisMat = new THREE.MeshStandardMaterial({ color: 0x1f2328, roughness: 0.62, metalness: 0.48 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x7e8791, roughness: 0.26, metalness: 0.88 });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.42, 2.35), chassisMat);
  chassis.position.y = 0.76;
  base.add(chassis);

  [-3.4, 3.4].forEach((bx) => {
    const bogie = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.32, 2.08), chassisMat);
    bogie.position.set(bx, 0.42, 0);
    base.add(bogie);
    [-0.75, 0.75].forEach((wx) => {
      [-0.83, 0.83].forEach((wz) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.16, 14), steelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(bx + wx, 0.35, wz);
        base.add(wheel);
      });
    });
  });

  return base;
}

const COACH_PLATE_LABELS: readonly [string, string][] = [
  ['KA-01', 'ক-১'],
  ['KHA-02', 'খ-২'],
  ['GA-03', 'গ-৩'],
  ['GHA-04', 'ঘ-৪'],
];

interface SlidingDoorPair {
  baseX: number;
  leafL: THREE.Mesh;
  leafR: THREE.Mesh;
}

function createPassengerCoach(
  livery: TrainLivery,
  acRoof = true,
  coachIndex = 0,
): {
  group: THREE.Group;
  setDoorOpen: (progress: number, obstructed?: boolean) => void;
} {
  const coach = createWagonUnderframe();
  const palette = TRAIN_PALETTES[livery];

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: palette.primary,
    roughness: 0.36,
    metalness: 0.22,
    clearcoat: 0.48,
    clearcoatRoughness: 0.25,
  });
  const stripeMat = new THREE.MeshStandardMaterial({ color: palette.accent, roughness: 0.45 });
  const trimMat = new THREE.MeshStandardMaterial({ color: palette.stripe, roughness: 0.45 });
  const roofMat = new THREE.MeshStandardMaterial({ color: palette.roof, roughness: 0.48, metalness: 0.35 });
  const vestibuleMat = new THREE.MeshStandardMaterial({ color: 0x101815, roughness: 0.92 });
  const windowMat = new THREE.MeshPhysicalMaterial({
    color: 0x203a4c,
    roughness: 0.1,
    metalness: 0.35,
    clearcoat: 0.9,
  });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x7e8791, roughness: 0.26, metalness: 0.88 });
  const doorBeaconMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0x16a34a,
    emissiveIntensity: 0.2,
    roughness: 0.25,
  });

  // Main passenger shell
  const shell = new THREE.Mesh(new THREE.BoxGeometry(10.6, 2.25, 2.42), bodyMat);
  shell.position.y = 2.08;
  shell.castShadow = true;
  shell.receiveShadow = true;
  coach.add(shell);

  // Curved coach roof + optional AC/vent pods
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.22, 10.6, 14, 1, false, 0, Math.PI), roofMat);
  roof.rotation.z = Math.PI / 2;
  roof.rotation.x = Math.PI / 2;
  roof.scale.set(1, 0.34, 1);
  roof.position.y = 3.2;
  coach.add(roof);

  if (acRoof) {
    [-2.6, 2.6].forEach((vx) => {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.18, 1.18), roofMat);
      vent.position.set(vx, 3.63, 0);
      coach.add(vent);
    });
  }

  // Dual livery stripe bands
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(10.64, 0.3, 2.46), stripeMat);
  stripe.position.y = 1.62;
  const upperTrim = new THREE.Mesh(new THREE.BoxGeometry(10.64, 0.12, 2.45), trimMat);
  upperTrim.position.y = 2.95;
  coach.add(stripe, upperTrim);

  // Painted coach number plates (English + Bengali) on both coach flanks
  const platePair = COACH_PLATE_LABELS[coachIndex % COACH_PLATE_LABELS.length];
  const plateTex = createCoachNumberPlateTexture(platePair[0], platePair[1], '#f5c756', '#102419', 2);
  const plateMat = new THREE.MeshStandardMaterial({ map: plateTex, color: 0xffffff, roughness: 0.4 });
  [-1.23, 1.23].forEach((pz) => {
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.44), plateMat);
    plate.position.set(0, 1.56, pz + (pz > 0 ? 0.015 : -0.015));
    if (pz < 0) plate.rotation.y = Math.PI;
    coach.add(plate);
  });

  // Framed windows + animated dual-leaf sliding vestibule doors along both sides
  const slidingDoors: SlidingDoorPair[] = [];
  for (let i = -4; i <= 4; i++) {
    if (i === -4 || i === 4) {
      const baseX = i * 1.12;
      // Dark doorway vestibule recess so opening doors reveal entry opening clearly
      const recess = new THREE.Mesh(new THREE.BoxGeometry(0.84, 1.82, 2.45), vestibuleMat);
      recess.position.set(baseX, 1.98, 0);
      const frameTop = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.1, 2.48), steelMat);
      frameTop.position.set(baseX, 2.92, 0);
      coach.add(recess, frameTop);

      // Doorway status lamp (green when open, red when obstructed)
      [-1.25, 1.25].forEach((sz) => {
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.06), doorBeaconMat);
        lamp.position.set(baseX, 2.98, sz);
        coach.add(lamp);
      });

      // Two sliding door leaves per side
      [-1.24, 1.24].forEach((sz) => {
        const leafL = new THREE.Mesh(new THREE.BoxGeometry(0.41, 1.78, 0.06), stripeMat);
        leafL.position.set(baseX - 0.21, 1.98, sz);
        const winL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.56, 0.075), windowMat);
        winL.position.set(0, 0.34, 0);
        leafL.add(winL);

        const leafR = new THREE.Mesh(new THREE.BoxGeometry(0.41, 1.78, 0.06), stripeMat);
        leafR.position.set(baseX + 0.21, 1.98, sz);
        const winR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.56, 0.075), windowMat);
        winR.position.set(0, 0.34, 0);
        leafR.add(winR);

        coach.add(leafL, leafR);
        slidingDoors.push({ baseX, leafL, leafR });
      });
    } else {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 2.46), steelMat);
      frame.position.set(i * 1.12, 2.32, 0);
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.68, 2.49), windowMat);
      win.position.set(i * 1.12, 2.32, 0);
      coach.add(frame, win);
    }
  }

  const setDoorOpen = (progress: number, obstructed = false) => {
    const clamped = Math.max(0, Math.min(1, progress));
    const slide = clamped * 0.37;
    for (let i = 0; i < slidingDoors.length; i++) {
      const d = slidingDoors[i];
      d.leafL.position.x = d.baseX - 0.21 - slide;
      d.leafR.position.x = d.baseX + 0.21 + slide;
    }
    if (obstructed) {
      doorBeaconMat.color.setHex(0xff3b2f);
      doorBeaconMat.emissive.setHex(0xff2a1f);
      doorBeaconMat.emissiveIntensity = 1.6;
    } else if (clamped > 0.15) {
      doorBeaconMat.color.setHex(0x4ade80);
      doorBeaconMat.emissive.setHex(0x16a34a);
      doorBeaconMat.emissiveIntensity = 1.1;
    } else {
      doorBeaconMat.color.setHex(0x94a3b8);
      doorBeaconMat.emissive.setHex(0x1e293b);
      doorBeaconMat.emissiveIntensity = 0.1;
    }
  };

  return { group: coach, setDoorOpen };
}

function createFreightWagon(kind: 'boxcar' | 'tanker' | 'hopper'): THREE.Group {
  const wagon = createWagonUnderframe();

  if (kind === 'tanker') {
    const tankMat = new THREE.MeshPhysicalMaterial({
      color: 0x3b4248,
      roughness: 0.38,
      metalness: 0.5,
      clearcoat: 0.25,
    });
    const bandMat = new THREE.MeshStandardMaterial({ color: 0xe68d24, roughness: 0.45 });
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 1.06, 9.6, 16), tankMat);
    tank.rotation.z = Math.PI / 2;
    tank.position.y = 2.15;
    tank.castShadow = true;
    const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.34, 12), bandMat);
    dome.position.y = 3.25;
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.08, 0.65, 16), bandMat);
    stripe.rotation.z = Math.PI / 2;
    stripe.position.y = 2.15;
    wagon.add(tank, dome, stripe);
  } else if (kind === 'hopper') {
    const hopperMat = new THREE.MeshStandardMaterial({ color: 0x6f432c, roughness: 0.72, metalness: 0.25 });
    const coalMat = new THREE.MeshStandardMaterial({ color: 0x26282b, roughness: 0.95 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(10.0, 1.65, 2.36), hopperMat);
    body.position.y = 1.82;
    body.castShadow = true;
    const load = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.42, 2.05), coalMat);
    load.position.y = 2.68;
    wagon.add(body, load);
  } else {
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x8d4227, roughness: 0.68, metalness: 0.2 });
    const doorMat = new THREE.MeshStandardMaterial({ color: 0xd99b26, roughness: 0.55 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(10.2, 2.35, 2.42), boxMat);
    box.position.y = 2.15;
    box.castShadow = true;
    const slidingDoor = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.1, 2.48), doorMat);
    slidingDoor.position.y = 2.1;
    wagon.add(box, slidingDoor);
  }

  return wagon;
}

function createContainerFlatcar(variantIndex: number): THREE.Group {
  const flatcar = createWagonUnderframe();
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x394452, roughness: 0.65, metalness: 0.45 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.2, 2.44), deckMat);
  deck.position.y = 1.05;
  flatcar.add(deck);

  const containerColors = [0xc9382b, 0x1e5c8a, 0x16805a, 0xd49424];
  const colorA = containerColors[variantIndex % containerColors.length];
  const colorB = containerColors[(variantIndex + 2) % containerColors.length];

  [-2.55, 2.55].forEach((cx, idx) => {
    const mat = new THREE.MeshStandardMaterial({
      color: idx === 0 ? colorA : colorB,
      roughness: 0.52,
      metalness: 0.28,
    });
    const box = new THREE.Mesh(new THREE.BoxGeometry(4.85, 2.15, 2.28), mat);
    box.position.set(cx, 2.22, 0);
    box.castShadow = true;
    box.receiveShadow = true;
    flatcar.add(box);
  });

  return flatcar;
}

export interface TrainModelController {
  group: THREE.Group;
  setDoorOpen: (progress: number, obstructedCoachIdx?: number | null) => void;
}

export function createTrainByCategory(
  category: TrainCategory,
  coachCount: number,
  facingEast: boolean,
): TrainModelController {
  const train = new THREE.Group();
  const dir = facingEast ? 1 : -1;

  const liveryByCategory: Record<TrainCategory, TrainLivery> = {
    intercity: 'green-red',
    international: 'blue-gold',
    mail: 'red-cream',
    commuter: 'teal-amber',
    local: 'maroon-ochre',
    freight: 'olive-amber',
    container: 'steel-orange',
  };

  const livery = liveryByCategory[category];
  const loco = createLocomotive(livery, facingEast);
  const locoOffset = ((coachCount * 11.1) / 2) * dir;
  loco.position.x = locoOffset;
  train.add(loco);

  const coachControllers: { idx: number; setDoorOpen: (p: number, obs?: boolean) => void }[] = [];

  for (let i = 0; i < coachCount; i++) {
    let unit: THREE.Group;
    if (category === 'freight') {
      const kinds: ('boxcar' | 'tanker' | 'hopper')[] = ['boxcar', 'tanker', 'hopper'];
      unit = createFreightWagon(kinds[i % kinds.length]);
    } else if (category === 'container') {
      unit = createContainerFlatcar(i);
    } else {
      const hasAc = category === 'intercity' || category === 'international';
      const built = createPassengerCoach(livery, hasAc, i);
      unit = built.group;
      coachControllers.push({ idx: i, setDoorOpen: built.setDoorOpen });
    }
    unit.position.x = locoOffset - (i + 1) * 11.1 * dir;
    train.add(unit);
  }

  const setDoorOpen = (progress: number, obstructedCoachIdx: number | null = null) => {
    for (let i = 0; i < coachControllers.length; i++) {
      const c = coachControllers[i];
      c.setDoorOpen(progress, obstructedCoachIdx === c.idx);
    }
  };

  return { group: train, setDoorOpen };
}

export function createTrain(livery: TrainLivery, coachCount: number, facingEast: boolean): THREE.Group {
  const train = new THREE.Group();
  const dir = facingEast ? 1 : -1;

  const loco = createLocomotive(livery, facingEast);
  const locoOffset = ((coachCount * 11.1) / 2) * dir;
  loco.position.x = locoOffset;
  train.add(loco);

  for (let i = 0; i < coachCount; i++) {
    const coach = createPassengerCoach(livery, true, i);
    coach.group.position.x = locoOffset - (i + 1) * 11.1 * dir;
    train.add(coach.group);
  }

  return train;
}

export interface RailwaySwitchVisual {
  group: THREE.Group;
  setPosition: (pos: SwitchPosition) => void;
}

export function createRailwaySwitchVisual(): RailwaySwitchVisual {
  const group = new THREE.Group();
  const railMat = new THREE.MeshStandardMaterial({ color: 0xa2abb5, roughness: 0.24, metalness: 0.88 });
  const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x4d3423, roughness: 0.88 });
  const boxMat = new THREE.MeshStandardMaterial({ color: 0x262b30, roughness: 0.45, metalness: 0.7 });
  const indicatorMat = new THREE.MeshStandardMaterial({
    color: 0xffd140,
    emissive: 0xffaa00,
    emissiveIntensity: 0.9,
    roughness: 0.25,
  });

  // Angled crossover rail pair bridging Track 1 (z = -3) and Track 2 (z = +3)
  const diagLen = Math.hypot(9.0, 6.0);
  const angle = Math.atan2(6.0, 9.0);
  [-0.72, 0.72].forEach((offsetZ) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(diagLen, 0.1, 0.1), railMat);
    rail.position.set(0, 0.2, offsetZ);
    rail.rotation.y = -angle;
    group.add(rail);
  });

  for (let i = -3; i <= 3; i++) {
    const t = i / 3;
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.09, 2.35), sleeperMat);
    tie.position.set(t * 4.2, 0.12, t * 2.8);
    tie.rotation.y = -angle;
    group.add(tie);
  }

  // Point machine box & rotating switch target vane beside Track 1
  const pointBox = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.42, 0.55), boxMat);
  pointBox.position.set(-4.2, 0.28, -4.6);
  const vanePivot = new THREE.Group();
  vanePivot.position.set(-4.2, 0.85, -4.6);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 8), boxMat);
  mast.position.y = -0.25;
  const vane = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.24, 0.08), indicatorMat);
  vanePivot.add(mast, vane);
  group.add(pointBox, vanePivot);

  const setPosition = (pos: SwitchPosition) => {
    if (pos === 'crossover') {
      vanePivot.rotation.y = Math.PI / 2;
      indicatorMat.color.setHex(0xffb830);
      indicatorMat.emissive.setHex(0xff9900);
    } else {
      vanePivot.rotation.y = 0;
      indicatorMat.color.setHex(0x28e076);
      indicatorMat.emissive.setHex(0x16b858);
    }
  };

  setPosition('straight');
  return { group, setPosition };
}

export interface TrackOccupancyBeacon {
  group: THREE.Group;
  setOccupied: (occupied: boolean) => void;
}

export function createTrackOccupancyBeacon(): TrackOccupancyBeacon {
  const group = new THREE.Group();
  const postMat = new THREE.MeshStandardMaterial({ color: 0x262b30, roughness: 0.45, metalness: 0.65 });
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0x1ee66b,
    emissive: 0x1ee66b,
    emissiveIntensity: 1.2,
    roughness: 0.2,
  });

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.35, 8), postMat);
  post.position.y = 0.675;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 0.28), postMat);
  head.position.y = 1.45;
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), lampMat);
  lamp.position.y = 1.65;
  group.add(post, head, lamp);

  const setOccupied = (occupied: boolean) => {
    if (occupied) {
      lampMat.color.setHex(0xff3b2f);
      lampMat.emissive.setHex(0xff2a1f);
    } else {
      lampMat.color.setHex(0x1ee66b);
      lampMat.emissive.setHex(0x16c95b);
    }
  };

  setOccupied(false);
  return { group, setOccupied };
}

export interface SemaphoreSignalController {
  group: THREE.Group;
  setAspect: (aspect: SignalAspect) => void;
}

export function createSemaphoreSignal(): SemaphoreSignalController {
  const group = new THREE.Group();

  const plinthMat = new THREE.MeshStandardMaterial({ color: 0xb7b1a6, roughness: 0.85 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0xd8dce0, roughness: 0.38, metalness: 0.55 });
  const darkIronMat = new THREE.MeshStandardMaterial({ color: 0x262b30, roughness: 0.45, metalness: 0.7 });
  const redBladeMat = new THREE.MeshStandardMaterial({ color: 0xd82b23, roughness: 0.4 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8f6f0, roughness: 0.48 });

  const redLampMat = new THREE.MeshStandardMaterial({
    color: 0xff2a1f,
    emissive: 0xff2a1f,
    emissiveIntensity: 1.6,
    roughness: 0.2,
  });
  const yellowLampMat = new THREE.MeshStandardMaterial({
    color: 0xffbe24,
    emissive: 0xffae00,
    emissiveIntensity: 0.08,
    roughness: 0.2,
  });
  const greenLampMat = new THREE.MeshStandardMaterial({
    color: 0x1ee66b,
    emissive: 0x1ee66b,
    emissiveIntensity: 0.08,
    roughness: 0.2,
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.9), plinthMat);
  base.position.y = 0.175;
  group.add(base);

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 5.4, 10), steelMat);
  post.position.y = 2.85;
  post.castShadow = true;
  group.add(post);

  const ladderSideL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 4.4, 0.03), darkIronMat);
  ladderSideL.position.set(-0.18, 2.35, -0.14);
  const ladderSideR = new THREE.Mesh(new THREE.BoxGeometry(0.03, 4.4, 0.03), darkIronMat);
  ladderSideR.position.set(0.18, 2.35, -0.14);
  group.add(ladderSideL, ladderSideR);

  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.45, 10), darkIronMat);
  finial.position.y = 5.75;
  group.add(finial);

  const armPivot = new THREE.Group();
  armPivot.position.set(0, 5.0, 0.16);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.28, 0.06), redBladeMat);
  blade.position.x = 0.6;
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.29, 0.07), whiteMat);
  stripe.position.x = 0.95;
  armPivot.add(blade, stripe);
  group.add(armPivot);

  const lampBox = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.94, 0.4), darkIronMat);
  lampBox.position.set(0, 4.15, 0);
  group.add(lampBox);

  const redBulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), redLampMat);
  redBulb.position.set(0, 4.42, 0.21);
  const yellowBulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), yellowLampMat);
  yellowBulb.position.set(0, 4.15, 0.21);
  const greenBulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), greenLampMat);
  greenBulb.position.set(0, 3.88, 0.21);
  group.add(redBulb, yellowBulb, greenBulb);

  const setAspect = (aspect: SignalAspect) => {
    if (aspect === 'green') {
      armPivot.rotation.z = -Math.PI * 0.26;
      redLampMat.emissiveIntensity = 0.08;
      yellowLampMat.emissiveIntensity = 0.08;
      greenLampMat.emissiveIntensity = 1.9;
    } else if (aspect === 'yellow') {
      armPivot.rotation.z = -Math.PI * 0.13;
      redLampMat.emissiveIntensity = 0.08;
      yellowLampMat.emissiveIntensity = 1.9;
      greenLampMat.emissiveIntensity = 0.08;
    } else {
      armPivot.rotation.z = 0;
      redLampMat.emissiveIntensity = 1.9;
      yellowLampMat.emissiveIntensity = 0.08;
      greenLampMat.emissiveIntensity = 0.08;
    }
  };

  setAspect('red');
  return { group, setAspect };
}

export function createFoodStall(
  titleBn: string,
  titleEn: string,
  awningColor: number,
  maxAnisotropy: number,
): THREE.Group {
  const group = new THREE.Group();

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x724423, roughness: 0.74 });
  const counterMat = new THREE.MeshStandardMaterial({ color: 0xdca96c, roughness: 0.52 });
  const awningMat = new THREE.MeshStandardMaterial({ color: awningColor, roughness: 0.52 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xfbf4df, roughness: 0.56 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xe6b647, roughness: 0.22, metalness: 0.88 });
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xffe49c,
    emissive: 0xffb838,
    emissiveIntensity: 1.2,
    roughness: 0.24,
  });

  const booth = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.05, 1.8), woodMat);
  booth.position.y = 0.525;
  booth.castShadow = true;
  booth.receiveShadow = true;
  group.add(booth);

  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(3.65, 0.12, 2.05), counterMat);
  counterTop.position.y = 1.08;
  group.add(counterTop);

  [-1.55, 1.55].forEach((px) => {
    [-0.78, 0.78].forEach((pz) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.65, 10), woodMat);
      post.position.set(px, 1.9, pz);
      group.add(post);
    });
  });

  const roof = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.14, 2.5), awningMat);
  roof.position.set(0, 2.75, 0.1);
  roof.rotation.x = 0.12;
  roof.castShadow = true;
  group.add(roof);

  const roofTrim = new THREE.Mesh(new THREE.BoxGeometry(3.92, 0.18, 0.12), stripeMat);
  roofTrim.position.set(0, 2.58, 1.32);
  group.add(roofTrim);

  // Brass tea samovar / kettle & glass snack jars
  const kettle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.36, 12), brassMat);
  kettle.position.set(-0.8, 1.31, 0.35);
  const kettleLid = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.14, 12), brassMat);
  kettleLid.position.set(-0.8, 1.55, 0.35);
  group.add(kettle, kettleLid);

  const jarMat = new THREE.MeshPhysicalMaterial({
    color: 0xf4a942,
    roughness: 0.12,
    transparent: true,
    opacity: 0.84,
    clearcoat: 0.8,
  });
  [0.2, 0.65, 1.1].forEach((jx) => {
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.32, 12), jarMat);
    jar.position.set(jx, 1.3, 0.45);
    group.add(jar);
  });

  const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), lanternMat);
  lantern.position.set(0, 2.38, 0.95);
  group.add(lantern);

  const signTex = createSignboardTexture(titleBn, titleEn, '#f8edd2', '#2b1f14', maxAnisotropy);
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(2.7, 0.62, 0.08),
    new THREE.MeshStandardMaterial({ map: signTex, color: 0xffffff, roughness: 0.46 }),
  );
  sign.position.set(0, 2.85, 1.25);
  group.add(sign);

  return group;
}

export interface CrossingController {
  group: THREE.Group;
  update: (closed: boolean, dt: number, elapsed: number) => void;
}

export function createLevelCrossing(): CrossingController {
  const group = new THREE.Group();

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x3b3d42, roughness: 0.88 });
  const plankMat = new THREE.MeshStandardMaterial({ color: 0x70563c, roughness: 0.84 });
  const postMat = new THREE.MeshStandardMaterial({ color: 0x2a2f35, roughness: 0.42, metalness: 0.65 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xd92e24, roughness: 0.4 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8f6f2, roughness: 0.48 });
  const hutWallMat = new THREE.MeshStandardMaterial({ color: 0xf2e4c9, roughness: 0.76 });
  const hutRoofMat = new THREE.MeshStandardMaterial({ color: 0x206044, roughness: 0.46 });

  const apron = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.14, 10.4), plankMat);
  apron.position.set(0, 0.06, 0);
  apron.receiveShadow = true;
  group.add(apron);

  const roadN = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.06, 44), roadMat);
  roadN.position.set(0, 0.02, -27);
  roadN.receiveShadow = true;
  const roadS = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.06, 44), roadMat);
  roadS.position.set(0, 0.02, 27);
  roadS.receiveShadow = true;
  group.add(roadN, roadS);

  // Dashed road centerline
  for (let rz = -42; rz <= 42; rz += 5) {
    if (Math.abs(rz) < 7) continue;
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 2.2), whiteMat);
    dash.position.set(0, 0.055, rz);
    group.add(dash);
  }

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.5, 2.6), hutWallMat);
  cabin.position.set(-5.2, 1.25, -7.2);
  cabin.castShadow = true;
  const cabinRoof = new THREE.Mesh(new THREE.ConeGeometry(2.3, 1.0, 4), hutRoofMat);
  cabinRoof.rotation.y = Math.PI / 4;
  cabinRoof.position.set(-5.2, 3.0, -7.2);
  group.add(cabin, cabinRoof);

  const makeBarrier = (zPos: number, dirX: number) => {
    const pivotPost = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 1.35, 12), postMat);
    pivotPost.position.set(-3.4 * dirX, 0.675, zPos);
    group.add(pivotPost);

    const armPivot = new THREE.Group();
    armPivot.position.set(-3.4 * dirX, 1.1, zPos);

    for (let i = 0; i < 6; i++) {
      const seg = new THREE.Mesh(
        new THREE.BoxGeometry(1.15, 0.14, 0.12),
        i % 2 === 0 ? redMat : whiteMat,
      );
      seg.position.x = (0.65 + i * 1.15) * dirX;
      armPivot.add(seg);
    }

    group.add(armPivot);
    return armPivot;
  };

  const armNorth = makeBarrier(-5.8, 1);
  const armSouth = makeBarrier(5.8, -1);

  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xff3b2f,
    emissive: 0xff3b2f,
    emissiveIntensity: 0.1,
    roughness: 0.22,
  });
  const warnPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 10), postMat);
  warnPost.position.set(3.8, 1.6, -6.2);
  const warnLamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), lampMat);
  warnLamp.position.set(3.8, 3.25, -6.2);
  group.add(warnPost, warnLamp);

  let currentAngle = Math.PI * 0.42;

  const update = (closed: boolean, dt: number, elapsed: number) => {
    const targetAngle = closed ? 0 : Math.PI * 0.42;
    const alpha = 1 - Math.exp(-6 * dt);
    currentAngle = THREE.MathUtils.lerp(currentAngle, targetAngle, alpha);
    armNorth.rotation.z = currentAngle;
    armSouth.rotation.z = -currentAngle;

    if (closed) {
      lampMat.emissiveIntensity = Math.sin(elapsed * 7) > 0 ? 1.85 : 0.15;
    } else {
      lampMat.emissiveIntensity = 0.1;
    }
  };

  return { group, update };
}

export function createStationBench(): THREE.Group {
  const group = new THREE.Group();
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1b4c39, roughness: 0.4, metalness: 0.55 });
  const slatMat = new THREE.MeshStandardMaterial({ color: 0x8f562b, roughness: 0.65 });

  [-0.85, 0.85].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.56), ironMat);
    leg.position.set(lx, 0.225, 0);
    group.add(leg);
  });

  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 0.56), slatMat);
  seat.position.y = 0.46;
  seat.castShadow = true;
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.42, 0.08), slatMat);
  back.position.set(0, 0.74, -0.24);
  back.rotation.x = -0.15;
  back.castShadow = true;
  group.add(seat, back);

  return group;
}

export function createStreetlight(sharedBulbMat?: THREE.MeshStandardMaterial): THREE.Group {
  const group = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e352a, roughness: 0.38, metalness: 0.7 });
  const bulbMat =
    sharedBulbMat ??
    new THREE.MeshStandardMaterial({
      color: 0xfff0be,
      emissive: 0xffcc66,
      emissiveIntensity: 1.0,
      roughness: 0.2,
    });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.5, 12), poleMat);
  base.position.y = 0.25;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 4.4, 12), poleMat);
  shaft.position.y = 2.5;
  shaft.castShadow = true;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.09, 0.09), poleMat);
  arm.position.set(0.36, 4.65, 0);
  const lampHead = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.22, 12), poleMat);
  lampHead.position.set(0.75, 4.62, 0);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), bulbMat);
  bulb.position.set(0.75, 4.48, 0);

  group.add(base, shaft, arm, lampHead, bulb);
  return group;
}

export function createRickshaw(): THREE.Group {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0x149873, roughness: 0.34, clearcoat: 0.45 });
  const hoodMat = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.52 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xf4b41a, roughness: 0.32 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1f2226, roughness: 0.75 });
  const spokeMat = new THREE.MeshStandardMaterial({ color: 0xc8cdd2, roughness: 0.26, metalness: 0.85 });

  const wheelCoords: [number, number][] = [
    [-0.58, -0.52],
    [0.58, -0.52],
    [0, 0.95],
  ];
  wheelCoords.forEach(([wx, wz]) => {
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.055, 10, 20), wheelMat);
    tire.rotation.y = Math.PI / 2;
    tire.position.set(wx, 0.36, wz);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 10), spokeMat);
    hub.rotation.z = Math.PI / 2;
    hub.position.set(wx, 0.36, wz);
    group.add(tire, hub);
  });

  const seatBase = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.42, 0.95), bodyMat);
  seatBase.position.set(0, 0.65, -0.45);
  seatBase.castShadow = true;
  const seatTrim = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.1, 0.98), trimMat);
  seatTrim.position.set(0, 0.86, -0.45);
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.06, 12, 1, false, 0, Math.PI), hoodMat);
  hood.rotation.z = Math.PI / 2;
  hood.position.set(0, 1.32, -0.55);
  hood.castShadow = true;

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.85, 8), spokeMat);
  stem.position.set(0, 0.82, 0.82);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 0.05), spokeMat);
  handle.position.set(0, 1.24, 0.82);

  group.add(seatBase, seatTrim, hood, stem, handle);
  return group;
}

export function createVillageHouse(wallHex: number, roofHex: number, maxAnisotropy: number): THREE.Group {
  const group = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: wallHex, roughness: 0.8 });
  const roofTex = createCorrugatedTexture(`#${roofHex.toString(16).padStart(6, '0')}`, maxAnisotropy);
  const roofMat = new THREE.MeshStandardMaterial({ map: roofTex, color: 0xffffff, roughness: 0.45, metalness: 0.32 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.7 });

  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(5.6, 0.3, 4.6),
    new THREE.MeshStandardMaterial({ color: 0x9b8c78, roughness: 0.9 }),
  );
  plinth.position.y = 0.15;

  const walls = new THREE.Mesh(new THREE.BoxGeometry(5.0, 2.5, 4.0), wallMat);
  walls.position.y = 1.55;
  walls.castShadow = true;
  walls.receiveShadow = true;

  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.2, 1.6, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 3.55;
  roof.castShadow = true;

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.75, 0.12), woodMat);
  door.position.set(0, 1.18, 2.02);

  const winL = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 0.12), woodMat);
  winL.position.set(-1.45, 1.65, 2.02);
  const winR = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 0.12), woodMat);
  winR.position.set(1.45, 1.65, 2.02);

  group.add(plinth, walls, roof, door, winL, winR);
  return group;
}

export function createCoconutPalm(height = 7.5): THREE.Group {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7c5a43, roughness: 0.88 });
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x3b8c32, roughness: 0.62, side: THREE.DoubleSide });

  const segCount = 6;
  const segH = height / segCount;
  for (let i = 0; i < segCount; i++) {
    const rBot = 0.28 - i * 0.028;
    const rTop = 0.25 - i * 0.028;
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, segH + 0.06, 10), trunkMat);
    seg.position.set(Math.sin(i * 0.24) * 0.24, i * segH + segH * 0.5, 0);
    seg.rotation.z = -0.045 * i;
    seg.castShadow = true;
    group.add(seg);
  }

  const topX = Math.sin((segCount - 1) * 0.24) * 0.24;
  for (let f = 0; f < 7; f++) {
    const angle = (f / 7) * Math.PI * 2;
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.7, 6), frondMat);
    frond.position.set(topX + Math.cos(angle) * 1.15, height - 0.15, Math.sin(angle) * 1.15);
    frond.rotation.z = Math.PI * 0.62;
    frond.rotation.y = -angle;
    frond.castShadow = true;
    group.add(frond);
  }

  return group;
}

export function createBanyanTree(scale = 1): THREE.Group {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x624630, roughness: 0.9 });
  const leafMatA = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.72 });
  const leafMatB = new THREE.MeshStandardMaterial({ color: 0x439639, roughness: 0.72 });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.65, 2.9, 10), trunkMat);
  trunk.position.y = 1.45;
  trunk.castShadow = true;
  group.add(trunk);

  const puffs: [number, number, number, number, boolean][] = [
    [0, 3.7, 0, 2.15, true],
    [-1.25, 3.2, 0.7, 1.55, false],
    [1.3, 3.3, -0.5, 1.6, false],
    [0.2, 4.5, 0.4, 1.48, true],
  ];
  puffs.forEach(([px, py, pz, r, useA]) => {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 12), useA ? leafMatA : leafMatB);
    puff.scale.set(1.08, 0.86, 1.05);
    puff.position.set(px, py, pz);
    puff.castShadow = true;
    group.add(puff);
  });

  group.scale.setScalar(scale);
  return group;
}

export function createBananaClump(): THREE.Group {
  const group = new THREE.Group();
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x5c8a32, roughness: 0.7 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x68a836, roughness: 0.58, side: THREE.DoubleSide });

  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.9, 8), stemMat);
    stem.position.set(Math.cos(angle) * 0.25, 0.95, Math.sin(angle) * 0.25);
    group.add(stem);

    for (let l = 0; l < 3; l++) {
      const la = angle + l * 1.9;
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.04, 0.42), leafMat);
      leaf.position.set(Math.cos(la) * 0.55, 1.85, Math.sin(la) * 0.55);
      leaf.rotation.y = -la;
      leaf.rotation.z = -0.35;
      group.add(leaf);
    }
  }
  return group;
}

/**
 * Elevated steel-truss Footover Bridge spanning Track 1 & Track 2 at x = -24.
 * Matches groundHeightAt() slopes on North (z=-11) & South (z=+10.4) staircases.
 */
export function createFootoverBridge(): THREE.Group {
  const group = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x1e4d3b, roughness: 0.42, metalness: 0.55 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0xe6a825, roughness: 0.46 });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x5c646d, roughness: 0.85 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x2f6f57, roughness: 0.48, metalness: 0.35 });

  const deckY = 4.85;
  const spanLenZ = 22.8;

  // Main overhead walkway deck
  const walkway = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.24, spanLenZ), deckMat);
  walkway.position.set(0, deckY - 0.12, -0.3);
  walkway.castShadow = true;
  walkway.receiveShadow = true;
  group.add(walkway);

  // Side steel safety railings & truss verticals
  [-1.18, 1.18].forEach((rx) => {
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, spanLenZ), accentMat);
    topRail.position.set(rx, deckY + 1.02, -0.3);
    const midRail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, spanLenZ), steelMat);
    midRail.position.set(rx, deckY + 0.52, -0.3);
    group.add(topRail, midRail);

    for (let z = -11.2; z <= 10.6; z += 2.7) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.35, 0.09), steelMat);
      post.position.set(rx, deckY + 1.15, z);
      group.add(post);
    }
  });

  // Elevated shade roof
  const shadeRoof = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.1, spanLenZ + 0.4), roofMat);
  shadeRoof.position.set(0, deckY + 2.32, -0.3);
  shadeRoof.castShadow = true;
  group.add(shadeRoof);

  // North end safety guardrail (z = -11.65)
  const northEndTop = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.08, 0.08), accentMat);
  northEndTop.position.set(0, deckY + 1.02, -11.65);
  const northEndMid = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.06, 0.06), steelMat);
  northEndMid.position.set(0, deckY + 0.52, -11.65);
  group.add(northEndTop, northEndMid);

  // Support piers on North & South platforms (clear of tracks)
  [-6.8, 6.8].forEach((pz) => {
    [-1.1, 1.1].forEach((px) => {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(0.24, deckY - 0.65, 0.24), steelMat);
      pier.position.set(px, 0.65 + (deckY - 0.65) / 2, pz);
      pier.castShadow = true;
      group.add(pier);
    });
  });

  // Helper to build stepped ramps matching physics.ts groundHeightAt()
  const buildStairRun = (startX: number, endX: number, centerZ: number, stepCount: number) => {
    const dx = endX - startX;
    const dy = deckY - 0.65;
    const runLen = Math.hypot(dx, dy);
    const slopeAngle = Math.atan2(dy, dx);

    const stringer = new THREE.Mesh(new THREE.BoxGeometry(runLen, 0.22, 1.9), steelMat);
    stringer.position.set((startX + endX) / 2, 0.65 + dy / 2 - 0.1, centerZ);
    stringer.rotation.z = slopeAngle;
    stringer.castShadow = true;
    group.add(stringer);

    for (let i = 0; i < stepCount; i++) {
      const t = (i + 0.5) / stepCount;
      const sx = startX + dx * t;
      const sy = 0.65 + dy * t;
      const tread = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 1.85), deckMat);
      tread.position.set(sx, sy - 0.02, centerZ);
      tread.receiveShadow = true;
      group.add(tread);
    }

    [-0.95, 0.95].forEach((rz) => {
      const handrail = new THREE.Mesh(new THREE.BoxGeometry(runLen, 0.07, 0.07), accentMat);
      handrail.position.set((startX + endX) / 2, 0.65 + dy / 2 + 0.92, centerZ + rz);
      handrail.rotation.z = slopeAngle;
      group.add(handrail);
    });
  };

  // Local coordinates relative to bridge anchor x = -24.0
  // North stair: world x = -29.2..-23.8 -> local -5.2..+0.2, z = -11.0
  buildStairRun(-5.2, 0.2, -11.0, 14);
  // South stair: world x = -28.0..-23.8 -> local -4.0..+0.2, z = +10.4
  buildStairRun(-4.0, 0.2, 10.4, 12);

  return group;
}

export function createTicketCounter(maxAnisotropy: number): THREE.Group {
  const group = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf4e4c1, roughness: 0.78 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x9b3727, roughness: 0.72 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x1b5e3f, roughness: 0.45, metalness: 0.25 });
  const counterMat = new THREE.MeshStandardMaterial({ color: 0x6f4324, roughness: 0.62 });
  const grilleMat = new THREE.MeshStandardMaterial({ color: 0x262b30, roughness: 0.38, metalness: 0.75 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x1e3c4c, roughness: 0.1, clearcoat: 0.9 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.0, 2.8), wallMat);
  body.position.y = 1.5;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.35, 3.0), trimMat);
  plinth.position.y = 0.175;
  group.add(plinth);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.26, 3.6), roofMat);
  roof.position.set(0, 3.12, 0.15);
  roof.castShadow = true;
  group.add(roof);

  // Two barred ticket windows + stone counter ledges facing Platform 1 (+Z)
  [-1.35, 1.35].forEach((wx) => {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.15, 0.12), glassMat);
    win.position.set(wx, 1.55, 1.41);
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.12, 0.48), counterMat);
    ledge.position.set(wx, 0.98, 1.56);
    group.add(win, ledge);

    for (let b = -2; b <= 2; b++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.12, 6), grilleMat);
      bar.position.set(wx + b * 0.26, 1.55, 1.47);
      group.add(bar);
    }
  });

  // Queue barrier rails in front
  [-2.1, 0, 2.1].forEach((qx) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8), grilleMat);
    post.position.set(qx, 0.45, 2.15);
    group.add(post);
  });
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 4.2, 8), grilleMat);
  rail.rotation.z = Math.PI / 2;
  rail.position.set(0, 0.85, 2.15);
  group.add(rail);

  const signTex = createSignboardTexture('টিকিট কাউন্টার', 'TICKET COUNTER', '#f5b81c', '#181612', maxAnisotropy);
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(3.8, 0.72, 0.1),
    new THREE.MeshStandardMaterial({ map: signTex, color: 0xffffff, roughness: 0.44 }),
  );
  sign.position.set(0, 2.65, 1.48);
  group.add(sign);

  return group;
}

export function createWaitingRoomPavilion(maxAnisotropy: number): THREE.Group {
  const group = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf7ecd2, roughness: 0.8 });
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1e593e, roughness: 0.42, metalness: 0.38 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xa43828, roughness: 0.56 });

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(5.8, 2.9, 0.35), wallMat);
  backWall.position.set(0, 1.45, -1.55);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  group.add(backWall);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.24, 4.0), roofMat);
  roof.position.set(0, 3.02, 0);
  roof.castShadow = true;
  group.add(roof);

  [-2.8, 0, 2.8].forEach((px) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 2.9, 10), pillarMat);
    col.position.set(px, 1.45, 1.65);
    col.castShadow = true;
    group.add(col);
  });

  [-1.5, 1.5].forEach((bx) => {
    const bench = createStationBench();
    bench.position.set(bx, 0, -0.75);
    group.add(bench);
  });

  const signTex = createSignboardTexture('যাত্রী বিশ্রামাগার', 'WAITING ROOM', '#14442e', '#f8edd2', maxAnisotropy);
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(4.0, 0.74, 0.1),
    new THREE.MeshStandardMaterial({ map: signTex, color: 0xffffff, roughness: 0.44 }),
  );
  sign.position.set(0, 2.7, 1.85);
  group.add(sign);

  return group;
}

export function createInfoBoard(maxAnisotropy: number): THREE.Group {
  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1b3b2b, roughness: 0.44, metalness: 0.55 });
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    emissive: 0x1e293b,
    emissiveIntensity: 0.45,
    roughness: 0.3,
  });

  [-1.25, 1.25].forEach((px) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.6, 10), frameMat);
    post.position.set(px, 1.3, 0);
    post.castShadow = true;
    group.add(post);
  });

  const casing = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.45, 0.18), frameMat);
  casing.position.y = 1.95;
  casing.castShadow = true;
  group.add(casing);

  const boardTex = createSignboardTexture('সময়সূচী · SCHEDULE', 'DHAKA · CTG · KHULNA · KOLKATA', '#0b1912', '#f7c948', maxAnisotropy);
  const face = new THREE.Mesh(
    new THREE.BoxGeometry(2.55, 1.18, 0.2),
    [ledMat, ledMat, ledMat, ledMat, new THREE.MeshStandardMaterial({ map: boardTex, color: 0xffffff }), new THREE.MeshStandardMaterial({ map: boardTex, color: 0xffffff })],
  );
  face.position.y = 1.95;
  group.add(face);

  return group;
}

export interface EmergencyHazardProp {
  group: THREE.Group;
  update: (elapsed: number) => void;
}

export function createEmergencyHazardProp(
  kind: 'fire' | 'package' | 'luggage',
): EmergencyHazardProp {
  const group = new THREE.Group();

  const beaconMat = new THREE.MeshBasicMaterial({
    color: kind === 'fire' ? 0xff4500 : kind === 'package' ? 0xf59e0b : 0x3b82f6,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
  });
  const beaconRing = new THREE.Mesh(new THREE.RingGeometry(0.68, 0.86, 24), beaconMat);
  beaconRing.rotation.x = -Math.PI / 2;
  beaconRing.position.y = 0.03;
  group.add(beaconRing);

  const animatedParts: THREE.Object3D[] = [];
  let ledMat: THREE.MeshStandardMaterial | null = null;

  if (kind === 'fire') {
    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.36, 0.52),
      new THREE.MeshStandardMaterial({ color: 0x5c361a, roughness: 0.9 }),
    );
    crate.position.y = 0.18;
    group.add(crate);

    const flameMatA = new THREE.MeshBasicMaterial({ color: 0xff5a1f });
    const flameMatB = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    for (let i = 0; i < 4; i++) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.18 - i * 0.025, 0.75 - i * 0.1, 7),
        i % 2 === 0 ? flameMatA : flameMatB,
      );
      cone.position.set(((i % 2) - 0.5) * 0.16, 0.56 + i * 0.08, ((i >> 1) - 0.5) * 0.12);
      group.add(cone);
      animatedParts.push(cone);
    }

    const smokeMat = new THREE.MeshBasicMaterial({
      color: 0x374151,
      transparent: true,
      opacity: 0.55,
    });
    for (let s = 0; s < 3; s++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.22 + s * 0.06, 8, 8), smokeMat);
      puff.position.set((s - 1) * 0.12, 1.15 + s * 0.45, 0);
      group.add(puff);
      animatedParts.push(puff);
    }
  } else if (kind === 'package') {
    const caseBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.38, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.45, metalness: 0.35 }),
    );
    caseBody.position.y = 0.2;
    caseBody.castShadow = true;
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.07, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.4 }),
    );
    handle.position.y = 0.42;
    ledMat = new THREE.MeshStandardMaterial({
      color: 0xff2a1f,
      emissive: 0xff2a1f,
      emissiveIntensity: 1.8,
      roughness: 0.2,
    });
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), ledMat);
    led.position.set(0.16, 0.39, 0.08);
    group.add(caseBody, handle, led);
  } else {
    // Stolen Blue Suitcase
    const bag = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.38, 0.26),
      new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.55 }),
    );
    bag.position.y = 0.2;
    bag.castShadow = true;
    const strap = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.08, 0.28),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 }),
    );
    strap.position.y = 0.2;
    group.add(bag, strap);
  }

  const update = (elapsed: number) => {
    const pulse = 0.88 + Math.sin(elapsed * 5.2) * 0.14;
    beaconRing.scale.setScalar(pulse);
    if (kind === 'fire') {
      for (let i = 0; i < animatedParts.length; i++) {
        const part = animatedParts[i];
        if (i < 4) {
          part.scale.set(
            0.85 + Math.sin(elapsed * 14 + i) * 0.2,
            0.8 + Math.cos(elapsed * 17 + i * 2) * 0.28,
            0.85 + Math.sin(elapsed * 12 + i) * 0.2,
          );
          part.rotation.y = elapsed * 2 + i;
        } else {
          const cycle = ((elapsed * 0.7 + (i - 4) * 0.33) % 1);
          part.position.y = 0.95 + cycle * 1.45;
          part.scale.setScalar(0.75 + cycle * 0.85);
        }
      }
    } else if (ledMat) {
      ledMat.emissiveIntensity = Math.sin(elapsed * 9) > 0 ? 2.2 : 0.15;
    }
  };

  return { group, update };
}

export function createModernSkyscraper(
  width: number,
  height: number,
  depth: number,
  podiumColorHex: number,
  facadeMat: THREE.MeshStandardMaterial,
  spireAccentHex = 0x38bdf8,
): THREE.Group {
  const group = new THREE.Group();
  const concreteMat = new THREE.MeshStandardMaterial({ color: podiumColorHex, roughness: 0.65, metalness: 0.15 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.38, metalness: 0.65 });
  const neonMat = new THREE.MeshStandardMaterial({
    color: spireAccentHex,
    emissive: spireAccentHex,
    emissiveIntensity: 1.35,
    roughness: 0.2,
  });

  // Ground podium lobby
  const podiumH = Math.min(5.2, height * 0.22);
  const podium = new THREE.Mesh(new THREE.BoxGeometry(width + 1.4, podiumH, depth + 1.4), concreteMat);
  podium.position.y = podiumH / 2;
  podium.castShadow = true;
  podium.receiveShadow = true;
  group.add(podium);

  // Main stepped glass tower
  const midH = (height - podiumH) * 0.68;
  const midTower = new THREE.Mesh(new THREE.BoxGeometry(width, midH, depth), facadeMat);
  midTower.position.y = podiumH + midH / 2;
  midTower.castShadow = true;
  midTower.receiveShadow = true;
  group.add(midTower);

  // Setback crown volume
  const topH = Math.max(4.5, (height - podiumH) * 0.32);
  const topTower = new THREE.Mesh(new THREE.BoxGeometry(width * 0.76, topH, depth * 0.76), facadeMat);
  topTower.position.y = podiumH + midH + topH / 2;
  topTower.castShadow = true;
  group.add(topTower);

  // Rooftop mechanical crown, architectural neon rim, and aviation spire
  const crownCap = new THREE.Mesh(new THREE.BoxGeometry(width * 0.8, 0.45, depth * 0.8), trimMat);
  crownCap.position.y = height + 0.15;
  const neonCrown = new THREE.Mesh(new THREE.BoxGeometry(width * 0.82, 0.22, depth * 0.82), neonMat);
  neonCrown.position.y = height - 0.18;
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.14, 4.6, 8), trimMat);
  spire.position.y = height + 2.4;
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), neonMat);
  beacon.position.y = height + 4.7;
  group.add(crownCap, neonCrown, spire, beacon);

  return group;
}

export function createCommercialPlaza(
  titleBn: string,
  titleEn: string,
  accentHex: number,
  maxAnisotropy: number,
  facadeMat: THREE.MeshStandardMaterial,
): THREE.Group {
  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.62 });
  const awningMat = new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.42, metalness: 0.25 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.65 });

  // Ground-floor retail storefronts + upper office floors
  const body = new THREE.Mesh(new THREE.BoxGeometry(11.6, 7.4, 6.2), facadeMat);
  body.position.y = 3.7;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Architectural concrete colonnade piers
  [-5.6, -1.9, 1.9, 5.6].forEach((px) => {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(0.55, 7.6, 6.45), frameMat);
    pier.position.set(px, 3.8, 0);
    group.add(pier);
  });

  // Entrance marquee canopy
  const marquee = new THREE.Mesh(new THREE.BoxGeometry(11.8, 0.36, 1.8), awningMat);
  marquee.position.set(0, 3.25, 3.6);
  marquee.castShadow = true;
  group.add(marquee);

  const roofTrim = new THREE.Mesh(new THREE.BoxGeometry(12.0, 0.48, 6.5), darkMetal);
  roofTrim.position.y = 7.55;
  group.add(roofTrim);

  const signTex = createCityBillboardTexture(titleBn, titleEn, '#0f172a', `#${accentHex.toString(16).padStart(6, '0')}`, maxAnisotropy);
  const signMat = new THREE.MeshStandardMaterial({
    map: signTex,
    emissiveMap: signTex,
    emissive: 0xffffff,
    emissiveIntensity: 0.75,
    roughness: 0.35,
  });
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(8.2, 1.35, 0.16), signMat);
  fascia.position.set(0, 4.15, 3.25);
  group.add(fascia);

  return group;
}

export function createElevatedFlyover(
  spanLen: number,
  width: number,
  pierZs: number[],
  deckY = 8.9,
): THREE.Group {
  const group = new THREE.Group();
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0xb8bec6, roughness: 0.78 });
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.88 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.42, metalness: 0.65 });
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfde047,
    emissiveIntensity: 1.25,
    roughness: 0.2,
  });

  // Box-girder concrete viaduct deck
  const girder = new THREE.Mesh(new THREE.BoxGeometry(width - 0.8, 0.95, spanLen), concreteMat);
  girder.position.y = deckY - 0.55;
  girder.castShadow = true;
  girder.receiveShadow = true;
  group.add(girder);

  const roadTop = new THREE.Mesh(new THREE.BoxGeometry(width - 0.9, 0.14, spanLen), asphaltMat);
  roadTop.position.y = deckY - 0.02;
  roadTop.receiveShadow = true;
  group.add(roadTop);

  // Center lane dashes along Z
  for (let z = -spanLen / 2 + 4; z <= spanLen / 2 - 4; z += 7) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 3.0), stripeMat);
    dash.position.set(0, deckY + 0.06, z);
    group.add(dash);
  }

  // Side concrete jersey barriers
  [-width / 2 + 0.25, width / 2 - 0.25].forEach((bx) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.88, spanLen), concreteMat);
    wall.position.set(bx, deckY + 0.42, 0);
    wall.castShadow = true;
    group.add(wall);
  });

  // Structural piers positioned strictly at non-rail Z offsets passed by caller
  for (let i = 0; i < pierZs.length; i++) {
    const pz = pierZs[i];
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.88, deckY - 0.9, 12), concreteMat);
    col.position.set(0, (deckY - 0.9) / 2, pz);
    col.castShadow = true;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(width - 1.2, 0.65, 1.4), concreteMat);
    cap.position.set(0, deckY - 1.15, pz);
    group.add(col, cap);
  }

  // Overhead highway LED lamp poles
  for (let z = -spanLen / 2 + 10; z <= spanLen / 2 - 10; z += 22) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.6, 8), poleMat);
    pole.position.set(-width / 2 + 0.35, deckY + 2.2, z);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.08), poleMat);
    arm.position.set(-width / 2 + 1.0, deckY + 3.9, z);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.22), ledMat);
    lamp.position.set(-width / 2 + 1.55, deckY + 3.84, z);
    group.add(pole, arm, lamp);
  }

  return group;
}

export function createDigitalBillboard(
  titleBn: string,
  subEn: string,
  bgHex: string,
  accentHex: string,
  maxAnisotropy: number,
): { group: THREE.Group; screenMat: THREE.MeshStandardMaterial } {
  const group = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.42, metalness: 0.72 });
  const tex = createCityBillboardTexture(titleBn, subEn, bgHex, accentHex, maxAnisotropy);
  const screenMat = new THREE.MeshStandardMaterial({
    map: tex,
    emissiveMap: tex,
    emissive: 0xffffff,
    emissiveIntensity: 0.75,
    roughness: 0.28,
  });

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 5.6, 10), steelMat);
  post.position.y = 2.8;
  post.castShadow = true;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(7.2, 3.5, 0.32), steelMat);
  frame.position.y = 6.6;
  frame.castShadow = true;
  const panel = new THREE.Mesh(new THREE.BoxGeometry(6.85, 3.15, 0.36), screenMat);
  panel.position.y = 6.6;
  group.add(post, frame, panel);

  return { group, screenMat };
}

export function createUrbanVehicle(
  kind: 'sedan' | 'suv' | 'city_bus' | 'metro_shuttle',
  colorHex: number,
  sharedHeadlightMat: THREE.MeshStandardMaterial,
  sharedTaillightMat: THREE.MeshStandardMaterial,
): THREE.Group {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: colorHex,
    roughness: 0.32,
    metalness: 0.25,
    clearcoat: 0.65,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a3040,
    roughness: 0.08,
    metalness: 0.3,
    clearcoat: 0.9,
  });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x181a1e, roughness: 0.85 });

  const isBus = kind === 'city_bus' || kind === 'metro_shuttle';
  const lengthX = isBus ? 7.6 : kind === 'suv' ? 4.2 : 3.9;
  const bodyH = isBus ? 2.15 : kind === 'suv' ? 0.92 : 0.72;
  const widthZ = isBus ? 2.18 : 1.75;

  const lower = new THREE.Mesh(new THREE.BoxGeometry(lengthX, bodyH, widthZ), bodyMat);
  lower.position.y = 0.32 + bodyH / 2;
  lower.castShadow = true;
  group.add(lower);

  if (isBus) {
    const stripeMat = new THREE.MeshStandardMaterial({
      color: kind === 'metro_shuttle' ? 0xfacc15 : 0x38bdf8,
      roughness: 0.4,
    });
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(lengthX + 0.04, 0.24, widthZ + 0.04), stripeMat);
    stripe.position.y = 1.05;
    const winBand = new THREE.Mesh(new THREE.BoxGeometry(lengthX - 0.3, 0.78, widthZ + 0.03), glassMat);
    winBand.position.y = 1.78;
    const acUnit = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.24, 1.3), glassMat);
    acUnit.position.y = 2.58;
    group.add(stripe, winBand, acUnit);
  } else {
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(lengthX * 0.56, kind === 'suv' ? 0.68 : 0.58, widthZ - 0.16),
      bodyMat,
    );
    cabin.position.set(-0.22, 0.32 + bodyH + (kind === 'suv' ? 0.32 : 0.27), 0);
    cabin.castShadow = true;
    const win = new THREE.Mesh(
      new THREE.BoxGeometry(lengthX * 0.52, kind === 'suv' ? 0.5 : 0.42, widthZ - 0.12),
      glassMat,
    );
    win.position.copy(cabin.position);
    group.add(cabin, win);
  }

  // Wheels
  const wheelXs = isBus ? [-2.4, 2.4] : [-1.2, 1.2];
  wheelXs.forEach((wx) => {
    [-widthZ / 2 + 0.06, widthZ / 2 - 0.06].forEach((wz) => {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(isBus ? 0.42 : 0.32, isBus ? 0.42 : 0.32, 0.22, 12),
        tireMat,
      );
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, isBus ? 0.42 : 0.32, wz);
      group.add(wheel);
    });
  });

  // Headlights (+X front) & Taillights (-X rear)
  [-widthZ * 0.34, widthZ * 0.34].forEach((lz) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.28), sharedHeadlightMat);
    hl.position.set(lengthX / 2 + 0.03, 0.68, lz);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.26), sharedTaillightMat);
    tl.position.set(-lengthX / 2 - 0.03, 0.72, lz);
    group.add(hl, tl);
  });

  return group;
}

export function createSouthTerminalBuilding(
  maxAnisotropy: number,
  sharedFacadeMat: THREE.MeshStandardMaterial,
): THREE.Group {
  const group = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x164e3f, roughness: 0.38, metalness: 0.65 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.32, metalness: 0.45 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 });

  // Modern glass concourse volume
  const hall = new THREE.Mesh(new THREE.BoxGeometry(22, 4.6, 5.2), sharedFacadeMat);
  hall.position.set(0, 2.3, 0);
  hall.castShadow = true;
  hall.receiveShadow = true;
  group.add(hall);

  // Swept wing canopy roof extending over Platform 4 edge (-Z side)
  const wingRoof = new THREE.Mesh(new THREE.BoxGeometry(26, 0.28, 8.6), roofMat);
  wingRoof.position.set(0, 4.85, -0.8);
  wingRoof.rotation.x = -0.05;
  wingRoof.castShadow = true;
  group.add(wingRoof);

  // Structural V-pillars along concourse front
  [-10, -3.5, 3.5, 10].forEach((px) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 4.8, 10), steelMat);
    col.position.set(px, 2.4, -3.1);
    col.castShadow = true;
    group.add(col);
  });

  const fascia = new THREE.Mesh(new THREE.BoxGeometry(25.6, 0.18, 0.24), goldMat);
  fascia.position.set(0, 4.62, -4.9);
  group.add(fascia);

  const signTex = createSignboardTexture(
    'আন্তর্জাতিক টার্মিনাল · প্ল্যাটফর্ম ৬',
    'SOUTH GLASS CONCOURSE',
    '#0f3b2e',
    '#facc15',
    maxAnisotropy,
  );
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(6.8, 1.1, 0.14),
    new THREE.MeshStandardMaterial({ map: signTex, color: 0xffffff, roughness: 0.35 }),
  );
  sign.position.set(0, 3.9, -2.7);
  sign.rotation.y = Math.PI;
  group.add(sign);

  return group;
}

export function createUpgradeKiosk(maxAnisotropy: number): THREE.Group {
  const group = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x133829, roughness: 0.42, metalness: 0.5 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0xf5c756, roughness: 0.32, metalness: 0.4 });
  const screenTex = createSignboardTexture(
    'উন্নয়ন ব্লুপ্রিন্ট কনসোল',
    'TRACKS 1-6 · PRESS [U]',
    '#071d14',
    '#4ade80',
    maxAnisotropy,
  );
  const screenMat = new THREE.MeshStandardMaterial({
    map: screenTex,
    emissiveMap: screenTex,
    emissive: 0x34d399,
    emissiveIntensity: 0.35,
    roughness: 0.28,
  });

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.96, 0.88), baseMat);
  plinth.position.y = 0.48;
  plinth.castShadow = true;
  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.08, 0.98), accentMat);
  counterTop.position.y = 0.98;
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.64, 0.08), baseMat);
  bezel.position.set(0, 1.32, -0.16);
  bezel.rotation.x = -0.3;
  const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.52, 0.02), screenMat);
  monitor.position.set(0, 1.33, -0.12);
  monitor.rotation.x = -0.3;

  const tex = createSignboardTexture('স্টেশন উন্নয়ন ডেস্ক', 'STATION EXPANSION', '#064e3b', '#fde047', maxAnisotropy);
  const frontSign = new THREE.Mesh(
    new THREE.BoxGeometry(1.45, 0.48, 0.06),
    new THREE.MeshStandardMaterial({ map: tex, color: 0xffffff, roughness: 0.4 }),
  );
  frontSign.position.set(0, 0.52, 0.45);
  group.add(plinth, counterTop, bezel, monitor, frontSign);
  return group;
}

export interface ConstructionCraneRig {
  group: THREE.Group;
  jibPivot: THREE.Group;
  trolley: THREE.Mesh;
}

export function createConstructionCrane(): ConstructionCraneRig {
  const group = new THREE.Group();
  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.42, metalness: 0.35 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5, metalness: 0.65 });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xff3b30,
    emissive: 0xff3b30,
    emissiveIntensity: 2.0,
    roughness: 0.2,
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 2.4), darkMat);
  base.position.y = 0.35;
  const mast = new THREE.Mesh(new THREE.BoxGeometry(0.85, 13.5, 0.85), yellowMat);
  mast.position.y = 7.1;
  mast.castShadow = true;
  group.add(base, mast);

  const jibPivot = new THREE.Group();
  jibPivot.position.y = 13.9;

  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), darkMat);
  cab.position.set(0, 0.35, 0);
  const boom = new THREE.Mesh(new THREE.BoxGeometry(14.5, 0.65, 0.65), yellowMat);
  boom.position.set(4.5, 0.4, 0);
  const counterweight = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 1.2), darkMat);
  counterweight.position.set(-3.2, 0.4, 0);
  const topBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), beaconMat);
  topBeacon.position.set(0, 1.45, 0);

  const trolley = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.8), darkMat);
  trolley.position.set(5.5, -0.2, 0);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 4.2, 6), darkMat);
  cable.position.set(0, -2.1, 0);
  trolley.add(cable);

  jibPivot.add(cab, boom, counterweight, topBeacon, trolley);
  group.add(jibPivot);

  return { group, jibPivot, trolley };
}

export function createExtendedFootbridgeSection(
  startZ: number,
  endZ: number,
  stairConfigs: { centerZ: number; startX: number; endX: number; steps: number }[] = [],
): THREE.Group {
  const group = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x1e4d3b, roughness: 0.42, metalness: 0.55 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0xe6a825, roughness: 0.46 });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x5c646d, roughness: 0.85 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x2f6f57, roughness: 0.48, metalness: 0.35 });

  const deckY = 4.85;
  const spanLenZ = Math.max(1, endZ - startZ);
  const midZ = (startZ + endZ) / 2;

  const walkway = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.24, spanLenZ), deckMat);
  walkway.position.set(0, deckY - 0.12, midZ);
  walkway.castShadow = true;
  walkway.receiveShadow = true;
  group.add(walkway);

  [-1.18, 1.18].forEach((rx) => {
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, spanLenZ), accentMat);
    topRail.position.set(rx, deckY + 1.02, midZ);
    const midRail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, spanLenZ), steelMat);
    midRail.position.set(rx, deckY + 0.52, midZ);
    group.add(topRail, midRail);

    for (let z = startZ + 1.2; z <= endZ - 0.4; z += 2.7) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.35, 0.09), steelMat);
      post.position.set(rx, deckY + 1.15, z);
      group.add(post);
    }
  });

  const shadeRoof = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.1, spanLenZ + 0.3), roofMat);
  shadeRoof.position.set(0, deckY + 2.32, midZ);
  shadeRoof.castShadow = true;
  group.add(shadeRoof);

  // Support piers & optional stairs into south platforms
  stairConfigs.forEach(({ centerZ, startX, endX, steps }) => {
    [-1.1, 1.1].forEach((px) => {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(0.24, deckY - 0.65, 0.24), steelMat);
      pier.position.set(px, 0.65 + (deckY - 0.65) / 2, centerZ - 1.2);
      pier.castShadow = true;
      group.add(pier);
    });

    const dx = endX - startX;
    const dy = deckY - 0.65;
    const runLen = Math.hypot(dx, dy);
    const slopeAngle = Math.atan2(dy, dx);
    const stringer = new THREE.Mesh(new THREE.BoxGeometry(runLen, 0.22, 1.9), steelMat);
    stringer.position.set((startX + endX) / 2, 0.65 + dy / 2 - 0.1, centerZ);
    stringer.rotation.z = slopeAngle;
    stringer.castShadow = true;
    group.add(stringer);

    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps;
      const sx = startX + dx * t;
      const sy = 0.65 + dy * t;
      const tread = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 1.85), deckMat);
      tread.position.set(sx, sy - 0.02, centerZ);
      group.add(tread);
    }

    [-0.95, 0.95].forEach((rz) => {
      const handrail = new THREE.Mesh(new THREE.BoxGeometry(runLen, 0.07, 0.07), accentMat);
      handrail.position.set((startX + endX) / 2, 0.65 + dy / 2 + 0.92, centerZ + rz);
      handrail.rotation.z = slopeAngle;
      group.add(handrail);
    });
  });

  return group;
}



