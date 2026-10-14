/**
 * One readable line about the device, for the Notion "Device" column:
 * "iOS 18 Safari", "Android 14 Chrome 130", "macOS Brave 130". Pure, so it
 * is testable; the caller passes what the User-Agent cannot tell (Brave hides
 * itself, Safari 26+ freezes the iOS version in the UA).
 */
export function summarizeUserAgent(
  ua: string,
  hints: { iosMajor?: number | null; brave?: boolean } = {}
): string {
  const os = (() => {
    if (/iPhone|iPad|iPod/.test(ua) || hints.iosMajor) {
      const m = ua.match(/OS (\d+)[._]/);
      const v = hints.iosMajor ?? (m ? Number(m[1]) : null);
      return v ? `iOS ${v}` : "iOS";
    }
    if (/Android/.test(ua)) {
      const m = ua.match(/Android (\d+)/);
      return m ? `Android ${m[1]}` : "Android";
    }
    if (/CrOS/.test(ua)) return "ChromeOS";
    if (/Windows/.test(ua)) return "Windows";
    if (/Macintosh|Mac OS X/.test(ua)) return "macOS";
    if (/Linux/.test(ua)) return "Linux";
    return "Unknown OS";
  })();

  const browser = (() => {
    const v = (re: RegExp) => ua.match(re)?.[1]?.split(".")[0] ?? "";
    if (hints.brave) return `Brave ${v(/Chrome\/([\d.]+)/)}`.trim();
    if (/Firefox\//.test(ua)) return `Firefox ${v(/Firefox\/([\d.]+)/)}`;
    if (/FxiOS\//.test(ua)) return `Firefox ${v(/FxiOS\/([\d.]+)/)}`;
    if (/Edg\//.test(ua)) return `Edge ${v(/Edg\/([\d.]+)/)}`;
    if (/SamsungBrowser\//.test(ua)) return `Samsung Internet ${v(/SamsungBrowser\/([\d.]+)/)}`;
    if (/OPR\//.test(ua)) return `Opera ${v(/OPR\/([\d.]+)/)}`;
    if (/CriOS\//.test(ua)) return `Chrome ${v(/CriOS\/([\d.]+)/)}`;
    if (/Chrome\//.test(ua)) return `Chrome ${v(/Chrome\/([\d.]+)/)}`;
    if (/Safari\//.test(ua)) return `Safari ${v(/Version\/([\d.]+)/)}`.trim();
    return "Unknown browser";
  })();

  return `${os} ${browser}`.trim();
}
