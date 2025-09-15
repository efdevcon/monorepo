"use client";

import { useEffect, useContext } from "react";
import {
  ClientConnectionState,
  ParcnetClientContext,
  ParcnetClientProvider,
  useParcnetClient,
} from "@parcnet-js/app-connector-react";
import { useState, useCallback } from "react";
import Tooltip from "lib/components/tooltip";
import { SquareArrowOutUpRight } from "lucide-react";
import VoxelButton from "lib/components/voxel-button/button";
import { serializePodData } from "./serialize";
import { pod, PODData } from "@parcnet-js/podspec";
import { POD } from "@pcd/pod";
import { eventShops } from "./event-shops-list";
import { Info, ArrowRight } from "lucide-react";
import cn from "classnames";

// HOC to wrap ParcnetClientProvider
export const withParcnetProvider = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return function WrappedComponent(props: P) {
    return (
      <ParcnetClientProvider
        zapp={{
          name: "Devconnect Perks Portal", // update the name of the zapp to something *unique*
          permissions: {
            // update permissions based on what you want to collect and prove
            REQUEST_PROOF: { collections: ["Devconnect ARG"] }, // Update this to the collection name you want to use
            READ_PUBLIC_IDENTIFIERS: {},
            READ_POD: { collections: ["Devconnect ARG"] },
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
  const [initialConnectAttempted, setInitialConnectAttempted] = useState(false);

  const [mounted, setMounted] = useState(false);
  const [devconCoupons, setDevconCoupons] = useState<Record<string, string>>(
    {}
  );
  const [devconnectCoupons, setDevconnectCoupons] = useState<
    Record<string, string>
  >({});
  const [tickets, setTickets] = useState<{
    // devcon: PODData;
    devconnect: PODData;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Not sure if we should enable auto-connect - the popup is too aggressive
  // useEffect(() => {
  //   if (initialConnectAttempted) return;

  //   const initialConnect = () => {
  //     setInitialConnectAttempted(true);

  //     const connectedInThePast = localStorage.getItem("zupassConnected");

  //     if (
  //       z &&
  //       connectionState === ClientConnectionState.DISCONNECTED &&
  //       connectedInThePast
  //     ) {
  //       try {
  //         z.connect();
  //       } catch (error) {
  //         console.error("Error auto connecting to Zupass:", error);
  //       }
  //     }
  //   };

  //   initialConnect();
  // }, [z, connectionState]);

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
    // const queryDevcon = pod({
    //   entries: {
    //     eventId: {
    //       type: "string",
    //       isMemberOf: [
    //         { type: "string", value: "5074edf5-f079-4099-b036-22223c0c6995" },
    //       ],
    //     },
    //   },
    // });

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
    // const pods = await z.pod.collection("Devcon SEA").query(queryDevcon);
    // @ts-ignore
    const podsDevconnect = await z.pod
      .collection("Devconnect ARG")
      .query(queryDevconnect);

    // NOT swag tickets
    // const devconTickets = pods.filter(
    //   (pod: PODData) =>
    //     !pod.entries.isAddOn || pod.entries.isAddOn?.value === BigInt(0)
    // );

    // NOT swag tickets
    const devconnectTickets = podsDevconnect.filter(
      (pod: PODData) =>
        !pod.entries.isAddOn || pod.entries.isAddOn?.value === BigInt(0)
    );

    // Verify signatures for all tickets
    // const verifiedDevconTickets = devconTickets.filter((ticket: PODData) =>
    //   verifyPodSignature(ticket)
    // );
    const verifiedDevconnectTickets = devconnectTickets.filter(
      (ticket: PODData) => verifyPodSignature(ticket)
    );

    const tickets = {
      // devcon: verifiedDevconTickets[0],
      devconnect: verifiedDevconnectTickets[0],
    };

    setTickets(tickets);

    localStorage.setItem("zupassConnected", "true");

    // console.log("devconTickets (all):", devconTickets);
    // console.log("devconTickets (verified):", verifiedDevconTickets);
    console.log("devconnectTickets (all):", devconnectTickets);
    console.log("devconnectTickets (verified):", verifiedDevconnectTickets);
  };

  useEffect(() => {
    if (connectionState === ClientConnectionState.CONNECTED) {
      fetchPods();
    }
  }, [connectionState, z]);

  if (!mounted) return null;

  const findShopById = (id: string) => {
    return eventShops.find((shop) => shop.supabase_id === id);
  };

  const shop = findShopById(props.eventId.toString());

  if (!shop) return null;

  return (
    <div className="flex flex-col gap-4">
      <EventVoucher
        couponCollection={shop.coupon_collection}
        tickets={tickets}
        devconnectCoupons={devconnectCoupons}
        devconCoupons={devconCoupons}
        setDevconnectCoupons={setDevconnectCoupons}
        setDevconCoupons={setDevconCoupons}
      />
    </div>
  );
}

export default ZupassConnection;

const EventVoucher = ({
  couponCollection,
  tickets,
  devconnectCoupons,
  devconCoupons,
  setDevconnectCoupons,
  setDevconCoupons,
}: {
  couponCollection: string;
  tickets: {
    // devcon: PODData;
    devconnect: PODData;
  } | null;
  devconnectCoupons: Record<string, string>;
  devconCoupons: Record<string, string>;
  setDevconnectCoupons: (coupons: Record<string, string>) => void;
  setDevconCoupons: (coupons: Record<string, string>) => void;
}) => {
  const { connectionState, z } = useParcnetClient();
  const ctx = useContext(ParcnetClientContext);
  const disconnect = ctx?.disconnect;

  const [couponFetchingComplete, setCouponFetchingComplete] = useState(false);
  const [couponStatus, setCouponStatus] = useState<{
    success: boolean;
    error?: string;
  } | null>(null);
  const [fetchingCoupon, setFetchingCoupon] = useState(false);

  const ticketVerified = !!tickets?.devconnect;
  const connected = connectionState === ClientConnectionState.CONNECTED;
  const connectedWithNoTicket = connected && !ticketVerified;
  const connectedWithTicket = connected && ticketVerified;
  const connectedWithCoupon = connectedWithTicket && couponStatus?.success;
  const coupon = devconnectCoupons[couponCollection];
  const couponFetchedButNoCoupon =
    connected && couponFetchingComplete && !coupon;

  const requestCoupon = useCallback(async () => {
    if (connectionState !== ClientConnectionState.CONNECTED) return;
    if (fetchingCoupon) return;
    if (!ticketVerified) return;

    setFetchingCoupon(true);
    setCouponStatus(null);

    try {
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
      setCouponFetchingComplete(true);
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

  useEffect(() => {
    if (
      connectionState === ClientConnectionState.CONNECTED &&
      !fetchingCoupon &&
      !couponFetchingComplete
    ) {
      requestCoupon();
    }
  }, [connectionState, fetchingCoupon, ticketVerified]);

  useEffect(() => {
    if (connectionState === ClientConnectionState.ERROR) {
      // LOG MATOMO ERROR
      // @ts-ignore
      const matomo = window && window._paq;

      if (matomo) {
        matomo.push(["trackEvent", "Zupass Connection Error"]);
      }
    }
  }, [connectionState]);

  return (
    <div className="w-full max-w-md mx-auto flex gap-2 flex-col">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900">Book this event</h1>
        <Tooltip
          arrow={false}
          title={
            "This event is happening inside the main Devconnect venue; that means you will need a Devconnect ticket to attend. Connect with zupass below to verify ticket ownership."
          }
          className="shrink-0 inline-flex items-center justify-center hidden md:flex z-[10000000000000]"
        >
          <div className="flex items-center justify-center shrink-0 hidden md:flex md:shrink-0">
            <Info size={18} />
          </div>
        </Tooltip>{" "}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        {/* Step 1 - Verify Devconnect ticket */}
        <div className="flex flex-col">
          <div className="text-xs text-[#4B4B66] mb-1">
            1. Verify Devconnect ticket
          </div>

          <div className="mt-1 text-center flex flex-col items-start">
            <VoxelButton
              size="sm"
              className="outline-none  w-[150px]"
              color={
                connectionState === "ERROR"
                  ? "red-1"
                  : connectionState === ClientConnectionState.CONNECTED
                  ? "green-1"
                  : "green-1"
              }
              onClick={() => {
                if (connectionState === ClientConnectionState.DISCONNECTED) {
                  z.connect();
                } else {
                  const prompt = confirm(
                    "Are you sure you want to disconnect? You will need to reconnect to verify your ticket."
                  );

                  if (prompt) {
                    localStorage.removeItem("zupassConnected");

                    // TODO: Also remove all local storage in the zupass local storage since it seems to "remember" the connection, making it impossible to reconnect with a different email
                    disconnect?.();
                  }
                }
              }}
            >
              <div className="flex items-center justify-center gap-2">
                {connectionState === ClientConnectionState.CONNECTING &&
                  "Connecting..."}
                {connectionState === ClientConnectionState.CONNECTED &&
                  "Connected"}
                {connectionState === ClientConnectionState.DISCONNECTED &&
                  "Connect Zupass"}
                {connectionState === ClientConnectionState.ERROR &&
                  "Connection Error"}
              </div>
            </VoxelButton>
          </div>
        </div>

        {/* Arrow */}
        <div className="justify-center self-center hidden sm:flex">
          <ArrowRight size={20} />
        </div>

        {/* Step 2 - Get event ticket */}
        <div className="flex flex-col ">
          <div className="text-xs text-[#4B4B66] mb-1">2. Get event ticket</div>
          <div className="mt-1 text-center flex sm:flex-col items-start items-center gap-2 sm:gap-0">
            <VoxelButton
              disabled={!connectedWithCoupon}
              className={`outline-none w-[150px]`}
              size="sm"
              onClick={() => {
                if (connectedWithCoupon) {
                  window.open(coupon, "_blank");
                }
              }}
            >
              {fetchingCoupon ? (
                "Getting voucher..."
              ) : (
                <>
                  Get ticket
                  <SquareArrowOutUpRight size={15} />
                </>
              )}
            </VoxelButton>
          </div>
        </div>
      </div>

      {connectedWithTicket && !couponFetchedButNoCoupon && (
        <div className="text-sm font-semibold text-gray-600 mt-1">
          You have a valid Devconnect ticket!
        </div>
      )}

      {couponFetchedButNoCoupon && (
        <div className="text-sm font-semibold text-gray-600 mt-1">
          We have verified your ticket, but there are currently no more vouchers
          for this event.
        </div>
      )}

      {!connectedWithTicket && !couponFetchedButNoCoupon && (
        <>
          <div
            className={cn("text-sm font-semibold text-gray-600 mt-1", {
              "text-red-600": connectedWithNoTicket,
            })}
          >
            {connectedWithNoTicket
              ? "No Devconnect ticket found, get one below:"
              : "You need a Devconnect ticket to attend this event."}
          </div>
          <VoxelButton
            size="sm"
            className=""
            onClick={() => {
              window.open("https://tickets.devconnect.org", "_blank");
            }}
          >
            Buy Devconnect ticket <SquareArrowOutUpRight size={16} />
          </VoxelButton>
          <div className="text-[11px] text-[#4B4B66] mt-1">
            If you have a Devconnect ticket, connect to Zupass using the same
            email used to purchase your ticket. Still having issues? Reach out
            to us at{" "}
            <a
              href="mailto:support@devconnect.org"
              className="underline text-teal-800"
            >
              support@devconnect.org
            </a>
          </div>
        </>
      )}
    </div>
  );
};
