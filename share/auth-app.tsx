import type { Session } from "@supabase/supabase-js";
import { lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import { LockKeyhole, LogOut, ShieldCheck, UserRound, RefreshCw } from "lucide-react";
import { browserStore } from "./storage.mjs";
import { createPreviewApi } from "./api.mjs";
import { guardedPreviewFetch } from "./guarded-fetch.mjs";
import { setPreferenceAccount } from "../lib/browser-preferences.mjs";
import { authClient } from "./auth-client";
import { SignInForm, ResetPasswordForm, MfaChallenge, AccountSecurity } from "./account-forms";

const Studio = lazy(() => import("../app/page"));
const originalFetch = window.fetch.bind(window);
type Identity = { userId: string; email: string; displayName: string; role: string; identitySource: string };
class AccountError extends Error {
  constructor(public code: string, message: string) { super(message); }
}
function AuthFrame({ children }: { children: ReactNode }) {
  return <main className="studio-auth-screen flex min-h-dvh items-center justify-center p-4 sm:p-8"><div className="w-full max-w-md">
    <div className="mb-6 flex flex-col items-center text-center"><div role="img" aria-label="Sahaja Yoga Newsletter Studio" className="relative h-[65px] w-[167px] overflow-hidden mix-blend-multiply"><img src="/images/dashboard-reference.jpeg" alt="" className="absolute left-0 top-0 w-[1160px] max-w-none"/></div><h1 className="mt-4 text-2xl font-bold text-[#173e49]">Welcome to your studio</h1><p className="mt-2 text-sm leading-6 text-[#41646c]">A private workspace for Sahaja Yoga event organisers.</p></div>
    <section className="studio-panel p-5 sm:p-7">{children}</section><p className="mt-5 text-center text-xs leading-5 text-[#41646c]">Individual accounts · verified email · approved organiser access</p>
  </div></main>;
}

export function AuthApp() {
  useEffect(() => {
    // Replace the old public-preview image worker even before sign-in.
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/asset-worker.js?v=organiser-auth-1", {updateViaCache:"none"}).catch(() => undefined);
  }, []);
  if (!authClient) return <AuthFrame><LockKeyhole className="mb-3 text-teal-700"/><h2 className="font-bold">Account access is being prepared</h2><p className="mt-2 text-sm leading-6 text-slate-600">The organiser needs to finish account setup before this version can be opened.</p></AuthFrame>;
  return <AccountGate/>;
}
function AccountGate() {
  const client = authClient!;
  const [session, setSession] = useState<Session | null>(null), [isLoaded, setLoaded] = useState(false);
  const user = session?.user, userId = user?.id, isSignedIn = !!session;
  const [security, setSecurity] = useState(false);
  const [recovery, setRecovery] = useState(location.pathname === "/reset-password");
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [failure, setFailure] = useState<AccountError | null>(null);
  const [revision, setRevision] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  useEffect(() => {
    let alive = true;
    const { data: listener } = client.auth.onAuthStateChange((event, next) => {
      if (!alive) return;
      setSession(next); setLoaded(true);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (event === "SIGNED_OUT") { setIdentity(null); setSecurity(false); }
    });
    void client.auth.getSession().then(({data,error}) => { if (alive) { setSession(error ? null : data.session); setLoaded(true); } }).catch(() => { if(alive) setLoaded(true); });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, [client]);
  const getToken = useCallback(async () => {
    const {data,error} = await client.auth.getSession();
    if(error) throw error;
    return data.session?.access_token || null;
  }, [client]);
  const authorize = useCallback(async (): Promise<Identity> => {
    const token = await getToken();
    if (!token) throw new AccountError("SIGN_IN_REQUIRED", "Please sign in again to continue.");
    const response = await originalFetch("/api/auth", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(12000) });
    const result = await response.json() as { user?: Identity; code?: string; error?: string };
    if (!response.ok || !result.user?.userId) throw new AccountError(result.code || "AUTH_UNAVAILABLE", result.error || "Account access is temporarily unavailable.");
    if (result.user.userId !== userId) throw new AccountError("SIGN_IN_REQUIRED", "Your account has changed. Please sign in again.");
    return result.user;
  }, [getToken, userId]);
  const deny = useCallback((error: unknown) => { setIdentity(null); setFailure(error instanceof AccountError ? error : new AccountError("AUTH_UNAVAILABLE", "We couldn’t verify your account. Check your connection and try again.")); }, []);
  useEffect(() => {
    setIdentity(null); setFailure(null);
    if (!isLoaded || !isSignedIn) return;
    let alive = true, checking = false;
    const check = async () => {
      if (checking) return;
      checking = true;
      try { const next = await authorize(); if (alive) { setIdentity(old => old && JSON.stringify(old) === JSON.stringify(next) ? old : next); setFailure(null); } }
      catch (error) { if (alive) deny(error); }
      finally { checking = false; }
    };
    void check();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void check(); }, 30000);
    const focus = () => { void check(); };
    window.addEventListener("focus", focus);
    return () => { alive = false; clearInterval(timer); window.removeEventListener("focus", focus); };
  }, [authorize, deny, isLoaded, isSignedIn, userId, revision]);
  async function saveBeforeLeaving() {
    try { await (window as Window & { sySaveDraft?: () => Promise<unknown> }).sySaveDraft?.(); return true; }
    catch { return window.confirm("Your latest changes could not be saved. Leave this page anyway?"); }
  }
  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      if (!await saveBeforeLeaving()) return;
      const token = await getToken();
      let revoked = false;
      if (token) {
        const response = await originalFetch("/api/auth", { method: "POST", headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(12000) }).catch(() => null);
        revoked = !!response?.ok;
      }
      const result = await client.auth.signOut({scope:"local"});
      if(result.error && !revoked) throw result.error;
      // Clear only this app's tab-scoped credentials if provider logout failed
      // after our server already durably revoked the session.
      if (result.error) for (const key of Object.keys(sessionStorage)) if(key.startsWith("sb-") && key.endsWith("-auth-token")) sessionStorage.removeItem(key);
      window.location.replace("/sign-in");
    } catch (error) { deny(error); }
    finally { setSigningOut(false); }
  }
  const controls = <div className="mt-2 flex flex-wrap gap-2"><button type="button" className="auth-action" onClick={() => { void saveBeforeLeaving().then(ok => { if(ok) setSecurity(true); }); }}><UserRound size={16}/>Account & security</button><button type="button" className="auth-action" disabled={signingOut} onClick={() => { void signOut(); }}><LogOut size={16}/>{signingOut ? "Signing out…" : "Sign out"}</button></div>;
  if (!isLoaded) return <AuthFrame><p role="status">Opening your account…</p></AuthFrame>;
  if (!isSignedIn) return <AuthFrame><SignInForm client={client}/></AuthFrame>;
  if (failure?.code === "MFA_REQUIRED") return <AuthFrame><MfaChallenge client={client} done={()=>setRevision(n=>n+1)}/>{controls}</AuthFrame>;
  if (recovery) return <AuthFrame><ResetPasswordForm client={client} done={()=>{history.replaceState(null,"","/");setRecovery(false);setRevision(n=>n+1);}}/>{controls}</AuthFrame>;
  if (security && user) return <AuthFrame><AccountSecurity client={client} user={user} close={()=>{setSecurity(false);setRevision(n=>n+1);}}/>{controls}</AuthFrame>;
  if (failure) return <AuthFrame><ShieldCheck className="mb-3 size-8 text-teal-700"/><h2 className="text-lg font-bold">{failure.code === "APPROVAL_REQUIRED" ? "Waiting for organiser approval" : failure.code === "EMAIL_VERIFICATION_REQUIRED" ? "Verify your email" : "Account access paused"}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{failure.message}</p><p className="mt-3 break-all text-sm font-semibold text-teal-800">{user?.email}</p><button className="auth-action mt-5" onClick={() => setRevision(n => n + 1)}><RefreshCw size={16}/>Check access again</button>{controls}</AuthFrame>;
  if (!identity || identity.userId !== userId) return <AuthFrame><p role="status">Checking your organiser access…</p></AuthFrame>;
  return <ProtectedStudio key={identity.userId} identity={identity} authorize={authorize} denied={deny} getToken={getToken} controls={controls}/>;
}
function ProtectedStudio({ identity, authorize, denied, getToken, controls }: { identity: Identity; authorize: () => Promise<Identity>; denied: (error: unknown) => void; getToken: () => Promise<string | null>; controls: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true, cleanup = () => {};
    const tokenRequest = (event: MessageEvent) => {
      if (event.source !== navigator.serviceWorker.controller || event.data?.type !== "STUDIO_ASSET_TOKEN" || !event.ports[0]) return;
      const port = event.ports[0];
      void getToken().then(token => port.postMessage({ token: alive ? token : null })).catch(() => port.postMessage({ token: null })).finally(() => port.close());
    };
    navigator.serviceWorker.addEventListener("message", tokenRequest);
    void (async () => {
      const store = await browserStore(identity.userId);
      if (!alive) { store.close(); return; }
      cleanup = () => store.close();
      const registration = await navigator.serviceWorker.register("/asset-worker.js?v=organiser-auth-1", { updateViaCache: "none" });
      const worker = registration.installing || registration.waiting || registration.active;
      if (!worker) throw Error("Image storage could not start.");
      if (worker.state !== "activated") await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => { worker.removeEventListener("statechange", changed); reject(Error("Image storage startup timed out.")); }, 12000);
        function changed() { if (worker!.state === "activated" || worker!.state === "redundant") { clearTimeout(timer); worker!.removeEventListener("statechange", changed); worker!.state === "activated" ? resolve() : reject(Error("Image storage could not start.")); } }
        worker.addEventListener("statechange", changed); changed();
      });
      if (!navigator.serviceWorker.controller) await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => { navigator.serviceWorker.removeEventListener("controllerchange", changed); reject(Error("Image storage is not ready. Please reload.")); }, 12000);
        function changed() { clearTimeout(timer); navigator.serviceWorker.removeEventListener("controllerchange", changed); resolve(); }
        navigator.serviceWorker.addEventListener("controllerchange", changed, { once: true });
      });
      if (!alive) { store.close(); return; }
      setPreferenceAccount(identity.userId);
      let verifiedIdentity = identity;
      const check = async () => { verifiedIdentity = await authorize(); return verifiedIdentity; };
      const bridge = guardedPreviewFetch({ api: createPreviewApi(store, { identity: () => verifiedIdentity }), original: originalFetch, authorize: check, userId: identity.userId, origin: location.origin, denied });
      window.fetch = bridge.fetch;
      cleanup = () => { bridge.dispose(); window.fetch = originalFetch; store.close(); };
      setReady(true);
    })().catch(error => { if (alive) denied(error); });
    return () => { alive = false; cleanup(); navigator.serviceWorker.removeEventListener("message", tokenRequest); };
  }, [identity.userId, authorize, denied, getToken]);
  if (!ready) return <AuthFrame><p role="status">Opening your private workspace…</p></AuthFrame>;
  return <Suspense fallback={<AuthFrame><p role="status">Loading Newsletter Studio…</p></AuthFrame>}><Studio accountControls={controls}/></Suspense>;
}
