import { useEffect, useRef, useCallback } from 'react';

interface CursorTrailProps {
  theme: string;
}

interface ParticleConfig {
  className: string;
  color: string;
  minSize: number;
  maxSize: number;
  driftXRange: number;
  driftYRange: number;
  driftYBias: number;
}

const THEME_CONFIG: Record<string, ParticleConfig> = {
  blossom: {
    className: 'cursor-particle-blossom',
    color: 'rgba(244, 114, 182, 0.7)',
    minSize: 4,
    maxSize: 10,
    driftXRange: 40,
    driftYRange: 40,
    driftYBias: 15,
  },
  rainy: {
    className: 'cursor-particle-rainy',
    color: 'rgba(96, 165, 250, 0.6)',
    minSize: 2,
    maxSize: 5,
    driftXRange: 10,
    driftYRange: 20,
    driftYBias: 25,
  },
  cyberpunk: {
    className: 'cursor-particle-cyberpunk',
    color: 'rgba(250, 204, 21, 0.9)',
    minSize: 2,
    maxSize: 6,
    driftXRange: 50,
    driftYRange: 50,
    driftYBias: 0,
  },
};

export default function CursorTrail({ theme }: CursorTrailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSpawnTime = useRef(0);
  const config = THEME_CONFIG[theme];

  const spawnParticle = useCallback(
    (x: number, y: number) => {
      if (!containerRef.current || !config) return;

      const el = document.createElement('div');
      const size = config.minSize + Math.random() * (config.maxSize - config.minSize);
      const driftX = (Math.random() - 0.5) * config.driftXRange;
      const driftY = config.driftYBias + (Math.random() - 0.5) * config.driftYRange;

      el.className = `cursor-particle ${config.className}`;
      el.style.left = `${x - size / 2}px`;
      el.style.top = `${y - size / 2}px`;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.backgroundColor = config.color;
      el.style.setProperty('--drift-x', `${driftX}px`);
      el.style.setProperty('--drift-y', `${driftY}px`);

      // Blossom petals get a slightly non-round shape
      if (theme === 'blossom') {
        el.style.borderRadius = `${30 + Math.random() * 40}% ${50 + Math.random() * 30}%`;
      }

      // Cyberpunk sparks get a secondary color sometimes
      if (theme === 'cyberpunk' && Math.random() > 0.5) {
        el.style.backgroundColor = 'rgba(168, 85, 247, 0.8)';
      }

      containerRef.current.appendChild(el);

      // Remove after animation ends
      const duration = theme === 'cyberpunk' ? 500 : theme === 'rainy' ? 600 : 800;
      setTimeout(() => {
        el.remove();
      }, duration + 50);
    },
    [config, theme],
  );

  useEffect(() => {
    if (!config) return;

    const handleMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      // Throttle: spawn every ~40ms
      if (now - lastSpawnTime.current < 40) return;
      lastSpawnTime.current = now;

      // Spawn 1-2 particles per move event
      const count = 1 + (Math.random() > 0.6 ? 1 : 0);
      for (let i = 0; i < count; i++) {
        const offsetX = (Math.random() - 0.5) * 8;
        const offsetY = (Math.random() - 0.5) * 8;
        spawnParticle(e.clientX + offsetX, e.clientY + offsetY);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [config, spawnParticle]);

  if (!config) return null;

  return <div ref={containerRef} className="fixed inset-0 pointer-events-none z-[9998] overflow-hidden" />;
}
