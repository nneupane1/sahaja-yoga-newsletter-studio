"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import {
  AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, Check, Copy, Crop,
  FlipHorizontal2, FlipVertical2, GripVertical, Heading2, Image as ImageIcon,
  LayoutGrid, LayoutTemplate, Link2, MailCheck, Minus, Monitor, MoreHorizontal,
  Palette, RotateCw, Save, Send, Settings2, SlidersHorizontal, Smartphone,
  Trash2, Type, Upload, Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { EmailBlock } from "@/lib/email-renderer";

const approvedImage = "https://assets.wemeditate.com/uploads/media_file/file/210/classes.jpg?version=";

const starterBlocks = (): EmailBlock[] => [
  { id: "master-hero", type: "hero", data: { eyebrow: "Ausgabe 02-2026", title: "Sahaja Yoga Newsletter", text: "Aktuelles, Rückblicke und kommende Veranstaltungen", imageUrl: approvedImage, opacity: 72, brightness: 100, contrast: 100, saturation: 100 } },
  { id: "master-greeting", type: "heading", data: { text: "Liebe Freundinnen und Freunde,", size: 30, align: "left", color: "#17213f" } },
  { id: "master-intro", type: "text", data: { text: "seit unserem letzten Newsletter ist viel Schönes geschehen. Hier findet ihr Rückblicke, Bilder und alle wichtigen Termine für die kommende Zeit.", align: "left", color: "#57627a" } },
  { id: "featured-heading", type: "heading", data: { text: "Unsere nächste Veranstaltung", size: 32, align: "left", color: "#17213f" } },
  { id: "featured-image", type: "image", data: { imageUrl: approvedImage, alt: "Sahaja Yoga Veranstaltung", width: 556, padding: 42, radius: 16, opacity: 100, brightness: 100, contrast: 100, saturation: 100, align: "center" } },
  { id: "featured-copy", type: "text", data: { text: "Titel der Veranstaltung\nDatum · Uhrzeit · Ort\n\nFügt hier eine kurze, herzliche Einladung und alle wichtigen Informationen ein.", align: "left", color: "#57627a" } },
  { id: "featured-button", type: "button", data: { label: "Mehr erfahren & anmelden", url: "https://example.org/veranstaltung", align: "center", background: "#175cdf", color: "#ffffff", radius: 12 } },
  { id: "review-divider", type: "divider", data: { color: "#e6eaf1" } },
  { id: "review-heading", type: "heading", data: { text: "Was seit dem letzten Newsletter geschah", size: 30, align: "left", color: "#17213f" } },
  { id: "review-copy", type: "text", data: { text: "Rückblick auf unsere Veranstaltungen\n\nBeschreibt hier die besonderen Momente, Begegnungen und gemeinsamen Meditationen. Ergänzt darunter passende Bilder.", align: "left", color: "#57627a" } },
  { id: "album-button", type: "button", data: { label: "Gesamtes Fotoalbum", url: "https://drive.google.com/", align: "left", background: "#eef3ff", color: "#175cdf", radius: 12 } },
  { id: "upcoming-divider", type: "divider", data: { color: "#e6eaf1" } },
  { id: "upcoming-heading", type: "heading", data: { text: "Kommende Veranstaltungen", size: 30, align: "left", color: "#17213f" } },
  { id: "upcoming-copy", type: "text", data: { text: "Veranstaltung 1 · Datum · Ort\nKurze Beschreibung und Link\n\nVeranstaltung 2 · Datum · Ort\nKurze Beschreibung und Link", align: "left", color: "#57627a" } },
  { id: "weekly-heading", type: "heading", data: { text: "Wöchentliche Meditationen", size: 30, align: "left", color: "#17213f" } },
  { id: "weekly-copy", type: "text", data: { text: "Stuttgart · Montag · 19:00 Uhr\nUlm · Dienstag · 19:00 Uhr\nMünchen · Mittwoch · 19:00 Uhr\nFreiburg · Donnerstag · 19:00 Uhr\n\nErsetzt die Zeilen durch die aktuellen Städte, Zeiten und Links in Süddeutschland.", align: "left", color: "#57627a" } },
  { id: "news-heading", type: "heading", data: { text: "Aktuelles & Lesenswertes", size: 30, align: "left", color: "#17213f" } },
  { id: "news-copy", type: "text", data: { text: "Fügt hier kurze aktuelle Nachrichten oder einen ausgewählten Artikel aus einer freigegebenen offiziellen Quelle ein.", align: "left", color: "#57627a" } },
  { id: "master-signoff", type: "text", data: { text: "Mit freundlichen Grüßen & bis bald,\nSahaja Yoga Kultur e.V.", align: "left", color: "#57627a" } },
];

const blockCatalog: Array<{ type: EmailBlock["type"]; label: string; icon: typeof Type }> = [
  { type: "heading", label: "Heading", icon: Heading2 }, { type: "text", label: "Text", icon: Type },
  { type: "image", label: "Image", icon: ImageIcon }, { type: "button", label: "Button", icon: Link2 },
  { type: "divider", label: "Divider", icon: Minus }, { type: "spacer", label: "Space", icon: MoreHorizontal },
];

const newBlock = (type: EmailBlock["type"]): EmailBlock => ({
  id: crypto.randomUUID(), type,
  data: type === "heading" ? { text: "A clear new heading", size: 30, align: "left", color: "#17213f" }
    : type === "text" ? { text: "Write your message here.", align: "left", color: "#57627a" }
    : type === "image" ? { imageUrl: approvedImage, alt: "", width: 556, padding: 42, radius: 16, opacity: 100, brightness: 100, contrast: 100, saturation: 100, align: "center" }
    : type === "button" ? { label: "Learn more", url: "https://wemeditate.com/", align: "center", background: "#175cdf", color: "#ffffff", radius: 12 }
    : type === "divider" ? { color: "#e6eaf1" } : { height: 24 },
});

type MobilePanel = "content" | "blocks" | "design" | "settings" | null;

export function EditorView() {
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [title, setTitle] = useState("Ausgabe 02-2026");
  const [subject, setSubject] = useState("Sahaja Yoga Newsletter · Ausgabe 02-2026");
  const [preheader, setPreheader] = useState("Aktuelles, Rückblicke und kommende Veranstaltungen");
  const [fromName, setFromName] = useState("Sahaja Yoga Newsletter");
  const [replyTo, setReplyTo] = useState("");
  const [blocks, setBlocks] = useState<EmailBlock[]>(starterBlocks);
  const [selectedId, setSelectedId] = useState("master-hero");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [saving, setSaving] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendMode, setSendMode] = useState<"test" | "schedule" | "send">("test");
  const [testEmails, setTestEmails] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [providerConnected, setProviderConnected] = useState<boolean | null>(null);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
  const [imageStudioOpen, setImageStudioOpen] = useState(false);
  const uploadInput = useRef<HTMLInputElement>(null);
  const selected = blocks.find((block) => block.id === selectedId) || blocks[0];

  useEffect(() => {
    const id = localStorage.getItem("sy-edit-campaign"); if (!id) return;
    fetch(`/api/campaigns/${id}`).then((response) => response.json()).then((data: any) => {
      if (!data.campaign) throw new Error(data.error || "Could not load newsletter");
      const item = data.campaign; setCampaignId(item.id); setTitle(item.title); setSubject(item.subject); setPreheader(item.preheader || ""); setFromName(item.fromName || "Sahaja Yoga Newsletter"); setReplyTo(item.replyTo || ""); setBlocks(item.blocks); if (item.blocks[0]) setSelectedId(item.blocks[0].id); localStorage.removeItem("sy-edit-campaign");
    }).catch((error) => toast.error(error instanceof Error ? error.message : "Could not load newsletter"));
  }, []);

  const updateBlock = (id: string, patch: Record<string, string | number>) => setBlocks((current) => current.map((block) => block.id === id ? { ...block, data: { ...block.data, ...patch } } : block));
  const updateSelected = (patch: Record<string, string | number>) => updateBlock(selectedId, patch);
  const move = (direction: -1 | 1) => setBlocks((current) => { const index = current.findIndex((block) => block.id === selectedId); const next = index + direction; if (index < 0 || next < 0 || next >= current.length) return current; const copy = [...current]; [copy[index], copy[next]] = [copy[next], copy[index]]; return copy; });
  const duplicate = () => setBlocks((current) => { const index = current.findIndex((block) => block.id === selectedId); if (index < 0) return current; const copy = { ...current[index], id: crypto.randomUUID(), data: { ...current[index].data } }; setSelectedId(copy.id); return [...current.slice(0, index + 1), copy, ...current.slice(index + 1)]; });
  const remove = () => setBlocks((current) => { if (current.length === 1) return current; const index = current.findIndex((block) => block.id === selectedId); const next = current.filter((block) => block.id !== selectedId); setSelectedId(next[Math.max(0, index - 1)].id); return next; });
  const add = (type: EmailBlock["type"]) => { const block = newBlock(type); setBlocks((current) => [...current, block]); setSelectedId(block.id); setMobilePanel("design"); };

  const save = async () => {
    setSaving(true);
    try {
      let id = campaignId;
      if (!id) {
        const created = await fetch("/api/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, subject, preheader, fromName, replyTo, blocks }) });
        const data = await created.json() as any; if (!created.ok) throw new Error(data.error || "Could not create newsletter"); id = data.campaign.id; setCampaignId(id);
      }
      const response = await fetch(`/api/campaigns/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, subject, preheader, fromName, replyTo, blocks }) });
      const data = await response.json() as any; if (!response.ok) throw new Error(data.error || "Could not save newsletter");
      toast.success("Newsletter saved and responsive HTML generated"); return id;
    } finally { setSaving(false); }
  };

  const openSend = async () => {
    try { await save(); const response = await fetch("/api/status"); const data = await response.json() as any; setProviderConnected(Boolean(data.provider?.connected)); setSendOpen(true); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not prepare sending"); }
  };

  const send = async () => {
    try {
      const id = await save(); if (!id) return;
      const payload = sendMode === "test" ? { action: "test", emails: testEmails.split(/[,;\s]+/).filter(Boolean) } : sendMode === "schedule" ? { action: "schedule", scheduleAt } : { action: "send" };
      const response = await fetch(`/api/campaigns/${id}/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json() as any; if (!response.ok) throw new Error(data.error || "Sending failed"); setSendOpen(false); toast.success(sendMode === "test" ? "Test email sent" : sendMode === "schedule" ? "Newsletter scheduled in Sender" : "Newsletter handed to Sender for paced delivery");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Sending failed"); }
  };

  const uploadBlob = async (blob: Blob, filename: string, patch: Record<string, string | number> = {}) => {
    const form = new FormData(); form.append("file", blob, filename); toast.loading("Saving image", { id: "image-upload" });
    try { const response = await fetch("/api/assets", { method: "POST", body: form }); const data = await response.json() as any; if (!response.ok) throw new Error(data.error || "Upload failed"); updateSelected({ imageUrl: data.asset.url, ...patch }); toast.success("Image saved to this newsletter", { id: "image-upload" }); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Upload failed", { id: "image-upload" }); throw error; }
  };
  const uploadImage = async (file?: File) => { if (file) await uploadBlob(file, file.name); };

  const properties = <PropertyPanel selected={selected} update={updateSelected} move={move} duplicate={duplicate} remove={remove} replace={() => uploadInput.current?.click()} editImage={() => setImageStudioOpen(true)} />;
  const settings = <EmailSettings subject={subject} setSubject={setSubject} preheader={preheader} setPreheader={setPreheader} fromName={fromName} setFromName={setFromName} replyTo={replyTo} setReplyTo={setReplyTo} />;

  return (
    <div className="-m-4 min-h-[calc(100vh-74px)] bg-[#eef1f6] md:-m-7">
      <input ref={uploadInput} type="file" accept="image/*" className="hidden" onChange={(event) => { void uploadImage(event.target.files?.[0]); event.currentTarget.value = ""; }} />
      <div className="sticky top-[74px] z-20 flex flex-wrap items-center gap-2 border-b border-[#dfe4ed] bg-white/95 px-3 py-3 backdrop-blur-xl md:gap-3 md:px-6">
        <div className="mr-auto min-w-0 basis-[220px] md:min-w-[280px] md:basis-auto"><div className="flex items-center gap-2"><Badge className="bg-[#fff1dc] text-[#a45e18]">Draft</Badge><span className="truncate text-xs text-[#8993a7]">{campaignId ? "Saved to organiser workspace" : "Not yet saved"}</span></div><Input value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Newsletter title" className="mt-1 h-8 border-0 p-0 text-base font-bold shadow-none focus-visible:ring-0" /></div>
        <Tabs value={device} onValueChange={(value) => setDevice(value as "desktop" | "mobile")}><TabsList><TabsTrigger value="desktop"><Monitor /><span className="hidden sm:inline">Desktop</span></TabsTrigger><TabsTrigger value="mobile"><Smartphone /><span className="hidden sm:inline">Mobile</span></TabsTrigger></TabsList></Tabs>
        <Button variant="outline" className="hidden 2xl:inline-flex" onClick={() => { setBlocks(starterBlocks()); setSelectedId("master-hero"); toast.success("Master template loaded"); }}><LayoutTemplate /> Master template</Button>
        <Button variant="outline" onClick={() => save().catch((error) => toast.error(error.message))} disabled={saving}><Save /><span className="hidden sm:inline">{saving ? "Saving…" : "Save"}</span></Button>
        <Button onClick={openSend} className="bg-[#155bd7]"><Send /><span className="hidden sm:inline">Review & send</span></Button>
      </div>

      <div className="grid min-h-[calc(100vh-145px)] xl:grid-cols-[260px_minmax(640px,1fr)_340px] 2xl:grid-cols-[280px_minmax(680px,1fr)_370px]">
        <aside className="hidden h-[calc(100vh-145px)] overflow-y-auto border-r border-[#dfe4ed] bg-white p-4 xl:block"><ContentPalette add={add} /><StructureList blocks={blocks} selectedId={selectedId} choose={setSelectedId} /></aside>
        <main className="min-w-0 overflow-auto p-3 pb-24 sm:p-5 xl:p-8 xl:pb-8">
          <div className={`mx-auto transition-all duration-300 ${device === "mobile" ? "max-w-[390px]" : "max-w-[680px]"}`}>
            <div className="mb-3 flex items-center justify-between text-xs font-semibold text-[#77829a]"><span>{device === "mobile" ? "390 px mobile preview" : "640 px desktop email"}</span><span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-[#dfe4ed]">Live responsive HTML</span></div>
            <div className="overflow-hidden rounded-[22px] bg-white shadow-[0_22px_60px_rgba(29,43,77,.16)] ring-1 ring-[#dfe3eb]">
              <div className="border-b border-[#edf0f4] bg-[#fbfcfe] px-5 py-3"><p className="truncate text-xs text-[#7c879d]">Subject: <b className="text-[#34415e]">{subject || "Add a subject line"}</b></p><p className="mt-1 truncate text-[11px] text-[#929bad]">{preheader || "Add preview text"}</p></div>
              {blocks.map((block) => <EmailBlockPreview key={block.id} block={block} selected={block.id === selectedId} choose={() => setSelectedId(block.id)} update={(patch) => updateBlock(block.id, patch)} />)}
              <div className="bg-[#f8f9fc] px-8 py-7 text-center text-[11px] leading-5 text-[#8b94a7]">You are receiving this because you subscribed to Sahaja Yoga updates.<br/><u>Unsubscribe</u> · <u>Update preferences</u></div>
            </div>
          </div>
        </main>
        <aside className="hidden h-[calc(100vh-145px)] overflow-y-auto border-l border-[#dfe4ed] bg-white p-5 xl:block">{properties}<div className="mt-6 border-t border-[#e7eaf0] pt-5">{settings}</div></aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-[#dfe4ed] bg-white/95 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_35px_rgba(30,42,75,.12)] backdrop-blur-xl xl:hidden">
        {([["content","Add",LayoutGrid],["blocks","Blocks",GripVertical],["design","Design",Palette],["settings","Settings",Settings2]] as const).map(([id,label,Icon]) => <button key={id} onClick={() => setMobilePanel(id)} className="focus-ring flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold text-[#54617c] hover:bg-[#eef3ff] hover:text-[#175cdf]"><Icon className="size-4" />{label}</button>)}
      </div>

      <Dialog open={mobilePanel !== null} onOpenChange={(open) => !open && setMobilePanel(null)}><DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle className="font-serif text-2xl">{mobilePanel === "content" ? "Add content" : mobilePanel === "blocks" ? "Newsletter blocks" : mobilePanel === "design" ? "Design selected block" : "Email settings"}</DialogTitle><DialogDescription>Changes appear immediately in the preview.</DialogDescription></DialogHeader>{mobilePanel === "content" && <ContentPalette add={add} />}{mobilePanel === "blocks" && <StructureList blocks={blocks} selectedId={selectedId} choose={(id) => { setSelectedId(id); setMobilePanel("design"); }} />}{mobilePanel === "design" && properties}{mobilePanel === "settings" && settings}</DialogContent></Dialog>

      <ImageStudioDialog open={imageStudioOpen} onOpenChange={setImageStudioOpen} source={String(selected?.data.imageUrl || "")} onApply={(blob) => uploadBlob(blob, `newsletter-image-${Date.now()}.png`, { brightness: 100, contrast: 100, saturation: 100, opacity: 100 })} />

      <Dialog open={sendOpen} onOpenChange={setSendOpen}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle className="font-serif text-3xl">Send beautifully—and safely</DialogTitle><DialogDescription>Review delivery, consent, and tracking before this newsletter leaves the organiser studio.</DialogDescription></DialogHeader><div className="grid gap-3 sm:grid-cols-3">{[["Responsive HTML","Generated",Check],["Unsubscribe","Included",Check],["Sender",providerConnected ? "Connected" : "Not connected",providerConnected ? Check : Link2]].map(([label,value,Icon]) => <div key={String(label)} className="rounded-xl border border-[#e3e7ef] p-3"><Icon className={`size-5 ${value === "Not connected" ? "text-[#d87b25]" : "text-[#18a367]"}`} /><p className="mt-2 text-xs text-[#7b869b]">{label as string}</p><p className="text-sm font-bold">{value as string}</p></div>)}</div>{!providerConnected && <div className="rounded-xl bg-[#fff6e8] p-4 text-sm leading-6 text-[#765123]">Connect the free Sender account in Settings. The API token is kept in the Windows secure credential store and never placed in newsletter files.</div>}<Tabs value={sendMode} onValueChange={(value) => setSendMode(value as typeof sendMode)}><TabsList className="w-full"><TabsTrigger className="flex-1" value="test">Send test</TabsTrigger><TabsTrigger className="flex-1" value="schedule">Schedule</TabsTrigger><TabsTrigger className="flex-1" value="send">Send now</TabsTrigger></TabsList></Tabs>{sendMode === "test" && <Field label="Test recipients"><Input value={testEmails} onChange={(event) => setTestEmails(event.target.value)} placeholder="you@example.org, colleague@example.org" /></Field>}{sendMode === "schedule" && <Field label="Delivery time"><Input type="datetime-local" value={scheduleAt} onChange={(event) => setScheduleAt(event.target.value)} /></Field>}{sendMode === "send" && <div className="rounded-xl border border-[#f0d9b9] bg-[#fffaf2] p-4"><p className="font-bold text-[#754818]">Final delivery</p><p className="mt-1 text-sm leading-6 text-[#805d35]">Sender will queue this HTML newsletter for the selected subscriber group. Delivery may take up to an hour; opens, link clicks, bounces, unsubscribes, and RSVP-link clicks will flow back into this studio.</p></div>}<DialogFooter><Button variant="outline" onClick={() => setSendOpen(false)}>Cancel</Button><Button onClick={send} disabled={!providerConnected || (sendMode === "test" && !testEmails.trim()) || (sendMode === "schedule" && !scheduleAt)}><MailCheck />{sendMode === "test" ? "Send test" : sendMode === "schedule" ? "Schedule newsletter" : "Queue newsletter"}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

function ContentPalette({ add }: { add: (type: EmailBlock["type"]) => void }) {
  return <div><p className="text-xs font-bold uppercase tracking-[.12em] text-[#7c879d]">Add content</p><div className="mt-3 grid grid-cols-2 gap-2">{blockCatalog.map(({ type, label, icon: Icon }) => <button key={type} onClick={() => add(type)} className="focus-ring flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border border-[#e2e6ef] bg-[#fbfcfe] text-xs font-semibold text-[#52607c] transition hover:border-[#abc0eb] hover:bg-[#f1f5ff] hover:text-[#175cdf]"><Icon className="size-5" />{label}</button>)}</div></div>;
}

function StructureList({ blocks, selectedId, choose }: { blocks: EmailBlock[]; selectedId: string; choose: (id: string) => void }) {
  return <div><p className="mt-6 text-xs font-bold uppercase tracking-[.12em] text-[#7c879d]">Structure</p><div className="mt-3 space-y-1">{blocks.map((block, index) => <button key={block.id} onClick={() => choose(block.id)} className={`focus-ring flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-left text-xs font-semibold ${selectedId === block.id ? "bg-[#eaf0ff] text-[#175cdf]" : "text-[#66728b] hover:bg-[#f5f7fa]"}`}><GripVertical className="size-3.5 opacity-45" /><span className="flex-1 capitalize">{index + 1}. {block.type}</span></button>)}</div></div>;
}

function PropertyPanel({ selected, update, move, duplicate, remove, replace, editImage }: { selected: EmailBlock; update: (patch: Record<string, string | number>) => void; move: (direction: -1 | 1) => void; duplicate: () => void; remove: () => void; replace: () => void; editImage: () => void }) {
  return <div><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-[#7c879d]">Properties</p><h3 className="mt-1 font-serif text-xl font-semibold capitalize">{selected?.type}</h3></div><div className="flex"><Button variant="ghost" size="icon-sm" onClick={() => move(-1)} aria-label="Move up"><ArrowUp /></Button><Button variant="ghost" size="icon-sm" onClick={() => move(1)} aria-label="Move down"><ArrowDown /></Button><Button variant="ghost" size="icon-sm" onClick={duplicate} aria-label="Duplicate"><Copy /></Button><Button variant="ghost" size="icon-sm" onClick={remove} aria-label="Delete" className="text-red-600"><Trash2 /></Button></div></div><div className="mt-5 border-t border-[#e7eaf0] pt-5">{selected && <BlockInspector block={selected} update={update} replace={replace} editImage={editImage} />}</div></div>;
}

function EmailSettings({ subject, setSubject, preheader, setPreheader, fromName, setFromName, replyTo, setReplyTo }: { subject: string; setSubject: (value: string) => void; preheader: string; setPreheader: (value: string) => void; fromName: string; setFromName: (value: string) => void; replyTo: string; setReplyTo: (value: string) => void }) {
  return <div><p className="text-xs font-bold uppercase tracking-[.12em] text-[#7c879d]">Email settings</p><Field label="Subject"><Input value={subject} onChange={(event) => setSubject(event.target.value)} /></Field><Field label="Preview text"><Textarea value={preheader} onChange={(event) => setPreheader(event.target.value)} className="min-h-20" /></Field><Field label="From name"><Input value={fromName} onChange={(event) => setFromName(event.target.value)} /></Field><Field label="Reply-to"><Input type="email" value={replyTo} onChange={(event) => setReplyTo(event.target.value)} placeholder="newsletter@example.org" /></Field></div>;
}

function EmailBlockPreview({ block, selected, choose, update }: { block: EmailBlock; selected: boolean; choose: () => void; update: (patch: Record<string, string | number>) => void }) {
  const d = block.data; const frame = `relative cursor-pointer outline-none transition ${selected ? "ring-2 ring-inset ring-[#175cdf]" : "hover:ring-1 hover:ring-inset hover:ring-[#8aa9e8]"}`;
  const editable = (key: string) => ({ contentEditable: true, suppressContentEditableWarning: true, onBlur: (event: any) => update({ [key]: event.currentTarget.innerText }), onClick: choose });
  if (block.type === "hero") return <div onClick={choose} className={`${frame} bg-[#17275d] text-center text-white`}><img src={String(d.imageUrl || "")} alt="" style={{ opacity: Number(d.opacity ?? 72) / 100, filter: `brightness(${Number(d.brightness ?? 100)}%) contrast(${Number(d.contrast ?? 100)}%) saturate(${Number(d.saturation ?? 100)}%)` }} className="max-h-64 w-full object-cover"/><div className="p-8"><p {...editable("eyebrow")} className="text-xs font-bold uppercase tracking-[.14em] text-[#ffc976]">{d.eyebrow}</p><h2 {...editable("title")} className="mt-3 font-serif text-4xl font-semibold leading-tight">{d.title}</h2><p {...editable("text")} className="mt-3 text-sm leading-6 text-white/75">{d.text}</p></div></div>;
  if (block.type === "heading") return <div onClick={choose} className={`${frame} px-10 pb-2 pt-7`}><h2 {...editable("text")} style={{ color: String(d.color), fontSize: Number(d.size), textAlign: String(d.align) as "left" }} className="font-serif font-semibold leading-tight">{d.text}</h2></div>;
  if (block.type === "text") return <div {...editable("text")} style={{ color: String(d.color), textAlign: String(d.align) as "left" }} className={`${frame} whitespace-pre-line px-10 py-3 text-base leading-7`}>{d.text}</div>;
  if (block.type === "image") { const padding = Number(d.padding ?? 42); return <div onClick={choose} style={{ textAlign: String(d.align) as "center", paddingLeft: padding, paddingRight: padding }} className={`${frame} py-4`}><img src={String(d.imageUrl || "")} alt={String(d.alt || "")} style={{ width: Math.min(Number(d.width) || 556, 640 - padding * 2), borderRadius: Number(d.radius), opacity: Number(d.opacity ?? 100) / 100, filter: `brightness(${Number(d.brightness ?? 100)}%) contrast(${Number(d.contrast ?? 100)}%) saturate(${Number(d.saturation ?? 100)}%)` }} className="inline-block max-w-full" /></div>; }
  if (block.type === "button") return <div onClick={choose} style={{ textAlign: String(d.align) as "center" }} className={`${frame} px-10 py-6`}><span {...editable("label")} style={{ background: String(d.background), color: String(d.color), borderRadius: Number(d.radius) }} className="inline-block px-6 py-3.5 text-sm font-bold">{d.label}</span></div>;
  if (block.type === "divider") return <div onClick={choose} className={`${frame} px-10 py-5`}><div className="h-px" style={{ background: String(d.color) }} /></div>;
  return <div onClick={choose} className={frame} style={{ height: Number(d.height) || 24 }} />;
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <div className="mt-4"><Label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#6f7a91]">{label}</Label>{children}</div>; }
function Alignment({ value, onChange }: { value: string; onChange: (value: string) => void }) { return <div className="grid grid-cols-3 rounded-lg bg-[#f1f3f7] p-1">{([["left",AlignLeft],["center",AlignCenter],["right",AlignRight]] as const).map(([name,Icon]) => <Button key={name} type="button" variant={value === name ? "default" : "ghost"} size="sm" onClick={() => onChange(name)}><Icon /></Button>)}</div>; }
function RangeField({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void }) { return <Field label={`${label} · ${value}`}><Slider min={min} max={max} step={step} value={[value]} onValueChange={(values) => onChange(values[0])} /></Field>; }

function BlockInspector({ block, update, replace, editImage }: { block: EmailBlock; update: (patch: Record<string, string | number>) => void; replace: () => void; editImage: () => void }) {
  const d = block.data;
  if (block.type === "hero") return <><Field label="Eyebrow"><Input value={String(d.eyebrow || "")} onChange={(event) => update({ eyebrow: event.target.value })}/></Field><Field label="Title"><Textarea value={String(d.title || "")} onChange={(event) => update({ title: event.target.value })}/></Field><Field label="Introduction"><Textarea value={String(d.text || "")} onChange={(event) => update({ text: event.target.value })}/></Field><Field label="Public HTTPS image URL"><Input type="url" value={String(d.imageUrl || "")} onChange={(event) => update({ imageUrl: event.target.value })} placeholder="https://cdn.example.org/image.jpg" /></Field><ImageActions replace={replace} edit={editImage} /><RangeField label="Image opacity" value={Number(d.opacity ?? 72)} min={0} max={100} onChange={(opacity) => update({ opacity })}/></>;
  if (block.type === "heading") return <><Field label="Heading"><Textarea value={String(d.text || "")} onChange={(event) => update({ text: event.target.value })}/></Field><Field label="Alignment"><Alignment value={String(d.align)} onChange={(align) => update({ align })}/></Field><RangeField label="Size" value={Number(d.size) || 30} min={20} max={48} onChange={(size) => update({ size })}/><Field label="Colour"><Input type="color" value={String(d.color)} onChange={(event) => update({ color: event.target.value })}/></Field></>;
  if (block.type === "text") return <><Field label="Text"><Textarea className="min-h-40" value={String(d.text || "")} onChange={(event) => update({ text: event.target.value })}/></Field><Field label="Alignment"><Alignment value={String(d.align)} onChange={(align) => update({ align })}/></Field><Field label="Colour"><Input type="color" value={String(d.color)} onChange={(event) => update({ color: event.target.value })}/></Field><div className="mt-5 rounded-xl bg-[#f1f5ff] p-3"><p className="flex items-center gap-2 text-xs font-bold text-[#2859b8]"><Wand2 className="size-4"/>German writing suggestion</p><p className="mt-2 text-xs leading-5 text-[#62708d]">Keep sentences warm and direct. One clear invitation is easier to translate and understand.</p></div></>;
  if (block.type === "image") return <><ImageActions replace={replace} edit={editImage} /><Field label="Public HTTPS image URL"><Input type="url" value={String(d.imageUrl || "")} onChange={(event) => update({ imageUrl: event.target.value })} placeholder="https://cdn.example.org/image.jpg" /></Field><Field label="Alt text"><Input value={String(d.alt || "")} onChange={(event) => update({ alt: event.target.value })}/></Field><Field label="Placement"><div className="grid grid-cols-3 gap-2">{[["Inset",42,556],["Wide",20,600],["Edge",0,640]].map(([label,padding,width]) => <Button key={String(label)} type="button" size="sm" variant={Number(d.padding ?? 42) === padding ? "default" : "outline"} onClick={() => update({ padding: Number(padding), width: Number(width) })}>{label}</Button>)}</div></Field><Field label="Alignment"><Alignment value={String(d.align || "center")} onChange={(align) => update({ align })}/></Field><RangeField label="Width" value={Number(d.width) || 556} min={120} max={640} onChange={(width) => update({ width })}/><RangeField label="Side spacing" value={Number(d.padding ?? 42)} min={0} max={56} onChange={(padding) => update({ padding })}/><RangeField label="Corner radius" value={Number(d.radius) || 0} min={0} max={40} onChange={(radius) => update({ radius })}/><RangeField label="Opacity" value={Number(d.opacity ?? 100)} min={0} max={100} onChange={(opacity) => update({ opacity })}/><RangeField label="Brightness" value={Number(d.brightness ?? 100)} min={40} max={160} onChange={(brightness) => update({ brightness })}/><RangeField label="Contrast" value={Number(d.contrast ?? 100)} min={40} max={160} onChange={(contrast) => update({ contrast })}/><RangeField label="Saturation" value={Number(d.saturation ?? 100)} min={0} max={200} onChange={(saturation) => update({ saturation })}/></>;
  if (block.type === "button") return <><Field label="Button label"><Input value={String(d.label || "")} onChange={(event) => update({ label: event.target.value })}/></Field><Field label="Destination URL"><Input value={String(d.url || "")} onChange={(event) => update({ url: event.target.value })}/></Field><Field label="Alignment"><Alignment value={String(d.align)} onChange={(align) => update({ align })}/></Field><div className="mt-4 grid grid-cols-2 gap-3"><Field label="Background"><Input type="color" value={String(d.background)} onChange={(event) => update({ background: event.target.value })}/></Field><Field label="Text"><Input type="color" value={String(d.color)} onChange={(event) => update({ color: event.target.value })}/></Field></div><RangeField label="Corner radius" value={Number(d.radius) || 0} min={0} max={28} onChange={(radius) => update({ radius })}/></>;
  if (block.type === "divider") return <Field label="Line colour"><Input type="color" value={String(d.color)} onChange={(event) => update({ color: event.target.value })}/></Field>;
  return <RangeField label="Height" value={Number(d.height) || 24} min={8} max={80} onChange={(height) => update({ height })}/>;
}

function ImageActions({ replace, edit }: { replace: () => void; edit: () => void }) {
  return <div className="grid grid-cols-2 gap-2"><Button type="button" variant="outline" onClick={replace}><Upload /> Replace</Button><Button type="button" onClick={edit} className="bg-[#155bd7]"><SlidersHorizontal /> Image studio</Button></div>;
}

const ratios: Record<string, number | null> = { original: null, square: 1, landscape: 4 / 3, widescreen: 16 / 9, portrait: 3 / 4 };

function ImageStudioDialog({ open, onOpenChange, source, onApply }: { open: boolean; onOpenChange: (open: boolean) => void; source: string; onApply: (blob: Blob) => Promise<void> }) {
  const [imageUrl, setImageUrl] = useState(source);
  const [filename, setFilename] = useState("edited-image.png");
  const [ratio, setRatio] = useState("landscape");
  const [zoom, setZoom] = useState(1);
  const [positionX, setPositionX] = useState(50);
  const [positionY, setPositionY] = useState(50);
  const [rotation, setRotation] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [opacity, setOpacity] = useState(100);
  const [applying, setApplying] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const drag = useRef<{ x: number; y: number; positionX: number; positionY: number } | null>(null);

  useEffect(() => { if (open) { setImageUrl(source); setFilename("edited-image.png"); setRatio("landscape"); setZoom(1); setPositionX(50); setPositionY(50); setRotation(0); setFlipX(false); setFlipY(false); setBrightness(100); setContrast(100); setSaturation(100); setOpacity(100); } }, [open, source]);
  useEffect(() => () => { if (imageUrl.startsWith("blob:")) URL.revokeObjectURL(imageUrl); }, [imageUrl]);

  const chooseFile = (file?: File) => { if (!file) return; if (imageUrl.startsWith("blob:")) URL.revokeObjectURL(imageUrl); setImageUrl(URL.createObjectURL(file)); setFilename(file.name.replace(/\.[^.]+$/, "") + "-edited.png"); };
  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => { drag.current = { x: event.clientX, y: event.clientY, positionX, positionY }; event.currentTarget.setPointerCapture(event.pointerId); };
  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => { if (!drag.current) return; const bounds = event.currentTarget.getBoundingClientRect(); setPositionX(Math.max(0, Math.min(100, drag.current.positionX - (event.clientX - drag.current.x) / bounds.width * 100))); setPositionY(Math.max(0, Math.min(100, drag.current.positionY - (event.clientY - drag.current.y) / bounds.height * 100))); };

  const apply = async () => {
    setApplying(true);
    try {
      const image = await loadImage(imageUrl);
      const rotated = rotation % 180 !== 0;
      const stage = document.createElement("canvas"); stage.width = rotated ? image.naturalHeight : image.naturalWidth; stage.height = rotated ? image.naturalWidth : image.naturalHeight;
      const stageContext = stage.getContext("2d"); if (!stageContext) throw new Error("Image editing is unavailable in this browser");
      stageContext.translate(stage.width / 2, stage.height / 2); stageContext.rotate(rotation * Math.PI / 180); stageContext.scale(flipX ? -1 : 1, flipY ? -1 : 1); stageContext.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
      const targetRatio = ratios[ratio] || stage.width / stage.height; let cropWidth = stage.width; let cropHeight = cropWidth / targetRatio; if (cropHeight > stage.height) { cropHeight = stage.height; cropWidth = cropHeight * targetRatio; } cropWidth /= zoom; cropHeight /= zoom;
      const sourceX = (stage.width - cropWidth) * positionX / 100; const sourceY = (stage.height - cropHeight) * positionY / 100;
      const output = document.createElement("canvas"); output.width = Math.max(1, Math.round(Math.min(cropWidth, 1600))); output.height = Math.max(1, Math.round(output.width / targetRatio));
      const context = output.getContext("2d"); if (!context) throw new Error("Image editing is unavailable in this browser"); context.clearRect(0, 0, output.width, output.height); context.globalAlpha = opacity / 100; context.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`; context.drawImage(stage, sourceX, sourceY, cropWidth, cropHeight, 0, 0, output.width, output.height);
      const blob = await new Promise<Blob>((resolve, reject) => output.toBlob((value) => value ? resolve(value) : reject(new Error("Could not export image")), "image/png")); await onApply(blob); onOpenChange(false);
    } catch (error) { toast.error(error instanceof Error ? `${error.message}. Upload the original file if its website blocks editing.` : "Could not edit image"); }
    finally { setApplying(false); }
  };

  const aspectRatio = ratios[ratio] || 4 / 3;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-5xl"><DialogHeader><DialogTitle className="font-serif text-3xl">Image studio</DialogTitle><DialogDescription>Crop, place, resize and tune the image here. Applying creates a clean email-ready copy; the original remains untouched.</DialogDescription></DialogHeader><input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(event) => chooseFile(event.target.files?.[0])}/><div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_290px]"><div><div className="relative flex min-h-[340px] items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(45deg,#e8ebf1_25%,transparent_25%),linear-gradient(-45deg,#e8ebf1_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e8ebf1_75%),linear-gradient(-45deg,transparent_75%,#e8ebf1_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0] p-5"><div onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={() => { drag.current = null; }} className="relative w-full max-w-[680px] touch-none cursor-grab overflow-hidden rounded-xl bg-[#17275d] shadow-2xl active:cursor-grabbing" style={{ aspectRatio }}><img src={imageUrl} alt="Editing preview" draggable={false} className="absolute inset-0 h-full w-full select-none object-cover" style={{ objectPosition: `${positionX}% ${positionY}%`, opacity: opacity / 100, filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`, transform: `scale(${zoom}) rotate(${rotation}deg) scaleX(${flipX ? -1 : 1}) scaleY(${flipY ? -1 : 1})` }}/><div className="pointer-events-none absolute inset-0 border border-white/60"><span className="absolute left-1/3 top-0 h-full border-l border-white/35"/><span className="absolute left-2/3 top-0 h-full border-l border-white/35"/><span className="absolute left-0 top-1/3 w-full border-t border-white/35"/><span className="absolute left-0 top-2/3 w-full border-t border-white/35"/></div></div></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-[#768198]">Drag the image to choose its focal point.</p><Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}><Upload /> Choose original</Button></div></div><div className="rounded-2xl border border-[#e2e6ef] bg-[#fbfcfe] p-4"><Field label="Crop shape"><Select value={ratio} onValueChange={setRatio}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="original">Original</SelectItem><SelectItem value="square">Square · 1:1</SelectItem><SelectItem value="landscape">Landscape · 4:3</SelectItem><SelectItem value="widescreen">Wide · 16:9</SelectItem><SelectItem value="portrait">Portrait · 3:4</SelectItem></SelectContent></Select></Field><RangeField label="Zoom" value={Math.round(zoom * 100)} min={100} max={300} onChange={(value) => setZoom(value / 100)}/><RangeField label="Horizontal position" value={Math.round(positionX)} min={0} max={100} onChange={setPositionX}/><RangeField label="Vertical position" value={Math.round(positionY)} min={0} max={100} onChange={setPositionY}/><div className="mt-4 grid grid-cols-3 gap-2"><Button variant="outline" size="sm" onClick={() => setRotation((rotation + 90) % 360)} aria-label="Rotate"><RotateCw /></Button><Button variant={flipX ? "default" : "outline"} size="sm" onClick={() => setFlipX(!flipX)} aria-label="Flip horizontally"><FlipHorizontal2 /></Button><Button variant={flipY ? "default" : "outline"} size="sm" onClick={() => setFlipY(!flipY)} aria-label="Flip vertically"><FlipVertical2 /></Button></div><div className="my-5 border-t border-[#e2e6ef]"/><RangeField label="Brightness" value={brightness} min={40} max={160} onChange={setBrightness}/><RangeField label="Contrast" value={contrast} min={40} max={160} onChange={setContrast}/><RangeField label="Saturation" value={saturation} min={0} max={200} onChange={setSaturation}/><RangeField label="Opacity" value={opacity} min={0} max={100} onChange={setOpacity}/><Button variant="ghost" className="mt-5 w-full" onClick={() => { setZoom(1); setPositionX(50); setPositionY(50); setRotation(0); setFlipX(false); setFlipY(false); setBrightness(100); setContrast(100); setSaturation(100); setOpacity(100); }}><Crop /> Reset adjustments</Button></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={apply} disabled={!imageUrl || applying}><Check />{applying ? "Creating image…" : `Apply ${filename}`}</Button></DialogFooter></DialogContent></Dialog>;
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); if (!source.startsWith("blob:") && !source.startsWith("data:")) image.crossOrigin = "anonymous"; image.onload = () => resolve(image); image.onerror = () => reject(new Error("The source image could not be loaded for editing")); image.src = source; });
}
