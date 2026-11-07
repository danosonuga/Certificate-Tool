import type { DialConfig } from 'dialkit'
import { themes } from './brand'

const v = themes.volunteers

export const contentConfig = {
  title: 'Certificate of Participation',
  presentedTo: 'This certificate is presented to',
  previewName: { type: 'text', default: 'Volunteer’s name', placeholder: 'Shown when no recipient is selected' },
  body: {
    type: 'text',
    default: 'For successfully volunteering as {skill} to {event} on the {date}',
    placeholder: 'Use {name}, {skill}, {event}, {date}',
  },
  skill: '[skill name]',
  event: '[Event name]',
  eventDate: '[date of event]',
  dateLabel: 'Date issued:',
  dateIssued: '[DATE]',
  signatory1: {
    name1: 'Name',
    role1: 'Position, Company',
    signature1: { type: 'image' },
  },
  signatory2: {
    name2: 'Name',
    role2: 'Position, Company',
    signature2: { type: 'image' },
  },
} satisfies DialConfig

export const designConfig = {
  template: {
    type: 'select',
    options: [
      { value: 'classic', label: 'Classic' },
      { value: 'formal', label: 'Formal · centred' },
      { value: 'split', label: 'Split panel' },
      { value: 'bold', label: 'Bold · dark' },
    ],
    default: 'classic',
  },
  theme: {
    type: 'select',
    options: [
      { value: 'volunteers', label: 'Volunteers · purple' },
      { value: 'ngos', label: 'NGOs · orange' },
      { value: 'donors', label: 'Donors · blue' },
    ],
    default: 'volunteers',
  },
  paper: {
    type: 'select',
    options: [
      { value: 'a4', label: 'A4 landscape' },
      { value: 'letter', label: 'US Letter landscape' },
    ],
    default: 'a4',
  },
  // One swatch per piece of text. Picking a theme repaints these; edit any after.
  text: {
    title: v.title,
    label: v.eyebrow,
    name: v.name,
    body: v.body,
    signatory: v.signName,
    role: v.signRole,
    date: v.signRole,
  },
  show: {
    seal: true,
    wordmark: true,
    signatory2: true,
    date: true,
  },
  seal: {
    size: [142, 80, 220, 1],
    ribbon: true,
    markScale: [0.62, 0.4, 0.85, 0.01],
    dots: {
      type: 'select',
      options: [
        { value: 'brand', label: 'Brand (blue + orange)' },
        { value: 'tonal', label: 'Tonal (lavender + orange)' },
        { value: 'white', label: 'White + orange' },
      ],
      default: 'brand',
    },
  },
  pattern: {
    show: true,
    style: {
      type: 'select',
      options: [
        { value: 'lineart', label: 'Line drawing · volunteering' },
        { value: 'dots', label: 'Dot rings · logo' },
      ],
      default: 'lineart',
    },
    scene: true,
    swirl: true,
    lineOpacity: [0.2, 0, 0.6, 0.01],
    lineWeight: [1.4, 0.6, 3, 0.1],
    wobble: [2.5, 0, 8, 0.5],
    swirlInset: [26, 0, 80, 1],
    swirlLoops: [46, 12, 120, 1],
    swirlSize: [17, 4, 40, 0.5],
    swirlDrift: [7, 0, 30, 0.5],
    swirlStrands: [2, 1, 2, 1],
    origin: {
      type: 'pad',
      x: [0.88, 0, 1, 0.01],
      y: [0.18, 0, 1, 0.01],
      labels: { x: 'Centre X', y: 'Centre Y' },
    },
    hole: [96, 0, 300, 1],
    opacity: [0.08, 0, 0.3, 0.005],
    dotSize: [2.2, 1, 6, 0.1],
    growth: [0.025, 0, 0.12, 0.005],
    spacing: [2.8, 1.8, 5, 0.1],
    fade: [0.75, 0, 1, 0.01],
    spotlight: true,
    spotlightSize: [220, 80, 500, 10],
    spotlightBoost: [4, 1, 10, 0.5],
  },
  type: {
    _collapsed: true,
    face: {
      type: 'select',
      options: [
        { value: 'instrument', label: 'Instrument Serif' },
        { value: 'zodiak', label: 'Zodiak' },
        { value: 'clash', label: 'Clash Display (brand)' },
      ],
      default: 'instrument',
    },
    nameItalic: true,
    titleSize: [56, 32, 80, 1],
    titleTracking: [-1, -3, 1, 0.1],
    eyebrowSize: [14, 10, 20, 0.5],
    eyebrowTracking: [0.3, 0, 0.5, 0.01],
    nameSize: [54, 28, 80, 1],
    bodySize: [21, 14, 28, 0.5],
    bodyLeading: [1.65, 1.2, 2, 0.05],
    signSize: [17, 12, 24, 0.5],
  },
  layout: {
    _collapsed: true,
    frameInset: [39, 0, 80, 1],
    radius: [34, 0, 64, 1],
    padding: [58, 32, 96, 1],
    contentWidth: [696, 480, 820, 1],
    titleGap: [70, 24, 140, 1],
    signWidth: [200, 140, 300, 1],
  },
  surfaces: {
    _collapsed: true,
    frame: v.frame,
    card: v.card,
    lines: v.rule,
    seal: v.seal,
    sealShade: v.sealShade,
  },
} satisfies DialConfig

export const exportConfig = {
  quality: {
    type: 'select',
    options: [
      { value: '2', label: 'Standard (2×)' },
      { value: '3', label: 'Print (3×)' },
      { value: '4', label: 'High (4×)' },
    ],
    default: '3',
  },
  png: { type: 'action', label: 'Download PNG' },
  pdf: { type: 'action', label: 'Download PDF' },
  svg: { type: 'action', label: 'Download SVG' },
  allPdf: { type: 'action', label: 'All recipients → one PDF' },
  allZip: { type: 'action', label: 'All recipients → ZIP of PDFs' },
  allSvg: { type: 'action', label: 'All recipients → ZIP of SVGs' },
  devKit: { type: 'action', label: 'Developer kit (.zip)' },
} satisfies DialConfig

export const resetConfig = {
  design: { type: 'action', label: 'Reset design' },
  content: { type: 'action', label: 'Reset content' },
  all: { type: 'action', label: 'Reset everything' },
} satisfies DialConfig
