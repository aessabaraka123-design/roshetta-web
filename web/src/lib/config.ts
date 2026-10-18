/**
 * Roshetta Web - Centralized API & Realtime Configuration
 *
 * In Production (Vercel):
 * - API_BASE_URL defaults to "" (empty string).
 *   This ensures all API calls use relative paths (e.g. `/api/...`).
 *   Relative paths are same-origin, completely eliminating CORS and CORP blocks,
 *   and are seamlessly proxied by Next.js rewrites to the Alwaysdata backend.
 *
 * In Local Development:
 * - Uses process.env.NEXT_PUBLIC_API_URL or defaults to "http://localhost:3001".
 */

const isBrowser = typeof window !== "undefined";
const isLocalhost =
  isBrowser &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL !== undefined &&
  process.env.NEXT_PUBLIC_API_URL !== ""
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")
    : isLocalhost
    ? "http://localhost:3001"
    : "";

export const SOCKET_BASE_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (isLocalhost
    ? "http://localhost:3001"
    : "https://aessaaessa.alwaysdata.net");
