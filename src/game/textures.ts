import * as THREE from 'three';

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

export function createBallastTexturePair(maxAnisotropy = 4): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const [cColor, ctxC] = makeCanvas(256, 256);
  const [cBump, ctxB] = makeCanvas(256, 256);
  ctxC.fillStyle = '#68655f';
  ctxC.fillRect(0, 0, 256, 256);
  ctxB.fillStyle = '#707070';
  ctxB.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 1800; i++) {
    const x = (i * 53) % 256;
    const y = (i * 97) % 256;
    const tones = ['#858077', '#55524d', '#989288', '#44413c'];
    const bTones = ['#d0d0d0', '#505050', '#ececec', '#3a3a3a'];
    ctxC.fillStyle = tones[i % tones.length];
    ctxC.fillRect(x, y, 3, 3);
    ctxB.fillStyle = bTones[i % bTones.length];
    ctxB.fillRect(x, y, 3, 3);
  }

  return {
    map: configureColorTexture(new THREE.CanvasTexture(cColor), 40, 2, maxAnisotropy),
    bumpMap: configureDataTexture(new THREE.CanvasTexture(cBump), 40, 2, maxAnisotropy),
  };
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
  platformNum: 1 | 2 | 3 | 4 | 5 | 6,
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
