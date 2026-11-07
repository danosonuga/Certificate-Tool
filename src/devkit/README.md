# Bayana certificate · developer kit

Everything needed to use this certificate in any app, without the design tool.

## Ready-made certificates (all text included)

| File | Use it for |
| --- | --- |
| `certificate.svg` | Vector, with every line of text as real `<text>` and fonts embedded. Web, Figma, Illustrator, print |
| `certificate.png` | Image at {{SCALE}}× (`{{PX_W}} × {{PX_H}}` px). Anywhere |
| `certificate.pdf` | Print-ready page |

These show the certificate exactly as designed, with the text set in the design tool. Use them as-is, or as the visual reference for the build.

## Generating certificates for each recipient

To put a different name, skill, event or date on every certificate, the kit splits the design in two:

1. **`layers/artwork-no-text.png`**: all the artwork with the text removed (frame, line drawing, seal, logo, rules, signature images), at {{SCALE}}×. It has no text **on purpose**: your app draws the text on top.
2. **`template.json`**: every text field as data: position, box size, font, size, colour, alignment, wrapping, and the text with `{placeholders}`.

`render.js` (about 100 lines, no dependencies) draws the artwork, then every text field, giving the full certificate with all text. It ports to any platform.

| File | What it is |
| --- | --- |
| `template.json` | Layout spec for the text |
| `layers/artwork-no-text.png` | Text-free artwork, only for use with `template.json` |
| `render.js` | Reference renderer (browser canvas and Node `canvas`) |
| `index.html` | Working demo: type a name, render the full certificate, download PNG |
| `sample-data.json` | Example recipients |
| `fonts/*.woff2` | Web fonts |
| `fonts/*.ttf` | Mobile and server fonts (iOS, Android, Flutter, Node) |
| `design-config.json` | The designer's settings that produced this kit (for reference only) |

## Data you pass in

```json
{
  "name": "Adaeze Okonkwo",
  "skill": "Event Photographer",
  "event": "Lagos Flood Relief Drive",
  "date": "12 October 2026",
  "dateIssued": "6 November 2026"
}
```

Anything you leave out falls back to `template.json → defaults`. To override a whole field's text, pass `fields: { "<fieldId>": "text" }`.

## Coordinates and units

- The canvas is `width × height` units (`{{W}} × {{H}}`): A4/Letter landscape at 96 dpi. Multiply by your scale for pixels.
- Each field has a box `x, y, width, height`. Text is drawn on **baselines**: the first line sits at `y + baseline`, and each further line adds `lineHeight`.
- `align` is `left | center | right` within the box.
- `letterSpacing` is in units and is added after every character.
- `uppercase: true` means upper-case the text before drawing.
- `wrap: true` means word-wrap to `width`.
- `shrinkToFit: true` (the name) means scale the font down until the line fits `width`, keeping the same baseline.

## Fonts

`template.json → fonts` lists each face with its web (`.woff2`) and native (`.ttf`) file. Fields whose `font.family` is `"system"` use the platform's system UI font, by design (Bayana's body font is SF Pro, which is not redistributable): SF on iOS/macOS, Roboto on Android, `system-ui` on the web.

## Web

Serve the folder (modules can't load from `file://`), then open `index.html`:

```bash
npx serve .
```

In your app:

```js
import { loadFonts, renderCertificate } from './render.js'

const spec = await (await fetch('/certificate/template.json')).json()
await loadFonts(spec, '/certificate/')
const bg = new Image(); bg.src = '/certificate/layers/artwork-no-text.png'; await bg.decode()

const scale = 3
const canvas = document.createElement('canvas')
canvas.width = spec.width * scale
canvas.height = spec.height * scale
renderCertificate(canvas.getContext('2d'), spec, { name: 'Adaeze Okonkwo' }, { background: bg, scale })
const png = canvas.toDataURL('image/png')
```

For a PDF, add the PNG to an A4 landscape page (for example with jsPDF: `pdf.addImage(png, 'PNG', 0, 0, 297, 210)`).

## Server (Node): one endpoint for web and mobile

The most uniform setup is to render on the server and have every client fetch a PNG or PDF.

```js
import { createCanvas, loadImage, registerFont } from 'canvas' // npm i canvas
import { renderCertificate } from './render.js'
import spec from './template.json' with { type: 'json' }

for (const f of spec.fonts) registerFont(f.ttf, { family: f.family, weight: String(f.weight), style: f.style })
const background = await loadImage('layers/artwork-no-text.png')

export function certificatePng(data, scale = 3) {
  const canvas = createCanvas(spec.width * scale, spec.height * scale)
  renderCertificate(canvas.getContext('2d'), spec, data, { background, scale })
  return canvas.toBuffer('image/png')
}
```

## Mobile, rendering on the device

Bundle `layers/artwork-no-text.png`, `template.json` and `fonts/*.ttf` in the app, then port `renderCertificate`. The steps are the same everywhere:

1. Create a bitmap of `width × height × scale` and draw `layers/artwork-no-text.png` to fill it.
2. For each field: resolve the text, set the font (family, weight, style, `size × scale`) and colour, apply `uppercase`/`letterSpacing`, wrap or shrink, and align in the box.
3. Draw each line at `(x, y + baseline + i × lineHeight) × scale` on the alphabetic baseline.

| Platform | Bitmap | Text |
| --- | --- | --- |
| iOS (Swift) | `UIGraphicsImageRenderer` | `NSAttributedString.draw(at:)` with `.kern`; register TTFs in `Info.plist` (`UIAppFonts`) |
| Android (Kotlin) | `Bitmap` + `Canvas` | `Paint` with `Typeface.createFromAsset`, `letterSpacing = spacing / size` (em) |
| Flutter | `PictureRecorder` + `Canvas` | `TextPainter` with `TextStyle(fontFamily, letterSpacing, height)`; declare TTFs in `pubspec.yaml` |
| React Native | `@shopify/react-native-skia` | Skia `Paragraph` or `drawText`; or load `index.html` in a WebView |

Note that native text APIs usually position text by the top of the line, not the baseline. Convert using the font's ascent: `top = baselineY − ascent`.

Re-export this kit from the design tool whenever the design changes. `template.json` and `layers/artwork-no-text.png` always travel together.
