'use client'

import { useState } from 'react'
import { sendCustomBrevoEmail } from './actions'
import { Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function ComposeEmailPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    const formData = new FormData(e.currentTarget)
    const response = await sendCustomBrevoEmail(formData)
    
    if (response.success) {
      setResult({ success: true, message: `Email sent successfully! (ID: ${response.messageId})` })
      ;(e.target as HTMLFormElement).reset()
    } else {
      setResult({ success: false, message: response.error || 'Failed to send email' })
    }
    
    setLoading(false)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col gap-1 pb-6 border-b border-emerald-50">
        <h1 className="text-3xl font-black text-primary tracking-tight font-mono">Compose Email</h1>
        <p className="text-sm text-emerald-400 font-medium font-mono text-[10px] uppercase tracking-widest">
          Send a custom HTML email via Brevo
        </p>
      </div>

      {result && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border ${result.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {result.success ? <CheckCircle size={20} className="text-emerald-500" /> : <AlertCircle size={20} className="text-red-500" />}
          <div className="text-sm font-medium">{result.message}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-8 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-emerald-900 block">To Address</label>
          <input 
            type="email" 
            name="to" 
            required 
            placeholder="customer@example.com"
            className="w-full bg-emerald-50/50 border border-emerald-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium placeholder:text-emerald-300"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-bold text-emerald-900 block">Subject</label>
          <input 
            type="text" 
            name="subject" 
            required 
            placeholder="Special Custom Offer!"
            className="w-full bg-emerald-50/50 border border-emerald-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium placeholder:text-emerald-300"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-bold text-emerald-900 block">HTML Message Format</label>
          <p className="text-xs text-emerald-600 mb-2">Write your email content in raw HTML format. No Template IDs will be used.</p>
          <textarea 
            name="message" 
            required 
            rows={10}
            placeholder="<h1>Hello!</h1><p>This is a custom HTML email.</p>"
            className="w-full bg-emerald-50/50 border border-emerald-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono placeholder:text-emerald-300 resize-y"
          ></textarea>
        </div>

        <div className="pt-4 border-t border-emerald-50">
          <button 
            type="submit" 
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full sm:w-auto bg-primary text-white text-sm px-8 py-3 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-md hover:shadow-emerald-200 font-bold cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Sending via Brevo...</>
            ) : (
              <><Send size={16} /> Send Email</>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
