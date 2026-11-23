"use client";

import React, { useState } from "react";
import InfoIcon from "@/assets/icons/info.svg";
import CheckIcon from "@/assets/icons/circle_check.svg";
import { Link } from "@/components/common/link";
import { Modal, ModalSlide } from "@/components/common/modal";
import { ipfsGatewayUrl } from "@/utils/ipfs";
import type { IpfsPlayerStatus } from "./IpfsPlayer";
import css from "./source-info.module.scss";

const STATUS_LABEL: Record<IpfsPlayerStatus, string> = {
  starting: "Fetching from IPFS…",
  loading: "Fetching from IPFS…",
  ready: "Verified from IPFS",
  error: "Unavailable on IPFS",
  unsupported: "Verified playback unsupported",
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

      <Modal
        image={"/assets/images/ipfs_illustration.png"}
        open={infoOpen}
        close={() => setInfoOpen(false)}
        title="What is IPFS"
      >
        <ModalSlide title="What is IPFS">
          <div className={css["modal-content"]}>
            <p>Let&apos;s just start with a one-line definition of IPFS:</p>
            <p className={css["lead"]}>
              IPFS is a distributed system for storing and accessing files,
              websites, applications, and data.
            </p>
            <p className="semi-bold">Why Distribute Content?</p>
            <p>
              Help make devcon content less reliant on centralized platforms
              that may not be accessible by users around the world. Utilizing
              decentralized systems we can ensure that devcon content is always
              available to those interested in learning more about Ethereum
              regardless of intermediaries.
            </p>
            <p className="semi-bold">Verified playback</p>
            <p>
              This player fetches the video from the IPFS network inside your
              browser and checks every piece against its content hash, so what
              you watch is exactly what was published — no gateway has to be
              trusted.
            </p>
            <p>
              <Link href="https://docs.ipfs.tech/" indicateExternal>
                Learn more about IPFS
              </Link>
            </p>
          </div>
        </ModalSlide>

        <ModalSlide title="Pinning content on IPFS">
          <div className={css["modal-content"]}>
            <p className="bold">Why pin content on IPFS?</p>
            <p>
              Help decentralize Devcon content: to ensure that content persists
              on IPFS, and is not deleted during garbage collection, data can be
              pinned to one or more IPFS nodes. Pinning gives you control over
              disk space and data retention. You should use that control to pin
              any content you wish to help keep on IPFS indefinitely. The
              default behavior for IPFS is to pin files to your local IPFS node.
            </p>

            <p className="bold">Pin Devcon archive videos on your node</p>

            <p>
              <Link
                className="hover-underline"
                href="https://docs.ipfs.tech/install/ipfs-desktop/"
              >
                IPFS Desktop Application
              </Link>{" "}
              •{" "}
              <Link className="hover-underline" href="https://brave.com/">
                Brave
              </Link>{" "}
              •{" "}
              <Link className="hover-underline" href="https://www.opera.com/">
                Opera
              </Link>{" "}
              •{" "}
              <Link
                className="hover-underline"
                href="https://docs.ipfs.tech/install/ipfs-companion/"
              >
                IPFS Companion
              </Link>
            </p>

            <Link
              href="https://docs.ipfs.tech/how-to/pin-files/"
              className={css["learn-more-link"]}
            >
              Learn more about pinning 🡥
            </Link>
          </div>
        </ModalSlide>

        <ModalSlide title="Pinning content remotely">
          <div className={css["modal-content"]}>
            <p className="bold">Pinning Content Remotely</p>
            <p>
              Depending on how you use IPFS you might find it useful to use a
              remote pinning service. There are a number of commercial pinning
              services that make it easy for you to purchase pinning capacity
              for your important files.
            </p>
            <p className="bold">Pin Devcon archive videos remotely</p>
            <p>
              <Link
                className="hover-underline"
                href="https://docs.pinata.cloud/api-pinning/pin-file"
              >
                Pinata
              </Link>
              <span>{" • "}</span>
              <Link className="hover-underline" href="https://temporal.cloud/">
                Temporal
              </Link>
              <span>{" • "}</span>
              <Link
                className="hover-underline"
                href="https://wiki.crust.network/docs/en/buildIPFSW3AuthPin"
              >
                Crust
              </Link>
              <span>{" • "}</span>
              <Link
                className="hover-underline"
                href="https://infura.io/docs/ipfs#section/Getting-started/Pin-a-file"
              >
                Infura
              </Link>
            </p>

            <Link
              href="https://docs.ipfs.tech/how-to/work-with-pinning-services/"
              className={css["learn-more-link"]}
            >
              Learn more about Pinning Remotely 🡥
            </Link>
          </div>
        </ModalSlide>
      </Modal>
    </div>
  );
};
