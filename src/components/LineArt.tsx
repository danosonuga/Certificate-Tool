import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { spotlightMask, useSpotlight } from './Pattern'
import { kneeling, seated, standing } from './figures'
import { swirlPaths, type SwirlSettings } from './swirl'

export type LineArtSettings = {
  scene: boolean
  swirl: boolean
  lineOpacity: number
  lineWeight: number
  wobble: number
  spotlight: boolean
  spotlightSize: number
  spotlightBoost: number
  swirlInset: number
  swirlLoops: number
  swirlSize: number
  swirlDrift: number
  swirlStrands: number
}

type Props = LineArtSettings & {
  color: string
  /** Card corner radius, so the swirl follows the card's shape. */
  radius: number
  /** Preview only: strokes ink themselves in once and a spotlight follows the pointer. */
  interactive?: boolean
}

const G = 640 // ground line in scene units
const H = 112 // adult height in scene units

/* An original single-line ink scene of volunteering, drawn for Bayana and
   matching its event types: tree planting, relief distribution, a health
   screening tent and a short course. Adults in volunteer vests, at work.
   It sits as a band above the signatures; the viewBox matches the A4 card
   (1045 × 716) scaled to 1200 wide. */
function Scene() {
  const P = (d: string) => <path pathLength={1} d={d} />
  return (
    <>
      {/* Ground, sun and birds */}
      {P('M-10 646 C150 638 260 650 380 642 S600 636 700 640 S950 650 1210 641')}
      {P('M632 470 a22 22 0 1 0 0.1 0 M590 480 C572 484 556 482 536 486')}
      {P('M880 400 q8 -8 16 0 q8 -8 16 0 M932 374 q6 -6 12 0 q6 -6 12 0 M990 410 q5 -5 10 0 q5 -5 10 0 M850 432 q5 -5 10 0 q5 -5 10 0')}

      {/* Tree planting: one volunteer kneels with a sapling, another digs */}
      {P(kneeling({ x: 196, ground: G, h: H, dir: 1, hair: 'wrap', front: [244, 614] }))}
      {P('M228 640 q22 -9 44 0 M250 640 C251 618 248 600 251 580 M250 606 q-14 -4 -19 -15 q14 -1 19 15 M250 596 q12 -6 18 -17 q-13 2 -18 17 M251 584 q-5 -10 0 -18 q5 8 -1 18')}
      {P(standing({ x: 308, ground: G, h: H, dir: -1, hair: 'cap', front: [278, 556], back: [273, 590] }))}
      {P('M281 546 L268 626 M274 546 h13 M261 622 l13 2 l-2 15 q-8 4 -13 -3 z')}
      {P('M112 640 v-17 q0 -3 3 -3 h20 q3 0 3 3 v17 M138 628 l15 -11 l3 3 M118 620 q8 -12 16 0')}

      {/* Relief distribution: stocking the table, handing over a parcel */}
      {P(standing({ x: 360, ground: G, h: H, dir: 1, hair: 'short', front: [396, 572], back: [392, 584] }))}
      {P('M380 588 h150 M380 594 h150 M388 594 V640 M522 594 V640')}
      {P('M396 588 v-26 h34 v26 M396 562 l7 -7 h34 l-7 7 M437 555 v26 l-7 7 M413 575 c-3 -4 -8 -2 -6 2 l6 5 l6 -5 c2 -4 -3 -6 -6 -2')}
      {P('M442 588 v-20 h28 v20 M442 568 l6 -6 h28 l-6 6 M476 562 v20 l-6 6 M484 588 l2 -22 h20 l2 22 M490 566 q7 -10 14 0')}
      {P(standing({ x: 566, ground: G, h: H, dir: 1, hair: 'bun', front: [598, 568], back: [596, 578] }))}
      {P('M596 556 h28 v22 h-28 z M610 556 v22 M596 566 h28')}
      {P(standing({ x: 654, ground: G, h: H * 0.97, dir: -1, hair: 'wrap', vest: false, front: [624, 570] }))}
      {P('M664 590 l-3 26 h20 l-3 -26 M666 590 q6 -10 12 0')}

      {/* Health screening under a canopy tent */}
      {P('M700 520 L795 494 L890 520 M700 520 q11.9 9 23.75 0 q11.9 9 23.75 0 q11.9 9 23.75 0 q11.9 9 23.75 0 q11.9 9 23.75 0 q11.9 9 23.75 0 q11.9 9 23.75 0 q11.9 9 23.75 0 M704 524 V640 M886 524 V640')}
      {P('M781 532 h28 v20 h-28 z M795 535 v14 M788 542 h14')}
      {P('M744 606 h28 M749 606 L745 640 M767 606 L771 640')}
      {P(seated({ x: 756, ground: G, h: H, dir: 1, seat: 606, hair: 'short', vest: false, front: [794, 592] }))}
      {P('M786 589 l8 -2 l2 6 l-8 2 z')}
      {P(standing({ x: 826, ground: G, h: H, dir: -1, hair: 'bun', front: [800, 590] }))}
      {P('M836 576 h14 v20 h-14 z M840 582 h6 M840 587 h6')}

      {/* A short course: a volunteer at the board, adults learning */}
      {P('M962 498 h96 v58 h-96 z M970 556 L960 640 M1050 556 L1060 640 M1010 498 V488')}
      {P('M974 548 v-10 M986 548 v-18 M998 548 v-14 M1010 548 v-26 M1024 534 l10 -8 l8 4 l12 -13 M974 510 h34 M974 518 h22')}
      {P(standing({ x: 932, ground: G, h: H, dir: 1, hair: 'short', front: [964, 520] }))}
      {P('M1100 604 h26 M1124 604 V572 M1104 604 L1101 640 M1122 604 L1125 640')}
      {P(seated({ x: 1112, ground: G, h: H, dir: -1, seat: 604, hair: 'wrap', vest: false, front: [1088, 592], back: [1096, 596] }))}
      {P('M1080 590 l15 -3 l2 8 l-15 3 z')}
      {P('M1155 604 h26 M1179 604 V572 M1159 604 L1156 640 M1177 604 L1180 640')}
      {P(seated({ x: 1166, ground: G, h: H, dir: -1, seat: 604, hair: 'short', vest: false, front: [1142, 598], back: [1150, 600] }))}
      {P('M1130 600 h24 M1136 600 l-6 -16 h-1')}

      {/* A few tufts */}
      {P('M60 645 q4 -12 8 0 q4 -10 8 0 M690 641 q4 -10 8 0 M900 646 q4 -12 8 0 q4 -10 8 0')}
    </>
  )
}

export function LineArt({ color, interactive, radius, ...p }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const id = useId().replace(/:/g, '')
  const [size, setSize] = useState<[number, number]>([0, 0])
  useSpotlight(rootRef, !!interactive && p.spotlight)

  useLayoutEffect(() => {
    const el = rootRef.current!
    const read = () => setSize([el.offsetWidth, el.offsetHeight])
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const [w, h] = size
  const swirl =
    p.swirl && w && h
      ? swirlPaths(w, h, radius, {
          inset: p.swirlInset,
          loops: p.swirlLoops,
          loopSize: p.swirlSize,
          drift: p.swirlDrift,
          strands: p.swirlStrands,
        } satisfies SwirlSettings)
      : []

  const fill = { position: 'absolute', inset: 0, width: '100%', height: '100%' } as const
  const mask = spotlightMask(p.spotlightSize)

  const svg = (viewBox: string, aspect: string, children: ReactNode, draw?: string) => (
    <svg viewBox={viewBox} preserveAspectRatio={aspect} style={fill} className={draw}>
      <g
        fill="none"
        stroke={color}
        strokeWidth={p.lineWeight}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={p.wobble > 0 ? `url(#wobble-${id})` : undefined}
      >
        {children}
      </g>
    </svg>
  )

  const layer = (opacity: number | string, extra?: CSSProperties, draw = false) => (
    <div style={{ ...fill, opacity, ...extra }}>
      {p.swirl &&
        w > 0 &&
        svg(
          `0 0 ${w} ${h}`,
          'none',
          swirl.map((d, i) => <path key={i} pathLength={1} d={d} />),
          draw ? `lineart-swirl-${id}` : undefined,
        )}
      {p.scene && svg('0 0 1200 822', 'xMidYMax meet', <Scene />, draw ? `lineart-draw-${id}` : undefined)}
    </div>
  )

  return (
    <div ref={rootRef} aria-hidden style={{ ...fill, zIndex: -1, pointerEvents: 'none', overflow: 'hidden' }}>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <filter id={`wobble-${id}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale={p.wobble} />
        </filter>
      </svg>
      {interactive && (
        // Strokes ink themselves in once when the preview mounts; the swirl traces the border.
        <style>{`
          .lineart-draw-${id} path, .lineart-swirl-${id} path {
            stroke-dasharray: 1;
            stroke-dashoffset: 1;
            animation: lineart-${id} 2.4s cubic-bezier(0.65, 0, 0.35, 1) forwards;
          }
          .lineart-draw-${id} path:nth-child(3n + 2) { animation-delay: 0.25s; }
          .lineart-draw-${id} path:nth-child(3n) { animation-delay: 0.5s; }
          .lineart-swirl-${id} path { animation-duration: 4s; animation-timing-function: cubic-bezier(0.45, 0, 0.25, 1); }
          .lineart-swirl-${id} path + path { animation-delay: 0.6s; }
          @keyframes lineart-${id} { to { stroke-dashoffset: 0; } }
          @media (prefers-reduced-motion: reduce) {
            .lineart-draw-${id} path, .lineart-swirl-${id} path { animation: none; stroke-dashoffset: 0; }
          }
        `}</style>
      )}
      {layer(p.lineOpacity, undefined, !!interactive)}
      {interactive &&
        p.spotlight &&
        layer(`calc(var(--glow, 0) * ${Math.min(1, p.lineOpacity * p.spotlightBoost)})`, {
          transition: 'opacity 400ms cubic-bezier(0.23, 1, 0.32, 1)',
          maskImage: mask,
          WebkitMaskImage: mask,
        })}
    </div>
  )
}
