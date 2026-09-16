import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pptxgen from 'pptxgenjs'
import QRCode from 'qrcode'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUTPUT_DIR = path.join(ROOT, 'docs', 'deck')
const OUTPUT = path.join(OUTPUT_DIR, 'FreshSaver-AI-Builders-Hackathon.pptx')
const WASTE_IMAGE = path.join(ROOT, 'docs', 'deck', 'assets', 'supermarket-food-waste.jpg')

const LIVE = 'https://freshsaver-ai.vercel.app'
const DEMO = `${LIVE}/demo`
const SOURCE = 'https://github.com/Utpal-Kalita/FreshSaver-AI'
const MODEL = 'https://freshsaver-demand-model.onrender.com'
const UNEP_SOURCE = 'https://www.unep.org/news-and-stories/press-release/world-squanders-over-1-billion-meals-day-un-report'
const DATE_SOURCE = 'https://food.ec.europa.eu/food-safety/food-waste/eu-actions-against-food-waste/date-marking-and-food-waste-prevention_en'

const C = {
  forest: '173D31',
  forest2: '0D2B22',
  cream: 'F6F3EA',
  paper: 'FFFDF7',
  lime: 'BEF264',
  green: '10B981',
  green2: 'DDF7E8',
  orange: 'F97316',
  orange2: 'FFF0E7',
  violet: '7C3AED',
  violet2: 'F2ECFF',
  red: 'DC5B57',
  ink: '15352C',
  muted: '667D75',
  line: 'D9E3DD',
  white: 'FFFFFF',
  black: '081C16',
}

const FONT = 'Aptos'
const DISPLAY = 'Aptos Display'
const pptx = new pptxgen()
pptx.layout = 'LAYOUT_WIDE'
pptx.author = 'FreshSaver AI'
pptx.company = 'AI Builders Hackathon 2026'
pptx.subject = 'Explainable AI markdown decisions for independent grocers'
pptx.title = 'FreshSaver — Protect Margin Before Food Becomes Waste'
pptx.lang = 'en-IN'
pptx.theme = {
  headFontFace: DISPLAY,
  bodyFontFace: FONT,
  lang: 'en-IN',
}
pptx.defineSlideMaster({
  title: 'LIGHT',
  background: { color: C.cream },
  objects: [],
  slideNumber: { x: 12.55, y: 7.08, w: 0.35, h: 0.2, fontFace: FONT, fontSize: 8, color: '82938D', align: 'right', margin: 0 },
})
pptx.defineSlideMaster({
  title: 'DARK',
  background: { color: C.forest },
  objects: [],
  slideNumber: { x: 12.55, y: 7.08, w: 0.35, h: 0.2, fontFace: FONT, fontSize: 8, color: '96ADA4', align: 'right', margin: 0 },
})

const shadow = { type: 'outer', color: '0A241C', opacity: 0.13, blur: 2, angle: 45, distance: 1 }

function text(slide, value, x, y, w, h, options = {}) {
  slide.addText(value, {
    x, y, w, h,
    fontFace: options.fontFace ?? FONT,
    fontSize: options.fontSize ?? 14,
    color: options.color ?? C.ink,
    bold: options.bold ?? false,
    margin: options.margin ?? 0,
    valign: options.valign ?? 'mid',
    align: options.align ?? 'left',
    breakLine: false,
    fit: 'shrink',
    ...options,
  })
}

function rect(slide, x, y, w, h, fill, radius = 0.15, line = null, options = {}) {
  slide.addShape(radius ? pptx.ShapeType.roundRect : pptx.ShapeType.rect, {
    x, y, w, h,
    rectRadius: radius,
    fill: { color: fill, transparency: options.transparency ?? 0 },
    line: line ? { color: line, width: options.lineWidth ?? 1 } : { color: fill, transparency: 100 },
    shadow: options.shadow ? shadow : undefined,
  })
}

function line(slide, x, y, w, h, color = C.line, width = 1.2, dash = 'solid') {
  slide.addShape(pptx.ShapeType.line, { x, y, w, h, line: { color, width, dashType: dash } })
}

function circle(slide, x, y, d, fill, label, labelColor = C.forest, fontSize = 12) {
  slide.addShape(pptx.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: fill }, line: { color: fill } })
  text(slide, label, x, y, d, d, { color: labelColor, bold: true, fontSize, align: 'center' })
}

function pill(slide, label, x, y, w, fill, color, border = null) {
  rect(slide, x, y, w, 0.32, fill, 0.16, border)
  text(slide, label, x + 0.08, y, w - 0.16, 0.32, { fontSize: 9, bold: true, color, align: 'center' })
}

function kicker(slide, label, dark = false) {
  text(slide, label.toUpperCase(), 0.55, 0.35, 6.6, 0.28, {
    fontSize: 9,
    bold: true,
    color: dark ? C.lime : C.green,
    charSpacing: 1.8,
  })
}

function title(slide, heading, subheading = '', dark = false) {
  text(slide, heading, 0.55, 0.72, 12.05, 0.72, {
    fontFace: DISPLAY,
    fontSize: 27,
    bold: true,
    color: dark ? C.white : C.ink,
    breakLine: false,
  })
  if (subheading) {
    text(slide, subheading, 0.58, 1.48, 11.8, 0.5, {
      fontSize: 12.5,
      color: dark ? 'B9CBC4' : C.muted,
      valign: 'top',
    })
  }
}

function footer(slide, label, dark = false) {
  line(slide, 0.55, 7.02, 11.75, 0, dark ? '406459' : C.line, 0.8)
  text(slide, 'FRESHSAVER', 0.58, 7.08, 1.1, 0.16, { fontSize: 7.5, bold: true, color: dark ? C.lime : C.green, charSpacing: 1.4 })
  text(slide, label, 1.72, 7.08, 7.4, 0.16, { fontSize: 7.5, color: dark ? '90A99F' : '82938D' })
}

function stat(slide, x, y, w, label, value, fill, valueColor = C.ink) {
  rect(slide, x, y, w, 1.05, fill, 0.18)
  text(slide, value, x + 0.18, y + 0.14, w - 0.36, 0.42, { fontFace: DISPLAY, fontSize: 23, bold: true, color: valueColor })
  text(slide, label, x + 0.18, y + 0.62, w - 0.36, 0.24, { fontSize: 9, bold: true, color: valueColor, transparency: 25 })
}

function note(slide, noteText) {
  slide.addNotes(noteText)
}

function arrow(slide, x, y, color = C.green) {
  slide.addShape(pptx.ShapeType.chevron, { x, y, w: 0.34, h: 0.34, fill: { color }, line: { color } })
}

function hyperlinkText(slide, label, url, x, y, w, h, options = {}) {
  slide.addText([{ text: label, options: { hyperlink: { url }, color: options.color ?? C.green, underline: { color: options.color ?? C.green } } }], {
    x, y, w, h,
    fontFace: FONT,
    fontSize: options.fontSize ?? 10,
    bold: options.bold ?? true,
    margin: 0,
    valign: 'mid',
    align: options.align ?? 'left',
    fit: 'shrink',
  })
}

// Slide 1 — Cover
{
  const slide = pptx.addSlide('DARK')
  slide.background = { color: C.forest }
  slide.addShape(pptx.ShapeType.ellipse, { x: 9.5, y: -2.2, w: 5.8, h: 5.8, fill: { color: C.lime, transparency: 85 }, line: { color: C.lime, transparency: 100 } })
  slide.addShape(pptx.ShapeType.ellipse, { x: -1.6, y: 5.65, w: 4.2, h: 4.2, fill: { color: C.green, transparency: 85 }, line: { color: C.green, transparency: 100 } })
  circle(slide, 0.65, 0.5, 0.48, C.lime, 'F', C.forest, 16)
  text(slide, 'FRESHSAVER AI', 1.25, 0.52, 2.2, 0.4, { fontSize: 13, bold: true, color: C.white, charSpacing: 1.2 })
  pill(slide, 'AI BUILDERS HACKATHON 2026', 0.65, 1.35, 2.55, '244F42', C.lime)
  text(slide, 'Fresh today.\nExpired tomorrow.\nWasted forever.', 0.65, 1.92, 6.15, 2.62, { fontFace: DISPLAY, fontSize: 37, bold: true, color: C.white, breakLine: true, valign: 'top' })
  text(slide, 'FreshSaver gives a grocer one more chance to protect margin and find a buyer before the expiry clock runs out.', 0.72, 4.82, 5.62, 0.78, { fontSize: 15, color: 'C6D7D0', valign: 'top' })

  slide.addImage({
    path: WASTE_IMAGE,
    x: 7.18,
    y: 1.15,
    w: 5.45,
    h: 5.22,
    sizing: { type: 'cover', w: 5.45, h: 5.22 },
    altText: 'Discarded food from a supermarket in a waste container',
  })
  rect(slide, 7.18, 4.78, 5.45, 1.59, C.forest2, 0, null, { transparency: 12 })
  pill(slide, 'THE COST OF WAITING', 7.58, 5.08, 1.62, C.orange, C.white)
  text(slide, 'What was inventory\nbecomes avoidable waste.', 7.58, 5.48, 3.72, 0.62, { fontFace: DISPLAY, fontSize: 19, bold: true, color: C.white, breakLine: true, valign: 'top' })
  text(slide, 'Public-domain image: KVDP / Wikimedia Commons', 7.58, 6.14, 3.85, 0.16, { fontSize: 6.8, color: 'D3DDD9' })
  hyperlinkText(slide, 'LIVE DEMO  →', DEMO, 0.72, 6.25, 1.55, 0.3, { color: C.lime, fontSize: 10 })
  hyperlinkText(slide, 'SOURCE  →', SOURCE, 2.55, 6.25, 1.35, 0.3, { color: C.lime, fontSize: 10 })
  footer(slide, 'The global waste problem appears as a local pricing decision', true)
  note(slide, 'Open as a story: food can move from sellable inventory to a supermarket waste container because the intervention came too late. FreshSaver gives the owner an evidence-based action while the product still has value. Image: “Supermarket dumpster” by KVDP, public domain, Wikimedia Commons: https://commons.wikimedia.org/wiki/File:Supermarket_dumpster.jpg')
}

// Slide 2 — Problem
{
  const slide = pptx.addSlide('LIGHT')
  kicker(slide, 'Problem statement')
  title(slide, 'The waste is global. The decision is local.', 'Every number below is sourced; not all global food waste is caused by expiry dates.')

  const globalStats = [
    { x: 0.68, value: '1.05B', unit: 'tonnes', body: 'food waste generated at retail, food service and household level in 2022', fill: C.forest, color: C.lime },
    { x: 4.36, value: '~$1T', unit: 'each year', body: 'estimated global economic toll of food loss and waste', fill: C.violet2, color: C.violet },
    { x: 8.04, value: '8–10%', unit: 'of GHGs', body: 'annual global emissions attributed to food loss and waste', fill: C.orange2, color: C.orange },
  ]
  globalStats.forEach(item => {
    rect(slide, item.x, 2.16, 3.25, 1.78, item.fill, 0.23, item.fill === C.forest ? null : C.line, { shadow: true })
    text(slide, item.value, item.x + 0.24, 2.42, 1.75, 0.55, { fontFace: DISPLAY, fontSize: 31, bold: true, color: item.color })
    text(slide, item.unit, item.x + 1.9, 2.64, 1.0, 0.24, { fontSize: 10, bold: true, color: item.fill === C.forest ? C.white : item.color, align: 'right' })
    text(slide, item.body, item.x + 0.24, 3.12, 2.7, 0.58, { fontSize: 10.5, color: item.fill === C.forest ? 'CAD9D3' : C.muted, valign: 'top' })
  })

  rect(slide, 0.68, 4.22, 5.85, 1.58, C.forest, 0.23)
  text(slide, '12%', 1.0, 4.5, 1.32, 0.55, { fontFace: DISPLAY, fontSize: 31, bold: true, color: C.lime })
  text(slide, 'of 2022 food waste occurred at retail.', 2.25, 4.53, 3.72, 0.32, { fontSize: 14, bold: true, color: C.white })
  pill(slide, 'OUR WEDGE', 1.0, 5.16, 0.95, '2B5548', C.lime)
  text(slide, 'Independent grocers making product-level decisions every day.', 2.15, 5.13, 3.78, 0.34, { fontSize: 10.5, color: 'C5D7D0' })

  rect(slide, 6.78, 4.22, 5.83, 1.58, C.white, 0.23, C.line, { shadow: true })
  text(slide, 'Up to 10%', 7.1, 4.48, 1.9, 0.55, { fontFace: DISPLAY, fontSize: 28, bold: true, color: C.red })
  text(slide, 'of annual EU food waste is linked to date marking.', 8.95, 4.47, 3.1, 0.48, { fontSize: 13.5, bold: true, color: C.ink })
  text(slide, 'European Commission estimate — not a global expiry-waste estimate.', 7.12, 5.23, 4.85, 0.24, { fontSize: 9, italic: true, color: C.muted })

  rect(slide, 1.12, 6.1, 11.1, 0.43, C.lime, 0.14)
  text(slide, 'For one grocer, this becomes a recurring question: hold, markdown, or lose the stock?', 1.38, 6.1, 10.58, 0.43, { fontSize: 12, bold: true, color: C.forest, align: 'center' })
  hyperlinkText(slide, 'Source: UNEP Food Waste Index Report 2024 (2022 data)', UNEP_SOURCE, 0.72, 6.7, 5.65, 0.18, { fontSize: 7.5, color: C.muted })
  hyperlinkText(slide, 'Source: European Commission date-marking study (2018)', DATE_SOURCE, 7.02, 6.7, 5.0, 0.18, { fontSize: 7.5, color: C.muted, align: 'right' })
  footer(slide, 'Problem statement · sourced global scale and local wedge')
  note(slide, 'Tell the story from global to local. UNEP reports 1.05 billion tonnes of food waste in 2022 across retail, food service and households; 12% occurred at retail. Food loss and waste cost roughly US$1 trillion and generate 8–10% of global greenhouse gas emissions. Separately, the European Commission estimates up to 10% of EU food waste is linked to date marking. Do not say all global food waste is caused by expiry dates. Bring the story back to the grocer choosing between holding, marking down, or losing stock.')
}

// Slide 3 — Closed loop
{
  const slide = pptx.addSlide('DARK')
  kicker(slide, 'The product loop', true)
  title(slide, 'One decision loop. Two users. One outcome.', 'FreshSaver does not stop at a forecast — it carries the decision to a shopper and records what happened.', true)
  const steps = [
    ['01', 'IMPORT', 'CSV inventory', C.green2, C.forest],
    ['02', 'PREDICT', 'Sell-through by price', C.violet2, C.violet],
    ['03', 'OPTIMIZE', 'Margin-aware candidate', C.orange2, C.orange],
    ['04', 'APPROVE', 'Owner stays in control', 'E4F7E9', C.green],
    ['05', 'ACTIVATE', 'Store opt-in matching', 'E9F2FF', '2F6CB3'],
    ['06', 'MEASURE', 'Order + outcome ledger', C.lime, C.forest],
  ]
  steps.forEach(([num, label, body, fill, color], index) => {
    const x = 0.62 + index * 2.1
    rect(slide, x, 2.58, 1.78, 2.4, fill, 0.23, null, { shadow: index === 2 || index === 3 })
    text(slide, num, x + 0.16, 2.75, 0.48, 0.25, { fontSize: 9, bold: true, color, charSpacing: 1 })
    circle(slide, x + 0.16, 3.18, 0.52, color, label.slice(0, 1), fill, 15)
    text(slide, label, x + 0.16, 3.9, 1.42, 0.28, { fontSize: 11, bold: true, color, charSpacing: 0.8 })
    text(slide, body, x + 0.16, 4.28, 1.4, 0.46, { fontSize: 10.5, color, valign: 'top' })
    if (index < steps.length - 1) arrow(slide, x + 1.84, 3.55, C.lime)
  })
  rect(slide, 1.15, 5.55, 11.0, 0.72, '244E42', 0.18)
  text(slide, 'MERCHANT', 1.45, 5.77, 1.05, 0.22, { fontSize: 9, bold: true, color: C.lime, charSpacing: 1.2 })
  text(slide, 'Detect risk  →  approve action', 2.45, 5.72, 2.75, 0.3, { fontSize: 12, bold: true, color: C.white })
  line(slide, 6.28, 5.7, 0, 0.38, '56786D', 1)
  text(slide, 'SHOPPER', 6.62, 5.77, 1.05, 0.22, { fontSize: 9, bold: true, color: C.lime, charSpacing: 1.2 })
  text(slide, 'Discover deal  →  reserve pickup', 7.65, 5.72, 3.15, 0.3, { fontSize: 12, bold: true, color: C.white })
  footer(slide, 'End-to-end workflow', true)
  note(slide, 'Walk left to right. Emphasize that a prediction alone does not rescue food. The value is the closed loop from inventory to owner action to shopper pickup.')
}

// Slide 4 — Product experience
{
  const slide = pptx.addSlide('LIGHT')
  kicker(slide, 'Product experience')
  title(slide, 'Built for the aisle and the customer’s pocket.', 'A focused owner workspace feeds a simple customer marketplace.')

  rect(slide, 0.62, 2.16, 7.08, 4.28, C.white, 0.26, C.line, { shadow: true })
  rect(slide, 0.62, 2.16, 1.38, 4.28, C.forest, 0.26)
  circle(slide, 0.93, 2.48, 0.42, C.lime, 'F', C.forest, 13)
  text(slide, 'OWNER', 1.39, 2.52, 0.48, 0.2, { fontSize: 8, bold: true, color: C.white, charSpacing: 1 })
  ;['Dashboard', 'Products', 'Customers', 'Pricing log'].forEach((item, i) => {
    const active = i === 3
    rect(slide, 0.8, 3.12 + i * 0.5, 1.02, 0.34, active ? C.lime : '285043', 0.09)
    text(slide, item, 0.86, 3.12 + i * 0.5, 0.9, 0.34, { fontSize: 8, bold: active, color: active ? C.forest : 'BDD0C8' })
  })
  text(slide, 'Pending AI recommendations', 2.35, 2.52, 3.15, 0.35, { fontFace: DISPLAY, fontSize: 20, bold: true })
  pill(slide, '3 AWAITING REVIEW', 5.68, 2.52, 1.52, C.violet2, C.violet)
  rect(slide, 2.32, 3.18, 4.92, 2.45, C.forest, 0.2)
  text(slide, 'ORGANIC WHOLE MILK', 2.62, 3.48, 2.5, 0.23, { fontSize: 9, bold: true, color: C.lime, charSpacing: 1 })
  text(slide, '15% off', 5.92, 3.43, 0.95, 0.32, { fontSize: 16, bold: true, color: C.lime, align: 'right' })
  stat(slide, 2.62, 3.97, 1.28, 'NEW PRICE', '₹71', '2B5548', C.white)
  stat(slide, 4.03, 3.97, 1.28, 'PREDICTED', '0–6', '2B5548', C.white)
  stat(slide, 5.44, 3.97, 1.28, 'MARGIN', '₹37', '2B5548', C.white)
  pill(slide, 'XGBOOST', 2.62, 5.22, 0.88, C.violet, C.white)
  pill(slide, 'OWNER APPROVAL', 5.03, 5.22, 1.7, C.lime, C.forest)

  rect(slide, 8.0, 2.16, 4.72, 4.28, C.white, 0.26, C.line, { shadow: true })
  text(slide, 'CUSTOMER MARKETPLACE', 8.35, 2.5, 2.9, 0.25, { fontSize: 9, bold: true, color: C.green, charSpacing: 1.3 })
  text(slide, 'Food worth saving today', 8.35, 2.9, 3.65, 0.4, { fontFace: DISPLAY, fontSize: 21, bold: true })
  const dealCards = [
    ['Milk', '15% OFF', '₹71', C.green2],
    ['Spinach', '25% OFF', '₹53', C.orange2],
  ]
  dealCards.forEach(([name, deal, price, fill], i) => {
    const x = 8.35 + i * 1.92
    rect(slide, x, 3.58, 1.68, 1.95, fill, 0.2)
    circle(slide, x + 0.57, 3.78, 0.54, C.white, name.slice(0, 1), C.forest, 16)
    text(slide, deal, x + 0.18, 4.5, 1.32, 0.22, { fontSize: 8, bold: true, color: i ? C.orange : C.green, align: 'center' })
    text(slide, name, x + 0.18, 4.83, 1.32, 0.22, { fontSize: 11, bold: true, align: 'center' })
    text(slide, price, x + 0.18, 5.14, 1.32, 0.25, { fontSize: 15, bold: true, color: C.forest, align: 'center' })
  })
  rect(slide, 8.35, 5.78, 3.6, 0.36, C.green, 0.12)
  text(slide, 'RESERVE FOR LOCAL PICKUP', 8.52, 5.78, 3.25, 0.36, { fontSize: 9, bold: true, color: C.white, align: 'center', charSpacing: 0.8 })
  footer(slide, 'User experience & design')
  note(slide, 'Show the two personas. Owners get four focused pages; shoppers see only approved active deals and can reserve for pickup.')
}

// Slide 5 — AI architecture
{
  const slide = pptx.addSlide('DARK')
  kicker(slide, 'What AI we use — and why', true)
  title(slide, 'Two AIs. Two jobs. One controlled decision.', 'XGBoost handles numerical uncertainty. Gemini handles language. Neither gets unchecked authority.', true)
  const layers = [
    { x: 0.68, tag: 'AI #1 · PREDICTION', heading: 'XGBoost', what: 'Predicts sell-through at every candidate price.', why: 'Built for nonlinear tabular data: stock, price, expiry and sales velocity.', color: C.violet, fill: '281E43' },
    { x: 3.78, tag: 'NOT AI · POLICY', heading: 'Optimizer', what: 'Selects the strongest eligible contribution score.', why: 'Keeps price floors, expiry blocks and overrides deterministic.', color: C.orange, fill: '4B2C1D' },
    { x: 6.88, tag: 'AI #2 · LANGUAGE', heading: 'Gemini', what: 'Explains evidence, writes campaign copy and suggests a recipe.', why: 'Natural language is its strength; it never calculates the price.', color: C.green, fill: '193E33' },
    { x: 9.98, tag: 'HUMAN · AUTHORITY', heading: 'Store owner', what: 'Approves or rejects the pending recommendation.', why: 'Pricing accountability remains with the merchant.', color: C.lime, fill: '284A3F' },
  ]
  layers.forEach((item, i) => {
    rect(slide, item.x, 2.3, 2.58, 3.18, item.fill, 0.24, '45685D')
    circle(slide, item.x + 0.22, 2.57, 0.46, item.color, `${i + 1}`, i === 3 ? C.forest : C.white, 12)
    text(slide, item.tag, item.x + 0.79, 2.62, 1.55, 0.2, { fontSize: 7.5, bold: true, color: item.color, charSpacing: 0.75 })
    text(slide, item.heading, item.x + 0.22, 3.18, 2.1, 0.38, { fontFace: DISPLAY, fontSize: 20, bold: true, color: C.white })
    text(slide, 'WHAT', item.x + 0.22, 3.75, 0.52, 0.18, { fontSize: 7.5, bold: true, color: item.color, charSpacing: 1 })
    text(slide, item.what, item.x + 0.22, 3.98, 2.1, 0.48, { fontSize: 10.2, bold: true, color: C.white, valign: 'top' })
    text(slide, 'WHY', item.x + 0.22, 4.62, 0.52, 0.18, { fontSize: 7.5, bold: true, color: item.color, charSpacing: 1 })
    text(slide, item.why, item.x + 0.22, 4.84, 2.1, 0.48, { fontSize: 9.4, color: 'BBD0C8', valign: 'top' })
    if (i < layers.length - 1) arrow(slide, item.x + 2.7, 3.63, C.lime)
  })
  rect(slide, 1.18, 5.77, 10.95, 0.62, '244E42', 0.16)
  text(slide, 'XGBOOST PREDICTS', 1.43, 5.97, 1.58, 0.18, { fontSize: 8.2, bold: true, color: C.violet, charSpacing: 0.7 })
  text(slide, '→', 3.02, 5.9, 0.35, 0.3, { fontSize: 17, bold: true, color: C.lime, align: 'center' })
  text(slide, 'POLICY CONSTRAINS', 3.43, 5.97, 1.58, 0.18, { fontSize: 8.2, bold: true, color: C.orange, charSpacing: 0.7 })
  text(slide, '→', 5.05, 5.9, 0.35, 0.3, { fontSize: 17, bold: true, color: C.lime, align: 'center' })
  text(slide, 'GEMINI COMMUNICATES', 5.45, 5.97, 1.9, 0.18, { fontSize: 8.2, bold: true, color: C.green, charSpacing: 0.7 })
  text(slide, '→', 7.43, 5.9, 0.35, 0.3, { fontSize: 17, bold: true, color: C.lime, align: 'center' })
  text(slide, 'OWNER DECIDES', 7.88, 5.97, 1.5, 0.18, { fontSize: 8.2, bold: true, color: C.lime, charSpacing: 0.7 })
  pill(slide, 'LIVE PRIMARY AI: XGBOOST', 0.7, 6.6, 1.82, C.violet, C.white)
  pill(slide, 'OPTIONAL GEN AI: GEMINI', 2.7, 6.6, 1.82, C.green, C.white)
  pill(slide, 'SAFE FALLBACK: TEMPLATE', 4.7, 6.6, 2.02, '385E52', 'D6E5DF')
  footer(slide, 'Technical implementation', true)
  note(slide, 'Say this explicitly: We use XGBoost because pricing demand is a nonlinear tabular prediction problem. We use Gemini because explanations and campaigns are language tasks. The optimizer is not AI; it is deterministic policy that enforces business and safety rules. The owner remains the final authority. XGBoost is live. Gemini is optional and has a template fallback.')
}

// Slide 6 — Model evidence
{
  const slide = pptx.addSlide('LIGHT')
  kicker(slide, 'Model evidence')
  title(slide, 'The training path is real. The business claim is not yet.', 'Time-ordered validation on 4,000 explicitly synthetic rows proves the pipeline — not store impact.')
  rect(slide, 0.65, 2.25, 6.15, 3.95, C.white, 0.24, C.line, { shadow: true })
  text(slide, 'FORECAST ERROR — LOWER IS BETTER', 0.98, 2.58, 3.7, 0.25, { fontSize: 9, bold: true, color: C.muted, charSpacing: 1.2 })
  text(slide, 'MAE', 0.98, 3.14, 0.65, 0.25, { fontSize: 10, bold: true })
  text(slide, '7-day velocity', 1.7, 3.12, 1.3, 0.25, { fontSize: 10, color: C.muted })
  rect(slide, 3.05, 3.13, 2.75, 0.27, C.orange, 0.1)
  text(slide, '6.332', 5.92, 3.06, 0.58, 0.38, { fontSize: 14, bold: true, color: C.orange, align: 'right' })
  text(slide, 'XGBoost', 1.7, 3.65, 1.3, 0.25, { fontSize: 10, bold: true, color: C.violet })
  rect(slide, 3.05, 3.66, 0.91, 0.27, C.violet, 0.1)
  text(slide, '2.097', 5.92, 3.59, 0.58, 0.38, { fontSize: 14, bold: true, color: C.violet, align: 'right' })
  line(slide, 0.98, 4.28, 5.48, 0, C.line)
  text(slide, 'WAPE', 0.98, 4.62, 0.65, 0.25, { fontSize: 10, bold: true })
  text(slide, '7-day velocity', 1.7, 4.61, 1.3, 0.25, { fontSize: 10, color: C.muted })
  rect(slide, 3.05, 4.62, 2.75, 0.27, C.orange, 0.1)
  text(slide, '27.9%', 5.85, 4.55, 0.65, 0.38, { fontSize: 14, bold: true, color: C.orange, align: 'right' })
  text(slide, 'XGBoost', 1.7, 5.15, 1.3, 0.25, { fontSize: 10, bold: true, color: C.violet })
  rect(slide, 3.05, 5.16, 0.91, 0.27, C.violet, 0.1)
  text(slide, '9.2%', 5.85, 5.09, 0.65, 0.38, { fontSize: 14, bold: true, color: C.violet, align: 'right' })

  rect(slide, 7.05, 2.25, 5.6, 3.95, C.forest, 0.24, null, { shadow: true })
  pill(slide, 'EXPLAINABLE OUTPUT', 7.42, 2.58, 1.7, '2B5548', C.lime)
  text(slide, 'One candidate prediction', 7.42, 3.12, 3.55, 0.38, { fontFace: DISPLAY, fontSize: 22, bold: true, color: C.white })
  stat(slide, 7.42, 3.74, 1.44, 'LOW', '0', '2B5548', C.white)
  stat(slide, 9.0, 3.74, 1.44, 'EXPECTED', '2.6', '2B5548', C.white)
  stat(slide, 10.58, 3.74, 1.44, 'HIGH', '5.8', '2B5548', C.white)
  text(slide, 'Top contributing factors', 7.42, 5.08, 2.3, 0.24, { fontSize: 9, bold: true, color: C.lime, charSpacing: 0.8 })
  text(slide, '1  Days until expiry\n2  Recent 7-day velocity\n3  Previous 23-day velocity', 7.42, 5.38, 3.75, 0.65, { fontSize: 10.5, color: 'CAD9D3', breakLine: true, valign: 'top' })
  pill(slide, 'SYNTHETIC EVALUATION — NO CAUSAL IMPACT CLAIM', 1.65, 6.5, 10.05, C.orange2, C.orange, 'FFD4BD')
  footer(slide, 'Innovation & technical evidence')
  note(slide, 'State the caveat before the numbers: these metrics validate the train/serve/evaluate pipeline on synthetic data. The next claim must come from merchant data and a controlled pilot.')
}

// Slide 7 — Explainability and approval
{
  const slide = pptx.addSlide('LIGHT')
  kicker(slide, 'Trust by design')
  title(slide, 'Every recommendation is inspectable — and reversible.', 'No silent price change. No black-box confidence. No customer identity in pricing.')
  const rows = [
    ['0%', '₹84', '5.6', '12.4', 'baseline'],
    ['15%', '₹71', '8.2', '9.8', 'candidate'],
    ['20%', '₹67', '10.8', '7.2', 'selected'],
    ['25%', '₹63', '12.1', '5.9', 'candidate'],
  ]
  rect(slide, 0.65, 2.2, 6.55, 4.12, C.white, 0.24, C.line, { shadow: true })
  text(slide, 'CANDIDATES TESTED', 0.98, 2.52, 2.4, 0.25, { fontSize: 9, bold: true, color: C.green, charSpacing: 1.2 })
  ;['DISCOUNT', 'PRICE', 'UNITS', 'LEFT', 'DECISION'].forEach((label, i) => text(slide, label, 0.98 + [0, 1.0, 2.0, 3.0, 4.05][i], 3.02, [0.82, 0.82, 0.82, 0.82, 1.15][i], 0.2, { fontSize: 8, bold: true, color: C.muted }))
  rows.forEach((row, index) => {
    const y = 3.38 + index * 0.58
    const selected = row[4] === 'selected'
    rect(slide, 0.9, y, 5.98, 0.44, selected ? C.lime : index % 2 ? 'F8FAF9' : C.white, 0.1, selected ? C.lime : 'EDF2EF')
    text(slide, row[0], 1.02, y, 0.7, 0.44, { fontSize: 11, bold: selected })
    text(slide, row[1], 2.0, y, 0.72, 0.44, { fontSize: 11, bold: selected })
    text(slide, row[2], 3.0, y, 0.72, 0.44, { fontSize: 11, bold: selected })
    text(slide, row[3], 4.0, y, 0.72, 0.44, { fontSize: 11, bold: selected })
    pill(slide, selected ? 'RECOMMENDED' : row[4].toUpperCase(), 5.05, y + 0.06, 1.56, selected ? C.forest : 'EEF3F0', selected ? C.white : C.muted)
  })
  text(slide, 'Illustrative candidate table from the synthetic demo.', 0.98, 5.93, 4.65, 0.18, { fontSize: 8.5, color: '8B9C96', italic: true })

  const controls = [
    ['01', 'Guardrails first', 'Expiry block, minimum price, bounded discount.'],
    ['02', 'Evidence retained', 'Inputs, candidates, model, factors, version.'],
    ['03', 'Human decision', 'Approve, reject, or preserve an override.'],
    ['04', 'Outcome ledger', 'Link approval, order, pickup, waste, donation.'],
  ]
  controls.forEach(([num, heading, body], i) => {
    const y = 2.28 + i * 1.02
    circle(slide, 7.7, y, 0.45, i === 2 ? C.lime : C.green2, num, C.forest, 10)
    text(slide, heading, 8.35, y - 0.02, 3.4, 0.28, { fontSize: 14, bold: true })
    text(slide, body, 8.35, y + 0.3, 3.72, 0.42, { fontSize: 10.5, color: C.muted, valign: 'top' })
    if (i < 3) line(slide, 7.92, y + 0.48, 0, 0.54, 'B9DACA', 1.2)
  })
  pill(slide, 'PRICING EXCLUDES CUSTOMER IDENTITY', 8.2, 6.42, 3.95, C.violet2, C.violet)
  footer(slide, 'Explainability, safety & human oversight')
  note(slide, 'Explain the separation of duties: model predicts, policy constrains, owner decides. Candidate values on this slide are illustrative and should not be presented as measured store results.')
}

// Slide 8 — Technical architecture
{
  const slide = pptx.addSlide('DARK')
  kicker(slide, 'System architecture', true)
  title(slide, 'Store-scoped from database row to customer order.', 'The browser is untrusted. Every privileged operation resolves role and store ownership on the server.', true)
  const bands = [
    { y: 2.25, label: 'EXPERIENCE', color: C.lime, nodes: ['Customer marketplace', 'Owner portal', 'Offline judge demo'] },
    { y: 3.38, label: 'APPLICATION', color: C.green, nodes: ['Next.js 16', 'Scan + approval APIs', 'Brevo adapter'] },
    { y: 4.51, label: 'INTELLIGENCE', color: C.violet, nodes: ['XGBoost / FastAPI', 'Constrained optimizer', 'Gemini adapter'] },
    { y: 5.64, label: 'DATA + OPS', color: C.orange, nodes: ['Supabase + RLS', 'Vercel + cron', 'Render model service'] },
  ]
  bands.forEach((band, row) => {
    text(slide, band.label, 0.68, band.y + 0.23, 1.28, 0.25, { fontSize: 8.5, bold: true, color: band.color, charSpacing: 1.2 })
    line(slide, 1.9, band.y + 0.38, 0.45, 0, band.color, 1.4)
    band.nodes.forEach((node, i) => {
      const x = 2.55 + i * 3.3
      rect(slide, x, band.y, 2.8, 0.76, row === 2 ? '2A2145' : row === 3 ? '493020' : '244E42', 0.18, '496C61')
      circle(slide, x + 0.18, band.y + 0.17, 0.4, band.color, `${i + 1}`, row === 0 || row === 3 ? C.forest : C.white, 10)
      text(slide, node, x + 0.72, band.y + 0.13, 1.86, 0.48, { fontSize: 11, bold: true, color: C.white })
    })
  })
  rect(slide, 11.92, 2.18, 0.65, 4.26, '244E42', 0.18)
  text(slide, 'AUDIT\nTRAIL', 12.04, 2.62, 0.41, 1.0, { fontSize: 9, bold: true, color: C.lime, align: 'center', breakLine: true })
  line(slide, 12.24, 3.75, 0, 1.68, '5D7D72', 1.4, 'dash')
  text(slide, 'STORE\nID', 12.04, 5.5, 0.41, 0.58, { fontSize: 9, bold: true, color: C.white, align: 'center', breakLine: true })
  footer(slide, 'Next.js · Supabase · XGBoost · Render · Vercel', true)
  note(slide, 'Emphasize store_id as the tenant key. Service-role access stays server-side; recommendation and approval evidence is persisted for audit.')
}

// Slide 9 — Proof and readiness
{
  const slide = pptx.addSlide('LIGHT')
  kicker(slide, 'What is live today')
  title(slide, 'A deployed product — with honest boundaries.', 'The system is usable now; impact claims wait for real merchant evidence.')
  stat(slide, 0.7, 2.22, 2.6, 'AUTOMATED TESTS', '18', C.green2, C.forest)
  stat(slide, 3.48, 2.22, 2.6, 'PUBLIC ROUTES VERIFIED', '8× 200', C.lime, C.forest)
  stat(slide, 6.26, 2.22, 2.6, 'LIVE AI PROVIDER', 'XGBoost', C.violet2, C.violet)
  stat(slide, 9.04, 2.22, 2.6, 'MCP CONTROL PLANES', '3', C.orange2, C.orange)

  rect(slide, 0.7, 3.62, 5.72, 2.55, C.white, 0.23, C.line, { shadow: true })
  pill(slide, 'PROVEN', 1.03, 3.94, 0.85, C.green2, C.green)
  const proven = [
    'Public Vercel app + credential-free demo',
    'Authenticated owner and customer journeys',
    'Remote XGBoost candidate predictions',
    'Pending approval → live marketplace deal',
  ]
  proven.forEach((item, i) => {
    circle(slide, 1.04, 4.47 + i * 0.4, 0.19, C.green, '✓', C.white, 7)
    text(slide, item, 1.38, 4.43 + i * 0.4, 4.45, 0.27, { fontSize: 10.5, bold: true, color: C.ink })
  })

  rect(slide, 6.72, 3.62, 5.92, 2.55, C.white, 0.23, C.line, { shadow: true })
  pill(slide, 'NOT YET CLAIMED', 7.05, 3.94, 1.55, C.orange2, C.orange)
  const limits = [
    'Real-store forecast quality',
    'Incremental sales or waste reduction',
    'Learned price elasticity',
    'Production payment and concurrency guarantees',
  ]
  limits.forEach((item, i) => {
    circle(slide, 7.06, 4.47 + i * 0.4, 0.19, C.orange2, '—', C.orange, 7)
    text(slide, item, 7.4, 4.43 + i * 0.4, 4.5, 0.27, { fontSize: 10.5, bold: true, color: C.ink })
  })
  hyperlinkText(slide, 'freshsaver-ai.vercel.app', LIVE, 0.72, 6.52, 3.25, 0.26, { fontSize: 11, color: C.green })
  text(slide, 'LIVE', 4.05, 6.54, 0.55, 0.18, { fontSize: 8, bold: true, color: C.green, charSpacing: 1 })
  hyperlinkText(slide, 'freshsaver-demand-model.onrender.com', MODEL, 6.65, 6.52, 4.05, 0.26, { fontSize: 10.5, color: C.violet })
  text(slide, 'MODEL API', 10.85, 6.54, 0.9, 0.18, { fontSize: 8, bold: true, color: C.violet, charSpacing: 1 })
  footer(slide, 'Presentation & demo readiness')
  note(slide, 'The honesty is intentional. Separate what the deployed product proves from outcomes that require a controlled pilot.')
}

// Slide 10 — Close / roadmap
{
  const slide = pptx.addSlide('DARK')
  kicker(slide, 'Pilot, measure, then scale', true)
  title(slide, 'The next claim will come from a controlled pilot.', 'FreshSaver is ready for shadow recommendations with independent grocers.', true)
  const roadmap = [
    ['NOW', 'Shadow mode', 'Forecast without changing prices.'],
    ['NEXT', 'Controlled rollout', 'Capture approvals, overrides, and outcomes.'],
    ['THEN', 'Learn elasticity', 'Retrain from intervention response.'],
    ['SCALE', 'POS + shelf labels', 'Automate only within owner policy.'],
  ]
  roadmap.forEach(([tag, heading, body], i) => {
    const x = 0.7 + i * 2.96
    rect(slide, x, 2.32, 2.55, 2.22, i === 0 ? C.lime : '244E42', 0.23, i === 0 ? C.lime : '41655A')
    text(slide, tag, x + 0.22, 2.56, 0.9, 0.23, { fontSize: 8.5, bold: true, color: i === 0 ? C.forest : C.lime, charSpacing: 1.2 })
    text(slide, heading, x + 0.22, 3.02, 2.05, 0.34, { fontFace: DISPLAY, fontSize: 18, bold: true, color: i === 0 ? C.forest : C.white })
    text(slide, body, x + 0.22, 3.56, 2.04, 0.54, { fontSize: 10.5, color: i === 0 ? '315A4E' : 'BBD0C8', valign: 'top' })
  })
  rect(slide, 0.7, 4.95, 8.2, 1.08, '244E42', 0.2)
  text(slide, 'PROPOSED BUSINESS MODEL', 0.98, 5.18, 1.75, 0.2, { fontSize: 8.5, bold: true, color: C.lime, charSpacing: 1 })
  text(slide, '10% of attributable campaign sales  •  no setup fee  •  impact measured before ROI is claimed', 0.98, 5.52, 7.35, 0.28, { fontSize: 12, bold: true, color: C.white })

  rect(slide, 9.22, 4.88, 3.38, 1.45, C.paper, 0.22)
  text(slide, 'Would you pilot this?', 9.52, 5.12, 2.75, 0.32, { fontFace: DISPLAY, fontSize: 20, bold: true, color: C.forest, align: 'center' })
  text(slide, 'Scan for the live product', 9.62, 5.55, 2.55, 0.2, { fontSize: 9.5, color: C.muted, align: 'center' })
  hyperlinkText(slide, 'OPEN LIVE DEMO  →', DEMO, 9.68, 5.88, 2.4, 0.24, { fontSize: 10, color: C.green, align: 'center' })
  text(slide, 'Detect risk. Protect margin. Reach the right shopper.', 1.35, 6.52, 8.4, 0.3, { fontFace: DISPLAY, fontSize: 18, bold: true, color: C.lime })
  footer(slide, 'FreshSaver AI · live product and source linked', true)
  note(slide, 'Close on disciplined ambition: the product already connects the decision to action. Ask judges or merchants for a shadow pilot, not blind autonomy.')
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  const [demoQr, sourceQr] = await Promise.all([
    QRCode.toDataURL(DEMO, { margin: 1, width: 320, color: { dark: `#${C.forest}`, light: '#FFFFFF' } }),
    QRCode.toDataURL(SOURCE, { margin: 1, width: 320, color: { dark: `#${C.forest}`, light: '#FFFFFF' } }),
  ])

  const cover = pptx._slides[0]
  cover.addImage({ data: demoQr, x: 11.72, y: 6.1, w: 0.72, h: 0.72, hyperlink: { url: DEMO } })
  const close = pptx._slides[9]
  close.addImage({ data: demoQr, x: 11.82, y: 5.05, w: 0.62, h: 0.62, hyperlink: { url: DEMO } })
  close.addImage({ data: sourceQr, x: 12.05, y: 6.32, w: 0.42, h: 0.42, hyperlink: { url: SOURCE } })

  await pptx.writeFile({ fileName: OUTPUT })
  console.log(`Generated ${OUTPUT}`)
}

await main()
