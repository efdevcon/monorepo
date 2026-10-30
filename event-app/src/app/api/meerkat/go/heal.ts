import { SUPABASE_PROXY_PATH } from "@/data/auth/supabaseProxy";

/**
 * The self-heal of the Meerkat hand-off's "Sign in first" page (route.ts).
 *
 * The hand-off is decided from the auth cookie, which the app mirrors from
 * its own session (auth-js, localStorage) and the server only validates,
 * never refreshes (src/data/auth/authCookie.ts). Two things leave that cookie
 * behind the app: a mirror that never happened (new install, a failed POST on
 * bad Wi-Fi) and plain time, since an access token lives an hour and the app
 * refreshes its own copy only while it runs. Without this script the page
 * told someone to sign in whom the app, one tap later, showed as signed in.
 *
 * So the page does what the app would do, in the app's own origin: read the
 * stored session, mirror it when its access token is live, otherwise refresh
 * it at Supabase first (the request auth-js sends, with the same-origin proxy
 * as the fallback the app uses) and write the new session back before
 * anything else, so the app never reuses the rotated refresh token (after the
 * reuse window that revokes the whole family and signs the person out). All
 * of it under auth-js's own Web Lock (`lock:<storageKey>`), so a tab running
 * the app cannot refresh at the same moment. Then one reload, `retried=1`.
 * Only when that fails is content revealed, and which content depends on
 * why (the page renders both hidden behind a waiting state, see route.ts):
 * a session that is gone for good (none stored, or Supabase refused the
 * refresh token) shows the sign-in content; anything that might pass a
 * minute later (no network, a rate limit, a server error, storage that
 * cannot be written) shows "try again", because telling someone the app
 * still shows as signed in to sign in again would be wrong.
 *
 * Plain script, inlined (no CSP on this app) and exercised by
 * `scripts/test-data.ts` in a vm sandbox with stubbed storage and fetch.
 */
export interface HealConfig {
  /** auth-js storage key, `sb-<ref>-auth-token` (authCookieName). */
  storageKey: string;
  supabaseUrl: string;
  /** The project's anon key: public, it ships in the client bundle anyway. */
  anonKey: string;
}

/** Reveal the sign-in content even when the network never answers. */
export const HEAL_GIVE_UP_MS = 12_000;
/** Refresh a token this close to expiry instead of mirroring it (auth-js keeps a 30 s margin too). */
export const HEAL_EXPIRY_MARGIN_S = 30;
/** Deadline of each request the heal sends. */
export const HEAL_REQUEST_MS = 8_000;

/** JSON for an inline script: `<` escaped so no value can close the script tag. */
const js = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c");

export function healScriptBody(cfg: HealConfig): string {
  return `(function () {
  var KEY = ${js(cfg.storageKey)};
  var AUTH = ${js(cfg.supabaseUrl.replace(/\/$/, "") + "/auth/v1")};
  var PROXY_AUTH = location.origin + ${js(SUPABASE_PROXY_PATH + "/auth/v1")};
  var ANON = ${js(cfg.anonKey)};
  var MARGIN_MS = ${HEAL_EXPIRY_MARGIN_S * 1000};
  var REQUEST_MS = ${HEAL_REQUEST_MS};
  var done = false;
  var timer = setTimeout(function () { giveUp("retry"); }, ${HEAL_GIVE_UP_MS});
  // Outcomes: "ok" (cookie mirrored, reload), "signin" (the session is gone
  // for good), "retry" (could not tell right now).
  function giveUp(outcome) {
    clearTimeout(timer);
    if (done) return;
    done = true;
    // Looked up here, not at load: this script runs in <head>, before the body exists.
    var wait = document.getElementById("heal-wait");
    var show = (outcome === "retry" && document.getElementById("heal-retry")) || document.getElementById("heal-fail");
    if (wait) wait.hidden = true;
    if (show) {
      show.hidden = false;
      var title = show.getAttribute("data-title");
      if (title) document.title = title;
    }
  }
  function reload() {
    clearTimeout(timer);
    done = true;
    var url = new URL(location.href);
    url.searchParams.set("retried", "1");
    location.replace(url.toString());
  }
  function read() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || "null");
      return s && typeof s.access_token === "string" && typeof s.refresh_token === "string" ? s : null;
    } catch (e) {
      return null;
    }
  }
  function expiring(s) {
    return !(typeof s.expires_at === "number" && s.expires_at * 1000 > Date.now() + MARGIN_MS);
  }
  function post(url, init) {
    var request = Object.assign({}, init);
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var deadline = null;
    if (controller) {
      request.signal = controller.signal;
      deadline = setTimeout(function () { controller.abort(); }, REQUEST_MS);
    }
    return fetch(url, request).then(
      function (r) { clearTimeout(deadline); return r; },
      function (e) { clearTimeout(deadline); throw e; }
    );
  }
  // A refusal (4xx) means the tokens are no good; a rate limit or a server error may pass later.
  function outcomeOf(status) {
    return status === 429 || status >= 500 ? "retry" : "signin";
  }
  function mirror(s) {
    return post("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: s.access_token, refresh_token: s.refresh_token })
    }).then(function (r) { return r.ok ? "ok" : outcomeOf(r.status); }, function () { return "retry"; });
  }
  // Resolves to { session } or { outcome }.
  function refresh(s) {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch (e) {
      return Promise.resolve({ outcome: "retry" });
    }
    var init = {
      method: "POST",
      headers: { apikey: ANON, Authorization: "Bearer " + ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: s.refresh_token })
    };
    var path = "/token?grant_type=refresh_token";
    return post(AUTH + path, init)
      .catch(function () { return post(PROXY_AUTH + path, Object.assign({}, init, { credentials: "omit" })); })
      .then(function (r) {
        if (!r.ok) return { outcome: outcomeOf(r.status) };
        return r.json().then(function (next) {
          if (!next || typeof next.access_token !== "string" || typeof next.refresh_token !== "string") return { outcome: "retry" };
          if (typeof next.expires_at !== "number" && typeof next.expires_in === "number") {
            next.expires_at = Math.round(Date.now() / 1000) + next.expires_in;
          }
          localStorage.setItem(KEY, JSON.stringify(next));
          return { session: next };
        });
      })
      .catch(function () { return { outcome: "retry" }; });
  }
  function refreshAndMirror(s) {
    return refresh(s).then(function (res) { return res.session ? mirror(res.session) : res.outcome; });
  }
  function heal() {
    var s = read();
    if (!s) return Promise.resolve("signin");
    if (expiring(s)) return refreshAndMirror(s);
    // The server refused a token the device clock calls live (clock skew, a stale pair): refresh once.
    return mirror(s).then(function (m) { return m === "signin" ? refreshAndMirror(s) : m; });
  }
  function locked(fn) {
    if (navigator.locks && typeof navigator.locks.request === "function") {
      return navigator.locks.request("lock:" + KEY, { mode: "exclusive" }, fn);
    }
    return fn();
  }
  Promise.resolve().then(function () { return locked(heal); }).then(function (outcome) { if (outcome === "ok") reload(); else giveUp(outcome); }, function () { giveUp("retry"); });
})();`;
}

export function healScript(cfg: HealConfig): string {
  return `<script>${healScriptBody(cfg)}</script>`;
}
