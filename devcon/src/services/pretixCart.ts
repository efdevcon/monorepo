import { pretixEventUrl } from 'config/ticketing'

// Hands a buyer off to the Pretix shop with tickets already in their cart, so
// the purchase happens on Pretix instead of our own checkout page.
//
// Mechanism: a top-level form POST to a *namespaced* widget cart
// (`…/w/<nonce>/cart/add`) — the same endpoint the Pretix widget uses. That
// path is cross-origin/CSRF friendly (`allow_cors_if_namespaced` +
// `iframe_entry_view_wrapper` in pretix's presale/views/cart.py; verified: a
// cross-site POST with an Origin header returns 302, not 403). Because it's a
// real navigation (not XHR) the browser lands first-party on Pretix, follows
// the async add-to-cart redirect chain, and arrives at `next` — the namespaced
// shop — with the cart stored in the freshly-set Pretix session. No cart_id /
// take_cart_id juggling is needed since the whole flow is first-party.

const NONCE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

function makeNonce(length = 16): string {
  let out = ''
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint32Array(length)
    crypto.getRandomValues(buf)
    for (let i = 0; i < length; i++) out += NONCE_CHARS[buf[i] % NONCE_CHARS.length]
  } else {
    for (let i = 0; i < length; i++) out += NONCE_CHARS[Math.floor(Math.random() * NONCE_CHARS.length)]
  }
  return out
}

export interface PretixCartItem {
  /** Pretix item id */
  id: number
  quantity: number
  /** Buyer-chosen gross unit price for a Pretix *free-price* item (Pretix's
   *  `price_<item>` form field). Pretix rejects anything below the item's
   *  default price and ignores the field for fixed-price items. Decimal
   *  string or number; numbers are sent with two decimals. */
  price?: string | number
}

export interface PretixCartHandoffOptions {
  /** Where Pretix sends the buyer once the cart is filled. `shop` (default)
   *  is the namespaced product list with the cart summary on top, which is
   *  what a multi-item selection expects. `checkout` skips straight to the
   *  first checkout step, for single-item flows such as the patron ticket. */
  destination?: 'shop' | 'checkout'
}

/**
 * Adds the given items to a fresh namespaced Pretix cart and navigates the
 * browser to the Pretix shop carrying that cart. Submits a hidden form, so the
 * call ends by navigating away. No-op when given no positive-quantity items or
 * when run outside the browser.
 */
export function addItemsToPretixCartAndRedirect(items: PretixCartItem[], options: PretixCartHandoffOptions = {}): void {
  if (typeof document === 'undefined') return
  const positive = items.filter(i => i.quantity > 0)
  if (positive.length === 0) return

  // pretixEventUrl('/') → e.g. https://dcdev2.ticketh.xyz/org/8/ (dev) or
  // https://tickets.devcon.org/ (prod, custom domain).
  const namespaced = `${pretixEventUrl('/')}w/${makeNonce(16)}/`
  // After the add completes Pretix returns the buyer to the (namespaced) shop
  // with their cart populated, or straight into checkout when asked. `next`
  // MUST be a path, not an absolute URL: Pretix validates it with
  // `url_has_allowed_host_and_scheme(..., allowed_hosts=None)`, which rejects
  // any URL carrying a host and silently falls back to the shop index.
  const namespacedPath = new URL(namespaced).pathname
  const next = options.destination === 'checkout' ? `${namespacedPath}checkout/start` : namespacedPath
  const action = `${namespaced}cart/add?next=${encodeURIComponent(next)}`

  const form = document.createElement('form')
  form.method = 'POST'
  form.action = action
  form.style.display = 'none'

  const addField = (name: string, value: string) => {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = name
    input.value = value
    form.appendChild(input)
  }

  for (const item of positive) {
    addField(`item_${item.id}`, String(item.quantity))
    if (item.price !== undefined) {
      addField(`price_${item.id}`, typeof item.price === 'number' ? item.price.toFixed(2) : item.price)
    }
  }
  addField('widget_data', '{}')

  document.body.appendChild(form)
  form.submit()
}
