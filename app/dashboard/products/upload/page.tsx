'use client'

import { useState, useRef } from 'react'
import { Upload, FileCheck, AlertCircle, CheckCircle2, Info, ChevronRight, Loader2 } from 'lucide-react'

interface ImportResult {
 added: number
 updated: number
 failed: number
 errors: { row: number; sku: string; reason: string } []
}

export default function UploadPage() {
 const [file, setFile] = useState<File | null>(null)
 const [loading, setLoading] = useState(false)
 const [result, setResult] = useState<ImportResult | null>(null)
 const [apiError, setApiError] = useState('')
 const inputRef = useRef<HTMLInputElement>(null)

 async function handleUpload(e: React.FormEvent) {
 e.preventDefault()
 if (!file) return

 setLoading(true)
 setResult(null)
 setApiError('')

 const form = new FormData()
 form.append('file', file)

 try {
 const res = await fetch('/api/products/import', { method: 'POST', body: form })
 const data = await res.json()

 if (!res.ok) {
 setApiError(data.error ?? 'Upload failed')
 } else {
 setResult(data)
 }
  } catch {
 setApiError('Network error occurred during upload')
 }
 setLoading(false)
 }

 return (
 <div className="max-w-4xl space-y-10">
 <header className="flex flex-col gap-1 pb-6 border-b border-emerald-50">
 <h1 className="text-3xl font-black text-primary tracking-tight font-mono">Upload Inventory</h1>
 <p className="text-sm text-emerald-400 font-medium font-mono text-[10px] uppercase tracking-widest">Batch import products using CSV files</p>
 </header>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
 <div className="space-y-6">
 <form onSubmit={handleUpload} className="space-y-6">
 <div
 className={`border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300 group ${
 file 
 ? 'border-emerald-200 bg-emerald-50/30' 
 : 'border-emerald-200 bg-emerald-50/30 hover:border-primary hover:bg-emerald-50'
 }`}
 onClick={() => inputRef.current?.click()}
 >
 <input
 ref={inputRef}
 type="file"
 accept=".csv"
 className="hidden"
 onChange={e => setFile(e.target.files?.[0] ?? null)}
 />
 <div className="flex flex-col items-center">
 <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 ${
 file ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-100 text-emerald-400 group-hover:bg-primary group-hover:text-white'
 }`}>
 {file ? <FileCheck size={32} /> : <Upload size={32} />}
 </div>
 {file ? (
 <div className="space-y-1">
 <p className="text-sm font-bold text-slate-700">{file.name}</p>
 <p className="text-xs text-slate-400 uppercase tracking-tighter">{(file.size / 1024).toFixed(1)} KB</p>
 </div>
 ) : (
 <div className="space-y-1">
 <p className="text-sm font-black text-slate-600">Select CSV file</p>
 <p className="text-xs text-slate-400">Click or drag & drop to upload</p>
 </div>
 )}
 </div>
 </div>

 <button
 type="submit"
 disabled={!file || loading}
 className="w-full flex items-center justify-center gap-2 bg-primary text-white text-sm px-6 py-3.5 rounded-2xl hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-lg shadow-emerald-100 font-black uppercase tracking-widest cursor-pointer disabled:cursor-not-allowed"
 >
 {loading ? (
 <>
 <Loader2 size={16} className="animate-spin" />
 Processing Upload...
 </>
 ) : (
 <>
 Import Products
 <ChevronRight size={16} />
 </>
 )}
 </button>
 </form>

 {apiError && (
 <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-3 text-red-600 animate-in fade-in slide-in-from-top-2">
 <AlertCircle size={20} className="shrink-0" />
 <div className="text-sm">
 <p className="font-bold">Upload Error</p>
 <p className="opacity-80">{apiError}</p>
 </div>
 </div>
 )}
 </div>

 <div className="space-y-6">
 <div className="bg-white border border-emerald-100 rounded-3xl p-6 shadow-sm">
 <h3 className="flex items-center gap-2 text-sm font-black text-primary uppercase tracking-widest mb-4">
 <Info size={16} />
 CSV Format Guide
 </h3>
 <div className="space-y-4">
 <p className="text-xs text-slate-500 leading-relaxed font-semibold">
 Ensure your CSV matches the structure below. Headers are required and case-sensitive.
 </p>
 <div className="bg-slate-50 rounded-2xl p-4 font-mono text-[10px] text-slate-600 border border-slate-100 overflow-x-auto whitespace-nowrap">
 <div className="pb-2 mb-2 border-b border-slate-200 text-slate-400">product_name,sku,price,mrp,expiry_date,category,image_url,stock_quantity,unit_cost,minimum_price,disposal_cost_per_unit</div>
 <div className="space-y-1">
 <div>Whole Milk,MILK-001,84,95,2026-09-20,Dairy,,18,45,55,2</div>
 <div>Sourdough,BREAD-002,120,140,2026-09-18,Bakery,,12,65,80,3</div>
 </div>
 </div>
 </div>
 </div>

 {result && (
 <div className="bg-white border border-emerald-100 rounded-3xl p-6 shadow-sm animate-in zoom-in-95 duration-300">
 <h3 className="flex items-center gap-2 text-sm font-black text-emerald-600 uppercase tracking-widest mb-6">
 <CheckCircle2 size={16} />
 Import Results
 </h3>
 <div className="grid grid-cols-3 gap-4 mb-6">
 <div className="bg-emerald-50 rounded-2xl p-4 text-center border border-emerald-100">
 <p className="text-2xl font-black text-emerald-600">{result.added}</p>
 <p className="text-[10px] font-black uppercase text-emerald-700/60 tracking-tighter">Added</p>
 </div>
 <div className="bg-primary/5 rounded-2xl p-4 text-center border border-primary/10">
 <p className="text-2xl font-black text-primary">{result.updated}</p>
 <p className="text-[10px] font-black uppercase text-primary/60 tracking-tighter">Updated</p>
 </div>
 <div className="bg-red-50 rounded-2xl p-4 text-center border border-red-100">
 <p className="text-2xl font-black text-red-600">{result.failed}</p>
 <p className="text-[10px] font-black uppercase text-red-700/60 tracking-tighter">Failed</p>
 </div>
 </div>

 {result.errors.length > 0 && (
 <div className="rounded-2xl border border-red-100 overflow-hidden">
 <p className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 border-b border-red-100">Row Errors</p>
 <div className="max-h-48 overflow-y-auto divide-y divide-red-50">
 {result.errors.map((err, i) => (
 <div key={i} className="px-4 py-3 text-xs text-red-700 flex justify-between gap-4">
 <span className="font-bold whitespace-nowrap">Row {err.row}</span>
 <span className="opacity-80 text-right">{err.reason}</span>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 </div>
 )
}
