/* A single continuous line that loops its way around the card, like an ink
   pen tracing the border without lifting. It is a prolate trochoid laid along
   a rounded rectangle: a point circling a centre that travels the perimeter,
   so it throws a loop every step. Loop size and drift breathe slowly so no
   two loops match. */

export type SwirlSettings = {
  inset: number
  loops: number
  loopSize: number
  drift: number
  strands: number
}

const TAU = Math.PI * 2

function perimeter(w: number, h: number, inset: number, radius: number) {
  const x0 = inset
  const y0 = inset
  const x1 = w - inset
  const y1 = h - inset
  const r = Math.max(0, Math.min(radius, (x1 - x0) / 2, (y1 - y0) / 2))
  const sx = x1 - x0 - 2 * r
  const sy = y1 - y0 - 2 * r
  const arc = (Math.PI / 2) * r
  // Clockwise from the bottom-left corner, up the left edge.
  const segs = [
    { len: sy, at: (t: number) => [x0, y1 - r - t * sy, 0, -1] },
    { len: arc, at: (t: number) => corner(x0 + r, y0 + r, Math.PI + (t * Math.PI) / 2) },
    { len: sx, at: (t: number) => [x0 + r + t * sx, y0, 1, 0] },
    { len: arc, at: (t: number) => corner(x1 - r, y0 + r, -Math.PI / 2 + (t * Math.PI) / 2) },
    { len: sy, at: (t: number) => [x1, y0 + r + t * sy, 0, 1] },
    { len: arc, at: (t: number) => corner(x1 - r, y1 - r, (t * Math.PI) / 2) },
    { len: sx, at: (t: number) => [x1 - r - t * sx, y1, -1, 0] },
    { len: arc, at: (t: number) => corner(x0 + r, y1 - r, Math.PI / 2 + (t * Math.PI) / 2) },
  ]
  function corner(cx: number, cy: number, a: number) {
    return [cx + r * Math.cos(a), cy + r * Math.sin(a), -Math.sin(a), Math.cos(a)]
  }
  const total = segs.reduce((s, g) => s + g.len, 0)
  return {
    total,
    at(s: number) {
      let d = ((s % total) + total) % total
      for (const g of segs) {
        if (d <= g.len || g === segs[segs.length - 1]) return g.at(g.len ? Math.min(1, d / g.len) : 0)
        d -= g.len
      }
      return segs[0].at(0)
    },
  }
}

export function swirlPaths(w: number, h: number, radius: number, p: SwirlSettings) {
  const path = perimeter(w, h, p.inset, radius)
  const loops = Math.max(4, Math.round(p.loops))
  const samples = loops * 28
  const out: string[] = []
  for (let k = 0; k < p.strands; k++) {
    // A second strand runs out of phase with smaller loops, like a pen going round twice.
    const phase = k * Math.PI * 0.9
    const scale = k ? 0.62 : 1
    const pts: string[] = []
    for (let i = 0; i <= samples; i++) {
      const u = i / samples
      const s = u * path.total
      const [bx, by, tx, ty] = path.at(s)
      const nx = -ty
      const ny = tx
      const phi = TAU * loops * u + phase
      const R = p.loopSize * scale * (0.72 + 0.28 * Math.sin(TAU * 5 * u + 1.1 + k))
      const drift = p.drift * Math.sin(TAU * 3 * u + 0.4 + k * 2)
      const along = -R * Math.sin(phi)
      const across = R * Math.cos(phi) + drift
      const x = bx + tx * along + nx * across
      const y = by + ty * along + ny * across
      pts.push(`${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`)
    }
    out.push(pts.join(''))
  }
  return out
}
