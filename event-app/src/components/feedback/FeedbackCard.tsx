"use client";

import { SecondaryButton } from "@/components/Buttons";
import { openFeedback } from "@/data/feedback/feedbackState";

/** My Devcon's permanent "Send feedback" entry (the Home one sits under Need help?). */
export function FeedbackCard() {
  return (
    <section className="mt-6 rounded-xl border border-dc-hairline bg-white p-4 font-heading lg:p-6">
      <h2 className="text-[16px] font-bold leading-6 text-dc-fg2">Feedback</h2>
      <p className="mt-1 text-[14px] leading-5 text-dc-muted">
        Something not working, or an idea for the app? Tell us, it takes a minute and your device details come along automatically.
      </p>
      <SecondaryButton type="button" size="sm" className="mt-3" onClick={() => openFeedback()}>
        Send feedback
      </SecondaryButton>
    </section>
  );
}
