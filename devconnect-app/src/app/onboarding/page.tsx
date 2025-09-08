import WalletTab from './WalletTab';
import Auth from '@/components/Auth';

export default function OnboardingPage() {
  return (
    <Auth>
      <WalletTab />
    </Auth>
  );
}
