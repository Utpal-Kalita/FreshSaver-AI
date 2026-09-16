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

// Slide 3 — Solution overview
{
  const slide = pptx.addSlide('DARK')
  kicker(slide, 'Solution overview', true)
  title(slide, 'From expiring stock to a customer’s inbox.', 'Both AI systems are part of one owner-controlled workflow, ending in an approved offer and measurable outcome.', true)
  const steps = [
    ['01', 'INVENTORY', 'CSV + expiry + cost', C.green2, C.forest],
    ['02', 'XGBOOST', 'Predict every price', C.violet2, C.violet],
    ['03', 'OPTIMIZER', 'Apply hard rules', C.orange2, C.orange],
    ['04', 'GEMINI', 'Explain + recipe', 'E1F7ED', C.green],
    ['05', 'OWNER', 'Approve or reject', C.lime, C.forest],
    ['06', 'MATCH', 'Store + category opt-in', 'E9F2FF', '2F6CB3'],
    ['07', 'EMAIL', 'Brevo sends campaign', 'FDECEC', C.red],
  ]
  steps.forEach(([num, label, body, fill, color], index) => {
    const x = 0.42 + index * 1.82
    rect(slide, x, 2.45, 1.52, 2.58, fill, 0.21, null, { shadow: index === 1 || index === 3 })
    text(slide, num, x + 0.14, 2.64, 0.4, 0.2, { fontSize: 8.5, bold: true, color, charSpacing: 1 })
    circle(slide, x + 0.14, 3.05, 0.48, color, label.slice(0, 1), fill, 13)
    text(slide, label, x + 0.14, 3.75, 1.22, 0.24, { fontSize: 9.5, bold: true, color, charSpacing: 0.6 })
    text(slide, body, x + 0.14, 4.12, 1.2, 0.54, { fontSize: 9.5, color, valign: 'top' })
    if (index < steps.length - 1) arrow(slide, x + 1.57, 3.56, C.lime)
  })
  rect(slide, 1.05, 5.5, 11.15, 0.78, '244E42', 0.18)
  text(slide, 'APPROVED CAMPAIGN', 1.35, 5.75, 1.75, 0.2, { fontSize: 8.5, bold: true, color: C.lime, charSpacing: 1 })
  text(slide, 'Personalized deal + recipe idea → customer deal page → cart / pickup → order and outcome ledger', 3.1, 5.68, 8.55, 0.34, { fontSize: 11.5, bold: true, color: C.white })
  pill(slide, 'AI #1: PREDICT', 1.0, 6.55, 1.5, C.violet, C.white)
  pill(slide, 'AI #2: COMMUNICATE', 2.68, 6.55, 1.82, C.green, C.white)
  pill(slide, 'HUMAN APPROVAL BEFORE SEND', 4.68, 6.55, 2.55, C.lime, C.forest)
  footer(slide, 'Inventory → AI prediction → guarded decision → email → shopper')
  note(slide, 'Walk left to right. XGBoost predicts sell-through for every candidate. The optimizer applies deterministic constraints. Gemini explains the fixed evidence and creates campaign and recipe copy. Nothing goes live until owner approval. Matching then selects opted-in customers and Brevo sends the campaign when configured.')
}

// Slide 4 — Target users and business model
{
  const slide = pptx.addSlide('LIGHT')
  kicker(slide, 'Target users')
  title(slide, 'Stores pay. Shoppers save. Food gets another chance.', 'FreshSaver is designed as B2B2C software: decision intelligence for retailers and a free marketplace for customers.')
  const users = [
    { x: 0.68, role: 'PAYING CUSTOMER', heading: 'Retailers & grocery owners', body: 'Need earlier expiry visibility, margin-aware pricing, and a workflow that starts with the CSV they already have.', points: ['Protect margin', 'Reduce manual shelf checks', 'Reach opted-in local demand'], fill: C.forest, color: C.lime },
    { x: 4.55, role: 'DAILY OPERATOR', heading: 'Store managers & staff', body: 'Need a ranked queue, clear evidence, and final control over every price and customer campaign.', points: ['Review recommendations', 'Approve or reject', 'Track orders and outcomes'], fill: C.white, color: C.green },
    { x: 8.42, role: 'FREE USER', heading: 'Students & budget shoppers', body: 'Want affordable, good local food without paying to use the app.', points: ['Discover nearby deals', 'Opt into relevant alerts', 'Get recipe ideas and pickup'], fill: C.orange2, color: C.orange },
  ]
  users.forEach((user, index) => {
    rect(slide, user.x, 2.2, 3.42, 3.62, user.fill, 0.24, user.fill === C.white ? C.line : null, { shadow: true })
    pill(slide, user.role, user.x + 0.25, 2.5, index === 2 ? 1.05 : 1.35, user.fill === C.forest ? '2B5548' : C.white, user.color, user.fill === C.white ? C.line : null)
    circle(slide, user.x + 0.25, 3.06, 0.52, user.color, `${index + 1}`, index === 0 ? C.forest : C.white, 13)
    text(slide, user.heading, user.x + 0.25, 3.72, 2.9, 0.55, { fontFace: DISPLAY, fontSize: 19, bold: true, color: user.fill === C.forest ? C.white : C.ink })
    text(slide, user.body, user.x + 0.25, 4.4, 2.85, 0.66, { fontSize: 10.3, color: user.fill === C.forest ? 'C6D7D0' : C.muted, valign: 'top' })
    user.points.forEach((point, i) => {
      circle(slide, user.x + 0.28, 5.18 + i * 0.29, 0.14, user.color, '✓', index === 0 ? C.forest : C.white, 5.5)
      text(slide, point, user.x + 0.53, 5.13 + i * 0.29, 2.45, 0.22, { fontSize: 9.2, bold: true, color: user.fill === C.forest ? C.white : C.ink })
    })
  })
  rect(slide, 1.12, 6.18, 11.05, 0.48, C.lime, 0.14)
  text(slide, 'BUSINESS MODEL', 1.38, 6.31, 1.4, 0.18, { fontSize: 8.5, bold: true, color: C.forest, charSpacing: 1 })
  text(slide, 'Customers use FreshSaver free  •  stores pay a proposed 10% of attributable campaign sales  •  no setup fee', 2.85, 6.25, 8.85, 0.28, { fontSize: 11.2, bold: true, color: C.forest })
  footer(slide, 'Target users and value exchange')
  note(slide, 'Name the users explicitly. Independent retailers and grocery owners are the paying customer. Store staff operate the workflow. Students and budget-conscious shoppers use the marketplace for free. The proposed model is 10% of attributable campaign sales, not a claim of incremental lift.')
}

// Slide 5 — Product features
{
  const slide = pptx.addSlide('LIGHT')
  kicker(slide, 'Product features')
  title(slide, 'Everything needed to move from risk to pickup.', 'Three connected surfaces: owner operations, explainable decision intelligence, and a free shopper marketplace.')
  const columns = [
    { x: 0.68, tag: 'OWNER PORTAL', heading: 'Operate the store', color: C.green, fill: C.green2, items: ['Dashboard and expiry KPIs', 'Manual products + CSV import', 'Store-specific subscribers', 'Pricing Log + run history', 'Orders and email logs'] },
    { x: 4.55, tag: 'DECISION ENGINE', heading: 'Review the evidence', color: C.violet, fill: C.violet2, items: ['Candidate prices and ranges', 'Margin + clearance probability', 'Top XGBoost factors', 'Recipe and campaign preview', 'Approve, reject, or override'] },
    { x: 8.42, tag: 'SHOPPER APP', heading: 'Find affordable food', color: C.orange, fill: C.orange2, items: ['Deals, stores, search, filters', 'Maps and local store pages', 'Store/category opt-in alerts', 'Single-store cart + pickup', 'Account and order history'] },
  ]
  columns.forEach((column, index) => {
    rect(slide, column.x, 2.18, 3.42, 3.95, C.white, 0.24, C.line, { shadow: true })
    rect(slide, column.x, 2.18, 3.42, 0.72, column.fill, 0.24)
    circle(slide, column.x + 0.24, 2.34, 0.4, column.color, `${index + 1}`, C.white, 10)
    text(slide, column.tag, column.x + 0.78, 2.41, 2.2, 0.2, { fontSize: 8.2, bold: true, color: column.color, charSpacing: 1 })
    text(slide, column.heading, column.x + 0.25, 3.18, 2.9, 0.4, { fontFace: DISPLAY, fontSize: 19, bold: true })
    column.items.forEach((item, i) => {
      circle(slide, column.x + 0.28, 3.82 + i * 0.45, 0.18, column.color, '✓', C.white, 6)
      text(slide, item, column.x + 0.58, 3.76 + i * 0.45, 2.5, 0.29, { fontSize: 10.2, bold: true })
    })
  })
  pill(slide, 'CREDENTIAL-FREE /DEMO', 0.72, 6.48, 1.92, C.forest, C.lime)
  text(slide, 'Synthetic decision, approval, matching and redemption story works even if external services fail.', 2.88, 6.46, 8.65, 0.3, { fontSize: 10.8, bold: true, color: C.muted })
  footer(slide, 'Key features and functionality')
  note(slide, 'Keep this feature slide concrete. Four owner pages, explainable pricing evidence, and the free shopper marketplace are the core product. Mention the offline judge demo as the reliable fallback.')
}

// Slide 6 — AI technologies
{
  const slide = pptx.addSlide('DARK')
  kicker(slide, 'AI technologies used — what and why', true)
  title(slide, 'Two AIs. Two jobs. One controlled decision.', 'XGBoost handles numerical uncertainty. Gemini handles language. Neither gets unchecked authority.', true)
  const layers = [
    { x: 0.68, tag: 'AI #1 · PREDICTION', heading: 'XGBoost', what: 'Predicts sell-through at every candidate price.', why: 'Built for nonlinear tabular data: stock, price, expiry and sales velocity.', color: C.violet, fill: '281E43' },
    { x: 3.78, tag: 'NOT AI · POLICY', heading: 'Optimizer', what: 'Selects the strongest eligible contribution score.', why: 'Keeps price floors, expiry blocks and overrides deterministic.', color: C.orange, fill: '4B2C1D' },
    { x: 6.88, tag: 'AI #2 · LANGUAGE', heading: 'Gemini', what: 'Explains evidence, writes email copy and suggests a recipe.', why: 'Natural language is its strength; it never calculates the price.', color: C.green, fill: '193E33' },
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
  pill(slide, 'LIVE: XGBOOST', 0.7, 6.6, 1.3, C.violet, C.white)
  pill(slide, 'SYNTHETIC MAE 2.097 VS 6.332 BASELINE', 2.18, 6.6, 2.95, C.orange2, C.orange)
  pill(slide, 'SAFE TEMPLATE FALLBACK', 5.32, 6.6, 1.95, '385E52', 'D6E5DF')
  footer(slide, 'AI technologies used')
  note(slide, 'State the role split explicitly: XGBoost predicts because demand is tabular and nonlinear. Deterministic policy enforces hard rules. Gemini handles explanations, personalized campaign language and recipe ideas, never pricing. Customer PII stays out of Gemini. The owner decides. Synthetic metrics validate the pipeline, not real-world lift.')
}

// Slide 7 — Technical architecture
{
  const slide = pptx.addSlide('DARK')
  kicker(slide, 'Technical architecture', true)
  title(slide, 'Store-scoped from database row to customer email.', 'The browser is untrusted. Role, store ownership and recommendation state are resolved on the server.', true)
  const bands = [
    { y: 2.22, label: 'EXPERIENCE', color: C.lime, nodes: ['Shopper marketplace', 'Owner portal', 'Offline judge demo'] },
    { y: 3.34, label: 'APPLICATION', color: C.green, nodes: ['Next.js 16 / Vercel', 'Scan + approval APIs', 'Brevo email adapter'] },
    { y: 4.46, label: 'INTELLIGENCE', color: C.violet, nodes: ['XGBoost / FastAPI', 'Constrained optimizer', 'Gemini + recipe copy'] },
    { y: 5.58, label: 'DATA + OPS', color: C.orange, nodes: ['Supabase Auth + RLS', 'PostgreSQL + Storage', 'Render + Vercel Cron'] },
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
  rect(slide, 11.92, 2.15, 0.65, 4.24, '244E42', 0.18)
  text(slide, 'STORE\nID', 12.04, 2.56, 0.41, 0.62, { fontSize: 9, bold: true, color: C.lime, align: 'center', breakLine: true })
  line(slide, 12.24, 3.34, 0, 1.45, '5D7D72', 1.4, 'dash')
  text(slide, 'AUDIT\nTRAIL', 12.04, 5.02, 0.41, 0.72, { fontSize: 9, bold: true, color: C.white, align: 'center', breakLine: true })
  footer(slide, 'Next.js · Supabase · XGBoost · Gemini · Brevo · Render · Vercel', true)
  note(slide, 'Explain trust boundaries. Public values stay in the browser; service role, model secret, Gemini key, Brevo key and cron secret stay server-side. store_id is the tenant key. The approval record connects model evidence to the published price and email campaign.')
}

// Slide 8 — Impact and value proposition
{
  const slide = pptx.addSlide('LIGHT')
  kicker(slide, 'Impact and value proposition')
  title(slide, 'Create value before food becomes waste.', 'FreshSaver aligns store economics, shopper savings and measurable waste prevention.')
  const impacts = [
    { x: 0.68, tag: 'FOR STORES', heading: 'Protect margin', body: 'Choose product-level markdowns instead of blanket discounts, reduce manual review and build an auditable decision trail.', color: C.green, fill: C.green2 },
    { x: 4.55, tag: 'FOR STUDENTS + SHOPPERS', heading: 'Find good local deals', body: 'Use the marketplace free, opt into relevant stores and categories, and receive recipe ideas for approved surplus offers.', color: C.orange, fill: C.orange2 },
    { x: 8.42, tag: 'FOR THE FOOD SYSTEM', heading: 'Keep food in use', body: 'Intervene before surplus, improve sell-through, and record pickups, waste, donation and adjustment outcomes.', color: C.violet, fill: C.violet2 },
  ]
  impacts.forEach((impact, i) => {
    rect(slide, impact.x, 2.22, 3.42, 2.65, C.white, 0.24, C.line, { shadow: true })
    circle(slide, impact.x + 0.25, 2.48, 0.48, impact.color, `${i + 1}`, C.white, 12)
    text(slide, impact.tag, impact.x + 0.87, 2.58, 2.22, 0.2, { fontSize: 8, bold: true, color: impact.color, charSpacing: 0.9 })
    text(slide, impact.heading, impact.x + 0.25, 3.25, 2.92, 0.42, { fontFace: DISPLAY, fontSize: 20, bold: true })
    text(slide, impact.body, impact.x + 0.25, 3.82, 2.88, 0.75, { fontSize: 10.5, color: C.muted, valign: 'top' })
  })
  rect(slide, 0.68, 5.18, 11.16, 0.92, C.forest, 0.2)
  text(slide, 'PILOT IMPACT METRICS', 0.96, 5.46, 1.72, 0.2, { fontSize: 8.5, bold: true, color: C.lime, charSpacing: 1 })
  text(slide, 'kg / tonnes diverted  •  sell-through before expiry  •  gross margin  •  shopper savings  •  pickup rate', 2.72, 5.39, 8.6, 0.32, { fontSize: 11.5, bold: true, color: C.white })
  pill(slide, 'VALUE PROPOSITION', 1.0, 6.42, 1.5, C.lime, C.forest)
  text(slide, 'Prevent waste before it becomes surplus — while making approved food more affordable.', 2.75, 6.38, 8.5, 0.3, { fontSize: 12, bold: true, color: C.ink })
  footer(slide, 'Impact will be measured in a controlled merchant pilot')
  note(slide, 'Do not claim measured tonnes yet. Explain the intended value for three groups: store margin and efficiency, free savings for students and budget-conscious shoppers, and earlier food-waste prevention. State exactly what the pilot will measure.')
}

// Slide 9 — Future roadmap and close
{
  const slide = pptx.addSlide('DARK')
  kicker(slide, 'Future roadmap', true)
  title(slide, 'Pilot, learn, integrate, then scale.', 'FreshSaver is live today and ready for shadow recommendations with independent grocers.', true)
  const roadmap = [
    ['LIVE', 'Deployed MVP', 'Owner portal, shopper app, XGBoost and approval workflow.'],
    ['PILOT', '3–5 retailers', 'Shadow forecasts, capture overrides, measure waste and margin.'],
    ['LEARN', 'Store elasticity', 'Retrain from real intervention response and calibrate ranges.'],
    ['INTEGRATE', 'POS + payments', 'Transactional reservations, POS feeds and electronic shelf labels.'],
    ['SCALE', 'Circular network', 'Donation routing, store transfers and multi-location policies.'],
  ]
  roadmap.forEach(([tag, heading, body], i) => {
    const x = 0.55 + i * 2.5
    rect(slide, x, 2.25, 2.18, 2.65, i === 0 ? C.lime : '244E42', 0.22, i === 0 ? C.lime : '41655A')
    text(slide, tag, x + 0.2, 2.52, 1.05, 0.2, { fontSize: 8, bold: true, color: i === 0 ? C.forest : C.lime, charSpacing: 1 })
    text(slide, heading, x + 0.2, 3.08, 1.78, 0.5, { fontFace: DISPLAY, fontSize: 17, bold: true, color: i === 0 ? C.forest : C.white })
    text(slide, body, x + 0.2, 3.75, 1.75, 0.75, { fontSize: 9.5, color: i === 0 ? '315A4E' : 'BBD0C8', valign: 'top' })
    if (i < roadmap.length - 1) arrow(slide, x + 2.22, 3.35, C.lime)
  })
  rect(slide, 0.75, 5.32, 7.92, 0.92, '244E42', 0.18)
  text(slide, 'PROPOSED BUSINESS MODEL', 1.02, 5.6, 1.72, 0.2, { fontSize: 8.3, bold: true, color: C.lime, charSpacing: 1 })
  text(slide, 'Free for shoppers  •  stores pay 10% of attributable campaign sales  •  no setup fee', 2.78, 5.52, 5.45, 0.35, { fontSize: 11.5, bold: true, color: C.white })
  rect(slide, 9.05, 5.18, 3.55, 1.35, C.paper, 0.22)
  text(slide, 'Would you pilot this?', 9.38, 5.43, 2.85, 0.3, { fontFace: DISPLAY, fontSize: 19, bold: true, color: C.forest, align: 'center' })
  hyperlinkText(slide, 'OPEN LIVE PRODUCT  →', LIVE, 9.5, 5.9, 2.58, 0.24, { fontSize: 10, color: C.green, align: 'center' })
  footer(slide, 'FreshSaver AI · detect risk · protect margin · reach the right shopper', true)
  note(slide, 'Close with the roadmap and ask for a pilot. The MVP is live. The next claim comes from measured merchant outcomes. Shoppers use the app free; the proposed store model is 10% of attributable campaign sales with no setup fee.')
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  const demoQr = await QRCode.toDataURL(DEMO, { margin: 1, width: 320, color: { dark: `#${C.forest}`, light: '#FFFFFF' } })

  const cover = pptx._slides[0]
  cover.addImage({ data: demoQr, x: 11.72, y: 6.1, w: 0.72, h: 0.72, hyperlink: { url: DEMO } })
  const close = pptx._slides[8]
  close.addImage({ data: demoQr, x: 11.98, y: 6.28, w: 0.46, h: 0.46, hyperlink: { url: DEMO } })

  await pptx.writeFile({ fileName: OUTPUT })
  console.log(`Generated ${OUTPUT}`)
}

await main()
