import * as THREE from 'three';
import {
  createCommercialPlaza,
  createConstructionCrane,
  createDigitalBillboard,
  createElevatedFlyover,
  createEmergencyHazardProp,
  createExtendedFootbridgeSection,
  createFoodStall,
  createFootoverBridge,
  createInfoBoard,
  createLevelCrossing,
  createModernSkyscraper,
  createRailwaySwitchVisual,
  createRickshaw,
  createSemaphoreSignal,
  createSouthTerminalBuilding,
  createStationBench,
  createStationMasterCharacter,
  createStationOffice,
  createStreetlight,
  createTicketCounter,
  createTrackOccupancyBeacon,
  createTrainByCategory,
  createUpgradeKiosk,
  createUrbanVehicle,
  createWaitingRoomPavilion,
  createCoconutPalm,
  type CharacterRig,
  type ConstructionCraneRig,
  type CrossingController,
  type EmergencyHazardProp,
  type RailwaySwitchVisual,
  type SemaphoreSignalController,
  type TrackOccupancyBeacon,
  type TrainModelController,
} from './models';
import {
  createInitialNpcSimulation,
  stepNpcSimulation,
  type NpcSimulationState,
  type NpcStepEvents,
} from './npcManager';
import {
  animateNpcRig,
  createArticulatedNpc,
  type ArticulatedNpcRig,
} from './npcModels';
import {
  createAsphaltAvenueTexture,
  createBallastTexturePair,
  createGlassFacadeTexture,
  createGrassTexture,
  createPlatformSignTexture,
  createPlatformTileTexturePair,
  createSignboardTexture,
} from './textures';
import { FOOTBRIDGE_HEIGHT, PLATFORM_HEIGHT } from './physics';
import { getTrackSignal, STATION_NAME_BN, STATION_NAME_EN } from './rules';
import { TRACK_Z } from './trainManager';
import type {
  ColliderBox,
  InteractablePoint,
  NpcFloatingBubble,
  SignalAspect,
  StationSimState,
  SwitchPosition,
  TrackId,
  TrainSimulationState,
  WeatherMode,
} from './types';

export interface StationWorldHandle {
  scene: THREE.Scene;
  character: CharacterRig;
  colliders: ColliderBox[];
  interactables: InteractablePoint[];
  getNpcState: () => NpcSimulationState;
  resetNpcs: () => void;
  update: (
    simState: StationSimState,
    trainState: TrainSimulationState,
    weather: WeatherMode,
    playerX: number,
    playerY: number,
    playerZ: number,
    dt: number,
    elapsed: number,
    stepNpcAi?: boolean,
  ) => {
    simState: StationSimState;
    playerX: number;
    playerZ: number;
    npcEvents: NpcStepEvents;
  };
  getProjectedNpcBubbles: (camera: THREE.Camera) => NpcFloatingBubble[];
  triggerLightningFlash: () => void;
  closestTrainDistance: (x: number, z: number) => number;
  getGroundSurface: (x: number, z: number, y?: number) => 'concrete' | 'wood' | 'grass';
  dispose: () => void;
}

function createSkyDome(): {
  mesh: THREE.Mesh;
  updateGradient: (topHex: THREE.Color, midHex: THREE.Color, horHex: THREE.Color) => void;
} {
  const geo = new THREE.SphereGeometry(210, 24, 16);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const colorAttr = new THREE.BufferAttribute(colors, 3);
  geo.setAttribute('color', colorAttr);

  const tmp = new THREE.Color();
  const updateGradient = (topColor: THREE.Color, midColor: THREE.Color, horColor: THREE.Color) => {
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = THREE.MathUtils.clamp(y / 210, 0, 1);
      if (t < 0.35) {
        tmp.lerpColors(horColor, midColor, t / 0.35);
      } else {
        tmp.lerpColors(midColor, topColor, (t - 0.35) / 0.65);
      }
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    colorAttr.needsUpdate = true;
  };

  updateGradient(new THREE.Color(0x286fb5), new THREE.Color(0x74bae2), new THREE.Color(0xcde9f7));
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false });
  const mesh = new THREE.Mesh(geo, mat);
  return { mesh, updateGradient };
}

interface TrafficAgent {
  group: THREE.Group;
  axis: 'x' | 'z';
  pos: number;
  fixedCoord: number;
  y: number;
  dir: 1 | -1;
  speed: number;
  limit: number;
}

export function buildStationWorld(
  maxAnisotropy: number,
  isSoftwareGl: boolean,
): StationWorldHandle {
  const scene = new THREE.Scene();
  const skyColor = new THREE.Color(0x9fd4f0);
  scene.background = skyColor;
  scene.fog = new THREE.Fog(0xbadff2, 70, 210);

  const skyDome = createSkyDome();
  scene.add(skyDome.mesh);

  // Night Sky Starfield
  const starCount = 280;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = ((i * 137.5) % 360) * (Math.PI / 180);
    const phi = 0.16 + ((i * 47) % 100) * 0.011;
    const r = 175;
    starPos[i * 3] = Math.cos(theta) * Math.cos(phi) * r;
    starPos[i * 3 + 1] = Math.sin(phi) * r;
    starPos[i * 3 + 2] = Math.sin(theta) * Math.cos(phi) * r;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xf8fafc,
    size: 1.4,
    transparent: true,
    opacity: 0,
    fog: false,
  });
  const starField = new THREE.Points(starGeo, starMat);
  scene.add(starField);

  // Soft stylized clouds drifting gently above city skyline
  const cloudGroup = new THREE.Group();
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xf9fcff, transparent: true, opacity: 0.78 });
  const cloudClusters: THREE.Group[] = [];
  for (let c = 0; c < 8; c++) {
    const cluster = new THREE.Group();
    const angle = (c / 8) * Math.PI * 2;
    cluster.position.set(Math.cos(angle) * 86, 42 + (c % 3) * 6, Math.sin(angle) * 74);
    for (let p = 0; p < 3; p++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(4.4 - p * 0.6, 10, 8), cloudMat);
      puff.scale.set(1.8, 0.65, 1.1);
      puff.position.set((p - 1) * 4.5, (p % 2) * 1.1, 0);
      cluster.add(puff);
    }
    cloudGroup.add(cluster);
    cloudClusters.push(cluster);
  }
  scene.add(cloudGroup);

  // Lighting: Warm sun key + cool sky/ground hemisphere fill + urban moonlight rim
  const hemiLight = new THREE.HemisphereLight(0xa3e2ff, 0x5c6470, 0.85);
  hemiLight.position.set(0, 60, 0);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xfff1d6, 1.6);
  sunLight.position.set(36, 52, 28);
  if (!isSoftwareGl) {
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 160;
    const d = 60;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0006;
    sunLight.shadow.normalBias = 0.025;
  }
  scene.add(sunLight);

  const rimLight = new THREE.DirectionalLight(0xc2e6ff, 0.42);
  rimLight.position.set(-34, 26, -38);
  scene.add(rimLight);

  // Shared Night-Responsive Emissive Materials
  const streetBulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff0be,
    emissive: 0xffcc66,
    emissiveIntensity: 0.4,
    roughness: 0.2,
  });
  const facadeTexA = createGlassFacadeTexture('#173b56', maxAnisotropy);
  const facadeTexB = createGlassFacadeTexture('#1a4a44', maxAnisotropy);
  const glassFacadeMatA = new THREE.MeshStandardMaterial({
    map: facadeTexA.map,
    emissiveMap: facadeTexA.emissiveMap,
    emissive: 0xffffff,
    emissiveIntensity: 0.1,
    roughness: 0.22,
    metalness: 0.45,
  });
  const glassFacadeMatB = new THREE.MeshStandardMaterial({
    map: facadeTexB.map,
    emissiveMap: facadeTexB.emissiveMap,
    emissive: 0xffffff,
    emissiveIntensity: 0.1,
    roughness: 0.25,
    metalness: 0.4,
  });
  const billboardMats: THREE.MeshStandardMaterial[] = [];
  const vehicleHeadlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfef3c7,
    emissiveIntensity: 0.5,
    roughness: 0.15,
  });
  const vehicleTaillightMat = new THREE.MeshStandardMaterial({
    color: 0xff3b30,
    emissive: 0xff2a1f,
    emissiveIntensity: 0.5,
    roughness: 0.2,
  });

  const baseColliders: ColliderBox[] = [];
  const baseInteractables: InteractablePoint[] = [];
  const colliders: ColliderBox[] = [];
  const interactables: InteractablePoint[] = [];

  // 1. Modern Metropolitan Ground Deck + Landscaped Green Medians + Paved City Plazas
  const urbanConcreteMat = new THREE.MeshStandardMaterial({ color: 0x626b75, roughness: 0.88 });
  const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(380, 380), urbanConcreteMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  // Landscaped emerald median turf strips (modern urban park dividers north & south of station plaza)
  const grassTex = createGrassTexture(maxAnisotropy);
  const medianTurfMat = new THREE.MeshStandardMaterial({ map: grassTex, color: 0xffffff, roughness: 0.88 });
  const northParkStrip = new THREE.Mesh(new THREE.PlaneGeometry(92, 6.2), medianTurfMat);
  northParkStrip.rotation.x = -Math.PI / 2;
  northParkStrip.position.set(0, 0.02, -21.8);
  northParkStrip.receiveShadow = true;
  scene.add(northParkStrip);

  const southParkStrip = new THREE.Mesh(new THREE.PlaneGeometry(92, 5.2), medianTurfMat);
  southParkStrip.rotation.x = -Math.PI / 2;
  southParkStrip.position.set(0, 0.02, 47.0);
  southParkStrip.receiveShadow = true;
  scene.add(southParkStrip);

  // Paved station forecourt granite apron
  const plazaStoneMat = new THREE.MeshStandardMaterial({ color: 0x8e96a0, roughness: 0.78 });
  const forecourt = new THREE.Mesh(new THREE.PlaneGeometry(82, 12.5), plazaStoneMat);
  forecourt.rotation.x = -Math.PI / 2;
  forecourt.position.set(0, 0.025, -17.8);
  forecourt.receiveShadow = true;
  scene.add(forecourt);

  // North Station Boulevard (z = -31) & South Grand Avenue (z = +53.5)
  const avenueTex = createAsphaltAvenueTexture(maxAnisotropy);
  const avenueMat = new THREE.MeshStandardMaterial({ map: avenueTex, color: 0xffffff, roughness: 0.86 });
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xb0b8c2, roughness: 0.78 });

  [
    { z: -31.0, sidewalkN: -36.8, sidewalkS: -25.2 },
    { z: 53.5, sidewalkN: 47.7, sidewalkS: 59.3 },
  ].forEach(({ z, sidewalkN, sidewalkS }) => {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(195, 10.6), avenueMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.03, z);
    road.receiveShadow = true;
    scene.add(road);

    [sidewalkN, sidewalkS].forEach((sz) => {
      const walk = new THREE.Mesh(new THREE.BoxGeometry(195, 0.14, 1.6), sidewalkMat);
      walk.position.set(0, 0.07, sz);
      walk.receiveShadow = true;
      scene.add(walk);
    });
  });

  // 2. Railway Ballast, Sleepers & Steel Rails Helper (Tracks 1-2 active at Level 1)
  const ballastPair = createBallastTexturePair(maxAnisotropy);
  const ballastMat = new THREE.MeshStandardMaterial({
    map: ballastPair.map,
    bumpMap: ballastPair.bumpMap,
    bumpScale: 0.045,
    color: 0xffffff,
    roughness: 0.95,
  });
  const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x4d3423, roughness: 0.88 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0xa2abb5, roughness: 0.22, metalness: 0.88 });

  const buildTrackAssembly = (tz: number, targetGroup: THREE.Group) => {
    const ballast = new THREE.Mesh(new THREE.BoxGeometry(224, 0.12, 3.2), ballastMat);
    ballast.position.set(0, 0.06, tz);
    ballast.receiveShadow = true;
    targetGroup.add(ballast);

    [-0.72, 0.72].forEach((rz) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(224, 0.11, 0.1), railMat);
      rail.position.set(0, 0.21, tz + rz);
      targetGroup.add(rail);
    });

    const sleeperSpacing = 0.9;
    const count = Math.floor(200 / sleeperSpacing);
    const sleeperInst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.28, 0.1, 2.35), sleeperMat, count);
    sleeperInst.receiveShadow = true;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      dummy.position.set(-100 + i * sleeperSpacing, 0.12, tz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      sleeperInst.setMatrixAt(i, dummy.matrix);
    }
    sleeperInst.instanceMatrix.needsUpdate = true;
    sleeperInst.computeBoundingSphere();
    targetGroup.add(sleeperInst);
  };

  buildTrackAssembly(TRACK_Z[1], scene as unknown as THREE.Group);
  buildTrackAssembly(TRACK_Z[2], scene as unknown as THREE.Group);

  // 3. Detailed Railway Platforms
  const platPair = createPlatformTileTexturePair(maxAnisotropy);
  const platDeckMat = new THREE.MeshStandardMaterial({
    map: platPair.map,
    bumpMap: platPair.bumpMap,
    bumpScale: 0.025,
    color: 0xffffff,
    roughness: 0.76,
  });
  const platSideMat = new THREE.MeshStandardMaterial({ color: 0x9b4634, roughness: 0.84 });
  const curbYellowMat = new THREE.MeshStandardMaterial({ color: 0xe8b225, roughness: 0.54 });
  const ironGreenMat = new THREE.MeshStandardMaterial({ color: 0x1a563b, roughness: 0.38, metalness: 0.45 });
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x226849, roughness: 0.44, metalness: 0.32 });

  const buildPlatformStructure = (
    target: THREE.Group,
    centerZ: number,
    widthZ: number,
    lengthX: number,
    curbZs: number[],
    rampSide: 'north' | 'south' | 'none',
    rampX: number,
  ) => {
    const platGroup = new THREE.Group();
    const deck = new THREE.Mesh(new THREE.BoxGeometry(lengthX, PLATFORM_HEIGHT, widthZ), [
      platSideMat,
      platSideMat,
      platDeckMat,
      platSideMat,
      platSideMat,
      platSideMat,
    ]);
    deck.position.set(0, PLATFORM_HEIGHT / 2, centerZ);
    deck.receiveShadow = true;
    platGroup.add(deck);

    curbZs.forEach((curbZ) => {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(lengthX, 0.04, 0.32), curbYellowMat);
      curb.position.set(0, PLATFORM_HEIGHT + 0.01, curbZ);
      platGroup.add(curb);
    });

    const halfL = lengthX / 2;
    [-1, 1].forEach((dir) => {
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.16, widthZ), platDeckMat);
      const slopeAngle = Math.atan2(PLATFORM_HEIGHT, 4.0);
      ramp.position.set(dir * (halfL + 1.95), PLATFORM_HEIGHT / 2 - 0.05, centerZ);
      ramp.rotation.z = dir === -1 ? slopeAngle : -slopeAngle;
      ramp.receiveShadow = true;
      platGroup.add(ramp);
    });

    if (rampSide !== 'none') {
      const sideZ = rampSide === 'north' ? centerZ - widthZ / 2 - 1.25 : centerZ + widthZ / 2 + 1.25;
      const sideRamp = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.16, 2.7), platDeckMat);
      const sideAngle = Math.atan2(PLATFORM_HEIGHT, 2.5);
      sideRamp.position.set(rampX, PLATFORM_HEIGHT / 2 - 0.05, sideZ);
      sideRamp.rotation.x = rampSide === 'north' ? -sideAngle : sideAngle;
      sideRamp.receiveShadow = true;
      platGroup.add(sideRamp);
    }

    target.add(platGroup);
    return platGroup;
  };

  // Platform 1 & Platform 2
  buildPlatformStructure(scene as unknown as THREE.Group, -8.6, 7.8, 60, [-4.88], 'north', 11);
  buildPlatformStructure(scene as unknown as THREE.Group, 8.1, 6.8, 56, [4.88], 'south', 9);

  // Platform 1 Canopy Shed
  const canopy1 = new THREE.Mesh(new THREE.BoxGeometry(36, 0.16, 4.2), canopyMat);
  canopy1.position.set(-2, PLATFORM_HEIGHT + 5.5, -9.8);
  canopy1.castShadow = true;
  scene.add(canopy1);
  [-18, -10, -2, 6, 14].forEach((px) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 5.5, 12), ironGreenMat);
    col.position.set(px, PLATFORM_HEIGHT + 2.75, -10.8);
    col.castShadow = true;
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 4.1), ironGreenMat);
    beam.position.set(px, PLATFORM_HEIGHT + 5.34, -9.8);
    scene.add(col, beam);
    baseColliders.push({
      id: `canopy_col_${px}`,
      minX: px - 0.18,
      maxX: px + 0.18,
      minZ: -10.98,
      maxZ: -10.62,
    });
  });

  // Platform 2 Passenger Shelter Canopy
  const canopy2 = new THREE.Mesh(new THREE.BoxGeometry(24, 0.16, 3.6), canopyMat);
  canopy2.position.set(-2, PLATFORM_HEIGHT + 5.2, 8.8);
  canopy2.castShadow = true;
  scene.add(canopy2);
  [-12, -4, 4, 9].forEach((px) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 5.2, 12), ironGreenMat);
    col.position.set(px, PLATFORM_HEIGHT + 2.6, 9.8);
    col.castShadow = true;
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 3.5), ironGreenMat);
    beam.position.set(px, PLATFORM_HEIGHT + 5.05, 8.8);
    scene.add(col, beam);
    baseColliders.push({
      id: `canopy2_col_${px}`,
      minX: px - 0.18,
      maxX: px + 0.18,
      minZ: 9.62,
      maxZ: 9.98,
    });
  });

  // Heritage Station Nameboards (Bangla + English)
  const boardTex = createSignboardTexture(
    STATION_NAME_BN,
    STATION_NAME_EN.toUpperCase(),
    '#f5b81c',
    '#181612',
    maxAnisotropy,
  );
  const boardMat = new THREE.MeshStandardMaterial({ map: boardTex, color: 0xffffff, roughness: 0.42 });
  const addStationBoard = (bx: number, bz: number) => {
    const boardGroup = new THREE.Group();
    boardGroup.position.set(bx, PLATFORM_HEIGHT, bz);
    [-1.65, 1.65].forEach((px) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.7, 10), ironGreenMat);
      post.position.set(px, 1.35, 0);
      boardGroup.add(post);
    });
    const panel = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.25, 0.12), boardMat);
    panel.position.y = 2.1;
    panel.castShadow = true;
    boardGroup.add(panel);
    scene.add(boardGroup);
    baseColliders.push({
      id: `board_${bx}_${bz}`,
      minX: bx - 1.85,
      maxX: bx + 1.85,
      minZ: bz - 0.22,
      maxZ: bz + 0.22,
    });
  };
  addStationBoard(-20, -10.6);
  addStationBoard(26.5, -10.8);
  addStationBoard(-18, 10.2);

  const addHangingPlatformSign = (
    target: THREE.Group,
    sx: number,
    sy: number,
    sz: number,
    platformNum: TrackId,
  ) => {
    const signTex = createPlatformSignTexture(platformNum, maxAnisotropy);
    const mat = new THREE.MeshStandardMaterial({ map: signTex, color: 0xffffff, roughness: 0.4 });
    const signGroup = new THREE.Group();
    signGroup.position.set(sx, sy, sz);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.72, 0.1), mat);
    panel.castShadow = true;
    signGroup.add(panel);
    [-0.95, 0.95].forEach((rx) => {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.85, 8), ironGreenMat);
      rod.position.set(rx, 0.65, 0);
      signGroup.add(rod);
    });
    target.add(signGroup);
  };
  addHangingPlatformSign(scene as unknown as THREE.Group, -8.0, PLATFORM_HEIGHT + 4.55, -8.2, 1);
  addHangingPlatformSign(scene as unknown as THREE.Group, 8.0, PLATFORM_HEIGHT + 4.55, -8.2, 1);
  addHangingPlatformSign(scene as unknown as THREE.Group, -6.0, PLATFORM_HEIGHT + 4.25, 7.35, 2);
  addHangingPlatformSign(scene as unknown as THREE.Group, 6.0, PLATFORM_HEIGHT + 4.25, 7.35, 2);

  // Elevated Footover Bridge spanning Tracks 1 & 2 at x = -24.0
  const footbridge = createFootoverBridge();
  footbridge.position.set(-24.0, 0, 0);
  scene.add(footbridge);
  [-6.8, 6.8].forEach((pz) => {
    [-25.1, -22.9].forEach((px) => {
      baseColliders.push({
        id: `fb_pier_${px}_${pz}`,
        minX: px - 0.16,
        maxX: px + 0.16,
        minZ: pz - 0.16,
        maxZ: pz + 0.16,
        maxY: 3.1,
      });
    });
  });

  // Helper to construct visual end-cap safety rails on Footover Bridge spans
  const fbRailAccentMat = new THREE.MeshStandardMaterial({ color: 0xe6a825, roughness: 0.46 });
  const fbRailSteelMat = new THREE.MeshStandardMaterial({ color: 0x1e4d3b, roughness: 0.42, metalness: 0.55 });
  const createBridgeEndCap = (zPos: number) => {
    const cap = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.08, 0.08), fbRailAccentMat);
    top.position.set(-24.0, FOOTBRIDGE_HEIGHT + 1.02, zPos);
    const mid = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.06, 0.06), fbRailSteelMat);
    mid.position.set(-24.0, FOOTBRIDGE_HEIGHT + 0.52, zPos);
    cap.add(top, mid);
    scene.add(cap);
    return cap;
  };
  const fbSouthCapBase = createBridgeEndCap(11.1);
  const fbSouthCapM4 = createBridgeEndCap(25.55);
  fbSouthCapM4.visible = false;
  createBridgeEndCap(41.55);

  // Physical safety borders along Footover Bridge deck (minY=3.1) & staircases (minY=0.9), thickened outward so players never tunnel off
  baseColliders.push(
    { id: 'fb_rail_e_base', minX: -22.88, maxX: -21.0, minZ: -12.0, maxZ: 11.2, minY: 3.1 },
    { id: 'fb_rail_w_base', minX: -26.8, maxX: -25.12, minZ: -9.85, maxZ: 9.35, minY: 3.1 },
    { id: 'fb_rail_n_end', minX: -25.35, maxX: -22.65, minZ: -13.4, maxZ: -11.75, minY: 3.1 },
    { id: 'fb_stair1_n', minX: -29.0, maxX: -25.1, minZ: -13.3, maxZ: -11.92, minY: 0.9 },
    { id: 'fb_stair1_s', minX: -29.0, maxX: -25.1, minZ: -10.08, maxZ: -8.7, minY: 0.9 },
    { id: 'fb_stair2_n', minX: -28.0, maxX: -25.1, minZ: 8.1, maxZ: 9.52, minY: 0.9 },
    { id: 'fb_stair2_s', minX: -28.0, maxX: -25.1, minZ: 11.28, maxZ: 12.7, minY: 0.9 },
  );

  // Ticket Counter & Waiting Room Pavilion
  const ticketCounter = createTicketCounter(maxAnisotropy);
  ticketCounter.position.set(-13.6, PLATFORM_HEIGHT, -14.8);
  scene.add(ticketCounter);
  baseColliders.push({
    id: 'ticket_counter_body',
    minX: -16.2,
    maxX: -11.0,
    minZ: -16.2,
    maxZ: -13.3,
  });

  const waitingRoom = createWaitingRoomPavilion(maxAnisotropy);
  waitingRoom.position.set(-21.5, PLATFORM_HEIGHT, -14.5);
  scene.add(waitingRoom);
  baseColliders.push({
    id: 'waiting_room_backwall',
    minX: -24.5,
    maxX: -18.5,
    minZ: -16.25,
    maxZ: -15.75,
  });

  const infoBoard1 = createInfoBoard(maxAnisotropy);
  infoBoard1.position.set(-6.8, PLATFORM_HEIGHT, -10.4);
  scene.add(infoBoard1);
  baseColliders.push({ id: 'info_board_1', minX: -8.2, maxX: -5.4, minZ: -10.6, maxZ: -10.2 });

  const infoBoard2 = createInfoBoard(maxAnisotropy);
  infoBoard2.position.set(11.2, PLATFORM_HEIGHT, 9.7);
  infoBoard2.rotation.y = Math.PI;
  scene.add(infoBoard2);
  baseColliders.push({ id: 'info_board_2', minX: 9.8, maxX: 12.6, minZ: 9.5, maxZ: 9.9 });

  // Pedestrian Plank Crossing across Tracks 1 & 2 (x = 16..21)
  const plankCrossingMat = new THREE.MeshStandardMaterial({ color: 0x7a5c3e, roughness: 0.85 });
  const crossDeck = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.1, 7.4), plankCrossingMat);
  crossDeck.position.set(18.5, 0.11, 0);
  crossDeck.receiveShadow = true;
  scene.add(crossDeck);
  [-4.1, 4.1].forEach((cz) => {
    const slope = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.1, 1.45), platDeckMat);
    slope.position.set(18.5, 0.39, cz);
    slope.rotation.x = cz < 0 ? -0.41 : 0.41;
    scene.add(slope);
  });

  // 4. Station Master Office + Dispatch Desk + Station Expansion Kiosk
  const office = createStationOffice(maxAnisotropy);
  office.position.set(-2, PLATFORM_HEIGHT, -15.2);
  scene.add(office);
  baseColliders.push({ id: 'station_office_body', minX: -10.2, maxX: 6.2, minZ: -17.9, maxZ: -12.5 });
  baseColliders.push({ id: 'office_dispatch_desk', minX: -0.65, maxX: 1.65, minZ: -12.15, maxZ: -11.05 });
  baseInteractables.push({
    id: 'dispatch_desk',
    title: 'Station Master Dispatch Desk',
    actionLabel: 'Open Train Control Dashboard [E / T]',
    x: 0.5,
    y: PLATFORM_HEIGHT,
    z: -11.6,
    radius: 3.1,
  });

  const upgradeKiosk = createUpgradeKiosk(maxAnisotropy);
  upgradeKiosk.position.set(3.8, PLATFORM_HEIGHT, -11.6);
  scene.add(upgradeKiosk);
  baseColliders.push({ id: 'upgrade_desk_box', minX: 2.9, maxX: 4.7, minZ: -12.1, maxZ: -11.1 });
  baseInteractables.push({
    id: 'upgrade_desk',
    title: 'Station Expansion & Track Desk',
    actionLabel: 'Inspect Station Upgrades [E / U]',
    x: 3.8,
    y: PLATFORM_HEIGHT,
    z: -11.6,
    radius: 3.1,
  });

  // 5. Dynamic 3D Train Registry, Crossover Switches, Track Occupancy Beacons & Signals (Tracks 1-6)
  const trainMeshes = new Map<
    string,
    { controller: TrainModelController; group: THREE.Group; halfLen: number }
  >();
  const liveTrainPositions: [number, number][] = [];

  const westSwitch: RailwaySwitchVisual = createRailwaySwitchVisual();
  westSwitch.group.position.set(-36, 0.04, 0);
  scene.add(westSwitch.group);

  const eastSwitch: RailwaySwitchVisual = createRailwaySwitchVisual();
  eastSwitch.group.position.set(33, 0.04, 0);
  eastSwitch.group.rotation.y = Math.PI;
  scene.add(eastSwitch.group);

  const trackBeacons: Record<TrackId, TrackOccupancyBeacon> = {
    1: createTrackOccupancyBeacon(),
    2: createTrackOccupancyBeacon(),
    3: createTrackOccupancyBeacon(),
    4: createTrackOccupancyBeacon(),
    5: createTrackOccupancyBeacon(),
    6: createTrackOccupancyBeacon(),
  };
  trackBeacons[1].group.position.set(-25.5, PLATFORM_HEIGHT, -5.0);
  trackBeacons[2].group.position.set(-25.5, PLATFORM_HEIGHT, 5.0);
  scene.add(trackBeacons[1].group, trackBeacons[2].group);

  const eastSignals: Record<TrackId, SemaphoreSignalController> = {
    1: createSemaphoreSignal(),
    2: createSemaphoreSignal(),
    3: createSemaphoreSignal(),
    4: createSemaphoreSignal(),
    5: createSemaphoreSignal(),
    6: createSemaphoreSignal(),
  };
  const westSignals: Record<TrackId, SemaphoreSignalController> = {
    1: createSemaphoreSignal(),
    2: createSemaphoreSignal(),
    3: createSemaphoreSignal(),
    4: createSemaphoreSignal(),
    5: createSemaphoreSignal(),
    6: createSemaphoreSignal(),
  };

  eastSignals[1].group.position.set(24.5, PLATFORM_HEIGHT, -5.5);
  westSignals[1].group.position.set(-28.0, 0, -5.5);
  westSignals[1].group.rotation.y = Math.PI;
  scene.add(eastSignals[1].group, westSignals[1].group);
  baseColliders.push({ id: 'sig1', minX: 24.0, maxX: 25.0, minZ: -6.0, maxZ: -5.0 });
  baseInteractables.push({
    id: 'signal_track1',
    title: 'Track 1 Semaphore Signal',
    actionLabel: 'Cycle Signal (RED / YELLOW / GREEN)',
    x: 24.5,
    y: PLATFORM_HEIGHT,
    z: -5.5,
    radius: 3.0,
  });

  eastSignals[2].group.position.set(24.5, PLATFORM_HEIGHT, 5.5);
  eastSignals[2].group.rotation.y = Math.PI;
  westSignals[2].group.position.set(-28.0, 0, 5.5);
  scene.add(eastSignals[2].group, westSignals[2].group);
  baseColliders.push({ id: 'sig2', minX: 24.0, maxX: 25.0, minZ: 5.0, maxZ: 6.0 });
  baseInteractables.push({
    id: 'signal_track2',
    title: 'Track 2 Semaphore Signal',
    actionLabel: 'Cycle Signal (RED / YELLOW / GREEN)',
    x: 24.5,
    y: PLATFORM_HEIGHT,
    z: 5.5,
    radius: 3.0,
  });

  // 6. Food Stalls, Benches & Streetlights (Level 1 Baseline)
  const teaStall = createFoodStall('মামার চা ও সিঙ্গারা', "MAMA'S CHA & SINGARA", 0xd94826, maxAnisotropy);
  teaStall.position.set(12.5, PLATFORM_HEIGHT, -10.5);
  scene.add(teaStall);
  baseColliders.push({ id: 'tea_stall_box', minX: 10.6, maxX: 14.4, minZ: -11.5, maxZ: -9.5 });
  baseInteractables.push({
    id: 'tea_stall',
    title: "Mama's Cha & Singara Stall",
    actionLabel: 'Collect Stall Fee & Sample Tea',
    x: 12.5,
    y: PLATFORM_HEIGHT,
    z: -9.0,
    radius: 3.0,
  });

  const jhalmuriStall = createFoodStall('ঝালমুড়ি ও পানীয়', 'JHALMURI & DRINKS', 0x1e7d52, maxAnisotropy);
  jhalmuriStall.position.set(-6.0, PLATFORM_HEIGHT, 9.6);
  jhalmuriStall.rotation.y = Math.PI;
  scene.add(jhalmuriStall);
  baseColliders.push({ id: 'jhalmuri_box', minX: -7.9, maxX: -4.1, minZ: 8.6, maxZ: 10.6 });
  baseInteractables.push({
    id: 'jhalmuri_stall',
    title: 'Jhalmuri & Cold Drinks Kiosk',
    actionLabel: 'Collect Kiosk Rent',
    x: -6.0,
    y: PLATFORM_HEIGHT,
    z: 8.2,
    radius: 3.0,
  });

  const fruitStall = createFoodStall('তাজা ফল ও পানীয়', 'FRESH FRUIT & WATER', 0xca8a04, maxAnisotropy);
  fruitStall.position.set(22.0, PLATFORM_HEIGHT, -10.5);
  scene.add(fruitStall);
  baseColliders.push({ id: 'fruit_stall_box', minX: 20.1, maxX: 23.9, minZ: -11.5, maxZ: -9.5 });

  const bookStall = createFoodStall('পত্রিকা ও বই', 'NEWSPAPER & BOOKS', 0x1d4ed8, maxAnisotropy);
  bookStall.position.set(15.8, 0, -19.2);
  scene.add(bookStall);
  baseColliders.push({ id: 'book_stall_box', minX: 14.0, maxX: 17.6, minZ: -20.2, maxZ: -18.2 });

  const benchCoords: [number, number, number, number][] = [
    [-14, PLATFORM_HEIGHT, -9.8, 0],
    [4, PLATFORM_HEIGHT, -9.8, 0],
    [18, PLATFORM_HEIGHT, -9.8, 0],
    [-14, PLATFORM_HEIGHT, 9.5, Math.PI],
    [4, PLATFORM_HEIGHT, 9.5, Math.PI],
    [18, PLATFORM_HEIGHT, 9.5, Math.PI],
  ];
  benchCoords.forEach(([bx, by, bz, rot], idx) => {
    const bench = createStationBench();
    bench.position.set(bx, by, bz);
    bench.rotation.y = rot;
    scene.add(bench);
    baseColliders.push({
      id: `bench_${idx}`,
      minX: bx - 1.1,
      maxX: bx + 1.1,
      minZ: bz - 0.35,
      maxZ: bz + 0.35,
    });
  });

  const lightCoords: [number, number, number, number][] = [
    [-25, PLATFORM_HEIGHT, -11.5, Math.PI / 2],
    [26, PLATFORM_HEIGHT, -11.5, Math.PI / 2],
    [-24, PLATFORM_HEIGHT, 10.6, -Math.PI / 2],
    [22, PLATFORM_HEIGHT, 10.6, -Math.PI / 2],
    [14, 0, -18.5, -Math.PI / 2],
    [-12, 0, -18.5, -Math.PI / 2],
    [-28, 0, -25.4, Math.PI / 2],
    [0, 0, -25.4, Math.PI / 2],
    [28, 0, -25.4, Math.PI / 2],
    [-28, 0, 47.6, -Math.PI / 2],
    [0, 0, 47.6, -Math.PI / 2],
    [28, 0, 47.6, -Math.PI / 2],
  ];
  lightCoords.forEach(([lx, ly, lz, rot]) => {
    const lamp = createStreetlight(streetBulbMat);
    lamp.position.set(lx, ly, lz);
    lamp.rotation.y = rot;
    scene.add(lamp);
  });

  // 7. Progressive Station Expansion Modules (Tracks 3, 4, 5, 6) + Tower Cranes
  const moduleGroups: Record<3 | 4 | 5 | 6, THREE.Group> = {
    3: new THREE.Group(),
    4: new THREE.Group(),
    5: new THREE.Group(),
    6: new THREE.Group(),
  };
  const moduleColliders: Record<3 | 4 | 5 | 6, ColliderBox[]> = {
    3: [],
    4: [],
    5: [],
    6: [],
  };
  const moduleInteractables: Record<3 | 4 | 5 | 6, InteractablePoint[]> = {
    3: [],
    4: [],
    5: [],
    6: [],
  };
  const moduleAnimTimers: Record<3 | 4 | 5 | 6, number> = {
    3: 0,
    4: 0,
    5: 0,
    6: 0,
  };

  // --- Module 3 (Level 2 -> Track 3 @ z=13.3) ---
  {
    const g = moduleGroups[3];
    buildTrackAssembly(TRACK_Z[3], g);
    const southCurb = new THREE.Mesh(new THREE.BoxGeometry(56, 0.04, 0.32), curbYellowMat);
    southCurb.position.set(0, PLATFORM_HEIGHT + 0.01, 11.34);
    g.add(southCurb);
    addHangingPlatformSign(g, -6, PLATFORM_HEIGHT + 4.25, 10.35, 3);
    addHangingPlatformSign(g, 6, PLATFORM_HEIGHT + 4.25, 10.35, 3);

    const cross3 = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.1, 4.5), plankCrossingMat);
    cross3.position.set(18.5, 0.11, 13.75);
    const slope3N = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.1, 1.35), platDeckMat);
    slope3N.position.set(18.5, 0.39, 12.05);
    slope3N.rotation.x = -0.42;
    g.add(cross3, slope3N);

    trackBeacons[3].group.position.set(-25.5, PLATFORM_HEIGHT, 11.0);
    eastSignals[3].group.position.set(24.5, PLATFORM_HEIGHT, 11.0);
    westSignals[3].group.position.set(-28.0, 0, 11.0);
    westSignals[3].group.rotation.y = Math.PI;
    g.add(trackBeacons[3].group, eastSignals[3].group, westSignals[3].group);

    moduleColliders[3].push({ id: 'sig3', minX: 24.0, maxX: 25.0, minZ: 10.5, maxZ: 11.5 });
    moduleInteractables[3].push({
      id: 'signal_track3',
      title: 'Track 3 Semaphore Signal',
      actionLabel: 'Cycle Signal (RED / YELLOW / GREEN)',
      x: 24.5,
      y: PLATFORM_HEIGHT,
      z: 11.0,
      radius: 3.0,
    });
  }

  // --- Module 4 (Level 3 -> Track 4 @ z=19.3 & Island Platform 3 @ z=21..28) ---
  {
    const g = moduleGroups[4];
    buildTrackAssembly(TRACK_Z[4], g);
    buildPlatformStructure(g, 24.5, 7.0, 56, [21.18], 'none', 0);

    const canopy3 = new THREE.Mesh(new THREE.BoxGeometry(28, 0.16, 3.8), canopyMat);
    canopy3.position.set(-2, PLATFORM_HEIGHT + 5.2, 24.5);
    canopy3.castShadow = true;
    g.add(canopy3);
    [-12, -4, 4, 9].forEach((px) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 5.2, 12), ironGreenMat);
      col.position.set(px, PLATFORM_HEIGHT + 2.6, 24.5);
      col.castShadow = true;
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 3.7), ironGreenMat);
      beam.position.set(px, PLATFORM_HEIGHT + 5.05, 24.5);
      g.add(col, beam);
      moduleColliders[4].push({
        id: `canopy3_col_${px}`,
        minX: px - 0.18,
        maxX: px + 0.18,
        minZ: 24.32,
        maxZ: 24.68,
      });
    });

    addHangingPlatformSign(g, -6, PLATFORM_HEIGHT + 4.25, 23.0, 4);
    addHangingPlatformSign(g, 6, PLATFORM_HEIGHT + 4.25, 23.0, 4);

    const infoBoard3 = createInfoBoard(maxAnisotropy);
    infoBoard3.position.set(11.2, PLATFORM_HEIGHT, 24.5);
    g.add(infoBoard3);
    moduleColliders[4].push({ id: 'info_board_3', minX: 9.8, maxX: 12.6, minZ: 24.3, maxZ: 24.7 });

    const p3Kiosk = createFoodStall('এক্সপ্রেস টি কর্নার', 'EXPRESS TEA KIOSK', 0x059669, maxAnisotropy);
    p3Kiosk.position.set(-8.5, PLATFORM_HEIGHT, 24.5);
    g.add(p3Kiosk);
    moduleColliders[4].push({
      id: 'p3_kiosk_box',
      minX: -10.3,
      maxX: -6.7,
      minZ: 23.5,
      maxZ: 25.5,
    });

    [-16, 2, 16].forEach((bx, idx) => {
      const bench = createStationBench();
      bench.position.set(bx, PLATFORM_HEIGHT, 24.5);
      g.add(bench);
      moduleColliders[4].push({
        id: `p3_bench_${idx}`,
        minX: bx - 1.1,
        maxX: bx + 1.1,
        minZ: 24.15,
        maxZ: 24.85,
      });
    });

    [-18, 22].forEach((lx) => {
      const lamp = createStreetlight(streetBulbMat);
      lamp.position.set(lx, PLATFORM_HEIGHT, 24.5);
      g.add(lamp);
    });

    const fbExt1 = createExtendedFootbridgeSection(11.1, 25.6, [
      { centerZ: 24.5, startX: -4.0, endX: 0.2, steps: 12 },
    ]);
    fbExt1.position.set(-24.0, 0, 0);
    g.add(fbExt1);
    moduleColliders[4].push(
      { id: 'fb_rail_e_m4', minX: -22.88, maxX: -21.0, minZ: 11.1, maxZ: 25.65, minY: 3.1 },
      { id: 'fb_rail_w_m4', minX: -26.8, maxX: -25.12, minZ: 11.55, maxZ: 23.4, minY: 3.1 },
      { id: 'fb_stair3_n', minX: -28.0, maxX: -25.1, minZ: 22.2, maxZ: 23.62, minY: 0.9 },
      { id: 'fb_stair3_s', minX: -28.0, maxX: -25.1, minZ: 25.38, maxZ: 26.8, minY: 0.9 },
    );

    const cross4 = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.1, 5.2), plankCrossingMat);
    cross4.position.set(18.5, 0.11, 18.4);
    const slope4S = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.1, 1.35), platDeckMat);
    slope4S.position.set(18.5, 0.39, 20.45);
    slope4S.rotation.x = 0.42;
    g.add(cross4, slope4S);

    trackBeacons[4].group.position.set(-25.5, PLATFORM_HEIGHT, 21.6);
    eastSignals[4].group.position.set(24.5, PLATFORM_HEIGHT, 21.6);
    eastSignals[4].group.rotation.y = Math.PI;
    westSignals[4].group.position.set(-28.0, 0, 21.6);
    g.add(trackBeacons[4].group, eastSignals[4].group, westSignals[4].group);

    moduleColliders[4].push({ id: 'sig4', minX: 24.0, maxX: 25.0, minZ: 21.1, maxZ: 22.1 });
    moduleInteractables[4].push({
      id: 'signal_track4',
      title: 'Track 4 Semaphore Signal',
      actionLabel: 'Cycle Signal (RED / YELLOW / GREEN)',
      x: 24.5,
      y: PLATFORM_HEIGHT,
      z: 21.6,
      radius: 3.0,
    });
  }

  // --- Module 5 (Level 4 -> Track 5 @ z=29.8) ---
  {
    const g = moduleGroups[5];
    buildTrackAssembly(TRACK_Z[5], g);
    const p3SouthCurb = new THREE.Mesh(new THREE.BoxGeometry(56, 0.04, 0.32), curbYellowMat);
    p3SouthCurb.position.set(0, PLATFORM_HEIGHT + 0.01, 27.82);
    g.add(p3SouthCurb);
    addHangingPlatformSign(g, -6, PLATFORM_HEIGHT + 4.25, 26.2, 5);
    addHangingPlatformSign(g, 6, PLATFORM_HEIGHT + 4.25, 26.2, 5);

    const cross5 = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.1, 4.6), plankCrossingMat);
    cross5.position.set(18.5, 0.11, 30.3);
    const slope5N = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.1, 1.35), platDeckMat);
    slope5N.position.set(18.5, 0.39, 28.55);
    slope5N.rotation.x = -0.42;
    g.add(cross5, slope5N);

    trackBeacons[5].group.position.set(-25.5, PLATFORM_HEIGHT, 27.4);
    eastSignals[5].group.position.set(24.5, PLATFORM_HEIGHT, 27.4);
    westSignals[5].group.position.set(-28.0, 0, 27.4);
    westSignals[5].group.rotation.y = Math.PI;
    g.add(trackBeacons[5].group, eastSignals[5].group, westSignals[5].group);

    moduleColliders[5].push({ id: 'sig5', minX: 24.0, maxX: 25.0, minZ: 26.9, maxZ: 27.9 });
    moduleInteractables[5].push({
      id: 'signal_track5',
      title: 'Track 5 Semaphore Signal',
      actionLabel: 'Cycle Signal (RED / YELLOW / GREEN)',
      x: 24.5,
      y: PLATFORM_HEIGHT,
      z: 27.4,
      radius: 3.0,
    });
  }

  // --- Module 6 (Level 5 -> Track 6 @ z=35.8 & South Glass Terminal Platform 4 @ z=37.5..46.0) ---
  {
    const g = moduleGroups[6];
    buildTrackAssembly(TRACK_Z[6], g);
    buildPlatformStructure(g, 41.75, 8.5, 60, [37.68], 'south', 0);

    const southTerminal = createSouthTerminalBuilding(maxAnisotropy, glassFacadeMatB);
    southTerminal.position.set(0, PLATFORM_HEIGHT, 43.2);
    g.add(southTerminal);
    moduleColliders[6].push({
      id: 'south_terminal_body',
      minX: -11.2,
      maxX: 11.2,
      minZ: 40.4,
      maxZ: 45.8,
    });

    addHangingPlatformSign(g, -7, PLATFORM_HEIGHT + 3.9, 39.2, 6);
    addHangingPlatformSign(g, 7, PLATFORM_HEIGHT + 3.9, 39.2, 6);

    const p4Cafe = createFoodStall('মেট্রো ক্যাফে', 'SOUTH METRO CAFE', 0x0284c7, maxAnisotropy);
    p4Cafe.position.set(-14.5, PLATFORM_HEIGHT, 41.2);
    p4Cafe.rotation.y = Math.PI;
    g.add(p4Cafe);
    moduleColliders[6].push({
      id: 'p4_cafe_box',
      minX: -16.3,
      maxX: -12.7,
      minZ: 40.2,
      maxZ: 42.2,
    });

    [-18, 16].forEach((bx, idx) => {
      const bench = createStationBench();
      bench.position.set(bx, PLATFORM_HEIGHT, 41.0);
      bench.rotation.y = Math.PI;
      g.add(bench);
      moduleColliders[6].push({
        id: `p4_bench_${idx}`,
        minX: bx - 1.1,
        maxX: bx + 1.1,
        minZ: 40.65,
        maxZ: 41.35,
      });
    });

    [-22, 22].forEach((lx) => {
      const lamp = createStreetlight(streetBulbMat);
      lamp.position.set(lx, PLATFORM_HEIGHT, 42.2);
      lamp.rotation.y = -Math.PI / 2;
      g.add(lamp);
    });

    const fbExt2 = createExtendedFootbridgeSection(25.6, 41.6, [
      { centerZ: 40.5, startX: -4.0, endX: 0.2, steps: 12 },
    ]);
    fbExt2.position.set(-24.0, 0, 0);
    g.add(fbExt2);
    moduleColliders[6].push(
      { id: 'fb_rail_e_m6', minX: -22.88, maxX: -21.0, minZ: 25.6, maxZ: 41.65, minY: 3.1 },
      { id: 'fb_rail_w_m6', minX: -26.8, maxX: -25.12, minZ: 25.55, maxZ: 39.4, minY: 3.1 },
      { id: 'fb_stair4_n', minX: -28.0, maxX: -25.1, minZ: 38.2, maxZ: 39.62, minY: 0.9 },
      { id: 'fb_stair4_s', minX: -28.0, maxX: -25.1, minZ: 41.38, maxZ: 42.8, minY: 0.9 },
      { id: 'fb_rail_s_end_m6', minX: -25.35, maxX: -22.65, minZ: 41.45, maxZ: 43.1, minY: 3.1 },
    );

    const cross6 = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.1, 5.2), plankCrossingMat);
    cross6.position.set(18.5, 0.11, 34.9);
    const slope6S = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.1, 1.35), platDeckMat);
    slope6S.position.set(18.5, 0.39, 36.95);
    slope6S.rotation.x = 0.42;
    g.add(cross6, slope6S);

    trackBeacons[6].group.position.set(-25.5, PLATFORM_HEIGHT, 38.2);
    eastSignals[6].group.position.set(24.5, PLATFORM_HEIGHT, 38.2);
    eastSignals[6].group.rotation.y = Math.PI;
    westSignals[6].group.position.set(-28.0, 0, 38.2);
    g.add(trackBeacons[6].group, eastSignals[6].group, westSignals[6].group);

    moduleColliders[6].push({ id: 'sig6', minX: 24.0, maxX: 25.0, minZ: 37.7, maxZ: 38.7 });
    moduleInteractables[6].push({
      id: 'signal_track6',
      title: 'Track 6 Semaphore Signal',
      actionLabel: 'Cycle Signal (RED / YELLOW / GREEN)',
      x: 24.5,
      y: PLATFORM_HEIGHT,
      z: 38.2,
      radius: 3.0,
    });
  }

  ([3, 4, 5, 6] as const).forEach((trackNum) => {
    moduleGroups[trackNum].visible = false;
    scene.add(moduleGroups[trackNum]);
  });

  // Animated Tower Cranes for visible construction sequences
  const cranes: ConstructionCraneRig[] = [createConstructionCrane(), createConstructionCrane()];
  cranes[0].group.position.set(-32, 0, 17.5);
  cranes[1].group.position.set(32, 0, 31.5);
  cranes.forEach((c) => {
    c.group.visible = false;
    scene.add(c.group);
  });

  // 8. Railway Level Crossing at x = +42
  const crossing: CrossingController = createLevelCrossing();
  crossing.group.position.set(42, 0, 0);
  scene.add(crossing.group);
  baseColliders.push({ id: 'crossing_hut', minX: 35.4, maxX: 38.2, minZ: -8.6, maxZ: -5.8 });
  baseInteractables.push({
    id: 'crossing_gate',
    title: 'East Railway Level Crossing',
    actionLabel: 'Toggle Crossing Barriers',
    x: 37.5,
    y: 0,
    z: -5.6,
    radius: 3.4,
  });

  // 9. Modern International City Architecture, Commercial Plazas, Flyovers & Urban Traffic
  // Commercial Plazas along North Boulevard & South Avenue
  const plazas: [string, string, number, number, number, number][] = [
    ['ঢাকা মেট্রো প্লাজা', 'DHAKA METRO PLAZA', 0x10b981, -26, -40.5, 0],
    ['বাংলামোটর গ্র্যান্ড মল', 'BANGLAMOTOR GRAND MALL', 0x0ea5e9, 0, -40.5, 0],
    ['শাপলা বিজনেস সেন্টার', 'SHAPLA BUSINESS CENTER', 0xf59e0b, 26, -40.5, 0],
    ['পদ্মা স্কয়ার', 'PADMA SQUARE', 0x6366f1, -22, 64.0, Math.PI],
    ['মেট্রোপলিটন আর্কেড', 'METRO ARCADE', 0x14b8a6, 22, 64.0, Math.PI],
  ];
  plazas.forEach(([bn, en, accent, px, pz, rot], idx) => {
    const plaza = createCommercialPlaza(bn, en, accent, maxAnisotropy, idx % 2 === 0 ? glassFacadeMatA : glassFacadeMatB);
    plaza.position.set(px, 0, pz);
    plaza.rotation.y = rot;
    scene.add(plaza);
    baseColliders.push({
      id: `city_plaza_${idx}`,
      minX: px - 6.0,
      maxX: px + 6.0,
      minZ: pz - 3.3,
      maxZ: pz + 3.3,
    });
  });

  // Hero High-Rise Skyscrapers framing the urban skyline (strictly outside train rail approaches)
  const heroTowers: [number, number, number, number, number, number, number, boolean][] = [
    [-40, -52, 11, 34, 11, 0x334155, 0x38bdf8, true],
    [-14, -55, 13, 44, 12, 0x1e293b, 0x10b981, false],
    [14, -54, 12, 39, 11, 0x3f3f46, 0xf59e0b, true],
    [40, -52, 11, 31, 11, 0x334155, 0x38bdf8, false],
    [-38, 74, 12, 36, 11, 0x1e293b, 0x14b8a6, false],
    [0, 76, 14, 48, 12, 0x334155, 0x38bdf8, true],
    [38, 74, 12, 33, 11, 0x27272a, 0xfacc15, false],
    [-72, -38, 11, 30, 11, 0x334155, 0x38bdf8, true],
    [-72, 58, 11, 32, 11, 0x1e293b, 0x10b981, false],
    [72, -38, 11, 29, 11, 0x334155, 0x38bdf8, false],
    [72, 58, 11, 35, 11, 0x1e293b, 0x14b8a6, true],
  ];
  heroTowers.forEach(([tx, tz, w, h, d, pod, neon, useA]) => {
    const tower = createModernSkyscraper(w, h, d, pod, useA ? glassFacadeMatA : glassFacadeMatB, neon);
    tower.position.set(tx, 0, tz);
    scene.add(tower);
  });

  // Instanced Distant Metropolitan Skyline Ring (skipping active train corridor z in [-12, +46])
  const skylinePositions: [number, number, number, number, number][] = [];
  for (let i = 0; i < 64; i++) {
    const angle = (i / 64) * Math.PI * 2;
    const dist = 88 + (i % 4) * 14;
    const sx = Math.cos(angle) * dist * 1.1;
    const sz = Math.sin(angle) * dist * 0.95;
    if (sz > -14 && sz < 48) continue;
    const w = 9 + (i % 4) * 2.5;
    const h = 24 + ((i * 17) % 38);
    skylinePositions.push([sx, sz, w, h, w]);
  }
  const skylineInst = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    glassFacadeMatA,
    skylinePositions.length,
  );
  const skyDummy = new THREE.Object3D();
  skylinePositions.forEach(([sx, sz, w, h, d], idx) => {
    skyDummy.position.set(sx, h / 2, sz);
    skyDummy.scale.set(w, h, d);
    skyDummy.rotation.y = (idx % 3) * 0.18;
    skyDummy.updateMatrix();
    skylineInst.setMatrixAt(idx, skyDummy.matrix);
  });
  skylineInst.instanceMatrix.needsUpdate = true;
  skylineInst.computeBoundingSphere();
  scene.add(skylineInst);

  // Elevated Highway Flyovers (West x=-56, East x=+56, y=8.9m -> piers placed safely outside tracks!)
  const westFlyover = createElevatedFlyover(144, 8.6, [-54, -36, -18, 46, 62], 8.9);
  westFlyover.position.set(-56, 0, 12);
  scene.add(westFlyover);

  const eastFlyover = createElevatedFlyover(144, 8.6, [-54, -36, -18, 46, 62], 8.9);
  eastFlyover.position.set(56, 0, 12);
  scene.add(eastFlyover);

  // Illuminated Bilingual City Billboards
  const bbSpecs: [string, string, string, string, number, number, number][] = [
    ['বাংলাদেশ রেলওয়ে · দ্রুতগতির সেবা', 'BANGLADESH RAILWAY · METRO HUB', '#062c22', '#10b981', -18, -24.5, 0],
    ['আধুনিক শাপলাপুর সিটি', 'MODERN INTERNATIONAL STATION', '#0c233a', '#38bdf8', 24, -24.5, 0],
    ['ইন্টারসিটি ও মেট্রো সংযোগ', 'EXPRESS TRANSIT CORRIDOR', '#1e1b4b', '#facc15', -18, 47.6, Math.PI],
  ];
  bbSpecs.forEach(([bn, en, bg, acc, bx, bz, rot], idx) => {
    const bb = createDigitalBillboard(bn, en, bg, acc, maxAnisotropy);
    bb.group.position.set(bx, 0, bz);
    bb.group.rotation.y = rot;
    scene.add(bb.group);
    billboardMats.push(bb.screenMat);
    baseColliders.push({
      id: `city_billboard_${idx}`,
      minX: bx - 0.45,
      maxX: bx + 0.45,
      minZ: bz - 0.45,
      maxZ: bz + 0.45,
    });
  });

  // Landscaped Urban Avenue Palms (on medians only, clear of station tracks)
  const urbanPalms: [number, number, number][] = [
    [-38, -22.2, 7.6],
    [-28, -22.2, 8.2],
    [28, -22.2, 7.8],
    [38, -22.2, 8.4],
    [-36, 47.2, 7.8],
    [36, 47.2, 8.0],
  ];
  urbanPalms.forEach(([tx, tz, h], idx) => {
    const palm = createCoconutPalm(h);
    palm.position.set(tx, 0, tz);
    palm.rotation.y = idx * 1.2;
    scene.add(palm);
    baseColliders.push({ id: `urban_palm_${idx}`, minX: tx - 0.5, maxX: tx + 0.5, minZ: tz - 0.5, maxZ: tz + 0.5 });
  });

  // Parked Rickshaw beside Forecourt Plaza
  const rickshaw1 = createRickshaw();
  rickshaw1.position.set(20.0, 0, -21.0);
  rickshaw1.rotation.y = -0.45;
  scene.add(rickshaw1);
  baseColliders.push({ id: 'rickshaw_1', minX: 19.1, maxX: 20.9, minZ: -22.0, maxZ: -20.0 });

  // Animated Urban Traffic Vehicles (North Boulevard, South Grand Avenue, East & West Flyovers)
  const trafficAgents: TrafficAgent[] = [];
  const vehicleColors = [0xe11d48, 0x0284c7, 0xf59e0b, 0x10b981, 0xf8fafc, 0x475569];
  const vehicleKinds: ('sedan' | 'suv' | 'city_bus' | 'metro_shuttle')[] = [
    'sedan',
    'suv',
    'city_bus',
    'sedan',
    'metro_shuttle',
    'suv',
  ];

  // Boulevard X-axis traffic
  for (let i = 0; i < 12; i++) {
    const isNorth = i < 6;
    const laneIdx = i % 2;
    const dir: 1 | -1 = laneIdx === 0 ? 1 : -1;
    const zCoord = isNorth ? (dir === 1 ? -28.6 : -33.4) : dir === 1 ? 55.8 : 51.2;
    const kind = vehicleKinds[i % vehicleKinds.length];
    const colorHex = vehicleColors[i % vehicleColors.length];
    const veh = createUrbanVehicle(kind, colorHex, vehicleHeadlightMat, vehicleTaillightMat);
    const startX = -75 + (i % 6) * 26;
    veh.position.set(startX, 0.04, zCoord);
    veh.rotation.y = dir === 1 ? 0 : Math.PI;
    scene.add(veh);
    trafficAgents.push({
      group: veh,
      axis: 'x',
      pos: startX,
      fixedCoord: zCoord,
      y: 0.04,
      dir,
      speed: kind === 'city_bus' ? 8.5 : 12.5 + (i % 3) * 1.8,
      limit: 92,
    });
  }

  // Elevated Flyover Z-axis traffic (West x=-56, East x=+56, y=8.95)
  for (let i = 0; i < 6; i++) {
    const isWest = i < 3;
    const dir: 1 | -1 = i % 2 === 0 ? 1 : -1;
    const xCoord = (isWest ? -56 : 56) + (dir === 1 ? 1.8 : -1.8);
    const kind = i % 3 === 0 ? 'city_bus' : 'sedan';
    const veh = createUrbanVehicle(
      kind,
      vehicleColors[(i + 2) % vehicleColors.length],
      vehicleHeadlightMat,
      vehicleTaillightMat,
    );
    const startZ = -52 + (i % 3) * 42;
    veh.position.set(xCoord, 8.95, startZ);
    veh.rotation.y = dir === 1 ? -Math.PI / 2 : Math.PI / 2;
    scene.add(veh);
    trafficAgents.push({
      group: veh,
      axis: 'z',
      pos: startZ,
      fixedCoord: xCoord,
      y: 8.95,
      dir,
      speed: 14.5 + (i % 2) * 2.5,
      limit: 68,
    });
  }

  // Subtle ground ring markers at interactable stations
  const ringGeo = new THREE.RingGeometry(0.75, 0.96, 24);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xf4c430,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  baseInteractables.forEach((item) => {
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(item.x, item.y + 0.03, item.z);
    scene.add(ring);
  });

  // 10. Living Station NPC Ecosystem + Emergency 3D Props
  let npcState = createInitialNpcSimulation();
  const npcRigs = new Map<string, ArticulatedNpcRig>();
  const hazardProps = new Map<string, EmergencyHazardProp>();

  const syncNpcMeshes = (elapsed: number, dt: number) => {
    const liveIds = new Set<string>();
    for (let i = 0; i < npcState.npcs.length; i++) {
      const agent = npcState.npcs[i];
      liveIds.add(agent.id);
      let rig = npcRigs.get(agent.id);
      if (!rig) {
        rig = createArticulatedNpc(agent.appearance);
        rig.group.position.set(agent.x, agent.y, agent.z);
        rig.group.rotation.y = agent.yaw;
        scene.add(rig.group);
        npcRigs.set(agent.id, rig);
      }

      rig.group.position.set(agent.x, agent.y, agent.z);
      rig.group.rotation.y = agent.yaw;

      const phase =
        agent.currentSpeed > 0.05
          ? agent.distanceWalked * 2.5
          : elapsed * 1.4 + i * 0.7;
      animateNpcRig(
        rig,
        agent.pose,
        phase,
        Math.min(1, agent.currentSpeed / Math.max(0.5, agent.baseSpeed)),
        dt,
        agent.stumbleTimer,
      );

      if (rig.markerMesh) {
        const isPoliceResponding =
          (agent.role === 'railway_police' || agent.role === 'bd_police') &&
          Boolean(agent.assignedMissionId);
        const isMissionActor = Boolean(agent.assignedMissionId && agent.missionRole);
        const showMarker = isMissionActor || isPoliceResponding || Boolean(agent.incidentKind) || agent.wantsToTalk;
        rig.markerMesh.visible = showMarker;
        if (showMarker) {
          rig.markerMesh.position.y = 2.15 + Math.sin(elapsed * 4.5 + i) * 0.09;
          rig.markerMesh.rotation.y = elapsed * 2.2;
          const mat = rig.markerMesh.material as THREE.MeshBasicMaterial;
          if (isPoliceResponding) {
            mat.color.setHex(0x38bdf8);
          } else if (isMissionActor || agent.incidentKind) {
            mat.color.setHex(0xff3b30);
          } else {
            mat.color.setHex(0xfacc15);
          }
        }
      }
    }

    for (const [id, rig] of npcRigs.entries()) {
      if (!liveIds.has(id)) {
        scene.remove(rig.group);
        disposeObjectGroup(rig.group);
        npcRigs.delete(id);
      }
    }
  };

  syncNpcMeshes(0, 0.016);

  // 11. Monsoon Rain Streak System
  const rainCount = 320;
  const rainPositions = new Float32Array(rainCount * 6);
  const rainOffsets = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount; i++) {
    rainOffsets[i * 3] = (Math.random() - 0.5) * 44;
    rainOffsets[i * 3 + 1] = Math.random() * 18;
    rainOffsets[i * 3 + 2] = (Math.random() - 0.5) * 44;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rainMat = new THREE.LineBasicMaterial({
    color: 0xcfe8f7,
    transparent: true,
    opacity: 0.55,
  });
  const rainLines = new THREE.LineSegments(rainGeo, rainMat);
  rainLines.visible = false;
  rainLines.frustumCulled = false;
  scene.add(rainLines);

  // 12. Controllable Station Master Character
  const character = createStationMasterCharacter();
  character.group.position.set(-2, PLATFORM_HEIGHT, -8.2);
  scene.add(character.group);

  const prevSignals: Record<TrackId, SignalAspect> = {
    1: 'red',
    2: 'red',
    3: 'red',
    4: 'red',
    5: 'red',
    6: 'red',
  };
  const prevOcc: Record<TrackId, boolean> = {
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
  };
  let prevSwitchPos: SwitchPosition = 'straight';
  let prevUnlockedTracks = 2;
  let craneTimer = 0;
  let lightningFlash = 0;

  const skyTopCol = new THREE.Color();
  const skyMidCol = new THREE.Color();
  const skyHorCol = new THREE.Color();
  const dayTop = new THREE.Color(0x286fb5);
  const dayMid = new THREE.Color(0x74bae2);
  const dayHor = new THREE.Color(0xcde9f7);
  const duskTop = new THREE.Color(0x252a5c);
  const duskMid = new THREE.Color(0xd96b43);
  const duskHor = new THREE.Color(0xfbbf72);
  const nightTop = new THREE.Color(0x060b18);
  const nightMid = new THREE.Color(0x0e1a30);
  const nightHor = new THREE.Color(0x1b2d4a);
  const moonNightColor = new THREE.Color(0x93c5fd);
  const sunWarmColor = new THREE.Color(0xfff1d6);
  const duskSunColor = new THREE.Color(0xffa952);
  const stormTopCol = new THREE.Color(0x3a495c);
  const stormMidCol = new THREE.Color(0x4b5c70);
  const stormHorCol = new THREE.Color(0x617387);
  let rainBlend = 0;
  let lastSkyDaylight = -1;
  let lastRainBlend = -1;

  const triggerLightningFlash = () => {
    lightningFlash = 1.6;
  };

  const closestTrainDistance = (x: number, z: number): number => {
    let minD = Infinity;
    for (let i = 0; i < liveTrainPositions.length; i++) {
      const d = Math.hypot(x - liveTrainPositions[i][0], z - liveTrainPositions[i][1]);
      if (d < minD) minD = d;
    }
    return minD;
  };

  const getGroundSurface = (x: number, z: number, y = 0): 'concrete' | 'wood' | 'grass' => {
    if (y >= FOOTBRIDGE_HEIGHT - 0.5) return 'wood';
    if (x >= 16 && x <= 21 && z >= -4.7 && z <= 37.5) return 'wood';
    return 'concrete';
  };

  function disposeObjectGroup(group: THREE.Group) {
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          if (m) m.dispose();
        });
      }
    });
  }

  const _projVec = new THREE.Vector3();
  const getProjectedNpcBubbles = (camera: THREE.Camera): NpcFloatingBubble[] => {
    const results: { dist: number; bubble: NpcFloatingBubble }[] = [];
    for (let i = 0; i < npcState.npcs.length; i++) {
      const npc = npcState.npcs[i];
      if (!npc.speechText || npc.speechTimer <= 0) continue;

      const dist = _projVec.set(npc.x, npc.y + 2.05, npc.z).distanceTo(camera.position);
      if (dist > 28) continue;

      _projVec.project(camera);
      if (_projVec.z < -1 || _projVec.z > 1) continue;

      const screenX = (_projVec.x + 1) * 0.5;
      const screenY = (-_projVec.y + 1) * 0.5;
      if (screenX < 0.06 || screenX > 0.94 || screenY < 0.14 || screenY > 0.88) continue;

      results.push({
        dist,
        bubble: {
          id: `${npc.id}_${Math.round(npc.speechTimer * 10)}`,
          npcId: npc.id,
          screenX,
          screenY,
          text: npc.speechText,
          subText: npc.speechSubText ?? undefined,
          tone: npc.speechTone,
        },
      });
    }
    results.sort((a, b) => a.dist - b.dist);
    return results.slice(0, 5).map((r) => r.bubble);
  };

  const resetNpcs = () => {
    for (const rig of npcRigs.values()) {
      scene.remove(rig.group);
      disposeObjectGroup(rig.group);
    }
    npcRigs.clear();
    for (const prop of hazardProps.values()) {
      scene.remove(prop.group);
      disposeObjectGroup(prop.group);
    }
    hazardProps.clear();
    npcState = createInitialNpcSimulation();
    syncNpcMeshes(0, 0.016);
  };

  const update = (
    simState: StationSimState,
    trainState: TrainSimulationState,
    weather: WeatherMode,
    playerX: number,
    playerY: number,
    playerZ: number,
    dt: number,
    elapsed: number,
    stepNpcAi = true,
  ) => {
    const unlockedTracks = simState.unlockedTracks;

    // Trigger 3D construction animation when new tracks unlock
    if (unlockedTracks > prevUnlockedTracks) {
      for (let t = prevUnlockedTracks + 1; t <= unlockedTracks; t++) {
        if (t === 3 || t === 4 || t === 5 || t === 6) {
          moduleAnimTimers[t] = 3.5;
        }
      }
      craneTimer = 3.6;
      prevUnlockedTracks = unlockedTracks;
    } else if (unlockedTracks < prevUnlockedTracks) {
      ([3, 4, 5, 6] as const).forEach((t) => {
        moduleAnimTimers[t] = 0;
        moduleGroups[t].position.y = 0;
      });
      craneTimer = 0;
      prevUnlockedTracks = unlockedTracks;
    }

    ([3, 4, 5, 6] as const).forEach((t) => {
      const grp = moduleGroups[t];
      const active = unlockedTracks >= t;
      grp.visible = active;
      if (active && moduleAnimTimers[t] > 0) {
        moduleAnimTimers[t] = Math.max(0, moduleAnimTimers[t] - dt);
        const progress = 1 - moduleAnimTimers[t] / 3.5;
        const eased = 1 - Math.pow(1 - progress, 3);
        grp.position.y = -3.0 * (1 - eased);
      } else {
        grp.position.y = 0;
      }
    });

    if (craneTimer > 0) {
      craneTimer = Math.max(0, craneTimer - dt);
      cranes.forEach((crane, idx) => {
        crane.group.visible = craneTimer > 0;
        crane.jibPivot.rotation.y = Math.sin(elapsed * 1.4 + idx * 1.8) * 1.2;
        crane.trolley.position.x = 5.2 + Math.sin(elapsed * 2.2) * 2.4;
      });
    } else {
      cranes[0].group.visible = false;
      cranes[1].group.visible = false;
    }

    // Sync signals, switches, and occupancy beacons across Tracks 1..6
    ([1, 2, 3, 4, 5, 6] as const).forEach((t) => {
      const aspect = getTrackSignal(simState, t);
      if (aspect !== prevSignals[t]) {
        prevSignals[t] = aspect;
        eastSignals[t].setAspect(aspect);
        westSignals[t].setAspect(aspect);
      }
      const occ = trainState.trackOccupancies[t]?.occupied ?? false;
      if (occ !== prevOcc[t]) {
        prevOcc[t] = occ;
        trackBeacons[t].setOccupied(occ);
      }
    });

    if (trainState.switchPosition !== prevSwitchPos) {
      prevSwitchPos = trainState.switchPosition;
      westSwitch.setPosition(prevSwitchPos);
      eastSwitch.setPosition(prevSwitchPos);
    }

    crossing.update(simState.crossingGateClosed, dt, elapsed);

    // Rebuild colliders & interactables from static base + unlocked track modules + dynamic trains
    colliders.length = 0;
    colliders.push(...baseColliders);
    interactables.length = 0;
    interactables.push(...baseInteractables);

    ([3, 4, 5, 6] as const).forEach((t) => {
      if (unlockedTracks >= t) {
        colliders.push(...moduleColliders[t]);
        interactables.push(...moduleInteractables[t]);
      }
    });

    // Keep Footover Bridge south end closed visually and physically at current unlocked terminus
    fbSouthCapBase.visible = unlockedTracks < 4;
    fbSouthCapM4.visible = unlockedTracks >= 4 && unlockedTracks < 6;
    if (unlockedTracks < 4) {
      colliders.push({
        id: 'fb_rail_s_end_base',
        minX: -25.35,
        maxX: -22.65,
        minZ: 11.05,
        maxZ: 12.7,
        minY: 3.1,
      });
    } else if (unlockedTracks < 6) {
      colliders.push({
        id: 'fb_rail_s_end_m4',
        minX: -25.35,
        maxX: -22.65,
        minZ: 25.45,
        maxZ: 27.1,
        minY: 3.1,
      });
    }

    liveTrainPositions.length = 0;
    const activeIds = new Set<string>();
    for (let i = 0; i < trainState.trains.length; i++) {
      const t = trainState.trains[i];
      if (t.status === 'Scheduled' || t.status === 'Departed') continue;
      if (t.assignedPlatform === null && Math.abs(t.x) > 95) continue;

      activeIds.add(t.id);
      let entry = trainMeshes.get(t.id);
      if (!entry) {
        const controller = createTrainByCategory(t.category, t.coachCount, t.direction === 1);
        scene.add(controller.group);
        const halfLen = ((t.coachCount + 1) * 11.1) / 2;
        entry = { controller, group: controller.group, halfLen };
        trainMeshes.set(t.id, entry);
      }

      const engineBob = Math.sin(elapsed * 21 + i * 1.1) * (t.speed > 0.2 ? 0.008 : 0.004);
      entry.group.position.set(t.x, 0.16 + engineBob, t.z);
      const obsCoachIdx =
        t.operationalEvent && !t.operationalEvent.resolved && t.doorsObstructed
          ? t.operationalEvent.coachIndex
          : null;
      entry.controller.setDoorOpen(t.doorOpenProgress, obsCoachIdx);
      liveTrainPositions.push([t.x, t.z]);

      colliders.push({
        id: `dyn_train_${t.id}`,
        minX: t.x - entry.halfLen,
        maxX: t.x + entry.halfLen,
        minZ: t.z - 1.3,
        maxZ: t.z + 1.3,
        maxY: 4.2,
      });

      const inspectZByPlatform: Record<TrackId, number> = {
        1: -5.6,
        2: 5.6,
        3: 10.9,
        4: 21.8,
        5: 27.2,
        6: 38.4,
      };
      const doorInteractZByPlatform: Record<TrackId, number> = {
        1: -5.3,
        2: 5.3,
        3: 11.1,
        4: 21.6,
        5: 27.4,
        6: 38.1,
      };

      if (
        (t.status === 'At Platform' || t.status === 'Boarding') &&
        t.assignedPlatform &&
        t.operationalEvent &&
        !t.operationalEvent.resolved
      ) {
        const ev = t.operationalEvent;
        const doorX = t.x + (t.coaches[ev.coachIndex]?.doorXOffset ?? 0);
        interactables.push({
          id: 'train_operational_event',
          title: `${ev.title} (${ev.coachNumber})`,
          actionLabel: `${ev.primaryActionLabel} [E]`,
          x: doorX,
          y: PLATFORM_HEIGHT,
          z: doorInteractZByPlatform[t.assignedPlatform],
          radius: 3.8,
          trainId: t.id,
        });
      }

      if ((t.status === 'At Platform' || t.status === 'Boarding') && t.assignedPlatform) {
        interactables.push({
          id: `platform_train_${t.assignedPlatform}`,
          title: `${t.name} (#${t.trainNumber})`,
          actionLabel: 'Inspect Train & Tickets [E]',
          x: t.x,
          y: PLATFORM_HEIGHT,
          z: inspectZByPlatform[t.assignedPlatform],
          radius: 4.5,
          trainId: t.id,
        });
      }
    }

    for (const [id, entry] of trainMeshes.entries()) {
      if (!activeIds.has(id)) {
        scene.remove(entry.group);
        disposeObjectGroup(entry.group);
        trainMeshes.delete(id);
      }
    }

    // Step urban traffic
    for (let i = 0; i < trafficAgents.length; i++) {
      const car = trafficAgents[i];
      car.pos += car.dir * car.speed * dt;
      if (car.pos > car.limit) car.pos = -car.limit;
      if (car.pos < -car.limit) car.pos = car.limit;
      if (car.axis === 'x') {
        car.group.position.set(car.pos, car.y, car.fixedCoord);
      } else {
        car.group.position.set(car.fixedCoord, car.y, car.pos);
      }
    }

    // Step living NPC AI, pathfinding, security missions & capsule collisions
    let outSimState = simState;
    let outPlayerX = playerX;
    let outPlayerZ = playerZ;
    let npcEvents: NpcStepEvents = {
      playBumpSound: false,
      playVendorSound: false,
      playWhistle: false,
      playRadio: false,
      playSiren: false,
      bumpLineBn: null,
      bumpLineEn: null,
      newIncident: null,
      expiredIncident: null,
      newMission: null,
      resolvedMission: null,
      failedMission: null,
      unlockedAchievement: null,
      announcementBn: null,
    };

    if (stepNpcAi) {
      const npcRes = stepNpcSimulation(
        npcState,
        simState,
        trainState,
        { x: playerX, y: playerY, z: playerZ },
        colliders,
        dt,
      );
      npcState = npcRes.npcState;
      outSimState = npcRes.simState;
      outPlayerX = npcRes.playerX;
      outPlayerZ = npcRes.playerZ;
      npcEvents = npcRes.events;
    }
    syncNpcMeshes(elapsed, dt);

    // Sync 3D emergency hazard props
    const livePropIds = new Set<string>();
    for (let mIdx = 0; mIdx < npcState.missions.length; mIdx++) {
      const m = npcState.missions[mIdx];
      if (!m.hasHazardProp || !m.propActive || !m.propKind) continue;
      livePropIds.add(m.id);
      let prop = hazardProps.get(m.id);
      if (!prop) {
        prop = createEmergencyHazardProp(m.propKind);
        prop.group.position.set(m.x, m.y, m.z);
        scene.add(prop.group);
        hazardProps.set(m.id, prop);
      }
      prop.group.position.set(m.x, m.y, m.z);
      prop.update(elapsed);

      interactables.push({
        id: 'emergency_hazard',
        title: m.title,
        actionLabel:
          m.propKind === 'fire'
            ? 'Extinguish Fire Hazard [E]'
            : m.propKind === 'package'
              ? 'Inspect & Secure Suspicious Package [E]'
              : 'Recover Stolen Blue Suitcase [E]',
        x: m.x,
        y: m.y,
        z: m.z,
        radius: 3.1,
        missionId: m.id,
      });
    }
    for (const [pid, prop] of hazardProps.entries()) {
      if (!livePropIds.has(pid)) {
        scene.remove(prop.group);
        disposeObjectGroup(prop.group);
        hazardProps.delete(pid);
      }
    }

    // Gentle cloud drift
    for (let i = 0; i < cloudClusters.length; i++) {
      cloudClusters[i].position.x += dt * 0.45;
      if (cloudClusters[i].position.x > 120) cloudClusters[i].position.x = -120;
    }

    // Smoothly transition monsoon weather & rain streaks
    const targetRain = weather === 'rain' ? 1 : 0;
    if (rainBlend !== targetRain) {
      const step = dt * 0.45;
      rainBlend =
        rainBlend < targetRain
          ? Math.min(targetRain, rainBlend + step)
          : Math.max(targetRain, rainBlend - step);
    }

    if (rainBlend > 0.08) {
      rainLines.visible = true;
      rainMat.opacity = Math.min(0.55, rainBlend * 0.58);
      for (let i = 0; i < rainCount; i++) {
        rainOffsets[i * 3 + 1] -= dt * 22;
        rainOffsets[i * 3] -= dt * 2.2;
        if (rainOffsets[i * 3 + 1] < 0) {
          rainOffsets[i * 3 + 1] = 18;
          rainOffsets[i * 3] = (Math.random() - 0.5) * 44;
          rainOffsets[i * 3 + 2] = (Math.random() - 0.5) * 44;
        }
        const rx = outPlayerX + rainOffsets[i * 3];
        const ry = rainOffsets[i * 3 + 1];
        const rz = outPlayerZ + rainOffsets[i * 3 + 2];
        const base = i * 6;
        rainPositions[base] = rx;
        rainPositions[base + 1] = ry;
        rainPositions[base + 2] = rz;
        rainPositions[base + 3] = rx - 0.09;
        rainPositions[base + 4] = ry - 0.85;
        rainPositions[base + 5] = rz;
      }
      rainGeo.attributes.position.needsUpdate = true;
    } else {
      rainLines.visible = false;
    }

    if (lightningFlash > 0) {
      lightningFlash = Math.max(0, lightningFlash - dt * 5.2);
    }

    // 24h Day/Dusk/Night Cycle & Metropolitan City Illumination
    const dayHour = (outSimState.gameMinutes % 1440) / 60;
    let daylightFactor = 1.0;
    if (dayHour < 4.5 || dayHour >= 19.5) {
      daylightFactor = 0.0;
    } else if (dayHour < 7.0) {
      daylightFactor = (dayHour - 4.5) / 2.5;
    } else if (dayHour >= 17.0) {
      daylightFactor = 1 - (dayHour - 17.0) / 2.5;
    }
    const nightFactor = 1 - daylightFactor;
    const duskFactor = Math.sin(daylightFactor * Math.PI);

    // Night illumination for glass skyscrapers, streetlamps, billboards, and traffic lights
    const nightGlow = nightFactor * 0.9 + duskFactor * 0.35;
    glassFacadeMatA.emissiveIntensity = 0.05 + nightGlow * 1.15;
    glassFacadeMatB.emissiveIntensity = 0.05 + nightGlow * 1.15;
    streetBulbMat.emissiveIntensity = 0.2 + nightGlow * 2.1;
    vehicleHeadlightMat.emissiveIntensity = 0.25 + nightGlow * 2.2;
    vehicleTaillightMat.emissiveIntensity = 0.35 + nightGlow * 1.9;
    for (let b = 0; b < billboardMats.length; b++) {
      billboardMats[b].emissiveIntensity = 0.32 + nightGlow * 0.95;
    }
    starMat.opacity = Math.max(0, (nightFactor - 0.2) * 1.15) * (1 - rainBlend);
    starField.visible = starMat.opacity > 0.02;

    const rainDim = 1 - 0.35 * rainBlend;
    sunLight.intensity = (0.38 + daylightFactor * 1.32) * rainDim + lightningFlash;
    sunLight.color.lerpColors(moonNightColor, sunWarmColor, daylightFactor);
    if (duskFactor > 0.25 && rainBlend < 0.5) {
      sunLight.color.lerp(duskSunColor, duskFactor * 0.55 * (1 - rainBlend));
    }
    hemiLight.intensity = (0.48 + daylightFactor * 0.4) * rainDim;

    skyDome.mesh.visible = true;
    if (
      Math.abs(daylightFactor - lastSkyDaylight) > 0.004 ||
      Math.abs(rainBlend - lastRainBlend) > 0.008 ||
      lightningFlash > 0.02
    ) {
      lastSkyDaylight = daylightFactor;
      lastRainBlend = rainBlend;
      skyTopCol.lerpColors(nightTop, dayTop, daylightFactor);
      skyMidCol.lerpColors(nightMid, dayMid, daylightFactor);
      skyHorCol.lerpColors(nightHor, dayHor, daylightFactor);
      if (duskFactor > 0.05) {
        skyTopCol.lerp(duskTop, duskFactor * 0.5 * (1 - rainBlend));
        skyMidCol.lerp(duskMid, duskFactor * 0.65 * (1 - rainBlend));
        skyHorCol.lerp(duskHor, duskFactor * 0.72 * (1 - rainBlend));
      }
      if (rainBlend > 0.005) {
        const stormScale = 0.45 + daylightFactor * 0.55;
        const flashAdd = lightningFlash * 0.22;
        skyTopCol.lerp(
          stormTopCol.setRGB(0.2 * stormScale + flashAdd, 0.26 * stormScale + flashAdd, 0.34 * stormScale + flashAdd),
          rainBlend,
        );
        skyMidCol.lerp(
          stormMidCol.setRGB(0.24 * stormScale + flashAdd, 0.3 * stormScale + flashAdd, 0.38 * stormScale + flashAdd),
          rainBlend,
        );
        skyHorCol.lerp(
          stormHorCol.setRGB(0.28 * stormScale + flashAdd, 0.34 * stormScale + flashAdd, 0.42 * stormScale + flashAdd),
          rainBlend,
        );
      }
      skyDome.updateGradient(skyTopCol, skyMidCol, skyHorCol);
      skyColor.copy(skyHorCol);
    }
    cloudMat.opacity = THREE.MathUtils.lerp(0.22 + daylightFactor * 0.56, 0.24, rainBlend);

    scene.background = skyColor;
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(skyColor);
      scene.fog.near = THREE.MathUtils.lerp(70, 35, rainBlend);
      scene.fog.far = THREE.MathUtils.lerp(210, 135, rainBlend);
    }

    return {
      simState: outSimState,
      playerX: outPlayerX,
      playerZ: outPlayerZ,
      npcEvents,
    };
  };

  const dispose = () => {
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments || obj instanceof THREE.Points) {
        obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          if (m) m.dispose();
        });
      }
    });
  };

  return {
    scene,
    character,
    colliders,
    interactables,
    getNpcState: () => npcState,
    resetNpcs,
    update,
    getProjectedNpcBubbles,
    triggerLightningFlash,
    closestTrainDistance,
    getGroundSurface,
    dispose,
  };
}
