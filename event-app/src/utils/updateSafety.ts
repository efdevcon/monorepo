/**
 * What on the page would make a quiet reload felt; the decision itself is
 * silentUpdate.ts, these only read the DOM. Browser only.
 */

/** A stream or translation player is mounted (SessionMedia's YouTube embed), or audio/video plays. */
export function mediaPlaying(): boolean {
  if (document.querySelector('iframe[src*="youtube.com/embed"], iframe[src*="youtube-nocookie.com/embed"]')) {
    return true;
  }
  return [...document.querySelectorAll<HTMLMediaElement>("video, audio")].some((m) => !m.paused && !m.ended);
}

/** A sheet or modal is open (BottomSheet, FeedbackSheet, QR modals, settings: all `aria-modal`). */
export function dialogOpen(): boolean {
  return document.querySelector('[aria-modal="true"]') !== null;
}

/** A text field has focus, or any text field on the page holds text (a search, a note). */
export function typing(): boolean {
  const el = document.activeElement;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement && !["button", "checkbox", "radio", "submit", "range", "hidden"].includes(el.type)) {
    return true;
  }
  if (el instanceof HTMLElement && el.isContentEditable) return true;
  return [...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    'input[type="search"], input[type="text"], input:not([type]), textarea'
  )].some((field) => field.value.trim().length > 0);
}
