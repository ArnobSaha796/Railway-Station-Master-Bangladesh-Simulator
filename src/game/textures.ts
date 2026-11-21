import * as THREE from 'three';
import type { BallastVariant } from './trackDecor';
import type { TrackId } from './types';

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

export function configureColorTexture(
  tex: THREE.CanvasTexture,
  repeatX = 1,
  repeatY = 1,
  maxAnisotropy = 4,
): THREE.CanvasTexture {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function configureDataTexture(
  tex: THREE.CanvasTexture,
  repeatX = 1,
  repeatY = 1,
  maxAnisotropy = 4,
): THREE.CanvasTexture {
  // Linear space (NoColorSpace) for bump/roughness maps
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createBrickTexturePair(maxAnisotropy = 4): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const [cColor, ctxC] = makeCanvas(512, 512);
  const [cBump, ctxB] = makeCanvas(512, 512);

  // Lime mortar base
  ctxC.fillStyle = '#d3c4ae';
  ctxC.fillRect(0, 0, 512, 512);
  ctxB.fillStyle = '#404040';
  ctxB.fillRect(0, 0, 512, 512);

  const rows = 12;
  const cols = 6;
  const brickH = 512 / rows;
  const brickW = 512 / cols;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (brickW * 0.5);
    for (let c = -1; c <= cols; c++) {
      const seed = (r * 19 + c * 31) & 15;
      const shade = (seed % 7) - 3;
      const red = Math.min(255, Math.max(0, 168 + shade * 7));
      const green = Math.min(255, Math.max(0, 72 + shade * 4));
      const blue = Math.min(255, Math.max(0, 50 + shade * 3));

      const x = c * brickW + offset + 3;
      const y = r * brickH + 3;
      const w = brickW - 6;
      const h = brickH - 6;

      ctxC.fillStyle = `rgb(${red},${green},${blue})`;
      ctxC.fillRect(x, y, w, h);

      // Subtle top highlight & bottom weathering on each brick
      ctxC.fillStyle = 'rgba(255,220,190,0.12)';
      ctxC.fillRect(x, y, w, 4);
      ctxC.fillStyle = 'rgba(40,18,12,0.14)';
      ctxC.fillRect(x, y + h - 4, w, 4);

      const bumpVal = 175 + shade * 10;
      ctxB.fillStyle = `rgb(${bumpVal},${bumpVal},${bumpVal})`;
      ctxB.fillRect(x, y, w, h);
    }
  }

  return {
    map: configureColorTexture(new THREE.CanvasTexture(cColor), 3, 2, maxAnisotropy),
    bumpMap: configureDataTexture(new THREE.CanvasTexture(cBump), 3, 2, maxAnisotropy),
  };
}

export function createPlatformTileTexturePair(maxAnisotropy = 4): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const [cColor, ctxC] = makeCanvas(512, 512);
  const [cBump, ctxB] = makeCanvas(512, 512);

  ctxC.fillStyle = '#d4cab9';
  ctxC.fillRect(0, 0, 512, 512);
  ctxB.fillStyle = '#c8c8c8';
  ctxB.fillRect(0, 0, 512, 512);

  // Subtle tile variation
  const tileSize = 128;
  for (let ty = 0; ty < 4; ty++) {
    for (let tx = 0; tx < 4; tx++) {
      const delta = ((tx * 7 + ty * 11) % 5) - 2;
      ctxC.fillStyle = `rgb(${210 + delta * 4},${200 + delta * 4},${183 + delta * 3})`;
      ctxC.fillRect(tx * tileSize + 2, ty * tileSize + 2, tileSize - 4, tileSize - 4);
    }
  }

  // Grout seams
  ctxC.strokeStyle = 'rgba(72, 64, 54, 0.32)';
  ctxC.lineWidth = 3;
  ctxB.strokeStyle = '#555555';
  ctxB.lineWidth = 4;
  for (let i = 0; i <= 512; i += tileSize) {
    ctxC.beginPath();
    ctxC.moveTo(i, 0);
    ctxC.lineTo(i, 512);
    ctxC.stroke();
    ctxC.beginPath();
    ctxC.moveTo(0, i);
    ctxC.lineTo(512, i);
    ctxC.stroke();

    ctxB.beginPath();
    ctxB.moveTo(i, 0);
    ctxB.lineTo(i, 512);
    ctxB.stroke();
    ctxB.beginPath();
    ctxB.moveTo(0, i);
    ctxB.lineTo(512, i);
    ctxB.stroke();
  }

  // Mineral aggregate speckle
  for (let i = 0; i < 1600; i++) {
    const x = (i * 73) % 512;
    const y = (i * 137) % 512;
    ctxC.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(55,48,40,0.08)';
    ctxC.fillRect(x, y, 2, 2);
    ctxB.fillStyle = i % 2 === 0 ? '#dadada' : '#a8a8a8';
    ctxB.fillRect(x, y, 2, 2);
  }

  return {
    map: configureColorTexture(new THREE.CanvasTexture(cColor), 12, 2, maxAnisotropy),
    bumpMap: configureDataTexture(new THREE.CanvasTexture(cBump), 12, 2, maxAnisotropy),
  };
}

export function createGrassTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#558739';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 2400; i++) {
    const x = (i * 47 + (i % 7) * 13) % 512;
    const y = (i * 91 + (i % 5) * 19) % 512;
    const shade = i % 4;
    ctx.fillStyle =
      shade === 0 ? '#639743' : shade === 1 ? '#4a7730' : shade === 2 ? '#6fa04b' : '#58863c';
    ctx.fillRect(x, y, 4 + (i % 3), 4);
  }

  return configureColorTexture(new THREE.CanvasTexture(canvas), 28, 28, maxAnisotropy);
}

export function createBallastVariantTexturePair(
  variant: BallastVariant,
  repeatX = 16,
  maxAnisotropy = 4,
): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const [cColor, ctxC] = makeCanvas(512, 512);
  const [cBump, ctxB] = makeCanvas(512, 512);

  const variantConfigs: Record<
    BallastVariant,
    {
      base: string;
      tones: string[];
      centerBand: [string, string, string];
      speckCount: number;
      mossRatio: number;
      oilPatches: number;
    }
  > = {
    mainline: {
      base: '#66635e',
      tones: ['#8a867f', '#52504c', '#9e9a92', '#42403d', '#77726a', '#acabaa'],
      centerBand: ['rgba(72, 70, 66, 0.22)', 'rgba(98, 76, 56, 0.22)', 'rgba(56, 48, 40, 0.28)'],
      speckCount: 5400,
      mossRatio: 0,
      oilPatches: 0,
    },
    station_oiled: {
      base: '#443e38',
      tones: ['#575049', '#322d29', '#675a4e', '#23201d', '#7c4e32', '#433f3b'],
      centerBand: ['rgba(42, 38, 34, 0.36)', 'rgba(116, 58, 28, 0.36)', 'rgba(18, 15, 13, 0.62)'],
      speckCount: 5800,
      mossRatio: 0,
      oilPatches: 18,
    },
    siding_weathered: {
      base: '#6c624e',
      tones: ['#8c8067', '#5a5242', '#a19578', '#4d5d38', '#756a52', '#5f6f42'],
      centerBand: ['rgba(76, 94, 48, 0.38)', 'rgba(108, 86, 58, 0.26)', 'rgba(62, 56, 44, 0.28)'],
      speckCount: 5200,
      mossRatio: 7,
      oilPatches: 3,
    },
    iron_dust: {
      base: '#6c4d3c',
      tones: ['#945d40', '#5b4235', '#ad6f4d', '#47342a', '#826b5c', '#7c472d'],
      centerBand: ['rgba(86, 54, 38, 0.3)', 'rgba(148, 68, 30, 0.42)', 'rgba(84, 42, 24, 0.46)'],
      speckCount: 5600,
      mossRatio: 0,
      oilPatches: 6,
    },
  };

  const cfg = variantConfigs[variant];
  ctxC.fillStyle = cfg.base;
  ctxC.fillRect(0, 0, 512, 512);
  ctxB.fillStyle = '#686868';
  ctxB.fillRect(0, 0, 512, 512);

  const railBandGrad = ctxC.createLinearGradient(0, 0, 0, 512);
  railBandGrad.addColorStop(0.0, cfg.centerBand[0]);
  railBandGrad.addColorStop(0.28, cfg.centerBand[1]);
  railBandGrad.addColorStop(0.5, cfg.centerBand[2]);
  railBandGrad.addColorStop(0.72, cfg.centerBand[1]);
  railBandGrad.addColorStop(1.0, cfg.centerBand[0]);
  ctxC.fillStyle = railBandGrad;
  ctxC.fillRect(0, 0, 512, 512);

  if (cfg.mossRatio > 0) {
    ctxC.fillStyle = 'rgba(72, 108, 42, 0.28)';
    for (let m = 0; m < 52; m++) {
      const mx = (m * 97) % 512;
      const my = m % 2 === 0 ? (m * 17) % 96 : 416 + ((m * 19) % 88);
      ctxC.fillRect(mx, my, 20 + (m % 24), 12 + (m % 14));
    }
  }
  if (cfg.oilPatches > 0) {
    for (let o = 0; o < cfg.oilPatches; o++) {
      const ox = (o * 113 + 37) % 512;
      const oy = 178 + ((o * 53) % 156);
      ctxC.fillStyle = o % 3 === 0 ? 'rgba(104, 48, 20, 0.3)' : 'rgba(18, 16, 14, 0.34)';
      ctxC.beginPath();
      ctxC.ellipse(ox, oy, 24 + (o % 20), 11 + (o % 10), 0, 0, Math.PI * 2);
      ctxC.fill();
    }
  }

  const bTones = ['#dedede', '#444444', '#f2f2f2', '#303030', '#b2b2b2', '#fafafa'];
  const seedShift = variant.length * 37;
  for (let i = 0; i < cfg.speckCount; i++) {
    const x = ((i + seedShift) * 73 + (i % 13) * 19) % 512;
    const y = ((i + seedShift) * 139 + (i % 11) * 23) % 512;
    const w = 4 + (i % 6);
    const h = 4 + ((i * 3) % 5);
    if (cfg.mossRatio > 0 && i % cfg.mossRatio === 0 && (y < 105 || y > 407)) {
      ctxC.fillStyle = i % 2 === 0 ? '#527a34' : '#6c8740';
    } else {
      ctxC.fillStyle = cfg.tones[i % cfg.tones.length];
    }
    ctxC.fillRect(x, y, w, h);
    ctxB.fillStyle = bTones[i % bTones.length];
    ctxB.fillRect(x, y, w, h);
  }

  return {
    map: configureColorTexture(new THREE.CanvasTexture(cColor), repeatX, 1, maxAnisotropy),
    bumpMap: configureDataTexture(new THREE.CanvasTexture(cBump), repeatX, 1, maxAnisotropy),
  };
}

export function createBallastTexturePair(maxAnisotropy = 4): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  return createBallastVariantTexturePair('mainline', 48, maxAnisotropy);
}

export function createSleeperTexturePair(maxAnisotropy = 4): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const [cColor, ctxC] = makeCanvas(256, 512);
  const [cBump, ctxB] = makeCanvas(256, 512);

  // Neutral-warm weathered timber base so instanceColor multiplies cleanly
  ctxC.fillStyle = '#d4c8ba';
  ctxC.fillRect(0, 0, 256, 512);
  ctxB.fillStyle = '#888888';
  ctxB.fillRect(0, 0, 256, 512);

  // Longitudinal wood-grain fibers & deeper weather-checked splits
  for (let i = 0; i < 460; i++) {
    const x = (i * 19 + (i % 7) * 5) % 256;
    const y = (i * 43) % 512;
    const h = 40 + (i % 96);
    const w = i % 8 === 0 ? 5 : 2;
    ctxC.fillStyle =
      i % 5 === 0
        ? 'rgba(46, 32, 22, 0.44)'
        : i % 5 === 1
          ? 'rgba(242, 232, 218, 0.26)'
          : 'rgba(92, 70, 52, 0.3)';
    ctxC.fillRect(x, y, w, h);

    ctxB.fillStyle = i % 5 === 0 ? '#2e2e2e' : '#c0c0c0';
    ctxB.fillRect(x, y, w, h);
  }

  // Heavy corroded rail-seat iron oxide rust stains & oxidized tie-plate scars around v ~ 0.20 & 0.80
  [102, 410].forEach((seatY) => {
    const rustGrad = ctxC.createLinearGradient(0, seatY - 64, 0, seatY + 64);
    rustGrad.addColorStop(0, 'rgba(155, 68, 28, 0.0)');
    rustGrad.addColorStop(0.32, 'rgba(162, 70, 30, 0.56)');
    rustGrad.addColorStop(0.5, 'rgba(116, 44, 22, 0.78)');
    rustGrad.addColorStop(0.68, 'rgba(162, 70, 30, 0.56)');
    rustGrad.addColorStop(1, 'rgba(155, 68, 28, 0.0)');
    ctxC.fillStyle = rustGrad;
    ctxC.fillRect(0, seatY - 64, 256, 128);

    ctxC.fillStyle = 'rgba(110, 42, 20, 0.55)';
    ctxC.fillRect(22, seatY - 24, 212, 48);

    ctxB.fillStyle = '#383838';
    ctxB.fillRect(22, seatY - 26, 212, 52);
  });

  return {
    map: configureColorTexture(new THREE.CanvasTexture(cColor), 1, 1, maxAnisotropy),
    bumpMap: configureDataTexture(new THREE.CanvasTexture(cBump), 1, 1, maxAnisotropy),
  };
}

export function createTrackYardGroundTexturePair(maxAnisotropy = 4): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const [cColor, ctxC] = makeCanvas(512, 512);
  const [cBump, ctxB] = makeCanvas(512, 512);

  // Compacted sub-ballast earth, cinder & limestone screenings
  ctxC.fillStyle = '#53514a';
  ctxC.fillRect(0, 0, 512, 512);
  ctxB.fillStyle = '#7a7a7a';
  ctxB.fillRect(0, 0, 512, 512);

  // Fine compacted grit & occasional tiny moss/scrub flecks
  const gritTones = ['#636058', '#46443e', '#6f6b61', '#5a584f', '#4e5b42', '#7a7467'];
  const bTones = ['#9a9a9a', '#555555', '#b8b8b8', '#707070', '#686868', '#c8c8c8'];
  for (let i = 0; i < 7200; i++) {
    const x = (i * 61 + (i % 17) * 11) % 512;
    const y = (i * 127 + (i % 9) * 29) % 512;
    const sz = 2 + (i % 4);
    const toneIdx = i % 19 === 0 ? 4 : i % gritTones.length;
    ctxC.fillStyle = gritTones[toneIdx];
    ctxC.fillRect(x, y, sz, sz);
    ctxB.fillStyle = bTones[i % bTones.length];
    ctxB.fillRect(x, y, sz, sz);
  }

  // Subtle longitudinal drainage seam lines
  ctxC.fillStyle = 'rgba(28, 26, 22, 0.16)';
  ctxC.fillRect(0, 252, 512, 8);
  ctxB.fillStyle = '#383838';
  ctxB.fillRect(0, 252, 512, 8);

  return {
    map: configureColorTexture(new THREE.CanvasTexture(cColor), 36, 2, maxAnisotropy),
    bumpMap: configureDataTexture(new THREE.CanvasTexture(cBump), 36, 2, maxAnisotropy),
  };
}

export function createMetropolitanGroundTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#5c656f';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 4200; i++) {
    const x = (i * 83 + (i % 7) * 19) % 512;
    const y = (i * 149 + (i % 11) * 13) % 512;
    ctx.fillStyle =
      i % 3 === 0 ? 'rgba(255,255,255,0.045)' : i % 3 === 1 ? 'rgba(18,22,28,0.09)' : 'rgba(90,98,86,0.06)';
    ctx.fillRect(x, y, 3, 3);
  }

  // Subtle architectural slab joints
  ctx.strokeStyle = 'rgba(30, 38, 46, 0.22)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 512; i += 128) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  return configureColorTexture(new THREE.CanvasTexture(canvas), 42, 42, maxAnisotropy);
}

export function createCorrugatedTexture(baseHex: string, maxAnisotropy = 4): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(128, 128);
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 128, 128);

  for (let x = 0; x < 128; x += 8) {
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(x, 0, 3, 128);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(x + 4, 0, 3, 128);
  }

  return configureColorTexture(new THREE.CanvasTexture(canvas), 6, 2, maxAnisotropy);
}

export function createSignboardTexture(
  bnText: string,
  enText: string,
  bgHex = '#f4b41a',
  fgHex = '#191919',
  maxAnisotropy = 4,
): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 192);
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 512, 192);

  ctx.strokeStyle = fgHex;
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, 492, 172);
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, 472, 152);

  ctx.fillStyle = fgHex;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = 'bold 42px "Noto Sans Bengali", "SolaimanLipi", sans-serif';
  ctx.fillText(bnText, 256, 68);

  ctx.font = '800 32px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(enText, 256, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createClockFaceTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#fcf8ec';
  ctx.beginPath();
  ctx.arc(128, 128, 122, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#2b241d';
  ctx.lineWidth = 10;
  ctx.stroke();

  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const x1 = 128 + Math.cos(angle) * 92;
    const y1 = 128 + Math.sin(angle) * 92;
    const x2 = 128 + Math.cos(angle) * 108;
    const y2 = 128 + Math.sin(angle) * 108;
    ctx.strokeStyle = '#1f1a16';
    ctx.lineWidth = i % 3 === 0 ? 6 : 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.strokeStyle = '#1f1a16';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(128 + Math.cos(-Math.PI * 0.85) * 58, 128 + Math.sin(-Math.PI * 0.85) * 58);
  ctx.stroke();

  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(128 + Math.cos(0) * 84, 128 + Math.sin(0) * 84);
  ctx.stroke();

  ctx.fillStyle = '#b82927';
  ctx.beginPath();
  ctx.arc(128, 128, 7, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(128, 128);
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(10, 14, 12, 0.55)');
  grad.addColorStop(0.6, 'rgba(10, 14, 12, 0.22)');
  grad.addColorStop(1, 'rgba(10, 14, 12, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createCoachNumberPlateTexture(
  codeEn: string,
  codeBn: string,
  bgHex = '#f5c756',
  fgHex = '#102419',
  maxAnisotropy = 4,
): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 128);
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 256, 128);

  ctx.strokeStyle = fgHex;
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, 244, 116);

  ctx.fillStyle = fgHex;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 40px "Noto Sans Bengali", "SolaimanLipi", sans-serif';
  ctx.fillText(codeBn, 128, 44);
  ctx.font = '800 30px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(codeEn, 128, 92);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'] as const;

export function createPlatformSignTexture(
  platformNum: TrackId,
  maxAnisotropy = 4,
): THREE.CanvasTexture {
  const bnDigit = BN_DIGITS[platformNum] ?? String(platformNum);
  return createSignboardTexture(
    `${bnDigit} নম্বর প্ল্যাটফর্ম`,
    `PLATFORM ${platformNum}`,
    '#14442e',
    '#f5c756',
    maxAnisotropy,
  );
}

export function createGlassFacadeTexture(
  tintHex = '#193b54',
  maxAnisotropy = 4,
): {
  map: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
} {
  const [cColor, ctxC] = makeCanvas(512, 512);
  const [cEmis, ctxE] = makeCanvas(512, 512);

  // Dark metallic curtain-wall frame base
  ctxC.fillStyle = '#1b2633';
  ctxC.fillRect(0, 0, 512, 512);
  ctxE.fillStyle = '#000000';
  ctxE.fillRect(0, 0, 512, 512);

  const cols = 8;
  const rows = 12;
  const cellW = 512 / cols;
  const cellH = 512 / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const seed = (r * 37 + c * 53 + r * c * 11) & 255;
      const wx = c * cellW + 5;
      const wy = r * cellH + 4;
      const ww = cellW - 10;
      const wh = cellH - 8;

      // Exterior reflective glass bay
      ctxC.fillStyle = tintHex;
      ctxC.fillRect(wx, wy, ww, wh);
      ctxC.fillStyle = 'rgba(195, 232, 255, 0.18)';
      ctxC.fillRect(wx + 2, wy + 2, ww * 0.45, wh - 4);

      // Spandrel horizontal sill band
      ctxC.fillStyle = 'rgba(12, 22, 34, 0.55)';
      ctxC.fillRect(wx, wy + wh - 5, ww, 5);

      // Deterministic lit interior rooms for nightfall glow
      const litRoll = seed % 11;
      if (litRoll < 7) {
        ctxE.fillStyle =
          litRoll === 0 || litRoll === 3
            ? '#ffd98a'
            : litRoll === 1 || litRoll === 4
              ? '#ffe7b3'
              : litRoll === 2
                ? '#9ed4ff'
                : '#fff2d6';
        ctxE.fillRect(wx + 2, wy + 2, ww - 4, wh - 6);
      }
    }
  }

  return {
    map: configureColorTexture(new THREE.CanvasTexture(cColor), 1, 2, maxAnisotropy),
    emissiveMap: configureColorTexture(new THREE.CanvasTexture(cEmis), 1, 2, maxAnisotropy),
  };
}

export function createAsphaltAvenueTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#282d35';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle urban asphalt aggregate speckle
  for (let i = 0; i < 2400; i++) {
    const x = (i * 67) % 512;
    const y = (i * 113) % 512;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.045)' : 'rgba(10,12,16,0.14)';
    ctx.fillRect(x, y, 2, 2);
  }

  // White road border shoulder stripes (top & bottom edges along X road)
  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(0, 18, 512, 10);
  ctx.fillRect(0, 484, 512, 10);

  // Yellow dashed centerline
  ctx.fillStyle = '#facc15';
  for (let x = 20; x < 512; x += 96) {
    ctx.fillRect(x, 250, 56, 12);
  }

  // Secondary white lane dashes
  ctx.fillStyle = 'rgba(241, 245, 249, 0.72)';
  for (let x = 10; x < 512; x += 128) {
    ctx.fillRect(x, 134, 48, 7);
    ctx.fillRect(x, 371, 48, 7);
  }

  return configureColorTexture(new THREE.CanvasTexture(canvas), 14, 1, maxAnisotropy);
}

export function createCityBillboardTexture(
  titleBn: string,
  subEn: string,
  bgHex = '#0c233a',
  accentHex = '#38bdf8',
  maxAnisotropy = 4,
): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 256);
  const grad = ctx.createLinearGradient(0, 0, 512, 256);
  grad.addColorStop(0, bgHex);
  grad.addColorStop(1, '#091522');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, 492, 236);

  ctx.fillStyle = accentHex;
  ctx.fillRect(28, 32, 14, 192);

  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 46px "Noto Sans Bengali", "SolaimanLipi", sans-serif';
  ctx.fillText(titleBn, 64, 96);

  ctx.fillStyle = accentHex;
  ctx.font = '800 28px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(subEn, 64, 166);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createKilometerPostTexture(
  topText: string,
  bottomText: string,
  bgHex = '#f5b81c',
  fgHex = '#171717',
  maxAnisotropy = 4,
): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = fgHex;
  ctx.lineWidth = 14;
  ctx.strokeRect(10, 10, 236, 236);

  ctx.fillStyle = fgHex;
  ctx.fillRect(10, 122, 236, 10);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 54px "Plus Jakarta Sans", "Noto Sans Bengali", system-ui, sans-serif';
  ctx.fillText(topText, 128, 70);

  ctx.font = '800 44px "Noto Sans Bengali", "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(bottomText, 128, 186);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}
