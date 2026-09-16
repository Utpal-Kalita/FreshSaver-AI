import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import PDFDocument from 'pdfkit'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUTPUT_DIR = path.join(ROOT, 'docs', 'video')
const PDF_PATH = path.join(OUTPUT_DIR, 'FreshSaver-5-Minute-Demo-Video-Script.pdf')
const MD_PATH = path.join(OUTPUT_DIR, 'FreshSaver-5-Minute-Demo-Video-Script.md')
const COVER_IMAGE = path.join(ROOT, 'docs', 'deck', 'assets', 'supermarket-food-waste.jpg')

const LIVE = 'https://freshsaver-ai.vercel.app'
const MODEL = 'https://freshsaver-demand-model.onrender.com/health'
const DECK = 'docs/deck/FreshSaver-AI-Builders-Hackathon.pptx'
const SOURCE = 'https://github.com/Utpal-Kalita/FreshSaver-AI'

const C = {
  forest: '#173D31',
  forest2: '#0D2B22',
  cream: '#F6F3EA',
  paper: '#FFFDF7',
  lime: '#BEF264',
  green: '#10B981',
  greenSoft: '#DDF7E8',
  orange: '#F97316',
  orangeSoft: '#FFF0E7',
  violet: '#7C3AED',
  violetSoft: '#F2ECFF',
  red: '#DC5B57',
  ink: '#15352C',
  muted: '#667D75',
  line: '#D9E3DD',
  white: '#FFFFFF',
}

const scenes = [
  {
    time: '00:00–00:22',
    duration: 22,
    criterion: 'Problem being solved',
    screen: `PowerPoint: ${DECK}\nSlide 1 — “Fresh today. Expired tomorrow. Wasted forever.”`,
    action: 'Begin on the full-screen cover. Pause on the supermarket food-waste image before speaking. Keep the image attribution visible.',
    narration: 'At closing time, a neighborhood grocer still has milk, spinach, bread, and meat approaching their expiry dates. The food is still usable and still valuable, but the window to sell it is closing. The owner has to decide: hold the price, discount now, or risk throwing it away.',
    overlay: 'Fresh today. Expired tomorrow. Wasted forever.',
  },
  {
    time: '00:22–00:52',
    duration: 30,
    criterion: 'Problem scale and impact',
    screen: `PowerPoint: ${DECK}\nSlide 2 — “The waste is global. The decision is local.”`,
    action: 'Reveal each sourced number from left to right: 1.05B tonnes, roughly US$1T, 8–10% of GHG emissions, 12% at retail, and the EU date-marking estimate.',
    narration: 'UNEP reports 1.05 billion tonnes of food waste in 2022 across households, food service, and retail, with retail responsible for 12 percent. Food loss and waste cost the global economy roughly one trillion US dollars a year and generate 8 to 10 percent of greenhouse-gas emissions. Separately, the European Commission estimates that up to 10 percent of annual EU food waste is linked to date marking. FreshSaver focuses on the retailer’s decision window.',
    overlay: 'UNEP Food Waste Index 2024 • European Commission date-marking study',
  },
  {
    time: '00:52–01:15',
    duration: 23,
    criterion: 'Solution overview',
    screen: `${LIVE}/\nPublic landing page`,
    action: 'Switch from slides to the live landing page. Scroll from the hero to “Make prevention easier than disposal,” then stop at the three-step mission cards.',
    narration: 'FreshSaver acts before food becomes surplus. It combines inventory, expiry, recent demand, unit economics, owner approval, and shopper activation in one workflow. The goal is not the deepest discount. It is the right intervention, early enough to protect value and find a buyer.',
    overlay: 'Detect risk → choose intervention → connect a buyer',
  },
  {
    time: '01:15–01:40',
    duration: 25,
    criterion: 'Target users and owner experience',
    screen: `${LIVE}/login\nThen ${LIVE}/dashboard`,
    action: 'Click “Enter demo owner account.” On Dashboard, point to Active Products, Expiring in 30 Days, Active Deals, Deal Subscribers, and the upcoming-expiry queue.',
    narration: 'The primary user is an independent grocery owner. One-click demo access opens a store-scoped dashboard showing active products, inventory approaching expiry, live deals, subscribers, and the next products needing attention. Every query is restricted to the owner’s assigned store.',
    overlay: 'Store-scoped owner portal',
  },
  {
    time: '01:40–02:00',
    duration: 20,
    criterion: 'Key feature: inventory',
    screen: `${LIVE}/dashboard/products\nBriefly open ${LIVE}/dashboard/products/upload`,
    action: 'Show the product list columns. Point to original price, current price, discount, expiry status, Add Product, and Import CSV. Do not upload during the recording.',
    narration: 'Owners can add products manually or import their existing CSV. FreshSaver validates dates, prices, stock, duplicate SKUs, unit cost, minimum price, and disposal cost. The product table turns that data into a live expiry and pricing view.',
    overlay: 'CSV-first onboarding • no new shelf hardware',
  },
  {
    time: '02:00–02:20',
    duration: 20,
    criterion: 'Key feature: customer consent',
    screen: `${LIVE}/dashboard/customers\nOptional second tab: ${LIVE}/store/willow-pine-market`,
    action: 'Show the customer table and point to interests, opt-in source, and status. Briefly show the store-profile “Notify me about deals” action if time allows.',
    narration: 'The customer database is also store-specific. Shoppers opt in on a store page or through an in-store QR journey. Owners see the consent source and category interests, so a dairy offer reaches dairy subscribers instead of becoming a broad promotion.',
    overlay: 'Explicit store opt-in • category matching',
  },
  {
    time: '02:20–02:48',
    duration: 28,
    criterion: 'Role of AI: what and why',
    screen: `PowerPoint: ${DECK}\nSlide 5 — “Two AIs. Two jobs. One controlled decision.”`,
    action: 'Show the four columns from left to right. Pause on each WHAT and WHY block: XGBoost, optimizer, Gemini, and store owner.',
    narration: 'FreshSaver uses two AI systems for different jobs. XGBoost predicts numerical demand because grocery data is tabular: stock, price, expiry, category, and sales velocity. The optimizer is not AI; it enforces deterministic price floors and safety rules. Gemini is optional and turns fixed evidence into clear language, campaign copy, and a recipe idea, but never chooses the price. The store owner remains the final authority.',
    overlay: 'XGBoost predicts → policy constrains → Gemini communicates → owner decides',
  },
  {
    time: '02:48–03:35',
    duration: 47,
    criterion: 'Live AI demonstration and approval',
    screen: `${LIVE}/dashboard/pricing\nBefore recording, warm ${MODEL}`,
    action: 'Click “Run Agent Now.” Keep the four progress stages visible. When recommendation cards appear, point to XGBoost, range, clearance probability, margin, factors, model version, training provenance, Approve & Notify, and Reject.',
    narration: 'Now we run that architecture live. XGBoost predicts sell-through under every allowed price and returns a low, expected, and high range with feature contributions. The optimizer applies unit cost, disposal cost, expiry rules, the merchant’s minimum price, and discount limits. The result is stored as a pending recommendation with model provenance, expected margin, clearance probability, and top factors. Nothing is published silently. The owner can approve or reject it, and approval records the reviewer before activating the deal.',
    overlay: 'Live XGBoost evidence • pending owner decision',
  },
  {
    time: '03:35–04:15',
    duration: 40,
    criterion: 'Explainability, approval, and customer outcome',
    screen: `${LIVE}/dashboard/pricing\nThen ${LIVE}/deals, /auth/login and /account`,
    action: 'Show Approve & Notify and Reject without changing shared state. Switch to Deals and open an already approved product. Show price, store, stock, and pickup context. Use “Continue as demo shopper,” then show Account.',
    narration: 'Every recommendation remains inspectable and reversible. Approval publishes the price and activates only shoppers who opted into that store and category. On the customer side, the approved deal shows the current price, store, stock, and pickup context. The cart is restricted to one store, checkout re-reads price and availability from the database, and the shopper can see the order in their account. This closes the loop from prediction to an actionable local offer.',
    overlay: 'Approved deal → local shopper → pickup workflow',
  },
  {
    time: '04:15–04:45',
    duration: 30,
    criterion: 'Impact, value proposition, and close',
    screen: `PowerPoint: ${DECK}\nSlide 10 — “Pilot, measure, then scale.”`,
    action: 'Return to the closing slide. Pause on the live-demo link and roadmap. End before 04:45 and leave five seconds of clean video tail.',
    narration: 'FreshSaver is live today: a public marketplace, a store-scoped owner portal, a remote XGBoost model, and a human approval loop. For stores, the value is earlier action and margin-aware pricing. For shoppers, it is affordable local food. For the food system, it is another chance to sell usable inventory before it becomes waste. The next milestone is a controlled store pilot that measures forecast quality, margin, sell-through, and actual waste.',
    overlay: 'Detect risk. Protect margin. Reach the right shopper.',
  },
]

const requirements = [
  ['Problem being solved', '00:00–00:52', 'Sourced waste scale plus the local expiry-pricing decision'],
  ['How the solution works', '00:52–01:15', 'Inventory → prediction → policy → approval → shopper'],
  ['Key features and functionality', '01:15–02:20 and 02:48–04:15', 'Owner, products, customers, pricing, marketplace, account'],
  ['Role of AI', '02:20–03:35', 'Slide 5 role split plus live XGBoost evidence'],
  ['Live product demonstration', '00:52–04:15', 'Production Vercel app and connected Render model'],
]

const preflight = [
  `Open ${MODEL} once to warm the free Render service.`,
  'Use a 1920×1080 recording canvas and browser zoom around 85–90%.',
  'Hide bookmarks, notifications, personal tabs, passwords, and developer tokens.',
  `Open the deck at Slides 1, 2, 5 and 10, plus browser tabs for ${LIVE}/, /login, /dashboard, /dashboard/products, /dashboard/customers, /dashboard/pricing, /deals, /auth/login, and /account.`,
  'Confirm the owner and shopper demo buttons work in a private browser window.',
  'Run the agent once before recording so a pending XGBoost recommendation exists as backup.',
  'Do not enter real card data. Checkout is explicitly a mock payment experience.',
  'Keep the “Synthetic data” label visible whenever the credential-free demo is shown.',
]

const recovery = [
  ['Render cold start', 'Open /health, wait for status 200, then restart the Pricing Log scene.'],
  ['Agent takes too long', 'Use the already-generated pending recommendation and say the scan was pre-run for recording continuity.'],
  ['Gemini unavailable', 'Point to “template fallback” and explain that pricing is XGBoost plus deterministic policy, independent of Gemini.'],
  ['Brevo unavailable', 'Do not claim an email was delivered. Say approval prepares the campaign and provider delivery is optional.'],
  ['Database issue', 'Switch to /demo and continue with the clearly labeled synthetic fallback workflow.'],
  ['Asked for ROI', 'No causal ROI is claimed. The next milestone is a controlled merchant pilot.'],
]

function words(value) {
  return value.trim().split(/\s+/).filter(Boolean).length
}

const totalSeconds = scenes.reduce((sum, scene) => sum + scene.duration, 0)
const requiredCriteria = ['Problem being solved', 'How the solution works', 'Key features and functionality', 'Role of AI', 'Live product demonstration']
if (totalSeconds > 300) throw new Error(`Video script exceeds five minutes: ${totalSeconds} seconds`)
if (scenes.length !== 10) throw new Error(`Expected 10 scenes, received ${scenes.length}`)
for (const criterion of requiredCriteria) {
  if (!requirements.some(row => row[0] === criterion)) throw new Error(`Missing video requirement: ${criterion}`)
}

function generateMarkdown() {
  const totalWords = scenes.reduce((sum, scene) => sum + words(scene.narration), 0)
  const lines = [
    '# FreshSaver 5-Minute Demo Video Script',
    '',
    `Target runtime: **4:45**`,
    '',
    `Narration: **${totalWords} words**`,
    '',
    '## Requirement Coverage',
    '',
    '| Requirement | Time | Evidence |',
    '|---|---|---|',
    ...requirements.map(row => `| ${row[0]} | ${row[1]} | ${row[2]} |`),
    '',
    '## Pre-Recording Checklist',
    '',
    ...preflight.map(item => `- ${item}`),
    '',
    '## Script',
    '',
  ]

  for (const [index, scene] of scenes.entries()) {
    lines.push(`### Scene ${index + 1}: ${scene.time} — ${scene.criterion}`)
    lines.push('')
    lines.push(`**Screen:** ${scene.screen.replaceAll('\n', ' → ')}`)
    lines.push('')
    lines.push(`**Action:** ${scene.action}`)
    lines.push('')
    lines.push(`**Narration (${words(scene.narration)} words):**`)
    lines.push('')
    lines.push(`> ${scene.narration}`)
    lines.push('')
    lines.push(`**Suggested overlay:** ${scene.overlay}`)
    lines.push('')
  }

  lines.push('## Recovery Lines', '', '| Situation | Response |', '|---|---|')
  lines.push(...recovery.map(row => `| ${row[0]} | ${row[1]} |`))
  lines.push('', '## Sources Used In The Opening', '')
  lines.push('- UNEP Food Waste Index Report 2024: https://www.unep.org/resources/publication/food-waste-index-report-2024')
  lines.push('- UNEP key findings: https://www.unep.org/news-and-stories/press-release/world-squanders-over-1-billion-meals-day-un-report')
  lines.push('- European Commission date-marking study: https://food.ec.europa.eu/food-safety/food-waste/eu-actions-against-food-waste/date-marking-and-food-waste-prevention_en')
  lines.push('', 'Do not say that all global food waste is caused by expiry dates. The date-marking estimate is EU-specific.', '')
  return lines.join('\n')
}

function rounded(doc, x, y, w, h, color, radius = 12, stroke = null) {
  doc.roundedRect(x, y, w, h, radius).fillAndStroke(color, stroke || color)
}

function label(doc, value, x, y, width, fill, color) {
  rounded(doc, x, y, width, 20, fill, 10)
  doc.fillColor(color).font('Helvetica-Bold').fontSize(7.5).text(value.toUpperCase(), x + 8, y + 6, { width: width - 16, align: 'center' })
}

function addFooter(doc, page, dark = false) {
  doc.strokeColor(dark ? '#42675B' : C.line).lineWidth(0.7).moveTo(38, 565).lineTo(804, 565).stroke()
  doc.fillColor(dark ? C.lime : C.green).font('Helvetica-Bold').fontSize(7).text('FRESHSAVER', 40, 572)
  doc.fillColor(dark ? '#9BB1A8' : '#82938D').font('Helvetica').text(`5-minute demo script  •  page ${page}`, 710, 572, { width: 90, align: 'right' })
}

function addHeader(doc, kicker, heading, subheading, dark = false) {
  doc.fillColor(dark ? C.lime : C.green).font('Helvetica-Bold').fontSize(8).text(kicker.toUpperCase(), 40, 32, { characterSpacing: 1.2 })
  doc.fillColor(dark ? C.white : C.ink).font('Helvetica-Bold').fontSize(23).text(heading, 40, 52, { width: 755 })
  if (subheading) doc.fillColor(dark ? '#B9CBC4' : C.muted).font('Helvetica').fontSize(10).text(subheading, 40, 83, { width: 750 })
}

function sceneCard(doc, scene, index, y) {
  doc.font('Helvetica-Bold').fontSize(10)
  if (doc.heightOfString(scene.screen, { width: 215 }) > 48) throw new Error(`Scene ${index + 1} screen text overflows`)
  doc.font('Helvetica').fontSize(8.6)
  if (doc.heightOfString(scene.action, { width: 215, lineGap: 1 }) > 58) throw new Error(`Scene ${index + 1} action text overflows`)
  doc.font('Helvetica').fontSize(9.5)
  if (doc.heightOfString(`“${scene.narration}”`, { width: 475, lineGap: 2 }) > 100) throw new Error(`Scene ${index + 1} narration overflows`)

  rounded(doc, 36, y, 770, 218, C.paper, 14, C.line)
  label(doc, `Scene ${index + 1}`, 52, y + 16, 64, C.greenSoft, C.green)
  label(doc, scene.time, 124, y + 16, 83, C.forest, C.white)
  label(doc, scene.criterion, 216, y + 16, 172, C.violetSoft, C.violet)

  doc.fillColor(C.green).font('Helvetica-Bold').fontSize(7.5).text('SCREEN TO SHOW', 52, y + 52, { characterSpacing: 0.8 })
  doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(10).text(scene.screen, 52, y + 67, { width: 215, height: 48 })
  doc.fillColor(C.orange).font('Helvetica-Bold').fontSize(7.5).text('ON-SCREEN ACTION', 52, y + 122, { characterSpacing: 0.8 })
  doc.fillColor(C.muted).font('Helvetica').fontSize(8.6).text(scene.action, 52, y + 137, { width: 215, height: 58, lineGap: 1 })

  doc.strokeColor(C.line).lineWidth(0.8).moveTo(282, y + 50).lineTo(282, y + 197).stroke()
  doc.fillColor(C.violet).font('Helvetica-Bold').fontSize(7.5).text(`NARRATION • ${words(scene.narration)} WORDS`, 300, y + 52, { characterSpacing: 0.8 })
  doc.fillColor(C.ink).font('Helvetica').fontSize(9.5).text(`“${scene.narration}”`, 300, y + 70, { width: 475, height: 100, lineGap: 2 })
  rounded(doc, 300, y + 175, 475, 24, C.greenSoft, 8)
  doc.fillColor(C.forest).font('Helvetica-Bold').fontSize(8).text(`OVERLAY: ${scene.overlay}`, 312, y + 183, { width: 451, align: 'center' })
}

async function generatePdf() {
  await fsp.mkdir(OUTPUT_DIR, { recursive: true })
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0, autoFirstPage: false, info: { Title: 'FreshSaver 5-Minute Demo Video Script', Author: 'FreshSaver AI', Subject: 'AI Builders Hackathon demo script' } })
  const output = fs.createWriteStream(PDF_PATH)
  doc.pipe(output)

  // Cover
  doc.addPage({ size: 'A4', layout: 'landscape', margin: 0 })
  doc.rect(0, 0, 842, 595).fill(C.forest)
  doc.image(COVER_IMAGE, 510, 0, { cover: [332, 595], align: 'center', valign: 'center' })
  doc.rect(500, 0, 342, 595).fillOpacity(0.16).fill(C.forest2).fillOpacity(1)
  label(doc, 'AI Builders Hackathon 2026', 44, 48, 164, '#2A5548', C.lime)
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(35).text('FreshSaver', 44, 105, { width: 420 })
  doc.fillColor(C.lime).fontSize(29).text('5-minute demo video script', 44, 151, { width: 430 })
  doc.fillColor('#C5D7D0').font('Helvetica').fontSize(13).text('Exactly what to show, click, say, and overlay — timed to finish at 4:45.', 44, 210, { width: 415, lineGap: 3 })
  rounded(doc, 44, 282, 404, 120, '#244E42', 16)
  doc.fillColor(C.lime).font('Helvetica-Bold').fontSize(9).text('VIDEO REQUIREMENTS COVERED', 64, 302, { characterSpacing: 1 })
  doc.fillColor(C.white).font('Helvetica').fontSize(11).text('Problem  •  solution  •  key features  •  AI role  •  live demonstration', 64, 330, { width: 360, lineGap: 5 })
  doc.fillColor('#A8BDB5').fontSize(9).text('Target runtime: 4:45  |  Hard limit: 5:00', 64, 372)
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(11).text(LIVE, 44, 460, { link: LIVE, underline: true })
  doc.fillColor('#B9CBC4').font('Helvetica').fontSize(8.5).text(SOURCE, 44, 482, { width: 420, link: SOURCE, underline: true })
  doc.fillColor('#D4E1DC').font('Helvetica').fontSize(8).text('Image: “Supermarket dumpster” by KVDP, public domain, Wikimedia Commons', 520, 556, { width: 294, align: 'right' })
  addFooter(doc, 1, true)

  // Requirements and preflight
  doc.addPage({ size: 'A4', layout: 'landscape', margin: 0 })
  doc.rect(0, 0, 842, 595).fill(C.cream)
  addHeader(doc, 'Recording plan', 'Before you press Record', 'Prepare the tabs once, then follow the scene cards without improvising claims.')
  doc.fillColor(C.green).font('Helvetica-Bold').fontSize(8).text('REQUIREMENT COVERAGE', 40, 119, { characterSpacing: 1 })
  requirements.forEach((row, i) => {
    const y = 141 + i * 39
    rounded(doc, 40, y, 760, 31, i % 2 ? '#FBFCFB' : C.white, 7, '#E5ECE8')
    doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(8.5).text(row[0], 52, y + 10, { width: 170 })
    doc.fillColor(C.violet).font('Helvetica-Bold').text(row[1], 232, y + 10, { width: 130 })
    doc.fillColor(C.muted).font('Helvetica').text(row[2], 370, y + 10, { width: 414 })
  })
  doc.fillColor(C.orange).font('Helvetica-Bold').fontSize(8).text('PRE-FLIGHT CHECKLIST', 40, 355, { characterSpacing: 1 })
  preflight.forEach((item, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = 40 + col * 383
    const y = 380 + row * 42
    doc.circle(x + 7, y + 7, 7).fill(C.green)
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(7).text('✓', x + 3.5, y + 3.5, { width: 7, align: 'center' })
    doc.fillColor(C.ink).font('Helvetica').fontSize(8).text(item, x + 22, y, { width: 344, height: 35, lineGap: 1 })
  })
  addFooter(doc, 2)

  // Script scenes, two per page
  for (let pageIndex = 0; pageIndex < 5; pageIndex++) {
    doc.addPage({ size: 'A4', layout: 'landscape', margin: 0 })
    doc.rect(0, 0, 842, 595).fill(C.cream)
    const first = scenes[pageIndex * 2]
    const second = scenes[pageIndex * 2 + 1]
    addHeader(doc, `Scenes ${pageIndex * 2 + 1}–${pageIndex * 2 + 2}`, `${first.time} to ${second.time}`, 'Show the named screen, perform the action, then read the narration naturally.')
    sceneCard(doc, first, pageIndex * 2, 112)
    sceneCard(doc, second, pageIndex * 2 + 1, 342)
    addFooter(doc, pageIndex + 3)
  }

  // Recovery and sources
  doc.addPage({ size: 'A4', layout: 'landscape', margin: 0 })
  doc.rect(0, 0, 842, 595).fill(C.forest)
  addHeader(doc, 'Recovery plan', 'If something fails, keep the story moving.', 'Do not debug on camera. Use one sentence, switch to the prepared fallback, and continue.', true)
  recovery.forEach((row, i) => {
    const col = i % 2
    const r = Math.floor(i / 2)
    const x = 40 + col * 390
    const y = 123 + r * 96
    rounded(doc, x, y, 370, 78, '#244E42', 12, '#42675B')
    doc.fillColor(C.lime).font('Helvetica-Bold').fontSize(9).text(row[0].toUpperCase(), x + 16, y + 13, { width: 338, characterSpacing: 0.8 })
    doc.fillColor('#D2DFDA').font('Helvetica').fontSize(8.5).text(row[1], x + 16, y + 34, { width: 338, height: 34, lineGap: 1 })
  })
  rounded(doc, 40, 425, 760, 103, C.paper, 14)
  doc.fillColor(C.green).font('Helvetica-Bold').fontSize(8).text('OPENING SOURCES', 58, 444, { characterSpacing: 1 })
  doc.fillColor(C.ink).font('Helvetica').fontSize(8.2).text('UNEP Food Waste Index Report 2024 and key findings', 58, 467, { width: 330, link: 'https://www.unep.org/resources/publication/food-waste-index-report-2024', underline: true })
  doc.text('European Commission date-marking and food-waste prevention', 58, 488, { width: 330, link: 'https://food.ec.europa.eu/food-safety/food-waste/eu-actions-against-food-waste/date-marking-and-food-waste-prevention_en', underline: true })
  doc.fillColor(C.red).font('Helvetica-Bold').fontSize(8.5).text('CLAIM DISCIPLINE', 430, 444, { characterSpacing: 1 })
  doc.fillColor(C.ink).font('Helvetica').fontSize(8.4).text('Do not say all global food waste is caused by expiry dates. The date-marking estimate is EU-specific. Do not call synthetic campaign value incremental revenue.', 430, 467, { width: 338, height: 48, lineGap: 2 })
  addFooter(doc, 8, true)

  doc.end()
  await new Promise((resolve, reject) => {
    output.on('finish', resolve)
    output.on('error', reject)
  })
}

await fsp.mkdir(OUTPUT_DIR, { recursive: true })
await fsp.writeFile(MD_PATH, generateMarkdown(), 'utf8')
await generatePdf()

const totalWords = scenes.reduce((sum, scene) => sum + words(scene.narration), 0)
console.log(`Generated ${PDF_PATH}`)
console.log(`Generated ${MD_PATH}`)
console.log(`Runtime: ${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`)
console.log(`Narration words: ${totalWords}`)
