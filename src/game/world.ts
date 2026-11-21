import * as THREE from 'three';
import {
  createBananaClump,
  createCommercialPlaza,
  createConstructionCrane,
  createDigitalBillboard,
  createDiscardedRustedSleeperCluster,
  createDwarfShuntSignal,
  createElevatedFlyover,
  createEmergencyHazardProp,
  createExtendedFootbridgeSection,
  createFoodStall,
  createFootoverBridge,
  createInfoBoard,
  createKilometerMarkerPost,
  createLevelCrossing,
  createModernSkyscraper,
  createOvergrownWeedClusterGeometry,
  createRailwaySwitchVisual,
  createRelayEquipmentCabinet,
  createReserveSleeperStack,
  createRickshaw,
  createSemaphoreSignal,
  createSignalGantryBridge,
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
  createYardFloodlightMast,
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
  createBallastVariantTexturePair,
  createGlassFacadeTexture,
  createGrassTexture,
  createMetropolitanGroundTexture,
  createPlatformSignTexture,
  createPlatformTileTexturePair,
  createSignboardTexture,
  createSleeperTexturePair,
  createTrackYardGroundTexturePair,
} from './textures';
import {
  computeSleeperInstanceProps,
  generateTrackEdgeWeedPlacements,
  generateTrackShoulderCobbles,
  getDiscardedSleeperPlacements,
  getTrackBallastSegments,
  type BallastVariant,
} from './trackDecor';
import { FOOTBRIDGE_HEIGHT, groundHeightAt, PLATFORM_HEIGHT } from './physics';
import {
  CHAPTER2_STATION_NAME_BN,
  CHAPTER2_STATION_NAME_EN,
  getTrackSignal,
  STATION_NAME_BN,
  STATION_NAME_EN,
} from './rules';
import { TRACK_Z } from './trainManager';
import type {
  ChapterId,
  ColliderBox,
  InteractablePoint,
  NpcFloatingBubble,
  OpsEmergencyEvent,
  SignalAspect,
  StationSimState,
  SwitchPosition,
  TrackId,
  TrainSimulationState,
  VipSecurityProtocol,
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
    opsEvents?: OpsEmergencyEvent[],
    powerOutageActive?: boolean,
    vipProtocol?: VipSecurityProtocol | null,
  ) => {
    simState: StationSimState;
    playerX: number;
    playerZ: number;
    npcEvents: NpcStepEvents;
    vipPlatformCounts: Partial<Record<TrackId, number>>;
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
  chapterId: ChapterId = 1,
): StationWorldHandle {
  const isCh2 = chapterId === 2;
  const southShift = isCh2 ? 22 : 0;
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
  const metroGroundTex = createMetropolitanGroundTexture(maxAnisotropy);
  const urbanConcreteMat = new THREE.MeshStandardMaterial({
    map: metroGroundTex,
    color: 0xffffff,
    roughness: 0.9,
  });
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
  southParkStrip.position.set(0, 0.02, 47.0 + southShift);
  southParkStrip.receiveShadow = true;
  scene.add(southParkStrip);

  // Paved station forecourt granite apron
  const plazaStoneMat = new THREE.MeshStandardMaterial({ color: 0x8e96a0, roughness: 0.78 });
  const forecourt = new THREE.Mesh(new THREE.PlaneGeometry(82, 12.5), plazaStoneMat);
  forecourt.rotation.x = -Math.PI / 2;
  forecourt.position.set(0, 0.025, -17.8);
  forecourt.receiveShadow = true;
  scene.add(forecourt);

  // North Station Boulevard (z = -31) & South Grand Avenue (shifted south in Chapter 2)
  const avenueTex = createAsphaltAvenueTexture(maxAnisotropy);
  const avenueMat = new THREE.MeshStandardMaterial({ map: avenueTex, color: 0xffffff, roughness: 0.86 });
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xb0b8c2, roughness: 0.78 });

  [
    { z: -31.0, sidewalkN: -36.8, sidewalkS: -25.2 },
    { z: 53.5 + southShift, sidewalkN: 47.7 + southShift, sidewalkS: 59.3 + southShift },
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

  // 2. Railway Ballast Berms (Segmented Texture Variants), Sub-Ballast Yard, Weathered/Rusted Sleepers & Fasteners
  const ballastMatCache = new Map<string, THREE.MeshStandardMaterial>();
  const getBallastMaterial = (variant: BallastVariant, repeatX: number) => {
    const key = `${variant}_${repeatX}`;
    let mat = ballastMatCache.get(key);
    if (!mat) {
      const pair = createBallastVariantTexturePair(variant, repeatX, maxAnisotropy);
      mat = new THREE.MeshStandardMaterial({
        map: pair.map,
        bumpMap: pair.bumpMap,
        bumpScale: 0.06,
        color: 0xffffff,
        roughness: variant === 'station_oiled' ? 0.88 : 0.95,
      });
      ballastMatCache.set(key, mat);
    }
    return mat;
  };
  const yardGroundPair = createTrackYardGroundTexturePair(maxAnisotropy);
  const yardGroundMat = new THREE.MeshStandardMaterial({
    map: yardGroundPair.map,
    bumpMap: yardGroundPair.bumpMap,
    bumpScale: 0.035,
    color: 0xffffff,
    roughness: 0.94,
  });
  const sleeperPair = createSleeperTexturePair(maxAnisotropy);
  const sleeperMat = new THREE.MeshStandardMaterial({
    map: sleeperPair.map,
    bumpMap: sleeperPair.bumpMap,
    bumpScale: 0.042,
    color: 0xffffff,
    roughness: 0.9,
  });
  const discardedSleeperMat = new THREE.MeshStandardMaterial({
    map: sleeperPair.map,
    bumpMap: sleeperPair.bumpMap,
    bumpScale: 0.042,
    color: 0x70412b,
    roughness: 0.92,
  });
  const clipMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.56, metalness: 0.28 });
  const railWebMat = new THREE.MeshStandardMaterial({ color: 0x573b2d, roughness: 0.72, metalness: 0.22 });
  const railHeadMat = new THREE.MeshStandardMaterial({ color: 0xc4cdd6, roughness: 0.25, metalness: 0.28 });

  // Custom trapezoidal crushed-stone ballast berm geometry parameterized by segment length
  const createBallastBermGeometry = (lengthX: number): THREE.BufferGeometry => {
    const xSegs = Math.max(4, Math.round(lengthX / 16));
    const profile: [number, number, number][] = [
      [-2.35, 0.015, 0.0],
      [-1.32, 0.105, 0.25],
      [1.32, 0.105, 0.75],
      [2.35, 0.015, 1.0],
    ];
    const cols = profile.length;
    const rows = xSegs + 1;
    const positions = new Float32Array(rows * cols * 3);
    const uvs = new Float32Array(rows * cols * 2);
    const indices: number[] = [];

    for (let r = 0; r < rows; r++) {
      const t = r / xSegs;
      const x = -lengthX / 2 + t * lengthX;
      for (let c = 0; c < cols; c++) {
        const [pz, py, pv] = profile[c];
        const idx = r * cols + c;
        positions[idx * 3] = x;
        positions[idx * 3 + 1] = py;
        positions[idx * 3 + 2] = pz;
        uvs[idx * 2] = t;
        uvs[idx * 2 + 1] = pv;
      }
    }

    for (let r = 0; r < xSegs; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const a = r * cols + c;
        const b = r * cols + (c + 1);
        const cIdx = (r + 1) * cols + c;
        const d = (r + 1) * cols + (c + 1);
        indices.push(a, b, cIdx);
        indices.push(b, d, cIdx);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  };
  const ballastBermGeoCache = new Map<number, THREE.BufferGeometry>();
  const getBallastBermGeometry = (lengthX: number) => {
    let geo = ballastBermGeoCache.get(lengthX);
    if (!geo) {
      geo = createBallastBermGeometry(lengthX);
      ballastBermGeoCache.set(lengthX, geo);
    }
    return geo;
  };
  const sharedSleeperGeo = new THREE.BoxGeometry(0.28, 0.09, 2.38);
  const sharedClipGeo = new THREE.BoxGeometry(0.18, 0.035, 0.22);
  const sharedRailWebGeo = new THREE.BoxGeometry(224, 0.075, 0.125);
  const sharedRailHeadGeo = new THREE.BoxGeometry(224, 0.045, 0.082);
  const sharedLowWeedGeo = createOvergrownWeedClusterGeometry(false);
  const sharedTallWeedGeo = createOvergrownWeedClusterGeometry(true);
  const weedMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.85,
    side: THREE.DoubleSide,
  });
  const sharedCobbleGeo = new THREE.DodecahedronGeometry(0.088, 0);
  const cobbleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92 });

  const buildSubBallastApron = (centerZ: number, widthZ: number, targetGroup: THREE.Group) => {
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(224, widthZ), yardGroundMat);
    apron.rotation.x = -Math.PI / 2;
    apron.position.set(0, 0.022, centerZ);
    apron.receiveShadow = true;
    targetGroup.add(apron);
  };

  const ductConcreteMat = new THREE.MeshStandardMaterial({ color: 0x737980, roughness: 0.86 });
  const ductLidYellowMat = new THREE.MeshStandardMaterial({ color: 0xd8a228, roughness: 0.54 });
  const ductLidSlateMat = new THREE.MeshStandardMaterial({ color: 0x525860, roughness: 0.72 });
  const vergeCurbMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.84 });

  // Precast cable trough + alternating inspection lids + dwarf shunt signals along paired track medians
  const buildInterTrackMedianDetails = (
    centerZ: number,
    targetGroup: THREE.Group,
    includeSwitchGaps: boolean,
  ) => {
    const segments: [number, number][] = includeSwitchGaps
      ? [
          [-98, -42],
          [-30, 14.8],
          [22.2, 27.5],
          [47.0, 98],
        ]
      : [
          [-98, 14.8],
          [22.2, 37.2],
          [47.0, 98],
        ];

    const lidStep = 1.6;
    const lidYellowTransforms: [number, number][] = [];
    const lidSlateTransforms: [number, number][] = [];

    segments.forEach(([sx, ex]) => {
      const len = ex - sx;
      if (len < 2) return;
      const midX = (sx + ex) * 0.5;
      const baseTrough = new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, 0.62), ductConcreteMat);
      baseTrough.position.set(midX, 0.045, centerZ);
      baseTrough.receiveShadow = true;
      targetGroup.add(baseTrough);

      let toggle = 0;
      for (let lx = sx + 0.8; lx <= ex - 0.8; lx += lidStep) {
        if (toggle % 4 === 0) {
          lidYellowTransforms.push([lx, centerZ]);
        } else {
          lidSlateTransforms.push([lx, centerZ]);
        }
        toggle++;
      }
    });

    const lidGeo = new THREE.BoxGeometry(1.42, 0.03, 0.48);
    const dummy = new THREE.Object3D();
    if (lidYellowTransforms.length > 0) {
      const instY = new THREE.InstancedMesh(lidGeo, ductLidYellowMat, lidYellowTransforms.length);
      lidYellowTransforms.forEach(([lx, lz], idx) => {
        dummy.position.set(lx, 0.088, lz);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        instY.setMatrixAt(idx, dummy.matrix);
      });
      instY.instanceMatrix.needsUpdate = true;
      instY.computeBoundingSphere();
      targetGroup.add(instY);
    }
    if (lidSlateTransforms.length > 0) {
      const instS = new THREE.InstancedMesh(lidGeo, ductLidSlateMat, lidSlateTransforms.length);
      lidSlateTransforms.forEach(([lx, lz], idx) => {
        dummy.position.set(lx, 0.088, lz);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        instS.setMatrixAt(idx, dummy.matrix);
      });
      instS.instanceMatrix.needsUpdate = true;
      instS.computeBoundingSphere();
      targetGroup.add(instS);
    }

    const shuntXs = includeSwitchGaps ? [-28.5, -10.0, 9.5, 25.5, 49.0] : [-28.5, 9.5, 27.0, 49.0];
    shuntXs.forEach((dx, idx) => {
      const shunt = createDwarfShuntSignal(idx % 2 === 0 ? 'green' : 'amber');
      shunt.position.set(dx, 0.025, centerZ);
      targetGroup.add(shunt);
    });
  };

  // Shared helpers for grassy yard approach strips & instanced railside vegetation
  const shrubGeo = new THREE.DodecahedronGeometry(0.46, 0);
  const shrubMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.86 });
  const reedGeo = new THREE.ConeGeometry(0.18, 0.72, 5);
  const reedMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88 });
  const equipmentKeepoutPoints: { x: number; z: number; r: number }[] = [
    { x: 36.8, z: -7.2, r: 2.3 }, // East level crossing cabin
  ];
  const isClearOfEquipment = (x: number, z: number): boolean => {
    for (let k = 0; k < equipmentKeepoutPoints.length; k++) {
      const pt = equipmentKeepoutPoints[k];
      if (Math.hypot(x - pt.x, z - pt.z) < pt.r) return false;
    }
    return true;
  };

  const populateTracksideGreenery = (
    targetGroup: THREE.Group,
    strips: { minX: number; maxX: number; minZ: number; maxZ: number }[],
    seedBias: number,
  ) => {
    const shrubSpots: { x: number; z: number; s: number; rot: number; col: number }[] = [];
    const reedSpots: { x: number; z: number; s: number; rot: number; col: number }[] = [];
    const shrubPalette = [0x2d7a36, 0x3b8c32, 0x4b993f, 0x26692d, 0x568d38];
    const reedPalette = [0x6e9e42, 0x89aa4c, 0x588738, 0xa2b360];

    strips.forEach((st, stIdx) => {
      const w = st.maxX - st.minX;
      const d = st.maxZ - st.minZ;
      if (w < 1 || d < 0.8) return;
      const midX = (st.minX + st.maxX) * 0.5;
      const midZ = (st.minZ + st.maxZ) * 0.5;

      const turf = new THREE.Mesh(new THREE.PlaneGeometry(w, d), medianTurfMat);
      turf.rotation.x = -Math.PI / 2;
      turf.position.set(midX, 0.026, midZ);
      turf.receiveShadow = true;
      targetGroup.add(turf);

      // Clean precast concrete curb separating sub-ballast and green verge
      if (d > 2.2) {
        const curbN = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 0.18), vergeCurbMat);
        curbN.position.set(midX, 0.05, st.minZ + 0.09);
        const curbS = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 0.18), vergeCurbMat);
        curbS.position.set(midX, 0.05, st.maxZ - 0.09);
        targetGroup.add(curbN, curbS);
      }

      let idx = 0;
      for (let x = st.minX + 1.4; x <= st.maxX - 1.4; x += 2.6) {
        // Keep West & East Flyover zones (x = -61..-51 and 51..61) tidy
        if (Math.abs(Math.abs(x) - 56) < 4.8) {
          idx++;
          continue;
        }
        const hash = Math.abs(Math.sin(x * 12.9898 + midZ * 78.233 + seedBias * 41.1 + stIdx));
        const zJitter = (hash - 0.5) * Math.max(0.4, d - 1.4);
        const sx = x;
        const sz = midZ + zJitter;
        if (idx % 2 === 0 && isClearOfEquipment(sx, sz)) {
          shrubSpots.push({
            x: sx,
            z: sz,
            s: 0.72 + (hash % 0.55),
            rot: hash * Math.PI * 2,
            col: shrubPalette[(idx + stIdx) % shrubPalette.length],
          });
        }
        const rx = x + 0.85;
        const rz = midZ - zJitter * 0.7;
        if (isClearOfEquipment(rx, rz)) {
          reedSpots.push({
            x: rx,
            z: rz,
            s: 0.8 + (hash % 0.6),
            rot: hash * Math.PI,
            col: reedPalette[(idx + stIdx) % reedPalette.length],
          });
        }
        idx++;
      }
    });

    const dummy = new THREE.Object3D();
    const tmpCol = new THREE.Color();

    if (shrubSpots.length > 0) {
      const shrubInst = new THREE.InstancedMesh(shrubGeo, shrubMat, shrubSpots.length);
      shrubSpots.forEach((sp, i) => {
        dummy.position.set(sp.x, 0.28 * sp.s, sp.z);
        dummy.rotation.set(0, sp.rot, 0);
        dummy.scale.set(sp.s * 1.15, sp.s * 0.82, sp.s * 1.05);
        dummy.updateMatrix();
        shrubInst.setMatrixAt(i, dummy.matrix);
        shrubInst.setColorAt(i, tmpCol.setHex(sp.col));
      });
      shrubInst.instanceMatrix.needsUpdate = true;
      if (shrubInst.instanceColor) shrubInst.instanceColor.needsUpdate = true;
      shrubInst.computeBoundingSphere();
      targetGroup.add(shrubInst);
    }

    if (reedSpots.length > 0) {
      const reedInst = new THREE.InstancedMesh(reedGeo, reedMat, reedSpots.length);
      reedSpots.forEach((sp, i) => {
        dummy.position.set(sp.x, 0.34 * sp.s, sp.z);
        dummy.rotation.set(0.08, sp.rot, 0.06);
        dummy.scale.set(sp.s, sp.s * 1.1, sp.s);
        dummy.updateMatrix();
        reedInst.setMatrixAt(i, dummy.matrix);
        reedInst.setColorAt(i, tmpCol.setHex(sp.col));
      });
      reedInst.instanceMatrix.needsUpdate = true;
      if (reedInst.instanceColor) reedInst.instanceColor.needsUpdate = true;
      reedInst.computeBoundingSphere();
      targetGroup.add(reedInst);
    }
  };

  const buildTrackAssembly = (trackId: TrackId, targetGroup: THREE.Group) => {
    const tz = TRACK_Z[trackId];
    const segments = getTrackBallastSegments(trackId);
    segments.forEach((seg) => {
      const ballast = new THREE.Mesh(
        getBallastBermGeometry(seg.lengthX),
        getBallastMaterial(seg.variant, seg.repeatX),
      );
      ballast.position.set(seg.centerX, 0, tz);
      ballast.receiveShadow = true;
      targetGroup.add(ballast);
    });

    [-0.72, 0.72].forEach((rz) => {
      const railWeb = new THREE.Mesh(sharedRailWebGeo, railWebMat);
      railWeb.position.set(0, 0.185, tz + rz);
      const railHead = new THREE.Mesh(sharedRailHeadGeo, railHeadMat);
      railHead.position.set(0, 0.242, tz + rz);
      targetGroup.add(railWeb, railHead);
    });

    const sleeperSpacing = 0.86;
    const count = Math.floor(204 / sleeperSpacing);
    const sleeperInst = new THREE.InstancedMesh(sharedSleeperGeo, sleeperMat, count);
    sleeperInst.receiveShadow = true;
    const clipInst = new THREE.InstancedMesh(sharedClipGeo, clipMat, count * 2);
    const dummy = new THREE.Object3D();
    const tmpCol = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const sx = -102 + i * sleeperSpacing;
      const wear = computeSleeperInstanceProps(trackId, sx, i);

      dummy.position.set(sx, 0.125, tz + wear.zJitter);
      dummy.rotation.set(0, wear.yawJitter, 0);
      dummy.scale.set(1, wear.scaleY, 1);
      dummy.updateMatrix();
      sleeperInst.setMatrixAt(i, dummy.matrix);
      sleeperInst.setColorAt(i, tmpCol.setHex(wear.sleeperHex));

      dummy.position.set(sx, 0.172, tz - 0.72);
      dummy.rotation.set(0, wear.yawJitter * 0.5, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      clipInst.setMatrixAt(i * 2, dummy.matrix);
      clipInst.setColorAt(i * 2, tmpCol.setHex(wear.clipHex));

      dummy.position.set(sx, 0.172, tz + 0.72);
      dummy.updateMatrix();
      clipInst.setMatrixAt(i * 2 + 1, dummy.matrix);
      clipInst.setColorAt(i * 2 + 1, tmpCol.setHex(wear.clipHex));
    }
    sleeperInst.instanceMatrix.needsUpdate = true;
    if (sleeperInst.instanceColor) sleeperInst.instanceColor.needsUpdate = true;
    sleeperInst.computeBoundingSphere();

    clipInst.instanceMatrix.needsUpdate = true;
    if (clipInst.instanceColor) clipInst.instanceColor.needsUpdate = true;
    clipInst.computeBoundingSphere();
    targetGroup.add(sleeperInst, clipInst);
  };

  // Scattered crushed shoulder cobbles, overgrown track-edge weeds & discarded rusted sleepers
  const decorateTrackCorridor = (trackId: TrackId, targetGroup: THREE.Group) => {
    const tz = TRACK_Z[trackId];
    const dummy = new THREE.Object3D();
    const tmpCol = new THREE.Color();

    const cobbles = generateTrackShoulderCobbles(trackId).filter((c) => isClearOfEquipment(c.x, c.z));
    if (cobbles.length > 0) {
      const cobbleInst = new THREE.InstancedMesh(sharedCobbleGeo, cobbleMat, cobbles.length);
      cobbleInst.receiveShadow = true;
      cobbles.forEach((c, idx) => {
        const dist = Math.abs(c.z - tz);
        const bermY = dist >= 2.35 ? 0.022 : 0.105 - ((dist - 1.32) / 1.03) * 0.09;
        dummy.position.set(c.x, bermY + 0.012, c.z);
        dummy.rotation.set(c.pitch, c.yaw, 0);
        dummy.scale.set(c.sx, c.sy, c.sz);
        dummy.updateMatrix();
        cobbleInst.setMatrixAt(idx, dummy.matrix);
        cobbleInst.setColorAt(idx, tmpCol.setHex(c.colorHex));
      });
      cobbleInst.instanceMatrix.needsUpdate = true;
      if (cobbleInst.instanceColor) cobbleInst.instanceColor.needsUpdate = true;
      cobbleInst.computeBoundingSphere();
      targetGroup.add(cobbleInst);
    }

    const weeds = generateTrackEdgeWeedPlacements(trackId).filter((w) => isClearOfEquipment(w.x, w.z));
    const lowWeeds = weeds.filter((w) => !w.tall);
    const tallWeeds = weeds.filter((w) => w.tall);

    const spawnWeedBatch = (batch: typeof weeds, geo: THREE.BufferGeometry) => {
      if (batch.length === 0) return;
      const inst = new THREE.InstancedMesh(geo, weedMat, batch.length);
      batch.forEach((w, idx) => {
        const dist = Math.abs(w.z - tz);
        const groundY = dist >= 2.35 ? 0.022 : 0.105 - ((dist - 1.32) / 1.03) * 0.09;
        dummy.position.set(w.x, Math.max(0.012, groundY - 0.012), w.z);
        dummy.rotation.set(w.tiltX, w.yaw, w.tiltZ);
        dummy.scale.set(w.scale, w.scale, w.scale);
        dummy.updateMatrix();
        inst.setMatrixAt(idx, dummy.matrix);
        inst.setColorAt(idx, tmpCol.setHex(w.colorHex));
      });
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      inst.computeBoundingSphere();
      targetGroup.add(inst);
    };

    spawnWeedBatch(lowWeeds, sharedLowWeedGeo);
    spawnWeedBatch(tallWeeds, sharedTallWeedGeo);

    getDiscardedSleeperPlacements(trackId).forEach((spec) => {
      if (!isClearOfEquipment(spec.x, spec.z)) return;
      const pile = createDiscardedRustedSleeperCluster(discardedSleeperMat, spec.count);
      pile.position.set(spec.x, 0.018, spec.z);
      pile.rotation.y = spec.yaw;
      targetGroup.add(pile);
    });
  };

  buildSubBallastApron(0.0, 9.8, scene as unknown as THREE.Group);
  buildTrackAssembly(1, scene as unknown as THREE.Group);
  buildTrackAssembly(2, scene as unknown as THREE.Group);
  buildInterTrackMedianDetails(0.0, scene as unknown as THREE.Group, true);

  // Overhead Steel Signal & Route Gantries spanning Tracks 1 & 2
  [
    { x: -43.5, bn: 'ঢাকা · চট্টগ্রাম মেইন লাইন', en: 'WEST APPROACH · TRACK 1-2' },
    { x: 48.5, bn: 'যাত্রা ও প্রস্থান গ্যান্ট্রি', en: 'EAST THROAT · TRACK 1-2' },
    { x: -72.0, bn: 'আউটার সিগন্যাল ব্লক', en: 'OUTER BLOCK WEST' },
    { x: 72.0, bn: 'পূর্ব জংশন ব্লক', en: 'OUTER BLOCK EAST' },
  ].forEach(({ x, bn, en }, idx) => {
    const gantry = createSignalGantryBridge(10.6, [-3.0, 3.0], bn, en, maxAnisotropy);
    gantry.position.set(x, 0, 0);
    scene.add(gantry);
    equipmentKeepoutPoints.push({ x, z: -5.3, r: 1.5 }, { x, z: 5.3, r: 1.5 });
    if (Math.abs(x) <= 72) {
      baseColliders.push(
        { id: `gantry12_n_${idx}`, minX: x - 0.6, maxX: x + 0.6, minZ: -5.85, maxZ: -4.75 },
        { id: `gantry12_s_${idx}`, minX: x - 0.6, maxX: x + 0.6, minZ: 4.75, maxZ: 5.85 },
      );
    }
  });

  // High-mast Yard Floodlight Towers (responsive to dawn/night & power outages)
  const yardMastCoords: [number, number, number][] = [
    [-47.5, -7.2, -Math.PI / 2],
    [-68.0, -7.2, -Math.PI / 2],
    [49.5, -7.2, -Math.PI / 2],
    [70.0, -7.2, -Math.PI / 2],
    [-35.0, 7.6, Math.PI / 2],
    [-66.0, 7.6, Math.PI / 2],
    [35.0, 7.6, Math.PI / 2],
    [66.0, 7.6, Math.PI / 2],
  ];
  yardMastCoords.forEach(([mx, mz, rot], idx) => {
    const mast = createYardFloodlightMast(streetBulbMat);
    mast.position.set(mx, 0, mz);
    mast.rotation.y = rot;
    scene.add(mast);
    equipmentKeepoutPoints.push({ x: mx, z: mz, r: 1.7 });
    baseColliders.push({
      id: `yard_mast_${idx}`,
      minX: mx - 0.55,
      maxX: mx + 0.55,
      minZ: mz - 0.55,
      maxZ: mz + 0.55,
    });
  });

  // Trackside Relay Equipment Cabinets, KM/Whistle Posts & Reserve Sleeper Stacks
  const relayCoords: [number, number, number][] = [
    [-34.2, -7.2, 0],
    [-48.5, 7.2, Math.PI],
    [34.2, 7.2, Math.PI],
    [49.5, -7.2, 0],
    [-64.5, 7.2, Math.PI],
  ];
  relayCoords.forEach(([rx, rz, rot], idx) => {
    const cab = createRelayEquipmentCabinet();
    cab.position.set(rx, 0, rz);
    cab.rotation.y = rot;
    scene.add(cab);
    equipmentKeepoutPoints.push({ x: rx, z: rz, r: 1.8 });
    baseColliders.push({
      id: `relay_cab_${idx}`,
      minX: rx - 0.85,
      maxX: rx + 0.85,
      minZ: rz - 0.65,
      maxZ: rz + 0.65,
    });
  });

  const kmPostSpecs: [string, string, number, number][] = [
    ['KM 172', 'ঢাকা', -36.5, -5.6],
    ['W / সিটি', 'HORN', -63.0, -5.6],
    ['KM 173', 'শাপলা', 34.8, 5.6],
    ['W / সিটি', 'HORN', 63.0, 5.6],
  ];
  kmPostSpecs.forEach(([topT, botT, kx, kz], idx) => {
    const kmPost = createKilometerMarkerPost(topT, botT, maxAnisotropy);
    kmPost.position.set(kx, 0, kz);
    scene.add(kmPost);
    equipmentKeepoutPoints.push({ x: kx, z: kz, r: 1.3 });
    baseColliders.push({
      id: `km_post_${idx}`,
      minX: kx - 0.35,
      maxX: kx + 0.35,
      minZ: kz - 0.35,
      maxZ: kz + 0.35,
    });
  });

  const sleeperStackCoords: [number, number, number][] = [
    [-45.5, -9.2, 0],
    [49.5, 8.6, Math.PI],
    [-66.5, 8.4, 0],
    [66.5, -8.8, Math.PI],
  ];
  sleeperStackCoords.forEach(([sx, sz, rot], idx) => {
    const stack = createReserveSleeperStack();
    stack.position.set(sx, 0, sz);
    stack.rotation.y = rot;
    scene.add(stack);
    equipmentKeepoutPoints.push({ x: sx, z: sz, r: 2.3 });
    baseColliders.push({
      id: `sleeper_stack_${idx}`,
      minX: sx - 1.75,
      maxX: sx + 1.75,
      minZ: sz - 1.25,
      maxZ: sz + 1.25,
    });
  });

  // Track 1-2 ballast shoulder cobbles, overgrown edge weeds & discarded rusted sleepers (after keepouts)
  decorateTrackCorridor(1, scene as unknown as THREE.Group);
  decorateTrackCorridor(2, scene as unknown as THREE.Group);

  // Beautify empty West & East Approach Verges around Tracks 1-2 (after equipment keepouts registered)
  populateTracksideGreenery(
    scene as unknown as THREE.Group,
    [
      // North Track 1 Outer Verge (west & east of Platform 1 ramps, strictly clear of crossing hut)
      { minX: -102, maxX: -34.5, minZ: -11.4, maxZ: -5.0 },
      { minX: 34.5, maxX: 37.8, minZ: -11.6, maxZ: -9.1 },
      { minX: 46.5, maxX: 102, minZ: -11.4, maxZ: -5.0 },
      // South Track 2 Verge (west & east of Platform 2 ramps, seamless to sub-ballast)
      { minX: -102, maxX: -32.8, minZ: 5.0, maxZ: 10.6 },
      { minX: 32.8, maxX: 37.6, minZ: 5.0, maxZ: 10.6 },
      { minX: 46.5, maxX: 102, minZ: 5.0, maxZ: 10.6 },
      // Far West & East Park Corners north of Track 1 behind forecourt ends
      { minX: -102, maxX: -41.5, minZ: -24.0, maxZ: -12.0 },
      { minX: 46.5, maxX: 102, minZ: -24.0, maxZ: -12.0 },
    ],
    1,
  );

  // Tropical Banana Clumps & Palms framing the outer West/East rail approaches
  [
    [-48, -10.2],
    [-64, -10.4],
    [-76, -9.8],
    [50, -10.2],
    [65, -10.4],
    [78, -9.8],
    [-45, 9.0],
    [-63, 9.2],
    [51, 9.0],
    [65, 9.2],
  ].forEach(([bx, bz], idx) => {
    const clump = createBananaClump();
    clump.position.set(bx, 0, bz);
    clump.rotation.y = idx * 1.1;
    scene.add(clump);
  });

  [
    [-48, -17.5, 7.6],
    [-68, -16.5, 8.2],
    [50, -17.5, 7.8],
    [68, -16.5, 8.4],
  ].forEach(([px, pz, h], idx) => {
    const palm = createCoconutPalm(h);
    palm.position.set(px, 0, pz);
    palm.rotation.y = idx * 1.4;
    scene.add(palm);
  });

  // 3. Detailed Railway Platforms
  const platPair = createPlatformTileTexturePair(maxAnisotropy);
  const platDeckMat = new THREE.MeshStandardMaterial({
    map: platPair.map,
    bumpMap: platPair.bumpMap,
    bumpScale: 0.025,
    color: 0xffffff,
    roughness: 0.76,
  });
  const platSideMat = new THREE.MeshStandardMaterial({
    color: isCh2 ? 0x475569 : 0x9b4634,
    roughness: isCh2 ? 0.65 : 0.84,
  });
  const curbYellowMat = new THREE.MeshStandardMaterial({ color: 0xe8b225, roughness: 0.54 });
  const ironGreenMat = new THREE.MeshStandardMaterial({
    color: isCh2 ? 0x16425b : 0x1a563b,
    roughness: 0.36,
    metalness: 0.5,
  });
  const canopyMat = new THREE.MeshStandardMaterial({
    color: isCh2 ? 0x1e607a : 0x226849,
    roughness: 0.4,
    metalness: 0.36,
  });

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

  // Heritage / Terminal Station Nameboards (Bangla + English)
  const boardTex = createSignboardTexture(
    isCh2 ? CHAPTER2_STATION_NAME_BN : STATION_NAME_BN,
    (isCh2 ? CHAPTER2_STATION_NAME_EN : STATION_NAME_EN).toUpperCase(),
    isCh2 ? '#38bdf8' : '#f5b81c',
    isCh2 ? '#0f172a' : '#181612',
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
  const fbSouthCapM6 = createBridgeEndCap(41.55);
  fbSouthCapM6.visible = false;
  const fbSouthCapM8 = createBridgeEndCap(61.55);
  fbSouthCapM8.visible = false;

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

  // Operations Command Terminal Desk inside main concourse
  const opsKioskGroup = new THREE.Group();
  opsKioskGroup.position.set(6.8, PLATFORM_HEIGHT, -11.6);
  const opsStand = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 1.05, 0.72),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45, metalness: 0.4 }),
  );
  opsStand.position.y = 0.525;
  opsStand.castShadow = true;
  const opsScreen = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.62, 0.08),
    new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x0284c7,
      emissiveIntensity: 0.75,
      roughness: 0.25,
    }),
  );
  opsScreen.position.set(0, 1.32, 0);
  opsKioskGroup.add(opsStand, opsScreen);
  scene.add(opsKioskGroup);
  baseColliders.push({ id: 'ops_desk_box', minX: 6.0, maxX: 7.6, minZ: -12.1, maxZ: -11.1 });
  baseInteractables.push({
    id: 'operations_desk',
    title: 'Station Operations & Staff Console',
    actionLabel: 'Open Operations, Tasks & Facilities [E / O]',
    x: 6.8,
    y: PLATFORM_HEIGHT,
    z: -11.6,
    radius: 3.1,
  });

  // Chapter 2 Architectural Distinction: Grand Arched Terminal Roof Trusses & Twin Glass Towers
  if (isCh2) {
    const trussSteelMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a5f,
      roughness: 0.32,
      metalness: 0.65,
    });
    const glassRoofMat = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.34,
      roughness: 0.14,
      metalness: 0.25,
    });
    [-16, -4, 8, 20].forEach((tx) => {
      const archGeo = new THREE.TorusGeometry(27.5, 0.24, 8, 28, Math.PI);
      const arch = new THREE.Mesh(archGeo, trussSteelMat);
      arch.rotation.y = Math.PI / 2;
      arch.position.set(tx, PLATFORM_HEIGHT + 2.5, 21.5);
      arch.scale.set(1, 0.36, 1);
      scene.add(arch);
    });
    const canopySpan = new THREE.Mesh(new THREE.BoxGeometry(38, 0.14, 52), glassRoofMat);
    canopySpan.position.set(2, PLATFORM_HEIGHT + 12.2, 21.5);
    scene.add(canopySpan);

    [-28, 30].forEach((tx, idx) => {
      const tower = createModernSkyscraper(
        6.5,
        24,
        6.5,
        0x0f172a,
        idx % 2 === 0 ? glassFacadeMatA : glassFacadeMatB,
        0x38bdf8,
      );
      tower.position.set(tx, 0, -16.5);
      scene.add(tower);
      baseColliders.push({
        id: `ch2_twin_tower_${idx}`,
        minX: tx - 3.3,
        maxX: tx + 3.3,
        minZ: -19.8,
        maxZ: -13.2,
      });
    });
  }

  // 5. Dynamic 3D Train Registry, Crossover Switches, Track Occupancy Beacons & Signals (Tracks 1-8)
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
    7: createTrackOccupancyBeacon(),
    8: createTrackOccupancyBeacon(),
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
    7: createSemaphoreSignal(),
    8: createSemaphoreSignal(),
  };
  const westSignals: Record<TrackId, SemaphoreSignalController> = {
    1: createSemaphoreSignal(),
    2: createSemaphoreSignal(),
    3: createSemaphoreSignal(),
    4: createSemaphoreSignal(),
    5: createSemaphoreSignal(),
    6: createSemaphoreSignal(),
    7: createSemaphoreSignal(),
    8: createSemaphoreSignal(),
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
    [-28, 0, 47.6 + southShift, -Math.PI / 2],
    [0, 0, 47.6 + southShift, -Math.PI / 2],
    [28, 0, 47.6 + southShift, -Math.PI / 2],
  ];
  lightCoords.forEach(([lx, ly, lz, rot]) => {
    const lamp = createStreetlight(streetBulbMat);
    lamp.position.set(lx, ly, lz);
    lamp.rotation.y = rot;
    scene.add(lamp);
  });

  // 7. Progressive Station Expansion Modules (Tracks 3..8) + Tower Cranes
  const moduleGroups: Record<3 | 4 | 5 | 6 | 7 | 8, THREE.Group> = {
    3: new THREE.Group(),
    4: new THREE.Group(),
    5: new THREE.Group(),
    6: new THREE.Group(),
    7: new THREE.Group(),
    8: new THREE.Group(),
  };
  const moduleColliders: Record<3 | 4 | 5 | 6 | 7 | 8, ColliderBox[]> = {
    3: [],
    4: [],
    5: [],
    6: [],
    7: [],
    8: [],
  };
  const moduleInteractables: Record<3 | 4 | 5 | 6 | 7 | 8, InteractablePoint[]> = {
    3: [],
    4: [],
    5: [],
    6: [],
    7: [],
    8: [],
  };
  const moduleAnimTimers: Record<3 | 4 | 5 | 6 | 7 | 8, number> = {
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0,
    8: 0,
  };

  // --- Module 3 (Level 2 -> Track 3 @ z=13.3) ---
  {
    const g = moduleGroups[3];
    buildSubBallastApron(13.4, 5.6, g);
    buildTrackAssembly(3, g);
    decorateTrackCorridor(3, g);
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
    buildSubBallastApron(18.7, 5.0, g);
    buildTrackAssembly(4, g);
    buildInterTrackMedianDetails(16.3, g, false);
    const relay34 = createRelayEquipmentCabinet();
    relay34.position.set(-34.5, 0, 24.4);
    const stack34 = createReserveSleeperStack();
    stack34.position.set(49.5, 0, 24.6);
    const mast34W = createYardFloodlightMast(streetBulbMat);
    mast34W.position.set(-60.0, 0, 24.5);
    mast34W.rotation.y = Math.PI / 2;
    const mast34E = createYardFloodlightMast(streetBulbMat);
    mast34E.position.set(60.0, 0, 24.5);
    mast34E.rotation.y = Math.PI / 2;
    const km34W = createKilometerMarkerPost('KM 172', 'লুপ ৩-৪', maxAnisotropy);
    km34W.position.set(-36.5, 0, 21.8);
    const km34E = createKilometerMarkerPost('W / সিটি', 'HORN', maxAnisotropy);
    km34E.position.set(49.0, 0, 21.8);
    g.add(relay34, stack34, mast34W, mast34E, km34W, km34E);
    equipmentKeepoutPoints.push(
      { x: -34.5, z: 24.4, r: 1.8 },
      { x: 49.5, z: 24.6, r: 2.3 },
      { x: -60.0, z: 24.5, r: 1.7 },
      { x: 60.0, z: 24.5, r: 1.7 },
      { x: -36.5, z: 21.8, r: 1.3 },
      { x: 49.0, z: 21.8, r: 1.3 },
      { x: -43.5, z: 21.6, r: 1.5 },
      { x: 48.5, z: 21.6, r: 1.5 },
    );
    decorateTrackCorridor(4, g);
    [
      [-48, 25.0],
      [-64, 25.0],
      [51, 25.0],
      [66, 25.0],
    ].forEach(([bx, bz], idx) => {
      const clump = createBananaClump();
      clump.position.set(bx, 0, bz);
      clump.rotation.y = idx * 1.2 + 0.4;
      g.add(clump);
    });
    populateTracksideGreenery(
      g,
      [
        { minX: -102, maxX: -32.8, minZ: 21.5, maxZ: 27.6 },
        { minX: 32.8, maxX: 37.6, minZ: 21.5, maxZ: 27.6 },
        { minX: 46.5, maxX: 102, minZ: 21.5, maxZ: 27.6 },
      ],
      4,
    );
    [
      { x: -43.5, bn: 'প্ল্যাটফর্ম ৩-৪ লুপ লাইন', en: 'WEST THROAT · TRACK 3-4' },
      { x: 48.5, bn: 'পূর্ব সিগন্যাল গ্যান্ট্রি', en: 'EAST THROAT · TRACK 3-4' },
    ].forEach(({ x, bn, en }) => {
      const gantry34 = createSignalGantryBridge(10.6, [-3.0, 3.0], bn, en, maxAnisotropy);
      gantry34.position.set(x, 0, 16.3);
      g.add(gantry34);
    });
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
    buildSubBallastApron(30.0, 5.2, g);
    buildTrackAssembly(5, g);
    decorateTrackCorridor(5, g);
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
    buildSubBallastApron(35.2, 5.2, g);
    buildTrackAssembly(6, g);
    buildInterTrackMedianDetails(32.8, g, false);
    equipmentKeepoutPoints.push(
      { x: -43.5, z: 38.1, r: 1.5 },
      { x: 48.5, z: 38.1, r: 1.5 },
    );
    decorateTrackCorridor(6, g);
    populateTracksideGreenery(
      g,
      [
        { minX: -102, maxX: -34.5, minZ: 38.4, maxZ: 45.6 },
        { minX: 34.5, maxX: 37.6, minZ: 38.4, maxZ: 45.6 },
        { minX: 46.5, maxX: 102, minZ: 38.4, maxZ: 45.6 },
      ],
      6,
    );
    [
      { x: -43.5, bn: 'দক্ষিণ করিডোর লাইন ৫-৬', en: 'SOUTH EXPRESS · TRACK 5-6' },
      { x: 48.5, bn: 'টার্মিনাল প্রবেশ গ্যান্ট্রি', en: 'SOUTH EAST · TRACK 5-6' },
    ].forEach(({ x, bn, en }) => {
      const gantry56 = createSignalGantryBridge(10.6, [-3.0, 3.0], bn, en, maxAnisotropy);
      gantry56.position.set(x, 0, 32.8);
      g.add(gantry56);
    });
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

  // --- Module 7 (Chapter 2 Track 7 @ z=48.8 & Padma Platform 5 @ z=56.5..64.5) ---
  {
    const g = moduleGroups[7];
    buildSubBallastApron(48.9, 5.4, g);
    buildTrackAssembly(7, g);
    decorateTrackCorridor(7, g);
    populateTracksideGreenery(
      g,
      [
        { minX: -102, maxX: -34.5, minZ: 57.6, maxZ: 64.2 },
        { minX: 34.5, maxX: 37.6, minZ: 57.6, maxZ: 64.2 },
        { minX: 46.5, maxX: 102, minZ: 57.6, maxZ: 64.2 },
      ],
      7,
    );
    buildPlatformStructure(g, 60.5, 8.0, 60, [56.68], 'south', 0);

    const p4SouthCurb = new THREE.Mesh(new THREE.BoxGeometry(60, 0.04, 0.32), curbYellowMat);
    p4SouthCurb.position.set(0, PLATFORM_HEIGHT + 0.01, 45.82);
    g.add(p4SouthCurb);

    const canopy5 = new THREE.Mesh(new THREE.BoxGeometry(34, 0.18, 4.4), canopyMat);
    canopy5.position.set(-1, PLATFORM_HEIGHT + 5.2, 60.5);
    canopy5.castShadow = true;
    g.add(canopy5);
    [-14, -4, 6, 14].forEach((px) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 5.2, 12), ironGreenMat);
      col.position.set(px, PLATFORM_HEIGHT + 2.6, 60.5);
      col.castShadow = true;
      g.add(col);
      moduleColliders[7].push({
        id: `canopy5_col_${px}`,
        minX: px - 0.18,
        maxX: px + 0.18,
        minZ: 60.32,
        maxZ: 60.68,
      });
    });

    addHangingPlatformSign(g, -6, PLATFORM_HEIGHT + 4.1, 58.6, 7);
    addHangingPlatformSign(g, 6, PLATFORM_HEIGHT + 4.1, 58.6, 7);

    const p5Kiosk = createFoodStall('পদ্মা এক্সপ্রেস লাউঞ্জ', 'PADMA EXECUTIVE LOUNGE', 0x0369a1, maxAnisotropy);
    p5Kiosk.position.set(-10.5, PLATFORM_HEIGHT, 61.5);
    p5Kiosk.rotation.y = Math.PI;
    g.add(p5Kiosk);
    moduleColliders[7].push({
      id: 'p5_kiosk_box',
      minX: -12.3,
      maxX: -8.7,
      minZ: 60.5,
      maxZ: 62.5,
    });

    [-18, 4, 16].forEach((bx, idx) => {
      const bench = createStationBench();
      bench.position.set(bx, PLATFORM_HEIGHT, 60.8);
      bench.rotation.y = Math.PI;
      g.add(bench);
      moduleColliders[7].push({
        id: `p5_bench_${idx}`,
        minX: bx - 1.1,
        maxX: bx + 1.1,
        minZ: 60.45,
        maxZ: 61.15,
      });
    });

    const fbExt3 = createExtendedFootbridgeSection(41.6, 61.6, [
      { centerZ: 60.5, startX: -4.0, endX: 0.2, steps: 12 },
    ]);
    fbExt3.position.set(-24.0, 0, 0);
    g.add(fbExt3);
    moduleColliders[7].push(
      { id: 'fb_rail_e_m7', minX: -22.88, maxX: -21.0, minZ: 41.6, maxZ: 61.65, minY: 3.1 },
      { id: 'fb_rail_w_m7', minX: -26.8, maxX: -25.12, minZ: 41.55, maxZ: 59.4, minY: 3.1 },
      { id: 'fb_stair5_n', minX: -28.0, maxX: -25.1, minZ: 58.2, maxZ: 59.62, minY: 0.9 },
      { id: 'fb_stair5_s', minX: -28.0, maxX: -25.1, minZ: 61.38, maxZ: 62.8, minY: 0.9 },
      { id: 'fb_rail_s_end_m7', minX: -25.35, maxX: -22.65, minZ: 61.45, maxZ: 63.1, minY: 3.1 },
    );

    const cross7 = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.1, 10.6), plankCrossingMat);
    cross7.position.set(18.5, 0.11, 51.25);
    const slope7N = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.1, 1.35), platDeckMat);
    slope7N.position.set(18.5, 0.39, 46.55);
    slope7N.rotation.x = -0.42;
    const slope7S = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.1, 1.35), platDeckMat);
    slope7S.position.set(18.5, 0.39, 55.95);
    slope7S.rotation.x = 0.42;
    g.add(cross7, slope7N, slope7S);

    trackBeacons[7].group.position.set(-25.5, PLATFORM_HEIGHT, 45.4);
    eastSignals[7].group.position.set(24.5, PLATFORM_HEIGHT, 45.4);
    westSignals[7].group.position.set(-28.0, 0, 45.4);
    westSignals[7].group.rotation.y = Math.PI;
    g.add(trackBeacons[7].group, eastSignals[7].group, westSignals[7].group);

    moduleColliders[7].push({ id: 'sig7', minX: 24.0, maxX: 25.0, minZ: 44.9, maxZ: 45.9 });
    moduleInteractables[7].push({
      id: 'signal_track7',
      title: 'Track 7 Semaphore Signal',
      actionLabel: 'Cycle Signal (RED / YELLOW / GREEN)',
      x: 24.5,
      y: PLATFORM_HEIGHT,
      z: 45.4,
      radius: 3.0,
    });
  }

  // --- Module 8 (Chapter 2 Final Tier -> Track 8 @ z=54.8) ---
  {
    const g = moduleGroups[8];
    buildSubBallastApron(54.2, 5.2, g);
    buildTrackAssembly(8, g);
    buildInterTrackMedianDetails(51.8, g, false);
    decorateTrackCorridor(8, g);
    addHangingPlatformSign(g, -6, PLATFORM_HEIGHT + 4.1, 57.3, 8);
    addHangingPlatformSign(g, 6, PLATFORM_HEIGHT + 4.1, 57.3, 8);

    trackBeacons[8].group.position.set(-25.5, PLATFORM_HEIGHT, 57.2);
    eastSignals[8].group.position.set(24.5, PLATFORM_HEIGHT, 57.2);
    eastSignals[8].group.rotation.y = Math.PI;
    westSignals[8].group.position.set(-28.0, 0, 57.2);
    g.add(trackBeacons[8].group, eastSignals[8].group, westSignals[8].group);

    moduleColliders[8].push({ id: 'sig8', minX: 24.0, maxX: 25.0, minZ: 56.7, maxZ: 57.7 });
    moduleInteractables[8].push({
      id: 'signal_track8',
      title: 'Track 8 Semaphore Signal',
      actionLabel: 'Cycle Signal (RED / YELLOW / GREEN)',
      x: 24.5,
      y: PLATFORM_HEIGHT,
      z: 57.2,
      radius: 3.0,
    });
  }

  ([3, 4, 5, 6, 7, 8] as const).forEach((trackNum) => {
    moduleGroups[trackNum].visible = false;
    scene.add(moduleGroups[trackNum]);
  });

  // Landscaped Expansion Greenbelt Buffers for unbuilt southern yard zones (prevents bare grey expanses at L1..L4)
  const makeExpansionReserveBuffer = (zMin: number, zMax: number, seed: number) => {
    const buf = new THREE.Group();
    populateTracksideGreenery(
      buf,
      [
        { minX: -102, maxX: 37.6, minZ: zMin, maxZ: zMax },
        { minX: 46.5, maxX: 102, minZ: zMin, maxZ: zMax },
      ],
      seed,
    );
    // Low painted boundary bollards framing the active station edge cleanly
    const bollardGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.65, 8);
    const bollardMat = new THREE.MeshStandardMaterial({ color: 0xe6b830, roughness: 0.55 });
    const bollardXs: number[] = [];
    for (let x = -34; x <= 34; x += 6.8) {
      bollardXs.push(x);
    }
    const inst = new THREE.InstancedMesh(bollardGeo, bollardMat, bollardXs.length);
    const dummy = new THREE.Object3D();
    bollardXs.forEach((bx, idx) => {
      dummy.position.set(bx, 0.325, zMin + 0.35);
      dummy.updateMatrix();
      inst.setMatrixAt(idx, dummy.matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
    inst.computeBoundingSphere();
    buf.add(inst);

    const midZ = (zMin + zMax) * 0.5;
    [-46, -18, 12, 52].forEach((bx, idx) => {
      const clump = createBananaClump();
      clump.position.set(bx, 0, midZ);
      clump.rotation.y = idx * 1.3 + seed * 0.5;
      buf.add(clump);
    });
    scene.add(buf);
    return buf;
  };

  const expansionBuffer34 = makeExpansionReserveBuffer(14.6, 27.6, 31);
  const expansionBuffer4Only = makeExpansionReserveBuffer(16.6, 27.6, 41);
  const expansionBuffer56 = makeExpansionReserveBuffer(28.4, 44.2, 51);

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
    ['পদ্মা স্কয়ার', 'PADMA SQUARE', 0x6366f1, -22, 64.0 + southShift, Math.PI],
    ['মেট্রোপলিটন আর্কেড', 'METRO ARCADE', 0x14b8a6, 22, 64.0 + southShift, Math.PI],
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
    [-38, 74 + southShift, 12, 36, 11, 0x1e293b, 0x14b8a6, false],
    [0, 76 + southShift, 14, 48, 12, 0x334155, 0x38bdf8, true],
    [38, 74 + southShift, 12, 33, 11, 0x27272a, 0xfacc15, false],
    [-72, -38, 11, 30, 11, 0x334155, 0x38bdf8, true],
    [-72, 58 + southShift, 11, 32, 11, 0x1e293b, 0x10b981, false],
    [72, -38, 11, 29, 11, 0x334155, 0x38bdf8, false],
    [72, 58 + southShift, 11, 35, 11, 0x1e293b, 0x14b8a6, true],
  ];
  heroTowers.forEach(([tx, tz, w, h, d, pod, neon, useA]) => {
    const tower = createModernSkyscraper(w, h, d, pod, useA ? glassFacadeMatA : glassFacadeMatB, neon);
    tower.position.set(tx, 0, tz);
    scene.add(tower);
  });

  // Instanced Distant Metropolitan Skyline Ring (skipping active train corridor)
  const skylinePositions: [number, number, number, number, number][] = [];
  for (let i = 0; i < 64; i++) {
    const angle = (i / 64) * Math.PI * 2;
    const dist = (isCh2 ? 104 : 88) + (i % 4) * 14;
    const sx = Math.cos(angle) * dist * 1.1;
    const sz = Math.sin(angle) * dist * 0.95;
    if (sz > -14 && sz < (isCh2 ? 72 : 48)) continue;
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
  const westFlyover = createElevatedFlyover(144, 8.6, [-54, -36, -18, 46 + southShift, 62 + southShift], 8.9);
  westFlyover.position.set(-56, 0, 12 + southShift * 0.4);
  scene.add(westFlyover);

  const eastFlyover = createElevatedFlyover(144, 8.6, [-54, -36, -18, 46 + southShift, 62 + southShift], 8.9);
  eastFlyover.position.set(56, 0, 12 + southShift * 0.4);
  scene.add(eastFlyover);

  // Illuminated Bilingual City Billboards
  const bbSpecs: [string, string, string, string, number, number, number][] = [
    ['বাংলাদেশ রেলওয়ে · দ্রুতগতির সেবা', 'BANGLADESH RAILWAY · METRO HUB', '#062c22', '#10b981', -18, -24.5, 0],
    [
      isCh2 ? 'পদ্মা সেন্ট্রাল মেগা টার্মিনাল' : 'আধুনিক শাপলাপুর সিটি',
      isCh2 ? 'PADMA CENTRAL HIGH-SPEED HUB' : 'MODERN INTERNATIONAL STATION',
      '#0c233a',
      '#38bdf8',
      24,
      -24.5,
      0,
    ],
    ['ইন্টারসিটি ও মেট্রো সংযোগ', 'EXPRESS TRANSIT CORRIDOR', '#1e1b4b', '#facc15', -18, 47.6 + southShift, Math.PI],
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
    [-36, 47.2 + southShift, 7.8],
    [36, 47.2 + southShift, 8.0],
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
    const zCoord = isNorth
      ? dir === 1
        ? -28.6
        : -33.4
      : (dir === 1 ? 55.8 : 51.2) + southShift;
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

  // 10. Living Station NPC Ecosystem + Emergency & Ops 3D Props
  let npcState = createInitialNpcSimulation();
  const npcRigs = new Map<string, ArticulatedNpcRig>();
  const hazardProps = new Map<string, EmergencyHazardProp>();
  const opsHazardProps = new Map<string, EmergencyHazardProp>();

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
    7: 'red',
    8: 'red',
  };
  const prevOcc: Record<TrackId, boolean> = {
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
    7: false,
    8: false,
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
    if (x >= 16 && x <= 21 && z >= -4.7 && z <= (isCh2 ? 56.5 : 37.5)) return 'wood';
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
    for (const prop of opsHazardProps.values()) {
      scene.remove(prop.group);
      disposeObjectGroup(prop.group);
    }
    opsHazardProps.clear();
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
    opsEvents: OpsEmergencyEvent[] = [],
    powerOutageActive = false,
    vipProtocol: VipSecurityProtocol | null = null,
  ) => {
    const unlockedTracks = simState.unlockedTracks;

    // Trigger 3D construction animation when new tracks unlock
    if (unlockedTracks > prevUnlockedTracks) {
      for (let t = prevUnlockedTracks + 1; t <= unlockedTracks; t++) {
        if (t === 3 || t === 4 || t === 5 || t === 6 || t === 7 || t === 8) {
          moduleAnimTimers[t] = 3.5;
        }
      }
      craneTimer = 3.6;
      prevUnlockedTracks = unlockedTracks;
    } else if (unlockedTracks < prevUnlockedTracks) {
      ([3, 4, 5, 6, 7, 8] as const).forEach((t) => {
        moduleAnimTimers[t] = 0;
        moduleGroups[t].position.y = 0;
      });
      craneTimer = 0;
      prevUnlockedTracks = unlockedTracks;
    }

    ([3, 4, 5, 6, 7, 8] as const).forEach((t) => {
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

    expansionBuffer34.visible = !isCh2 && unlockedTracks <= 2;
    expansionBuffer4Only.visible = !isCh2 && unlockedTracks === 3;
    expansionBuffer56.visible = !isCh2 && unlockedTracks < 5;

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

    // Sync signals, switches, and occupancy beacons across Tracks 1..8
    ([1, 2, 3, 4, 5, 6, 7, 8] as const).forEach((t) => {
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

    ([3, 4, 5, 6, 7, 8] as const).forEach((t) => {
      if (unlockedTracks >= t) {
        colliders.push(...moduleColliders[t]);
        interactables.push(...moduleInteractables[t]);
      }
    });

    // Keep Footover Bridge south end closed visually and physically at current unlocked terminus
    fbSouthCapBase.visible = unlockedTracks < 4;
    fbSouthCapM4.visible = unlockedTracks >= 4 && unlockedTracks < 6;
    fbSouthCapM6.visible = unlockedTracks === 6;
    fbSouthCapM8.visible = unlockedTracks >= 7;
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
    } else if (unlockedTracks < 7) {
      colliders.push({
        id: 'fb_rail_s_end_m6',
        minX: -25.35,
        maxX: -22.65,
        minZ: 41.45,
        maxZ: 43.1,
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
        7: 45.2,
        8: 57.3,
      };
      const doorInteractZByPlatform: Record<TrackId, number> = {
        1: -5.3,
        2: 5.3,
        3: 11.1,
        4: 21.6,
        5: 27.4,
        6: 38.1,
        7: 45.4,
        8: 57.1,
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

    let vipPlatformCounts: Partial<Record<TrackId, number>> = {};

    if (stepNpcAi) {
      const npcRes = stepNpcSimulation(
        npcState,
        simState,
        trainState,
        { x: playerX, y: playerY, z: playerZ },
        colliders,
        dt,
        vipProtocol,
      );
      npcState = npcRes.npcState;
      outSimState = npcRes.simState;
      outPlayerX = npcRes.playerX;
      outPlayerZ = npcRes.playerZ;
      npcEvents = npcRes.events;
      vipPlatformCounts = npcRes.vipPlatformCounts;
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

    // Sync 3D Operations Repair Points for active Ops Emergencies
    const liveOpsIds = new Set<string>();
    for (let oIdx = 0; oIdx < opsEvents.length; oIdx++) {
      const ev = opsEvents[oIdx];
      if (ev.resolved || ev.failed) continue;
      liveOpsIds.add(ev.id);
      const yPos = groundHeightAt(ev.x, ev.z, 0.65, unlockedTracks);
      let prop = opsHazardProps.get(ev.id);
      if (!prop) {
        const propKind =
          ev.kind === 'power_failure' || ev.kind === 'train_breakdown' ? 'fire' : 'package';
        prop = createEmergencyHazardProp(propKind);
        prop.group.position.set(ev.x, yPos, ev.z);
        scene.add(prop.group);
        opsHazardProps.set(ev.id, prop);
      }
      prop.group.position.set(ev.x, yPos, ev.z);
      prop.update(elapsed);

      interactables.push({
        id: 'ops_repair_point',
        title: ev.title,
        actionLabel: `${ev.actionLabel} [E]`,
        x: ev.x,
        y: yPos,
        z: ev.z,
        radius: 3.2,
        missionId: ev.id,
      });
    }
    for (const [oid, prop] of opsHazardProps.entries()) {
      if (!liveOpsIds.has(oid)) {
        scene.remove(prop.group);
        disposeObjectGroup(prop.group);
        opsHazardProps.delete(oid);
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

    // Night illumination for glass skyscrapers, streetlamps, billboards, and traffic lights (dims on Station Power Outage)
    const outageScale = powerOutageActive ? 0.16 : 1.0;
    const nightGlow = nightFactor * 0.9 + duskFactor * 0.35;
    glassFacadeMatA.emissiveIntensity = (0.05 + nightGlow * 1.15) * outageScale;
    glassFacadeMatB.emissiveIntensity = (0.05 + nightGlow * 1.15) * outageScale;
    streetBulbMat.emissiveIntensity = (0.2 + nightGlow * 2.1) * outageScale;
    vehicleHeadlightMat.emissiveIntensity = 0.25 + nightGlow * 2.2;
    vehicleTaillightMat.emissiveIntensity = 0.35 + nightGlow * 1.9;
    for (let b = 0; b < billboardMats.length; b++) {
      billboardMats[b].emissiveIntensity = (0.32 + nightGlow * 0.95) * outageScale;
    }
    starMat.opacity = Math.max(0, (nightFactor - 0.2) * 1.15) * (1 - rainBlend);
    starField.visible = starMat.opacity > 0.02;

    const rainDim = 1 - 0.35 * rainBlend;
    sunLight.intensity = (0.38 + daylightFactor * 1.32) * rainDim + lightningFlash;
    sunLight.color.lerpColors(moonNightColor, sunWarmColor, daylightFactor);
    if (duskFactor > 0.25 && rainBlend < 0.5) {
      sunLight.color.lerp(duskSunColor, duskFactor * 0.55 * (1 - rainBlend));
    }
    hemiLight.intensity = (0.48 + daylightFactor * 0.4) * rainDim * (powerOutageActive ? 0.72 : 1.0);

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
      vipPlatformCounts,
    };
  };

  const dispose = () => {
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments || obj instanceof THREE.Points) {
        obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          if (!m) return;
          const std = m as THREE.MeshStandardMaterial;
          std.map?.dispose();
          std.bumpMap?.dispose();
          std.emissiveMap?.dispose();
          m.dispose();
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
