import { useEffect, useRef } from "react";

interface FireworksBurstProps {
  triggerKey: number;
  winner: "A" | "B" | "TIE";
}

interface Spark {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  drag: number;
  gravity: number;
}

interface ConfettiPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rotation: number;
  vr: number;
  tilt: number;
  vtilt: number;
  color: string;
  alpha: number;
  gravity: number;
  drag: number;
}

interface FlashRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  lineWidth: number;
}

interface LightRay {
  angle: number;
  length: number;
  width: number;
  color: string;
}

const PALETTES: Record<"A" | "B" | "TIE", string[]> = {
  A: ["#4F8BFF", "#78B0FF", "#B8D6FF", "#FBBF24", "#FFFFFF", "#38BDF8"],
  B: ["#FF6B57", "#FF9582", "#FDBA74", "#FBBF24", "#FFFFFF", "#FB7185"],
  TIE: ["#6BA4FF", "#FF8A75", "#34D399", "#FBBF24", "#FFFFFF"],
};

export function FireworksBurst({ triggerKey, winner }: FireworksBurstProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (triggerKey <= 0) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = window.innerWidth;
    let height = window.innerHeight;

    const syncSize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    syncSize();
    window.addEventListener("resize", syncSize);

    const palette = PALETTES[winner];
    const sparks: Spark[] = [];
    const confetti: ConfettiPiece[] = [];
    const rings: FlashRing[] = [];
    const scheduledTimeouts: number[] = [];

    // Initial dramatic center flash + radial spotlight rays + shockwave rings
    let centerFlashAlpha = 0.72;
    const rays: LightRay[] = Array.from({ length: 18 }, (_, i) => ({
      angle: (i / 18) * Math.PI * 2 + Math.random() * 0.14,
      length: Math.max(width, height) * (0.45 + Math.random() * 0.35),
      width: 14 + Math.random() * 26,
      color: palette[i % palette.length],
    }));

    rings.push(
      {
        x: width * 0.5,
        y: height * 0.42,
        radius: 16,
        maxRadius: Math.min(width, height) * 0.55,
        color: "#FFFFFF",
        alpha: 0.95,
        lineWidth: 4.5,
      },
      {
        x: width * 0.5,
        y: height * 0.42,
        radius: 8,
        maxRadius: Math.min(width, height) * 0.38,
        color: palette[0],
        alpha: 0.9,
        lineWidth: 3.5,
      }
    );

    const spawnBurst = (cx: number, cy: number, scale = 1) => {
      const primaryColor = palette[Math.floor(Math.random() * 2)];
      rings.push({
        x: cx,
        y: cy,
        radius: 6,
        maxRadius: 76 * scale,
        color: primaryColor,
        alpha: 0.92,
        lineWidth: 2.8,
      });

      const count = Math.round(52 * scale);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.18;
        const speed = (2.8 + Math.random() * 6.4) * scale;
        const color = palette[Math.floor(Math.random() * palette.length)];
        sparks.push({
          x: cx,
          y: cy,
          prevX: cx,
          prevY: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color,
          size: 1.7 + Math.random() * 2.2,
          alpha: 1,
          decay: 0.011 + Math.random() * 0.01,
          drag: 0.955 + Math.random() * 0.015,
          gravity: 0.075 + Math.random() * 0.03,
        });
      }

      const innerCount = Math.round(18 * scale);
      for (let i = 0; i < innerCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (1.2 + Math.random() * 2.8) * scale;
        sparks.push({
          x: cx,
          y: cy,
          prevX: cx,
          prevY: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: "#FFFFFF",
          size: 1.4 + Math.random() * 1.4,
          alpha: 0.96,
          decay: 0.018 + Math.random() * 0.012,
          drag: 0.94,
          gravity: 0.05,
        });
      }
    };

    // Dual corner confetti cannons blasting across the screen
    const spawnConfettiCannon = (fromLeft: boolean, count = 42) => {
      const originX = fromLeft ? width * 0.04 : width * 0.96;
      const originY = height * 0.88;
      const baseAngle = fromLeft ? -Math.PI * 0.34 : -Math.PI * 0.66;

      for (let i = 0; i < count; i++) {
        const angle = baseAngle + (Math.random() - 0.5) * 0.52;
        const power = 11 + Math.random() * 11;
        confetti.push({
          x: originX,
          y: originY,
          vx: Math.cos(angle) * power,
          vy: Math.sin(angle) * power,
          w: 7 + Math.random() * 6,
          h: 3.5 + Math.random() * 3.5,
          rotation: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.24,
          tilt: Math.random() * Math.PI,
          vtilt: 0.12 + Math.random() * 0.16,
          color: palette[Math.floor(Math.random() * palette.length)],
          alpha: 1,
          gravity: 0.22 + Math.random() * 0.08,
          drag: 0.975,
        });
      }
    };

    // Immediate double cannon salute + staggered multi-burst fireworks
    spawnConfettiCannon(true, 46);
    spawnConfettiCannon(false, 46);

    const tidCannon2 = window.setTimeout(() => {
      spawnConfettiCannon(true, 28);
      spawnConfettiCannon(false, 28);
    }, 380);
    scheduledTimeouts.push(tidCannon2);

    const burstPlan = [
      { delay: 0, xRatio: 0.5, yRatio: 0.32, scale: 1.25 },
      { delay: 160, xRatio: 0.26, yRatio: 0.26, scale: 1.0 },
      { delay: 320, xRatio: 0.74, yRatio: 0.26, scale: 1.05 },
      { delay: 540, xRatio: 0.42, yRatio: 0.2, scale: 1.15 },
      { delay: 760, xRatio: 0.64, yRatio: 0.36, scale: 1.0 },
      { delay: 980, xRatio: 0.5, yRatio: 0.26, scale: 1.22 },
    ];

    let pendingBursts = burstPlan.length + 1;
    scheduledTimeouts.push(
      window.setTimeout(() => {
        pendingBursts -= 1;
      }, 420)
    );

    for (const b of burstPlan) {
      if (b.delay === 0) {
        spawnBurst(width * b.xRatio, height * b.yRatio, b.scale);
        pendingBursts -= 1;
      } else {
        const tid = window.setTimeout(() => {
          const jitterX = (Math.random() - 0.5) * 48;
          const jitterY = (Math.random() - 0.5) * 32;
          spawnBurst(width * b.xRatio + jitterX, height * b.yRatio + jitterY, b.scale);
          pendingBursts -= 1;
        }, b.delay);
        scheduledTimeouts.push(tid);
      }
    }

    let rafId = 0;
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Center supernova flash & light rays
      if (centerFlashAlpha > 0.015) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const cx = width * 0.5;
        const cy = height * 0.42;

        const flashGrad = ctx.createRadialGradient(
          cx,
          cy,
          8,
          cx,
          cy,
          Math.max(width, height) * 0.55
        );
        flashGrad.addColorStop(0, `rgba(255, 255, 255, ${centerFlashAlpha * 0.65})`);
        flashGrad.addColorStop(
          0.35,
          winner === "A"
            ? `rgba(79, 139, 255, ${centerFlashAlpha * 0.38})`
            : winner === "B"
            ? `rgba(255, 107, 87, ${centerFlashAlpha * 0.38})`
            : `rgba(52, 211, 153, ${centerFlashAlpha * 0.38})`
        );
        flashGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = flashGrad;
        ctx.fillRect(0, 0, width, height);

        for (const ray of rays) {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(ray.angle);
          ctx.globalAlpha = centerFlashAlpha * 0.24;
          ctx.fillStyle = ray.color;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(ray.length, -ray.width);
          ctx.lineTo(ray.length, ray.width);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
        centerFlashAlpha *= 0.89;
      }

      // Draw tumbling metallic confetti ribbons
      for (let i = confetti.length - 1; i >= 0; i--) {
        const c = confetti[i];
        c.vx *= c.drag;
        c.vy = c.vy * c.drag + c.gravity;
        c.x += c.vx;
        c.y += c.vy;
        c.rotation += c.vr;
        c.tilt += c.vtilt;
        if (c.y > height * 0.78) {
          c.alpha -= 0.025;
        }
        if (c.alpha <= 0.02 || c.y > height + 30) {
          confetti.splice(i, 1);
          continue;
        }

        const scaleY = Math.cos(c.tilt);
        ctx.save();
        ctx.globalAlpha = Math.max(0, c.alpha * 0.92);
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rotation);
        ctx.scale(1, Math.abs(scaleY) < 0.2 ? 0.2 : scaleY);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
        ctx.restore();
      }

      ctx.globalCompositeOperation = "lighter";

      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i];
        ring.radius += (ring.maxRadius - ring.radius) * 0.16;
        ring.alpha -= 0.036;
        if (ring.alpha <= 0.02) {
          rings.splice(i, 1);
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

      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.prevX = p.x;
        p.prevY = p.y;
        p.vx *= p.drag;
        p.vy = p.vy * p.drag + p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha <= 0.02) {
          sparks.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p.prevX, p.prevY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        ctx.fillStyle = "#FFFFFF";
        ctx.globalAlpha = Math.max(0, p.alpha * 0.85);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.globalCompositeOperation = "source-over";

      if (
        sparks.length > 0 ||
        confetti.length > 0 ||
        rings.length > 0 ||
        centerFlashAlpha > 0.02 ||
        pendingBursts > 0
      ) {
        rafId = window.requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    rafId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(rafId);
      for (const tid of scheduledTimeouts) {
        window.clearTimeout(tid);
      }
      window.removeEventListener("resize", syncSize);
      ctx.clearRect(0, 0, width, height);
    };
  }, [triggerKey, winner]);

  if (triggerKey <= 0) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50"
    />
  );
}
