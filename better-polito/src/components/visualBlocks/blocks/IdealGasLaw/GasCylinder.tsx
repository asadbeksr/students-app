
import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface GasCylinderProps {
  volumeRatio: number;      // 0-1
  pressureRatio: number;    // 0-1
  amountRatio: number;      // 0-1
  temperatureRatio: number; // 0-1
  isValid: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  mass: number;
  baseR: number;
  baseSpeed: number;
}

export function GasCylinder({
  volumeRatio,
  pressureRatio,
  amountRatio,
  temperatureRatio,
  isValid,
}: GasCylinderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLSpanElement[]>([]);
  const particleDataRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | null>(null);

  // Calculate derived values
  const particleCount = Math.round(8 + amountRatio ** 1.4 * 28);
  const bubbleScale = 0.5 + temperatureRatio ** 1.35 * 1.1;
  const bubbleOpacity = 0.5 + pressureRatio * 0.25;
  const speedScale = 20 + temperatureRatio ** 1.35 * 120;
  
  // Safe volume ratio to prevent lid from crushing particles completely
  const safeVolumeRatio = Math.max(0.1, Math.min(1, volumeRatio));
  
  // Map volume 0-1 to lid position pixels (cylinder is ~200px tall)
  // Higher volume = lower lid position (more space)? No, lower lid = LESS space?
  // Let's assume Top Y=0. Bottom Y=200.
  // If lid is at 0, full volume. If lid is at 200, zero volume.
  // Actually, standard chemical cylinders: Piston moves up/down.
  // Lid at Top (Y=20) = Max Volume. Lid at Bottom (Y=180) = Min Volume.
  // Wait, looking at the code: `lidPosition = Math.min(190, Math.max(6, 200 - volumeRatio * 180));`
  // If volumeRatio = 1, lidPosition = 200 - 180 = 20 (High up).
  // If volumeRatio = 0, lidPosition = 200.
  // Correct.
  const lidPosition = Math.min(190, Math.max(20, 200 - safeVolumeRatio * 180));

  // Particle animation loop
  useEffect(() => {
    if (!isValid) return;

    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.033);
      lastTime = currentTime;

      const container = containerRef.current;
      if (!container) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const { width, height } = container.getBoundingClientRect();
      if (width === 0 || height === 0) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const particles = particleDataRef.current;

      // Initialize particles if needed
      while (particles.length < particleCount) {
        const baseR = 4 + Math.random() * 5;
        particles.push({
          x: baseR + Math.random() * (width - baseR * 2),
          y: baseR + Math.random() * (height - baseR * 2),
          vx: (Math.random() - 0.5) * speedScale,
          vy: (Math.random() - 0.5) * speedScale,
          r: baseR * bubbleScale,
          mass: Math.max(1, baseR * baseR),
          baseR,
          baseSpeed: 0.4 + Math.random() * 0.6,
        });
      }

      // Remove excess particles
      if (particles.length > particleCount) {
        particles.length = particleCount;
      }

      // Update particles
      particles.forEach((p, i) => {
        // Smooth scale transition
        const targetR = p.baseR * bubbleScale;
        p.r = p.r + (targetR - p.r) * 0.15;
        p.mass = Math.max(1, p.r * p.r);

        // Normalize speed
        const currentSpeed = Math.hypot(p.vx, p.vy) || 0.001;
        const targetSpeed = p.baseSpeed * speedScale;
        const speedRatio = targetSpeed / currentSpeed;
        p.vx *= speedRatio;
        p.vy *= speedRatio;

        // Update position
        p.x += p.vx * deltaTime;
        p.y += p.vy * deltaTime;

        // Bounce off walls
        if (p.x - p.r < 0) { p.x = p.r; p.vx = Math.abs(p.vx); }
        if (p.x + p.r > width) { p.x = width - p.r; p.vx = -Math.abs(p.vx); }
        if (p.y - p.r < 0) { p.y = p.r; p.vy = Math.abs(p.vy); }
        if (p.y + p.r > height) { p.y = height - p.r; p.vy = -Math.abs(p.vy); }

        // Update DOM element
        const el = particlesRef.current[i];
        if (el) {
          el.style.transform = `translate(${p.x - p.r}px, ${p.y - p.r}px)`;
          el.style.width = `${p.r * 2}px`;
          el.style.height = `${p.r * 2}px`;
          el.style.opacity = String(bubbleOpacity);
        }
      });

      // Particle-particle collisions (Basic)
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i];
          const p2 = particles[j];
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const dist = Math.hypot(dx, dy);
          const minDist = p1.r + p2.r;

          if (dist > 0 && dist < minDist) {
            // Separate particles
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = minDist - dist;
            p1.x -= nx * overlap * 0.5;
            p1.y -= ny * overlap * 0.5;
            p2.x += nx * overlap * 0.5;
            p2.y += ny * overlap * 0.5;

            // Elastic collision
            const dvx = p2.vx - p1.vx;
            const dvy = p2.vy - p1.vy;
            const dvn = dvx * nx + dvy * ny;

            if (dvn < 0) {
              const impulse = (-1.9 * dvn) / (1 / p1.mass + 1 / p2.mass);
              p1.vx -= (impulse * nx) / p1.mass;
              p1.vy -= (impulse * ny) / p1.mass;
              p2.vx += (impulse * nx) / p2.mass;
              p2.vy += (impulse * ny) / p2.mass;
            }
          }
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isValid, particleCount, bubbleScale, bubbleOpacity, speedScale]);

  // Cylinder clip path: Elliptical top and bottom connected by straight lines
  // Top center around 19.2 height? 
  // path d="M 0 19.2 a 80 19.2 0 0 0 160 0 a 80 19.2 0 0 0 -160 0 l 0 180 a 80 19.2 0 0 0 160 0 l 0 -180"
  // Cylinder width 160
  // Top ellipse ry=19.2. rx=80 (matches width/2)
  const cylinderPath = `M 0 19.2 a 80 19.2 0 0 0 160 0 a 80 19.2 0 0 0 -160 0 l 0 180 a 80 19.2 0 0 0 160 0 l 0 -180`;

  return (
    <div className="relative h-[220px] w-[160px] mx-auto select-none">
      {/* Shadow */}
      <svg
        className="pointer-events-none absolute start-1/2 -bottom-2 h-16 w-[320px] -translate-x-1/2"
        viewBox="0 0 320 100"
      >
        <defs>
          <radialGradient id="cylinder-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0,0,0,0.1)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>
        <ellipse cx="160" cy="60" rx="160" ry="40" fill="url(#cylinder-shadow)" />
      </svg>

      {/* Cylinder body */}
      <div
        className="relative z-10 overflow-hidden"
        style={{ clipPath: `path("${cylinderPath}")`, height: '100%', width: '100%' }}
      >
        {/* Glass cylinder effect */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 160 221">
          <defs>
            <linearGradient id="cylinder-body" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(0,0,0,0.1)" />
              <stop offset="33%" stopColor="rgba(0,0,0,0.02)" />
              <stop offset="66%" stopColor="rgba(255,255,255,0.2)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.08)" />
            </linearGradient>
          </defs>
          <path
            d={cylinderPath}
            fill="url(#cylinder-body)"
            fillOpacity="0.55"
            stroke="rgba(0,0,0,0.18)"
            className="dark:stroke-[rgba(255,255,255,0.08)]"
          />
        </svg>

        {/* Particle container */}
        <div
          ref={containerRef}
          className="absolute inset-0"
          style={{
            top: `${lidPosition}px`,
            height: `calc(100% - ${lidPosition}px)`,
            clipPath: `path("${cylinderPath}")`,
          }}
        >
          {Array.from({ length: particleCount }).map((_, i) => (
            <span
              key={i}
              ref={(el) => { if (el) particlesRef.current[i] = el; }}
              className="absolute rounded-full"
              style={{
                backgroundImage: 'linear-gradient(135deg, #1e6bff 0%, #8fd4ff 100%)',
                willChange: 'transform',
                boxShadow: 'inset 0 0 2px rgba(0,0,0,0.2)',
              }}
            />
          ))}
        </div>

        {/* Lid Animation */}
        <motion.div
           className="absolute w-full top-0 left-0 pointer-events-none"
           initial={false}
           animate={{ y: lidPosition - 110 }} // Adjust vertical offset to align with cylinder top at 0 volume
           transition={{ duration: 0.3, type: 'spring', damping: 20, stiffness: 100 }}
        >
          <svg
            className="h-full w-full overflow-visible"
            viewBox="0 0 160 220"
          >
             <defs>
              <linearGradient id="cylinder-lid" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(180,180,180,1)" />
                <stop offset="50%" stopColor="rgba(150,150,150,1)" />
                <stop offset="100%" stopColor="rgba(180,180,180,1)" />
              </linearGradient>
            </defs>
            <path
              d="M 0,115.5 a 80,19.2 0,0,0 160 0 a 80,19.2 0,0,0 -160 0 l 0,8 a 80,19.2 0,0,0 160 0 l 0,-8"
              fill="url(#cylinder-lid)"
              className="dark:fill-[rgba(80,80,80,1)]"
              stroke="rgba(0,0,0,0.2)"
            />
          </svg>
        </motion.div>
      </div>
    </div>
  );
}
