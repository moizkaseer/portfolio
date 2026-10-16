/**
 * CSS cubic-bezier(x1, y1, x2, y2) as a function of progress — the same curve the
 * browser uses for the design's transitions. Newton–Raphson with bisection fallback.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const x = (t: number) => ((ax * t + bx) * t + cx) * t;
  const y = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  const solve = (p: number) => {
    let t = p;
    for (let i = 0; i < 8; i++) {
      const err = x(t) - p;
      if (Math.abs(err) < 1e-7) return t;
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    let lo = 0;
    let hi = 1;
    t = p;
    while (hi - lo > 1e-7) {
      if (x(t) < p) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  };

  return (p: number) => (p <= 0 ? 0 : p >= 1 ? 1 : y(solve(p)));
}

/** Parses "cubic-bezier(a, b, c, d)". */
export function parseCubicBezier(css: string) {
  const [a, b, c, d] = css.match(/-?[\d.]+/g)!.map(Number);
  return cubicBezier(a, b, c, d);
}
