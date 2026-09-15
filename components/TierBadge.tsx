const styles: Record<string, string> = {
  none: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  tier_1: 'bg-orange-50 text-orange-700 border border-orange-100',
  tier_2: 'bg-red-50 text-red-700 border border-red-100 animate-pulse',
  expired: 'bg-slate-100 text-slate-400 border border-slate-200 line-through opacity-70',
}

const labels: Record<string, string> = {
  none: 'Active',
  tier_1: 'Expiring soon',
  tier_2: 'Final markdown',
  expired: 'Expired',
}

export function TierBadge({ tier, discountPct }: { tier: string; discountPct?: number | null }) {
  const label = discountPct && discountPct > 0 && (tier === 'tier_1' || tier === 'tier_2')
    ? `${labels[tier]} · ${Math.round(discountPct)}% off`
    : labels[tier] ?? tier

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${styles[tier] ?? styles.none}`}>
      {label}
    </span>
  )
}
