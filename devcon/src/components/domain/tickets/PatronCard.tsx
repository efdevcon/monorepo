import React, { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Loader2, Minus, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import css from 'pages/tickets/store/store.module.scss'
import picker from './PatronCard.module.scss'
import { TICKETING, pretixEventUrl } from 'config/ticketing'
import { addItemsToPretixCartAndRedirect } from 'services/pretixCart'
import { EthGlyphTile, FiatGlyphTile } from 'components/domain/tickets/TicketTable'
import { usePatronInfo, formatPatronAmount as fmt } from 'hooks/usePatronInfo'

// Patron ticket section. The Pretix item is a *free-price* item: the buyer
// picks the amount and Pretix enforces the item's default price as the floor.
// Pretix's own free-price UI is a bare number field pre-filled with the
// minimum, so this card makes the choice explicit (presets + custom amount)
// and hands the chosen amount to Pretix's cart via the same namespaced-cart
// POST the GA card uses. Payment (card or ETH) happens in Pretix's checkout.
//
// Rendered inside the store page (`variant="store"`, hidden when the item is
// not configured or not purchasable) and on /tickets/store/patron/
// (`variant="page"`, shows an explicit unavailable state).
//
// Copy lives in content/en/intl/tickets.json under `patron` (translated to
// hi/mr by the content workflow); the product name, minimum price,
// availability and per-order cap come from Pretix via /api/tickets/patron-info/.

export const PATRON_RELIEF_URL = 'https://nepalrelief.org/'

type Selection = { kind: 'preset'; amount: number } | { kind: 'custom' }

export function PatronReliefLink({ children }: { children: React.ReactNode }) {
  return (
    <a className={css['inline-link']} href={PATRON_RELIEF_URL} target="_blank" rel="noreferrer">
      {children}
    </a>
  )
}

export function PatronCard({ variant = 'store' }: { variant?: 'store' | 'page' }) {
  const t = useTranslations('tickets.patron')
  const { configured, info, item, available, minPrice, fixedPrice, loading, loadError } = usePatronInfo()
  const [selection, setSelection] = useState<Selection | null>(null)
  const [custom, setCustom] = useState('')
  const [qty, setQty] = useState(1)
  const [submitting, setSubmitting] = useState(false)

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

  const handleCheckout = () => {
    if (!item || amount == null || submitting) return
    setSubmitting(true)
    try {
      addItemsToPretixCartAndRedirect([{ id: item.id, quantity: qty, price: amount }], { destination: 'checkout' })
    } catch (err) {
      // CORS block / network failure: fall back to the plain shop, filtered to
      // the patron item, so the buyer can still purchase.
      console.error('Pretix cart handoff failed, falling back to shop:', err)
      window.location.href = pretixEventUrl(`/?item=${item.id}`)
    }
  }

  // In the store the section simply disappears when there is nothing to sell.
  if (variant === 'store' && (!configured || loadError || (info !== null && !available))) return null

  const min = fmt(minPrice)

  return (
    <section className={css['section']} id="patron">
      <div className={css['section-header']}>
        <div className={css['section-title-row']}>
          <h3 className={css['section-title']}>{t('section_title')}</h3>
          {available && <span className={css['open-badge']}>{t('open_badge')}</span>}
        </div>
        <p className={css['section-subtitle']}>
          {t.rich('intro', { link: chunks => <PatronReliefLink>{chunks}</PatronReliefLink> })}
        </p>
      </div>

      <div className={css['card']}>
        <div className={css['card-stacked']}>
          <div className={css['card-details']}>
            {/* Product name comes from Pretix (localized server-side), not from intl copy. */}
            {item && <h3 className={css['discount-card-title']}>{item.name}</h3>}
            {available && (
              <p className={css['discount-card-meta']}>
                {fixedPrice ? t('card_meta_fixed', { min }) : t('card_meta', { min })}
              </p>
            )}
            <p className={css['discount-card-desc']}>{t('card_description')}</p>

            {loading && <Loader2 className={css['ga-loading']} size={24} aria-label={t('loading_label')} />}

            {!loading && !available && <p className={picker['unavailable']}>{t('unavailable')}</p>}

            {available && !fixedPrice && (
              <>
                <p className={picker['amount-label']}>{t('amount_label')}</p>
                <div className={picker['presets']} role="group" aria-label={t('amount_group_label')}>
                  {presets.map(p => (
                    <button
                      type="button"
                      key={p}
                      className={picker['preset']}
                      aria-pressed={selection?.kind === 'preset' && selection.amount === p}
                      onClick={() => setSelection({ kind: 'preset', amount: p })}
                    >
                      ${fmt(p)}
                      {p === minPrice && <span className={picker['preset-sub']}>{t('preset_minimum')}</span>}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`${picker['preset']} ${picker['preset-custom']}`}
                    aria-pressed={selection?.kind === 'custom'}
                    onClick={() => setSelection({ kind: 'custom' })}
                  >
                    {t('preset_custom')}
                    <span className={picker['preset-sub']}>{t('preset_custom_sub')}</span>
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
                      placeholder={t('custom_placeholder', { min })}
                      value={custom}
                      onChange={e => setCustom(e.target.value)}
                      aria-label={t('custom_input_label')}
                      aria-invalid={customError}
                      autoFocus
                    />
                  </div>
                )}
                {customError ? (
                  <p className={picker['error']}>{t('custom_error', { min })}</p>
                ) : (
                  <p className={picker['hint']}>{t('hint')}</p>
                )}
              </>
            )}
          </div>

          <div className={css['card-footer']}>
            {available ? (
              <>
                <div className={picker['total']}>
                  {total != null ? (
                    <>
                      <span className={picker['total-tiles']}>
                        <EthGlyphTile size={20} />
                        <FiatGlyphTile size={20} />
                      </span>
                      <span className={picker['total-value']}>${fmt(total)}</span>
                      <span className={picker['total-label']}>{t('total_for', { count: qty })}</span>
                    </>
                  ) : (
                    <span className={picker['total-value']}>{t('total_empty')}</span>
                  )}
                </div>
                <div className={css['ga-actions']}>
                  <div className={css['quantity']}>
                    <button
                      type="button"
                      className={css['quantity-btn']}
                      onClick={() => setQty(q => clampQty(q - 1))}
                      disabled={qty <= 1}
                      aria-label={t('quantity_decrease')}
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
                      aria-label={t('quantity_label')}
                    />
                    <button
                      type="button"
                      className={css['quantity-btn']}
                      onClick={() => setQty(q => clampQty(q + 1))}
                      disabled={maxQty != null && qty >= maxQty}
                      aria-label={t('quantity_increase')}
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
                    {submitting ? t('checkout_loading') : t('checkout')}
                    <ArrowRight size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </>
            ) : loading ? null : (
              <span className={css['sold-out-badge']}>{t('unavailable_badge')}</span>
            )}
          </div>
        </div>
      </div>
      {available && (
        <p className={css['gst-note']}>
          {t('gst_note', { vat: TICKETING.tax.vatPercent, label: TICKETING.tax.label })}
        </p>
      )}
    </section>
  )
}
