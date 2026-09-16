import type { MarkdownRecommendation } from '@/lib/markdown-recommender'

export interface CampaignCopy {
  subject: string
  headline: string
  body: string
  recipe: RecipeIdea
}

export interface RecipeIdea {
  title: string
  intro: string
  ingredients: string[]
  steps: string[]
}

export interface MerchandisingBrief {
  provider: 'gemini' | 'template'
  model: string
  managerSummary: string
  riskSignal: 'low' | 'medium' | 'high'
  campaign: CampaignCopy
}

interface MerchandisingInput {
  productName: string
  category: string
  stockQuantity: number
  daysUntilExpiry: number
  originalPrice: number
  recommendation: MarkdownRecommendation
}

function plainText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== 'string') return fallback
  const normalized = value.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim()
  return normalized ? normalized.slice(0, maxLength) : fallback
}

function plainTextList(value: unknown, fallback: string[], maxItems: number, maxLength: number) {
  if (!Array.isArray(value)) return fallback
  const items = value
    .map(item => plainText(item, '', maxLength))
    .filter(Boolean)
    .slice(0, maxItems)
  return items.length > 0 ? items : fallback
}

export function createTemplateRecipe(productName: string, category: string): RecipeIdea {
  const categoryKey = category.toLowerCase()
  if (categoryKey.includes('dairy')) {
    return {
      title: `Creamy ${productName} breakfast bowl`,
      intro: `Turn your ${productName} deal into a quick breakfast or snack.`,
      ingredients: [productName, 'Rolled oats', 'Seasonal fruit', 'Cinnamon', 'Honey or another sweetener'],
      steps: ['Warm the oats with the dairy product until creamy.', 'Top with fruit and a pinch of cinnamon.', 'Finish with a small drizzle of honey and serve.'],
    }
  }
  if (categoryKey.includes('bakery')) {
    return {
      title: `Crispy ${productName} savory bites`,
      intro: `Give your bakery deal a second life as a fast snack or side.`,
      ingredients: [productName, 'Olive oil', 'Garlic or mixed herbs', 'Grated cheese', 'Fresh tomato or dip'],
      steps: ['Cut the bakery item into bite-sized pieces.', 'Toss lightly with oil and herbs.', 'Toast until crisp, then serve with tomato or your favorite dip.'],
    }
  }
  if (categoryKey.includes('produce')) {
    return {
      title: `Quick roasted ${productName} bowl`,
      intro: `Use your produce deal in a flexible bowl that works for lunch or dinner.`,
      ingredients: [productName, 'Olive oil', 'Salt and pepper', 'Cooked rice or grains', 'Yogurt, hummus, or another sauce'],
      steps: ['Chop the produce into even pieces.', 'Season and roast or sauté until tender.', 'Serve over grains and finish with your chosen sauce.'],
    }
  }
  if (categoryKey.includes('meat') || categoryKey.includes('seafood')) {
    return {
      title: `Simple spiced ${productName} skillet`,
      intro: `Build a quick meal around the featured protein and vegetables you already have.`,
      ingredients: [productName, 'Cooking oil', 'Onion or garlic', 'Mixed vegetables', 'Your preferred spice blend'],
      steps: ['Prepare the product according to its package handling instructions.', 'Cook thoroughly with oil, aromatics, and spices.', 'Add vegetables and continue cooking until everything is safely done.'],
    }
  }
  return {
    title: `Easy ${productName} kitchen idea`,
    intro: `Use the featured deal in a simple meal with flexible pantry ingredients.`,
    ingredients: [productName, 'Cooking oil or sauce', 'Seasonal vegetables', 'Rice, bread, or another staple', 'Herbs or spices'],
    steps: ['Prepare the product according to its package instructions.', 'Combine it with your chosen vegetables and seasoning.', 'Serve with a staple you already have at home.'],
  }
}

export function createTemplateMerchandisingBrief(input: MerchandisingInput): MerchandisingBrief {
  const discount = Math.round(input.recommendation.discountPct)
  const riskSignal = input.daysUntilExpiry <= 3 ? 'high' : input.daysUntilExpiry <= 15 ? 'medium' : 'low'
  const recipe = createTemplateRecipe(input.productName, input.category)
  return {
    provider: 'template',
    model: 'deterministic-copy-v1',
    managerSummary: input.recommendation.explanation,
    riskSignal,
    campaign: {
      subject: discount > 0 ? `${discount}% off ${input.productName} plus a recipe idea` : `${input.productName} and a recipe idea`,
      headline: discount > 0 ? `Save ${discount}% and make something delicious` : 'Fresh and available today',
      body: discount > 0
        ? `Pick up ${input.productName} at a better price and try a simple recipe built around your deal.`
        : `${input.productName} is available from your local FreshSaver store.`,
      recipe,
    },
  }
}

export async function createMerchandisingBrief(input: MerchandisingInput): Promise<MerchandisingBrief> {
  const fallback = createTemplateMerchandisingBrief(input)
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return fallback

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  const evidence = {
    product: input.productName,
    category: input.category,
    stockQuantity: input.stockQuantity,
    daysUntilExpiry: input.daysUntilExpiry,
    originalPrice: input.originalPrice,
    recommendedPrice: input.recommendation.recommendedPrice,
    discountPct: input.recommendation.discountPct,
    action: input.recommendation.action,
    predictionSource: input.recommendation.predictionSource,
    trainingData: input.recommendation.trainingData,
    expectedUnitsSold: input.recommendation.expectedUnitsSold,
    expectedWaste: input.recommendation.expectedWaste,
    candidates: input.recommendation.candidates.map(candidate => ({
      discountPct: candidate.discountPct,
      price: candidate.price,
      expectedUnitsSold: candidate.expectedUnitsSold,
      range: [candidate.lowUnits, candidate.highUnits],
      expectedMargin: candidate.expectedMargin,
      clearanceProbability: candidate.clearanceProbability,
      topFactors: candidate.factors.slice(0, 3),
    })),
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: 'You are FreshSaver merchandising AI. Use only the supplied numerical evidence. Never change the selected price, discount, expiry date, or predicted values. Do not make food-safety claims, guarantees, causal impact claims, or use urgency that is unsupported. Write concise plain text for a store manager and opted-in shoppers. Create one practical recipe idea that uses the featured product, with 4 to 6 short ingredients and 3 to 4 short steps. Never claim that near-expiry food is safe; assume the customer must follow the package date, storage, allergen, and cooking instructions.' }],
          },
          contents: [{ role: 'user', parts: [{ text: `Create a grounded merchandising brief from this JSON evidence:\n${JSON.stringify(evidence)}` }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                managerSummary: { type: 'STRING' },
                riskSignal: { type: 'STRING', enum: ['low', 'medium', 'high'] },
                emailSubject: { type: 'STRING' },
                emailHeadline: { type: 'STRING' },
                emailBody: { type: 'STRING' },
                recipeTitle: { type: 'STRING' },
                recipeIntro: { type: 'STRING' },
                recipeIngredients: { type: 'ARRAY', items: { type: 'STRING' } },
                recipeSteps: { type: 'ARRAY', items: { type: 'STRING' } },
              },
              required: ['managerSummary', 'riskSignal', 'emailSubject', 'emailHeadline', 'emailBody', 'recipeTitle', 'recipeIntro', 'recipeIngredients', 'recipeSteps'],
            },
          },
        }),
        signal: controller.signal,
      },
    )
    if (!response.ok) return fallback

    const payload = await response.json()
    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text
    if (typeof text !== 'string') return fallback
    const generated = JSON.parse(text) as Record<string, unknown>
    const riskSignal = generated.riskSignal === 'high' || generated.riskSignal === 'medium' ? generated.riskSignal : 'low'

    return {
      provider: 'gemini',
      model,
      managerSummary: plainText(generated.managerSummary, fallback.managerSummary, 500),
      riskSignal,
      campaign: {
        subject: plainText(generated.emailSubject, fallback.campaign.subject, 120),
        headline: plainText(generated.emailHeadline, fallback.campaign.headline, 140),
        body: plainText(generated.emailBody, fallback.campaign.body, 600),
        recipe: {
          title: plainText(generated.recipeTitle, fallback.campaign.recipe.title, 120),
          intro: plainText(generated.recipeIntro, fallback.campaign.recipe.intro, 280),
          ingredients: plainTextList(generated.recipeIngredients, fallback.campaign.recipe.ingredients, 6, 100),
          steps: plainTextList(generated.recipeSteps, fallback.campaign.recipe.steps, 4, 180),
        },
      },
    }
  } catch {
    return fallback
  } finally {
    clearTimeout(timeout)
  }
}
