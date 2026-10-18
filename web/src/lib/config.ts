/**
 * Roshetta Web - Centralized API & Realtime Configuration
 *
 * In Web Browser (Production on Vercel or custom domain):
 * - API_BASE_URL is "" (empty string).
 *   All API requests use relative paths (`/api/...`).
 *   Relative paths are strictly SAME-ORIGIN, completely immune to:
 *   - Cross-Origin Resource Policy (CORP) blocks
 *   - CORS preflight failures
 *   - Mixed content SSL blocks
 *   - Third-party domain blockers
 *   Next.js rewrites in `next.config.ts` securely proxy these server-to-server
 *   to the Alwaysdata Express backend.
 *
 * In Localhost Development:
 * - Uses process.env.NEXT_PUBLIC_API_URL or defaults to "http://localhost:3001".
 */

function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");
    }
    // On any deployed domain (like roshetta-web.vercel.app):
    // ALWAYS return empty string to force same-origin proxy rewrites
    return "";
  }
  return "";
}

export const API_BASE_URL = getApiBaseUrl();

export const SOCKET_BASE_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:3001"
    : "https://aessaaessa.alwaysdata.net");
