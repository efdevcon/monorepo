"use client";

import React, { useState } from "react";
import InfoIcon from "@/assets/icons/info.svg";
import CheckIcon from "@/assets/icons/circle_check.svg";
import { Link } from "@/components/common/link";
import { Modal } from "@/components/common/modal";
import { ipfsGatewayUrl } from "@/utils/ipfs";
import type { IpfsPlayerStatus } from "./IpfsPlayer";
import css from "./source-info.module.scss";

const STATUS_LABEL: Record<IpfsPlayerStatus, string> = {
  starting: "Fetching from IPFS…",
  loading: "Fetching from IPFS…",
  ready: "Verified from IPFS",
  error: "Unavailable on IPFS",
  unsupported: "Verified playback unsupported",
  incompatible: "Format not supported",
};

/**
 * Compact source info for the IPFS tab, shown in the player's tab bar:
 * playback status (plain text) · info button (opens the IPFS/pinning modal)
 * · link to the content on a public gateway.
 */
export const IpfsSourceInfo = ({
  cid,
  status,
}: {
  cid: string;
  status: IpfsPlayerStatus;
}) => {
  const [infoOpen, setInfoOpen] = useState(false);
  const verified = status === "ready";

  return (
    <div className={css["source-info"]}>
      <span
        className={`${css["status"]} ${verified ? css["verified"] : ""}`}
        role="status"
      >
        {verified && <CheckIcon aria-hidden="true" />}
        {STATUS_LABEL[status]}
      </span>

      <button
        type="button"
        className={`plain ${css["info"]}`}
        aria-label="About IPFS and pinning"
        title="About IPFS and pinning"
        onClick={() => setInfoOpen(true)}
      >
        <InfoIcon aria-hidden="true" />
      </button>

      <span className={css["divider"]} aria-hidden="true" />

      <Link href={ipfsGatewayUrl(cid)} className={css["gateway"]}>
        Open in gateway ↗
      </Link>

      <Modal open={infoOpen} close={() => setInfoOpen(false)} title="About IPFS">
        <div className={css["modal-content"]}>
          <p>
            IPFS is a peer-to-peer network for storing and sharing files.
            Content is addressed by its hash (CID) instead of by a server.
          </p>
          <p>
            This player fetches the video over IPFS, from Devcon&apos;s nodes
            first and other IPFS peers if needed, and checks every piece
            against that hash in your browser, so you watch exactly what was
            published without trusting whoever served it.
          </p>
          <p>
            Fetching from the public network shares your IP address and this
            video&apos;s CID with the peers and routing services involved.
          </p>
          <p className="bold">Help keep it available</p>
          <p>Pin this video on your own IPFS node:</p>
          <code className={css["command"]}>ipfs pin add {cid}</code>
          <p className={css["links"]}>
            <Link href="https://docs.ipfs.tech/concepts/what-is-ipfs/">
              What is IPFS ↗
            </Link>
            <Link href="https://docs.ipfs.tech/how-to/pin-files/">
              How pinning works ↗
            </Link>
            <Link href={ipfsGatewayUrl(cid)}>Open in gateway ↗</Link>
          </p>
        </div>
      </Modal>
    </div>
  );
};
