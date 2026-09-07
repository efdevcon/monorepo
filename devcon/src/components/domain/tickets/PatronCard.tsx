import React, { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Loader2, ExternalLink, Minus, Plus } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Input } from '@/components/ui/input'
import css from 'pages/tickets/store/store.module.scss'
import picker from './PatronCard.module.scss'
import { TICKETING, pretixEventUrl } from 'config/ticketing'
import { addItemsToPretixCartAndRedirect } from 'services/pretixCart'
import type { PatronInfoResponse } from 'pages/api/tickets/patron-info'

// Patron ticket section (POC). The Pretix item is a *free-price* item: the
// buyer picks the amount and Pretix enforces the item's default price as the
// floor. Pretix's own free-price UI is a bare number field pre-filled with the
// minimum, so this card makes the choice explicit (presets + custom amount)
// and hands the chosen amount to Pretix's cart via the same namespaced-cart
// POST the GA card uses. Payment (card or ETH) happens in Pretix's checkout.
//
// Rendered inside the store page (`variant="store"`, hidden when the item is
// not configured or not purchasable) and on /tickets/store/patron/
// (`variant="page"`, shows an explicit unavailable state).

export const PATRON_RELIEF_URL = 'https://nepalrelief.org/'

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

type Selection = { kind: 'preset'; amount: number } | { kind: 'custom' }

export function PatronCard({ variant = 'store' }: { variant?: 'store' | 'page' }) {
  const configured = TICKETING.patron.itemId != null
  const [info, setInfo] = useState<PatronInfoResponse | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [custom, setCustom] = useState('')
  const [qty, setQty] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!configured) return
    let cancelled = false
    fetch('/api/tickets/patron-info/')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<PatronInfoResponse>
      })
      .then(data => {
        if (!cancelled) setInfo(data)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
    return () => {
      cancelled = true
    }
  }, [configured])

  const item = info?.item ?? null
  const available = Boolean(info?.available && item)
  const minPrice = item ? Number(item.minPrice) : 0
  const fixedPrice = Boolean(item && !item.freePrice)

  // Minimum first, then the configured presets above it (deduped), max four.
  const presets = useMemo(() => {
    if (!item) return []
    const set = new Set<number>([minPrice, ...TICKETING.patron.presets.filter(p => p > minPrice)])
    return Array.from(set)
      .sort((a, b) => a - b)
      .slice(0, 4)
  }, [item, minPrice])

  // Pre-select Pretix's suggested amount when it matches a preset, else the minimum.
  useEffect(() => {
    if (!item || selection !== null || presets.length === 0) return
    const suggested = item.suggestedPrice ? Number(item.suggestedPrice) : NaN
    const initial = presets.includes(suggested) ? suggested : presets[0]
    setSelection({ kind: 'preset', amount: initial })
  }, [item, presets, selection])

  const customAmount = custom.trim() === '' ? NaN : Number(custom)
  const customValid = Number.isFinite(customAmount) && customAmount >= minPrice
  const customError = selection?.kind === 'custom' && custom.trim() !== '' && !customValid
  const amount: number | null = fixedPrice
    ? minPrice
    : selection?.kind === 'preset'
    ? selection.amount
    : customValid
    ? customAmount
    : null

  const maxQty = item?.maxPerOrder ?? null
  const clampQty = (n: number) => Math.max(1, maxQty != null ? Math.min(maxQty, n) : n)
  const total = amount != null ? amount * qty : null

  const shopUrl = pretixEventUrl(item ? `/?item=${item.id}` : '/')

  const handleCheckout = () => {
    if (!item || amount == null || submitting) return
    setSubmitting(true)
    try {
      addItemsToPretixCartAndRedirect([{ id: item.id, quantity: qty, price: amount }], { destination: 'checkout' })
    } catch (err) {
      // CORS block / network failure: fall back to the plain shop, filtered to
      // the patron item, so the buyer can still purchase.
      console.error('Pretix cart handoff failed, falling back to shop:', err)
      window.location.href = shopUrl
    }
  }

  const loading = configured && info === null && !loadError

  // In the store the section simply disappears when there is nothing to sell.
  if (variant === 'store' && (!configured || loadError || (info !== null && !available))) return null

  return (
    <section className={css['section']} id="patron">
      <div className={css['section-header']}>
        <div className={css['section-title-row']}>
          <h3 className={css['section-title']}>Patron</h3>
          {available && <span className={css['open-badge']}>OPEN</span>}
        </div>
        <p className={css['section-subtitle']}>
          Pick the amount you want to give. Everything above the minimum goes to{' '}
          <a className={css['inline-link']} href={PATRON_RELIEF_URL} target="_blank" rel="noreferrer">
            Nepal relief
          </a>
          , and you pay by card or with ETH in the ticket shop.
        </p>
      </div>

      <div className={css['card']}>
        <div className={css['card-stacked']}>
          <div className={css['card-details']}>
            <h3 className={css['discount-card-title']}>{item?.name ?? 'Patron Ticket'}</h3>
            {available && (
              <p className={css['discount-card-meta']}>
                {fixedPrice ? `$${fmt(minPrice)}` : `Pay what you want, from $${fmt(minPrice)}`}
              </p>
            )}
            {item?.description ? (
              // Pretix descriptions are markdown.
              <div className={`${css['discount-card-desc']} ${picker['description']}`}>
                <ReactMarkdown>{item.description}</ReactMarkdown>
              </div>
            ) : (
              <p className={css['discount-card-desc']}>
                Same access as General Admission. The amount above the minimum is passed on to Nepal relief.
              </p>
            )}

            {loading && <Loader2 className={css['ga-loading']} size={24} aria-label="Loading patron ticket" />}

            {!loading && !available && (
              <p className={picker['unavailable']}>
                Patron tickets are not available right now. You can still check the ticket shop directly.
              </p>
            )}

            {available && !fixedPrice && (
              <>
                <p className={picker['amount-label']}>Choose your amount per ticket</p>
                <div className={picker['presets']} role="group" aria-label="Contribution amount">
                  {presets.map(p => (
                    <button
                      type="button"
                      key={p}
                      className={picker['preset']}
                      aria-pressed={selection?.kind === 'preset' && selection.amount === p}
                      onClick={() => setSelection({ kind: 'preset', amount: p })}
                    >
                      ${fmt(p)}
                      {p === minPrice && <span className={picker['preset-sub']}>Minimum</span>}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`${picker['preset']} ${picker['preset-custom']}`}
                    aria-pressed={selection?.kind === 'custom'}
                    onClick={() => setSelection({ kind: 'custom' })}
                  >
                    Custom
                    <span className={picker['preset-sub']}>Any amount</span>
                  </button>
                </div>
                {selection?.kind === 'custom' && (
                  <div className={picker['custom']}>
                    <span className={picker['custom-currency']}>$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      className={picker['custom-input']}
                      min={minPrice}
                      step="1"
                      placeholder={`${fmt(minPrice)} or more`}
                      value={custom}
                      onChange={e => setCustom(e.target.value)}
                      aria-label="Custom amount in USD"
                      aria-invalid={customError}
                      autoFocus
                    />
                  </div>
                )}
                {customError ? (
                  <p className={picker['error']}>The minimum for a Patron ticket is ${fmt(minPrice)}.</p>
                ) : (
                  <p className={picker['hint']}>
                    You will see the amount again before paying. Prices include {TICKETING.tax.vatPercent}%{' '}
                    {TICKETING.tax.label}.
                  </p>
                )}
              </>
            )}
          </div>

          <div className={css['card-footer']}>
            {available ? (
              <>
                <div className={picker['total']}>
                  <span className={picker['total-value']}>{total != null ? `$${fmt(total)}` : 'Enter an amount'}</span>
                  {total != null && (
                    <span className={picker['total-label']}>
                      for {qty} {qty === 1 ? 'ticket' : 'tickets'}
                    </span>
                  )}
                </div>
                <div className={css['ga-actions']}>
                  <div className={css['quantity']}>
                    <button
                      type="button"
                      className={css['quantity-btn']}
                      onClick={() => setQty(q => clampQty(q - 1))}
                      disabled={qty <= 1}
                      aria-label="Decrease quantity"
                    >
                      <Minus size={16} />
                    </button>
                    <Input
                      type="number"
                      className="w-11 h-9 border-x border-y-0 rounded-none text-center p-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                      value={qty}
                      min={1}
                      max={maxQty ?? undefined}
                      onChange={e => setQty(clampQty(parseInt(e.target.value, 10) || 1))}
                      aria-label="Number of tickets"
                    />
                    <button
                      type="button"
                      className={css['quantity-btn']}
                      onClick={() => setQty(q => clampQty(q + 1))}
                      disabled={maxQty != null && qty >= maxQty}
                      aria-label="Increase quantity"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <button
                    type="button"
                    className={css['checkout-pill']}
                    onClick={handleCheckout}
                    disabled={amount == null || submitting}
                  >
                    {submitting ? 'Loading…' : 'Continue to checkout'}
                    <ArrowRight size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </>
            ) : loading ? null : (
              <span className={css['sold-out-badge']}>Unavailable</span>
            )}
          </div>
        </div>
      </div>

      <div className={picker['footer-note']}>
        <a className={picker['shop-link']} href={shopUrl}>
          Prefer the ticket shop? Open it directly
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      </div>
    </section>
  )
}
