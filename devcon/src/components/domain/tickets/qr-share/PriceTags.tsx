// Price display for the QR pages, same language as the store: ETH tile +
// green chip for the ETH price, dark $ tile for the card price; both tiles on
// one figure when either method costs the same; ETH tile alone when the item
// is ETH-only. Input is the two formatted prices stored on the share.
import { EthGlyphTile, FiatGlyphTile } from 'components/domain/tickets/TicketTable'

const figure = 'font-bold leading-none tracking-[-0.5px]'

export default function PriceTags({ eth, fiat, size = 20 }: { eth: string | null; fiat: string | null; size?: number }) {
  if (!eth) return null
  const text = { fontSize: size * 0.9 }
  if (fiat === null) {
    return (
      <span className="inline-flex items-center gap-2" title="Payable in ETH only">
        <EthGlyphTile size={size} />
        <span className={`${figure} text-[#221144]`} style={text}>
          {eth}
        </span>
      </span>
    )
  }
  if (fiat === eth) {
    return (
      <span className="inline-flex items-center gap-2" title="Same price in ETH or by card">
        <span className="inline-flex items-center gap-1">
          <EthGlyphTile size={size} />
          <FiatGlyphTile size={size} />
        </span>
        <span className={`${figure} text-[#221144]`} style={text}>
          {eth}
        </span>
      </span>
    )
  }
  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-4">
      <span className="inline-flex items-center gap-1.5 rounded bg-[#d5f4dd] px-1.5 py-1" title="Paying with ETH">
        <EthGlyphTile size={size} />
        <span className={`${figure} text-[#221144]`} style={text}>
          {eth}
        </span>
      </span>
      <span className="inline-flex items-center gap-1.5" title="Paying by card">
        <FiatGlyphTile size={size} />
        <span className={`${figure} text-[#594d73]`} style={text}>
          {fiat}
        </span>
      </span>
    </span>
  )
}
