import markSvg from '../assets/brand/bayana-mark.svg?raw'
import logoSvg from '../assets/brand/bayana-logo.svg?raw'

/* The official SVGs, recoloured by swapping their three brand fills.
   Geometry is never redrawn, so the mark stays exactly as designed. */
function recolor(svg: string, dot: string, spark: string, word?: string) {
  let out = svg
    .replace(/fill="#2EA1FE"/gi, `fill="${dot}"`)
    .replace(/fill="#FF7516"/gi, `fill="${spark}"`)
  // bayana-logo.svg is the on-dark lockup (white letters); the on-light one uses #20083A.
  if (word) out = out.replace(/fill="(white|#20083A)"/gi, `fill="${word}"`)
  return out.replace(/<svg /, '<svg style="display:block;width:100%;height:100%" ')
}

type MarkProps = { size: number; dot: string; spark: string }

export function BayanaMark({ size, dot, spark }: MarkProps) {
  return (
    <div
      style={{ width: size * (31.0764 / 32), height: size }}
      dangerouslySetInnerHTML={{ __html: recolor(markSvg, dot, spark) }}
    />
  )
}

type LogoProps = MarkProps & { word: string }

export function BayanaLogo({ size, dot, spark, word }: LogoProps) {
  return (
    <div
      style={{ width: size * (105.841 / 32), height: size }}
      dangerouslySetInnerHTML={{ __html: recolor(logoSvg, dot, spark, word) }}
    />
  )
}

type SealProps = {
  size: number
  fill: string
  shade: string
  dot: string
  spark: string
  markScale: number
  ribbon: boolean
}

/* Rosette from the certificate template: a disc carrying the mark, with two
   notched ribbon tails. Drawn in a 260×370 box where the disc is r=126. */
export function Seal({ size, fill, shade, dot, spark, markScale, ribbon }: SealProps) {
  const scale = size / 260
  const markSize = 252 * markScale * scale
  return (
    <div style={{ position: 'relative', width: size, height: (ribbon ? 370 : 260) * scale }}>
      <svg
        viewBox={`0 0 260 ${ribbon ? 370 : 260}`}
        width={size}
        height={(ribbon ? 370 : 260) * scale}
        style={{ display: 'block' }}
        aria-hidden
      >
        {ribbon && (
          <>
            <polygon points="88,236 150,258 86,368 80,316 32,338" fill={fill} />
            <polygon points="124,262 176,238 228,338 180,318 176,368" fill={shade} />
          </>
        )}
        <circle cx="130" cy="130" r="126" fill={fill} />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: 130 * scale - (markSize * (31.0764 / 32)) / 2,
          top: 130 * scale - markSize / 2,
        }}
      >
        <BayanaMark size={markSize} dot={dot} spark={spark} />
      </div>
    </div>
  )
}
