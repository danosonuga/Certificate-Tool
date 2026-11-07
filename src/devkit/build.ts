import { toPng } from 'html-to-image'
import JSZip from 'jszip'
import { jsPDF } from 'jspdf'
import type { Content, Design, Recipient } from '../Certificate'
import { PAPER } from '../Certificate'
import renderJs from './render.js?raw'
import demoHtml from './index.html?raw'
import readme from './README.md?raw'
import { certificateToSvg } from '../export/svg'

/* Developer kit: the certificate split into text-free artwork (background.png)
   and a layout spec (template.json) that any platform can draw text onto.
   Field geometry is measured from the rendered certificate, so the kit always
   matches what the designer sees. */

const woff2 = import.meta.glob('../assets/fonts/*.woff2', { query: '?url', import: 'default', eager: true }) as Record<string, string>
const ttf = import.meta.glob('../assets/fonts/ttf/*.ttf', { query: '?url', import: 'default', eager: true }) as Record<string, string>

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

export type KitField = {
  id: string
  text: string
  x: number
  y: number
  width: number
  height: number
  baseline: number
  lineHeight: number
  font: { family: string; weight: number; style: 'normal' | 'italic' }
  size: number
  letterSpacing: number
  color: string
  align: 'left' | 'center' | 'right'
  uppercase: boolean
  wrap: boolean
  shrinkToFit: boolean
}

const r2 = (n: number) => Math.round(n * 100) / 100

function hex(color: string) {
  const m = color.match(/\d+(\.\d+)?/g)
  if (!m || m.length < 3) return color
  const [r, g, b] = m.map(Number)
  const out = '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
  return m.length > 3 && Number(m[3]) < 1 ? `${out}${Math.round(Number(m[3]) * 255).toString(16).padStart(2, '0')}` : out
}

function family(css: string) {
  const first = css.split(',')[0].trim().replace(/^["']|["']$/g, '')
  return ['Instrument Serif', 'Zodiak', 'Clash Display'].includes(first) ? first : 'system'
}

function templates(c: Content): Record<string, string> {
  return {
    title: c.title,
    label: c.presentedTo,
    name: '{name}',
    body: c.body,
    signatory1Name: c.signatory1.name1,
    signatory1Role: c.signatory1.role1,
    signatory2Name: c.signatory2.name2,
    signatory2Role: c.signatory2.role2,
    dateLabel: c.dateLabel,
    dateIssued: '{dateIssued}',
  }
}

function measure(root: HTMLElement, c: Content): KitField[] {
  const origin = root.getBoundingClientRect()
  const text = templates(c)
  return [...root.querySelectorAll<HTMLElement>('[data-field]')].map((el) => {
    const id = el.dataset.field!
    const cs = getComputedStyle(el)
    const box = el.getBoundingClientRect()
    // A zero-size inline block sits exactly on the first line's baseline.
    const probe = document.createElement('span')
    probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'
    el.prepend(probe)
    const baseline = probe.getBoundingClientRect().bottom - box.top
    probe.remove()
    const align = cs.textAlign === 'center' ? 'center' : cs.textAlign === 'right' || cs.textAlign === 'end' ? 'right' : 'left'
    const lineHeight = parseFloat(cs.lineHeight)
    return {
      id,
      text: text[id] ?? el.textContent ?? '',
      x: r2(box.left - origin.left),
      y: r2(box.top - origin.top),
      width: r2(box.width),
      height: r2(box.height),
      baseline: r2(baseline),
      lineHeight: r2(Number.isFinite(lineHeight) ? lineHeight : box.height),
      font: {
        family: family(cs.fontFamily),
        weight: Number(cs.fontWeight) || 400,
        style: cs.fontStyle === 'italic' ? 'italic' : 'normal',
      },
      size: r2(Number(el.dataset.size) || parseFloat(cs.fontSize)),
      letterSpacing: r2(parseFloat(cs.letterSpacing) || 0),
      color: hex(cs.color),
      align,
      uppercase: cs.textTransform === 'uppercase',
      wrap: id === 'title' || id === 'body',
      shrinkToFit: id === 'name',
    }
  })
}

async function capture(node: HTMLElement, pixelRatio: number, blankText: boolean) {
  const fields = [...node.querySelectorAll<HTMLElement>('[data-field]')]
  if (blankText) fields.forEach((el) => (el.style.visibility = 'hidden'))
  try {
    return await toPng(node, { pixelRatio, cacheBust: true })
  } finally {
    if (blankText) fields.forEach((el) => (el.style.visibility = ''))
  }
}

const dataUrlToBlob = async (url: string) => (await fetch(url)).blob()

type Options = {
  node: HTMLElement
  content: Content
  design: Design
  recipients: Recipient[]
  scale: number
  /** Renders the template (no recipient) into `node` and resolves when it is painted. */
  prepare: () => Promise<unknown>
}

export async function buildDevKit({ node, content, design, recipients, scale, prepare }: Options) {
  await prepare()
  const paper = PAPER[design.paper as keyof typeof PAPER] ?? PAPER.a4
  const fields = measure(node, content)
  const preview = await capture(node, scale, false)
  const previewSvg = await certificateToSvg(node)
  const background = await capture(node, scale, true)

  const faces = new Map<string, { family: string; weight: number; style: string; file: string }>()
  for (const f of fields) {
    const key = `${f.font.family}|${f.font.weight}|${f.font.style}`
    const file = FONT_FILES[key]
    if (file) faces.set(key, { ...f.font, file })
  }

  const spec = {
    name: 'Bayana certificate',
    version: 1,
    generatedAt: new Date().toISOString(),
    template: design.template,
    theme: design.theme,
    paper: { id: design.paper, pdfSize: paper.pdf, pdfUnit: paper.unit },
    width: paper.w,
    height: paper.h,
    background: 'layers/artwork-no-text.png',
    backgroundScale: scale,
    defaults: {
      name: content.previewName,
      skill: content.skill,
      event: content.event,
      date: content.eventDate,
      dateIssued: content.dateIssued,
    },
    fonts: [...faces.values()].map((f) => ({
      family: f.family,
      weight: f.weight,
      style: f.style,
      web: `fonts/${f.file}.woff2`,
      ttf: `fonts/${f.file}.ttf`,
    })),
    fields,
  }

  const zip = new JSZip()
  const dir = zip.folder('bayana-certificate-kit')!
  // The finished certificate, with every line of text, in each format.
  const pdf = new jsPDF({ orientation: 'landscape', unit: paper.unit, format: paper.pdf, compress: true })
  pdf.addImage(preview, 'PNG', 0, 0, paper.pdf[0], paper.pdf[1], undefined, 'FAST')
  dir.file('certificate.png', await dataUrlToBlob(preview))
  dir.file('certificate.svg', previewSvg)
  dir.file('certificate.pdf', pdf.output('arraybuffer'))
  // Only for apps that draw the text themselves from template.json.
  dir.file('template.json', JSON.stringify(spec, null, 2))
  dir.folder('layers')!.file('artwork-no-text.png', await dataUrlToBlob(background))
  dir.file('render.js', renderJs)
  dir.file('index.html', demoHtml)
  dir.file(
    'README.md',
    readme
      .replaceAll('{{SCALE}}', String(scale))
      .replaceAll('{{PX_W}}', String(paper.w * scale))
      .replaceAll('{{PX_H}}', String(paper.h * scale))
      .replaceAll('{{W}}', String(paper.w))
      .replaceAll('{{H}}', String(paper.h)),
  )
  dir.file(
    'sample-data.json',
    JSON.stringify(
      (recipients.length ? recipients : [{ name: 'Adaeze Okonkwo', skill: 'Event Photographer' }]).map((r) => ({
        name: r.name,
        ...(r.skill ? { skill: r.skill } : {}),
      })),
      null,
      2,
    ),
  )
  dir.file('design-config.json', JSON.stringify({ content, design }, null, 2))

  const fonts = dir.folder('fonts')!
  const pick = (files: Record<string, string>, name: string) =>
    Object.entries(files).find(([path]) => path.endsWith(`/${name}`))?.[1]
  await Promise.all(
    [...faces.values()].flatMap((f) =>
      [`${f.file}.woff2`, `${f.file}.ttf`].map(async (name) => {
        const url = name.endsWith('.ttf') ? pick(ttf, name) : pick(woff2, name)
        if (url) fonts.file(name, await (await fetch(url)).blob())
      }),
    ),
  )

  return zip.generateAsync({ type: 'blob' })
}
