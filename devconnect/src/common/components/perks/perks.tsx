"use client";

import { useEffect } from "react";  
import {
  ClientConnectionState,
  ParcnetClientProvider,
  Toolbar,
  useParcnetClient,
} from "@parcnet-js/app-connector-react";
import { useState, useCallback } from "react";
import { getTicketProofRequest } from "./ticketProof";
import { ProveResult, serializeProofResult } from "./serialize";

export default function Perks() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <ParcnetClientProvider
      zapp={{
        name: "Devconnect Perks Portal", // update the name of the zapp to something *unique*
        permissions: { // update permissions based on what you want to collect and prove
          REQUEST_PROOF: { collections: ["Devcon SEA"] }, // Update this to the collection name you want to use
          READ_PUBLIC_IDENTIFIERS: {},
        },
      }}
    >
      <Toolbar />

      <RequestProof />
    </ParcnetClientProvider>
  );
}

function RequestProof() {
  const { z, connectionState } = useParcnetClient();
  const [proof, setProof] = useState<ProveResult | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);

  const requestProof = useCallback(async () => {
    if (connectionState !== ClientConnectionState.CONNECTED) return;
    const req = getTicketProofRequest();

    console.log(req.schema);
    const res = await z.gpc.prove({
      request: req.schema,
      collectionIds: ["Devcon SEA"], // Update this to the collection ID you want to use
    });

    if (res.success) {
      setProof(res);
    } else {
      console.error(res.error);
    }
  }, [z]);

  const verifyProof = useCallback(async () => {
    if (!proof) return;

    const serializedProofResult = serializeProofResult(proof);

    const res = await fetch("/api/verify", {
      method: "POST",
      body: JSON.stringify({
        serializedProofResult,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setVerified(data.verified);
    } else {
      console.error(res.statusText);
    }
  }, [z, proof]);

  if (connectionState !== ClientConnectionState.CONNECTED) return null;

  return (
    <div className="flex flex-col gap-4 my-8">
      <div>
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
          onClick={requestProof}
        >
          Request Proof
        </button>
      </div>
      {proof && (
        <>
          <div className="bg-gray-800 p-4 rounded-lg mt-4 overflow-x-auto">
            <div>Proof received</div>
            <div>Claimed fields:</div>
            <div>
              Name:{" "}
              {proof.revealedClaims.pods.ticket.entries?.attendeeName.value?.toString()}
            </div>
            <div>
              Email:{" "}
              {proof.revealedClaims.pods.ticket.entries?.attendeeEmail.value?.toString()}
            </div>
            {verified !== null && (
              <div className={verified ? "text-green-500" : "text-red-500"}>
                Verified: {verified ? "Yes" : "No"}
              </div>
            )}
            <div className="mt-4">
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
                onClick={verifyProof}
              >
                Verify Proof
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}