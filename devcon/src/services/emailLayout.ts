/**
 * Shared chrome for the transactional emails (builder approval/rejection,
 * voucher code, early-bird reminder).
 *
 * These pieces used to be copy-pasted per template, which is how the builder
 * approval email shipped with the pre-July-2026 header (see commit 137b4751c):
 * a new template was written from an older copy and silently reverted the fix.
 * Import from here so a header change lands everywhere at once.
 */

/**
 * Full-width image header — the same artwork as the devcon.org/en/form/* pages,
 * with the wordmark baked into the image.
 *
 * A plain <img> is never recolored by dark mode (Gmail mobile included) and
 * renders in every client, unlike a CSS-background band with an SVG logo: Gmail
 * drops the `background` shorthand and no major client renders SVG images.
 * Keep any tagline in the body below, where dark-mode remaps of dark-on-light
 * text behave correctly.
 */
export const EMAIL_HEADER_ROW = `          <!-- Header -->
          <tr>
            <td style="padding: 0;">
              <img src="https://devcon.org/email/email-header.png" alt="Devcon 8 India" width="560" style="display: block; width: 100%; max-width: 560px; height: auto;" />
            </td>
          </tr>`

/**
 * Declares the message light-only, so clients that auto-invert (Outlook.com,
 * Gmail dark theme) leave the palette alone instead of muddying the purple.
 * Goes in <head>.
 */
export const EMAIL_COLOR_SCHEME_META = `  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />`

/**
 * The small purple eyebrow above the greeting ("Sanctuary Tech Builders
 * application update", "Your voucher code is reserved", …). Lives in the body
 * because the header image carries no text of its own.
 */
export function emailEyebrow(text: string): string {
  return `              <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #7235ed; text-transform: uppercase; letter-spacing: 1px; text-align: center;">
                ${text}
              </p>`
}
