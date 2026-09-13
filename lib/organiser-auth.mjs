// Server-only policy. The provider owns passwords, verification and OAuth flows.
export class AccessError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
export function authConfiguration(env) {
  let origin;
  try {
    const url = new URL(env.STUDIO_APP_ORIGIN);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw Error();
    if (url.protocol !== "https:" && !(env.NODE_ENV !== "production" && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) throw Error();
    origin = url.origin;
  } catch { throw new AccessError(503, "AUTH_NOT_CONFIGURED", "Account access is not configured yet. Please contact the organiser."); }
  const emails = [...new Set(String(env.STUDIO_ORGANISER_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean))];
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(env.VITE_SUPABASE_URL || "") || !env.VITE_SUPABASE_PUBLISHABLE_KEY || emails.length > 5 || emails.some(e => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))) {
    throw new AccessError(503, "AUTH_NOT_CONFIGURED", "Account access is not configured yet. Please contact the organiser.");
  }
  return { origin, emails };
}
export function privateJson(body, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store, max-age=0", "Vary": "Authorization", "X-Content-Type-Options": "nosniff", ...(status === 503 ? { "Retry-After": "15" } : {}) } });
}
export function authErrorResponse(error) {
  if (error instanceof AccessError) return privateJson({ code: error.code, error: error.message }, error.status);
  // Never expose provider errors, request tokens, email lists or secret keys.
  return privateJson({ code: "AUTH_UNAVAILABLE", error: "Account access is temporarily unavailable. Please try again shortly." }, 503);
}
export function createOrganiserAuth({ env, client }) {
  async function authenticate(request) {
    const config = authConfiguration(env);
    const origin = request.headers.get("origin");
    if ((origin && origin !== config.origin) || (request.method !== "GET" && origin !== config.origin)) throw new AccessError(403, "ORIGIN_REJECTED", "This request did not come from the studio.");
    const token = request.headers.get("authorization") || "";
    if (!/^Bearer [^\s]+$/.test(token) || token.length > 8192) throw new AccessError(401, "SIGN_IN_REQUIRED", "Please sign in to continue.");
    const provider = client(token.slice(7));
    // Supabase verifies the JWT remotely. Never authorise from a decoded JWT,
    // getSession(), browser profile, or user-editable metadata.
    const { data, error } = await provider.auth.getUser(token.slice(7));
    if (error) {
      if ([400, 401, 403].includes(error.status)) throw new AccessError(401, "SIGN_IN_REQUIRED", "Your session has ended. Please sign in again.");
      throw error;
    }
    const user = data?.user;
    if (!user || user.is_anonymous || (user.banned_until && Date.parse(user.banned_until) > Date.now())) throw new AccessError(401, "SIGN_IN_REQUIRED", "Please sign in to continue.");
    // The database checks the live auth.sessions row and a durable revocation
    // record. A logged-out JWT cannot keep using studio APIs until its expiry.
    const status = await provider.rpc("studio_session_status");
    if (status.error) throw status.error;
    if (status.data?.user_id !== user.id || status.data?.active !== true) throw new AccessError(401, "SIGN_IN_REQUIRED", "Your session has ended. Please sign in again.");
    return { provider, user, config, status: status.data };
  }
  function approve({ user, config, status }) {
    if (!user.email || !user.email_confirmed_at) throw new AccessError(403, "EMAIL_VERIFICATION_REQUIRED", "Please verify your email address using the email we sent you.");
    const email = user.email.trim().toLowerCase();
    if (!config.emails.includes(email)) throw new AccessError(403, "APPROVAL_REQUIRED", "Your account is ready. The workspace owner needs to approve your email before you can enter.");
    if (status.mfa_required && status.aal !== "aal2") throw new AccessError(403, "MFA_REQUIRED", "Enter the code from your authenticator app to continue.");
    const name = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim().slice(0, 100) : "";
    return { userId: user.id, email, displayName: name || email.split("@")[0], role: "organiser", identitySource: "Verified organiser account" };
  }
  return {
    async requireOrganiser(request) { return approve(await authenticate(request)); },
    async handle(request) {
      try {
        if (!["GET", "POST"].includes(request.method)) return privateJson({ error: "Method not allowed" }, 405);
        const context = await authenticate(request);
        if (request.method === "POST") { const result = await context.provider.rpc("studio_revoke_session"); if (result.error) throw result.error; return privateJson({ signedOut: true }); }
        return privateJson({ user: approve(context) });
      } catch (error) { return authErrorResponse(error); }
    },
  };
}
