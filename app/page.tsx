"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import { DashboardView } from "./dashboard-view";
import { WorkspaceControls } from "./workspace-controls";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis,
} from "recharts";
import {
  Activity, ArrowDownToLine, ArrowRight, BarChart3, Bell, BookOpen, Calendar,
  CalendarDays, Check, CheckCircle2, ChevronDown, Clock3, Copy, Download,
  ExternalLink, Eye, FileBarChart, FileText, Gauge, Image as ImageIcon,
  LayoutDashboard, Link2, Mail, MailCheck, MapPin, MessageCircle,
  MoreHorizontal, MousePointerClick, Plus, RefreshCw, Search, Send, Settings,
  SlidersHorizontal, Sparkles, Upload, UserCheck, UserPlus, Users, Workflow,
  X, Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import {
  engagementData, growthData, initialEvents, initialNewsletters,
  initialSubscribers, navItems, sources, trendData,
} from "./data";
import type {
  AutomationKey, EventItem, Newsletter, Subscriber, ViewId,
} from "./data";
import { renderDocument } from "@/lib/newsletter-renderer.mjs";
import { EditorView } from "./editor-view";

declare global {
  interface Document {
    modelContext?: {
      registerTool: (tool: {
        name: string;
        title?: string;
        description: string;
        inputSchema: Record<string, unknown>;
        annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
        execute: (input: unknown) => unknown | Promise<unknown>;
      }, options?: { signal?: AbortSignal }) => void | Promise<void>;
    };
  }
}

const chartTooltipStyle = {
  border: "1px solid #e3e7f0",
  borderRadius: 12,
  boxShadow: "0 12px 30px rgba(24, 34, 64, .1)",
  fontSize: 12,
};

function usePersistentState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState(initialValue);
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(key);
      if (saved) setValue(JSON.parse(saved));
    } catch { /* keep demo defaults */ }
    hydrated.current = true;
  }, [key]);

  useEffect(() => {
    if (!hydrated.current) return;
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}

export default function Home() {
  const [access, setAccess] = useState<"loading" | "ready" | "signed-out" | "forbidden" | "error">("loading");
  const [backendStatus, setBackendStatus] = useState<{ runtime?: string; provider?: { connected?: boolean; name?: string; listName?: string; memberCount?: number }; counts?: { campaigns?: number; subscribers?: number; events?: number } } | null>(null);
  const [activeView, setActiveView] = useState<ViewId>("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => { if (desktop.matches) setMobileNavOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  const [newsletterOpen, setNewsletterOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [previewNewsletter, setPreviewNewsletter] = useState<Newsletter | null>(null);
  const [newsletters, setNewsletters] = usePersistentState("sy-newsletters", initialNewsletters);
  const [events, setEvents] = usePersistentState("sy-events", initialEvents);
  const [subscribers, setSubscribers] = usePersistentState("sy-subscribers", initialSubscribers);
  const [automations, setAutomations] = usePersistentState<Record<AutomationKey, boolean>>(
    "sy-automations",
    { welcome: true, eventReminder: true, weekly: true, followup: false },
  );
  const csvInput = useRef<HTMLInputElement>(null);
  const [editorKey,setEditorKey]=useState(0);
  const [workspace,setWorkspace]=useState<any>(null);
  const [workspaceError,setWorkspaceError]=useState("");
  const refreshWorkspace=async()=>{const r=await fetch("/api/workspace");const d:any=await r.json();if(!r.ok)throw new Error(d.error||"Could not load workspace");setWorkspace(d);setWorkspaceError("");};
  const updateWorkspace=async(patch:any)=>{const r=await fetch("/api/workspace",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(patch)});const d:any=await r.json();if(!r.ok)throw new Error(d.error||"Could not save preferences");setWorkspace(d);};
  useEffect(()=>{if(access!=="ready")return;const refresh=()=>{void fetch("/api/events").then(r=>r.json()).then((d:any)=>{if(Array.isArray(d.events))setEvents(d.events.map((e:any)=>({...e,date:new Date(e.startsAt).toLocaleDateString(undefined,{month:"short",day:"numeric"}),time:new Date(e.startsAt).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"}),format:"In person",image:e.imageUrl||"/images/collective-meditation.jpg",rsvps:0})));}).catch(()=>undefined);void refreshWorkspace().catch(e=>setWorkspaceError(e.message));};refresh();window.addEventListener("studio:changed",refresh);window.addEventListener("focus",refresh);return()=>{window.removeEventListener("studio:changed",refresh);window.removeEventListener("focus",refresh);};},[access]);


  useEffect(() => {
    fetch("/api/status").then(async (response) => {
      const data = await response.json().catch(() => ({})) as any;
      if (response.status === 401) return setAccess("signed-out");
      if (response.status === 403) return setAccess("forbidden");
      if (!response.ok) return setAccess("error");
      setBackendStatus(data); setAccess("ready");
    }).catch(() => setAccess("error"));
  }, []);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const asRecord = (input: unknown) => {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Input must be an object");
      return input as Record<string, unknown>;
    };
    const tools = [
      context.registerTool({
        name: "read_upcoming_events",
        title: "Read upcoming events",
        description: "Return the upcoming Sahaja Yoga gatherings currently shown in this workspace.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: () => events.map(({ title, date, time, location, format, rsvps, capacity }) => ({ title, date, time, location, format, rsvps, capacity })),
      }, { signal: lifecycle.signal }),
      context.registerTool({
        name: "navigate_workspace",
        title: "Open a workspace section",
        description: "Navigate the visible app to a named section such as newsletters, events, subscribers, RSVPs, analytics, or settings.",
        inputSchema: { type: "object", properties: { view: { type: "string", enum: navItems.map((item) => item.id) } }, required: ["view"], additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: (input) => { const view = asRecord(input).view; if (typeof view !== "string" || !navItems.some((item) => item.id === view)) throw new Error("Unknown workspace view"); setActiveView(view as ViewId); return { activeView: view }; },
      }, { signal: lifecycle.signal }),
      context.registerTool({
        name: "create_newsletter_draft",
        title: "Create newsletter draft",
        description: "Create a browser-local newsletter draft and show it in the newsletters workspace.",
        inputSchema: { type: "object", properties: { title: { type: "string", minLength: 1 }, subject: { type: "string", minLength: 1 } }, required: ["title", "subject"], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        execute: (input) => { const data = asRecord(input); if (typeof data.title !== "string" || !data.title.trim() || typeof data.subject !== "string" || !data.subject.trim()) throw new Error("Title and subject are required"); const item: Newsletter = { id: `tool-${Date.now()}`, title: data.title.trim(), subject: data.subject.trim(), status: "Draft", date: "Just now", sent: 0, openRate: 0, clickRate: 0, rsvps: 0 }; setNewsletters((current) => [item, ...current]); setActiveView("newsletters"); return { id: item.id, status: item.status, title: item.title }; },
      }, { signal: lifecycle.signal }),
    ];
    void Promise.all(tools.map((item) => Promise.resolve(item))).catch(() => undefined);
    return () => lifecycle.abort();
  }, [events, setNewsletters]);

  const changeView = async (view: ViewId) => {
    try{if(activeView==="editor")await (window as any).sySaveDraft?.();}catch(e){toast.error(e instanceof Error?e.message:"Save your draft before leaving");return;}
    if(view==="editor")setEditorKey(k=>k+1);
    setActiveView(view);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addNewsletter = (item: Newsletter) => {
    setNewsletters((current) => [item, ...current]);
    setNewsletterOpen(false);
    toast.success("Newsletter draft created");
  };

  const addEvent = async (item: EventItem & {startsAt?:string}) => {
    try{const r=await fetch("/api/events",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...item,startsAt:item.startsAt,imageUrl:item.image})});const d:any=await r.json();if(!r.ok)throw new Error(d.error||"Could not save event");setEvents(current=>[{...item,id:d.event.id},...current]);setEventOpen(false);window.dispatchEvent(new Event("studio:changed"));toast.success("Event saved to your workspace");}catch(e){toast.error(e instanceof Error?e.message:"Could not save event");}
  };

  const importSubscribers = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const lines = String(reader.result).split(/\r?\n/).filter(Boolean);
      const dataLines = lines[0]?.toLowerCase().includes("email") ? lines.slice(1) : lines;
      const parsed = dataLines.map((line, index) => {
        const [name = "Friend", email = "", city = ""] = line.split(",").map((part) => part.trim());
        return { id: `csv-${Date.now()}-${index}`, name, email, city: city || "—", status: "Subscribed" as const, engagement: "Reader" as const, lastSeen: "Just imported" };
      }).filter((person) => person.email.includes("@"));
      if (!parsed.length) return toast.error("No valid email addresses found in that CSV");
      try {
        const response = await fetch("/api/subscribers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contacts: parsed.map((person) => { const [firstName, ...rest] = person.name.split(" "); return { email: person.email, firstName, lastName: rest.join(" "), city: person.city, language: "en", tags: ["CSV import"] }; }) }) });
        const data = await response.json() as any; if (!response.ok) throw new Error(data.error || "Import failed");
        setSubscribers((current) => [...parsed, ...current]); window.dispatchEvent(new Event("studio:changed")); toast.success(`${data.imported} subscriber${data.imported === 1 ? "" : "s"} imported to the local database`);
      } catch (error) { toast.error(error instanceof Error ? error.message : "Import failed"); }
    };
    reader.readAsText(file);
  };

  const exportSubscribers = () => {
    const rows = ["name,email,city,status", ...subscribers.map((s) => `${s.name},${s.email},${s.city},${s.status}`)];
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
    link.download = "sahaja-subscribers.csv";
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("Subscriber list exported");
  };

  const viewTitle = navItems.find((item) => item.id === activeView)?.label ?? "Dashboard";

  if (access !== "ready") return <AccessScreen state={access} />;

  return (
    <div className="studio-shell min-h-screen bg-transparent text-[#17213f]">
      <div className="studio-atmosphere" aria-hidden="true"><div className="studio-wave"><svg viewBox="0 0 1440 1000" preserveAspectRatio="none" focusable="false"><path d="M-100 110 C280 480 650 -80 1540 210 L1540 410 C850 160 390 680 -100 280Z" fill="white" fillOpacity=".16"/><path d="M-100 650 C400 250 820 980 1540 400 L1540 680 C900 1150 320 520 -100 910Z" fill="#087f88" fillOpacity=".12"/><g fill="none" stroke="white" strokeOpacity=".28"><path d="M-100 210 C450 660 840 -120 1540 260"/><path d="M-100 228 C450 678 840 -102 1540 278"/><path d="M-100 250 C450 700 840 -80 1540 300"/><path d="M-100 760 C450 250 1000 1040 1540 490"/><path d="M-100 777 C450 267 1000 1057 1540 507"/></g></svg></div></div>
      <Toaster position="bottom-right" richColors />
      {backendStatus?.runtime === "preview" && <div className="studio-preview-notice border-b border-blue-200 bg-blue-50 px-4 py-2 text-sm leading-6 text-blue-900 md:ml-[236px] md:py-3" role="note"><span className="md:hidden"><b>Preview.</b> Sample data · browser-saved drafts · no sending.</span><span className="hidden md:inline"><b>Organiser preview.</b> Sample events and analytics; drafts and photos stay in this browser. No emails are sent. Select the SY Europe Tour sample campaign to explore engagement charts.</span></div>}
      <input ref={csvInput} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => importSubscribers(event.target.files?.[0])} />

      <aside className="studio-sidebar fixed inset-y-0 left-0 z-50 hidden w-[236px] flex-col border-r border-[#e4e8f1] bg-white md:flex">
        <Brand />
        <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 pb-5 scrollbar-thin">
          <p className="px-3 pb-2 pt-1 text-[12px] font-bold uppercase tracking-[.12em] text-[#8b95ac]">Workspace</p>
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.id;
              return (
                <button key={item.id} data-section={item.id} aria-current={active ? "page" : undefined} onClick={() => changeView(item.id)} className={`focus-ring flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[14px] font-semibold transition ${active ? "bg-[#155bd7] text-white shadow-[0_7px_18px_rgba(21,91,215,.2)]" : "text-[#4e5b78] hover:bg-[#f0f4fb] hover:text-[#1f315d]"}`}>
                  <Icon className="size-[18px]" strokeWidth={active ? 2.3 : 1.9} />
                  {item.label}

                </button>
              );
            })}
          </div>
        </nav>
        <div className="m-3 overflow-hidden rounded-2xl bg-gradient-to-br from-[#17275e] to-[#175cdf] p-4 text-white">
          <div className="flex items-center justify-between">
            <Sparkles className="size-5 text-[#ffc46b]" />
            <Badge className="border border-white/20 bg-white/10 text-white">Studio</Badge>
          </div>
          <p className="mt-4 font-serif text-[20px] leading-tight">Self-realization is our birthright.</p>
          <p className="mt-2 text-[12px] leading-relaxed text-white/70">Create, send, and learn from every invitation.</p>
        </div>
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <nav aria-label="Mobile workspace navigation" className="mobile-workspace-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 md:hidden">
          {([{ id: "dashboard", label: "Home", Icon: LayoutDashboard }, { id: "editor", label: "Newsletter Editor", Icon: FileText }, { id: "newsletters", label: "Newsletters", Icon: Mail }] as const).map(({ id, label, Icon }) => <button key={id} type="button" aria-current={activeView === id ? "page" : undefined} className="mobile-workspace-tab" data-section={id} onClick={() => { if (activeView !== id) void changeView(id); }}><span className="mobile-workspace-icon"><Icon size={21} aria-hidden="true" /></span><span>{label}</span></button>)}
          <SheetTrigger asChild><button type="button" className="mobile-workspace-tab" data-section="more" data-active={!["dashboard", "editor", "newsletters"].includes(activeView) || mobileNavOpen ? "true" : undefined} aria-label="More workspace sections"><span className="mobile-workspace-icon"><MoreHorizontal size={21} aria-hidden="true" /></span><span>More</span></button></SheetTrigger>
        </nav>
        <SheetContent side="left" showCloseButton={false} className="studio-mobile-drawer gap-0 border-white bg-[#f6faff]">
          <div className="flex shrink-0 items-center justify-between border-b border-blue-100 pr-3">
            <Brand />
            <SheetClose asChild><Button variant="ghost" size="icon" className="size-11" aria-label="Close workspace menu"><X /></Button></SheetClose>
          </div>
          <div className="px-5 pb-3 pt-5"><SheetTitle className="text-xl">Your workspace</SheetTitle><SheetDescription className="mt-1">All your organiser tools</SheetDescription></div>
          <nav aria-label="All workspace sections" className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 pb-5">
            {navItems.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-current={activeView === id ? "page" : undefined} onClick={() => { if (activeView === id) setMobileNavOpen(false); else void changeView(id); }} className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-semibold focus-visible:outline-2 focus-visible:outline-blue-500 ${activeView === id ? "bg-[#155bd7] text-white shadow-md" : "text-[#4e5b78] hover:bg-blue-100"}`}><Icon size={20} aria-hidden="true" /><span>{label}</span>{activeView === id && <Check size={16} className="ml-auto" aria-hidden="true" />}</button>)}
          </nav>
        </SheetContent>
      </Sheet>

      <div className="md:pl-[236px]">
        <header className="studio-header sticky top-0 z-30 flex min-h-[74px] items-center gap-2 border-b border-[#e5e9f1] bg-white/90 px-3 backdrop-blur-xl md:gap-3 md:px-7">
          <div className="min-w-0 flex-1">
            <button type="button" aria-label="Sahaja Yoga Newsletter Studio home" className="block rounded md:hidden" onClick={() => { if (activeView !== "dashboard") void changeView("dashboard"); }}><BrandLogo compact /></button>
            <p className="hidden truncate text-[12px] font-bold uppercase tracking-[.1em] text-[#8b95ac] md:block">Newsletter studio</p>
            <h1 className="hidden truncate text-[21px] font-bold tracking-[-.02em] md:block">{viewTitle}</h1>
          </div>
          <Badge variant="outline" className={`hidden px-3 py-1 md:inline-flex ${backendStatus?.provider?.connected ? "border-[#bce3cf] bg-[#eaf8f0] text-[#177c51]" : "border-[#f0d6ac] bg-[#fff8eb] text-[#9b5d18]"}`}>{backendStatus?.provider?.connected ? `${backendStatus.provider.name || "Sender"} · connected` : "Sender · setup required"}</Badge>
          <WorkspaceControls workspace={workspace} update={updateWorkspace} open={id=>{localStorage.setItem("sy-edit-campaign",id);changeView("editor");}} events={()=>changeView("events")}/>

        </header>

        <main className="studio-main mx-auto max-w-[1760px] p-4 md:p-7">
          {activeView === "dashboard" && <nav aria-label="Workspace sections" className="studio-panel studio-shortcuts mb-5 p-3 md:hidden">
            <p className="mb-2 px-1 text-sm font-semibold text-[#52617d]">Workspace</p>
            <div className="grid grid-cols-3 gap-2">
              {navItems.map(({ id, label, icon: Icon }) => <button key={id} type="button" data-section={id} aria-current={activeView === id ? "page" : undefined} onClick={() => { if (activeView !== id) void changeView(id); }} className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-1 text-center text-sm font-medium leading-4 ${activeView === id ? "border-[#155bd7] bg-[#155bd7] text-white shadow-sm" : "border-[#e1eaf6] bg-white/85 text-[#405575] hover:border-blue-300 hover:bg-blue-50"}`}><Icon size={19} className="shrink-0" aria-hidden="true" /><span>{label}</span></button>)}
            </div>
          </nav>}
          {activeView === "dashboard" && <DashboardView workspace={workspace} updateWorkspace={updateWorkspace} workspaceError={workspaceError} changeView={changeView} importCsv={()=>csvInput.current?.click()} openNewsletter={(id) => { if(id)localStorage.setItem("sy-edit-campaign",id);else localStorage.removeItem("sy-edit-campaign"); changeView("editor"); }} />}
          {activeView === "editor" && <EditorView key={editorKey} />}
          {activeView === "newsletters" && <NewslettersView newsletters={newsletters} openComposer={(id) => { if (id) localStorage.setItem("sy-edit-campaign", id); else localStorage.removeItem("sy-edit-campaign"); changeView("editor"); }} preview={setPreviewNewsletter} />}
          {activeView === "events" && <EventsView events={events} openEvent={() => setEventOpen(true)} />}
          {activeView === "meditation" && <MeditationView />}
          {activeView === "content" && <ContentView />}
          {activeView === "subscribers" && <SubscribersView subscribers={subscribers} importCsv={() => csvInput.current?.click()} exportCsv={exportSubscribers} />}
          {activeView === "rsvps" && <RsvpView />}
          {activeView === "automations" && <AutomationsView values={automations} update={(key, checked) => setAutomations((old) => ({ ...old, [key]: checked }))} />}
          {activeView === "analytics" && <AnalyticsView />}
          {activeView === "reports" && <ReportsView />}
          {activeView === "settings" && <SettingsView />}
        </main>
      </div>

      <NewsletterDialog open={newsletterOpen} onOpenChange={setNewsletterOpen} onCreate={addNewsletter} />
      <EventDialog open={eventOpen} onOpenChange={setEventOpen} onCreate={addEvent} />
      <NewsletterPreview newsletter={previewNewsletter} onOpenChange={(open) => !open && setPreviewNewsletter(null)} />
    </div>
  );
}

function Brand() {
  return (
    <div className="flex h-[65.8px] items-center px-4"><BrandLogo /></div>
  );
}

function BrandLogo({ compact = false }: { compact?: boolean }) {
  return <div className={`relative shrink-0 overflow-hidden rounded bg-white ${compact ? "h-[45px] w-[109px]" : "h-[50.4px] w-[128.8px]"}`} role="img" aria-label="Sahaja Yoga Newsletter Studio"><img src="/images/dashboard-reference.jpeg" alt="" className={`pointer-events-none absolute left-0 top-0 max-w-none ${compact ? "w-[777.7px]" : "w-[896px]"}`} /></div>;
}

function AccessScreen({ state }: { state: "loading" | "signed-out" | "forbidden" | "error" }) {
  if (state === "loading") return <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] text-[#17213f]"><div className="text-center"><div className="mx-auto size-10 animate-pulse rounded-2xl bg-[#175cdf]"/><p className="mt-4 text-sm font-semibold text-[#6f7a91]">Opening Newsletter Studio…</p></div></main>;
  return <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#eaf1ff,#f7f8fb_48%)] p-6 text-[#17213f]"><div className="w-full max-w-md rounded-3xl border border-[#e0e5ef] bg-white p-8 text-center shadow-[0_24px_80px_rgba(28,43,79,.14)]"><div className="mx-auto w-fit"><BrandLogo compact /></div><h1 className="mt-5 font-serif text-3xl font-semibold">Organiser studio</h1><p className="mt-3 text-sm leading-6 text-[#6d7890]">{state === "signed-out" ? "Sign in as a Sahaja Yoga event organiser to create newsletters, manage subscribers, and view private engagement analytics." : state === "forbidden" ? "This account does not have organiser access." : "The studio is temporarily unavailable. Please try again shortly."}</p>{state === "signed-out" ? <a href="/signin-with-chatgpt?return_to=/" target="_top" className="focus-ring mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#175cdf] px-5 text-sm font-bold text-white">Organiser sign in</a> : <Button className="mt-6" onClick={() => window.location.reload()}>Try again</Button>}<p className="mt-6 text-xs text-[#8d96a9]">The dashboard and editor are for authorised event organisers only.</p></div></main>;
}

function PageHeading({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div><p className="text-[12px] font-bold uppercase tracking-[.13em] text-[#77839e]">{eyebrow}</p><h2 className="mt-1 font-serif text-[32px] font-semibold tracking-[-.035em] text-[#17213f] md:text-[38px]">{title}</h2><p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#68738d]">{description}</p></div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`studio-panel ${className}`}>{children}</section>;
}

function PanelTitle({ title, caption, action }: { title: string; caption?: string; action?: ReactNode }) {
  return <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-5"><div><h3 className="text-[15px] font-bold text-[#1d294a]">{title}</h3>{caption && <p className="mt-1 text-[12px] text-[#8490aa]">{caption}</p>}</div>{action}</div>;
}

function NewslettersView({ newsletters, openComposer, preview }: { newsletters: Newsletter[]; openComposer: (id?: string) => void; preview: (item: Newsletter) => void }) {
  const [filter, setFilter] = useState("All");
  const [search,setSearch]=useState("");
  const [stored, setStored] = useState<Array<Newsletter & { backendId?: string }>>([]);
  useEffect(() => { fetch("/api/campaigns").then((response) => response.json()).then((data: any) => { if (Array.isArray(data.campaigns)) setStored(data.campaigns.map((item: any) => ({ id: item.id, backendId: item.id, title: item.title, subject: item.subject, status: item.status === "draft" ? "Draft" : item.status === "scheduled" ? "Scheduled" : "Sent", date: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "", sent: item.recipientCount || 0, openRate: 0, clickRate: 0, rsvps: 0 }))); }).catch(() => undefined); }, []);
  const allNewsletters = stored;
  const visible = allNewsletters.filter((item) => (filter === "All" || item.status === filter)&&`${item.title} ${item.subject}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <>
      <PageHeading eyebrow="Campaigns" title="Newsletters" description="Create beautiful updates, invite your friends, and understand what brings the community together." actions={<Button onClick={() => openComposer()}><Plus /> New newsletter</Button>} />
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#e2e6ef] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={setFilter}><TabsList>{["All", "Sent", "Scheduled", "Draft"].map((item) => <TabsTrigger key={item} value={item}>{item}</TabsTrigger>)}</TabsList></Tabs>
        <div className="relative w-full sm:w-64"><Search className="absolute left-3 top-2.5 size-4 text-[#8a94aa]" /><Input placeholder="Search campaigns" value={search} onChange={e=>setSearch(e.target.value)} className="pl-9" /></div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {visible.map((item) => <Panel key={item.id} className="overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(35,48,84,.09)]"><div className={`h-1.5 ${item.status === "Sent" ? "bg-[#1aaa68]" : item.status === "Scheduled" ? "bg-[#175cdf]" : "bg-[#e3a145]"}`} /><div className="p-5"><div className="flex items-start justify-between gap-3"><Badge className={item.status === "Sent" ? "bg-[#e7f7ef] text-[#168656]" : item.status === "Scheduled" ? "bg-[#eaf0ff] text-[#175cdf]" : "bg-[#fff5e6] text-[#a66318]"}>{item.status}</Badge><Button variant="ghost" size="icon-sm"><MoreHorizontal /></Button></div><h3 className="mt-4 font-serif text-[24px] font-semibold leading-tight text-[#19254a]">{item.title}</h3><p className="mt-2 min-h-10 text-sm leading-5 text-[#737f98]">{item.subject}</p><div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-[#f6f8fb] p-3 text-center"><MiniMetric label="Sent" value={String(item.sent)} /><MiniMetric label="Open" value={`${item.openRate}%`} /><MiniMetric label="RSVP" value={String(item.rsvps)} /></div><div className="mt-4 flex items-center justify-between"><span className="text-[12px] text-[#8993a9]">{item.date}</span><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => preview(item)}><Eye /> Preview</Button>{(item as any).backendId && <Button size="sm" onClick={() => openComposer((item as any).backendId)}>Edit</Button>}</div></div></div></Panel>)}
      </div>
    </>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[11px] font-semibold uppercase tracking-wide text-[#8b95aa]">{label}</p><p className="mt-1 text-base font-bold text-[#253254]">{value}</p></div>;
}

function EventsView({ events, openEvent }: { events: EventItem[]; openEvent: () => void }) {
  return (
    <>
      <PageHeading eyebrow="Gatherings" title="Events" description="Keep local and online events in one calendar, then turn each gathering into a ready-to-send invitation." actions={<><Button variant="outline" onClick={() => toast.success("Calendar view copied") }><Copy /> Copy calendar</Button><Button onClick={openEvent}><Plus /> Add event</Button></>} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-4 md:grid-cols-2">{events.map((event) => <Panel key={event.id} className="overflow-hidden"><div className="relative h-44 overflow-hidden bg-[#1b2f68]"><img src={event.image} alt="" className="h-full w-full object-cover opacity-80 transition duration-500 hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-[#162451]/75 to-transparent" /><Badge className="absolute left-4 top-4 bg-white/90 text-[#23345f] backdrop-blur">{event.format}</Badge><div className="absolute bottom-4 left-4 rounded-xl bg-white px-3 py-2 text-center shadow-lg"><span className="block text-[10px] font-bold uppercase text-[#d66f2a]">{event.date.split(" ")[0]}</span><span className="block text-xl font-bold text-[#1c2a4d]">{event.date.split(" ")[1]}</span></div></div><div className="p-5"><h3 className="font-serif text-[23px] font-semibold text-[#1b274a]">{event.title}</h3><div className="mt-3 space-y-2 text-sm text-[#6f7a93]"><p className="flex items-center gap-2"><Clock3 className="size-4 text-[#175cdf]" />{event.time}</p><p className="flex items-center gap-2"><MapPin className="size-4 text-[#175cdf]" />{event.location}</p></div><div className="mt-5"><div className="mb-2 flex justify-between text-[12px]"><span className="font-semibold">{event.rsvps} attending</span><span className="text-[#8993a8]">{event.capacity} places</span></div><Progress value={(event.rsvps / event.capacity) * 100} className="h-2" /></div><div className="mt-5 flex gap-2"><Button variant="outline" className="flex-1" onClick={() => toast.success("Invitation copied to a new draft")}><Mail /> Invite</Button><Button className="flex-1" onClick={() => toast.success("RSVP list opened")}>Manage</Button></div></div></Panel>)}</div>
        <Panel className="h-fit p-5 lg:sticky lg:top-24"><div className="flex items-center justify-between"><h3 className="font-serif text-[25px] font-semibold">September 2026</h3><CalendarDays className="size-5 text-[#175cdf]" /></div><div className="mt-5 grid grid-cols-7 gap-1 text-center text-[12px]"><>{["M","T","W","T","F","S","S"].map((d, i) => <span key={`${d}-${i}`} className="pb-2 font-bold text-[#8b94a9]">{d}</span>)}</>{Array.from({ length: 35 }, (_, i) => { const day = i - 1; const highlighted = [14,18,26].includes(day); return <button key={i} className={`aspect-square rounded-lg text-[13px] ${day < 1 || day > 30 ? "text-transparent" : highlighted ? "bg-[#175cdf] font-bold text-white" : day === 10 ? "border border-[#e4ad67] bg-[#fff8ed] font-bold text-[#9b5e1f]" : "hover:bg-[#f0f3f8]"}`}>{day > 0 && day <= 30 ? day : "·"}</button>; })}</div><div className="mt-6 rounded-xl bg-[#f1f5ff] p-4"><p className="text-[12px] font-bold uppercase tracking-wide text-[#6880b9]">Planning note</p><p className="mt-2 text-sm leading-6 text-[#455471]">The next invitation is scheduled for Sunday, one day before the Ulm weekly meditation.</p></div></Panel>
      </div>
    </>
  );
}

function MeditationView() {
  const [running, setRunning] = useState(false);
  const [minutes, setMinutes] = useState(10);
  return (
    <>
      <PageHeading eyebrow="Practice" title="Weekly meditation" description="A calm, reusable session plan for facilitators—before, during, and after the collective." actions={<Button onClick={() => setRunning((value) => !value)}>{running ? <><X /> End session</> : <><Zap /> Start facilitator mode</>}</Button>} />
      <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <div className="relative min-h-[480px] overflow-hidden rounded-3xl bg-[#17275d] text-white"><img src="/images/collective-meditation.jpg" alt="A collective Sahaja Yoga meditation class" className="absolute inset-0 h-full w-full object-cover opacity-30" /><div className="absolute inset-0 bg-gradient-to-tr from-[#111d46] via-[#17275d]/90 to-[#2e5ca3]/55" /><div className="relative flex min-h-[480px] flex-col justify-between p-6 md:p-9"><div><Badge className="border border-white/20 bg-white/10 text-white">Monday · 18:00–20:00 · Ulm</Badge><h2 className="mt-5 max-w-xl font-serif text-[42px] font-semibold leading-[1.02] md:text-[58px]">Arrive. Settle. Let the silence do the rest.</h2><p className="mt-5 max-w-lg text-[15px] leading-7 text-white/72">A gentle two-hour arc for welcoming newcomers and deepening the collective experience.</p></div><div className="grid gap-3 sm:grid-cols-4">{[["18:00","Welcome"],["18:15","Introduction"],["18:35",`${minutes}-min meditation`],["19:10","Questions & tea"]].map(([time,label], index) => <button key={time} onClick={() => index === 2 && setMinutes(minutes === 10 ? 15 : 10)} className={`focus-ring rounded-2xl p-4 text-left backdrop-blur ${running && index === 2 ? "bg-[#f0a94b] text-[#382006]" : "bg-white/10"}`}><span className="text-[11px] font-bold uppercase tracking-wide opacity-65">{time}</span><span className="mt-2 block text-sm font-bold">{label}</span></button>)}</div></div></div>
        <div className="space-y-5"><Panel className="p-5"><h3 className="font-serif text-[25px] font-semibold">Facilitator checklist</h3><div className="mt-4 space-y-3">{["Prepare a clean, quiet space", "Welcome newcomers without pressure", "Keep the introduction simple", "Allow time for the experience", "Share free follow-up resources"].map((item, index) => <label key={item} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e5e9f1] p-3 hover:bg-[#f8f9fc]"><input type="checkbox" defaultChecked={index < 2} className="mt-0.5 size-4 accent-[#175cdf]" /><span className="text-sm font-medium text-[#46536f]">{item}</span></label>)}</div></Panel><Panel className="p-5"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-[#fff1dd] text-[#c56f1d]"><MessageCircle className="size-5" /></div><div><h3 className="font-bold">Newcomer follow-up</h3><p className="text-[12px] text-[#7e899f]">Send the morning after the session</p></div></div><Textarea className="mt-4 min-h-28" defaultValue="Thank you for joining us yesterday. If you would like to continue, here is a free ten-minute guided meditation and details of next Monday's session." /><Button className="mt-3 w-full" variant="outline" onClick={() => toast.success("Follow-up saved as a template")}><Check /> Save template</Button></Panel></div>
      </div>
    </>
  );
}

function ContentView() {
  const [query, setQuery] = useState("");
  const visible = sources.filter((item) => `${item.title} ${item.description} ${item.source}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <>
      <PageHeading eyebrow="Trusted material" title="Content library" description="Share concise introductions and free practices drawn from official Sahaja Yoga and We Meditate resources." actions={<Button variant="outline" onClick={() => toast.success("Your saved templates are up to date")}><RefreshCw /> Refresh</Button>} />
      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-[#e2e6ef] bg-white p-3"><Search className="ml-1 size-5 text-[#8791a6]" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search meditations, articles, or class resources" className="border-0 shadow-none focus-visible:ring-0" /><Button variant="outline"><SlidersHorizontal /> Filter</Button></div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{visible.map((item, index) => <Panel key={item.title} className={`overflow-hidden ${index === 0 ? "md:col-span-2 xl:col-span-1" : ""}`}><div className="relative h-48 overflow-hidden bg-[#182b66]"><img src={item.image} alt="" className={`h-full w-full ${item.image.includes("lotus-water") ? "object-contain p-12" : "object-cover"}`} /><Badge className="absolute left-4 top-4 bg-white/90 text-[#263454]">{item.kind}</Badge></div><div className="p-5"><p className="text-[11px] font-bold uppercase tracking-[.11em] text-[#db7d2b]">{item.source}</p><h3 className="mt-2 font-serif text-[25px] font-semibold leading-tight">{item.title}</h3><p className="mt-3 min-h-[72px] text-sm leading-6 text-[#6f7a92]">{item.description}</p><div className="mt-4 flex gap-2"><Button className="flex-1" variant="outline" onClick={() => toast.success("Added to the current newsletter draft")}><Plus /> Add to draft</Button><Button size="icon" asChild><a href={item.url} target="_blank" rel="noreferrer" aria-label={`Open ${item.title}`}><ExternalLink /></a></Button></div></div></Panel>)}</div>
      <Panel className="mt-5 flex flex-col items-start gap-4 p-5 md:flex-row md:items-center"><div className="flex size-11 items-center justify-center rounded-xl bg-[#edf3ff] text-[#175cdf]"><BookOpen className="size-5" /></div><div className="flex-1"><h3 className="font-bold">Approved organiser sources</h3><p className="mt-1 text-sm leading-6 text-[#6d7992]">Use only approved international Sahaja Yoga material and images your team is authorised to distribute.</p></div><Button variant="outline" asChild><a href="https://shrimataji.org/" target="_blank" rel="noreferrer">Official archive <ExternalLink /></a></Button></Panel>
    </>
  );
}

function SubscribersView({ subscribers, importCsv, exportCsv }: { subscribers: Subscriber[]; importCsv: () => void; exportCsv: () => void }) {
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState("All");
  const filtered = subscribers.filter((person) => (segment === "All" || person.engagement === segment) && `${person.name} ${person.email} ${person.city}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <>
      <PageHeading eyebrow="Community" title="Subscribers" description="Keep a respectful, clear record of who has chosen to receive updates." actions={<><Button variant="outline" onClick={exportCsv}><Download /> Export CSV</Button><Button onClick={importCsv}><Upload /> Import CSV</Button></>} />
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{([["Total subscribers", subscribers.length + 1194, "+342 this year", Users, "#175cdf"],["Active", "1,024", "85.3% of total", Activity, "#1aa568"],["New this month", "182", "+12.4%", UserPlus, "#8055c9"],["Unsubscribed", "74", "6.2%", Mail, "#d9636e"]] as Array<[string, string | number, string, LucideIcon, string]>).map(([label,value,note,Icon,color]) => <Panel key={label} className="p-5"><div className="flex items-center justify-between"><span className="text-[12px] font-bold uppercase tracking-wide text-[#7c879f]">{label}</span><Icon className="size-5" style={{ color }} /></div><p className="mt-3 text-[30px] font-bold tracking-[-.03em]">{String(value)}</p><p className="mt-1 text-[12px] font-semibold text-[#1b9d65]">{note}</p></Panel>)}</div>
      <Panel className="overflow-hidden"><div className="flex flex-col gap-3 border-b border-[#e5e8ef] p-4 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-2.5 size-4 text-[#8791a6]" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, or city" className="pl-9" /></div><Select value={segment} onValueChange={setSegment}><SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger><SelectContent>{["All","High","Interested","Reader","Low"].map((item) => <SelectItem key={item} value={item}>{item === "All" ? "All segments" : item}</SelectItem>)}</SelectContent></Select></div><Table><TableHeader><TableRow><TableHead className="pl-5">Subscriber</TableHead><TableHead>City</TableHead><TableHead>Engagement</TableHead><TableHead>Last activity</TableHead><TableHead className="pr-5 text-right">Status</TableHead></TableRow></TableHeader><TableBody>{filtered.map((person) => <TableRow key={person.id}><TableCell className="pl-5"><div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-full bg-[#edf2ff] text-[12px] font-bold text-[#2458b7]">{person.name.split(" ").map((part) => part[0]).slice(0,2).join("")}</div><div><p className="font-semibold text-[#283552]">{person.name}</p><p className="text-[12px] text-[#8791a6]">{person.email}</p></div></div></TableCell><TableCell>{person.city}</TableCell><TableCell><Badge variant="secondary" className={person.engagement === "High" ? "bg-[#e7f7ef] text-[#168656]" : person.engagement === "Low" ? "bg-[#fff4e5] text-[#9a611f]" : "bg-[#edf2ff] text-[#285ab8]"}>{person.engagement}</Badge></TableCell><TableCell className="text-[#768198]">{person.lastSeen}</TableCell><TableCell className="pr-5 text-right"><span className={person.status === "Subscribed" ? "text-[#178758]" : "text-[#a06168]"}>{person.status}</span></TableCell></TableRow>)}</TableBody></Table></Panel>
    </>
  );
}

function RsvpView() {
  const people = [
    ["Anna Keller","Weekly meditation · Ulm","Yes","2 guests"], ["Rahul Mehta","Meditate together online","Yes","Just me"],
    ["Jonas Weber","Music & meditation evening","Maybe","Just me"], ["Maria Rossi","Weekly meditation · Ulm","Yes","1 guest"],
    ["Sofia Marin","Music & meditation evening","Awaiting","—"],
  ];
  return (
    <>
      <PageHeading eyebrow="Responses" title="RSVPs" description="See who is coming, who needs a gentle reminder, and whether an event is close to capacity." actions={<Button variant="outline" onClick={() => toast.success("Reminder draft created for 38 people")}><Bell /> Draft reminder</Button>} />
      <div className="mb-5 grid gap-4 md:grid-cols-4">{[["Total RSVPs","281","+12 today"],["Confirmed","243","86.5%"],["Maybe","38","13.5%"],["Expected guests","249","Across 3 events"]].map(([label,value,note], index) => <Panel key={label} className={`p-5 ${index === 1 ? "bg-gradient-to-br from-[#1caf70] to-[#15955d] text-white" : ""}`}><p className={`text-[12px] font-bold uppercase tracking-wide ${index === 1 ? "text-white/70" : "text-[#7c879e]"}`}>{label}</p><p className="mt-2 text-[31px] font-bold">{value}</p><p className={`mt-1 text-[12px] ${index === 1 ? "text-white/78" : "text-[#7a859b]"}`}>{note}</p></Panel>)}</div>
      <Panel className="overflow-hidden"><PanelTitle title="Latest responses" caption="Demo responses received during the current campaign" action={<Button variant="outline" size="sm"><ArrowDownToLine /> Download</Button>} /><Table><TableHeader><TableRow><TableHead className="pl-5">Name</TableHead><TableHead>Event</TableHead><TableHead>Response</TableHead><TableHead className="pr-5 text-right">Party</TableHead></TableRow></TableHeader><TableBody>{people.map(([name,event,response,party]) => <TableRow key={name}><TableCell className="pl-5 font-semibold">{name}</TableCell><TableCell>{event}</TableCell><TableCell><Badge className={response === "Yes" ? "bg-[#e6f7ed] text-[#168656]" : response === "Maybe" ? "bg-[#fff3df] text-[#9b611a]" : "bg-[#f0f2f6] text-[#707b90]"}>{response}</Badge></TableCell><TableCell className="pr-5 text-right text-[#707b91]">{party}</TableCell></TableRow>)}</TableBody></Table></Panel>
    </>
  );
}

function AutomationsView({ values, update }: { values: Record<AutomationKey, boolean>; update: (key: AutomationKey, checked: boolean) => void }) {
  const flows: { key: AutomationKey; title: string; description: string; timing: string; icon: typeof Zap }[] = [
    { key: "welcome", title: "Warm welcome", description: "Send a short welcome and a first guided meditation to new subscribers.", timing: "Immediately after signup", icon: Sparkles },
    { key: "eventReminder", title: "Event reminder", description: "Remind confirmed guests with time, location, and a simple preparation note.", timing: "24 hours before an event", icon: Bell },
    { key: "weekly", title: "Weekly meditation", description: "Share the next collective session with the active community segment.", timing: "Every Sunday at 18:00", icon: CalendarDays },
    { key: "followup", title: "Gentle follow-up", description: "Send one kind follow-up to friends who opened but did not respond.", timing: "3 days after invitation", icon: MessageCircle },
  ];
  return (
    <>
      <PageHeading eyebrow="Careful consistency" title="Automations" description="Handle recurring communication without losing the warmth of a personal invitation." actions={<Button variant="outline" onClick={() => toast.success("Automation activity refreshed")}><RefreshCw /> Refresh activity</Button>} />
      <div className="grid gap-4 xl:grid-cols-2">{flows.map((flow) => { const Icon = flow.icon; return <Panel key={flow.key} className="p-5"><div className="flex items-start gap-4"><div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${values[flow.key] ? "bg-[#e8f8ef] text-[#178759]" : "bg-[#f0f2f6] text-[#7d879b]"}`}><Icon className="size-5" /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><h3 className="font-serif text-[23px] font-semibold">{flow.title}</h3><Switch checked={values[flow.key]} onCheckedChange={(checked) => { update(flow.key, checked); toast.success(`${flow.title} ${checked ? "enabled" : "paused"}`); }} /></div><p className="mt-2 text-sm leading-6 text-[#6e7992]">{flow.description}</p><div className="mt-4 flex items-center gap-2 rounded-xl bg-[#f6f8fb] px-3 py-2 text-[12px] font-semibold text-[#63708c]"><Clock3 className="size-4 text-[#175cdf]" />{flow.timing}</div></div></div></Panel>; })}</div>
      <Panel className="mt-5 overflow-hidden"><PanelTitle title="Recent automation activity" caption="No messages are actually sent in this demo" /><div className="divide-y divide-[#e8ebf2]">{[["Event reminder","74 contacts prepared","Today, 09:02"],["Warm welcome","6 new subscribers","Yesterday, 17:14"],["Weekly meditation","1,024 contacts prepared","Sunday, 18:00"]].map(([title,note,time]) => <div key={title} className="flex items-center gap-4 px-5 py-4"><span className="flex size-9 items-center justify-center rounded-full bg-[#e8f8ef] text-[#178759]"><Check className="size-4" /></span><div className="flex-1"><p className="text-sm font-bold">{title}</p><p className="text-[12px] text-[#7c879e]">{note}</p></div><span className="text-[12px] text-[#8a94a8]">{time}</span></div>)}</div></Panel>
    </>
  );
}

function AnalyticsView() {
  return (
    <>
      <PageHeading eyebrow="Signals, not vanity" title="Analytics" description="See which invitations help people take the next meaningful step—from reading to joining." actions={<Button variant="outline"><Calendar /> Last 6 months <ChevronDown /></Button>} />
      <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <Panel><PanelTitle title="Audience growth" caption="Total and active subscribers" /><div className="h-[340px] px-3 pb-4"><ResponsiveContainer width="100%" height="100%"><AreaChart data={growthData} margin={{ left: -5, right: 15, top: 10 }}><defs><linearGradient id="audienceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#175cdf" stopOpacity={.25}/><stop offset="100%" stopColor="#175cdf" stopOpacity={.01}/></linearGradient></defs><CartesianGrid vertical={false} stroke="#e9edf4"/><XAxis dataKey="month" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false}/><ChartTooltip contentStyle={chartTooltipStyle}/><Area type="monotone" dataKey="total" stroke="#175cdf" fill="url(#audienceFill)" strokeWidth={3}/><Line type="monotone" dataKey="active" stroke="#1aa568" strokeWidth={2}/></AreaChart></ResponsiveContainer></div></Panel>
        <Panel><PanelTitle title="Healthy benchmarks" caption="Current campaign" /><div className="space-y-5 px-5 pb-5">{[["Delivery rate",96,95],["Open rate",55.6,42],["Click rate",32.1,18],["RSVP conversion",24.4,15]].map(([label,value,benchmark]) => <div key={String(label)}><div className="mb-2 flex justify-between text-sm"><span className="font-semibold">{label}</span><span className="font-bold text-[#168656]">{value}%</span></div><Progress value={Number(value)} /><p className="mt-1.5 text-[11px] text-[#8791a6]">Reference line: {benchmark}%</p></div>)}</div></Panel>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2"><Panel><PanelTitle title="Clicks by day" caption="Where attention peaks" /><div className="h-64 px-3 pb-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{d:"Mon",v:38},{d:"Tue",v:55},{d:"Wed",v:81},{d:"Thu",v:64},{d:"Fri",v:49},{d:"Sat",v:37},{d:"Sun",v:71}]}><CartesianGrid vertical={false} stroke="#e9edf4"/><XAxis dataKey="d" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false}/><ChartTooltip contentStyle={chartTooltipStyle}/><Bar dataKey="v" fill="#175cdf" radius={[8,8,0,0]}/></BarChart></ResponsiveContainer></div></Panel><Panel className="p-6"><p className="text-[12px] font-bold uppercase tracking-[.12em] text-[#db7b28]">Plain-language insight</p><h3 className="mt-3 font-serif text-[30px] font-semibold leading-tight">Your community responds to concrete invitations.</h3><p className="mt-4 text-sm leading-7 text-[#69758f]">Event details and reservation links receive 2.8× more clicks than general information. Lead with the gathering, then offer one short meditation resource.</p><div className="mt-6 rounded-2xl bg-[#edf3ff] p-4"><p className="text-sm font-bold text-[#2458b7]">Suggested next test</p><p className="mt-1 text-[13px] leading-6 text-[#5e6d8b]">Try one clear RSVP button above the first paragraph in the next invitation.</p></div></Panel></div>
    </>
  );
}

function ReportsView() {
  const reports = [["Monthly community pulse","Audience, engagement, and RSVP trends","PDF · Sep 2026"],["Campaign performance","Five most recent newsletters","CSV · Sep 2026"],["Event attendance","Registrations and expected guests","CSV · Sep 2026"],["Consent & subscription log","Signup and unsubscribe status","CSV · Sep 2026"]];
  return <><PageHeading eyebrow="Shareable summaries" title="Reports" description="Turn the important numbers into simple updates for organizers and volunteers." actions={<Button onClick={() => toast.success("Report bundle prepared in demo mode")}><FileBarChart /> Create report</Button>} /><div className="grid gap-4 md:grid-cols-2">{reports.map(([title,description,meta], index) => <Panel key={title} className="p-5"><div className="flex items-start gap-4"><div className={`flex size-12 items-center justify-center rounded-xl ${index === 0 ? "bg-[#e8f8ef] text-[#168656]" : "bg-[#edf2ff] text-[#175cdf]"}`}><FileText className="size-5" /></div><div className="flex-1"><h3 className="font-serif text-[22px] font-semibold">{title}</h3><p className="mt-1 text-sm text-[#6f7b94]">{description}</p><p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-[#929bad]">{meta}</p></div><Button variant="outline" size="icon" onClick={() => toast.success(`${title} downloaded`)}><Download /></Button></div></Panel>)}</div></>;
}

function SettingsView() {
  const [provider, setProvider] = useState<{ connected?: boolean; listName?: string; memberCount?: number; error?: string } | null>(null);
  const [runtime, setRuntime] = useState<"desktop" | "web">("web");
  const [senderGroups,setSenderGroups]=useState<Array<{id:string;title:string}>>([]);
  const [groupsLoading,setGroupsLoading]=useState(false);
  const loadSenderGroups=async()=>{setGroupsLoading(true);try{const r=await fetch("/api/local/sender-groups");const d:any=await r.json();if(!r.ok)throw new Error(d.error||"Could not load groups");setSenderGroups(d.groups);toast.success(`${d.groups.length} Sender groups loaded`);}catch(e){toast.error(e instanceof Error?e.message:"Could not load groups");}finally{setGroupsLoading(false);}};
  const [delivery, setDelivery] = useState({ apiToken: "", hasApiToken: false, senderGroupId: "", fromName: "Sahaja Yoga Newsletter", replyTo: "", workspace: "" });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetch("/api/status").then((response) => response.json()).then(async (data: any) => {
      setProvider(data.provider || null);
      if (data.runtime === "desktop") {
        setRuntime("desktop");
        const response = await fetch("/api/local/settings");
        const settings = await response.json() as any;
        if (response.ok) setDelivery((current) => ({ ...current, ...settings, apiToken: "" }));
      }
    }).catch(() => undefined);
  }, []);

  const saveSender = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/local/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(delivery) });
      const data = await response.json() as any;
      if (!response.ok) throw new Error(data.error || "Could not save Sender settings");
      setProvider(data.provider || null);
      setDelivery((current) => ({ ...current, apiToken: "", hasApiToken: current.hasApiToken || Boolean(current.apiToken) }));
      toast.success(data.provider?.connected ? "Sender connected securely" : "Settings saved—check the token and group ID");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save Sender settings"); }
    finally { setSaving(false); }
  };

  const syncSender = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/subscribers/sync-sender", { method: "POST" });
      const data = await response.json() as any;
      if (!response.ok) throw new Error(data.error || "Sync failed");
      toast.success(`${data.synced} contacts synchronized${data.failed ? ` · ${data.failed} need attention` : ""}`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Sync failed"); }
    finally { setSyncing(false); }
  };

  return (
    <>
      <PageHeading eyebrow="Workspace" title="Settings" description="Connect free Sender delivery, protect organiser credentials, and control the local workspace." /><Panel className="mb-5 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-bold">Set up free newsletter delivery</h3><p className="mt-1 text-sm text-slate-500">Up to 2,500 subscribers and 15,000 emails/month. One Sender seat; Sender branding remains. Checked September 2026.</p></div><a href="https://auth.sender.net/register?client_id=21&redirect_uri=https%3A%2F%2Fapp.sender.net%2F&response_type=code&scope=scope" target="_blank" rel="noreferrer" className="rounded-xl bg-[#175cdf] px-4 py-3 text-sm font-bold text-white">Create free Sender account</a></div><ol className="mt-4 grid list-inside list-decimal gap-3 text-sm leading-6 text-slate-600 md:grid-cols-2"><li>Register, verify your email and complete the organisation profile.</li><li>Add your sending domain under Account settings → Domains and verify its DNS records.</li><li>Create a Sahaja Yoga Newsletter group and import subscribed contacts.</li><li>Create an API token in Sender Settings. Save it below in the desktop app, load your group and send a test first.</li></ol><p className="mt-4 text-xs text-slate-500">Choose one organiser to manage dispatch. Your five studio users do not require five Sender logins. <a className="text-blue-600 underline" href="https://www.sender.net/pricing/" target="_blank" rel="noreferrer">Plan details</a> · <a className="text-blue-600 underline" href="https://www.sender.net/help/deliverability-compliance/spf-dkim-dmarc-setup/" target="_blank" rel="noreferrer">Domain setup guide</a></p></Panel>
      <div className="grid gap-5 xl:grid-cols-[1fr_.7fr]">
        <div className="space-y-5">
          <Panel className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div><h3 className="font-serif text-[25px] font-semibold">Sender delivery</h3><p className="mt-1 text-sm text-[#6f7a91]">Free campaign sending with automatic unsubscribe and engagement reporting.</p></div>
              <Badge className={provider?.connected ? "bg-[#e7f7ef] text-[#168656]" : "bg-[#fff3df] text-[#9b611a]"}>{provider?.connected ? "Connected" : runtime === "desktop" ? "Setup required" : "Desktop only"}</Badge>
            </div>
            {runtime === "desktop" ? <>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><Label htmlFor="sender-token">API access token</Label><Input id="sender-token" type="password" className="mt-2" value={delivery.apiToken} onChange={(event) => setDelivery((current) => ({ ...current, apiToken: event.target.value }))} placeholder={delivery.hasApiToken ? "Saved securely · enter only to replace" : "Paste token from Sender settings"} /></div>
                <div><Label htmlFor="sender-group">Subscriber group</Label>{senderGroups.length?<Select value={delivery.senderGroupId} onValueChange={v=>setDelivery(c=>({...c,senderGroupId:v}))}><SelectTrigger id="sender-group" className="mt-2"><SelectValue placeholder="Choose your newsletter group"/></SelectTrigger><SelectContent>{senderGroups.map(g=><SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>)}</SelectContent></Select>:<Input id="sender-group" className="mt-2" value={delivery.senderGroupId} onChange={(event)=>setDelivery(c=>({...c,senderGroupId:event.target.value}))} placeholder="Save token, then load groups"/>}<Button type="button" variant="ghost" size="sm" className="mt-2" disabled={groupsLoading||!delivery.hasApiToken} onClick={loadSenderGroups}>{groupsLoading?"Loading…":"Load groups from Sender"}</Button></div>
                <div><Label htmlFor="sender-from">From name</Label><Input id="sender-from" className="mt-2" value={delivery.fromName} onChange={(event) => setDelivery((current) => ({ ...current, fromName: event.target.value }))} /></div>
                <div className="sm:col-span-2"><Label htmlFor="sender-reply">Verified sender / reply-to email</Label><Input id="sender-reply" type="email" className="mt-2" value={delivery.replyTo} onChange={(event) => setDelivery((current) => ({ ...current, replyTo: event.target.value }))} placeholder="newsletter@your-domain.org" /></div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button onClick={saveSender} disabled={saving}><Check />{saving ? "Checking connection…" : "Save & test connection"}</Button>
                <Button variant="outline" onClick={syncSender} disabled={!provider?.connected || syncing}><RefreshCw />{syncing ? "Synchronizing slowly…" : "Sync local subscribers"}</Button>
              </div>
              {provider?.connected && <div className="mt-5 rounded-2xl bg-[#edf8f2] p-4"><p className="font-bold text-[#176d49]">{provider.listName}</p><p className="mt-1 text-sm text-[#4f7665]">{provider.memberCount?.toLocaleString()} active contacts · free allowance up to 2,500 contacts and 15,000 emails/month</p></div>}
              <p className="mt-4 rounded-xl bg-[#f1f5ff] p-3 text-[12px] leading-5 text-[#536587]">Contact sync is intentionally limited to one API request at a time with automatic backoff. A 2,000-contact sync may take 10–30 minutes. Campaign delivery is queued by Sender and may continue after this app is closed.</p>
            </> : <div className="mt-5 rounded-2xl bg-[#eef3ff] p-4 text-sm leading-6 text-[#4f6082]"><p className="font-bold text-[#2458b7]">The web version is a visual preview</p><p className="mt-1">Sender credentials and real subscriber data are entered only in the installed Windows app. No API token is stored in this hosted preview.</p></div>}
          </Panel>
          <Panel className="p-5">
            <h3 className="font-serif text-[25px] font-semibold">Local project workspace</h3>
            <p className="mt-2 text-sm leading-6 text-[#6f7a91]">The Windows app automatically creates Database, Media, Projects, Exports, and Backups folders inside Documents.</p>
            {runtime === "desktop" && <><div className="mt-4 break-all rounded-xl bg-[#f6f8fb] p-3 font-mono text-xs text-[#56627b]">{delivery.workspace}</div><Button className="mt-4" variant="outline" onClick={() => fetch("/api/local/open-folder", { method: "POST" })}><Settings /> Open workspace folder</Button></>}
          </Panel>
          <Panel className="p-5"><h3 className="font-serif text-[25px] font-semibold">Privacy & consent</h3><div className="mt-4 space-y-4">{[["Consent required","Import only contacts who agreed to receive the newsletter"],["Automatic unsubscribe","Sender places a working opt-out link in every campaign"],["Respectful analytics","Use opens and clicks for aggregate planning, not intrusive profiling"]].map(([title,description]) => <div key={title} className="flex items-start gap-4 rounded-xl border border-[#e5e9f1] p-4"><Switch defaultChecked /><div><p className="text-sm font-bold">{title}</p><p className="mt-1 text-[12px] leading-5 text-[#77829a]">{description}</p></div></div>)}</div></Panel>
        </div>
        <div className="space-y-5">
          <Panel className="p-5"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-[#fff1dd] text-[#c36b1a]"><ImageIcon className="size-5" /></div><div><h3 className="font-bold">Approved content sources</h3><p className="text-[12px] text-[#7e899f]">International and official archive material only</p></div></div><div className="mt-5 space-y-4"><SourceLink label="We Meditate" href="https://wemeditate.com/" /><SourceLink label="Shri Mataji — official archive" href="https://shrimataji.org/" /></div><p className="mt-5 rounded-xl bg-[#fff8eb] p-3 text-[12px] leading-5 text-[#765122]">Keep the official logo and orange Shakti Yantra unchanged, and confirm image permission before publishing.</p></Panel>
          <Panel className="p-5"><Badge className="bg-[#eaf0ff] text-[#175cdf]">Organiser-only workspace</Badge><h3 className="mt-4 font-serif text-[27px] font-semibold">Private studio. Public recipient actions.</h3><p className="mt-3 text-sm leading-6 text-[#6d7891]">Only authorised Sahaja Yoga event organisers can enter the dashboard and editor. Attendees and subscribers interact only with newsletters, unsubscribe preferences, and RSVP links.</p></Panel>
        </div>
      </div>
    </>
  );
}

function SourceLink({ label, href }: { label: string; href: string }) {
  return <a href={href} target="_blank" rel="noreferrer" className="focus-ring flex items-center justify-between rounded-xl border border-[#e5e9f1] px-4 py-3 text-sm font-semibold text-[#34415f] hover:border-[#b9c9eb] hover:bg-[#f7f9fe]"><span>{label}</span><ExternalLink className="size-4 text-[#175cdf]" /></a>;
}

function NewsletterDialog({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (open: boolean) => void; onCreate: (item: Newsletter) => void }) {
  const [title, setTitle] = useState("A moment of silence, together");
  const [subject, setSubject] = useState("Join our next free collective meditation");
  const [content, setContent] = useState("Dear friends,\n\nWe warmly invite you to pause, turn your attention within, and enjoy a collective meditation with us. Everyone is welcome, and the session is always free.");
  const [status, setStatus] = useState<"Draft" | "Scheduled">("Draft");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onCreate({ id: `n-${Date.now()}`, title: title.trim(), subject: subject.trim(), status, date: status === "Scheduled" ? "13 Sep 2026" : "Just now", sent: 0, openRate: 0, clickRate: 0, rsvps: 0 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle className="font-serif text-[28px]">Create a newsletter</DialogTitle><DialogDescription>Start with a warm invitation. In this demo, saving creates a browser-local draft.</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="newsletter-title">Campaign title</Label><Input id="newsletter-title" className="mt-2" value={title} onChange={(e) => setTitle(e.target.value)} required /></div><div><Label htmlFor="newsletter-status">Save as</Label><Select value={status} onValueChange={(value) => setStatus(value as "Draft" | "Scheduled")}><SelectTrigger id="newsletter-status" className="mt-2 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Draft">Draft</SelectItem><SelectItem value="Scheduled">Scheduled for Sunday</SelectItem></SelectContent></Select></div></div><div><Label htmlFor="newsletter-subject">Email subject</Label><Input id="newsletter-subject" className="mt-2" value={subject} onChange={(e) => setSubject(e.target.value)} required /></div><div><Label htmlFor="newsletter-body">Message</Label><Textarea id="newsletter-body" className="mt-2 min-h-44 leading-6" value={content} onChange={(e) => setContent(e.target.value)} /></div><div className="rounded-2xl border border-[#e0e6f1] bg-[#f7f9fd] p-4"><p className="text-[12px] font-bold uppercase tracking-wide text-[#74809a]">Suggested building blocks</p><div className="mt-3 flex flex-wrap gap-2">{["Event details","RSVP button","10-minute meditation","Directions","Contact"].map((block) => <Button key={block} type="button" variant="outline" size="sm" onClick={() => { setContent((old) => `${old}\n\n${block}: Add details here.`); toast.success(`${block} added`); }}><Plus />{block}</Button>)}</div></div><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={!title.trim() || !subject.trim()}><Check /> Save {status.toLowerCase()}</Button></DialogFooter></form></DialogContent></Dialog>
  );
}

function EventDialog({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (open: boolean) => void; onCreate: (item: EventItem & {startsAt?:string}) => void }) {
  const [title, setTitle] = useState("Collective meditation");
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [time, setTime] = useState("18:00");
  const [location, setLocation] = useState("Ulm");
  const [format, setFormat] = useState<EventItem["format"]>("In person");
  const [imageUrl,setImageUrl]=useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onCreate({ id: `e-${Date.now()}`, startsAt:new Date(`${date}T${time}`).toISOString(), title, date, time, location, format, rsvps: 0, capacity: 30, image: imageUrl });
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle className="font-serif text-[28px]">Add an event</DialogTitle><DialogDescription>Create an event card that can be inserted into a newsletter.</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4"><div><Label htmlFor="event-title">Event title</Label><Input id="event-title" className="mt-2" value={title} onChange={(e) => setTitle(e.target.value)} required /></div><div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="event-date">Date</Label><Input type="date" id="event-date" className="mt-2" value={date} onChange={(e) => setDate(e.target.value)} required /></div><div><Label htmlFor="event-time">Time</Label><Input type="time" id="event-time" className="mt-2" value={time} onChange={(e) => setTime(e.target.value)} required /></div></div><div><Label htmlFor="event-location">Location or meeting link</Label><Input id="event-location" className="mt-2" value={location} onChange={(e) => setLocation(e.target.value)} required /></div><div><Label htmlFor="event-photo">Event photo URL</Label><Input type="url" id="event-photo" className="mb-4 mt-2" value={imageUrl} onChange={e=>setImageUrl(e.target.value)} placeholder="https://…"/><Label htmlFor="event-format">Format</Label><Select value={format} onValueChange={(value) => setFormat(value as EventItem["format"])}><SelectTrigger id="event-format" className="mt-2 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="In person">In person</SelectItem><SelectItem value="Online">Online</SelectItem><SelectItem value="Hybrid">Hybrid</SelectItem></SelectContent></Select></div><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit"><Plus /> Add event</Button></DialogFooter></form></DialogContent></Dialog>;
}

function NewsletterPreview({newsletter,onOpenChange}:{newsletter:Newsletter|null;onOpenChange:(open:boolean)=>void}){
 const [html,setHtml]=useState(""),[error,setError]=useState("");
 useEffect(()=>{setHtml("");setError("");if(!newsletter)return;const abort=new AbortController();fetch(`/api/campaigns/${newsletter.id}`,{signal:abort.signal}).then(async r=>{const d:any=await r.json();if(!r.ok)throw new Error(d.error||"Could not load newsletter");setHtml(renderDocument(d.campaign).html);}).catch(e=>{if(e.name!=="AbortError")setError(e.message);});return()=>abort.abort();},[newsletter?.id]);
 return <Dialog open={!!newsletter} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-3xl"><DialogHeader><DialogTitle>{newsletter?.title}</DialogTitle><DialogDescription>Saved newsletter · responsive HTML preview</DialogDescription></DialogHeader>{error?<p role="alert">{error}</p>:<iframe title="Saved newsletter preview" sandbox="" srcDoc={html} className="h-[75vh] w-full border-0"/>}</DialogContent></Dialog>;
}
