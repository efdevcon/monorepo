"use client";

import { useEffect } from "react";
import {
  ClientConnectionState,
  ParcnetClientProvider,
  Toolbar,
  useParcnetClient,
} from "@parcnet-js/app-connector-react";
import { useState, useCallback } from "react";
// import { getDevconTicketProofRequest, getDevconnectTicketProofRequest } from './ticketProof'
// import { ProveResult, serializeProofResult } from './serialize'

// Serialize POD data for transmission to the server
function serializePodData(podData: any): string {
  return JSON.stringify(podData, (key, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  });
}
import { motion, cubicBezier } from "framer-motion";
import { pod, PODData } from "@parcnet-js/podspec";
import { POD } from "@pcd/pod";
import { eventShops } from "./event-shops";

// HOC to wrap ParcnetClientProvider
const withParcnetProvider = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return function WrappedComponent(props: P) {
    return (
      <ParcnetClientProvider
        zapp={{
          name: "Devconnect Perks Portal", // update the name of the zapp to something *unique*
          permissions: {
            // update permissions based on what you want to collect and prove
            REQUEST_PROOF: { collections: ["Devcon SEA", "Devconnect ARG"] }, // Update this to the collection name you want to use
            READ_PUBLIC_IDENTIFIERS: {},
            READ_POD: { collections: ["Devcon SEA", "Devconnect ARG"] },
          },
        }}
      >
        <Component {...props} />
      </ParcnetClientProvider>
    );
  };
};

function ZupassConnection(props: any) {
  const { z, connectionState } = useParcnetClient();

  const [mounted, setMounted] = useState(false);
  const [devconCoupons, setDevconCoupons] = useState<Record<string, string>>(
    {}
  );
  const [devconnectCoupons, setDevconnectCoupons] = useState<
    Record<string, string>
  >({});
  const [tickets, setTickets] = useState<{
    devcon: PODData;
    devconnect: PODData;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Function to verify POD signature
  const verifyPodSignature = (podData: PODData): boolean => {
    try {
      // Convert PODData to the format expected by POD.load()
      // POD.load expects (entries, signature, signerPublicKey)
      const pod = POD.load(
        podData.entries,
        podData.signature,
        podData.signerPublicKey
      );

      // Verify the signature
      const isValid = pod.verifySignature();

      console.log(
        `POD signature verification for ${
          podData.entries.ticketId?.value || "unknown"
        }:`,
        isValid
      );

      return isValid;
    } catch (error) {
      console.error("Error verifying POD signature:", error);
      return false;
    }
  };

  const fetchPods = async () => {
    const queryDevcon = pod({
      entries: {
        eventId: {
          type: "string",
          isMemberOf: [
            { type: "string", value: "5074edf5-f079-4099-b036-22223c0c6995" },
          ],
        },
      },
    });

    const queryDevconnect = pod({
      entries: {
        eventId: {
          type: "string",
          isMemberOf: [
            { type: "string", value: "1f36ddce-e538-4c7a-9f31-6a4b2221ecac" },
          ],
        },
      },
    });

    // @ts-ignore
    const pods = await z.pod.collection("Devcon SEA").query(queryDevcon);
    // @ts-ignore
    const podsDevconnect = await z.pod
      .collection("Devconnect ARG")
      .query(queryDevconnect);

    // NOT swag tickets
    const devconTickets = pods.filter(
      (pod: PODData) =>
        !pod.entries.isAddOn || pod.entries.isAddOn?.value === BigInt(0)
    );

    // NOT swag tickets
    const devconnectTickets = podsDevconnect.filter(
      (pod: PODData) =>
        !pod.entries.isAddOn || pod.entries.isAddOn?.value === BigInt(0)
    );

    // Verify signatures for all tickets
    const verifiedDevconTickets = devconTickets.filter((ticket: PODData) =>
      verifyPodSignature(ticket)
    );
    const verifiedDevconnectTickets = devconnectTickets.filter(
      (ticket: PODData) => verifyPodSignature(ticket)
    );

    const tickets = {
      devcon: verifiedDevconTickets[0],
      devconnect: verifiedDevconnectTickets[0],
    };

    setTickets(tickets);

    console.log("devconTickets (all):", devconTickets);
    console.log("devconTickets (verified):", verifiedDevconTickets);
    console.log("devconnectTickets (all):", devconnectTickets);
    console.log("devconnectTickets (verified):", verifiedDevconnectTickets);
  };

  useEffect(() => {
    if (connectionState === ClientConnectionState.CONNECTED) {
      fetchPods();
    }
  }, [connectionState, z]);

  if (!mounted) return null;

  return (
    <div className="flex flex-col gap-4">
      <Toolbar />
      <EventVoucher
        eventId="5074edf5-f079-4099-b036-22223c0c6995"
        tickets={tickets}
        devconnectCoupons={devconnectCoupons}
        devconCoupons={devconCoupons}
        setDevconnectCoupons={setDevconnectCoupons}
        setDevconCoupons={setDevconCoupons}
      />
    </div>
  );
}

// Export the wrapped component
export default withParcnetProvider(ZupassConnection);

const EventVoucher = ({
  eventId,
  tickets,
  devconnectCoupons,
  devconCoupons,
  setDevconnectCoupons,
  setDevconCoupons,
}: {
  eventId: string;
  tickets: { devcon: PODData; devconnect: PODData } | null;
  devconnectCoupons: Record<string, string>;
  devconCoupons: Record<string, string>;
  setDevconnectCoupons: (coupons: Record<string, string>) => void;
  setDevconCoupons: (coupons: Record<string, string>) => void;
}) => {
  const { connectionState } = useParcnetClient();
  const [couponStatus, setCouponStatus] = useState<{
    success: boolean;
    error?: string;
  } | null>(null);
  const [fetchingCoupon, setFetchingCoupon] = useState(false);

  const ticketVerified = !!tickets?.devconnect;
  const couponCollection = eventShops.find(
    (shop) => shop.id === eventId
  )?.coupon_collection;

  const requestCoupon = useCallback(async () => {
    if (connectionState !== ClientConnectionState.CONNECTED) return;
    if (fetchingCoupon) return;
    if (!ticketVerified) return;

    setFetchingCoupon(true);
    setCouponStatus(null);

    try {
      console.log("verified", serializePodData(tickets?.devconnect));

      const response = await fetch(
        `/api/coupons/${encodeURIComponent(couponCollection || "")}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: serializePodData(tickets?.devconnect),
        }
      );

      if (!response.ok) {
        console.error(response.statusText);
        setCouponStatus({ success: false, error: "Failed to claim coupon" });
        return;
      }

      const { coupon, coupon_status, ticket_type } = await response.json();

      setCouponStatus(coupon_status);

      if (ticket_type === "Devcon SEA" && couponCollection) {
        setDevconCoupons({
          ...devconCoupons,
          [couponCollection as string]: coupon,
        });
      } else if (couponCollection) {
        setDevconnectCoupons({
          ...devconnectCoupons,
          [couponCollection as string]: coupon,
        });
      }
    } catch (error) {
      console.error("Error claiming coupon:", error);
      setCouponStatus({ success: false, error: "Failed to claim coupon" });
    } finally {
      setFetchingCoupon(false);
    }
  }, [
    ticketVerified,
    connectionState,
    devconCoupons,
    devconnectCoupons,
    setDevconCoupons,
    setDevconnectCoupons,
    couponCollection,
  ]);

  const isConnected = connectionState === ClientConnectionState.CONNECTED;

  const ticketId = tickets?.devconnect?.entries?.ticketId?.value || "";
  const truncatedTicketId =
    typeof ticketId === "string"
      ? `${ticketId.slice(0, 8)}...${ticketId.slice(-6)}`
      : ticketId?.toString?.()?.slice(0, 14) || "";

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
          <span className="text-xs text-blue-600">ℹ</span>
        </div>
        <h1 className="text-lg font-semibold text-gray-900">Book this event</h1>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {/* Step 1 - Verify Devconnect ticket */}
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-medium">
              1
            </div>
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-600 mb-1">
              Verify Devconnect ticket
            </div>
            <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm font-mono border border-blue-200">
              {truncatedTicketId || "UfpxAqtc...n/xxl0oc"}
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            />
          </svg>
        </div>

        {/* Step 2 - Get event ticket */}
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                ticketVerified
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              2
            </div>
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-600 mb-2">Get event ticket</div>
            <button
              onClick={requestCoupon}
              disabled={!ticketVerified || fetchingCoupon}
              className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                ticketVerified && !fetchingCoupon
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              {fetchingCoupon ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Getting tickets...
                </div>
              ) : (
                <>
                  Get tickets
                  <svg
                    className="w-4 h-4 ml-1 inline"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {couponStatus && (
        <div
          className={`mt-4 p-3 rounded-lg text-sm ${
            couponStatus.success
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {couponStatus.success
            ? "✅ Coupon claimed successfully!"
            : `❌ ${couponStatus.error}`}
        </div>
      )}

      {!isConnected && (
        <div className="mt-4 p-3 bg-yellow-50 text-yellow-700 rounded-lg text-sm border border-yellow-200">
          ⚠️ Please connect your wallet to continue
        </div>
      )}
    </div>
  );
};
