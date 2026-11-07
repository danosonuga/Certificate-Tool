/* Bayana brand tokens — copied verbatim from the Bayana site
   (Dev/bayana/app/globals.css, sourced from the "Bayana NGO" Figma file).
   Raw values flagged ⚠️ in Dev/bayana/TOKENS.md are used as the site uses
   them; no new colours are introduced here. */

export const tokens = {
  primary50: '#eaf6ff',
  primary100: '#2ea1fe',
  primary200: '#19598c',
  secondary50: '#fff1e8',
  secondary100: '#ff7415',
  secondary200: '#8c400c',
  accent50: '#ebd9ff',
  accent100: '#6b5284',
  accent200: '#513a69',
  accent300: '#20083a',
  grey00: '#ffffff',
  textDefault: '#2c3237',
  // Logo: dot ring and the two orange "spark" dots, as drawn in bayana-mark.svg
  markDot: '#2ea1fe',
  markSpark: '#ff7516',
} as const

export type ThemeColors = {
  frame: string
  card: string
  title: string
  eyebrow: string
  name: string
  body: string
  rule: string
  signName: string
  signRole: string
  seal: string
  sealShade: string
}

/* One theme per audience, mirroring the three feature-row themes on the
   site (TOKENS.md → "Feature row themes"). Volunteers matches the supplied
   certificate template. */
export const themes: Record<string, ThemeColors> = {
  volunteers: {
    frame: '#f4ebff',
    card: tokens.grey00,
    title: tokens.accent300,
    eyebrow: tokens.textDefault,
    name: tokens.textDefault,
    body: tokens.accent100,
    rule: tokens.accent50,
    signName: tokens.accent300,
    signRole: tokens.accent100,
    seal: tokens.accent300,
    sealShade: '#140425',
  },
  ngos: {
    frame: tokens.secondary50,
    card: tokens.grey00,
    title: tokens.secondary200,
    eyebrow: tokens.textDefault,
    name: tokens.textDefault,
    body: tokens.secondary200,
    rule: '#ffe0cc',
    signName: tokens.secondary200,
    signRole: tokens.secondary200,
    seal: tokens.accent300,
    sealShade: '#140425',
  },
  donors: {
    frame: tokens.primary50,
    card: tokens.grey00,
    title: tokens.primary200,
    eyebrow: tokens.textDefault,
    name: tokens.textDefault,
    body: tokens.primary200,
    rule: '#d1ebff',
    signName: tokens.primary200,
    signRole: tokens.primary200,
    seal: tokens.accent300,
    sealShade: '#140425',
  },
}

export type ThemeName = keyof typeof themes
