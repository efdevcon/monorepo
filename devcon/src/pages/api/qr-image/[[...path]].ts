/**
 * /api/qr-image/<slug>[/<placement>]?svg[&download]: the printable QR code for
 * devcon.org/qr/<slug>[/<placement>]. Same handler as /api/qr/, reached on a
 * path of its own because Netlify keys its CDN cache on the path alone: the
 * image must never share a cache entry with the redirect. The middleware sends
 * `?svg` requests here.
 */
export { default } from '../qr/[[...path]]'
