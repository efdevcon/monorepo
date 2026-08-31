"use client";

import { useCallback, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  labelhash,
} from "viem";
import { mainnet } from "viem/chains";

/**
 * Connect an injected wallet and read the expiry of its primary ENS name.
 *
 * Reads go to a mainnet public RPC rather than the wallet's own provider, so
 * the lookup works whatever chain the wallet happens to be on. The primary
 * (reverse-resolved) name is used because setting it requires controlling the
 * address, which is exactly the "connected wallet must control the qualifying
 * name" rule. Browser-side detection is a demo convenience — a real partner
 * would re-derive the expiry onchain server-side rather than trust the
 * client's number.
 */

/** ENS .eth base registrar (mainnet): expiries live here for 2LD .eth names. */
const BASE_REGISTRAR = "0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85" as const;

const nameExpiresAbi = [
  {
    name: "nameExpires",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

export type EnsExpiryState =
  | { status: "idle" }
  | { status: "no-wallet" }
  | { status: "connecting" }
  | { status: "looking-up"; address: string }
  | { status: "no-name"; address: string }
  /** Primary name is a subdomain or non-.eth, whose expiry isn't in the base registrar. */
  | { status: "unsupported-name"; address: string; name: string }
  | {
      status: "found";
      address: string;
      name: string;
      expiresAt: Date;
      yearsRemaining: number;
    }
  | { status: "error"; message: string };

interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
}

export function useEnsExpiry() {
  const [state, setState] = useState<EnsExpiryState>({ status: "idle" });

  const connect = useCallback(async () => {
    const eth = (window as Window & { ethereum?: Eip1193Provider }).ethereum;
    if (!eth) {
      setState({ status: "no-wallet" });
      return;
    }
    setState({ status: "connecting" });
    try {
      const wallet = createWalletClient({ transport: custom(eth) });
      const [address] = await wallet.requestAddresses();
      if (!address) {
        setState({ status: "error", message: "No account authorized" });
        return;
      }

      setState({ status: "looking-up", address });
      const client = createPublicClient({ chain: mainnet, transport: http() });
      const name = await client.getEnsName({ address });
      if (!name) {
        setState({ status: "no-name", address });
        return;
      }

      const parts = name.split(".");
      if (parts.length !== 2 || parts[1] !== "eth") {
        setState({ status: "unsupported-name", address, name });
        return;
      }

      const expires = await client.readContract({
        address: BASE_REGISTRAR,
        abi: nameExpiresAbi,
        functionName: "nameExpires",
        args: [BigInt(labelhash(parts[0]))],
      });
      // BigInt literals need target >= ES2020, which this tsconfig predates.
      if (expires === BigInt(0)) {
        setState({ status: "unsupported-name", address, name });
        return;
      }

      const expiresAt = new Date(Number(expires) * 1000);
      setState({
        status: "found",
        address,
        name,
        expiresAt,
        yearsRemaining: (expiresAt.getTime() - Date.now()) / YEAR_MS,
      });
    } catch (err) {
      const message =
        err && typeof err === "object" && "shortMessage" in err
          ? String((err as { shortMessage: unknown }).shortMessage)
          : err instanceof Error
            ? err.message
            : "Wallet connection failed";
      setState({ status: "error", message });
    }
  }, []);

  return { state, connect };
}
