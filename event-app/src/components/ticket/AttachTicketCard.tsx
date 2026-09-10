"use client";

import { useRef, useState } from "react";
import cn from "classnames";
import { Loader2, Upload, Users } from "lucide-react";
import { toast } from "sonner";
import { PrimaryButton } from "@/components/Buttons";
import { NeedsConnection } from "@/components/NeedsConnection";
import { useOnline } from "@/hooks/useOnline";
import { useUser } from "@/data/auth/useUser";
import type { AttachResult } from "@/data/tickets/useTickets";
import type { BuyerOrder, TicketChoice } from "@/data/tickets/primary";
import { ACCEPTED_TICKET_FILES, isUnsupportedPhotoFormat } from "@/data/tickets/qrFromFile";
import { BuyerOrdersHint } from "./BuyerOrdersHint";
import { displayItemName } from "./ticketTheme";

const NO_CODE =
  "No ticket code found in this file. Try the ticket PDF, the wallet pass (.pkpass), or a screenshot that shows the QR code large and sharp.";
const UNSUPPORTED_PHOTO =
  "This photo format can't be read here. Take a screenshot of it, or use the ticket PDF or the wallet pass (.pkpass).";

const CARD = "flex flex-col gap-3 rounded-xl border border-dc-hairline bg-white p-4";
const TITLE = "text-[16px] font-bold leading-6 text-dc-fg2";
const BODY = "text-[14px] leading-5 text-dc-fg2";
const HINT = "text-[12px] leading-4 text-dc-muted";
const TEXT_LINK =
  "cursor-pointer font-bold text-dc-purple hover:underline disabled:cursor-default disabled:opacity-50";

type Stage = "idle" | "decoding" | "verifying";

/**
 * The upload path shared by the prompts: a plain file input covers the photo
 * library, files (the ticket PDF, the wallet pass) and, on iOS, the camera,
 * with no permission prompt of our own. The QR is decoded on the device; only
 * the decoded code goes to the server. Needs a connection for the Pretix check.
 */
function useQrUpload(onAttach: (code: string) => Promise<AttachResult>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file || stage !== "idle") return;
    setError(null);
    setStage("decoding");
    try {
      const { decodeQrFromFile } = await import("@/data/tickets/qrFromFile");
      const code = await decodeQrFromFile(file);
      if (!code) {
        // HEIC from an iPhone decodes in Safari but nowhere else; say so
        // instead of blaming the picture.
        setError(isUnsupportedPhotoFormat(file) ? UNSUPPORTED_PHOTO : NO_CODE);
        return;
      }
      setStage("verifying");
      const result = await onAttach(code);
      if (result.ok) toast.success("Ticket added");
      else setError(result.error);
    } finally {
      setStage("idle");
      // Let the same file be picked again after a failure.
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPTED_TICKET_FILES}
      // display:none, not sr-only: the picker still opens from .click(), and
      // "No file chosen" never reaches the page text.
      className="hidden"
      tabIndex={-1}
      aria-hidden
      onChange={(e) => void handleFile(e.target.files?.[0])}
    />
  );
  const label =
    stage === "decoding"
      ? "Reading your ticket…"
      : stage === "verifying"
        ? "Checking your ticket…"
        : null;

  return { input, open: () => inputRef.current?.click(), busy: stage !== "idle", label, error, setError };
}

/** Always mounted so the card does not jump when a message appears. */
function ErrorLine({ error }: { error: string | null }) {
  return (
    <p className="min-h-5 text-[14px] leading-5 text-dc-error" aria-live="polite">
      {error ?? ""}
    </p>
  );
}

export type AttachVariant = "none" | "replace";

const COPY: Record<AttachVariant, { title: string; body: string }> = {
  none: {
    title: "No ticket found for this email",
    body: "Have your ticket? Upload it: the ticket PDF, the wallet pass (.pkpass), or a screenshot of its QR code.",
  },
  replace: {
    title: "Not your ticket?",
    body: "Upload yours, as the ticket PDF, the wallet pass (.pkpass), or a screenshot of its QR code. It will take this one's place here.",
  },
};

/** Upload-only prompt: no ticket under this email, or replacing the one shown. */
export function AttachTicketCard({
  variant,
  onAttach,
  onCancel,
}: {
  variant: AttachVariant;
  onAttach: (code: string) => Promise<AttachResult>;
  onCancel?: () => void;
}) {
  const online = useOnline();
  const { signOut, loading } = useUser();
  const upload = useQrUpload(onAttach);

  return (
    <section className={CARD}>
      <h2 className={TITLE}>{COPY[variant].title}</h2>
      <p className={BODY}>{COPY[variant].body}</p>
      <p className={HINT}>Any of the ticket email attachments works, or a screenshot of the QR code.</p>
      {upload.input}
      <PrimaryButton
        type="button"
        className="min-h-12 w-full"
        onClick={upload.open}
        disabled={upload.busy || !online}
      >
        <Upload className="size-4" />
        {upload.label ?? "Upload your ticket"}
      </PrimaryButton>
      {!online && <NeedsConnection what="Attaching a ticket" />}
      <ErrorLine error={upload.error} />
      {variant === "none" && (
        // The most common "no ticket" is simply the wrong sign-in address.
        <p className={BODY}>
          Signed in with a different email than the one on your ticket?{" "}
          <button
            type="button"
            onClick={signOut}
            disabled={loading !== false}
            className={TEXT_LINK}
          >
            Sign out and use that one
          </button>
        </p>
      )}
      {onCancel && (
        <div className="flex items-center justify-end text-[14px] leading-none">
          <button type="button" onClick={onCancel} className="cursor-pointer text-dc-muted hover:underline">
            Cancel
          </button>
        </div>
      )}
    </section>
  );
}

/**
 * Several tickets under this email and none chosen: pick one. The email match
 * already proves possession, so choosing needs no QR; the screenshot stays as
 * the way out when the rows cannot be told apart (same type, same email, no
 * names). No QR codes show until a choice is made.
 */
export function ChooseTicketCard({
  choices,
  accountEmail,
  buyerOrders,
  onChoose,
  onAttach,
}: {
  choices: TicketChoice[];
  /** The signed-in email: rows only name a holder when it differs from it. */
  accountEmail: string;
  /** Orders the account bought with several tickets still under its email (see BuyerOrdersHint). */
  buyerOrders: BuyerOrder[];
  onChoose: (positionId: number) => Promise<AttachResult>;
  onAttach: (code: string) => Promise<AttachResult>;
}) {
  const online = useOnline();
  const upload = useQrUpload(onAttach);
  const [choosing, setChoosing] = useState<number | null>(null);
  const busy = upload.busy || choosing !== null;

  const account = accountEmail.toLowerCase();
  const severalOrders = new Set(choices.map((choice) => choice.orderCode)).size > 1;

  const choose = async (positionId: number) => {
    setChoosing(positionId);
    upload.setError(null);
    try {
      const result = await onChoose(positionId);
      if (result.ok) {
        toast.success("Set as your ticket", {
          description: "Your interests, Q&A and swag follow it. The others stay in your Pretix email.",
          // Two sentences to read; the default 4 s is gone before the second,
          // and a close button lets a fast reader dismiss it early.
          duration: 8_000,
          closeButton: true,
        });
      }
      else upload.setError(result.error);
    } finally {
      setChoosing(null);
    }
  };

  /**
   * Line 1, bold: the identifier, the one thing that differs between rows
   * ("Order ABCDE · Ticket #1", the order only when several are involved). Line 2: the
   * ticket type, a holder other than you, and the status note. Line 3: swag.
   */
  // Non-breaking spaces keep "Order ABCDE" and "Ticket #1" whole when the line wraps.
  const reference = (choice: TicketChoice) =>
    severalOrders
      ? `Order\u00a0${choice.orderCode} · Ticket\u00a0#${choice.ordinal}`
      : `Ticket\u00a0#${choice.ordinal}`;
  const swag = (choice: TicketChoice) => choice.addons.map(displayItemName).join(" · ");

  return (
    <section className={CARD}>
      <h2 className={TITLE}>Which ticket is yours?</h2>
      <p className={BODY}>
        {choices.length} tickets are under this email. Pick yours to see its QR code; the others
        stay in your Pretix email. Your interests, Q&amp;A and swag follow this ticket.
      </p>
      <ul className="flex flex-col gap-2">
        {choices.map((choice) => (
          <li
            key={choice.secret}
            // Phone: text on top, button below it right-aligned, so neither
            // squeezes the other. Desktop: one row.
            className="flex flex-col gap-2 rounded-lg border border-dc-hairline bg-dc-panel px-3 py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-3 lg:py-2"
          >
            {/* Wrap, never truncate: on a phone the details line is the only
                way to tell two same-type tickets apart. */}
            <div className="min-w-0 [overflow-wrap:anywhere]">
              <p className="text-[14px] font-bold leading-5 text-dc-fg2">{reference(choice)}</p>
              <p className="text-[12px] leading-4 text-dc-fg2">
                {displayItemName(choice.itemName)}
                {choice.test && <span className="text-dc-muted"> (test ticket)</span>}
                {choice.holder.toLowerCase() !== account && <> · {choice.holder}</>}
                {choice.sharedWith ? (
                  <span className="text-dc-muted">
                    {" · "}
                    <span className="whitespace-nowrap">
                      <Users className="inline size-3 -translate-y-px" aria-hidden />
                      {" "}attached
                    </span>{" "}
                    by someone else
                  </span>
                ) : null}
              </p>
              {swag(choice) && (
                <p className="text-[12px] leading-4 text-dc-muted">{swag(choice)}</p>
              )}
            </div>
            {choice.positionId !== undefined ? (
              <button
                type="button"
                onClick={() => void choose(choice.positionId as number)}
                disabled={busy || !online}
                className={cn(
                  "flex h-8 shrink-0 cursor-pointer items-center gap-1.5 self-end rounded-full border border-dc-hairline bg-white px-3 text-[12px] font-semibold leading-none text-dc-fg2 transition-colors duration-150 ease-out hover:bg-dc-purple-wash disabled:cursor-default disabled:opacity-50 lg:self-auto"
                )}
              >
                {/* No resting icon: a check made every row look already chosen. */}
                {choosing === choice.positionId && (
                  <Loader2 className="size-4 animate-spin text-dc-purple" />
                )}
                {choosing === choice.positionId ? "Adding…" : "This one is mine"}
              </button>
            ) : (
              // No position id: a payload cached by an older build, which a
              // refresh fixes (fixture tickets carry synthetic ids).
              <span className="shrink-0 self-end text-[12px] leading-none text-dc-muted lg:self-auto">Refresh to choose</span>
            )}
          </li>
        ))}
      </ul>
      {upload.input}
      {/* The way out when rows look alike: same stacked-then-row shape as the
          rows above, with a pill instead of a text link buried in a sentence. */}
      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-dc-hairline px-3 py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-3 lg:py-2">
        <div className="min-w-0">
          <p className="text-[14px] font-bold leading-5 text-dc-fg2">Can&apos;t tell them apart?</p>
          <p className="text-[12px] leading-4 text-dc-muted">
            Upload your ticket: the PDF, the wallet pass (.pkpass), or a screenshot of its QR code.
          </p>
        </div>
        <button
          type="button"
          onClick={upload.open}
          disabled={busy || !online}
          className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 self-end rounded-full border border-dc-hairline bg-white px-3 text-[12px] font-semibold leading-none text-dc-fg2 transition-colors duration-150 ease-out hover:bg-dc-purple-wash disabled:cursor-default disabled:opacity-50 lg:self-auto"
        >
          <Upload className="size-4 text-dc-purple" />
          {upload.label ?? "Upload your ticket"}
        </button>
      </div>
      <BuyerOrdersHint orders={buyerOrders} />
      {!online && <NeedsConnection what="Choosing a ticket" />}
      <ErrorLine error={upload.error} />
    </section>
  );
}
