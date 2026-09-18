import { useEffect, useRef, useState } from 'react';

/**
 * Cuenta desde 0 (o el valor previo) hasta `value` en `duration` ms con
 * easing out. Respeta prefers-reduced-motion — si está activo, salta al
 * final sin animación.
 */
export function AnimatedNumber({
  value,
  duration = 400,
  format,
  className,
  style,
}: {
  value: number;
  duration?: number;
  format: (n: number) => string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef<number | null>(null);
  const prevRef = useRef(value);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setDisplay(value);
      prevRef.current = value;
      return;
    }

    const from = prevRef.current;
    const to = value;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else prevRef.current = to;
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return (
    <span className={className} style={style}>
      {format(display)}
    </span>
  );
}
