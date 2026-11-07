import { forwardRef, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import type { ResolvedValues } from 'dialkit'
import type { contentConfig, designConfig } from './dials'
import { tokens } from './brand'
import { BayanaLogo, BayanaMark, Seal } from './components/Brand'
import { LineArt } from './components/LineArt'
import { Pattern } from './components/Pattern'

export type Content = ResolvedValues<typeof contentConfig>
export type Design = ResolvedValues<typeof designConfig>
export type Recipient = { id: string; name: string; skill?: string }

export const PAPER = {
  a4: { w: 1123, h: 794, pdf: [297, 210] as [number, number], unit: 'mm' as const },
  letter: { w: 1056, h: 816, pdf: [11, 8.5] as [number, number], unit: 'in' as const },
}

/* Heading faces. Instrument Serif is the default: a high-contrast serif that
   reads as formal at certificate sizes, with an italic for names. Each face
   carries its own size factors so the layouts hold when switching. */
const FACES = {
  instrument: { family: '"Instrument Serif", Georgia, serif', title: 400, name: 400, titleScale: 1.18, nameScale: 1.3, tracking: -0.4, italic: true },
  zodiak: { family: 'Zodiak, Georgia, serif', title: 700, name: 400, titleScale: 0.98, nameScale: 1.08, tracking: -0.6, italic: true },
  clash: { family: '"Clash Display", ui-sans-serif, system-ui, sans-serif', title: 600, name: 600, titleScale: 1, nameScale: 1, tracking: -0.8, italic: false },
}
const BODY = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro", "Inter", "Segoe UI", Roboto, sans-serif'

function fill(template: string, vars: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m)
}

function dotColors(mode: string) {
  if (mode === 'tonal') return { dot: tokens.accent50, spark: tokens.markSpark }
  if (mode === 'white') return { dot: tokens.grey00, spark: tokens.markSpark }
  return { dot: tokens.markDot, spark: tokens.markSpark }
}

type Signatory = { n: number; name: string; role: string; sig: string }

/* Everything a layout needs, resolved once. Every template reads the same
   Content values, so switching templates never loses what was typed. */
function resolve(c: Content, d: Design, recipient: Recipient | undefined, interactive: boolean, resolution: number) {
  const name = recipient?.name?.trim() || c.previewName
  const signatories: Signatory[] = [
    { n: 1, name: c.signatory1.name1, role: c.signatory1.role1, sig: c.signatory1.signature1 },
    ...(d.show.signatory2
      ? [{ n: 2, name: c.signatory2.name2, role: c.signatory2.role2, sig: c.signatory2.signature2 }]
      : []),
  ]
  return {
    c,
    d,
    face: FACES[d.type.face as keyof typeof FACES] ?? FACES.instrument,
    interactive,
    resolution,
    col: {
      ...d.surfaces,
      rule: d.surfaces.lines,
      title: d.text.title,
      eyebrow: d.text.label,
      name: d.text.name,
      body: d.text.body,
      signName: d.text.signatory,
      signRole: d.text.role,
      date: d.text.date,
    },
    t: d.type,
    l: d.layout,
    name,
    body: fill(c.body, {
      name,
      skill: recipient?.skill?.trim() || c.skill,
      event: c.event,
      date: c.eventDate,
    }),
    marks: dotColors(d.seal.dots),
    // On a dark panel filled with the blue theme colour, blue dots disappear.
    darkMarks: dotColors(d.seal.dots === 'brand' && d.theme === 'donors' ? 'white' : d.seal.dots),
    signatories,
  }
}
type Ctx = ReturnType<typeof resolve>
type Align = 'left' | 'center'

/* -- Shared pieces ------------------------------------------------------- */

function Title({ x, color, scale = 1, style }: { x: Ctx; color: string; scale?: number; style?: CSSProperties }) {
  return (
    <h1
      data-field="title"
      style={{
        margin: 0,
        fontFamily: x.face.family,
        fontWeight: x.face.title,
        fontSize: x.t.titleSize * x.face.titleScale * scale,
        lineHeight: 1.1,
        letterSpacing: x.t.titleTracking,
        color,
        ...style,
      }}
    >
      {x.c.title}
    </h1>
  )
}

function Eyebrow({ x, color, style }: { x: Ctx; color: string; style?: CSSProperties }) {
  return (
    <div
      data-field="label"
      style={{
        fontSize: x.t.eyebrowSize,
        lineHeight: 1.3,
        letterSpacing: `${x.t.eyebrowTracking}em`,
        textTransform: 'uppercase',
        fontWeight: 500,
        color,
        ...style,
      }}
    >
      {x.c.presentedTo}
    </div>
  )
}

/* Recipient name on a rule. Long names shrink to stay on one line. */
function NameLine({ x, color, rule, width, align = 'left', scale = 1 }: {
  x: Ctx
  color: string
  rule: string
  width: number | string
  align?: Align
  scale?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const size = x.t.nameSize * x.face.nameScale * scale
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.fontSize = `${size}px`
    if (el.scrollWidth > el.clientWidth) el.style.fontSize = `${(size * el.clientWidth) / el.scrollWidth}px`
  }, [x.name, size, width, x.face])
  return (
    <div style={{ width, borderBottom: `2px solid ${rule}`, paddingBottom: 4, marginTop: 10 }}>
      <div
        ref={ref}
        data-field="name"
        data-size={size}
        style={{
          fontFamily: x.face.family,
          fontWeight: x.face.name,
          fontStyle: x.face.italic && x.t.nameItalic ? 'italic' : 'normal',
          lineHeight: 1.18,
          letterSpacing: x.face.tracking,
          whiteSpace: 'nowrap',
          textAlign: align,
          color,
        }}
      >
        {x.name}
      </div>
    </div>
  )
}

function Body({ x, color, width, align = 'left', style }: {
  x: Ctx
  color: string
  width: number | string
  align?: Align
  style?: CSSProperties
}) {
  return (
    <p
      data-field="body"
      style={{
        margin: '32px 0 0',
        width,
        fontSize: x.t.bodySize,
        lineHeight: x.t.bodyLeading,
        letterSpacing: -0.1,
        color,
        whiteSpace: 'pre-line',
        textAlign: align,
        ...style,
      }}
    >
      {x.body}
    </p>
  )
}

function Signature({ x, s, name, role, rule, align = 'left' }: {
  x: Ctx
  s?: Signatory
  name: string
  role: string
  rule: string
  align?: Align
}) {
  if (!s) return <div />
  return (
    <div style={{ textAlign: align, minWidth: 0 }}>
      <div style={{ height: 52, display: 'flex', alignItems: 'flex-end', justifyContent: align === 'center' ? 'center' : 'flex-start' }}>
        {s.sig && <img src={s.sig} alt="" style={{ maxHeight: 52, maxWidth: '100%', objectFit: 'contain' }} />}
      </div>
      <div style={{ borderTop: `2px solid ${rule}`, marginTop: 6, paddingTop: 12 }}>
        <div data-field={`signatory${s.n}Name`} style={{ fontSize: x.t.signSize, lineHeight: 1.3, fontWeight: 500, color: name }}>
          {s.name}
        </div>
        <div
          data-field={`signatory${s.n}Role`}
          style={{ fontSize: x.t.signSize * 0.88, lineHeight: 1.3, marginTop: 6, color: role, letterSpacing: 0.2 }}
        >
          {s.role}
        </div>
      </div>
    </div>
  )
}

function DateBlock({ x, color, align = 'right' }: { x: Ctx; color: string; align?: 'left' | 'center' | 'right' }) {
  if (!x.d.show.date) return null
  return (
    <div style={{ fontSize: x.t.signSize * 0.88, lineHeight: 1.3, color, letterSpacing: 0.4, textAlign: align }}>
      <div data-field="dateLabel" style={{ textTransform: 'uppercase' }}>
        {x.c.dateLabel}
      </div>
      <div data-field="dateIssued" style={{ marginTop: 6 }}>
        {x.c.dateIssued}
      </div>
    </div>
  )
}

function Wordmark({ x, word, size = 26 }: { x: Ctx; word: string; size?: number }) {
  if (!x.d.show.wordmark) return null
  return <BayanaLogo size={size} dot={tokens.markDot} spark={tokens.markSpark} word={word} />
}

function SealFor({ x, scale = 1 }: { x: Ctx; scale?: number }) {
  if (!x.d.show.seal) return null
  return (
    <Seal
      size={x.d.seal.size * scale}
      fill={x.col.seal}
      shade={x.col.sealShade}
      dot={x.marks.dot}
      spark={x.marks.spark}
      markScale={x.d.seal.markScale}
      ribbon={x.d.seal.ribbon}
    />
  )
}

/* -- Templates ----------------------------------------------------------- */

/* Faint background artwork: the community line drawing, or the logo's dot rings. */
function Bg({ x, color }: { x: Ctx; color: string }) {
  if (!x.d.pattern.show) return null
  if (x.d.pattern.style === 'dots')
    return <Pattern {...x.d.pattern} color={color} resolution={x.resolution} interactive={x.interactive} />
  return <LineArt {...x.d.pattern} color={color} radius={x.l.radius} interactive={x.interactive} />
}

const column: CSSProperties = {
  position: 'relative',
  isolation: 'isolate',
  height: '100%',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}

/* Classic — the supplied template: left-aligned, rosette top right. */
function Classic({ x }: { x: Ctx }) {
  const { col, l } = x
  return (
    <div style={{ ...column, background: col.card, borderRadius: l.radius, padding: l.padding }}>
      <Bg x={x} color={col.title} />
      <div style={{ position: 'absolute', top: l.padding, right: l.padding }}>
        <SealFor x={x} />
      </div>
      <Title x={x} color={col.title} style={{ maxWidth: l.contentWidth + 60 }} />
      <Eyebrow x={x} color={col.eyebrow} style={{ marginTop: l.titleGap }} />
      <NameLine x={x} color={col.name} rule={col.rule} width={l.contentWidth} />
      <Body x={x} color={col.body} width={l.contentWidth} />
      <div
        style={{
          marginTop: 'auto',
          display: 'grid',
          gridTemplateColumns: `repeat(2, ${l.signWidth}px) 1fr`,
          columnGap: l.signWidth * 1.04,
          alignItems: 'end',
        }}
      >
        {[0, 1].map((i) => (
          <Signature key={i} x={x} s={x.signatories[i]} name={col.signName} role={col.signRole} rule={col.rule} />
        ))}
        <div style={{ justifySelf: 'end', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 18 }}>
          <Wordmark x={x} word={tokens.accent300} />
          <DateBlock x={x} color={col.date} />
        </div>
      </div>
    </div>
  )
}

/* Formal — centred and symmetrical, with an inner keyline. */
function Formal({ x }: { x: Ctx }) {
  const { col, l } = x
  const inset = 14
  return (
    <div style={{ ...column, background: col.card, borderRadius: l.radius, padding: inset }}>
      <Bg x={x} color={col.title} />
      <div
        style={{
          ...column,
          alignItems: 'center',
          textAlign: 'center',
          border: `1.5px solid ${col.rule}`,
          borderRadius: Math.max(l.radius - inset, 0),
          padding: `${l.padding * 0.6}px ${l.padding}px ${l.padding * 0.7}px`,
        }}
      >
        <SealFor x={x} scale={0.5} />
        <Title x={x} color={col.title} scale={0.86} style={{ marginTop: 18 }} />
        <Eyebrow x={x} color={col.eyebrow} style={{ marginTop: l.titleGap * 0.45 }} />
        <NameLine x={x} color={col.name} rule={col.rule} width={l.contentWidth} align="center" />
        <Body x={x} color={col.body} width={l.contentWidth} align="center" style={{ marginTop: 22 }} />
        <div
          style={{
            marginTop: 'auto',
            width: '100%',
            display: 'grid',
            gridTemplateColumns: `${l.signWidth}px 1fr ${l.signWidth}px`,
            alignItems: 'end',
          }}
        >
          <Signature x={x} s={x.signatories[0]} name={col.signName} role={col.signRole} rule={col.rule} align="center" />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <Wordmark x={x} word={tokens.accent300} />
            <DateBlock x={x} color={col.date} align="center" />
          </div>
          <Signature x={x} s={x.signatories[1]} name={col.signName} role={col.signRole} rule={col.rule} align="center" />
        </div>
      </div>
    </div>
  )
}

/* Split — a brand panel carrying the mark, content on white. */
function Split({ x, width }: { x: Ctx; width: number }) {
  const { col, l } = x
  const panel = Math.round(width * 0.32)
  return (
    <div
      style={{
        ...column,
        flexDirection: 'row',
        background: col.card,
        borderRadius: l.radius,
      }}
    >
      <div
        style={{
          width: panel,
          flexShrink: 0,
          background: col.title,
          padding: l.padding * 0.8,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          color: '#fff',
        }}
      >
        <div style={{ flex: 1, alignSelf: 'stretch', display: 'grid', placeItems: 'center' }}>
          {x.d.show.seal && (
            <BayanaMark size={panel * x.d.seal.markScale * 1.05} dot={x.darkMarks.dot} spark={x.darkMarks.spark} />
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Wordmark x={x} word="#ffffff" />
          <DateBlock x={x} color={col.rule} align="left" />
        </div>
      </div>
      <div style={{ ...column, flex: 1, padding: l.padding, minWidth: 0 }}>
        <Bg x={x} color={col.title} />
        <Title x={x} color={col.title} scale={0.82} />
        <Eyebrow x={x} color={col.eyebrow} style={{ marginTop: l.titleGap * 0.7 }} />
        <NameLine x={x} color={col.name} rule={col.rule} width="100%" scale={0.92} />
        <Body x={x} color={col.body} width="100%" />
        <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 40, alignItems: 'end' }}>
          {[0, 1].map((i) => (
            <Signature key={i} x={x} s={x.signatories[i]} name={col.signName} role={col.signRole} rule={col.rule} />
          ))}
        </div>
      </div>
    </div>
  )
}

/* Bold — dark card in the theme's deepest colour, oversized mark as artwork. */
function Bold({ x }: { x: Ctx }) {
  const { col, l } = x
  const ring = x.d.seal.size * 3.2
  // Keep the text column clear of the ring, which sits far enough in to show the orange sparks.
  const w = Math.min(l.contentWidth, 560)
  const line = 'rgba(255,255,255,0.22)'
  return (
    <div style={{ ...column, background: col.title, borderRadius: l.radius, padding: l.padding }}>
      <Bg x={x} color="#ffffff" />
      {x.d.show.seal && (
        <div style={{ position: 'absolute', right: -ring * 0.12, top: '50%', transform: 'translateY(-50%)' }}>
          <BayanaMark size={ring} dot={x.darkMarks.dot} spark={x.darkMarks.spark} />
        </div>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Wordmark x={x} word="#ffffff" size={28} />
      </div>
      <Title x={x} color="#ffffff" style={{ marginTop: 44, maxWidth: w, position: 'relative' }} />
      <Eyebrow x={x} color={col.rule} style={{ marginTop: l.titleGap * 0.6, position: 'relative' }} />
      <NameLine x={x} color="#ffffff" rule={line} width={w} />
      <Body x={x} color={col.rule} width={w} style={{ position: 'relative' }} />
      <div
        style={{
          position: 'relative',
          marginTop: 'auto',
          display: 'grid',
          gridTemplateColumns: `repeat(2, ${l.signWidth}px) 1fr`,
          columnGap: l.signWidth * 0.3,
          alignItems: 'end',
        }}
      >
        {[0, 1].map((i) => (
          <Signature key={i} x={x} s={x.signatories[i]} name="#ffffff" role={col.rule} rule={line} />
        ))}
        <div style={{ justifySelf: 'end' }}>
          <DateBlock x={x} color={col.rule} />
        </div>
      </div>
    </div>
  )
}

/* -- Root ---------------------------------------------------------------- */

type Props = {
  content: Content
  design: Design
  recipient?: Recipient
  /** Preview only: the background pattern reacts to the pointer. */
  interactive?: boolean
  /** Pattern canvas pixel ratio; exports pass their own pixel ratio. */
  resolution?: number
}

export const Certificate = forwardRef<HTMLDivElement, Props>(function Certificate(
  { content, design, recipient, interactive = false, resolution = 2 },
  ref,
) {
  const x = resolve(content, design, recipient, interactive, resolution)
  const paper = PAPER[design.paper as keyof typeof PAPER] ?? PAPER.a4
  const inset = x.l.frameInset

  let layout: ReactNode
  if (design.template === 'formal') layout = <Formal x={x} />
  else if (design.template === 'split') layout = <Split x={x} width={paper.w - inset * 2} />
  else if (design.template === 'bold') layout = <Bold x={x} />
  else layout = <Classic x={x} />

  return (
    <div
      ref={ref}
      style={{
        width: paper.w,
        height: paper.h,
        background: x.col.frame,
        padding: inset,
        boxSizing: 'border-box',
        fontFamily: BODY,
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {layout}
    </div>
  )
})
