import APP_CONFIG from "@/CONFIG";
import { EthereumOrgGuard } from "@/components/admin/EthereumOrgGuard";
import { AnalyticsReport } from "@/components/admin/AnalyticsReport";

export default function AnalyticsPage() {
  if (!APP_CONFIG.ANALYTICS_ENABLED) {
    return <div className="p-4 text-gray-500">App analytics is not enabled</div>;
  }

  return (
    <EthereumOrgGuard>
      <AnalyticsReport />
    </EthereumOrgGuard>
  );
}
