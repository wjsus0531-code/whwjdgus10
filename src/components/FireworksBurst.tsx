import React, {useEffect, useRef} from 'react';

interface FireworksBurstProps {
  winner: 'A' | 'B' | 'TIE';
  active: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  gravity: number;
  kind: 'spark' | 'confetti' | 'ring';
  rotation: number;
  spin: number;
}

export const FireworksBurst: React.FC<FireworksBurstProps> = ({winner, active}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const particles: Particle[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const palette =
      winner === 'A'
        ? ['#4F8BFF', '#7DB0FF', '#FBBF24', '#FFFFFF', '#38BDF8']
        : winner === 'B'
          ? ['#FF5E57', '#FF8E88', '#FBBF24', '#FFFFFF', '#FB923C']
          : ['#FBBF24', '#4F8BFF', '#FF5E57', '#FFFFFF', '#34D399'];

    const spawnBurst = (cx: number, cy: number, count: number) => {
      particles.push({
        x: cx,
        y: cy,
        vx: 0,
        vy: 0,
        size: 10,
        color: palette[0],
        alpha: 0.9,
        decay: 0.035,
        gravity: 0,
        kind: 'ring',
        rotation: 0,
        spin: 0,
      });

      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.25;
        const speed = 2.4 + Math.random() * 6.5;
        const isConfetti = i % 3 === 0;
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.2,
          size: isConfetti ? 4 + Math.random() * 4 : 2 + Math.random() * 2.5,
          color: palette[Math.floor(Math.random() * palette.length)],
          alpha: 1,
          decay: isConfetti ? 0.008 + Math.random() * 0.006 : 0.013 + Math.random() * 0.01,
          gravity: isConfetti ? 0.09 : 0.12,
          kind: isConfetti ? 'confetti' : 'spark',
          rotation: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 0.25,
        });
      }
    };

    const spawnConfettiShower = () => {
      for (let i = 0; i < 45; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: -10 - Math.random() * 60,
          vx: (Math.random() - 0.5) * 2.4,
          vy: 2.2 + Math.random() * 3.2,
          size: 5 + Math.random() * 4,
          color: palette[Math.floor(Math.random() * palette.length)],
          alpha: 0.95,
          decay: 0.0055,
          gravity: 0.04,
          kind: 'confetti',
          rotation: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 0.22,
        });
      }
    };

    spawnBurst(canvas.width * 0.28, canvas.height * 0.34, 46);
    spawnBurst(canvas.width * 0.72, canvas.height * 0.3, 46);
    spawnConfettiShower();

    const timer1 = window.setTimeout(() => {
      spawnBurst(canvas.width * 0.5, canvas.height * 0.24, 58);
    }, 360);
    const timer2 = window.setTimeout(() => {
      spawnBurst(canvas.width * 0.2, canvas.height * 0.45, 38);
      spawnBurst(canvas.width * 0.8, canvas.height * 0.44, 38);
    }, 780);

    const startTime = performance.now();

    const tick = (now: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.985;
        p.alpha -= p.decay;
        p.rotation += p.spin;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);

        if (p.kind === 'ring') {
          p.size += 5.5;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.stroke();
        } else if (p.kind === 'confetti') {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size * 0.55);
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      if (particles.length > 0 || now - startTime < 2600) {
        animId = requestAnimationFrame(tick);
      }
    };

    animId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', resize);
      window.clearTimeout(timer1);
      window.clearTimeout(timer2);
      cancelAnimationFrame(animId);
    };
  }, [active, winner]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40"
    />
  );
};
