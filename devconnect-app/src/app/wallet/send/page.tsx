import { redirect } from 'next/navigation';

// Gas-sponsored sends retired with the event (2026-08-12): the relayer API
// returns 410 and the send entry points are hidden, so this route just goes
// back to the wallet. Restore the previous WalletPageContent render (git
// history) if sends ever come back — with OFAC screening on the relayer.
export default function WalletSendPage() {
  redirect('/wallet');
}
