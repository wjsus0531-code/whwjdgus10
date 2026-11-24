import { useEffect, useRef } from "react";

interface StickmanDuelArenaProps {
  labelA: string;
  labelB: string;
  imageA?: string | null;
  imageB?: string | null;
  intense?: boolean;
  finisherWinner?: "A" | "B" | "TIE" | null;
  countdownBadge?: number | null;
}

interface Vec2 {
  x: number;
  y: number;
}

interface Pose {
  xOffset: number; // relative to center
  yOffset: number; // height off ground (negative = up)
  lean: number; // radians, positive leans right
  headTilt: number;
  frontArmAngle: number;
  frontForearmAngle: number;
  backArmAngle: number;
  backForearmAngle: number;
  frontThighAngle: number;
  frontShinAngle: number;
  backThighAngle: number;
  backShinAngle: number;
  auraAlpha?: number;
  crackling?: boolean;
  defeated?: boolean;
  victory?: boolean;
  blade?: {
    length: number;
    angleOffset?: number;
    color?: string;
  };
  slashArc?: {
    x: number;
    y: number;
    radius: number;
    startAngle: number;
    endAngle: number;
    alpha: number;
  };
}

interface ArenaParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: string;
  kind: "spark" | "dust" | "ember";
}

interface ClashRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  lineWidth: number;
}

interface SlashBeam {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
  width: number;
  color: string;
}

interface LightningBolt {
  points: Vec2[];
  alpha: number;
  color: string;
  width: number;
}

interface CraterCrack {
  cx: number;
  cy: number;
  branches: Vec2[][];
  alpha: number;
  color: string;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function easeInOut(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

function easeOutBack(t: number): number {
  const x = clamp01(t);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function generateBolt(x1: number, y1: number, x2: number, y2: number, jitter: number, segments = 6): Vec2[] {
  const pts: Vec2[] = [{ x: x1, y: y1 }];
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    pts.push({
      x: lerp(x1, x2, t) + (Math.random() - 0.5) * jitter,
      y: lerp(y1, y2, t) + (Math.random() - 0.5) * jitter,
    });
  }
  pts.push({ x: x2, y: y2 });
  return pts;
}

function drawFighter(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  groundY: number,
  facing: 1 | -1,
  pose: Pose,
  color: string,
  glowColor: string,
  tag: "A" | "B",
  faceImage: HTMLImageElement | null,
  timeSec: number,
  ghostAlpha = 1
) {
  const isGhost = ghostAlpha < 0.99;
  const isDefeated = Boolean(pose.defeated) && !isGhost;
  const bodyColor = isDefeated ? "#666D80" : color;
  const bodyGlow = isDefeated ? "#323847" : glowColor;

  const hasLoadedPhoto = Boolean(
    faceImage && faceImage.complete && faceImage.naturalWidth > 0 && faceImage.naturalHeight > 0
  );

  const hipX = centerX + pose.xOffset;
  const hipY = Math.min(groundY - 6, groundY - 48 + pose.yOffset);
  const torsoLen = 28;
  const upperArmLen = 17;
  const forearmLen = 16;
  const thighLen = 23;
  const shinLen = 22;
  const headR = hasLoadedPhoto ? 27 : 19;

  const shoulderX = hipX + Math.sin(pose.lean) * torsoLen;
  const shoulderY = Math.min(groundY - 7, hipY - Math.cos(pose.lean) * torsoLen);
  const neckX = shoulderX + Math.sin(pose.lean * 0.85) * 6;
  const neckY = Math.min(groundY - 7, shoulderY - Math.cos(pose.lean * 0.85) * 6);
  const headAngle =
    pose.lean * (Math.abs(pose.lean) > 1.25 ? 1 : 0.7) + pose.headTilt;
  const headX = neckX + Math.sin(headAngle) * (headR - 1);
  const headY = Math.min(groundY - headR + 2, neckY - Math.cos(headAngle) * (headR - 1));

  const joint = (ox: number, oy: number, angleFromDown: number, len: number): Vec2 => ({
    x: ox + Math.sin(angleFromDown) * facing * len,
    y: Math.min(groundY + 1, oy + Math.cos(angleFromDown) * len),
  });

  const backElbow = joint(shoulderX, shoulderY, pose.backArmAngle, upperArmLen);
  const backHand = joint(backElbow.x, backElbow.y, pose.backForearmAngle, forearmLen);
  const backKnee = joint(hipX, hipY, pose.backThighAngle, thighLen);
  const backFoot = joint(backKnee.x, backKnee.y, pose.backShinAngle, shinLen);

  const frontElbow = joint(shoulderX, shoulderY, pose.frontArmAngle, upperArmLen);
  const frontHand = joint(frontElbow.x, frontElbow.y, pose.frontForearmAngle, forearmLen);
  const frontKnee = joint(hipX, hipY, pose.frontThighAngle, thighLen);
  const frontFoot = joint(frontKnee.x, frontKnee.y, pose.frontShinAngle, shinLen);

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (!isGhost) {
    const shadowScale = isDefeated ? 1.55 : Math.max(0.32, 1 + pose.yOffset / 95);
    ctx.fillStyle = "rgba(0, 0, 0, 0.44)";
    ctx.beginPath();
    ctx.ellipse(
      isDefeated ? (hipX + shoulderX) * 0.5 : hipX,
      groundY + 2,
      21 * shadowScale,
      4.5,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  // Intense power aura + crackling lightning arcs
  if (!isGhost && pose.auraAlpha && pose.auraAlpha > 0.05) {
    const cx = (hipX + shoulderX) * 0.5;
    const cy = (hipY + headY) * 0.5;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = pose.auraAlpha;
    const auraGrad = ctx.createRadialGradient(cx, cy, 6, cx, cy, 66);
    auraGrad.addColorStop(0, "#FFFFFF");
    auraGrad.addColorStop(0.28, glowColor);
    auraGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 66, 0, Math.PI * 2);
    ctx.fill();

    if (pose.crackling) {
      for (let b = 0; b < 3; b++) {
        const a1 = Math.random() * Math.PI * 2;
        const a2 = a1 + (Math.random() - 0.5) * 1.4;
        const r1 = 18 + Math.random() * 14;
        const r2 = 34 + Math.random() * 22;
        const pts = generateBolt(
          cx + Math.cos(a1) * r1,
          cy + Math.sin(a1) * r1,
          cx + Math.cos(a2) * r2,
          cy + Math.sin(a2) * r2,
          14,
          4
        );
        ctx.strokeStyle = b === 0 ? "#FFFFFF" : glowColor;
        ctx.lineWidth = b === 0 ? 1.8 : 2.2;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Back limbs
  ctx.strokeStyle = bodyColor;
  ctx.globalAlpha = ghostAlpha * (isDefeated ? 0.48 : 0.72);
  ctx.lineWidth = 4.6;
  ctx.beginPath();
  ctx.moveTo(shoulderX, shoulderY);
  ctx.lineTo(backElbow.x, backElbow.y);
  ctx.lineTo(backHand.x, backHand.y);
  ctx.moveTo(hipX, hipY);
  ctx.lineTo(backKnee.x, backKnee.y);
  ctx.lineTo(backFoot.x, backFoot.y);
  ctx.stroke();

  // Front limbs + torso
  ctx.globalAlpha = ghostAlpha * (isDefeated ? 0.65 : 1);
  ctx.shadowColor = bodyGlow;
  ctx.shadowBlur = isGhost || isDefeated ? 0 : pose.victory ? 18 : 12;
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 5.6;

  ctx.beginPath();
  ctx.moveTo(hipX, hipY);
  ctx.lineTo(shoulderX, shoulderY);
  ctx.lineTo(neckX, neckY);
  ctx.moveTo(hipX, hipY);
  ctx.lineTo(frontKnee.x, frontKnee.y);
  ctx.lineTo(frontFoot.x, frontFoot.y);
  ctx.moveTo(shoulderX, shoulderY);
  ctx.lineTo(frontElbow.x, frontElbow.y);
  ctx.lineTo(frontHand.x, frontHand.y);
  ctx.stroke();

  // Glowing anime energy katana / saber held in front hand
  if (pose.blade && pose.blade.length > 0 && !isDefeated) {
    const bladeAngle = pose.frontForearmAngle + (pose.blade.angleOffset ?? 0.35);
    const tip = joint(frontHand.x, frontHand.y, bladeAngle, pose.blade.length);
    const bColor = pose.blade.color || glowColor;

    ctx.save();
    ctx.globalAlpha = ghostAlpha;
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = bColor;
    ctx.shadowBlur = isGhost ? 4 : 18;
    ctx.strokeStyle = bColor;
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(frontHand.x, frontHand.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();

    if (!isGhost) {
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(frontHand.x, frontHand.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Motion slash arc (drawn behind head so face photos stay unobstructed)
  if (!isGhost && pose.slashArc && pose.slashArc.alpha > 0.05) {
    ctx.save();
    ctx.globalAlpha = pose.slashArc.alpha;
    ctx.strokeStyle = "#FFFFFF";
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 18;
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.arc(
      centerX + pose.slashArc.x,
      groundY + pose.slashArc.y,
      pose.slashArc.radius,
      pose.slashArc.startAngle,
      pose.slashArc.endAngle
    );
    ctx.stroke();
    ctx.restore();
  }

  if (isGhost) {
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(headX, headY, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Fluttering headband tails
  const waveSpeed = pose.victory ? 20 : 15;
  const wave1 = isDefeated ? 3 : Math.sin(timeSec * waveSpeed + (tag === "A" ? 0 : 2)) * 5.5;
  const wave2 = isDefeated ? 5 : Math.cos(timeSec * (waveSpeed - 3) + (tag === "A" ? 1 : 3)) * 7;
  const tailBaseX = headX - facing * headR;
  const tailBaseY = headY - (isDefeated ? -4 : 4);
  ctx.strokeStyle = bodyGlow;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(tailBaseX, tailBaseY);
  ctx.quadraticCurveTo(
    tailBaseX - facing * 12,
    tailBaseY - 2 + wave1,
    tailBaseX - facing * 25,
    tailBaseY + 2 + wave2
  );
  ctx.moveTo(tailBaseX, tailBaseY + 2);
  ctx.quadraticCurveTo(
    tailBaseX - facing * 10,
    tailBaseY + 4 + wave2 * 0.6,
    tailBaseX - facing * 21,
    tailBaseY + 7 + wave1
  );
  ctx.stroke();

  // Head circle: uploaded photo OR A/B emblem
  ctx.save();
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(headX, headY, headR, 0, Math.PI * 2);
  ctx.clip();

  if (hasLoadedPhoto && faceImage) {
    ctx.fillStyle = "#181E2E";
    ctx.fillRect(headX - headR, headY - headR, headR * 2, headR * 2);

    ctx.save();
    ctx.translate(headX, headY);
    // Keep uploaded face photo largely upright and readable during fast acrobatic combat
    const subtlePhotoTilt = Math.max(-0.16, Math.min(0.16, Math.sin(headAngle) * 0.14));
    ctx.rotate(subtlePhotoTilt);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    if (isDefeated && "filter" in ctx) {
      ctx.filter = "grayscale(100%) brightness(0.78)";
    }
    const diameter = headR * 2;
    const scale = Math.max(diameter / faceImage.naturalWidth, diameter / faceImage.naturalHeight);
    const drawW = faceImage.naturalWidth * scale;
    const drawH = faceImage.naturalHeight * scale;
    ctx.drawImage(faceImage, -drawW / 2, -drawH / 2, drawW, drawH);
    if ("filter" in ctx) {
      ctx.filter = "none";
    }
    ctx.restore();

    if (isDefeated) {
      ctx.fillStyle = "rgba(18, 21, 31, 0.24)";
      ctx.fillRect(headX - headR, headY - headR, headR * 2, headR * 2);
    }
  } else {
    const headGrad = ctx.createRadialGradient(
      headX - facing * 4,
      headY - 5,
      2,
      headX,
      headY,
      headR
    );
    if (isDefeated) {
      headGrad.addColorStop(0, "#383D4C");
      headGrad.addColorStop(1, "#181B24");
    } else if (tag === "A") {
      headGrad.addColorStop(0, "#2B4C8E");
      headGrad.addColorStop(1, "#131B31");
    } else {
      headGrad.addColorStop(0, "#87322E");
      headGrad.addColorStop(1, "#271419");
    }
    ctx.fillStyle = headGrad;
    ctx.fillRect(headX - headR, headY - headR, headR * 2, headR * 2);

    ctx.save();
    ctx.translate(headX, headY);
    ctx.rotate(Math.sin(headAngle) * 0.42);
    ctx.font = '800 18px "JetBrains Mono", ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = isDefeated ? "#8E95A8" : "#FFFFFF";
    ctx.shadowColor = bodyGlow;
    ctx.shadowBlur = isDefeated ? 0 : 8;
    ctx.fillText(tag, 0, 1);
    ctx.restore();
  }
  ctx.restore();

  // Crisp inner white highlight rim for photo heads so glow never washes out the photo edge
  if (hasLoadedPhoto) {
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = isDefeated ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.88)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(headX, headY, headR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Head outer border ring
  ctx.strokeStyle = bodyColor;
  ctx.shadowColor = bodyGlow;
  ctx.shadowBlur = isDefeated ? 0 : pose.victory ? 18 : 10;
  ctx.lineWidth = pose.victory ? 3.8 : 3;
  ctx.beginPath();
  ctx.arc(headX, headY, hasLoadedPhoto ? headR + 1.6 : headR, 0, Math.PI * 2);
  ctx.stroke();

  // K.O. badge above defeated fighter
  if (isDefeated) {
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.font = '900 12px "JetBrains Mono", sans-serif';
    ctx.fillStyle = "#9BA3B8";
    ctx.textAlign = "center";
    const drift = Math.sin(timeSec * 8) * 3;
    ctx.fillText("K.O.", headX + drift, headY - headR - 12);
    ctx.restore();
  }

  ctx.restore();
}

interface AnimeDuelFrame {
  poseA: Pose;
  poseB: Pose;
  clashPoint: Vec2 | null;
  ghostA: boolean;
  ghostB: boolean;
  warpLines: { x1: number; y1: number; x2: number; y2: number; color: string }[];
  energyBeam: { x1: number; y1: number; x2: number; y2: number; width: number; color: string } | null;
  speedLinesAlpha: number;
  crossSlashNow: boolean;
}

function getChoreographedPoses(
  cycleTime: number,
  intense: boolean
): AnimeDuelFrame {
  // 5.10-second hybrid Japanese anime martial-arts + energy blade combat cycle
  const duration = 5.1;
  const t = ((cycleTime % duration) + duration) % duration;

  // Phase 0: 0.00 - 0.56s -> Explosive sprint & heavy BARE-FIST TO FIST mid-air shockwave collision!
  if (t < 0.56) {
    const p = easeInOut(t / 0.56);
    const approach = lerp(-142, -20, p);
    const jump = Math.sin(p * Math.PI) * 24;
    const clashNow = t > 0.38 && t < 0.54;
    return {
      poseA: {
        xOffset: approach,
        yOffset: -jump,
        lean: lerp(0.52, 0.58, p),
        headTilt: 0.14,
        frontArmAngle: lerp(0.75, 1.62, p),
        frontForearmAngle: lerp(1.9, 1.56, p),
        backArmAngle: -0.95,
        backForearmAngle: -0.35,
        frontThighAngle: 0.88,
        frontShinAngle: -0.35,
        backThighAngle: -0.9,
        backShinAngle: -1.4,
        auraAlpha: 0.5,
        slashArc: clashNow
          ? { x: approach + 30, y: -72 - jump * 0.5, radius: 34, startAngle: -1.0, endAngle: 0.9, alpha: 0.92 }
          : undefined,
      },
      poseB: {
        xOffset: -approach,
        yOffset: -jump,
        lean: lerp(-0.52, -0.58, p),
        headTilt: -0.14,
        frontArmAngle: lerp(0.75, 1.62, p),
        frontForearmAngle: lerp(1.9, 1.56, p),
        backArmAngle: -0.95,
        backForearmAngle: -0.35,
        frontThighAngle: 0.88,
        frontShinAngle: -0.35,
        backThighAngle: -0.9,
        backShinAngle: -1.4,
        auraAlpha: 0.5,
        slashArc: clashNow
          ? {
              x: -approach - 30,
              y: -72 - jump * 0.5,
              radius: 34,
              startAngle: Math.PI - 0.9,
              endAngle: Math.PI + 1.0,
              alpha: 0.92,
            }
          : undefined,
      },
      clashPoint: clashNow ? { x: 0, y: -74 } : null,
      ghostA: p > 0.2,
      ghostB: p > 0.2,
      warpLines: [],
      energyBeam: null,
      speedLinesAlpha: clashNow ? 0.36 : 0,
      crossSlashNow: false,
    };
  }

  // Phase 1: 0.56 - 1.48s -> Anime Martial Arts Blitz (Ora-Ora punch barrage + Spinning Roundhouse + B's Flying Dropkick!)
  if (t < 1.48) {
    const p = (t - 0.56) / 0.92;
    if (p < 0.52) {
      // A unleashes hyper-speed fist barrage ending with a spinning high kick
      const sub = p / 0.52;
      const punchWave = Math.sin(sub * Math.PI * 5);
      const highKick = sub > 0.72;
      const strikePeak = Math.abs(punchWave) > 0.65 || highKick;
      const xA = lerp(-20, -10, sub);
      const xB = lerp(20, 72, easeInOut(sub));
      return {
        poseA: {
          xOffset: xA,
          yOffset: highKick ? -18 * Math.sin(((sub - 0.72) / 0.28) * Math.PI) : 0,
          lean: highKick ? -0.25 : 0.48,
          headTilt: 0.1,
          frontArmAngle: highKick ? -0.45 : punchWave > 0 ? 1.66 : 0.68,
          frontForearmAngle: highKick ? 0.5 : punchWave > 0 ? 1.56 : 2.38,
          backArmAngle: punchWave <= 0 ? 1.64 : -0.65,
          backForearmAngle: punchWave <= 0 ? 1.56 : 0.45,
          frontThighAngle: highKick ? 1.82 : 0.65,
          frontShinAngle: highKick ? 1.76 : -0.05,
          backThighAngle: -0.75,
          backShinAngle: -0.95,
          auraAlpha: 0.65,
          slashArc: strikePeak
            ? {
                x: xA + 36,
                y: highKick ? -58 : -70,
                radius: highKick ? 38 : 26,
                startAngle: -0.9,
                endAngle: 0.9,
                alpha: 0.9,
              }
            : undefined,
        },
        poseB: {
          xOffset: xB,
          yOffset: highKick ? -8 : 0,
          lean: highKick ? 0.38 : 0.22,
          headTilt: -0.18,
          frontArmAngle: 1.1,
          frontForearmAngle: 2.75,
          backArmAngle: 0.85,
          backForearmAngle: 2.45,
          frontThighAngle: 0.42,
          frontShinAngle: -0.1,
          backThighAngle: -0.68,
          backShinAngle: -0.88,
        },
        clashPoint: strikePeak ? { x: (xA + xB) * 0.5 + 4, y: highKick ? -60 : -70 } : null,
        ghostA: true,
        ghostB: highKick,
        warpLines: [],
        energyBeam: null,
        speedLinesAlpha: highKick ? 0.4 : 0.18,
        crossSlashNow: false,
      };
    }

    // 0.52 .. 1.0 -> B leaps skyward & blasts A with a soaring Anime Flying Kick!
    const sub = (p - 0.52) / 0.48;
    const jump = Math.sin(sub * Math.PI);
    const kickHit = sub > 0.3 && sub < 0.65;
    const xB = lerp(72, 4, easeInOut(sub));
    const xA = sub < 0.32 ? -10 : lerp(-10, -104, easeInOut((sub - 0.32) / 0.68));
    const aSky = sub > 0.32 ? Math.sin(((sub - 0.32) / 0.68) * Math.PI) * 34 : 0;
    return {
      poseA: {
        xOffset: xA,
        yOffset: -aSky,
        lean: sub > 0.32 ? -0.58 : 0.12,
        headTilt: -0.25,
        frontArmAngle: 1.25,
        frontForearmAngle: 2.6,
        backArmAngle: -0.8,
        backForearmAngle: -0.35,
        frontThighAngle: 0.5,
        frontShinAngle: -0.25,
        backThighAngle: -0.68,
        backShinAngle: -0.95,
      },
      poseB: {
        xOffset: xB,
        yOffset: -jump * 52,
        lean: 0.52,
        headTilt: -0.14,
        frontArmAngle: -0.65,
        frontForearmAngle: 0.35,
        backArmAngle: 0.85,
        backForearmAngle: 1.75,
        frontThighAngle: lerp(0.55, 1.88, jump),
        frontShinAngle: lerp(-0.2, 1.84, jump),
        backThighAngle: -0.55,
        backShinAngle: -1.55,
        auraAlpha: 0.78,
        slashArc: kickHit
          ? {
              x: xB - 32,
              y: -52 - jump * 42,
              radius: 40,
              startAngle: Math.PI - 1.0,
              endAngle: Math.PI + 0.95,
              alpha: 0.95,
            }
          : undefined,
      },
      clashPoint: kickHit ? { x: (xA + xB) * 0.5, y: -68 } : null,
      ghostA: sub > 0.34,
      ghostB: true,
      warpLines: [],
      energyBeam: null,
      speedLinesAlpha: kickHit ? 0.42 : 0.15,
      crossSlashNow: false,
    };
  }

  // Phase 2: 1.48 - 2.38s -> High-Altitude Teleport Dogfight (Aerial Axe-Kick + Energy Blade Parry & Clash!)
  if (t < 2.38) {
    const sub = t - 1.48; // 0 .. 0.90
    const blinkIdx = sub < 0.3 ? 0 : sub < 0.6 ? 1 : 2;
    const localP = (sub % 0.3) / 0.3;
    const isFreshBlink = localP < 0.35;
    const strikeMoment = localP > 0.28 && localP < 0.78;

    const spots = [
      { ax: -108, ay: -68, bx: -54, by: -60, prevAx: -96, prevAy: -18, prevBx: 6, prevBy: -18 },
      { ax: 54, ay: -64, bx: 108, by: -72, prevAx: -108, prevAy: -68, prevBx: -54, prevBy: -60 },
      { ax: -22, ay: -72, bx: 22, by: -72, prevAx: 54, prevAy: -64, prevBx: 108, prevBy: -72 },
    ];
    const s = spots[blinkIdx];
    const spin = Math.sin(localP * Math.PI) * 0.8;

    // Blink 0: A throws fierce aerial axe-kick (no blade), B blocks with fist/forearm!
    // Blink 1 & 2: Energy blades ignite for rapid mid-air blade clash!
    const useBlades = blinkIdx >= 1;

    return {
      poseA: {
        xOffset: s.ax + localP * 10,
        yOffset: s.ay + Math.sin(localP * Math.PI) * -6,
        lean: 0.44 + spin * 0.25,
        headTilt: 0.12,
        frontArmAngle: useBlades ? 1.5 + spin : 1.1,
        frontForearmAngle: useBlades ? 1.65 + spin * 0.5 : 2.3,
        backArmAngle: -0.7,
        backForearmAngle: -0.2,
        frontThighAngle: blinkIdx === 0 ? 1.84 : 0.78,
        frontShinAngle: blinkIdx === 0 ? 1.74 : -0.5,
        backThighAngle: -0.65,
        backShinAngle: -1.15,
        auraAlpha: 0.75,
        crackling: intense,
        blade: useBlades ? { length: 42, angleOffset: -0.4 } : undefined,
        slashArc: strikeMoment
          ? {
              x: (s.ax + s.bx) * 0.5,
              y: s.ay - 48,
              radius: 36,
              startAngle: -1.2 + blinkIdx * 0.5,
              endAngle: 1.0 + blinkIdx * 0.5,
              alpha: 0.92,
            }
          : undefined,
      },
      poseB: {
        xOffset: s.bx - localP * 10,
        yOffset: s.by + Math.sin(localP * Math.PI) * -6,
        lean: -0.44 - spin * 0.25,
        headTilt: -0.12,
        frontArmAngle: useBlades ? 1.45 - spin * 0.7 : 1.15,
        frontForearmAngle: useBlades ? 1.6 - spin * 0.4 : 2.65,
        backArmAngle: -0.7,
        backForearmAngle: -0.2,
        frontThighAngle: 0.78,
        frontShinAngle: -0.5,
        backThighAngle: -0.65,
        backShinAngle: -1.15,
        auraAlpha: 0.75,
        crackling: intense,
        blade: useBlades ? { length: 42, angleOffset: -0.4 } : undefined,
        slashArc:
          strikeMoment && useBlades
            ? {
                x: (s.ax + s.bx) * 0.5,
                y: s.by - 48,
                radius: 36,
                startAngle: Math.PI - 1.1,
                endAngle: Math.PI + 1.1,
                alpha: 0.92,
              }
            : undefined,
      },
      clashPoint: strikeMoment ? { x: (s.ax + s.bx) * 0.5, y: s.ay - 52 } : null,
      ghostA: true,
      ghostB: true,
      warpLines: isFreshBlink
        ? [
            { x1: s.prevAx, y1: s.prevAy - 60, x2: s.ax, y2: s.ay - 60, color: "#6BA4FF" },
            { x1: s.prevBx, y1: s.prevBy - 60, x2: s.bx, y2: s.by - 60, color: "#FF8A75" },
          ]
        : [],
      energyBeam: null,
      speedLinesAlpha: strikeMoment ? 0.42 : 0.15,
      crossSlashNow: false,
    };
  }

  // Phase 3: 2.38 - 3.24s -> Meteor Hammer-Fist Slam + Energy Wave Fired & Blade-Deflected!
  if (t < 3.24) {
    const p = (t - 2.38) / 0.86;
    if (p < 0.38) {
      const d = easeInOut(p / 0.38);
      const diveY = lerp(-72, 0, d);
      const impact = p > 0.24 && p < 0.36;
      return {
        poseA: {
          xOffset: lerp(-22, -45, d),
          yOffset: diveY,
          lean: 0.65,
          headTilt: 0.1,
          frontArmAngle: lerp(2.2, 0.75, d), // heavy downward hammer-fist smash!
          frontForearmAngle: lerp(2.4, 0.85, d),
          backArmAngle: -0.9,
          backForearmAngle: -0.2,
          frontThighAngle: 1.5,
          frontShinAngle: 1.25,
          backThighAngle: -0.65,
          backShinAngle: -1.25,
          auraAlpha: 0.8,
          slashArc: impact
            ? { x: -10, y: -35, radius: 42, startAngle: -0.7, endAngle: 1.4, alpha: 0.95 }
            : undefined,
        },
        poseB: {
          xOffset: lerp(22, 118, d),
          yOffset: lerp(-72, 0, d),
          lean: 0.32,
          headTilt: -0.2,
          frontArmAngle: 1.1,
          frontForearmAngle: 2.5,
          backArmAngle: -0.5,
          backForearmAngle: 0.2,
          frontThighAngle: 0.65,
          frontShinAngle: -0.1,
          backThighAngle: -0.7,
          backShinAngle: -1.0,
        },
        clashPoint: impact ? { x: 18, y: -26 } : null,
        ghostA: true,
        ghostB: true,
        warpLines: [],
        energyBeam: null,
        speedLinesAlpha: impact ? 0.38 : 0,
        crossSlashNow: false,
      };
    }

    const bp = (p - 0.38) / 0.62;
    const xA = lerp(-45, -120, Math.min(1, bp * 2.1));
    const xB = 124;
    const beamProgress = clamp01(bp * 1.45);
    const beamTipX = lerp(95, -92, beamProgress);
    const deflecting = bp > 0.32 && bp < 0.85;
    return {
      poseA: {
        xOffset: xA,
        yOffset: deflecting ? -8 : 0,
        lean: deflecting ? 0.38 : -0.15,
        headTilt: 0.08,
        frontArmAngle: deflecting ? lerp(2.1, 0.7, (bp - 0.32) / 0.53) : 0.8,
        frontForearmAngle: deflecting ? lerp(2.2, 0.85, (bp - 0.32) / 0.53) : 2.1,
        backArmAngle: -0.4,
        backForearmAngle: 1.2,
        frontThighAngle: 0.82,
        frontShinAngle: -0.2,
        backThighAngle: -0.82,
        backShinAngle: -1.15,
        auraAlpha: 0.85,
        crackling: deflecting,
        blade: { length: 48, angleOffset: -0.25 },
        slashArc: deflecting
          ? { x: xA + 32, y: -64, radius: 42, startAngle: -1.25, endAngle: 1.25, alpha: 0.96 }
          : undefined,
      },
      poseB: {
        xOffset: xB,
        yOffset: 2,
        lean: -0.28,
        headTilt: -0.08,
        frontArmAngle: 1.56,
        frontForearmAngle: 1.56,
        backArmAngle: 1.42,
        backForearmAngle: 1.58,
        frontThighAngle: 0.78,
        frontShinAngle: -0.2,
        backThighAngle: -0.78,
        backShinAngle: -1.1,
        auraAlpha: 0.9,
        crackling: true,
      },
      clashPoint: deflecting ? { x: xA + 34, y: -64 } : null,
      ghostA: bp < 0.45,
      ghostB: false,
      warpLines: [],
      energyBeam:
        bp < 0.88
          ? {
              x1: 96,
              y1: -64,
              x2: beamTipX,
              y2: -64,
              width: bp > 0.6 ? lerp(11, 2, (bp - 0.6) / 0.28) : 11,
              color: "#FF6B57",
            }
          : null,
      speedLinesAlpha: deflecting ? 0.45 : 0.15,
      crossSlashNow: false,
    };
  }

  // Phase 4: 3.24 - 4.08s -> Blazing Iaido Cross-Cut Dash-Through (교차 참격!)
  if (t < 4.08) {
    const p = (t - 3.24) / 0.84;
    if (p < 0.28) {
      return {
        poseA: {
          xOffset: -124,
          yOffset: 8,
          lean: 0.68,
          headTilt: 0.15,
          frontArmAngle: -0.4,
          frontForearmAngle: 0.5,
          backArmAngle: -1.0,
          backForearmAngle: -0.4,
          frontThighAngle: 0.95,
          frontShinAngle: -0.35,
          backThighAngle: -0.95,
          backShinAngle: -1.45,
          auraAlpha: 0.95,
          crackling: true,
          blade: { length: 44, angleOffset: 0.9 },
        },
        poseB: {
          xOffset: 124,
          yOffset: 8,
          lean: -0.68,
          headTilt: -0.15,
          frontArmAngle: -0.4,
          frontForearmAngle: 0.5,
          backArmAngle: -1.0,
          backForearmAngle: -0.4,
          frontThighAngle: 0.95,
          frontShinAngle: -0.35,
          backThighAngle: -0.95,
          backShinAngle: -1.45,
          auraAlpha: 0.95,
          crackling: true,
          blade: { length: 44, angleOffset: 0.9 },
        },
        clashPoint: null,
        ghostA: false,
        ghostB: false,
        warpLines: [],
        energyBeam: null,
        speedLinesAlpha: 0.25,
        crossSlashNow: false,
      };
    }

    if (p < 0.6) {
      const dp = easeInOut((p - 0.28) / 0.32);
      const xA = lerp(-124, 118, dp);
      const xB = lerp(124, -118, dp);
      const midPass = dp > 0.36 && dp < 0.68;
      return {
        poseA: {
          xOffset: xA,
          yOffset: -14 * Math.sin(dp * Math.PI),
          lean: 0.72,
          headTilt: 0.12,
          frontArmAngle: 1.7,
          frontForearmAngle: 1.6,
          backArmAngle: -0.9,
          backForearmAngle: -0.3,
          frontThighAngle: 0.95,
          frontShinAngle: -0.35,
          backThighAngle: -0.95,
          backShinAngle: -1.45,
          auraAlpha: 1,
          blade: { length: 50, angleOffset: -0.3 },
          slashArc: midPass
            ? { x: 0, y: -66, radius: 52, startAngle: -1.2, endAngle: 1.2, alpha: 1 }
            : undefined,
        },
        poseB: {
          xOffset: xB,
          yOffset: -14 * Math.sin(dp * Math.PI),
          lean: -0.72,
          headTilt: -0.12,
          frontArmAngle: 1.7,
          frontForearmAngle: 1.6,
          backArmAngle: -0.9,
          backForearmAngle: -0.3,
          frontThighAngle: 0.95,
          frontShinAngle: -0.35,
          backThighAngle: -0.95,
          backShinAngle: -1.45,
          auraAlpha: 1,
          blade: { length: 50, angleOffset: -0.3 },
          slashArc: midPass
            ? { x: 0, y: -66, radius: 52, startAngle: Math.PI - 1.2, endAngle: Math.PI + 1.2, alpha: 1 }
            : undefined,
        },
        clashPoint: midPass ? { x: 0, y: -66 } : null,
        ghostA: true,
        ghostB: true,
        warpLines: midPass
          ? [
              { x1: -124, y1: -64, x2: 118, y2: -64, color: "#6BA4FF" },
              { x1: 124, y1: -64, x2: -118, y2: -64, color: "#FF8A75" },
            ]
          : [],
        energyBeam: null,
        speedLinesAlpha: 0.65,
        crossSlashNow: dp >= 0.42 && dp <= 0.56,
      };
    }

    const pauseP = (p - 0.6) / 0.4;
    const delayedBurst = pauseP > 0.1 && pauseP < 0.45;
    return {
      poseA: {
        xOffset: 118,
        yOffset: 0,
        lean: 0.25,
        headTilt: 0.06,
        frontArmAngle: 0.5,
        frontForearmAngle: 1.1,
        backArmAngle: -0.6,
        backForearmAngle: -0.1,
        frontThighAngle: 0.68,
        frontShinAngle: -0.15,
        backThighAngle: -0.72,
        backShinAngle: -1.0,
        auraAlpha: 0.65,
        blade: { length: 42, angleOffset: 0.4 },
      },
      poseB: {
        xOffset: -118,
        yOffset: 0,
        lean: -0.25,
        headTilt: -0.06,
        frontArmAngle: 0.5,
        frontForearmAngle: 1.1,
        backArmAngle: -0.6,
        backForearmAngle: -0.1,
        frontThighAngle: 0.68,
        frontShinAngle: -0.15,
        backThighAngle: -0.72,
        backShinAngle: -1.0,
        auraAlpha: 0.65,
        blade: { length: 42, angleOffset: 0.4 },
      },
      clashPoint: delayedBurst ? { x: 0, y: -66 } : null,
      ghostA: false,
      ghostB: false,
      warpLines: [],
      energyBeam: null,
      speedLinesAlpha: delayedBurst ? 0.5 : 0,
      crossSlashNow: false,
    };
  }

  // Phase 5: 4.08 - 4.72s -> Wall-to-Wall Ricochet Flying Knee & Fist/Kick Blitz!
  if (t < 4.72) {
    const p = (t - 4.08) / 0.64;
    const bounceWave = Math.cos(p * Math.PI * 3);
    const xA = bounceWave * 116;
    const xB = -bounceWave * 116;
    const arcY = -18 - Math.abs(Math.sin(p * Math.PI * 3)) * 52;
    const nearCenter = Math.abs(xA) < 34;
    const dirA = Math.sin(p * Math.PI * 3) >= 0 ? -1 : 1;
    const useKick = Math.floor(p * 3) !== 1; // intersections 0 & 2 = flying kicks/punches, intersection 1 = sword cross!

    return {
      poseA: {
        xOffset: xA,
        yOffset: arcY,
        lean: dirA * 0.58,
        headTilt: dirA * 0.1,
        frontArmAngle: 1.62,
        frontForearmAngle: 1.56,
        backArmAngle: -0.8,
        backForearmAngle: -0.3,
        frontThighAngle: useKick ? 1.85 : 0.9,
        frontShinAngle: useKick ? 1.75 : -0.35,
        backThighAngle: -0.7,
        backShinAngle: -1.35,
        auraAlpha: 0.82,
        crackling: true,
        blade: useKick ? undefined : { length: 40, angleOffset: -0.35 },
        slashArc: nearCenter
          ? { x: 0, y: arcY - 56, radius: 40, startAngle: -1.1, endAngle: 1.1, alpha: 0.92 }
          : undefined,
      },
      poseB: {
        xOffset: xB,
        yOffset: arcY,
        lean: -dirA * 0.58,
        headTilt: -dirA * 0.1,
        frontArmAngle: 1.62,
        frontForearmAngle: 1.56,
        backArmAngle: -0.8,
        backForearmAngle: -0.3,
        frontThighAngle: useKick ? 1.85 : 0.9,
        frontShinAngle: useKick ? 1.75 : -0.35,
        backThighAngle: -0.7,
        backShinAngle: -1.35,
        auraAlpha: 0.82,
        crackling: true,
        blade: useKick ? undefined : { length: 40, angleOffset: -0.35 },
        slashArc: nearCenter
          ? {
              x: 0,
              y: arcY - 56,
              radius: 40,
              startAngle: Math.PI - 1.1,
              endAngle: Math.PI + 1.1,
              alpha: 0.92,
            }
          : undefined,
      },
      clashPoint: nearCenter ? { x: 0, y: arcY - 56 } : null,
      ghostA: true,
      ghostB: true,
      warpLines: [],
      energyBeam: null,
      speedLinesAlpha: nearCenter ? 0.55 : 0.2,
      crossSlashNow: false,
    };
  }

  // Phase 6: 4.72 - 5.10s -> Explosive 360° Aerial Backflip Repulsion Landings!
  const reb = easeInOut((t - 4.72) / 0.38);
  const xA = lerp(-116, -142, reb);
  const xB = lerp(116, 142, reb);
  const hop = Math.sin(reb * Math.PI) * 44;
  return {
    poseA: {
      xOffset: xA,
      yOffset: -hop,
      lean: lerp(0, -Math.PI * 2, reb) + 0.32,
      headTilt: 0,
      frontArmAngle: 0.85,
      frontForearmAngle: 2.25,
      backArmAngle: -0.45,
      backForearmAngle: 1.35,
      frontThighAngle: 0.72,
      frontShinAngle: -0.65,
      backThighAngle: -0.68,
      backShinAngle: -1.15,
      auraAlpha: 0.55 * (1 - reb * 0.5),
    },
    poseB: {
      xOffset: xB,
      yOffset: -hop,
      lean: lerp(0, Math.PI * 2, reb) - 0.32,
      headTilt: 0,
      frontArmAngle: 0.85,
      frontForearmAngle: 2.25,
      backArmAngle: -0.45,
      backForearmAngle: 1.35,
      frontThighAngle: 0.72,
      frontShinAngle: -0.65,
      backThighAngle: -0.68,
      backShinAngle: -1.15,
      auraAlpha: 0.55 * (1 - reb * 0.5),
    },
    clashPoint: null,
    ghostA: reb < 0.8,
    ghostB: reb < 0.8,
    warpLines: [],
    energyBeam: null,
    speedLinesAlpha: 0,
    crossSlashNow: false,
  };
}

function getFinisherPoses(
  winner: "A" | "B" | "TIE",
  finisherSec: number
): {
  poseA: Pose;
  poseB: Pose;
  impactFrameAlpha: number;
  impactPoint: Vec2 | null;
  triggerStrikeVfx: boolean;
  triggerCraterVfx: boolean;
  craterPoint: Vec2 | null;
  ghostA: boolean;
  ghostB: boolean;
  finishStampAlpha: number;
  dimArenaAlpha: number;
} {
  // ~1.45s cinematic anime finisher with hit-stop impact frame + floor crater slam
  const t = Math.min(1.5, finisherSec);

  if (winner === "TIE") {
    if (t < 0.26) {
      const p = easeInOut(t / 0.26);
      return {
        poseA: {
          xOffset: lerp(-80, -120, p),
          yOffset: 6,
          lean: 0.5,
          headTilt: 0.1,
          frontArmAngle: 0.55,
          frontForearmAngle: 2.2,
          backArmAngle: -0.9,
          backForearmAngle: -0.3,
          frontThighAngle: 0.88,
          frontShinAngle: -0.35,
          backThighAngle: -0.9,
          backShinAngle: -1.35,
          auraAlpha: 0.95 * p,
          crackling: true,
        },
        poseB: {
          xOffset: lerp(80, 120, p),
          yOffset: 6,
          lean: -0.5,
          headTilt: -0.1,
          frontArmAngle: 0.55,
          frontForearmAngle: 2.2,
          backArmAngle: -0.9,
          backForearmAngle: -0.3,
          frontThighAngle: 0.88,
          frontShinAngle: -0.35,
          backThighAngle: -0.9,
          backShinAngle: -1.35,
          auraAlpha: 0.95 * p,
          crackling: true,
        },
        impactFrameAlpha: 0,
        impactPoint: null,
        triggerStrikeVfx: false,
        triggerCraterVfx: false,
        craterPoint: null,
        ghostA: false,
        ghostB: false,
        finishStampAlpha: 0,
        dimArenaAlpha: 0.28 * p,
      };
    }

    if (t < 0.54) {
      const inHitStop = t >= 0.36 && t <= 0.46;
      const p = inHitStop
        ? (0.36 - 0.26) / 0.28
        : t < 0.36
        ? (t - 0.26) / 0.28
        : (t - 0.26 - 0.1) / 0.18;
      const clampedP = clamp01(p);
      const x = lerp(-120, -14, easeInOut(clampedP));
      return {
        poseA: {
          xOffset: x,
          yOffset: -Math.sin(clampedP * Math.PI) * 32,
          lean: 0.62,
          headTilt: 0.15,
          frontArmAngle: 1.72,
          frontForearmAngle: 1.58,
          backArmAngle: -0.95,
          backForearmAngle: -0.4,
          frontThighAngle: 0.94,
          frontShinAngle: -0.35,
          backThighAngle: -0.98,
          backShinAngle: -1.45,
          auraAlpha: 1,
          crackling: true,
          slashArc:
            t >= 0.33
              ? { x: 0, y: -76, radius: 52, startAngle: -1.25, endAngle: 1.25, alpha: 1 }
              : undefined,
        },
        poseB: {
          xOffset: -x,
          yOffset: -Math.sin(clampedP * Math.PI) * 32,
          lean: -0.62,
          headTilt: -0.15,
          frontArmAngle: 1.72,
          frontForearmAngle: 1.58,
          backArmAngle: -0.95,
          backForearmAngle: -0.4,
          frontThighAngle: 0.94,
          frontShinAngle: -0.35,
          backThighAngle: -0.98,
          backShinAngle: -1.45,
          auraAlpha: 1,
          crackling: true,
          slashArc:
            t >= 0.33
              ? {
                  x: 0,
                  y: -76,
                  radius: 52,
                  startAngle: Math.PI - 1.25,
                  endAngle: Math.PI + 1.25,
                  alpha: 1,
                }
              : undefined,
        },
        impactFrameAlpha: inHitStop ? 0.92 : 0,
        impactPoint: { x: 0, y: -76 },
        triggerStrikeVfx: t >= 0.36,
        triggerCraterVfx: false,
        craterPoint: null,
        ghostA: true,
        ghostB: true,
        finishStampAlpha: 0,
        dimArenaAlpha: inHitStop ? 0.85 : 0.35,
      };
    }

    const reb = easeOutBack((t - 0.54) / 0.72);
    const dist = lerp(14, 108, reb);
    return {
      poseA: {
        xOffset: -dist,
        yOffset: 0,
        lean: 0.25,
        headTilt: 0,
        frontArmAngle: 0.95,
        frontForearmAngle: 2.3,
        backArmAngle: -0.3,
        backForearmAngle: 1.35,
        frontThighAngle: 0.6,
        frontShinAngle: -0.15,
        backThighAngle: -0.65,
        backShinAngle: -0.9,
        auraAlpha: 0.65,
        victory: true,
      },
      poseB: {
        xOffset: dist,
        yOffset: 0,
        lean: -0.25,
        headTilt: 0,
        frontArmAngle: 0.95,
        frontForearmAngle: 2.3,
        backArmAngle: -0.3,
        backForearmAngle: 1.35,
        frontThighAngle: 0.6,
        frontShinAngle: -0.15,
        backThighAngle: -0.65,
        backShinAngle: -0.9,
        auraAlpha: 0.65,
        victory: true,
      },
      impactFrameAlpha: 0,
      impactPoint: { x: 0, y: -76 },
      triggerStrikeVfx: true,
      triggerCraterVfx: false,
      craterPoint: null,
      ghostA: t < 0.72,
      ghostB: t < 0.72,
      finishStampAlpha: clamp01((t - 0.68) / 0.22),
      dimArenaAlpha: 0.15,
    };
  }

  // Decisive A or B Anime Execution Finisher!
  const dir = winner === "A" ? 1 : -1;

  let winPose: Pose;
  let losePose: Pose;
  let impactFrameAlpha = 0;
  let impactPoint: Vec2 | null = null;
  let triggerStrikeVfx = false;
  let triggerCraterVfx = false;
  let craterPoint: Vec2 | null = null;
  let ghostWin = false;
  let ghostLose = false;
  let finishStampAlpha = 0;
  let dimArenaAlpha = 0;

  if (t < 0.25) {
    // Stage 1: Lightning awakening crouch
    const p = easeInOut(t / 0.25);
    dimArenaAlpha = 0.38 * p;
    winPose = {
      xOffset: dir * lerp(-85, -124, p),
      yOffset: lerp(0, 10, p),
      lean: dir * 0.62,
      headTilt: dir * 0.14,
      frontArmAngle: -0.65,
      frontForearmAngle: 0.45,
      backArmAngle: -1.15,
      backForearmAngle: -0.65,
      frontThighAngle: 0.96,
      frontShinAngle: -0.38,
      backThighAngle: -0.98,
      backShinAngle: -1.5,
      auraAlpha: 1 * p,
      crackling: true,
    };
    losePose = {
      xOffset: dir * lerp(48, 62, p),
      yOffset: 0,
      lean: dir * 0.15,
      headTilt: dir * -0.12,
      frontArmAngle: 1.1,
      frontForearmAngle: 2.75,
      backArmAngle: 0.85,
      backForearmAngle: 2.55,
      frontThighAngle: 0.48,
      frontShinAngle: -0.05,
      backThighAngle: -0.55,
      backShinAngle: -0.78,
    };
  } else if (t < 0.55) {
    // Stage 2: Warp-blitz strike + 100ms Hit-Stop Impact Frame (0.36s - 0.47s)!
    const inHitStop = t >= 0.36 && t <= 0.47;
    const rawP = inHitStop
      ? (0.36 - 0.25) / 0.19
      : t < 0.36
      ? (t - 0.25) / 0.19
      : 0.58 + ((t - 0.47) / 0.08) * 0.42;
    const p = clamp01(rawP);
    const winX = dir * lerp(-124, 108, easeInOut(p));
    const winJump = Math.sin(p * Math.PI) * 42;
    const hitLaunch = p > 0.5 ? (p - 0.5) / 0.5 : 0;

    impactFrameAlpha = inHitStop ? 0.94 : 0;
    dimArenaAlpha = inHitStop ? 0.88 : 0.42;
    triggerStrikeVfx = t >= 0.35;
    impactPoint = { x: dir * 62, y: -78 };
    ghostWin = true;
    ghostLose = hitLaunch > 0.1;

    winPose = {
      xOffset: winX,
      yOffset: -winJump,
      lean: dir * lerp(0.62, -0.25, p),
      headTilt: dir * 0.12,
      frontArmAngle: lerp(1.5, 2.95, p),
      frontForearmAngle: lerp(1.6, 3.05, p),
      backArmAngle: -0.9,
      backForearmAngle: -0.35,
      frontThighAngle: 0.82,
      frontShinAngle: -0.22,
      backThighAngle: -0.9,
      backShinAngle: -1.3,
      auraAlpha: 1,
      crackling: true,
      slashArc:
        p > 0.3
          ? {
              x: dir * 60,
              y: -80,
              radius: 54,
              startAngle: dir === 1 ? -1.4 : Math.PI - 1.3,
              endAngle: dir === 1 ? 1.3 : Math.PI + 1.4,
              alpha: 1,
            }
          : undefined,
    };

    losePose = {
      xOffset: dir * lerp(62, 105, hitLaunch),
      yOffset: -hitLaunch * 58,
      lean: dir * lerp(0.18, 1.05, hitLaunch),
      headTilt: dir * -0.35,
      frontArmAngle: 0.35,
      frontForearmAngle: 1.15,
      backArmAngle: -0.75,
      backForearmAngle: -0.35,
      frontThighAngle: 0.32,
      frontShinAngle: -0.45,
      backThighAngle: -0.48,
      backShinAngle: -1.15,
    };
  } else {
    // Stage 3: Loser slams violently into ground crater; Winner lands heroically!
    const fall = clamp01((t - 0.55) / 0.24);
    const slammed = t >= 0.78;
    const bounce =
      t >= 0.78 && t < 0.94 ? Math.sin(((t - 0.78) / 0.16) * Math.PI) * 11 : 0;
    const winSettle = easeOutBack((t - 0.55) / 0.34);

    triggerStrikeVfx = true;
    impactPoint = { x: dir * 62, y: -78 };
    triggerCraterVfx = slammed;
    craterPoint = { x: dir * 124, y: 0 };
    dimArenaAlpha = Math.max(0.16, 0.35 - (t - 0.55) * 0.25);
    finishStampAlpha = clamp01((t - 0.82) / 0.2);

    winPose = {
      xOffset: dir * lerp(108, -76, winSettle),
      yOffset: -Math.max(0, 1 - winSettle) * 32,
      lean: dir * -0.1,
      headTilt: 0,
      frontArmAngle: 2.98, // triumphant skyward fist!
      frontForearmAngle: 3.08,
      backArmAngle: -0.48,
      backForearmAngle: -0.18,
      frontThighAngle: 0.48,
      frontShinAngle: -0.08,
      backThighAngle: -0.54,
      backShinAngle: -0.76,
      auraAlpha: 0.82,
      crackling: t < 1.15,
      victory: true,
    };

    losePose = {
      xOffset: dir * lerp(105, 132, fall),
      yOffset: lerp(-58, 38, easeInOut(fall)) - bounce,
      lean: dir * lerp(1.05, Math.PI * 0.53, fall),
      headTilt: dir * -0.2,
      frontArmAngle: 1.5,
      frontForearmAngle: 1.75,
      backArmAngle: 1.25,
      backForearmAngle: 1.65,
      frontThighAngle: 1.48,
      frontShinAngle: 1.56,
      backThighAngle: 1.28,
      backShinAngle: 1.62,
      defeated: fall > 0.45,
    };

    ghostWin = t < 0.7;
    ghostLose = !slammed;
  }

  return winner === "A"
    ? {
        poseA: winPose,
        poseB: losePose,
        impactFrameAlpha,
        impactPoint,
        triggerStrikeVfx,
        triggerCraterVfx,
        craterPoint,
        ghostA: ghostWin,
        ghostB: ghostLose,
        finishStampAlpha,
        dimArenaAlpha,
      }
    : {
        poseA: losePose,
        poseB: winPose,
        impactFrameAlpha,
        impactPoint,
        triggerStrikeVfx,
        triggerCraterVfx,
        craterPoint,
        ghostA: ghostLose,
        ghostB: ghostWin,
        finishStampAlpha,
        dimArenaAlpha,
      };
}

export function StickmanDuelArena({
  labelA,
  labelB,
  imageA = null,
  imageB = null,
  intense = false,
  finisherWinner = null,
  countdownBadge = null,
}: StickmanDuelArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intenseRef = useRef(intense);
  intenseRef.current = intense;

  const finisherWinnerRef = useRef<"A" | "B" | "TIE" | null>(finisherWinner);
  const finisherStartMsRef = useRef<number | null>(null);
  const prevFinisherRef = useRef<"A" | "B" | "TIE" | null>(null);
  const strikeFiredRef = useRef(false);
  const craterFiredRef = useRef(false);

  if (finisherWinner !== prevFinisherRef.current) {
    prevFinisherRef.current = finisherWinner;
    if (finisherWinner) {
      finisherStartMsRef.current = performance.now();
      strikeFiredRef.current = false;
      craterFiredRef.current = false;
    } else {
      finisherStartMsRef.current = null;
      strikeFiredRef.current = false;
      craterFiredRef.current = false;
    }
  }
  finisherWinnerRef.current = finisherWinner;

  const faceImgARef = useRef<HTMLImageElement | null>(null);
  const faceImgBRef = useRef<HTMLImageElement | null>(null);
  const redrawStaticRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!imageA) {
      faceImgARef.current = null;
      redrawStaticRef.current?.();
      return;
    }
    let active = true;
    const img = new Image();
    img.referrerPolicy = "no-referrer";
    img.onload = () => {
      if (active) {
        faceImgARef.current = img;
        redrawStaticRef.current?.();
      }
    };
    img.onerror = () => {
      if (active) faceImgARef.current = null;
    };
    img.src = imageA;
    return () => {
      active = false;
    };
  }, [imageA]);

  useEffect(() => {
    if (!imageB) {
      faceImgBRef.current = null;
      redrawStaticRef.current?.();
      return;
    }
    let active = true;
    const img = new Image();
    img.referrerPolicy = "no-referrer";
    img.onload = () => {
      if (active) {
        faceImgBRef.current = img;
        redrawStaticRef.current?.();
      }
    };
    img.onerror = () => {
      if (active) faceImgBRef.current = null;
    };
    img.src = imageB;
    return () => {
      active = false;
    };
  }, [imageB]);

  useEffect(() => {
    if (finisherWinner) {
      redrawStaticRef.current?.();
    }
  }, [finisherWinner]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = canvas.parentElement?.clientWidth || 640;
    const height = 304;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const syncSize = () => {
      const nextWidth = canvas.parentElement?.clientWidth || 640;
      if (nextWidth <= 0) return;
      width = nextWidth;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      redrawStaticRef.current?.();
    };
    syncSize();
    window.addEventListener("resize", syncSize);
    const resizeObserver =
      typeof ResizeObserver !== "undefined" && canvas.parentElement
        ? new ResizeObserver(() => syncSize())
        : null;
    if (resizeObserver && canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    const particles: ArenaParticle[] = [];
    const clashRings: ClashRing[] = [];
    const slashBeams: SlashBeam[] = [];
    const bolts: LightningBolt[] = [];
    const craters: CraterCrack[] = [];
    let lastClashSpawn = 0;
    let shakePower = 0;

    const startMs = performance.now();
    let cycleSec = 0;
    let prevMs = startMs;
    let rafId = 0;

    const spawnClash = (cx: number, cy: number, boost: boolean, groundY: number) => {
      shakePower = Math.max(shakePower, boost ? 6.0 : 3.4);
      clashRings.push({
        x: cx,
        y: cy,
        radius: 6,
        maxRadius: boost ? 68 : 48,
        alpha: 0.95,
        color: Math.random() > 0.5 ? "#78B0FF" : "#FF8A75",
        lineWidth: boost ? 3 : 2.2,
      });

      const count = boost ? 26 : 16;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (2.8 + Math.random() * 6.5) * (boost ? 1.25 : 1);
        const palette = ["#FFFFFF", "#78B0FF", "#FF8A75", "#FBBF24"];
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.0,
          life: 1,
          size: 1.8 + Math.random() * 2.4,
          color: palette[Math.floor(Math.random() * palette.length)],
          kind: "spark",
        });
      }

      for (let i = 0; i < 4; i++) {
        particles.push({
          x: cx + (Math.random() - 0.5) * 40,
          y: groundY,
          vx: (Math.random() - 0.5) * 3.4,
          vy: -0.6 - Math.random() * 1.4,
          life: 0.75,
          size: 4 + Math.random() * 5,
          color: "#687394",
          kind: "dust",
        });
      }
    };

    const spawnFinisherStrike = (
      cx: number,
      cy: number,
      winner: "A" | "B" | "TIE",
      groundY: number
    ) => {
      shakePower = 15;
      const winColor =
        winner === "A" ? "#6BA4FF" : winner === "B" ? "#FF8A75" : "#FBBF24";

      // Quad concentric shockwaves
      clashRings.push(
        { x: cx, y: cy, radius: 10, maxRadius: 170, alpha: 1, color: "#FFFFFF", lineWidth: 5 },
        { x: cx, y: cy, radius: 14, maxRadius: 132, alpha: 0.98, color: winColor, lineWidth: 3.8 },
        { x: cx, y: cy, radius: 8, maxRadius: 96, alpha: 0.92, color: "#FBBF24", lineWidth: 3 },
        { x: cx, y: cy, radius: 4, maxRadius: 62, alpha: 0.9, color: "#FFFFFF", lineWidth: 2.4 }
      );

      // Triple blazing X-cross + horizontal execution slash beams
      slashBeams.push(
        {
          x1: cx - 190,
          y1: cy + 72,
          x2: cx + 190,
          y2: cy - 92,
          alpha: 1,
          width: 10,
          color: winColor,
        },
        {
          x1: cx - 150,
          y1: cy - 82,
          x2: cx + 160,
          y2: cy + 68,
          alpha: 0.96,
          width: 7,
          color: "#FFFFFF",
        },
        {
          x1: cx - 220,
          y1: cy + 6,
          x2: cx + 220,
          y2: cy - 14,
          alpha: 0.88,
          width: 5.5,
          color: "#FBBF24",
        }
      );

      // Sky-to-impact jagged lightning bolts
      for (let i = 0; i < 4; i++) {
        bolts.push({
          points: generateBolt(
            cx + (Math.random() - 0.5) * 140,
            10,
            cx + (Math.random() - 0.5) * 24,
            groundY,
            32,
            8
          ),
          alpha: 1,
          color: i % 2 === 0 ? "#FFFFFF" : winColor,
          width: i === 0 ? 3.2 : 2.2,
        });
      }

      const palette = ["#FFFFFF", winColor, "#FBBF24", "#FDE68A"];
      for (let i = 0; i < 72; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 4.2 + Math.random() * 11.5;
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.6,
          life: 1.25,
          size: 2.2 + Math.random() * 3,
          color: palette[Math.floor(Math.random() * palette.length)],
          kind: "spark",
        });
      }

      for (let i = 0; i < 12; i++) {
        particles.push({
          x: cx + (Math.random() - 0.5) * 85,
          y: groundY,
          vx: (Math.random() - 0.5) * 6.5,
          vy: -1.2 - Math.random() * 2.6,
          life: 1,
          size: 5 + Math.random() * 6,
          color: "#8893B5",
          kind: "dust",
        });
      }
    };

    const spawnCraterSlam = (cx: number, groundY: number, winner: "A" | "B" | "TIE") => {
      shakePower = Math.max(shakePower, 10);
      const winColor =
        winner === "A" ? "#6BA4FF" : winner === "B" ? "#FF8A75" : "#FBBF24";

      clashRings.push(
        { x: cx, y: groundY, radius: 6, maxRadius: 85, alpha: 0.9, color: winColor, lineWidth: 3 },
        { x: cx, y: groundY, radius: 4, maxRadius: 55, alpha: 0.85, color: "#FFFFFF", lineWidth: 2 }
      );

      // Glowing cracked floor crater
      const branches: Vec2[][] = [
        [
          { x: cx, y: groundY + 2 },
          { x: cx - 22, y: groundY + 7 },
          { x: cx - 48, y: groundY + 4 },
          { x: cx - 68, y: groundY + 12 },
        ],
        [
          { x: cx, y: groundY + 2 },
          { x: cx + 20, y: groundY + 8 },
          { x: cx + 44, y: groundY + 5 },
          { x: cx + 66, y: groundY + 11 },
        ],
        [
          { x: cx - 8, y: groundY + 2 },
          { x: cx - 18, y: groundY + 12 },
          { x: cx - 32, y: groundY + 16 },
        ],
        [
          { x: cx + 10, y: groundY + 2 },
          { x: cx + 16, y: groundY + 13 },
          { x: cx + 30, y: groundY + 17 },
        ],
      ];
      craters.push({ cx, cy: groundY + 2, branches, alpha: 1, color: winColor });

      for (let i = 0; i < 24; i++) {
        particles.push({
          x: cx + (Math.random() - 0.5) * 44,
          y: groundY,
          vx: (Math.random() - 0.5) * 7,
          vy: -2.2 - Math.random() * 4.5,
          life: 1.05,
          size: i % 2 === 0 ? 5.5 + Math.random() * 5 : 2 + Math.random() * 2,
          color: i % 2 === 0 ? "#7E88A8" : "#FBBF24",
          kind: i % 2 === 0 ? "dust" : "ember",
        });
      }
    };

    const drawFrame = (nowMs: number) => {
      const dt = Math.min(0.05, (nowMs - prevMs) / 1000);
      prevMs = nowMs;

      const isIntense = intenseRef.current;
      const activeFinisher = finisherWinnerRef.current;

      if (!prefersReduced) {
        cycleSec += dt * (isIntense ? 1.85 : 1.25);
      } else {
        cycleSec = 0.42;
      }

      const groundY = height - 30;
      const centerX = width / 2;
      const scaleFactor = Math.max(0.75, Math.min(1.18, width / 580));

      ctx.clearRect(0, 0, width, height);

      const sx = shakePower > 0.1 ? (Math.random() - 0.5) * shakePower * 2 : 0;
      const sy = shakePower > 0.1 ? (Math.random() - 0.5) * shakePower * 2 : 0;
      shakePower *= 0.84;

      ctx.save();
      ctx.translate(sx, sy);

      // Ambient floor spotlights
      const gradA = ctx.createRadialGradient(
        centerX - 110 * scaleFactor,
        groundY,
        10,
        centerX - 110 * scaleFactor,
        groundY,
        165
      );
      gradA.addColorStop(0, "rgba(79, 139, 255, 0.2)");
      gradA.addColorStop(1, "rgba(79, 139, 255, 0)");
      ctx.fillStyle = gradA;
      ctx.fillRect(0, 0, width, height);

      const gradB = ctx.createRadialGradient(
        centerX + 110 * scaleFactor,
        groundY,
        10,
        centerX + 110 * scaleFactor,
        groundY,
        165
      );
      gradB.addColorStop(0, "rgba(255, 107, 87, 0.2)");
      gradB.addColorStop(1, "rgba(255, 107, 87, 0)");
      ctx.fillStyle = gradB;
      ctx.fillRect(0, 0, width, height);

      // Compute poses
      let poseA: Pose;
      let poseB: Pose;
      let ghostA = false;
      let ghostB = false;
      let impactFrameAlpha = 0;
      let impactPoint: Vec2 | null = null;
      let finishStampAlpha = 0;
      let dimArenaAlpha = 0;

      let duelWarpLines: { x1: number; y1: number; x2: number; y2: number; color: string }[] = [];
      let duelBeam: {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
        width: number;
        color: string;
      } | null = null;
      let duelSpeedLinesAlpha = 0;

      if (activeFinisher) {
        const finSec = prefersReduced
          ? 1.15
          : Math.max(0, (nowMs - (finisherStartMsRef.current ?? nowMs)) / 1000);
        const fin = getFinisherPoses(activeFinisher, finSec);
        poseA = fin.poseA;
        poseB = fin.poseB;
        ghostA = fin.ghostA && !prefersReduced;
        ghostB = fin.ghostB && !prefersReduced;
        impactFrameAlpha = prefersReduced ? 0 : fin.impactFrameAlpha;
        impactPoint = fin.impactPoint;
        finishStampAlpha = fin.finishStampAlpha;
        dimArenaAlpha = fin.dimArenaAlpha;

        if (!prefersReduced && fin.triggerStrikeVfx && fin.impactPoint && !strikeFiredRef.current) {
          strikeFiredRef.current = true;
          spawnFinisherStrike(
            centerX + fin.impactPoint.x * scaleFactor,
            groundY + fin.impactPoint.y,
            activeFinisher,
            groundY
          );
        }

        if (!prefersReduced && fin.triggerCraterVfx && fin.craterPoint && !craterFiredRef.current) {
          craterFiredRef.current = true;
          spawnCraterSlam(
            centerX + fin.craterPoint.x * scaleFactor,
            groundY,
            activeFinisher
          );
        }

        if (!prefersReduced && finishStampAlpha > 0.1 && Math.random() < 0.45) {
          const winColor =
            activeFinisher === "A"
              ? "#6BA4FF"
              : activeFinisher === "B"
              ? "#FF8A75"
              : "#FBBF24";
          const wx =
            activeFinisher === "TIE"
              ? centerX + (Math.random() > 0.5 ? -105 : 105) * scaleFactor
              : centerX + (activeFinisher === "A" ? -76 : 76) * scaleFactor;
          particles.push({
            x: wx + (Math.random() - 0.5) * 44,
            y: groundY - Math.random() * 14,
            vx: (Math.random() - 0.5) * 1.2,
            vy: -1.4 - Math.random() * 2.4,
            life: 0.9,
            size: 2 + Math.random() * 2.2,
            color: Math.random() > 0.35 ? winColor : "#FDE68A",
            kind: "ember",
          });
        }
      } else {
        const duel = getChoreographedPoses(cycleSec, isIntense);
        poseA = duel.poseA;
        poseB = duel.poseB;
        ghostA = duel.ghostA && !prefersReduced;
        ghostB = duel.ghostB && !prefersReduced;
        duelWarpLines = prefersReduced ? [] : duel.warpLines;
        duelBeam = duel.energyBeam;
        duelSpeedLinesAlpha = prefersReduced ? 0 : duel.speedLinesAlpha;

        if (!prefersReduced && duel.crossSlashNow && nowMs - lastClashSpawn > 160) {
          lastClashSpawn = nowMs;
          slashBeams.push(
            {
              x1: centerX - 115 * scaleFactor,
              y1: groundY - 25,
              x2: centerX + 115 * scaleFactor,
              y2: groundY - 115,
              alpha: 0.95,
              width: 6,
              color: "#6BA4FF",
            },
            {
              x1: centerX + 115 * scaleFactor,
              y1: groundY - 25,
              x2: centerX - 115 * scaleFactor,
              y2: groundY - 115,
              alpha: 0.95,
              width: 6,
              color: "#FF8A75",
            }
          );
          spawnClash(centerX, groundY - 68, true, groundY);
        } else if (
          duel.clashPoint &&
          !prefersReduced &&
          nowMs - lastClashSpawn > (isIntense ? 95 : 135)
        ) {
          lastClashSpawn = nowMs;
          spawnClash(
            centerX + duel.clashPoint.x * scaleFactor,
            groundY + duel.clashPoint.y,
            isIntense,
            groundY
          );
        }
      }

      // Dramatic spotlight darken + Hit-stop Impact Frame radial anime speed lines!
      if (dimArenaAlpha > 0.01) {
        ctx.fillStyle = `rgba(5, 7, 13, ${dimArenaAlpha})`;
        ctx.fillRect(-20, -20, width + 40, height + 40);
      }

      if (duelSpeedLinesAlpha > 0.05) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = duelSpeedLinesAlpha * 0.45;
        const fx = centerX;
        const fy = groundY - 75;
        for (let r = 0; r < 18; r++) {
          const ang = (r / 18) * Math.PI * 2 + (Math.random() - 0.5) * 0.06;
          const inner = 48 + Math.random() * 25;
          const outer = 200 + Math.random() * 120;
          ctx.strokeStyle = r % 2 === 0 ? "#6BA4FF" : "#FF8A75";
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(fx + Math.cos(ang) * inner, fy + Math.sin(ang) * inner);
          ctx.lineTo(fx + Math.cos(ang) * outer, fy + Math.sin(ang) * outer);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Teleport flash-step warp lines & energy wave beam
      if (duelWarpLines.length > 0 || duelBeam) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (const wl of duelWarpLines) {
          ctx.strokeStyle = wl.color;
          ctx.shadowColor = wl.color;
          ctx.shadowBlur = 14;
          ctx.lineWidth = 2.6;
          ctx.setLineDash([12, 6]);
          ctx.beginPath();
          ctx.moveTo(centerX + wl.x1 * scaleFactor, groundY + wl.y1);
          ctx.lineTo(centerX + wl.x2 * scaleFactor, groundY + wl.y2);
          ctx.stroke();
        }
        ctx.setLineDash([]);

        if (duelBeam) {
          const bx1 = centerX + duelBeam.x1 * scaleFactor;
          const by1 = groundY + duelBeam.y1;
          const bx2 = centerX + duelBeam.x2 * scaleFactor;
          const by2 = groundY + duelBeam.y2;
          ctx.strokeStyle = duelBeam.color;
          ctx.shadowColor = duelBeam.color;
          ctx.shadowBlur = 22;
          ctx.lineCap = "round";
          ctx.lineWidth = duelBeam.width * 1.9;
          ctx.beginPath();
          ctx.moveTo(bx1, by1);
          ctx.lineTo(bx2, by2);
          ctx.stroke();

          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = duelBeam.width * 0.7;
          ctx.beginPath();
          ctx.moveTo(bx1, by1);
          ctx.lineTo(bx2, by2);
          ctx.stroke();
        }
        ctx.restore();
      }

      if (impactFrameAlpha > 0.05 && impactPoint) {
        const ix = centerX + impactPoint.x * scaleFactor;
        const iy = groundY + impactPoint.y;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = impactFrameAlpha * 0.85;
        const coreGrad = ctx.createRadialGradient(ix, iy, 4, ix, iy, 150);
        coreGrad.addColorStop(0, "rgba(255,255,255,0.95)");
        coreGrad.addColorStop(
          0.3,
          activeFinisher === "A"
            ? "rgba(79,139,255,0.65)"
            : activeFinisher === "B"
            ? "rgba(255,107,87,0.65)"
            : "rgba(251,191,36,0.65)"
        );
        coreGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = coreGrad;
        ctx.fillRect(-20, -20, width + 40, height + 40);

        for (let r = 0; r < 28; r++) {
          const ang = (r / 28) * Math.PI * 2 + (Math.random() - 0.5) * 0.08;
          const inner = 26 + Math.random() * 24;
          const outer = 220 + Math.random() * 140;
          ctx.strokeStyle = r % 3 === 0 ? "#FFFFFF" : "#94B8FF";
          ctx.lineWidth = r % 4 === 0 ? 2.8 : 1.4;
          ctx.beginPath();
          ctx.moveTo(ix + Math.cos(ang) * inner, iy + Math.sin(ang) * inner);
          ctx.lineTo(ix + Math.cos(ang) * outer, iy + Math.sin(ang) * outer);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Arena floor line + crater cracks
      ctx.strokeStyle = "#262D42";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(20, groundY + 2);
      ctx.lineTo(width - 20, groundY + 2);
      ctx.stroke();

      ctx.strokeStyle = "#3A4463";
      ctx.beginPath();
      ctx.moveTo(centerX, groundY - 4);
      ctx.lineTo(centerX, groundY + 8);
      ctx.stroke();

      for (const crater of craters) {
        ctx.save();
        ctx.globalAlpha = crater.alpha;
        ctx.strokeStyle = crater.color;
        ctx.shadowColor = crater.color;
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2.4;
        for (const branch of crater.branches) {
          ctx.beginPath();
          ctx.moveTo(branch[0].x, branch[0].y);
          for (let j = 1; j < branch.length; j++) {
            ctx.lineTo(branch[j].x, branch[j].y);
          }
          ctx.stroke();
        }
        ctx.restore();
      }

      // Speed afterimage trails (normal combat + multi-step finisher warp)
      if (!activeFinisher && (ghostA || ghostB)) {
        const prev1 = getChoreographedPoses(cycleSec - 0.045, isIntense);
        const prev2 = getChoreographedPoses(cycleSec - 0.09, isIntense);
        if (ghostA) {
          drawFighter(
            ctx,
            centerX,
            groundY,
            1,
            { ...prev2.poseA, xOffset: prev2.poseA.xOffset * scaleFactor, slashArc: undefined },
            "#6BA4FF",
            "#4F8BFF",
            "A",
            null,
            cycleSec,
            0.12
          );
          drawFighter(
            ctx,
            centerX,
            groundY,
            1,
            { ...prev1.poseA, xOffset: prev1.poseA.xOffset * scaleFactor, slashArc: undefined },
            "#6BA4FF",
            "#4F8BFF",
            "A",
            null,
            cycleSec,
            0.24
          );
        }
        if (ghostB) {
          drawFighter(
            ctx,
            centerX,
            groundY,
            -1,
            { ...prev2.poseB, xOffset: prev2.poseB.xOffset * scaleFactor, slashArc: undefined },
            "#FF8A75",
            "#FF6B57",
            "B",
            null,
            cycleSec,
            0.12
          );
          drawFighter(
            ctx,
            centerX,
            groundY,
            -1,
            { ...prev1.poseB, xOffset: prev1.poseB.xOffset * scaleFactor, slashArc: undefined },
            "#FF8A75",
            "#FF6B57",
            "B",
            null,
            cycleSec,
            0.24
          );
        }
      }

      if (activeFinisher && (ghostA || ghostB)) {
        const finSec = Math.max(0, (nowMs - (finisherStartMsRef.current ?? nowMs)) / 1000);
        for (const stepBack of [0.08, 0.04]) {
          const prevFin = getFinisherPoses(activeFinisher, Math.max(0, finSec - stepBack));
          const alpha = stepBack === 0.08 ? 0.16 : 0.34;
          if (ghostA) {
            drawFighter(
              ctx,
              centerX,
              groundY,
              1,
              {
                ...prevFin.poseA,
                xOffset: prevFin.poseA.xOffset * scaleFactor,
                slashArc: undefined,
              },
              "#6BA4FF",
              "#4F8BFF",
              "A",
              null,
              cycleSec,
              alpha
            );
          }
          if (ghostB) {
            drawFighter(
              ctx,
              centerX,
              groundY,
              -1,
              {
                ...prevFin.poseB,
                xOffset: prevFin.poseB.xOffset * scaleFactor,
                slashArc: undefined,
              },
              "#FF8A75",
              "#FF6B57",
              "B",
              null,
              cycleSec,
              alpha
            );
          }
        }
      }

      const scaledPoseA: Pose = {
        ...poseA,
        xOffset: poseA.xOffset * scaleFactor,
        slashArc: poseA.slashArc
          ? { ...poseA.slashArc, x: poseA.slashArc.x * scaleFactor }
          : undefined,
      };
      const scaledPoseB: Pose = {
        ...poseB,
        xOffset: poseB.xOffset * scaleFactor,
        slashArc: poseB.slashArc
          ? { ...poseB.slashArc, x: poseB.slashArc.x * scaleFactor }
          : undefined,
      };

      if (activeFinisher === "B") {
        drawFighter(
          ctx,
          centerX,
          groundY,
          1,
          scaledPoseA,
          "#6BA4FF",
          "#4F8BFF",
          "A",
          faceImgARef.current,
          cycleSec
        );
        drawFighter(
          ctx,
          centerX,
          groundY,
          -1,
          scaledPoseB,
          "#FF8A75",
          "#FF6B57",
          "B",
          faceImgBRef.current,
          cycleSec
        );
      } else {
        drawFighter(
          ctx,
          centerX,
          groundY,
          -1,
          scaledPoseB,
          "#FF8A75",
          "#FF6B57",
          "B",
          faceImgBRef.current,
          cycleSec
        );
        drawFighter(
          ctx,
          centerX,
          groundY,
          1,
          scaledPoseA,
          "#6BA4FF",
          "#4F8BFF",
          "A",
          faceImgARef.current,
          cycleSec
        );
      }

      // Render cross-arena slash beams + lightning bolts
      ctx.globalCompositeOperation = "lighter";
      for (let i = slashBeams.length - 1; i >= 0; i--) {
        const b = slashBeams[i];
        b.alpha -= 0.042;
        b.width *= 0.945;
        if (b.alpha <= 0.02) {
          slashBeams.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = b.alpha;
        ctx.strokeStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 22;
        ctx.lineCap = "round";
        ctx.lineWidth = b.width;
        ctx.beginPath();
        ctx.moveTo(b.x1, b.y1);
        ctx.lineTo(b.x2, b.y2);
        ctx.stroke();

        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = b.width * 0.45;
        ctx.beginPath();
        ctx.moveTo(b.x1, b.y1);
        ctx.lineTo(b.x2, b.y2);
        ctx.stroke();
        ctx.restore();
      }

      for (let i = bolts.length - 1; i >= 0; i--) {
        const bolt = bolts[i];
        bolt.alpha -= 0.075;
        if (bolt.alpha <= 0.02) {
          bolts.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = bolt.alpha;
        ctx.strokeStyle = bolt.color;
        ctx.shadowColor = bolt.color;
        ctx.shadowBlur = 16;
        ctx.lineWidth = bolt.width;
        ctx.beginPath();
        ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
        for (let k = 1; k < bolt.points.length; k++) {
          ctx.lineTo(bolt.points[k].x, bolt.points[k].y);
        }
        ctx.stroke();
        ctx.restore();
      }

      // Shockwave rings
      for (let i = clashRings.length - 1; i >= 0; i--) {
        const ring = clashRings[i];
        ring.radius += (ring.maxRadius - ring.radius) * 0.22;
        ring.alpha -= 0.052;
        if (ring.alpha <= 0.02) {
          clashRings.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = ring.alpha;
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = ring.lineWidth;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Sparks, embers & dust
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (p.kind === "dust") {
          p.vx *= 0.92;
          p.vy *= 0.92;
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.032;
          if (p.life <= 0.02) {
            particles.splice(i, 1);
            continue;
          }
          ctx.save();
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = p.life * 0.48;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          p.vx *= 0.945;
          p.vy = p.kind === "ember" ? p.vy * 0.98 : p.vy * 0.945 + 0.14;
          p.x += p.vx;
          p.y += p.vy;
          p.life -= p.kind === "ember" ? 0.028 : 0.036;
          if (p.life <= 0.02) {
            particles.splice(i, 1);
            continue;
          }
          ctx.save();
          ctx.globalAlpha = Math.min(1, p.life);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 1.6, p.y - p.vy * 1.6);
          ctx.stroke();
          ctx.restore();
        }
      }
      ctx.globalCompositeOperation = "source-over";

      // Stylized "FINISH!!" stamp over decisive aftermath
      if (finishStampAlpha > 0.05 && activeFinisher) {
        const stampText = activeFinisher === "TIE" ? "DRAW!" : "FINISH!!";
        const stampColor =
          activeFinisher === "A"
            ? "#78B0FF"
            : activeFinisher === "B"
            ? "#FF8A75"
            : "#FBBF24";
        const stampX =
          activeFinisher === "TIE"
            ? centerX
            : centerX + (activeFinisher === "A" ? 118 : -118) * scaleFactor;
        const stampY = groundY - 82;

        ctx.save();
        ctx.translate(stampX, stampY);
        ctx.rotate(activeFinisher === "A" ? -0.14 : activeFinisher === "B" ? 0.14 : 0);
        const popScale = 0.85 + 0.25 * easeOutBack(finishStampAlpha);
        ctx.scale(popScale, popScale);
        ctx.globalAlpha = finishStampAlpha;
        ctx.font = '900 22px "JetBrains Mono", ui-sans-serif, sans-serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 5;
        ctx.strokeStyle = "#0B0E16";
        ctx.strokeText(stampText, 0, 0);
        ctx.shadowColor = stampColor;
        ctx.shadowBlur = 16;
        ctx.fillStyle = stampColor;
        ctx.fillText(stampText, 0, 0);
        ctx.restore();
      }

      ctx.restore();

      if (!prefersReduced) {
        rafId = window.requestAnimationFrame(drawFrame);
      }
    };

    redrawStaticRef.current = () => {
      if (prefersReduced) {
        drawFrame(performance.now());
      }
    };

    rafId = window.requestAnimationFrame(drawFrame);

    return () => {
      redrawStaticRef.current = null;
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", syncSize);
      resizeObserver?.disconnect();
    };
  }, []);

  return (
    <div className="relative rounded-xl border border-[#283047] bg-[#0F121B] overflow-hidden">
      {/* Top corner contender tags */}
      <div className="absolute inset-x-0 top-0 px-4 py-2.5 flex items-center justify-between gap-4 pointer-events-none z-10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-xs bg-[#4F8BFF] shrink-0" aria-hidden="true" />
          <span className="text-xs font-bold text-[#78B0FF] truncate max-w-[160px] sm:max-w-[220px]">
            A · {labelA}
          </span>
        </div>

        {countdownBadge !== null ? (
          <span className="font-mono tabular-nums text-xs font-extrabold text-[#F1F3F9] px-2 py-0.5 rounded bg-[#1B2234]/90 border border-[#34405E]">
            {String(countdownBadge).padStart(2, "0")}s
          </span>
        ) : !finisherWinner ? (
          <span className="font-mono text-[11px] font-bold text-[#687089]">LIVE DUEL</span>
        ) : null}

        <div className="flex items-center gap-2 min-w-0 text-right">
          <span className="text-xs font-bold text-[#FF8A75] truncate max-w-[160px] sm:max-w-[220px]">
            {labelB} · B
          </span>
          <span className="w-2 h-2 rounded-xs bg-[#FF6B57] shrink-0" aria-hidden="true" />
        </div>
      </div>

      <canvas
        ref={canvasRef}
        aria-label={`${labelA}와 ${labelB}의 스틱맨 대결 애니메이션`}
        className="block w-full h-[304px]"
      />
    </div>
  );
}
