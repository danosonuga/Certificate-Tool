# Bayana Certificates

A local tool for customising and batch-exporting Bayana certificates of participation, tuned live with [DialKit](https://www.dialkit.dev/).

```bash
npm install
npm run dev
```

## How it works

- **Recipients** (left): add one at a time, paste a list (`Name, Skill` per line), or import a CSV. A per-recipient skill overrides the default `{skill}`. Names longer than the line shrink to fit. The list is saved in this browser.
- **DialKit** (right):
  - **Content**: title, body template (`{name}`, `{skill}`, `{event}`, `{date}`), signatories and signature images, date issued.
  - **Design**: template (Classic, Formal · centred, Split panel, Bold · dark; all read the same content), audience theme (Volunteers / NGOs / Donors), paper size, text colours (title, label, name, body, signatory, role, date), visibility toggles, seal, background (an original single-line volunteering scene and a looping line that swirls round the border, or the logo's dot rings; opacity, line weight, hand-drawn wobble, swirl loops/size/strands, cursor spotlight), type (Instrument Serif, Zodiak or Clash Display), layout, and surface colours. Use the version menu to save variants.
  - **Reset**: design, content, or everything back to the defaults (recipients are kept).
  - **Export**: PNG, PDF or SVG of the current certificate; all recipients as one PDF, a ZIP of PDFs, or a ZIP of SVGs. SVGs are true vector (real `<text>`, vector artwork, fonts embedded; only uploaded signatures and the dot pattern are embedded images), built by walking the rendered certificate in `src/export/svg.ts`.
  - **Developer kit (.zip)**: hands the design to engineering. It leads with the finished certificate, all text included, as `certificate.svg`, `certificate.png` and `certificate.pdf`. For generating one certificate per recipient it adds `template.json` (every text field's position, font, size, colour, alignment and `{placeholders}`), the matching text-free artwork in `layers/`, the fonts as `.woff2` and `.ttf`, a dependency-free `render.js` (browser canvas or Node `canvas`), a demo `index.html`, and a README with web, server, iOS, Android, Flutter and React Native notes. Field geometry is measured from the live render, so re-export whenever the design changes. Source: `src/devkit/`.

## Brand

Colours, themes and type come from the Bayana site tokens (`../bayana/app/globals.css`, `../bayana/TOKENS.md`). The mark and lockup are the official SVGs, only recoloured. Title and name default to Instrument Serif (Google Fonts, OFL); Zodiak and Clash Display (Fontshare) are bundled as alternatives. Body text uses the SF Pro system stack. The default background is an original single-line ink scene of adults volunteering (tree planting, relief distribution, health screening, a short course) with a swirling border line (`src/components/LineArt.tsx`, `figures.ts`, `swirl.ts`); the alternative extends the mark's staggered dot rings outward from the seal (`src/components/Pattern.tsx`). See `src/brand.ts`.
