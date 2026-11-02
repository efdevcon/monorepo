"use client";

import { SecondaryButton } from "@/components/Buttons";
import { openFeedback } from "@/data/feedback/feedbackState";

/**
 * My Devcon's permanent "Send feedback" entry (the Home one sits under
 * Need help?). Phones stack the button under the copy; desktop puts it
 * opposite the text. Title matches the ticket section titles above it.
 */
export function FeedbackCard() {
  return (
    <section className="mt-6 rounded-xl border border-dc-hairline bg-white p-4 font-heading lg:flex lg:items-center lg:justify-between lg:gap-8 lg:p-6">
      <div>
        <h2 className="text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg2">
          Feedback
        </h2>
        <p className="mt-1 text-[14px] leading-5 text-dc-muted lg:text-[16px] lg:leading-6">
          Something not working, or got an idea you want to share for the app? Let us know!
          It&rsquo;s fast and your basic device details are sent automatically.
        </p>
      </div>
      <SecondaryButton
        type="button"
        size="sm"
        className="mt-3 lg:mt-0 lg:shrink-0"
        onClick={() => openFeedback()}
      >
        Send feedback to the team
      </SecondaryButton>
    </section>
  );
}
