import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: LucideIcon
  trend?: {
    value: string
    positive: boolean
  }
}

export function StatsCard({ label, value, sub, icon: Icon, trend }: StatsCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-purple-100 p-6 shadow-sm hover:shadow-md transition-all duration-300 group cursor-default">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 rounded-xl bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
          {Icon && <Icon size={20} />}
        </div>
        {trend && (
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
            trend.positive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
          }`}>
            {trend.positive ? '+' : ''}{trend.value}
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-bold text-purple-400 uppercase tracking-wider">{label}</p>
        <p className="text-3xl font-bold text-primary mt-1 tracking-tight font-mono">{value}</p>
        {sub && (
          <div className="mt-3 pt-3 border-t border-purple-50">
            <p className="text-[11px] text-purple-500/70 font-medium italic">{sub}</p>
          </div>
        )}
      </div>
    </div>
  )
}
