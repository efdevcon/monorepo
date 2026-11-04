// Price display for the QR pages: one bold figure, same as the store. The
// share still stores both the item price (`eth`) and the card price (`fiat`)
// from the Pretix ETH plugin; the card price is what buyers pay by any method
// now that ETH pricing is gone, so it wins when the two differ. A rupee price
// (`inr`, from the item's `upi_price_inr`) is what the same buyer pays by UPI
// and sits next to it, smaller.
const figure = 'font-bold leading-none tracking-[-0.5px]'

export default function PriceTags({
  eth,
  fiat,
  inr = null,
  size = 20,
}: {
  eth: string | null
  fiat: string | null
  inr?: string | null
  size?: number
}) {
  const price = fiat ?? eth
  if (!price) return null
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2">
      <span className={`${figure} text-[#221144]`} style={{ fontSize: size * 0.9 }}>
        {price}
      </span>
      {inr && (
        <span className={`${figure} text-[#594d73]`} style={{ fontSize: size * 0.7 }}>
          {inr} <span className="font-normal">UPI</span>
        </span>
      )}
    </span>
  )
}
