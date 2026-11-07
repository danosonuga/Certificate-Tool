// Bayana certificate renderer. No dependencies.
//
// Draws layers/artwork-no-text.png, then every text field from template.json onto a 2D
// canvas context. Works with a browser <canvas> and with node-canvas
// (`npm i canvas`), which shares the same API. Mobile apps can port these
// ~100 lines directly: the README maps each step to iOS, Android and Flutter.

const SYSTEM_STACK =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

/** Fill a field's template with data, falling back to the template's defaults. */
export function resolveText(field, spec, data = {}) {
  const vars = { ...spec.defaults, ...data }
  const raw = (data.fields && data.fields[field.id]) ?? field.text
  const text = raw.replace(/\{(\w+)\}/g, (match, key) => (vars[key] != null ? String(vars[key]) : match))
  return field.uppercase ? text.toUpperCase() : text
}

function fontFor(field, size) {
  const family = field.font.family === 'system' ? SYSTEM_STACK : `"${field.font.family}", ${SYSTEM_STACK}`
  return `${field.font.style} ${field.font.weight} ${size}px ${family}`
}

// Canvases with native letterSpacing (current browsers) keep the font's kerning.
// Others (e.g. node-canvas) fall back to placing letters one by one.
const native = (ctx) => 'letterSpacing' in ctx

function measure(ctx, text, spacing) {
  if (native(ctx)) {
    ctx.letterSpacing = `${spacing}px`
    return ctx.measureText(text).width
  }
  return ctx.measureText(text).width + spacing * [...text].length
}

function drawText(ctx, text, x, y, spacing) {
  if (native(ctx)) {
    ctx.letterSpacing = `${spacing}px`
    return ctx.fillText(text, x, y)
  }
  if (!spacing) return ctx.fillText(text, x, y)
  for (const ch of text) {
    ctx.fillText(ch, x, y)
    x += ctx.measureText(ch).width + spacing
  }
}

function wrapLines(ctx, text, maxWidth, spacing) {
  const lines = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word
      if (line && measure(ctx, next, spacing) > maxWidth) {
        lines.push(line)
        line = word
      } else line = next
    }
    lines.push(line)
  }
  return lines
}

/**
 * Render one certificate.
 * @param ctx        CanvasRenderingContext2D sized spec.width*scale × spec.height*scale
 * @param spec       parsed template.json
 * @param data       { name, skill, event, date, dateIssued, fields?: { [fieldId]: text } }
 * @param options    { background: loaded image of layers/artwork-no-text.png, scale: 1, kerning: 'none' | 'normal' }
 */
export function renderCertificate(ctx, spec, data = {}, { background, scale = 1, kerning = 'none' } = {}) {
  ctx.save()
  if (background) ctx.drawImage(background, 0, 0, spec.width * scale, spec.height * scale)
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  // Matches the design tool's text rendering, where letter-spaced text is not kerned.
  if ('fontKerning' in ctx) ctx.fontKerning = kerning

  // Text is laid out in device pixels (every unit × scale) rather than through
  // ctx.scale(), because some canvases don't scale letter-spacing with the transform.
  for (const field of spec.fields) {
    const text = resolveText(field, spec, data)
    if (!text.trim()) continue
    const box = { x: field.x * scale, width: field.width * scale }
    let size = field.size * scale
    let spacing = field.letterSpacing * scale
    ctx.font = fontFor(field, size)

    // Long names shrink to one line; the baseline stays on the rule.
    if (field.shrinkToFit) {
      const w = measure(ctx, text, spacing)
      if (w > box.width) {
        const k = box.width / w
        size *= k
        spacing *= k
        ctx.font = fontFor(field, size)
      }
    }

    const lines = field.wrap ? wrapLines(ctx, text, box.width, spacing) : [text]
    ctx.fillStyle = field.color
    lines.forEach((line, i) => {
      const w = measure(ctx, line, spacing)
      const x = field.align === 'center' ? box.x + (box.width - w) / 2 : field.align === 'right' ? box.x + box.width - w : box.x
      drawText(ctx, line, x, (field.y + field.baseline + i * field.lineHeight) * scale, spacing)
    })
  }
  ctx.restore()
}

/** Browser only: register the template's web fonts before rendering. */
export async function loadFonts(spec, baseUrl = './') {
  await Promise.all(
    spec.fonts.map(async (font) => {
      const face = new FontFace(font.family, `url(${baseUrl}${font.web})`, {
        weight: String(font.weight),
        style: font.style,
      })
      document.fonts.add(await face.load())
    }),
  )
}
