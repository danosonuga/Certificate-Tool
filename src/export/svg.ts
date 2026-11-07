/* Converts the rendered certificate into a standalone SVG.
   The certificate is built from a small, known set of pieces, so instead of a
   foreignObject snapshot (which Figma, Illustrator and most native renderers
   ignore) this walks the DOM and emits real SVG:
   - backgrounds and rounded cards → <rect>
   - rules and keylines (CSS borders) → <line> / stroked <rect>
   - inline SVG (seal, logo, swirl, scene) → nested <svg>, unchanged
   - text fields → <text>, one <tspan> per rendered line, at the browser's own
     line breaks and baselines
   - <img> (signatures) and <canvas> (dot pattern) → embedded <image>
   Overflow clipping and opacity become <clipPath> and group opacity. */

const woff2 = import.meta.glob('../assets/fonts/*.woff2', { query: '?url', import: 'default', eager: true }) as Record<string, string>

const FONT_FILES: Record<string, string> = {
  'Instrument Serif|400|normal': 'InstrumentSerif-Regular',
  'Instrument Serif|400|italic': 'InstrumentSerif-Italic',
  'Zodiak|400|normal': 'Zodiak-400',
  'Zodiak|400|italic': 'Zodiak-400i',
  'Zodiak|700|normal': 'Zodiak-700',
  'Clash Display|500|normal': 'ClashDisplay-500',
  'Clash Display|600|normal': 'ClashDisplay-600',
  'Clash Display|700|normal': 'ClashDisplay-700',
}

const n = (v: number) => Math.round(v * 100) / 100
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const visible = (color: string) => color && color !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(color)

async function dataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(blob)
  })
}

function imageData(img: HTMLImageElement) {
  if (img.src.startsWith('data:')) return img.src
  const c = document.createElement('canvas')
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  c.getContext('2d')!.drawImage(img, 0, 0)
  return c.toDataURL('image/png')
}

/* The browser's own line breaks: walk the text node a character at a time
   and start a new line whenever the glyph box moves down. */
function renderedLines(el: HTMLElement) {
  const node = [...el.childNodes].find((c) => c.nodeType === Node.TEXT_NODE)
  if (!node?.textContent) return []
  const text = node.textContent
  const range = document.createRange()
  const lines: { left: number; right: number; top: number; text: string }[] = []
  let cur: (typeof lines)[number] | undefined
  for (let i = 0; i < text.length; i++) {
    range.setStart(node, i)
    range.setEnd(node, i + 1)
    const r = range.getClientRects()[0]
    if (!r) {
      if (cur) cur.text += text[i]
      continue
    }
    if (!cur || r.top - cur.top > 2) {
      cur = { left: r.left, right: r.right, top: r.top, text: '' }
      lines.push(cur)
    }
    cur.text += text[i]
    cur.right = Math.max(cur.right, r.right)
  }
  return lines.map((l) => ({ ...l, text: l.text.replace(/\s+$/, '') })).filter((l) => l.text)
}

function textField(el: HTMLElement, cs: CSSStyleDeclaration, ox: number, oy: number, fonts: Set<string>) {
  const box = el.getBoundingClientRect()
  const probe = document.createElement('span')
  probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'
  el.prepend(probe)
  const baseline = probe.getBoundingClientRect().bottom - box.top
  probe.remove()
  const lineHeight = parseFloat(cs.lineHeight) || box.height
  const upper = cs.textTransform === 'uppercase'
  const family = cs.fontFamily
  const first = family.split(',')[0].trim().replace(/^["']|["']$/g, '')
  const weight = Number(cs.fontWeight) || 400
  const style = cs.fontStyle === 'italic' ? 'italic' : 'normal'
  fonts.add(`${first}|${weight}|${style}`)
  const spacing = parseFloat(cs.letterSpacing) || 0
  const tspans = renderedLines(el)
    .map((l, i) => {
      const t = upper ? l.text.toUpperCase() : l.text
      return `<tspan x="${n(l.left - ox)}" y="${n(box.top - oy + baseline + i * lineHeight)}">${esc(t)}</tspan>`
    })
    .join('')
  return `<text data-field="${esc(el.dataset.field ?? '')}" xml:space="preserve" font-family="${esc(family)}" font-size="${n(parseFloat(cs.fontSize))}" font-weight="${weight}" font-style="${style}"${spacing ? ` letter-spacing="${n(spacing)}"` : ''} fill="${cs.color}">${tspans}</text>`
}

function borders(cs: CSSStyleDeclaration, x: number, y: number, w: number, h: number, rx: number) {
  const side = (s: 'Top' | 'Right' | 'Bottom' | 'Left') => ({
    width: parseFloat(cs.getPropertyValue(`border-${s.toLowerCase()}-width`)) || 0,
    color: cs.getPropertyValue(`border-${s.toLowerCase()}-color`),
    style: cs.getPropertyValue(`border-${s.toLowerCase()}-style`),
  })
  const sides = { Top: side('Top'), Right: side('Right'), Bottom: side('Bottom'), Left: side('Left') }
  const on = (s: keyof typeof sides) => sides[s].width > 0 && sides[s].style !== 'none' && visible(sides[s].color)
  if ((['Top', 'Right', 'Bottom', 'Left'] as const).every(on)) {
    const b = sides.Top
    return `<rect x="${n(x + b.width / 2)}" y="${n(y + b.width / 2)}" width="${n(w - b.width)}" height="${n(h - b.width)}" rx="${n(Math.max(0, rx - b.width / 2))}" fill="none" stroke="${b.color}" stroke-width="${b.width}"/>`
  }
  const out: string[] = []
  const line = (s: keyof typeof sides, x1: number, y1: number, x2: number, y2: number) =>
    on(s) && out.push(`<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${sides[s].color}" stroke-width="${sides[s].width}"/>`)
  line('Top', x, y + sides.Top.width / 2, x + w, y + sides.Top.width / 2)
  line('Bottom', x, y + h - sides.Bottom.width / 2, x + w, y + h - sides.Bottom.width / 2)
  line('Left', x + sides.Left.width / 2, y, x + sides.Left.width / 2, y + h)
  line('Right', x + w - sides.Right.width / 2, y, x + w - sides.Right.width / 2, y + h)
  return out.join('')
}

let clipId = 0

function walk(el: Element, ox: number, oy: number, fonts: Set<string>): string {
  const cs = getComputedStyle(el)
  if (cs.display === 'none' || cs.visibility === 'hidden') return ''
  const r = el.getBoundingClientRect()
  const x = r.left - ox
  const y = r.top - oy
  const w = r.width
  const h = r.height

  if (el instanceof SVGSVGElement) {
    const clone = el.cloneNode(true) as SVGSVGElement
    clone.removeAttribute('style')
    clone.removeAttribute('class')
    clone.setAttribute('x', String(n(x)))
    clone.setAttribute('y', String(n(y)))
    clone.setAttribute('width', String(n(w)))
    clone.setAttribute('height', String(n(h)))
    clone.setAttribute('overflow', 'visible')
    return new XMLSerializer().serializeToString(clone)
  }
  if (!(el instanceof HTMLElement)) return ''

  const rx = parseFloat(cs.borderTopLeftRadius) || 0
  const parts: string[] = []
  if (visible(cs.backgroundColor))
    parts.push(`<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"${rx ? ` rx="${n(Math.min(rx, w / 2, h / 2))}"` : ''} fill="${cs.backgroundColor}"/>`)
  parts.push(borders(cs, x, y, w, h, rx))

  if (el instanceof HTMLCanvasElement && w && h)
    parts.push(`<image x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" preserveAspectRatio="none" href="${el.toDataURL('image/png')}"/>`)
  else if (el instanceof HTMLImageElement && el.complete && w && h)
    parts.push(`<image x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" preserveAspectRatio="none" href="${imageData(el)}"/>`)
  else if (el.dataset.field) parts.push(textField(el, cs, ox, oy, fonts))
  else for (const child of el.children) parts.push(walk(child, ox, oy, fonts))

  let body = parts.join('')
  if (!body) return ''
  if (cs.overflow === 'hidden' || cs.overflowX === 'hidden') {
    const id = `clip${++clipId}`
    body = `<clipPath id="${id}"><rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"${rx ? ` rx="${n(rx)}"` : ''}/></clipPath><g clip-path="url(#${id})">${body}</g>`
  }
  const opacity = parseFloat(cs.opacity)
  if (opacity < 1) body = `<g opacity="${n(opacity)}">${body}</g>`
  return body
}

/** Serialise a rendered certificate node to a standalone SVG string with its web fonts embedded. */
export async function certificateToSvg(root: HTMLElement) {
  clipId = 0
  const origin = root.getBoundingClientRect()
  const fonts = new Set<string>()
  const body = walk(root, origin.left, origin.top, fonts)

  const faces = await Promise.all(
    [...fonts].map(async (key) => {
      const file = FONT_FILES[key]
      const url = file && Object.entries(woff2).find(([p]) => p.endsWith(`/${file}.woff2`))?.[1]
      if (!url) return ''
      const [family, weight, style] = key.split('|')
      const src = await dataUrl(await (await fetch(url)).blob())
      return `@font-face{font-family:"${family}";font-weight:${weight};font-style:${style};src:url(${src}) format("woff2")}`
    }),
  )

  const w = n(origin.width)
  const h = n(origin.height)
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<title>Bayana certificate</title>
<defs><style>${faces.join('')}</style></defs>
${body}
</svg>
`
}
