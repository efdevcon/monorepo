// Password prompt for the QR share pages, same credentials as the ticket admin.
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function AdminLogin({ title, onLogin }: { title: string; onLogin: (key: string) => Promise<string | null> }) {
  const [value, setValue] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim() || busy) return
    setBusy(true)
    setError('')
    const err = await onLogin(value)
    setBusy(false)
    if (err) setError(err)
    else setValue('')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f1ff] px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-md">
        <h1 className="mb-4 text-2xl font-bold text-[#1a0d33]">{title}</h1>
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-solid border-[#b3abd1] bg-[#faf9ff] px-3 focus-within:border-[#7235ed]">
          <input
            className="w-full bg-transparent py-3 text-base outline-none placeholder:text-[#7b7394]"
            type={show ? 'text' : 'password'}
            placeholder="Password"
            value={value}
            onChange={e => setValue(e.target.value)}
            autoComplete="current-password"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShow(v => !v)}
            aria-label={show ? 'Hide password' : 'Show password'}
            className="text-[#594d73]"
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-[#7235ed] py-3 font-semibold text-white disabled:opacity-60"
        >
          {busy ? 'Checking…' : 'Enter'}
        </button>
        <p className="mt-3 text-xs text-[#594d73]">Same password as the ticket admin.</p>
      </form>
    </div>
  )
}
