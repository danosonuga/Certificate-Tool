/* Path builders for the line-drawn volunteers. Every figure shares one set of
   adult proportions (head ≈ 1/7.5 of height, long legs, outlined clothing) so
   the scene reads as people at work rather than stick figures. Each builder
   returns SVG path data; `dir` is 1 when the figure faces right, -1 for left. */

type Pt = [number, number]
type Hair = 'short' | 'bun' | 'cap' | 'wrap'

const f = (n: number) => Math.round(n * 10) / 10

/* Two parallel strokes from a to b, so a limb reads as trousers or a sleeve. */
function limb([ax, ay]: Pt, [bx, by]: Pt, w: number) {
  const len = Math.hypot(bx - ax, by - ay) || 1
  const nx = (-(by - ay) / len) * (w / 2)
  const ny = ((bx - ax) / len) * (w / 2)
  return `M${f(ax + nx)} ${f(ay + ny)} L${f(bx + nx)} ${f(by + ny)} M${f(ax - nx)} ${f(ay - ny)} L${f(bx - nx)} ${f(by - ny)}`
}

function head(x: number, cy: number, r: number, hair: Hair, dir: number) {
  const circle = `M${f(x - r)} ${f(cy)} a${f(r)} ${f(r)} 0 1 0 ${f(r * 2)} 0 a${f(r)} ${f(r)} 0 1 0 ${f(-r * 2)} 0`
  const h = {
    short: `M${f(x - r * 1.02)} ${f(cy - r * 0.1)} C${f(x - r)} ${f(cy - r * 1.55)} ${f(x + r)} ${f(cy - r * 1.55)} ${f(x + r * 1.02)} ${f(cy - r * 0.2)}`,
    bun: `M${f(x - dir * r * 0.9)} ${f(cy - r * 0.8)} a${f(r * 0.45)} ${f(r * 0.45)} 0 1 1 ${f(-dir * r * 0.3)} ${f(r * 0.6)}`,
    cap: `M${f(x - r)} ${f(cy - r * 0.35)} C${f(x - r)} ${f(cy - r * 1.35)} ${f(x + r)} ${f(cy - r * 1.35)} ${f(x + r)} ${f(cy - r * 0.35)} L${f(x + dir * r * 1.8)} ${f(cy - r * 0.3)}`,
    wrap: `M${f(x - r * 1.05)} ${f(cy - r * 0.2)} C${f(x - r * 1.3)} ${f(cy - r * 1.9)} ${f(x + r * 1.3)} ${f(cy - r * 1.9)} ${f(x + r * 1.05)} ${f(cy - r * 0.2)} M${f(x - r * 0.9)} ${f(cy - r * 0.75)} Q${f(x)} ${f(cy - r * 1.1)} ${f(x + r * 0.9)} ${f(cy - r * 0.75)}`,
  }[hair]
  return `${circle} ${h}`
}

/* Torso from shoulders to hips, with a volunteer vest's V-neck if asked. */
function torso(x: number, sy: number, hy: number, h: number, vest: boolean) {
  const w = h * 0.12
  const hw = h * 0.095
  const body = `M${f(x - w)} ${f(sy)} C${f(x - w - 2)} ${f(sy + h * 0.12)} ${f(x - hw - 1)} ${f(hy - h * 0.08)} ${f(x - hw)} ${f(hy)} L${f(x + hw)} ${f(hy)} C${f(x + hw + 1)} ${f(hy - h * 0.08)} ${f(x + w + 2)} ${f(sy + h * 0.12)} ${f(x + w)} ${f(sy)} Q${f(x)} ${f(sy - h * 0.025)} ${f(x - w)} ${f(sy)}`
  const neck = vest
    ? ` M${f(x - w * 0.45)} ${f(sy - 0.5)} L${f(x)} ${f(sy + h * 0.11)} L${f(x + w * 0.45)} ${f(sy - 0.5)} M${f(x - w * 0.55)} ${f(sy + h * 0.2)} h${f(w * 0.35)}`
    : ''
  return body + neck
}

function arm(from: Pt, to: Pt, bend: number) {
  const mx = (from[0] + to[0]) / 2
  const my = (from[1] + to[1]) / 2
  return `M${f(from[0])} ${f(from[1])} Q${f(mx + bend)} ${f(my + Math.abs(bend))} ${f(to[0])} ${f(to[1])}`
}

type Common = {
  x: number
  ground: number
  h: number
  dir?: number
  hair?: Hair
  vest?: boolean
  /** Hand positions, absolute. */
  front?: Pt
  back?: Pt
}

function upper({ x, h, dir = 1, hair = 'short', vest = true, front, back }: Common, top: number, sy: number, hy: number) {
  const r = h * 0.066
  const cy = top + r
  const w = h * 0.12
  const shoulderF: Pt = [x + dir * w, sy + 2]
  const shoulderB: Pt = [x - dir * w, sy + 2]
  const restF: Pt = [x + dir * (w + 3), hy + h * 0.02]
  const restB: Pt = [x - dir * (w + 3), hy + h * 0.02]
  return [
    head(x, cy, r, hair, dir),
    `M${f(x - r * 0.35)} ${f(cy + r)} L${f(x - r * 0.35)} ${f(sy)} M${f(x + r * 0.35)} ${f(cy + r)} L${f(x + r * 0.35)} ${f(sy)}`,
    torso(x, sy, hy, h, vest),
    arm(shoulderF, front ?? restF, dir * 4),
    arm(shoulderB, back ?? restB, -dir * 4),
  ].join(' ')
}

export function standing(o: Common) {
  const { x, ground: g, h, dir = 1 } = o
  const top = g - h
  const sy = top + h * 0.17
  const hy = g - h * 0.48
  const hw = h * 0.095
  const legW = h * 0.07
  return [
    upper(o, top, sy, hy),
    limb([x - hw * 0.5, hy], [x - hw * 0.55, g - 2], legW),
    limb([x + hw * 0.5, hy], [x + hw * 0.55 + dir * 2, g - 2], legW),
    `M${f(x - hw * 0.55)} ${f(g)} l${f(dir * 9)} 0 M${f(x + hw * 0.55 + dir * 2)} ${f(g)} l${f(dir * 9)} 0`,
  ].join(' ')
}

/* Seated on a stool or chair whose seat is at `seat`. */
export function seated(o: Common & { seat: number }) {
  const { x, ground: g, h, dir = 1, seat } = o
  const hy = seat
  const sy = hy - h * 0.33
  const top = sy - h * 0.17
  const knee: Pt = [x + dir * h * 0.24, seat + 1]
  const legW = h * 0.07
  return [
    upper(o, top, sy, hy),
    limb([x, hy - legW / 2], knee, legW),
    limb(knee, [knee[0] + dir * 3, g - 2], legW),
    `M${f(knee[0] + dir * 3)} ${f(g)} l${f(dir * 9)} 0`,
  ].join(' ')
}

/* Down on one knee, working at ground level in front. */
export function kneeling(o: Common) {
  const { x, ground: g, h, dir = 1 } = o
  const hy = g - h * 0.27
  const sy = hy - h * 0.33
  const top = sy - h * 0.17
  const legW = h * 0.07
  const backKnee: Pt = [x - dir * h * 0.1, g - legW / 2]
  const frontKnee: Pt = [x + dir * h * 0.24, g - h * 0.21]
  return [
    upper(o, top, sy, hy),
    limb([x, hy], backKnee, legW),
    limb(backKnee, [x - dir * h * 0.34, g - legW / 2], legW),
    limb([x, hy - 2], frontKnee, legW),
    limb(frontKnee, [frontKnee[0] + dir * 2, g - 2], legW),
    `M${f(frontKnee[0] + dir * 2)} ${f(g)} l${f(dir * 9)} 0`,
  ].join(' ')
}
