import React, { useState, useEffect, useCallback } from "react";
import { supabaseClient } from "../../../helpers/supabaseClient";
import VoxelButton from "lib/components/voxel-button/button";
import { ArrowRight, Info, SquareArrowOutUpRight } from "lucide-react";
import Tooltip from "lib/components/tooltip";
import cn from "classnames";
import { Session, AuthChangeEvent } from "@supabase/supabase-js";
import { eventShops } from "./event-shops-list";

interface FallbackProps {
  eventId: string | number;
}

const Fallback = (props: FallbackProps) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [fetchingCoupon, setFetchingCoupon] = useState(false);
  const [coupon, setCoupon] = useState<string | null>(null);
  const [couponStatus, setCouponStatus] = useState<{
    success: boolean;
    error?: string;
  } | null>(null);
  const [couponFetchingComplete, setCouponFetchingComplete] = useState(false);

  // Check for existing session
  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Get the coupon collection from event shops or use a default
  const findShopById = (id: string) => {
    return eventShops.find((shop) => shop.supabase_id === id);
  };

  const shop = findShopById(props.eventId.toString());

  if (!shop) return null;

  const handleLogin = async () => {
    const userEmail = prompt("Please enter your email address:");

    if (!userEmail) {
      return; // User cancelled
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError(null);
    setEmail(userEmail);

    try {
      const { data, error } = await supabaseClient.auth.signInWithOtp({
        email: userEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/calendar?event=${props.eventId}`,
        },
      });

      if (error) {
        setError(error.message);
        setSuccessMessage(null);
      } else {
        setSuccessMessage("Check your email for the sign-in link!");
        setError(null);
        setSession(data.session);
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    setSession(null);
    setCoupon(null);
    setCouponStatus(null);
    setCouponFetchingComplete(false);
  };

  const requestCoupon = useCallback(async () => {
    if (!session?.access_token) return;
    if (fetchingCoupon) return;

    setFetchingCoupon(true);
    setCouponStatus(null);

    try {
      const couponCollection = shop.coupon_collection;

      const response = await fetch(
        `/api/coupons/${encodeURIComponent(couponCollection)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ useEmailAuth: true }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        setCouponStatus({
          success: false,
          error: errorData.error || "Failed to claim coupon",
        });
        return;
      }

      const data = await response.json();

      if (data.status === "WOULD HAVE CLAIMED COUPON") {
        // This is a test response
        setCouponStatus({ success: true });
        setCoupon("Test coupon - implementation pending");
      } else if (data.coupon) {
        setCouponStatus({ success: true });
        setCoupon(data.coupon);
      } else {
        setCouponStatus({ success: false, error: "No coupon available" });
      }
    } catch (error) {
      console.error("Error claiming coupon:", error);
      setCouponStatus({ success: false, error: "Failed to claim coupon" });
    } finally {
      setFetchingCoupon(false);
      setCouponFetchingComplete(true);
    }
  }, [session, props.eventId]);

  // Auto-fetch coupon when logged in
  useEffect(() => {
    if (session && !couponFetchingComplete && !fetchingCoupon) {
      requestCoupon();
    }
  }, [session, couponFetchingComplete, fetchingCoupon, requestCoupon]);

  const isLoggedIn = !!session;
  const hasValidTicket = isLoggedIn; // In this fallback, we assume logged-in users have valid tickets
  const connectedWithCoupon = hasValidTicket && couponStatus?.success;
  const couponFetchedButNoCoupon =
    isLoggedIn && couponFetchingComplete && !coupon;

  return (
    <div className="w-full max-w-md mx-auto flex gap-2 flex-col">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900">Book this event</h1>
        <Tooltip
          arrow={false}
          title={
            "This event is happening inside the main Devconnect venue; that means you will need a Devconnect ticket to attend. Sign in below to verify ticket ownership."
          }
          className="shrink-0 hidden md:inline-flex items-center justify-center z-[10000000000000]"
        >
          <div className="hidden md:flex items-center justify-center shrink-0">
            <Info size={18} />
          </div>
        </Tooltip>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        {/* Step 1 - Verify Devconnect ticket */}
        <div className="flex flex-col">
          <div className="text-xs text-[#4B4B66] mb-1">
            1. Verify Devconnect ticket
          </div>

          <div className="mt-1 text-center flex flex-col items-start">
            {!isLoggedIn ? (
              <VoxelButton
                size="sm"
                className="outline-none w-[150px]"
                color="green-1"
                onClick={handleLogin}
                disabled={loading}
              >
                {loading ? "Signing in..." : "Connect Email"}
              </VoxelButton>
            ) : (
              <div className="flex flex-col gap-2">
                <VoxelButton
                  size="sm"
                  className="outline-none w-[150px]"
                  color="green-1"
                  onClick={handleLogout}
                >
                  Connected
                </VoxelButton>
              </div>
            )}
            {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
            {successMessage && (
              <div className="text-sm text-green-600 mt-2">
                {successMessage}
              </div>
            )}
          </div>
        </div>

        {/* Arrow */}
        <div className="justify-center self-center hidden sm:flex">
          <ArrowRight size={20} />
        </div>

        {/* Step 2 - Get event ticket */}
        <div className="flex flex-col ">
          <div className="text-xs text-[#4B4B66] mb-1">2. Get event ticket</div>
          <div className="mt-1 text-center flex sm:flex-col items-center gap-2 sm:gap-0">
            <VoxelButton
              disabled={!connectedWithCoupon}
              className={`outline-none w-[150px]`}
              size="sm"
              onClick={() => {
                if (connectedWithCoupon && coupon) {
                  if (coupon.startsWith("http")) {
                    window.open(coupon, "_blank");
                  } else {
                    // For test responses
                    alert(coupon);
                  }
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

      {hasValidTicket && !couponFetchedButNoCoupon && (
        <div className="text-sm font-semibold text-gray-600 mt-1">
          You have a valid Devconnect ticket!
        </div>
      )}

      {couponFetchedButNoCoupon && (
        <div className="text-sm font-semibold text-gray-600 mt-1">
          We have verified your email, but coupon could not be claimed:
        </div>
      )}

      {couponStatus?.error && (
        <div className="text-sm font-semibold text-red-600 mt-1">
          {couponStatus.error}
        </div>
      )}

      {!hasValidTicket && !couponFetchedButNoCoupon && (
        <>
          <div
            className={cn("text-sm font-semibold text-gray-600 mt-1", {
              "text-red-600": isLoggedIn && !hasValidTicket,
            })}
          >
            {isLoggedIn && !hasValidTicket
              ? "No Devconnect ticket found, get one below:"
              : "Verify your Devconnect ticket to sign up for this event."}
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
            If you have a Devconnect ticket, sign in using the same email used
            to purchase your ticket. Still having issues? Reach out to us at{" "}
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

export default Fallback;
