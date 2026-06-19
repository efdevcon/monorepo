import APP_CONFIG from "@/CONFIG";
import { EthereumOrgGuard } from "@/components/admin/EthereumOrgGuard";
import { InferenceTest } from "@/components/admin/InferenceTest";

export default function InferenceTestPage() {
  if (!APP_CONFIG.INFERENCE_DEBUG_ENABLED) {
    return (
      <div className="p-4 text-gray-500">Inference debugger is not enabled</div>
    );
  }

  return (
    <EthereumOrgGuard>
      <InferenceTest />
    </EthereumOrgGuard>
  );
}
