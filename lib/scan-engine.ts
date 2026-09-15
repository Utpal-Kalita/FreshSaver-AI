import { SupabaseClient } from '@supabase/supabase-js'
import { daysUntilDate } from '@/lib/date-utils'
import { buildDemandForecast, SalesObservation } from '@/lib/demand-forecast'
import { candidateDiscounts, recommendMarkdown, urgencyTier, type DiscountTier } from '@/lib/markdown-recommender'
import { predictDemandWithML } from '@/lib/ml-demand-client'
import { createMerchandisingBrief, createTemplateMerchandisingBrief } from '@/lib/gemini-merchandising'

export interface ScanSummary {
  scanId: string
  totalProducts: number
  tier1Flagged: number
  tier2Flagged: number
  expiredFlagged: number
  noAction: number
  emailsSent: number
  durationMs: number
}

export type ScanPhaseEvent =
  | { phase: 'fetch'; count: number }
  | { phase: 'ai'; total: number; borderline: number }
  | { phase: 'prices'; changed: number }
  | { phase: 'notify' }

export async function runScan(
  supabase: SupabaseClient,
  triggeredBy: 'cron' | 'manual' = 'cron',
  onProgress?: (event: ScanPhaseEvent) => void,
  storeId?: string
): Promise<ScanSummary> {
  const startTime = Date.now()

  // Idempotency: abort if scan already in progress
  let inProgressQuery = supabase
    .from('scan_logs')
    .select('id')
    .eq('status', 'in_progress')
    .limit(1)
  inProgressQuery = storeId ? inProgressQuery.eq('store_id', storeId) : inProgressQuery.is('store_id', null)
  const { data: inProgress } = await inProgressQuery
  if (inProgress && inProgress.length > 0) {
    throw new Error('A scan is already in progress')
  }

  // Create scan log
  const { data: scanLogRow, error: scanLogErr } = await supabase
    .from('scan_logs')
    .insert({ status: 'in_progress', triggered_by: triggeredBy, store_id: storeId ?? null })
    .select('id')
    .single()
  if (scanLogErr || !scanLogRow) throw new Error(`Failed to create scan log: ${scanLogErr?.message}`)
  const scanId = scanLogRow.id

  let tier1Count = 0, tier2Count = 0, expiredCount = 0, noActionCount = 0
  const emailsSent = 0

  try {
    // Fetch active, non-excluded products — scoped to store if storeId given
    let productQuery = supabase
      .from('products')
      .select('id, sku, product_name, category, original_price, discounted_price, discount_tier, expiry_date, image_url, stock_quantity, manual_override_price, recommendation_version, store_id, unit_cost, minimum_price, disposal_cost_per_unit, stores(name, address)')
      .eq('is_active', true)
      .eq('excluded_from_scan', false)
    if (storeId) productQuery = productQuery.eq('store_id', storeId)
    const { data: products, error: fetchErr } = await productQuery

    if (fetchErr) throw new Error(`Failed to fetch products: ${fetchErr.message}`)
    if (!products || products.length === 0) {
      await supabase.from('scan_logs').update({
        status: 'success',
        total_products: 0,
        duration_ms: Date.now() - startTime,
      }).eq('id', scanId)
      return { scanId, totalProducts: 0, tier1Flagged: 0, tier2Flagged: 0, expiredFlagged: 0, noAction: 0, emailsSent: 0, durationMs: Date.now() - startTime }
    }

    onProgress?.({ phase: 'fetch', count: products.length })

    const now = new Date()
    const historyStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    let ordersQuery = supabase
      .from('orders')
      .select('created_at, order_items(product_id, quantity)')
      .in('status', ['accepted', 'completed'])
      .gte('created_at', historyStart)
    if (storeId) ordersQuery = ordersQuery.eq('store_id', storeId)
    const { data: recentOrders, error: orderHistoryError } = await ordersQuery
    if (orderHistoryError) throw new Error(`Failed to fetch sales history: ${orderHistoryError.message}`)

    const salesByProduct = new Map<string, SalesObservation[]>()
    for (const order of recentOrders ?? []) {
      for (const item of order.order_items ?? []) {
        if (!item.product_id) continue
        const observations = salesByProduct.get(item.product_id) ?? []
        observations.push({ date: order.created_at, quantity: item.quantity })
        salesByProduct.set(item.product_id, observations)
      }
    }

    const nearExpiryCount = products.filter(product => {
      const days = daysUntilDate(product.expiry_date, now)
      return days > 0 && days <= 30
    }).length
    onProgress?.({ phase: 'ai', total: products.length, borderline: nearExpiryCount })

    // Process results
    const scanResultInserts: object[] = []
    const recommendationInserts: object[] = []
    const pendingProductIds: string[] = []
    const maxGeminiProducts = Math.max(0, Number(process.env.MAX_GEMINI_PRODUCTS_PER_SCAN ?? 20))
    let geminiProducts = 0
    let demandModelAvailable = Boolean(process.env.DEMAND_MODEL_URL)
    let geminiAvailable = Boolean(process.env.GEMINI_API_KEY)

    for (const product of products) {
      const daysUntilExpiry = daysUntilDate(product.expiry_date, now)
      const fallbackVelocity = Math.max(0.25, Math.min(Number(product.stock_quantity) || 0, (Number(product.stock_quantity) || 0) / 30))
      const observations = salesByProduct.get(product.id) ?? []
      const forecast = buildDemandForecast(observations, fallbackVelocity, now)
      const tier = urgencyTier(daysUntilExpiry)
      let mlPrediction = null
      if (demandModelAvailable && daysUntilExpiry > 0 && daysUntilExpiry <= 30 && Number(product.stock_quantity) > 0) {
        mlPrediction = await predictDemandWithML({
            productId: product.id,
            storeId: product.store_id,
            category: product.category,
            stockQuantity: Number(product.stock_quantity) || 0,
            daysUntilExpiry,
            originalPrice: Number(product.original_price),
            unitCost: product.unit_cost == null ? null : Number(product.unit_cost),
            observations,
            candidateDiscounts: candidateDiscounts(tier),
            asOf: now.toISOString(),
          })
        if (!mlPrediction) demandModelAvailable = false
      }
      const recommendation = recommendMarkdown({
        productId: product.id,
        productName: product.product_name,
        category: product.category,
        originalPrice: Number(product.original_price),
        unitCost: product.unit_cost == null ? null : Number(product.unit_cost),
        minimumPrice: product.minimum_price == null ? null : Number(product.minimum_price),
        disposalCostPerUnit: Number(product.disposal_cost_per_unit) || 0,
        stockQuantity: Number(product.stock_quantity) || 0,
        daysUntilExpiry,
        manualOverridePrice: product.manual_override_price == null ? null : Number(product.manual_override_price),
        forecast,
        mlPrediction,
      })
      const briefInput = {
        productName: product.product_name,
        category: product.category,
        stockQuantity: Number(product.stock_quantity) || 0,
        daysUntilExpiry,
        originalPrice: Number(product.original_price),
        recommendation,
      }
      const shouldGenerateWithGemini = geminiAvailable &&
        daysUntilExpiry > 0 && daysUntilExpiry <= 30 && geminiProducts < maxGeminiProducts
      const merchandising = shouldGenerateWithGemini
        ? await createMerchandisingBrief(briefInput)
        : createTemplateMerchandisingBrief(briefInput)
      if (shouldGenerateWithGemini) {
        geminiProducts++
        if (merchandising.provider !== 'gemini') geminiAvailable = false
      }
      const newTier = recommendation.tier
      const prevTier = product.discount_tier as DiscountTier

      if (newTier === 'tier_1') tier1Count++
      else if (newTier === 'tier_2') tier2Count++
      else if (newTier === 'expired') expiredCount++
      else noActionCount++

      const newPrice = recommendation.recommendedPrice
      const recommendationReason = {
        action: recommendation.action,
        explanation: recommendation.explanation,
        reason_codes: recommendation.reasonCodes,
        model_mode: recommendation.modelMode,
        prediction_source: recommendation.predictionSource,
        training_data: recommendation.trainingData,
        model_metrics: recommendation.modelMetrics,
        ai_analysis: {
          provider: merchandising.provider,
          model: merchandising.model,
          manager_summary: merchandising.managerSummary,
          risk_signal: merchandising.riskSignal,
        },
        campaign_copy: merchandising.campaign,
        unit_economics: {
          unit_cost: product.unit_cost,
          minimum_price: product.minimum_price,
          disposal_cost_per_unit: product.disposal_cost_per_unit,
        },
        inputs: {
          days_until_expiry: daysUntilExpiry,
          stock_quantity: product.stock_quantity,
          baseline_units_sold: recommendation.baselineUnitsSold,
          expected_units_sold: recommendation.expectedUnitsSold,
          expected_waste: recommendation.expectedWaste,
        },
        candidates: recommendation.candidates,
      }

      if (recommendation.action === 'markdown' && (newTier === 'tier_1' || newTier === 'tier_2')) {
        pendingProductIds.push(product.id)
        recommendationInserts.push({
          store_id: product.store_id,
          product_id: product.id,
          scan_id: scanId,
          status: 'pending',
          tier: newTier,
          regular_price: product.original_price,
          recommended_price: recommendation.recommendedPrice,
          recommended_discount_pct: recommendation.discountPct,
          model_provider: recommendation.predictionSource,
          model_version: recommendation.modelVersion,
          evidence: recommendationReason,
          ai_analysis: recommendationReason.ai_analysis,
          campaign_copy: merchandising.campaign,
          valid_until: product.expiry_date,
        })
      }

      // Build scan result record
      scanResultInserts.push({
        scan_id: scanId,
        product_id: product.id,
        sku: product.sku,
        tier_before: prevTier,
        tier_after: newTier,
        price_before: product.discounted_price ?? product.original_price,
        price_after: newPrice,
        recommended_discount_pct: recommendation.discountPct,
        recommendation_reason: recommendationReason,
        recommendation_confidence: recommendation.confidence,
        recommendation_version: recommendation.modelVersion,
      })

      const productUpdate: Record<string, unknown> = {
        recommended_price: newPrice,
        recommended_discount_pct: recommendation.discountPct,
        recommendation_reason: recommendationReason,
        recommendation_confidence: recommendation.confidence,
        recommendation_version: recommendation.modelVersion,
        recommended_at: now.toISOString(),
      }
      if (recommendation.action !== 'markdown') {
        productUpdate.discount_tier = newTier === 'expired' ? 'expired' : 'none'
        productUpdate.discounted_price = recommendation.action === 'manual_override' ? newPrice : product.original_price
        productUpdate.is_expired = newTier === 'expired'
      }
      const { error: updateError } = await supabase.from('products').update(productUpdate).eq('id', product.id)
      if (updateError) throw new Error(`Failed to update ${product.sku}: ${updateError.message}`)
    }

    if (pendingProductIds.length > 0) {
      await supabase
        .from('recommendations')
        .update({ status: 'superseded', reviewed_at: now.toISOString(), review_reason: 'Replaced by a newer scan' })
        .eq('status', 'pending')
        .in('product_id', pendingProductIds)
    }

    if (recommendationInserts.length > 0) {
      const { error: recommendationError } = await supabase.from('recommendations').insert(recommendationInserts)
      if (recommendationError) throw new Error(`Failed to save pending recommendations: ${recommendationError.message}`)
    }

    onProgress?.({ phase: 'prices', changed: recommendationInserts.length })

    // Insert scan product results in bulk
    if (scanResultInserts.length > 0) {
      const { error: resultInsertError } = await supabase.from('scan_product_results').insert(scanResultInserts)
      if (resultInsertError) throw new Error(`Failed to save scan evidence: ${resultInsertError.message}`)
    }

    onProgress?.({ phase: 'notify' })

    // Campaign copy is ready, but delivery waits for explicit manager approval.

    const durationMs = Date.now() - startTime

    await supabase.from('scan_logs').update({
      status: 'success',
      total_products: products.length,
      tier_1_flagged: tier1Count,
      tier_2_flagged: tier2Count,
      expired_flagged: expiredCount,
      no_action: noActionCount,
      emails_sent: emailsSent,
      duration_ms: durationMs,
    }).eq('id', scanId)

    return {
      scanId,
      totalProducts: products.length,
      tier1Flagged: tier1Count,
      tier2Flagged: tier2Count,
      expiredFlagged: expiredCount,
      noAction: noActionCount,
      emailsSent,
      durationMs,
    }

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    await supabase.from('scan_logs').update({
      status: 'failed',
      error_message: errorMessage,
      duration_ms: Date.now() - startTime,
    }).eq('id', scanId)
    throw err
  }
}
