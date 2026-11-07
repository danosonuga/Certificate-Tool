import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { DialRoot, useDialKit, useDialKitController } from 'dialkit'
import 'dialkit/styles.css'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import JSZip from 'jszip'
import { contentConfig, designConfig, exportConfig, resetConfig } from './dials'
import { themes, tokens } from './brand'
import { Certificate, PAPER, type Recipient } from './Certificate'
import { BayanaLogo } from './components/Brand'
import { buildDevKit } from './devkit/build'
import { certificateToSvg } from './export/svg'

const STORE_KEY = 'bayana-cert:recipients'

function loadRecipients(): Recipient[] {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function slug(s: string) {
  return s.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'certificate'
}

function download(href: string, filename: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  a.click()
}

// Background tabs pause requestAnimationFrame, so fall back to a timer or exports would hang.
const nextFrame = () =>
  new Promise((r) => {
    requestAnimationFrame(() => r(null))
    setTimeout(() => r(null), 60)
  })

export default function App() {
  const contentDial = useDialKitController('Content', contentConfig, { id: 'content', persist: true })
  const content = contentDial.values
  const designDial = useDialKitController('Design', designConfig, { id: 'design', persist: true })
  const design = designDial.values

  const [recipients, setRecipients] = useState<Recipient[]>(loadRecipients)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [batchRecipient, setBatchRecipient] = useState<Recipient | undefined>()
  const [busy, setBusy] = useState<string | null>(null)
  const selected = recipients.find((r) => r.id === selectedId)

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(recipients))
    } catch {
      /* storage unavailable: list lives for this session only */
    }
  }, [recipients])

  // Switching theme repaints every colour slot; individual colours can then be tweaked.
  const lastTheme = useRef(design.theme)
  useEffect(() => {
    if (design.theme === lastTheme.current) return
    lastTheme.current = design.theme
    const theme = themes[design.theme]
    if (theme)
      designDial.setValues({
        text: {
          title: theme.title,
          label: theme.eyebrow,
          name: theme.name,
          body: theme.body,
          signatory: theme.signName,
          role: theme.signRole,
          date: theme.signRole,
        },
        surfaces: { frame: theme.frame, card: theme.card, lines: theme.rule, seal: theme.seal, sealShade: theme.sealShade },
      })
  }, [design.theme, designDial])

  const exportRef = useRef<HTMLDivElement>(null)
  const paper = PAPER[design.paper as keyof typeof PAPER] ?? PAPER.a4

  async function show(r: Recipient | undefined) {
    flushSync(() => setBatchRecipient(r))
    await document.fonts.ready
    await nextFrame()
  }

  async function capture(r: Recipient | undefined, pixelRatio: number) {
    await show(r)
    return toPng(exportRef.current!, { pixelRatio, cacheBust: true })
  }

  async function captureSvg(r: Recipient | undefined) {
    await show(r)
    return new Blob([await certificateToSvg(exportRef.current!)], { type: 'image/svg+xml' })
  }

  function newPdf() {
    return new jsPDF({ orientation: 'landscape', unit: paper.unit, format: paper.pdf, compress: true })
  }

  function addPage(pdf: jsPDF, png: string) {
    const [w, h] = paper.pdf
    pdf.addImage(png, 'PNG', 0, 0, w, h, undefined, 'FAST')
  }

  async function run(label: string, job: () => Promise<void>) {
    if (busy) return
    setBusy(label)
    try {
      await job()
    } catch (err) {
      console.error(err)
      alert(`Export failed: ${err instanceof Error ? err.message : err}`)
    } finally {
      setBusy(null)
    }
  }

  const quality = useRef(3)
  const onExport = (action: string) => {
    const ratio = quality.current
    const current = selected
    const name = current?.name || content.previewName
    if (action === 'svg')
      run('Rendering SVG…', async () => {
        download(URL.createObjectURL(await captureSvg(current)), `Bayana-Certificate-${slug(name)}.svg`)
      })
    if (action === 'allSvg') {
      if (!recipients.length) return alert('Add recipients first.')
      run('Rendering…', async () => {
        const zip = new JSZip()
        for (const [i, r] of recipients.entries()) {
          setBusy(`Rendering ${i + 1} of ${recipients.length}…`)
          zip.file(`Bayana-Certificate-${String(i + 1).padStart(3, '0')}-${slug(r.name)}.svg`, await captureSvg(r))
        }
        download(URL.createObjectURL(await zip.generateAsync({ type: 'blob' })), 'Bayana-Certificates-SVG.zip')
      })
    }
    if (action === 'png')
      run('Rendering PNG…', async () => {
        download(await capture(current, ratio), `Bayana-Certificate-${slug(name)}.png`)
      })
    if (action === 'pdf')
      run('Rendering PDF…', async () => {
        const pdf = newPdf()
        addPage(pdf, await capture(current, ratio))
        pdf.save(`Bayana-Certificate-${slug(name)}.pdf`)
      })
    if (action === 'devKit')
      run('Building developer kit…', async () => {
        const blob = await buildDevKit({
          node: exportRef.current!,
          content,
          design,
          recipients,
          scale: ratio,
          prepare: () => show(undefined),
        })
        download(URL.createObjectURL(blob), 'bayana-certificate-kit.zip')
      })
    if (action === 'allPdf' || action === 'allZip') {
      if (!recipients.length) return alert('Add recipients first.')
      run('Rendering…', async () => {
        const zip = new JSZip()
        const book = newPdf()
        for (const [i, r] of recipients.entries()) {
          setBusy(`Rendering ${i + 1} of ${recipients.length}…`)
          const png = await capture(r, ratio)
          if (action === 'allPdf') {
            if (i > 0) book.addPage(paper.pdf, 'landscape')
            addPage(book, png)
          } else {
            const pdf = newPdf()
            addPage(pdf, png)
            zip.file(`Bayana-Certificate-${String(i + 1).padStart(3, '0')}-${slug(r.name)}.pdf`, pdf.output('arraybuffer'))
          }
        }
        if (action === 'allPdf') book.save('Bayana-Certificates.pdf')
        else download(URL.createObjectURL(await zip.generateAsync({ type: 'blob' })), 'Bayana-Certificates.zip')
      })
    }
  }
  // DialKit keeps the first onAction it sees, so route through a ref to always hit fresh state.
  const actionRef = useRef(onExport)
  actionRef.current = onExport
  const [onAction] = useState(() => (a: string) => actionRef.current(a))
  const exportDial = useDialKitController('Export', exportConfig, { id: 'export', persist: true, onAction })
  const exportValues = exportDial.values
  quality.current = Number(exportValues.quality) || 3

  // Back to the shipped defaults. Recipients are data, not configuration, so they stay.
  const resetRef = useRef((_: string) => {})
  resetRef.current = (action) => {
    const labels: Record<string, string> = {
      design: 'the design (template, theme, type, pattern, layout, colours)',
      content: 'the certificate text and signatories',
      all: 'all design, content and export settings',
    }
    if (!labels[action] || !confirm(`Reset ${labels[action]} to the defaults?`)) return
    if (action === 'design' || action === 'all') designDial.resetValues()
    if (action === 'content' || action === 'all') contentDial.resetValues()
    if (action === 'all') exportDial.resetValues()
  }
  const [onReset] = useState(() => (a: string) => resetRef.current(a))
  useDialKit('Reset', resetConfig, { id: 'reset', onAction: onReset })

  return (
    <div className="app">
      <header className="topbar">
        <BayanaLogo size={24} dot={tokens.markDot} spark={tokens.markSpark} word="#ffffff" />
        <span className="topbar-divider" />
        <span className="topbar-title">Certificates</span>
        {busy && <span className="topbar-status">{busy}</span>}
      </header>

      <Recipients
        recipients={recipients}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onChange={setRecipients}
      />

      <main className="stage">
        <Preview width={paper.w} height={paper.h}>
          <Certificate content={content} design={design} recipient={selected} interactive />
        </Preview>
        <p className="stage-hint">
          {selected ? `Previewing ${selected.name}` : 'Previewing the template'} · {recipients.length} recipient
          {recipients.length === 1 ? '' : 's'}
        </p>
      </main>

      <aside className="dials">
        <DialRoot mode="inline" theme="dark" productionEnabled versions="menu" />
      </aside>

      {/* Off-screen, unscaled copy used for exports. */}
      <div className="export-host" aria-hidden>
        <Certificate
          ref={exportRef}
          content={content}
          design={design}
          recipient={batchRecipient}
          resolution={quality.current}
        />
      </div>
    </div>
  )
}

function Preview({ width, height, children }: { width: number; height: number; children: React.ReactNode }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.6)
  useLayoutEffect(() => {
    const el = boxRef.current!
    const fit = () => setScale(Math.min(el.clientWidth / width, el.clientHeight / height))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [width, height])
  return (
    <div ref={boxRef} className="preview">
      <div className="preview-paper" style={{ width: width * scale, height: height * scale }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: '0 0' }}>{children}</div>
      </div>
    </div>
  )
}

type RecipientsProps = {
  recipients: Recipient[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onChange: (r: Recipient[]) => void
}

function parseList(text: string): Recipient[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line, i) => !(i === 0 && /^name\s*(,|\t|$)/i.test(line)))
    .map((line) => {
      const [name, ...rest] = line.split(/\t|,/)
      return { id: crypto.randomUUID(), name: name.trim(), skill: rest.join(',').trim() || undefined }
    })
    .filter((r) => r.name)
}

function Recipients({ recipients, selectedId, onSelect, onChange }: RecipientsProps) {
  const [draft, setDraft] = useState('')
  const [bulk, setBulk] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function add() {
    const added = parseList(draft)
    if (!added.length) return
    onChange([...recipients, ...added])
    onSelect(added[added.length - 1].id)
    setDraft('')
  }

  async function importFile(file: File) {
    const added = parseList(await file.text())
    onChange([...recipients, ...added])
  }

  function update(id: string, patch: Partial<Recipient>) {
    onChange(recipients.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function remove(id: string) {
    onChange(recipients.filter((r) => r.id !== id))
    if (selectedId === id) onSelect(null)
  }

  return (
    <aside className="recipients">
      <div className="panel-head">
        <h2>Recipients</h2>
        <span className="count">{recipients.length}</span>
      </div>

      <form
        className="add"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        {bulk ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={'One per line — Name, Skill\nAda Obi, Photographer\nTunde Bello, First aid'}
            rows={6}
          />
        ) : (
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Name, Skill (optional)" />
        )}
        <div className="add-actions">
          <button type="submit" className="btn primary">
            Add
          </button>
          <button type="button" className="btn" onClick={() => setBulk(!bulk)}>
            {bulk ? 'Single' : 'Paste list'}
          </button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            CSV
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importFile(f)
              e.target.value = ''
            }}
          />
        </div>
      </form>

      <ul className="list">
        <li>
          <button className={`row template ${selectedId === null ? 'active' : ''}`} onClick={() => onSelect(null)}>
            Template preview
          </button>
        </li>
        {recipients.map((r) => (
          <li key={r.id} className={`row ${selectedId === r.id ? 'active' : ''}`} onClick={() => onSelect(r.id)}>
            <input
              className="row-name"
              value={r.name}
              onChange={(e) => update(r.id, { name: e.target.value })}
              onFocus={() => onSelect(r.id)}
              aria-label="Recipient name"
            />
            <input
              className="row-skill"
              value={r.skill ?? ''}
              onChange={(e) => update(r.id, { skill: e.target.value || undefined })}
              onFocus={() => onSelect(r.id)}
              placeholder="Default skill"
              aria-label="Recipient skill"
            />
            <button className="row-remove" onClick={(e) => { e.stopPropagation(); remove(r.id) }} aria-label={`Remove ${r.name}`}>
              ×
            </button>
          </li>
        ))}
      </ul>

      {recipients.length > 0 && (
        <button
          className="btn ghost clear"
          onClick={() => {
            if (confirm(`Remove all ${recipients.length} recipients?`)) {
              onChange([])
              onSelect(null)
            }
          }}
        >
          Clear list
        </button>
      )}
    </aside>
  )
}
