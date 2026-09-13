import { useEffect, useRef, useState, type FormEvent } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { authEnv } from "./auth-client";

const inputClass = "mt-1 w-full rounded-xl border border-teal-900/20 bg-white/70 px-3 py-3 text-base text-slate-900 focus:outline-2 focus:outline-teal-700";
function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="block text-sm font-semibold text-slate-700">{label}<input {...props} className={inputClass}/></label>;
}
function Feedback({ text, error = false }: { text: string; error?: boolean }) {
  return text ? <p role={error ? "alert" : "status"} className={`rounded-xl p-3 text-sm leading-6 ${error ? "bg-rose-50 text-rose-800" : "bg-teal-50 text-teal-900"}`}>{text}</p> : null;
}
function Captcha({ onToken }: { onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!authEnv.VITE_TURNSTILE_SITE_KEY) return;
    let stopped = false, widget: string | undefined;
    const turnstile = () => (window as any).turnstile;
    const render = () => { if (!stopped && container.current && widget === undefined && turnstile()) widget = turnstile().render(container.current, { sitekey: authEnv.VITE_TURNSTILE_SITE_KEY, callback: onToken, "expired-callback": () => onToken(""), "error-callback": () => onToken(""), theme: "light" }); };
    let script = document.querySelector<HTMLScriptElement>("script[data-studio-turnstile]");
    if (!script) { script = document.createElement("script"); script.dataset.studioTurnstile = "true"; script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; script.async = true; document.head.appendChild(script); }
    script.addEventListener("load", render); render();
    return () => { stopped = true; script.removeEventListener("load", render); if (widget !== undefined) turnstile()?.remove(widget); };
  }, [onToken]);
  return <div ref={container}/>;
}
export function SignInForm({ client }: { client: SupabaseClient }) {
  const [mode, setMode] = useState<"login" | "signup" | "reset" | "resend">(location.pathname === "/sign-up" ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");
  const [captcha, setCaptcha] = useState(""), [captchaKey, setCaptchaKey] = useState(0), [cooldown, setCooldown] = useState(false);
  useEffect(() => { if (!cooldown) return; const timer = setTimeout(() => setCooldown(false), 60000); return () => clearTimeout(timer); }, [cooldown]);
  function change(next: typeof mode) { setMode(next); setError(""); setMessage(""); setPassword(""); }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const options = { captchaToken: captcha || undefined };
      let result;
      if (mode === "login") result = await client.auth.signInWithPassword({ email: email.trim(), password, options });
      else if (mode === "signup") result = await client.auth.signUp({ email: email.trim(), password, options: { ...options, data: { full_name: name.trim() }, emailRedirectTo: location.origin + "/" } });
      else if (mode === "resend") result = await client.auth.resend({ type: "signup", email: email.trim(), options: { ...options, emailRedirectTo: location.origin + "/" } });
      else result = await client.auth.resetPasswordForEmail(email.trim(), { ...options, redirectTo: location.origin + "/reset-password" });
      if (result.error) {
        if (result.error.status === 429) throw Error("Please wait a minute before trying again.");
        if (mode === "login") throw Error("We couldn’t sign you in. Check your email and password, and confirm your email first.");
        throw Error("We couldn’t complete this request. Please try again shortly. If it continues, ask the organiser to check the email service configuration.");
      }
      if (mode !== "login") { setCooldown(true); setMessage(mode === "reset" ? "If this email has an account, a password-reset link will arrive shortly. Open it in this browser." : "Check your inbox and spam folder for a confirmation link. Open it in this browser, then sign in. If you already have an account, use Sign in or Forgot password."); }
      setPassword("");
    } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); }
    finally { setBusy(false); setCaptcha(""); setCaptchaKey(n => n + 1); }
  }
  async function google() {
    setBusy(true); setError("");
    try { const { error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + "/", scopes: "openid email profile" } }); if (error) throw error; }
    catch { setError("Google sign-in is unavailable. Please use email sign-in or contact the organiser."); setBusy(false); }
  }
  const title = mode === "signup" ? "Create your organiser account" : mode === "reset" ? "Reset your password" : mode === "resend" ? "Resend confirmation email" : "Sign in";
  return <><h2 className="mb-5 text-lg font-bold text-slate-800">{title}</h2><form onSubmit={submit} className="space-y-4">
    {mode === "signup" && <Field label="Full name" name="name" autoComplete="name" value={name} onChange={e=>setName(e.target.value)} required maxLength={100}/>}
    <Field label="Email address" name="email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={254}/>
    {(mode === "login" || mode === "signup") && <Field label={mode === "signup" ? "Password · at least 12 characters" : "Password"} name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={e=>setPassword(e.target.value)} required minLength={mode === "signup" ? 12 : undefined} maxLength={128}/>}
    <Captcha key={captchaKey} onToken={setCaptcha}/><Feedback text={error} error/><Feedback text={message}/>
    <button className="auth-action w-full justify-center bg-teal-800! text-white!" disabled={busy || (cooldown && mode !== "login") || (!!authEnv.VITE_TURNSTILE_SITE_KEY && !captcha)}>{busy ? "Please wait…" : cooldown && mode !== "login" ? "Check your email · wait before resending" : title}</button>
  </form>
  {authEnv.VITE_GOOGLE_AUTH_ENABLED === "true" && mode === "login" && <button className="auth-action mt-3 w-full justify-center" disabled={busy} onClick={()=>void google()}>Continue with Google</button>}
  <div className="mt-5 flex flex-wrap gap-x-4 gap-y-3 text-sm text-teal-900">{([ ["login", "Sign in"], ["signup", "Create account"], ["reset", "Forgot password?"], ["resend", "Resend confirmation"] ] as const).filter(([id])=>id!==mode).map(([id,label])=><button type="button" className="underline underline-offset-4" key={id} onClick={()=>change(id)}>{label}</button>)}</div>
  <p className="mt-5 text-xs leading-5 text-slate-600">Registration is for organisers. Verified email and the workspace owner’s approval are required. Passwords are handled by Supabase Auth.</p></>;
}

export function ResetPasswordForm({ client, done }: { client: SupabaseClient; done: () => void }) {
  const [password, setPassword] = useState(""), [confirm, setConfirm] = useState(""), [error, setError] = useState(""), [busy,setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); if (password !== confirm) { setError("The passwords don’t match."); return; }
    setBusy(true);
    try { const {error}=await client.auth.updateUser({password}); if(error) throw error; setPassword(""); setConfirm(""); done(); }
    catch { setError("This reset link may have expired, or your password does not meet the security requirements. Request a fresh link and try again."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="space-y-4"><h2 className="font-bold">Choose a new password</h2><Field label="New password · at least 12 characters" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/><Field label="Confirm new password" type="password" autoComplete="new-password" required value={confirm} onChange={e=>setConfirm(e.target.value)}/><Feedback text={error} error/><button className="auth-action" disabled={busy}>{busy?"Saving…":"Save password"}</button></form>;
}

export function MfaChallenge({ client, done }: { client: SupabaseClient; done: () => void }) {
  const [code,setCode]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setError(""); try { const list=await client.auth.mfa.listFactors(); if(list.error) throw list.error; const factor=list.data.totp.find(f=>f.status==="verified"); if(!factor) throw Error(); const result=await client.auth.mfa.challengeAndVerify({factorId:factor.id,code}); if(result.error) throw result.error; done(); } catch {setError("The code could not be verified. Try the current code from your authenticator app.");} finally{setBusy(false);} }
  return <form onSubmit={submit} className="space-y-4"><h2 className="font-bold">Two-step verification</h2><Field label="Six-digit authenticator code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e=>setCode(e.target.value)}/><Feedback text={error} error/><button className="auth-action" disabled={busy}>{busy?"Verifying…":"Verify and continue"}</button></form>;
}

export function AccountSecurity({ client, user, close }: { client: SupabaseClient; user: User; close: () => void }) {
  const [name,setName]=useState(typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : ""),[message,setMessage]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const [enrollment,setEnrollment]=useState<{id:string;qr:string;secret:string}|null>(null),[code,setCode]=useState("");
  const [factors,setFactors]=useState<Array<{id:string;friendly_name?:string}>>([]);
  const reload=()=>client.auth.mfa.listFactors().then(r=>{if(r.error) throw r.error; setFactors(r.data.totp.filter(f=>f.status==="verified"));});
  useEffect(()=>{void reload().catch(()=>setError("Could not load security settings."));},[]);
  async function run(action:()=>Promise<void>){if(busy)return;setBusy(true);setMessage("");setError("");try{await action();}catch{setError("This change could not be completed. Sign in again and retry.");}finally{setBusy(false);}}
  return <div className="space-y-4"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">Account & security</h2><button className="auth-action" onClick={close}>Back</button></div><p className="break-all text-sm text-slate-600">{user.email}</p>
    <form onSubmit={e=>{e.preventDefault();void run(async()=>{const r=await client.auth.updateUser({data:{full_name:name.trim()}});if(r.error)throw r.error;setMessage("Your name has been updated.");});}} className="space-y-3"><Field label="Full name" autoComplete="name" required maxLength={100} value={name} onChange={e=>setName(e.target.value)}/><button className="auth-action" disabled={busy}>Save name</button></form>
    <button className="auth-action" disabled={busy} onClick={()=>{location.assign("/reset-password");}}>Change password</button>
    <div className="border-t border-teal-900/15 pt-4"><h3 className="font-semibold">Authenticator app</h3><p className="mt-1 text-sm leading-6 text-slate-600">Add a second step at login using an app such as Google Authenticator or 1Password.</p>
      {factors.length ? <p className="mt-3 font-medium text-teal-800">Two-step verification is enabled.</p> : !enrollment && <button className="auth-action mt-3" disabled={busy} onClick={()=>void run(async()=>{const list=await client.auth.mfa.listFactors();if(list.error)throw list.error;for(const f of list.data.all.filter(f=>f.status==="unverified")){const removed=await client.auth.mfa.unenroll({factorId:f.id});if(removed.error)throw removed.error;}const r=await client.auth.mfa.enroll({factorType:"totp",friendlyName:"Newsletter Studio"});if(r.error)throw r.error;setEnrollment({id:r.data.id,qr:r.data.totp.qr_code,secret:r.data.totp.secret});})}>Set up two-step verification</button>}
      {enrollment && <form className="mt-3 space-y-3" onSubmit={e=>{e.preventDefault();void run(async()=>{const r=await client.auth.mfa.challengeAndVerify({factorId:enrollment.id,code});if(r.error)throw r.error;setEnrollment(null);setCode("");await reload();setMessage("Two-step verification is now enabled.");});}}><img src={enrollment.qr} alt="Scan this setup QR code in your authenticator app" className="mx-auto h-48 w-48"/><details className="text-xs"><summary>Enter setup key manually</summary><code className="block break-all p-3">{enrollment.secret}</code></details><Field label="Code from your authenticator app" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value)}/><button className="auth-action" disabled={busy}>Verify and enable</button></form>}
      <p className="mt-3 text-xs leading-5 text-slate-600">Keep a secure backup in your authenticator app. If you lose access, the workspace owner must verify your identity before resetting your factor in Supabase.</p>
    </div><button className="auth-action" disabled={busy} onClick={()=>void run(async()=>{const r=await client.auth.signOut({scope:"others"});if(r.error)throw r.error;setMessage("Other sessions have been signed out.");})}>Sign out other devices</button><Feedback text={message}/><Feedback text={error} error/>
  </div>;
}
