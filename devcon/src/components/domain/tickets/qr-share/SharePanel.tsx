// The "Share" block of /tickets/qr-admin/: paste a redeem URL or any link,
// tick any saved links, one button puts it on the device. A redeem URL is
// detected by its voucher parameter and becomes a voucher share (ticked links
// show under its redeem button on the buyer page); any other URL and the
// ticked links become a links share. The saved list is kept in NocoDB and
// edited right here (add, rename, redeem-page flag, remove), no deploy needed.
import { useState } from 'react'
import { Send, Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import type { QrLink, PublicShare } from 'services/qr-shares'
import { qrApi } from './api'

type Draft = { label: string; url: string; showOnRedeemPage: boolean }
const EMPTY: Draft = { label: '', url: '', showOnRedeemPage: false }

const field =
  'rounded-lg border border-solid border-[#b3abd1] bg-[#faf9ff] px-3 py-2 placeholder:text-[#7b7394] focus:border-[#7235ed] focus:outline-none'
const primary =
  'flex items-center justify-center gap-2 rounded-lg bg-[#7235ed] px-4 py-2 font-semibold text-white disabled:opacity-50'
const ghost = 'flex items-center gap-1 rounded-lg border border-solid border-[#b3abd1] px-3 py-2 text-sm disabled:opacity-50'
const icon = 'rounded p-1 text-[#594d73] hover:bg-[#f4f1ff] disabled:opacity-50'

function DraftFields({ value, onChange }: { value: Draft; onChange: (d: Draft) => void }) {
  return (
    <>
      <input
        value={value.label}
        onChange={e => onChange({ ...value, label: e.target.value })}
        placeholder="Label"
        className={`${field} md:w-48`}
        autoFocus
      />
      <input
        value={value.url}
        onChange={e => onChange({ ...value, url: e.target.value })}
        placeholder="https://"
        className={`flex-1 ${field}`}
      />
      <label className="flex items-center gap-2 whitespace-nowrap text-sm">
        <input
          type="checkbox"
          checked={value.showOnRedeemPage}
          onChange={e => onChange({ ...value, showOnRedeemPage: e.target.checked })}
        />
        On redeem page
      </label>
    </>
  )
}

export default function SharePanel({
  adminKey,
  links,
  busy,
  error,
  run,
  onShared,
}: {
  adminKey: string
  links: QrLink[]
  busy: boolean
  error: string
  /** Runs an action with the page's busy/error handling and reloads afterwards. */
  run: (action: () => Promise<unknown>) => Promise<void>
  /** Lets the page show the new share in its table before the reload lands. */
  onShared: (share: PublicShare) => void
}) {
  const [input, setInput] = useState('')
  const [picked, setPicked] = useState<number[]>([])
  const [editing, setEditing] = useState<number | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [adding, setAdding] = useState(false)
  const [newLink, setNewLink] = useState<Draft>(EMPTY)

  // What the box holds: a redeem URL (voucher parameter), another link, or nothing.
  const typed = input.trim()
  const kind: 'voucher' | 'link' | 'none' = !typed
    ? 'none'
    : /[?&]voucher=/i.test(typed) || !/^https?:\/\//i.test(typed)
    ? 'voucher'
    : 'link'
  const hasVoucher = kind === 'voucher'
  // Links flagged "always on redeem page" ride along with every voucher, so
  // they count as picked (and show locked) as soon as a voucher is entered;
  // the button, the table and the buyer page then all agree.
  const alwaysIds = hasVoucher ? links.filter(l => l.showOnRedeemPage).map(l => l.id) : []
  const effective = [...new Set([...alwaysIds, ...picked])]
  const n = effective.length
  const linksLabel = `${n} link${n === 1 ? '' : 's'}`
  const buttonLabel =
    kind === 'voucher'
      ? n
        ? `Show voucher + ${linksLabel} on device`
        : 'Show voucher on device'
      : kind === 'link'
      ? n
        ? `Show link + ${linksLabel} on device`
        : 'Show link on device'
      : n
      ? `Show ${linksLabel} on device`
      : 'Show on device'

  const push = () =>
    run(async () => {
      const r = hasVoucher
        ? await qrApi<{ share: PublicShare }>(adminKey, 'create', { method: 'POST', body: { input, linkIds: effective } })
        : await qrApi<{ share: PublicShare }>(adminKey, 'share-links', {
            method: 'POST',
            body: { linkIds: picked, urls: kind === 'link' ? [typed] : [] },
          })
      setInput('')
      setPicked([])
      onShared(r.share)
    })
  const add = () =>
    run(async () => {
      await qrApi(adminKey, 'links', { method: 'POST', body: newLink })
      setNewLink(EMPTY)
      setAdding(false)
    })
  const startEdit = (l: QrLink) => {
    setEditing(l.id)
    setDraft({ label: l.label, url: l.url, showOnRedeemPage: l.showOnRedeemPage })
  }
  const save = (id: number) =>
    run(async () => {
      await qrApi(adminKey, 'links', { method: 'PATCH', body: { id, ...draft } })
      setEditing(null)
    })
  const remove = (l: QrLink) => {
    if (!window.confirm(`Remove "${l.label}" from the list?`)) return
    run(async () => {
      await qrApi(adminKey, 'links', { method: 'DELETE', body: { id: l.id } })
      setPicked(p => p.filter(x => x !== l.id))
    })
  }
  const toggleRedeem = (l: QrLink) =>
    run(() => qrApi(adminKey, 'links', { method: 'PATCH', body: { id: l.id, showOnRedeemPage: !l.showOnRedeemPage } }))

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="mb-2 font-semibold">Share</h2>
      <form
        onSubmit={e => {
          e.preventDefault()
          if (kind !== 'none' || n) push()
        }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Paste a redeem URL or any link (optional)"
          className={`w-full ${field}`}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />

        <p className="mb-1 mt-4 text-xs text-[#594d73]">
          Saved links: tick what to include. With a redeem URL they appear under its button (the "always" ones are
          included automatically); otherwise they are shared as links.
        </p>
        <ul className="mb-3 divide-y divide-[#eee]">
          {links.map(l => (
            <li key={l.id} className="flex flex-col gap-2 py-2 md:flex-row md:items-center">
              {editing === l.id ? (
                <>
                  <DraftFields value={draft} onChange={setDraft} />
                  <button type="button" onClick={() => save(l.id)} disabled={busy || !draft.label || !draft.url} className={ghost}>
                    <Check size={16} /> Save
                  </button>
                  <button type="button" onClick={() => setEditing(null)} disabled={busy} className={icon} title="Cancel">
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={effective.includes(l.id)}
                      disabled={alwaysIds.includes(l.id)}
                      title={alwaysIds.includes(l.id) ? 'Always on the redeem page' : undefined}
                      onChange={e => setPicked(p => (e.target.checked ? [...p, l.id] : p.filter(x => x !== l.id)))}
                    />
                    <span className="font-medium">{l.label}</span>
                    <span className="truncate text-sm text-[#594d73]">{l.url}</span>
                  </label>
                  <label
                    className="flex items-center gap-2 whitespace-nowrap text-xs text-[#594d73]"
                    title="Always listed under the voucher button on the buyer page"
                  >
                    <input type="checkbox" checked={l.showOnRedeemPage} disabled={busy} onChange={() => toggleRedeem(l)} />
                    Always on redeem page
                  </label>
                  <button type="button" onClick={() => startEdit(l)} disabled={busy} className={icon} title="Edit">
                    <Pencil size={16} />
                  </button>
                  <button type="button" onClick={() => remove(l)} disabled={busy} className={icon} title="Remove">
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </li>
          ))}
          {!links.length && <li className="py-2 text-sm text-[#594d73]">No links saved yet.</li>}
        </ul>

        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={busy || (kind === 'none' && !n)} className={primary}>
            <Send size={16} /> {buttonLabel}
          </button>
          {!adding && (
            <button type="button" onClick={() => setAdding(true)} disabled={busy} className={ghost}>
              <Plus size={16} /> Add a link
            </button>
          )}
        </div>
      </form>

      {adding && (
        <form
          onSubmit={e => {
            e.preventDefault()
            add()
          }}
          className="mt-3 flex flex-col gap-2 border-t border-solid border-[#eee] pt-3 md:flex-row md:items-center"
        >
          <DraftFields value={newLink} onChange={setNewLink} />
          <button type="submit" disabled={busy || !newLink.label || !newLink.url} className={ghost}>
            <Check size={16} /> Save
          </button>
          <button type="button" onClick={() => setAdding(false)} disabled={busy} className={icon} title="Cancel">
            <X size={16} />
          </button>
        </form>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  )
}
