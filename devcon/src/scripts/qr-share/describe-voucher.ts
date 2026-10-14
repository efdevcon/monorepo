// Prints what the QR share admin would show for a voucher code on the current Pretix env.
// Run: pnpm exec tsx src/scripts/qr-share/describe-voucher.ts <CODE>
import 'dotenv/config'
import { describeVoucher, getVoucherUsage } from '../../services/qr-share-voucher'

async function main() {
  const code = process.argv[2]
  if (!code) throw new Error('usage: describe-voucher.ts <CODE>')
  console.log(JSON.stringify(await describeVoucher(code), null, 2))
  console.log('usage:', JSON.stringify(await getVoucherUsage(code)))
}
main().catch(e => {
  console.error(e.message)
  process.exit(1)
})
