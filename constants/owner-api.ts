export const OWNER_API_ORIGIN = "https://hadx-labs.vercel.app";
export const OWNER_AUTH_BASE_URL = `${OWNER_API_ORIGIN}/api/owner-auth`;
export const OWNER_ADMIN_BASE_URL = `${OWNER_API_ORIGIN}/api/admin`;
// Keep owner-admin auth isolated from the legacy OAuth session token. Reusing
// app_session_token sent non-owner tokens to /api/admin and caused persistent 401s.
export const OWNER_SESSION_KEY = "hadx_owner_admin_session";
