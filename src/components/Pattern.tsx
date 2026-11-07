import { useLayoutEffect, useRef, type RefObject } from 'react'
import { tokens } from '../brand'

export type PatternSettings = {
  hole: number
  origin: { x: number; y: number }
  opacity: number
  dotSize: number
  growth: number
  spacing: number
  fade: number
  spotlight: boolean
  spotlightSize: number
  spotlightBoost: number
}

type Props = PatternSettings & {
  color: string
  /** Canvas pixels per CSS pixel; match the export pixel ratio so dots stay crisp. */
  resolution: number
  /** Preview only: a soft spotlight follows the pointer. Exports stay static. */
  interactive?: boolean
}

/* Pointer tracking for the preview spotlight. Writes CSS variables on the
   layer directly, so moving the pointer never re-renders React. */
export function useSpotlight(rootRef: RefObject<HTMLDivElement | null>, enabled: boolean) {
  useLayoutEffect(() => {
    const root = rootRef.current
    const host = root?.parentElement
    if (!enabled || !root || !host) return
    const move = (e: PointerEvent) => {
      const rect = root.getBoundingClientRect()
      root.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width) * 100}%`)
      root.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height) * 100}%`)
      root.style.setProperty('--glow', '1')
    }
    const leave = () => root.style.setProperty('--glow', '0')
    host.addEventListener('pointermove', move)
    host.addEventListener('pointerleave', leave)
    return () => {
      host.removeEventListener('pointermove', move)
      host.removeEventListener('pointerleave', leave)
    }
  }, [rootRef, enabled])
}

export const spotlightMask = (size: number) =>
  `radial-gradient(circle ${size}px at var(--mx, 50%) var(--my, 50%), #000 0%, rgba(0,0,0,0.35) 45%, transparent 100%)`

type Dot = { x: number; y: number; r: number; a: number }

/* The Bayana mark extended outward: concentric rings of dots, each ring
   staggered half a step from the last and its dots a little larger, as in
   bayana-mark.svg. Two orange sparks sit on the third ring at the same
   angle as in the logo (~30–40° clockwise from the top). */
function layout(w: number, h: number, p: PatternSettings) {
  const cx = p.origin.x * w
  const cy = p.origin.y * h
  const rMax = Math.max(Math.hypot(cx, cy), Math.hypot(w - cx, cy), Math.hypot(cx, h - cy), Math.hypot(w - cx, h - cy))
  const dots: Dot[] = []
  const sparks: Dot[] = []
  // The first ring clears the hole (e.g. the seal), as the mark's ring clears its centre.
  let r = Math.max(p.hole, p.dotSize * p.spacing * 4)
  for (let k = 0; r < rMax + 20; k++) {
    const s = p.dotSize * (1 + p.growth * k)
    const n = Math.max(8, Math.floor((2 * Math.PI * r) / (s * p.spacing)))
    const step = (2 * Math.PI) / n
    const offset = k % 2 ? step / 2 : 0
    const a = 1 - p.fade * Math.min(1, r / rMax)
    // Dots nearest 30° and the next one clockwise become the sparks.
    const sparkAt = k === 2 ? Math.round((Math.PI / 6 - offset) / step) : -1
    for (let i = 0; i < n; i++) {
      const t = offset + i * step
      const dot = { x: cx + r * Math.sin(t), y: cy - r * Math.cos(t), r: s, a }
      if (sparkAt >= 0 && (i === sparkAt || i === sparkAt + 1)) sparks.push(dot)
      else if (dot.x > -s && dot.x < w + s && dot.y > -s && dot.y < h + s) dots.push(dot)
    }
    r += s * p.spacing * 0.8
  }
  return { dots, sparks }
}

export function Pattern({ color, resolution, interactive, ...p }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const baseRef = useRef<HTMLCanvasElement>(null)
  const glowRef = useRef<HTMLCanvasElement>(null)
  const sparkRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const root = rootRef.current!
    let drawn = ''
    const draw = () => {
      const w = root.offsetWidth
      const h = root.offsetHeight
      if (!w || !h || drawn === `${w}x${h}`) return
      drawn = `${w}x${h}`
      const { dots, sparks } = layout(w, h, p)

      const base = baseRef.current!
      base.width = Math.round(w * resolution)
      base.height = Math.round(h * resolution)
      const ctx = base.getContext('2d')!
      ctx.scale(resolution, resolution)
      ctx.fillStyle = color
      for (const d of dots) {
        ctx.globalAlpha = d.a
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fill()
      }

      const glow = glowRef.current
      if (glow) {
        glow.width = base.width
        glow.height = base.height
        glow.getContext('2d')!.drawImage(base, 0, 0)
      }

      // Sparks are DOM dots so they can sit brighter than the dimmed field.
      sparkRef.current!.replaceChildren(
        ...sparks.map((d) => {
          const el = document.createElement('span')
          el.style.cssText = `position:absolute;left:${d.x - d.r}px;top:${d.y - d.r}px;width:${d.r * 2}px;height:${d.r * 2}px;border-radius:50%;background:${tokens.markSpark}`
          return el
        }),
      )
    }
    draw()
    // Paper size or template changes resize the area without changing settings.
    const ro = new ResizeObserver(draw)
    ro.observe(root)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color, resolution, JSON.stringify(p)])

  useSpotlight(rootRef, !!interactive && p.spotlight)

  const fill = { position: 'absolute', inset: 0, width: '100%', height: '100%' } as const
  const mask = spotlightMask(p.spotlightSize)

  return (
    <div ref={rootRef} aria-hidden style={{ ...fill, zIndex: -1, pointerEvents: 'none', overflow: 'hidden' }}>
      <canvas ref={baseRef} style={{ ...fill, opacity: p.opacity }} />
      {interactive && p.spotlight && (
        <canvas
          ref={glowRef}
          style={{
            ...fill,
            opacity: `calc(var(--glow, 0) * ${Math.min(1, p.opacity * p.spotlightBoost)})`,
            transition: 'opacity 400ms cubic-bezier(0.23, 1, 0.32, 1)',
            maskImage: mask,
            WebkitMaskImage: mask,
          }}
        />
      )}
      <div ref={sparkRef} style={{ ...fill, opacity: Math.min(1, p.opacity * 6) }} />
    </div>
  )
}
