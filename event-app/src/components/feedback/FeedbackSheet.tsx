"use client";

import cn from "classnames";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Paperclip, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { trackEvent } from "@/data/analytics/track";
import { useUser } from "@/data/auth/useUser";
import { useInterested } from "@/data/interested/useInterested";
import { collectDiagnostics } from "@/data/feedback/diagnostics";
import {
  FEEDBACK_PARAM,
  closeFeedback,
  openFeedback,
  takeRememberedCrash,
  useFeedbackRequest,
  type FeedbackRequest,
} from "@/data/feedback/feedbackState";
import { enqueueFeedback, sendFeedbackNow, type OutboxFile } from "@/data/feedback/outbox";
import { FEEDBACK_LIMITS, type FeedbackCategory } from "@/data/feedback/types";
import { fileProblem } from "@/data/feedback/validate";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useOnline } from "@/hooks/useOnline";
import { BottomSheet } from "@/components/BottomSheet";
import { PrimaryButton, SecondaryButton } from "@/components/Buttons";

/**
 * The feedback form, mounted once in the root layout (outside the route
 * segment, so the crash page can still open it) and opened through
 * `openFeedback` from Home, My Devcon, the crash page and the floating
 * button. Phones get the bottom sheet, desktop a centred modal, both with
 * the same content.
 *
 * Works offline: the report (files included) waits in Dexie and FeedbackSync
 * sends it when the connection returns.
 */
export function FeedbackSheet() {
  const request = useFeedbackRequest();
  const searchParams = useSearchParams();
  const isDesktop = useIsDesktop();
  const titleId = useId();

  // `/?feedback=crash`: the root-layout crash page sent us here with the
  // error in sessionStorage (it has no sheet of its own).
  useEffect(() => {
    if (!searchParams.get(FEEDBACK_PARAM)) return;
    const error = takeRememberedCrash();
    openFeedback({ source: error ? "crash" : "feedback", error: error ?? undefined });
    const url = new URL(window.location.href);
    url.searchParams.delete(FEEDBACK_PARAM);
    window.history.replaceState(window.history.state, "", url.toString());
  }, [searchParams]);

  useEffect(() => {
    if (request) trackEvent("feedback", "open", request.source);
  }, [request]);

  const open = !!request;
  const onOpenChange = (next: boolean) => {
    if (!next) closeFeedback();
  };
  // Keyed by openedAt: every open starts a fresh form.
  const form = request ? <FeedbackForm key={request.openedAt} request={request} titleId={titleId} /> : null;

  if (isDesktop) {
    return (
      <DesktopModal open={open} onClose={() => onOpenChange(false)} titleId={titleId}>
        {form}
      </DesktopModal>
    );
  }
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} ariaLabel="Send feedback" fit>
      <div
        className="max-h-full overflow-y-auto rounded-t-[16px] px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-5 shadow-[0_-10px_15px_rgba(22,11,43,0.1)]"
        style={{ background: MODAL_BG }}
      >
        {form}
      </div>
    </BottomSheet>
  );
}

const MODAL_BG = "linear-gradient(to top, #fbfafc 19.982%, #fff5fa 100%)";

function DesktopModal({
  open,
  onClose,
  titleId,
  children,
}: {
  open: boolean;
  onClose: () => void;
  titleId: string;
  children: React.ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  const duration = reducedMotion ? 0 : 0.2;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/[0.64] p-4 font-heading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative max-h-[calc(100dvh-32px)] w-full max-w-[440px] overflow-y-auto rounded-[12px] p-6 shadow-[0_10px_15px_rgba(22,11,43,0.1),0_4px_6px_rgba(22,11,43,0.1)]"
            style={{ background: MODAL_BG }}
            initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.95 }}
            transition={{ duration }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const CATEGORIES: { value: FeedbackCategory; label: string }[] = [
  { value: "bug", label: "Something's broken" },
  { value: "idea", label: "An idea" },
  { value: "question", label: "A question" },
];

const fieldClass =
  "w-full rounded-lg border border-dc-hairline bg-white px-3 py-2 text-[14px] leading-5 text-dc-fg outline-none focus:border-dc-fg2";
const labelClass = "text-[14px] font-bold leading-5 text-dc-fg2";

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function FeedbackForm({ request, titleId }: { request: FeedbackRequest; titleId: string }) {
  const crash = request.source === "crash";
  const { user } = useUser();
  const { ids } = useInterested();
  const online = useOnline();
  const fileInput = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState<"sent" | "queued-offline" | "queued-failed" | null>(null);
  // Drag highlight; the counter survives the enter/leave pairs that nested
  // children fire while a file crosses the form.
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  const addFiles = (list: FileList | File[] | null) => {
    if (!list || list.length === 0) return;
    const next = [...files];
    for (const file of Array.from(list)) {
      if (next.length >= FEEDBACK_LIMITS.files) {
        toast.error(`You can attach up to ${FEEDBACK_LIMITS.files} files`);
        break;
      }
      const reason = fileProblem(file.name, file.size);
      if (reason) {
        toast.error(`${file.name}: ${reason}`);
        continue;
      }
      next.push(file);
    }
    setFiles(next);
    if (fileInput.current) fileInput.current.value = "";
  };

  const onDragEnter = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  };
  const onDragLeave = () => {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };
  const onDrop = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };
  // A pasted screenshot (Cmd+V in the message box) is a file on the clipboard.
  const onPaste = (e: React.ClipboardEvent) => {
    const pasted = Array.from(e.clipboardData.files);
    if (pasted.length === 0) return;
    e.preventDefault();
    addFiles(pasted);
  };

  const submit = async () => {
    const text = message.trim();
    if (!text || busy) return;
    setBusy(true);
    setProblem(null);
    try {
      const payload = {
        category,
        source: request.source,
        message: text,
        email: email.trim(),
        page: window.location.pathname + window.location.search,
        error: request.error,
        diagnostics: await collectDiagnostics({ signedIn: !!user, interests: ids.size }),
      };
      const blobs: OutboxFile[] = files.map((f) => ({ name: f.name, type: f.type, blob: f }));
      if (navigator.onLine) {
        const result = await sendFeedbackNow(payload, blobs);
        if (result.ok) {
          trackEvent("feedback", "sent", request.source);
          setDone("sent");
          return;
        }
        if (!result.retryable) {
          setProblem(result.error);
          return;
        }
        // Server or network trouble while online: keep the report and retry
        // later, with the files that already made it to the bucket.
        await enqueueFeedback(payload, blobs, result.uploaded);
        trackEvent("feedback", "queued", `${request.source}-failed`);
        setDone("queued-failed");
        return;
      }
      await enqueueFeedback(payload, blobs);
      trackEvent("feedback", "queued", request.source);
      setDone("queued-offline");
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "Couldn't send your feedback");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="font-heading">
        <h2 id={titleId} className="text-[20px] font-bold leading-7 tracking-[-0.5px] text-dc-fg2">
          {done === "sent" ? "Thanks, we got it" : "Saved for later"}
        </h2>
        <p className="mt-2 text-[14px] leading-5 text-dc-muted">
          {done === "sent"
            ? "Your report reached the team. If you left an email, we may get back to you."
            : done === "queued-offline"
              ? "You're offline, so your report will be sent automatically the next time the app is online."
              : "We couldn't reach the server just now. Your report is saved and will be sent automatically later."}
        </p>
        <PrimaryButton type="button" onClick={closeFeedback} className="mt-5 w-full">
          Close
        </PrimaryButton>
      </div>
    );
  }

  return (
    <div
      className="font-heading"
      onDragEnter={onDragEnter}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) e.preventDefault();
      }}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <h2 id={titleId} className="text-[20px] font-bold leading-7 tracking-[-0.5px] text-dc-fg2">
        {crash ? "Report this problem" : "Send feedback"}
      </h2>
      <p className="mt-1 text-[14px] leading-5 text-dc-muted">
        {crash
          ? "Tell us what you were doing. The error and your device details are attached automatically."
          : "A bug, an idea, a question: tell us. Your device details are attached automatically, so we can look into it."}
      </p>

      {crash && request.error && (
        <p className="mt-4 break-words rounded-lg bg-dc-live-bg p-3 font-mono text-[12px] leading-4 text-dc-fg2">
          {request.error.message}
        </p>
      )}

      {!crash && (
        <div role="radiogroup" aria-label="What is this about?" className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={category === c.value}
              onClick={() => setCategory(c.value)}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1.5 text-[14px] font-semibold leading-5 transition-colors",
                category === c.value
                  ? "border-dc-purple bg-dc-lavender text-dc-purple"
                  : "border-dc-hairline bg-white text-dc-fg2 hover:bg-dc-lavender"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      <label className="mt-4 block">
        <span className={labelClass}>{crash ? "What were you doing?" : "Your message"}</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onPaste={onPaste}
          rows={4}
          maxLength={FEEDBACK_LIMITS.message}
          placeholder={crash ? "Which page, which tap, what you expected…" : "What happened, or what would help you?"}
          className={cn(fieldClass, "mt-1.5")}
        />
      </label>

      <label className="mt-3 block">
        <span className={labelClass}>Email (optional)</span>
        <input
          type="text"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={cn(fieldClass, "mt-1.5")}
        />
        <span className="mt-1 block text-[12px] leading-4 text-dc-muted">Only used to follow up with you.</span>
      </label>

      <div className="mt-3">
        <span className={labelClass}>Screenshot or screen recording (optional)</span>
        <div
          className={cn(
            "mt-1.5 rounded-lg border border-dashed p-3 transition-colors",
            dragging ? "border-dc-purple bg-dc-lavender" : "border-dc-hairline"
          )}
        >
        <input ref={fileInput} type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
        {files.length > 0 && (
          <ul className="mb-2 flex flex-col gap-1">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center gap-2 text-[14px] leading-5 text-dc-fg2">
                <Paperclip className="size-4 shrink-0 text-dc-muted" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                <span className="shrink-0 text-dc-muted">{formatSize(f.size)}</span>
                <button
                  type="button"
                  aria-label={`Remove ${f.name}`}
                  onClick={() => setFiles(files.filter((_, j) => j !== i))}
                  className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-dc-muted hover:bg-dc-lavender hover:text-dc-fg2"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <SecondaryButton
            type="button"
            size="sm"
            onClick={() => fileInput.current?.click()}
            disabled={files.length >= FEEDBACK_LIMITS.files}
          >
            <Paperclip className="size-4" />
            Add file
          </SecondaryButton>
          {/* Pointer-only hint: phones have neither drag nor Cmd+V for files. */}
          <span className="hidden text-[12px] leading-4 text-dc-muted lg:inline">
            {dragging ? "Drop to attach" : "or drop files here, or paste a screenshot in the message"}
          </span>
        </div>
        </div>
      </div>

      {!online && (
        <p className="mt-3 text-[12px] leading-4 text-dc-muted">
          {"You're offline. Your report will be saved and sent as soon as you're back online."}
        </p>
      )}
      {problem && <p className="mt-3 text-[14px] leading-5 text-dc-error">{problem}</p>}

      <div className="mt-5 flex flex-col gap-2">
        <PrimaryButton type="button" onClick={() => void submit()} disabled={busy || !message.trim()} className="w-full">
          {busy ? "Sending…" : online ? "Send" : "Save and send later"}
        </PrimaryButton>
        <SecondaryButton type="button" onClick={closeFeedback} disabled={busy} className="w-full">
          Cancel
        </SecondaryButton>
      </div>
    </div>
  );
}
