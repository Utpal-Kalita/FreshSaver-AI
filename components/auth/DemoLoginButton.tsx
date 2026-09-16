import { PlayCircle, Store, UserRound } from 'lucide-react'

export function DemoLoginButton({ role }: { role: 'owner' | 'customer' }) {
  const isOwner = role === 'owner'
  const Icon = isOwner ? Store : UserRound

  return (
    <form action="/api/auth/demo" method="POST">
      <input type="hidden" name="role" value={role} />
      <button
        type="submit"
        className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-black transition ${isOwner ? 'border-emerald-900/15 bg-emerald-50 text-emerald-900 hover:bg-emerald-100' : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'}`}
      >
        <Icon size={17} />
        {isOwner ? 'Enter demo owner account' : 'Continue as demo shopper'}
        <PlayCircle size={15} className="opacity-55" />
      </button>
    </form>
  )
}
