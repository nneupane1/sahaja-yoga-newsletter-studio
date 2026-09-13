"use client";
import { studioLocalStorage } from "../lib/browser-preferences.mjs";
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
import { templateBlocks } from "@/lib/newsletter-templates.mjs";
import { renderBlock, renderDocument } from "@/lib/newsletter-renderer.mjs";

const approvedImage = "https://assets.wemeditate.com/uploads/media_file/file/210/classes.jpg?version=";

const starterBlocks = (): EmailBlock[] => templateBlocks("journal") as EmailBlock[];

const blockCatalog: Array<{ type: EmailBlock["type"]; label: string; icon: typeof Type }> = [
  { type: "heading", label: "Heading", icon: Heading2 }, { type: "text", label: "Text", icon: Type },
  { type: "story", label: "Event story", icon: LayoutTemplate }, { type: "gallery", label: "Photo gallery", icon: LayoutGrid },
  { type: "image", label: "Image", icon: ImageIcon }, { type: "button", label: "Button", icon: Link2 },
  { type: "divider", label: "Divider", icon: Minus }, { type: "spacer", label: "Space", icon: MoreHorizontal },
];

const newBlock = (type: EmailBlock["type"]): EmailBlock => ({
  id: crypto.randomUUID(), type,
  data: type === "story" ? { title: "A shared moment", meta: "DATE · LOCATION", text: "Tell the story of this event, thank the people involved and share what made it special.", imageUrl: approvedImage, alt: "", layout: "left", accent: "#175cdf", label: "View photo album", url: "" }
    : type === "gallery" ? { imageUrl: approvedImage, image2: "", image3: "", imageUrlAlt: "", image2Alt: "", image3Alt: "", label: "View photo album", url: "", background: "#175cdf", color: "#ffffff" }
    : type === "heading" ? { text: "A clear new heading", size: 30, align: "left", color: "#17213f" }
    : type === "text" ? { text: "Write your message here.", align: "left", color: "#57627a" }
    : type === "image" ? { imageUrl: approvedImage, alt: "", width: 556, padding: 42, radius: 16, opacity: 100, brightness: 100, contrast: 100, saturation: 100, align: "center" }
    : type === "button" ? { label: "Learn more", url: "https://wemeditate.com/", align: "center", background: "#175cdf", color: "#ffffff", radius: 12 }
    : type === "divider" ? { color: "#e6eaf1" } : { height: 24 },
});

type MobilePanel = "content" | "blocks" | "design" | "settings" | null;

export function EditorView() {
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [title, setTitle] = useState("Music and Meditation");
  const [subject, setSubject] = useState("Ein Sommer voller Begegnungen · Sahaja Yoga");
  const [preheader, setPreheader] = useState("Aktuelles, Rückblicke und kommende Veranstaltungen");
  const [fromName, setFromName] = useState("Sahaja Yoga Newsletter");
  const [replyTo, setReplyTo] = useState("");
  const [blocks, setBlocks] = useState<EmailBlock[]>(starterBlocks);
  const [selectedId, setSelectedId] = useState("");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [saving, setSaving] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendMode, setSendMode] = useState<"test" | "schedule" | "send">("test");
  const [testEmails, setTestEmails] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [providerConnected, setProviderConnected] = useState<boolean | null>(null);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
  const [imageStudioOpen, setImageStudioOpen] = useState(false);
  const [collageStudioOpen, setCollageStudioOpen] = useState(false);
  const uploadInput = useRef<HTMLInputElement>(null);
  const [imageSlot, setImageSlot] = useState("imageUrl");
  const [templatesOpen,setTemplatesOpen]=useState(false),[previewOpen,setPreviewOpen]=useState(false);
  const [catalog,setCatalog]=useState<any[]>([]),[previous,setPrevious]=useState<any[]>([]);
  const [templateError,setTemplateError]=useState("");
  const [loadingTemplate,setLoadingTemplate]=useState(false);
  const [sourceStatus,setSourceStatus]=useState("draft");
  const [savedSnapshot,setSavedSnapshot]=useState("");
  const snapshot=JSON.stringify({title,subject,preheader,fromName,replyTo,blocks});
  const dirty=snapshot!==savedSnapshot;
  const locked=sourceStatus!=="draft";
  const [reviewed,setReviewed]=useState(false);
  useEffect(()=>{setReviewed(false);},[snapshot]);
  useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(dirty){e.preventDefault();}};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);},[dirty]);
  useEffect(()=>{if(!blocks.some(b=>b.id===selectedId)&&blocks[0])setSelectedId(blocks[0].id);setImageSlot("imageUrl");},[selectedId,blocks.length]);
  const showTemplates=async()=>{setTemplatesOpen(true);setTemplateError("");try{const results=await Promise.all([fetch("/api/templates"),fetch("/api/campaigns")]);const data:any[]=await Promise.all(results.map(r=>r.json()));if(results.some(r=>!r.ok))throw new Error("Could not load templates and saved newsletters");setCatalog(data[0].templates);setPrevious(data[1].campaigns);}catch(e){setTemplateError(e instanceof Error?e.message:"Could not load templates");}};
  const loadCopy=async(template:any,previousId?:string)=>{setLoadingTemplate(true);setTemplateError("");try{
    let item=template;
    if(previousId){const response=await fetch(`/api/campaigns/${previousId}`);const data:any=await response.json();if(!response.ok)throw new Error(data.error||"Could not load newsletter");item=data.campaign;}
    // Save work before replacing the canvas. Sent sources are immutable.
    if(dirty&&!locked)await save();
    const copied=item.blocks.map((b:EmailBlock)=>({...b,id:crypto.randomUUID(),data:{...b.data}}));
    setCampaignId(null);setSourceStatus("draft");setTitle(previousId?`${item.title} · New edition`:item.campaignName);setSubject(item.subject||item.campaignName);setPreheader(item.preheader||"Musik, Meditation und Begegnungen");setBlocks(copied);setSelectedId(copied[0]?.id||"");setSavedSnapshot("");setTemplatesOpen(false);toast.success("New draft started. Your previous newsletter is preserved.");
  }catch(e){setTemplateError(e instanceof Error?e.message:"Could not create draft");}finally{setLoadingTemplate(false);}};
  const selected = blocks.find((block) => block.id === selectedId) || blocks[0];

  useEffect(() => {
    const id = studioLocalStorage.getItem("sy-edit-campaign"); if (!id) {setSavedSnapshot(snapshot);return;}
    fetch(`/api/campaigns/${id}`).then((response) => response.json()).then((data: any) => {
      if (!data.campaign) throw new Error(data.error || "Could not load newsletter");
      const item = data.campaign; setSourceStatus(item.providerCampaignId ? "connected" : item.status); setSavedSnapshot(JSON.stringify({title:item.title,subject:item.subject,preheader:item.preheader||"",fromName:item.fromName||"Sahaja Yoga Newsletter",replyTo:item.replyTo||"",blocks:item.blocks})); setCampaignId(item.id); setTitle(item.title); setSubject(item.subject); setPreheader(item.preheader || ""); setFromName(item.fromName || "Sahaja Yoga Newsletter"); setReplyTo(item.replyTo || ""); setBlocks(item.blocks); if (item.blocks[0]) setSelectedId(item.blocks[0].id); studioLocalStorage.removeItem("sy-edit-campaign");
    }).catch((error) => toast.error(error instanceof Error ? error.message : "Could not load newsletter"));
  }, []);

  const updateBlock = (id: string, patch: Record<string, string | number>) => !locked && setBlocks((current) => current.map((block) => block.id === id ? { ...block, data: { ...block.data, ...patch } } : block));
  const updateSelected = (patch: Record<string, string | number>) => updateBlock(selected?.id || selectedId, patch);
  const move = (direction: -1 | 1) => setBlocks((current) => { const index = current.findIndex((block) => block.id === selectedId); const next = index + direction; if (index < 0 || next < 0 || next >= current.length) return current; const copy = [...current]; [copy[index], copy[next]] = [copy[next], copy[index]]; return copy; });
  const duplicate = () => setBlocks((current) => { const index = current.findIndex((block) => block.id === selectedId); if (index < 0) return current; const copy = { ...current[index], id: crypto.randomUUID(), data: { ...current[index].data } }; setSelectedId(copy.id); return [...current.slice(0, index + 1), copy, ...current.slice(index + 1)]; });
  const remove = () => setBlocks((current) => { if (current.length === 1) return current; const index = current.findIndex((block) => block.id === selectedId); const next = current.filter((block) => block.id !== selectedId); setSelectedId(next[Math.max(0, index - 1)].id); return next; });
  const add = (type: EmailBlock["type"]) => { const block = newBlock(type); setBlocks((current) => [...current, block]); setSelectedId(block.id); setMobilePanel("design"); };

  const save = async () => {
    if(locked) throw new Error("This edition is already connected to delivery. Use Templates → Previous newsletters to start an editable copy.");
    setSaving(true);
    try {
      let id = campaignId;
      if (!id) {
        const created = await fetch("/api/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, subject, preheader, fromName, replyTo, blocks }) });
        const data = await created.json() as any; if (!created.ok) throw new Error(data.error || "Could not create newsletter"); id = data.campaign.id; setCampaignId(id);
      }
      const response = await fetch(`/api/campaigns/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, subject, preheader, fromName, replyTo, blocks }) });
      const data = await response.json() as any; if (!response.ok) throw new Error(data.error || "Could not save newsletter");
      setSavedSnapshot(snapshot); window.dispatchEvent(new Event("studio:changed")); toast.success("Newsletter saved and responsive HTML generated"); return id;
    } finally { setSaving(false); }
  };

  useEffect(()=>{
    const handle=async()=>{if(dirty&&!locked)await save();};
    (window as any).sySaveDraft=handle;
    return()=>{if((window as any).sySaveDraft===handle)delete (window as any).sySaveDraft;};
  },[snapshot,dirty,locked,campaignId]);
  const openSend = async () => {
    try { await save(); const response = await fetch("/api/status"); const data = await response.json() as any; setProviderConnected(Boolean(data.provider?.connected)); setSendOpen(true); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not prepare sending"); }
  };

  const send = async () => {
    try {
      const id = await save(); if (!id) return;
      const payload = sendMode === "test" ? { action: "test", emails: testEmails.split(/[,;\s]+/).filter(Boolean) } : sendMode === "schedule" ? { action: "schedule", scheduleAt } : { action: "send" };
      const response = await fetch(`/api/campaigns/${id}/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json() as any; if (!response.ok) throw new Error(data.error || "Sending failed"); setSendOpen(false); if(sendMode!=="test")setSourceStatus(sendMode==="send"?"sending":"scheduled"); window.dispatchEvent(new Event("studio:changed")); toast.success(sendMode === "test" ? "Test email sent" : sendMode === "schedule" ? "Newsletter scheduled in Sender" : "Newsletter handed to Sender for paced delivery");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Sending failed"); }
  };

  const uploadBlob = async (blob: Blob, filename: string, patch: Record<string, string | number> = {}, targetSlot = imageSlot) => {
    const form = new FormData(); form.append("file", blob, filename); toast.loading("Saving image", { id: "image-upload" });
    try { const response = await fetch("/api/assets", { method: "POST", body: form }); const data = await response.json() as any; if (!response.ok) throw new Error(data.error || "Upload failed"); updateSelected({ [targetSlot]: data.asset.url, ...patch }); toast.success("Image saved. Use a public HTTPS image URL before email delivery.", { id: "image-upload" }); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Upload failed", { id: "image-upload" }); throw error; }
  };
  const uploadImage = async (file?: File) => { if (file) await uploadBlob(file, file.name); };

  const properties = <PropertyPanel selected={selected} update={updateSelected} move={move} duplicate={duplicate} remove={remove} replace={() => uploadInput.current?.click()} editImage={() => setImageStudioOpen(true)} createCollage={() => setCollageStudioOpen(true)} imageSlot={imageSlot} setImageSlot={setImageSlot} />;
  const settings = <EmailSettings subject={subject} setSubject={setSubject} preheader={preheader} setPreheader={setPreheader} fromName={fromName} setFromName={setFromName} replyTo={replyTo} setReplyTo={setReplyTo} />;
  const compactTools = ([["content","Add",LayoutGrid],["blocks","Blocks",GripVertical],["design","Design",Palette],["settings","Settings",Settings2]] as const).map(([id,label,Icon]) => <button key={id} type="button" onClick={() => setMobilePanel(id)} className="focus-ring flex min-h-11 items-center justify-center gap-1 rounded-xl px-1 text-sm font-semibold text-[#54617c] hover:bg-[#eef3ff] hover:text-[#175cdf] md:flex-col"><Icon className="size-4 shrink-0" aria-hidden="true" />{label}</button>);

  return (
    <div className="studio-editor -m-4 min-h-[calc(100vh-74px)] md:-m-7">
      <input ref={uploadInput} type="file" accept="image/*" className="hidden" onChange={(event) => { void uploadImage(event.target.files?.[0]); event.currentTarget.value = ""; }} />
      <div className="studio-editor-toolbar sticky top-[74px] z-20 flex flex-wrap items-center gap-2 border-b border-[#dfe4ed] bg-white/95 px-3 py-3 backdrop-blur-xl md:gap-3 md:px-6">
        <div className="mr-auto min-w-0 basis-[220px] md:min-w-[280px] md:basis-auto"><div className="flex items-center gap-2"><Badge className="bg-[#fff1dc] text-[#a45e18]">{locked ? "Read-only edition" : "Draft"}</Badge><span className="truncate text-xs text-[#8993a7]">{dirty ? "Unsaved changes" : campaignId ? "All changes saved" : "Ready to personalise"}</span></div><Input value={title} disabled={locked} onChange={(event) => setTitle(event.target.value)} aria-label="Newsletter title" className="mt-1 h-8 border-0 p-0 text-base font-bold shadow-none focus-visible:ring-0" /></div>
        <Tabs value={device} onValueChange={(value) => setDevice(value as "desktop" | "mobile")}><TabsList><TabsTrigger value="desktop"><Monitor /><span className="hidden sm:inline">Desktop</span></TabsTrigger><TabsTrigger value="mobile"><Smartphone /><span className="hidden sm:inline">Mobile</span></TabsTrigger></TabsList></Tabs>
        <Button variant="outline" onClick={showTemplates}><LayoutTemplate /><span className="hidden sm:inline">Templates</span></Button><Button variant="outline" onClick={()=>setPreviewOpen(true)}><Monitor/><span className="hidden sm:inline">Email preview</span></Button>
        <Button variant="outline" onClick={() => save().catch((error) => toast.error(error.message))} disabled={saving||locked}><Save /><span className="hidden sm:inline">{saving ? "Saving…" : "Save"}</span></Button>
        <Button onClick={openSend} disabled={saving||locked} className="bg-[#155bd7]"><Send /><span className="hidden sm:inline">Review & send</span></Button>
        <nav aria-label="Newsletter editing tools" className="grid w-full grid-cols-4 gap-1 border-t border-slate-100 pt-1 md:hidden">{compactTools}</nav>
      </div>

      <div className="grid min-h-[calc(100vh-145px)] xl:grid-cols-[200px_minmax(0,1fr)_280px] 2xl:grid-cols-[230px_minmax(0,1fr)_320px]">
        <aside className="hidden h-[calc(100vh-145px)] overflow-y-auto border-r border-[#dfe4ed] bg-white p-4 xl:block">{!locked&&<ContentPalette add={add} />}<StructureList blocks={blocks} selectedId={selectedId} choose={setSelectedId} /></aside>
        <main className="min-w-0 overflow-auto p-3 pb-24 sm:p-5 xl:p-8 xl:pb-8">
          <div className={`mx-auto transition-all duration-300 ${device === "mobile" ? "max-w-[390px]" : "max-w-[680px]"}`}>
            <div className="mb-3 flex items-center justify-between text-xs font-semibold text-[#77829a]"><span>{device === "mobile" ? "390 px mobile preview" : "640 px desktop email"}</span><span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-[#dfe4ed]">Editing canvas</span></div>
            <div className="overflow-hidden rounded-[22px] bg-white shadow-[0_22px_60px_rgba(29,43,77,.16)] ring-1 ring-[#dfe3eb]">
              <div className="border-b border-[#edf0f4] bg-[#fbfcfe] px-5 py-3"><p className="truncate text-xs text-[#7c879d]">Subject: <b className="text-[#34415e]">{subject || "Add a subject line"}</b></p><p className="mt-1 truncate text-[11px] text-[#929bad]">{preheader || "Add preview text"}</p></div>
              {blocks.map((block) => <EmailBlockPreview key={block.id} block={block} selected={block.id === selectedId} choose={() => setSelectedId(block.id)} update={(patch) => updateBlock(block.id, patch)} readOnly={locked} />)}
              <div className="bg-[#f8f9fc] px-8 py-7 text-center text-[11px] leading-5 text-[#8b94a7]">You are receiving this because you subscribed to Sahaja Yoga updates.<br/><u>Unsubscribe</u> · <u>Update preferences</u></div>
            </div>
          </div>
        </main>
        <aside className="hidden h-[calc(100vh-145px)] overflow-y-auto border-l border-[#dfe4ed] bg-white p-5 xl:block"><fieldset disabled={locked}>{properties}<div className="mt-6 border-t border-[#e7eaf0] pt-5">{settings}</div></fieldset></aside>
      </div>

      <nav aria-label="Newsletter editing tools" className="fixed inset-x-0 bottom-0 z-30 hidden grid-cols-4 border-t border-[#dfe4ed] bg-white/95 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_35px_rgba(30,42,75,.12)] backdrop-blur-xl md:left-[236px] md:grid xl:hidden">{compactTools}</nav>

      <Dialog open={mobilePanel !== null} onOpenChange={(open) => !open && setMobilePanel(null)}><DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle className="font-serif text-2xl">{mobilePanel === "content" ? "Add content" : mobilePanel === "blocks" ? "Newsletter blocks" : mobilePanel === "design" ? "Design selected block" : "Email settings"}</DialogTitle><DialogDescription>Changes appear immediately in the preview.</DialogDescription></DialogHeader>{mobilePanel === "content" && !locked && <ContentPalette add={add} />}{mobilePanel === "blocks" && <StructureList blocks={blocks} selectedId={selectedId} choose={(id) => { setSelectedId(id); setMobilePanel("design"); }} />}{mobilePanel === "design" && <fieldset disabled={locked}>{properties}</fieldset>}{mobilePanel === "settings" && <fieldset disabled={locked}>{settings}</fieldset>}</DialogContent></Dialog>

      <Dialog open={templatesOpen} onOpenChange={setTemplatesOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl"><DialogHeader><DialogTitle className="font-serif text-3xl">A beautiful place to begin</DialogTitle><DialogDescription>Choose a design or continue from a saved edition. Current draft changes are saved before starting a new copy. Sample event dates and text must be reviewed before sending.</DialogDescription></DialogHeader>{templateError&&<p role="alert" className="text-red-600">{templateError}</p>}<div className="grid gap-5 sm:grid-cols-2">{catalog.map(t=><div key={t.id} className="overflow-hidden rounded-2xl border bg-white"><div className="pointer-events-none h-60 overflow-hidden bg-slate-100"><iframe title={`${t.name} template sample`} tabIndex={-1} sandbox="" srcDoc={renderDocument({subject:t.name,blocks:t.blocks.slice(0,4)}).html} className="h-[650px] w-[640px] origin-top-left scale-[.6] border-0"/></div><div className="p-5"><div className="flex items-center gap-2"><span className="size-3 rounded-full" style={{background:t.accent}}/><h3 className="font-serif text-2xl">{t.name}</h3></div><p className="my-3 min-h-12 text-sm leading-6 text-slate-500">{t.description}</p><Button disabled={loadingTemplate} onClick={()=>loadCopy(t)}>Use this design</Button></div></div>)}</div><h3 className="mt-4 font-serif text-2xl">Start from a previous newsletter</h3>{!previous.length&&<p className="text-slate-500">Saved newsletters will appear here.</p>}{previous.map(c=><div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border p-4"><div><p className="font-semibold">{c.title}</p><p className="text-sm text-slate-500">{c.status} · {c.updatedAt?.slice(0,10)}</p></div><Button variant="outline" disabled={loadingTemplate} onClick={()=>loadCopy(null,c.id)}><Copy/>Use as new draft</Button></div>)}</DialogContent></Dialog>
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}><DialogContent className="sm:max-w-4xl"><DialogHeader><DialogTitle>Email preview</DialogTitle><DialogDescription>The same HTML renderer generates the saved email. Test in your actual inbox before delivery.</DialogDescription></DialogHeader><div className="flex gap-2"><Button variant={device==="desktop"?"default":"outline"} onClick={()=>setDevice("desktop")}>Desktop</Button><Button variant={device==="mobile"?"default":"outline"} onClick={()=>setDevice("mobile")}>Mobile</Button></div><iframe title="Rendered newsletter" sandbox="" srcDoc={renderDocument({subject,preheader,blocks}).html} className="mx-auto h-[65vh] max-w-full border-0" style={{width:device==="mobile"?390:720}}/></DialogContent></Dialog>
      <ImageStudioDialog open={imageStudioOpen} onOpenChange={setImageStudioOpen} source={String(selected?.data[imageSlot] || "")} onApply={(blob) => uploadBlob(blob, `newsletter-image-${Date.now()}.png`, { brightness: 100, contrast: 100, saturation: 100, opacity: 100 })} />
      <CollageStudioDialog open={collageStudioOpen} onOpenChange={setCollageStudioOpen} onApply={(blob) => {
        setImageSlot("imageUrl");
        return uploadBlob(blob, `newsletter-collage-${Date.now()}.png`, { image2: "", image3: "", imageUrlAlt: "Photo collage", brightness: 100, contrast: 100, saturation: 100, opacity: 100 }, "imageUrl");
      }} />

      <Dialog open={sendOpen} onOpenChange={setSendOpen}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle className="font-serif text-3xl">Send beautifully—and safely</DialogTitle><DialogDescription>Review delivery, consent, and tracking before this newsletter leaves the organiser studio.</DialogDescription></DialogHeader><div className="grid gap-3 sm:grid-cols-3">{[["Responsive HTML","Generated",Check],["Unsubscribe","Included",Check],["Sender",providerConnected ? "Connected" : "Not connected",providerConnected ? Check : Link2]].map(([label,value,Icon]) => <div key={String(label)} className="rounded-xl border border-[#e3e7ef] p-3"><Icon className={`size-5 ${value === "Not connected" ? "text-[#d87b25]" : "text-[#18a367]"}`} /><p className="mt-2 text-xs text-[#7b869b]">{label as string}</p><p className="text-sm font-bold">{value as string}</p></div>)}</div>{!providerConnected && <div className="rounded-xl bg-[#fff6e8] p-4 text-sm leading-6 text-[#765123]">Connect the free Sender account in Settings. The API token is kept in the Windows secure credential store and never placed in newsletter files.</div>}<Tabs value={sendMode} onValueChange={(value) => setSendMode(value as typeof sendMode)}><TabsList className="w-full"><TabsTrigger className="flex-1" value="test">Send test</TabsTrigger><TabsTrigger className="flex-1" value="schedule">Schedule</TabsTrigger><TabsTrigger className="flex-1" value="send">Send now</TabsTrigger></TabsList></Tabs>{sendMode === "test" && <Field label="Test recipients"><Input value={testEmails} onChange={(event) => setTestEmails(event.target.value)} placeholder="you@example.org, colleague@example.org" /></Field>}{sendMode === "schedule" && <Field label="Delivery time"><Input type="datetime-local" value={scheduleAt} onChange={(event) => setScheduleAt(event.target.value)} /></Field>}{sendMode === "send" && <div className="rounded-xl border border-[#f0d9b9] bg-[#fffaf2] p-4"><p className="font-bold text-[#754818]">Final delivery</p><p className="mt-1 text-sm leading-6 text-[#805d35]">Sender will queue this HTML newsletter for the selected subscriber group. Delivery may take up to an hour; opens, link clicks, bounces, unsubscribes, and available campaign statistics can be refreshed in this studio. A booking-link click does not confirm attendance.</p></div>}<label className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm"><input type="checkbox" className="mt-1" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>I have reviewed dates, sample text, image credits and links for this edition.</label><DialogFooter><Button variant="outline" onClick={() => setSendOpen(false)}>Cancel</Button><Button onClick={send} disabled={!reviewed || saving || !providerConnected || (sendMode === "test" && !testEmails.trim()) || (sendMode === "schedule" && !scheduleAt)}><MailCheck />{sendMode === "test" ? "Send test" : sendMode === "schedule" ? "Schedule newsletter" : "Queue newsletter"}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

function ContentPalette({ add }: { add: (type: EmailBlock["type"]) => void }) {
  return <div><p className="text-xs font-bold uppercase tracking-[.12em] text-[#7c879d]">Add content</p><div className="mt-3 grid grid-cols-2 gap-2">{blockCatalog.map(({ type, label, icon: Icon }) => <button key={type} onClick={() => add(type)} className="focus-ring flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border border-[#e2e6ef] bg-[#fbfcfe] text-xs font-semibold text-[#52607c] transition hover:border-[#abc0eb] hover:bg-[#f1f5ff] hover:text-[#175cdf]"><Icon className="size-5" />{label}</button>)}</div></div>;
}

function StructureList({ blocks, selectedId, choose }: { blocks: EmailBlock[]; selectedId: string; choose: (id: string) => void }) {
  return <div><p className="mt-6 text-xs font-bold uppercase tracking-[.12em] text-[#7c879d]">Structure</p><div className="mt-3 space-y-1">{blocks.map((block, index) => <button key={block.id} onClick={() => choose(block.id)} className={`focus-ring flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-left text-xs font-semibold ${selectedId === block.id ? "bg-[#eaf0ff] text-[#175cdf]" : "text-[#66728b] hover:bg-[#f5f7fa]"}`}><GripVertical className="size-3.5 opacity-45" /><span className="flex-1 capitalize">{index + 1}. {String(block.data.title||block.data.text||block.type).slice(0,40)}</span></button>)}</div></div>;
}

function PropertyPanel({ selected, update, move, duplicate, remove, replace, editImage, createCollage, imageSlot, setImageSlot }: { selected: EmailBlock; update: (patch: Record<string, string | number>) => void; move: (direction: -1 | 1) => void; duplicate: () => void; remove: () => void; replace: () => void; editImage: () => void; createCollage: () => void; imageSlot:string; setImageSlot:(key:string)=>void }) {
  return <div><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-[#7c879d]">Properties</p><h3 className="mt-1 font-serif text-xl font-semibold capitalize">{selected?.type}</h3></div><div className="flex"><Button variant="ghost" size="icon-sm" onClick={() => move(-1)} aria-label="Move up"><ArrowUp /></Button><Button variant="ghost" size="icon-sm" onClick={() => move(1)} aria-label="Move down"><ArrowDown /></Button><Button variant="ghost" size="icon-sm" onClick={duplicate} aria-label="Duplicate"><Copy /></Button><Button variant="ghost" size="icon-sm" onClick={remove} aria-label="Delete" className="text-red-600"><Trash2 /></Button></div></div><div className="mt-5 border-t border-[#e7eaf0] pt-5">{selected && <BlockInspector block={selected} update={update} replace={replace} editImage={editImage} createCollage={createCollage} imageSlot={imageSlot} setImageSlot={setImageSlot} />}</div></div>;
}

function EmailSettings({ subject, setSubject, preheader, setPreheader, fromName, setFromName, replyTo, setReplyTo }: { subject: string; setSubject: (value: string) => void; preheader: string; setPreheader: (value: string) => void; fromName: string; setFromName: (value: string) => void; replyTo: string; setReplyTo: (value: string) => void }) {
  return <div><p className="text-xs font-bold uppercase tracking-[.12em] text-[#7c879d]">Email settings</p><Field label="Subject"><Input value={subject} onChange={(event) => setSubject(event.target.value)} /></Field><Field label="Preview text"><Textarea value={preheader} onChange={(event) => setPreheader(event.target.value)} className="min-h-20" /></Field><Field label="From name"><Input value={fromName} onChange={(event) => setFromName(event.target.value)} /></Field><Field label="Reply-to"><Input type="email" value={replyTo} onChange={(event) => setReplyTo(event.target.value)} placeholder="newsletter@example.org" /></Field></div>;
}

function EmailBlockPreview({ block, selected, choose, update, readOnly }: { block: EmailBlock; selected: boolean; choose: () => void; update: (patch: Record<string, string | number>) => void; readOnly:boolean }) {
  const d = block.data; const frame = `relative cursor-pointer outline-none transition ${selected ? "ring-2 ring-inset ring-[#175cdf]" : "hover:ring-1 hover:ring-inset hover:ring-[#8aa9e8]"}`;
  const editable = (key: string) => ({ contentEditable: !readOnly, suppressContentEditableWarning: true, onBlur: (event: any) => update({ [key]: event.currentTarget.innerText }), onClick: choose });
  if(block.type==="story"||block.type==="gallery")return <div className={frame} onClick={e=>{e.preventDefault();choose();}}><table role="presentation" className="w-full"><tbody dangerouslySetInnerHTML={{__html:renderBlock(block)}}/></table></div>;
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

function BlockInspector({ block, update, replace, editImage, createCollage, imageSlot, setImageSlot }: { block: EmailBlock; update: (patch: Record<string, string | number>) => void; replace: () => void; editImage: () => void; createCollage: () => void; imageSlot:string; setImageSlot:(key:string)=>void }) {
  const d = block.data;
  if(block.type==="story"||block.type==="gallery")return <>
    {block.type==="story"&&<><Field label="Event title"><Input value={String(d.title||"")} onChange={e=>update({title:e.target.value})}/></Field><Field label="Date & place"><Input value={String(d.meta||"")} onChange={e=>update({meta:e.target.value})}/></Field><Field label="Story"><Textarea className="min-h-48" value={String(d.text||"")} onChange={e=>update({text:e.target.value})}/></Field><Field label="Image placement"><Select value={String(d.layout||"left")} onValueChange={v=>update({layout:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["left","right","above","below"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></Field><Field label="Accent colour"><Input type="color" value={String(d.accent||"#175cdf")} onChange={e=>update({accent:e.target.value})}/></Field></>}
    {block.type==="gallery"&&<><Button type="button" onClick={createCollage} className="mb-1 w-full bg-[linear-gradient(135deg,#6941c6,#175cdf)]"><LayoutGrid /> Create one photo collage</Button><p className="mb-4 text-xs leading-5 text-slate-500">Combine 2–6 photos into one polished image with an email-safe layout.</p><Field label="Photo to edit"><div className="flex gap-2">{["imageUrl","image2","image3"].map((key,i)=><Button key={key} variant={imageSlot===key?"default":"outline"} onClick={()=>setImageSlot(key)}>Photo {i+1}</Button>)}</div></Field></>}
    <Field label="Image URL"><Input value={String(d[imageSlot]||"")} onChange={e=>update({[imageSlot]:e.target.value})} placeholder="https://…"/></Field><ImageActions replace={replace} edit={editImage}/>
    <Field label="Alt text"><Input value={String(d[imageSlot+"Alt"]||d.alt||"")} onChange={e=>update({[imageSlot+"Alt"]:e.target.value})}/></Field><Field label="Caption"><Input value={String(d[block.type==="story"?"caption":imageSlot+"Caption"]||"")} onChange={e=>update({[block.type==="story"?"caption":imageSlot+"Caption"]:e.target.value})}/></Field>
    <Field label="Album or booking link"><Input value={String(d.url||"")} onChange={e=>update({url:e.target.value})}/></Field><Field label="Button label"><Input value={String(d.label||"")} onChange={e=>update({label:e.target.value})}/></Field>
    <p className="mt-4 text-sm leading-6 text-slate-500">Email images need a public HTTPS address. Export edited PNGs for your organisation’s media hosting. Use Image studio for a precise crop, rotation, brightness and opacity. Each photo is edited independently.</p>
  </>;
  if (block.type === "hero") return <><Field label="Cover background"><Input type="color" value={String(d.background||"#17275d")} onChange={e=>update({background:e.target.value})}/></Field><Field label="Email surround"><Input type="color" value={String(d.pageBackground||"#eef1f6")} onChange={e=>update({pageBackground:e.target.value})}/></Field><Field label="Eyebrow"><Input value={String(d.eyebrow || "")} onChange={(event) => update({ eyebrow: event.target.value })}/></Field><Field label="Title"><Textarea value={String(d.title || "")} onChange={(event) => update({ title: event.target.value })}/></Field><Field label="Introduction"><Textarea value={String(d.text || "")} onChange={(event) => update({ text: event.target.value })}/></Field><Field label="Public HTTPS image URL"><Input type="url" value={String(d.imageUrl || "")} onChange={(event) => update({ imageUrl: event.target.value })} placeholder="https://cdn.example.org/image.jpg" /></Field><ImageActions replace={replace} edit={editImage} /><RangeField label="Image opacity" value={Number(d.opacity ?? 72)} min={0} max={100} onChange={(opacity) => update({ opacity })}/></>;
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

type CollagePhoto = { id: string; url: string; name: string; zoom: number; x: number; y: number };
type CollageLayout = "feature" | "editorial" | "grid" | "strip";
const collageRatios: Record<string, number> = { wide: 16 / 9, landscape: 4 / 3, square: 1, portrait: 4 / 5 };

function CollageStudioDialog({ open, onOpenChange, onApply }: { open: boolean; onOpenChange: (open: boolean) => void; onApply: (blob: Blob) => Promise<void> }) {
  const [photos,setPhotos]=useState<CollagePhoto[]>([]);
  const [loaded,setLoaded]=useState<HTMLImageElement[]>([]);
  const [selectedId,setSelectedId]=useState("");
  const [layout,setLayout]=useState<CollageLayout>("feature");
  const [ratio,setRatio]=useState("landscape");
  const [gap,setGap]=useState(12);
  const [radius,setRadius]=useState(18);
  const [background,setBackground]=useState("#ffffff");
  const [applying,setApplying]=useState(false);
  const [error,setError]=useState("");
  const input=useRef<HTMLInputElement>(null);
  const canvas=useRef<HTMLCanvasElement>(null);
  const selected=photos.find(photo=>photo.id===selectedId);

  const release=()=>{photos.forEach(photo=>URL.revokeObjectURL(photo.url));setPhotos([]);setLoaded([]);setSelectedId("");setError("");};
  useEffect(()=>{if(open){setLayout("feature");setRatio("landscape");setGap(12);setRadius(18);setBackground("#ffffff");}else release();},[open]);
  useEffect(()=>{let active=true;if(!photos.length){setLoaded([]);return;}Promise.all(photos.map(photo=>loadImage(photo.url))).then(images=>{if(active){setLoaded(images);setError("");}}).catch(()=>{if(active)setError("One of these photos could not be opened. Remove it and try again.");});return()=>{active=false;};},[photos.map(photo=>photo.url).join("|")]);

  const choose=(files?:FileList|null)=>{
    const accepted=Array.from(files||[]).filter(file=>file.type.startsWith("image/")).slice(0,Math.max(0,6-photos.length));
    const next=accepted.map(file=>({id:crypto.randomUUID(),url:URL.createObjectURL(file),name:file.name,zoom:1,x:50,y:50}));
    setPhotos(current=>[...current,...next]);
    if(!selectedId&&next[0])setSelectedId(next[0].id);
  };
  const updatePhoto=(patch:Partial<CollagePhoto>)=>setPhotos(current=>current.map(photo=>photo.id===selectedId?{...photo,...patch}:photo));
  const removePhoto=(id:string)=>setPhotos(current=>{const photo=current.find(item=>item.id===id);if(photo)URL.revokeObjectURL(photo.url);const next=current.filter(item=>item.id!==id);if(id===selectedId)setSelectedId(next[0]?.id||"");return next;});
  const movePhoto=(id:string,direction:-1|1)=>setPhotos(current=>{const index=current.findIndex(photo=>photo.id===id),target=index+direction;if(index<0||target<0||target>=current.length)return current;const next=[...current];[next[index],next[target]]=[next[target],next[index]];return next;});
  const draw=()=>{if(loaded.length!==photos.length||photos.length<2)throw Error("Choose at least two photos");return drawCollageCanvas(loaded,photos,{layout,ratio:collageRatios[ratio],gap,radius,background});};
  useEffect(()=>{if(!canvas.current||loaded.length!==photos.length||photos.length<2)return;const output=draw();canvas.current.width=output.width;canvas.current.height=output.height;canvas.current.getContext("2d")?.drawImage(output,0,0);},[loaded,photos,layout,ratio,gap,radius,background]);
  const download=()=>{try{const link=document.createElement("a");link.download="sahaja-yoga-photo-collage.png";link.href=draw().toDataURL("image/png");link.click();}catch(error){toast.error(error instanceof Error?error.message:"Could not export collage");}};
  const apply=async()=>{setApplying(true);try{const output=draw();const blob=await new Promise<Blob>((resolve,reject)=>output.toBlob(value=>value?resolve(value):reject(Error("Could not create collage")),"image/png"));await onApply(blob);onOpenChange(false);toast.success("Collage applied as one email-safe image");}catch(error){toast.error(error instanceof Error?error.message:"Could not create collage");}finally{setApplying(false);}};

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-6xl"><DialogHeader><DialogTitle className="font-serif text-3xl">Collage Studio</DialogTitle><DialogDescription>Combine 2–6 original photos into one polished image. Choose a layout, reorder the story, and adjust every crop before applying.</DialogDescription></DialogHeader><input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={event=>{choose(event.target.files);event.currentTarget.value="";}}/><div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]"><div><div className="flex min-h-[360px] items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(45deg,#e8ebf1_25%,transparent_25%),linear-gradient(-45deg,#e8ebf1_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e8ebf1_75%),linear-gradient(-45deg,transparent_75%,#e8ebf1_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0] p-4">{photos.length<2?<button type="button" onClick={()=>input.current?.click()} className="flex min-h-72 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#aebfe0] bg-white/85 px-8 text-center text-[#52617d]"><LayoutGrid className="mb-4 size-10 text-[#175cdf]"/><strong className="text-lg text-[#17213f]">Choose 2–6 photos</strong><span className="mt-2 text-sm">JPEG, PNG or WebP originals</span></button>:<canvas ref={canvas} aria-label="Collage preview" className="max-h-[65vh] max-w-full rounded-xl shadow-2xl"/>}</div>{error&&<p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}<div className="mt-4 flex flex-wrap items-center gap-2"><Button variant="outline" onClick={()=>input.current?.click()} disabled={photos.length>=6}><Upload/> Add photos</Button><span className="text-sm text-slate-500">{photos.length}/6 selected · first photo is the featured image</span></div><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{photos.map((photo,index)=><div key={photo.id} onClick={()=>setSelectedId(photo.id)} className={`group relative overflow-hidden rounded-xl border-2 bg-white p-1 transition ${selectedId===photo.id?"border-[#175cdf] shadow-md":"border-transparent"}`}><img src={photo.url} alt="" className="h-24 w-full rounded-lg object-cover"/><div className="absolute inset-x-1 bottom-1 flex items-center justify-between rounded-b-lg bg-black/60 px-1.5 py-1 text-white"><span className="truncate text-xs font-bold">{index+1}. {photo.name}</span><span className="flex"><button type="button" onClick={event=>{event.stopPropagation();movePhoto(photo.id,-1);}} disabled={index===0} className="rounded p-1 hover:bg-white/20 disabled:opacity-30" aria-label="Move photo earlier"><ArrowUp className="size-3"/></button><button type="button" onClick={event=>{event.stopPropagation();movePhoto(photo.id,1);}} disabled={index===photos.length-1} className="rounded p-1 hover:bg-white/20 disabled:opacity-30" aria-label="Move photo later"><ArrowDown className="size-3"/></button><button type="button" onClick={event=>{event.stopPropagation();removePhoto(photo.id);}} className="rounded p-1 hover:bg-white/20" aria-label="Remove photo"><Trash2 className="size-3"/></button></span></div></div>)}</div></div><div className="rounded-2xl border border-[#e2e6ef] bg-[#fbfcfe] p-4"><Field label="Layout"><div className="grid grid-cols-2 gap-2">{([["feature","Feature left"],["editorial","Feature top"],["grid","Balanced grid"],["strip","Film strip"]] as const).map(([value,label])=><Button key={value} type="button" size="sm" variant={layout===value?"default":"outline"} onClick={()=>setLayout(value)}>{label}</Button>)}</div></Field><Field label="Canvas shape"><Select value={ratio} onValueChange={setRatio}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="wide">Wide · 16:9</SelectItem><SelectItem value="landscape">Landscape · 4:3</SelectItem><SelectItem value="square">Square · 1:1</SelectItem><SelectItem value="portrait">Portrait · 4:5</SelectItem></SelectContent></Select></Field><RangeField label="Space between photos" value={gap} min={0} max={36} onChange={setGap}/><RangeField label="Photo corners" value={radius} min={0} max={48} onChange={setRadius}/><Field label="Background"><Input type="color" value={background} onChange={event=>setBackground(event.target.value)}/></Field>{selected&&<div className="mt-5 border-t pt-4"><p className="text-sm font-bold text-[#17213f]">Selected photo crop</p><p className="mt-1 truncate text-xs text-slate-500">{selected.name}</p><RangeField label="Zoom" value={Math.round(selected.zoom*100)} min={100} max={250} onChange={value=>updatePhoto({zoom:value/100})}/><RangeField label="Horizontal focus" value={selected.x} min={0} max={100} onChange={x=>updatePhoto({x})}/><RangeField label="Vertical focus" value={selected.y} min={0} max={100} onChange={y=>updatePhoto({y})}/></div>}</div></div><DialogFooter><Button variant="outline" onClick={()=>onOpenChange(false)}>Cancel</Button><Button variant="outline" onClick={download} disabled={photos.length<2}>Export PNG</Button><Button onClick={apply} disabled={photos.length<2||applying}><Check/>{applying?"Creating collage…":"Apply collage"}</Button></DialogFooter></DialogContent></Dialog>;
}

function drawCollageCanvas(images:HTMLImageElement[],photos:CollagePhoto[],options:{layout:CollageLayout;ratio:number;gap:number;radius:number;background:string}){
  const width=1200,height=Math.round(width/options.ratio),gap=options.gap;
  const output=document.createElement("canvas");output.width=width;output.height=height;
  const context=output.getContext("2d");if(!context)throw Error("Collage editing is unavailable in this browser");
  context.fillStyle=options.background;context.fillRect(0,0,width,height);
  const rects=collageRects(options.layout,images.length,width,height,gap);
  images.forEach((image,index)=>drawCollagePhoto(context,image,photos[index],rects[index],options.radius));
  return output;
}

function collageRects(layout:CollageLayout,count:number,width:number,height:number,gap:number){
  const frame=gap,innerW=width-frame*2,innerH=height-frame*2;
  if(layout==="strip")return Array.from({length:count},(_,index)=>({x:frame+index*(innerW+gap)/count,y:frame,w:(innerW-gap*(count-1))/count,h:innerH}));
  if(layout==="feature"&&count>1){const left=Math.round(innerW*.58),right=innerW-left-gap;return [{x:frame,y:frame,w:left,h:innerH},...Array.from({length:count-1},(_,index)=>({x:frame+left+gap,y:frame+index*(innerH+gap)/(count-1),w:right,h:(innerH-gap*(count-2))/(count-1)}))];}
  if(layout==="editorial"&&count>1){const top=Math.round(innerH*.62),bottom=innerH-top-gap;return [{x:frame,y:frame,w:innerW,h:top},...Array.from({length:count-1},(_,index)=>({x:frame+index*(innerW+gap)/(count-1),y:frame+top+gap,w:(innerW-gap*(count-2))/(count-1),h:bottom}))];}
  const columns=count<=2?count:count===3?3:2,rows=Math.ceil(count/columns),cellW=(innerW-gap*(columns-1))/columns,cellH=(innerH-gap*(rows-1))/rows;
  return Array.from({length:count},(_,index)=>({x:frame+(index%columns)*(cellW+gap),y:frame+Math.floor(index/columns)*(cellH+gap),w:cellW,h:cellH}));
}

function drawCollagePhoto(context:CanvasRenderingContext2D,image:HTMLImageElement,photo:CollagePhoto,rect:{x:number;y:number;w:number;h:number},radius:number){
  const r=Math.min(radius,rect.w/2,rect.h/2);context.save();context.beginPath();context.roundRect(rect.x,rect.y,rect.w,rect.h,r);context.clip();
  const cover=Math.max(rect.w/image.naturalWidth,rect.h/image.naturalHeight)*photo.zoom;
  const sourceW=rect.w/cover,sourceH=rect.h/cover;
  const sourceX=Math.max(0,Math.min(image.naturalWidth-sourceW,(image.naturalWidth-sourceW)*photo.x/100));
  const sourceY=Math.max(0,Math.min(image.naturalHeight-sourceH,(image.naturalHeight-sourceH)*photo.y/100));
  context.drawImage(image,sourceX,sourceY,sourceW,sourceH,rect.x,rect.y,rect.w,rect.h);context.restore();
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
  const previewCanvas = useRef<HTMLCanvasElement>(null);
  const [loadedImage,setLoadedImage]=useState<HTMLImageElement|null>(null);
  const [previewError,setPreviewError]=useState("");
  useEffect(()=>{if(!open)return;let active=true;setLoadedImage(null);setPreviewError("");loadImage(imageUrl).then(img=>{if(active)setLoadedImage(img);}).catch(()=>{if(active)setPreviewError("This website blocks image editing. Choose the original file to continue.");});return()=>{active=false;};},[imageUrl,open]);
  const drawImage=()=>{
    if(!loadedImage)throw Error("Choose an image first");
    return editedCanvas(loadedImage,{ratio,zoom,positionX,positionY,rotation,flipX,flipY,brightness,contrast,saturation,opacity});
  };
  useEffect(()=>{if(!loadedImage||!previewCanvas.current)return;const output=drawImage(),canvas=previewCanvas.current;canvas.width=output.width;canvas.height=output.height;canvas.getContext("2d")?.drawImage(output,0,0);},[loadedImage,ratio,zoom,positionX,positionY,rotation,flipX,flipY,brightness,contrast,saturation,opacity]);
  const download=()=>{try{const a=document.createElement("a");a.download=filename;a.href=drawImage().toDataURL("image/png");a.click();}catch(e){toast.error("Choose the original image before exporting");}};
  const drag = useRef<{ x: number; y: number; positionX: number; positionY: number } | null>(null);

  useEffect(() => { if (open) { setImageUrl(source); setFilename("edited-image.png"); setRatio("landscape"); setZoom(1); setPositionX(50); setPositionY(50); setRotation(0); setFlipX(false); setFlipY(false); setBrightness(100); setContrast(100); setSaturation(100); setOpacity(100); } }, [open, source]);
  useEffect(() => () => { if (imageUrl.startsWith("blob:")) URL.revokeObjectURL(imageUrl); }, [imageUrl]);

  const chooseFile = (file?: File) => { if (!file) return; if (imageUrl.startsWith("blob:")) URL.revokeObjectURL(imageUrl); setImageUrl(URL.createObjectURL(file)); setFilename(file.name.replace(/\.[^.]+$/, "") + "-edited.png"); };
  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => { drag.current = { x: event.clientX, y: event.clientY, positionX, positionY }; event.currentTarget.setPointerCapture(event.pointerId); };
  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => { if (!drag.current) return; const bounds = event.currentTarget.getBoundingClientRect(); setPositionX(Math.max(0, Math.min(100, drag.current.positionX - (event.clientX - drag.current.x) / bounds.width * 100))); setPositionY(Math.max(0, Math.min(100, drag.current.positionY - (event.clientY - drag.current.y) / bounds.height * 100))); };

  const apply = async () => {
    setApplying(true);
    try {
      const output=drawImage();
      const blob = await new Promise<Blob>((resolve, reject) => output.toBlob((value) => value ? resolve(value) : reject(new Error("Could not export image")), "image/png")); await onApply(blob); onOpenChange(false);
    } catch (error) { toast.error(error instanceof Error ? `${error.message}. Upload the original file if its website blocks editing.` : "Could not edit image"); }
    finally { setApplying(false); }
  };

  const aspectRatio = ratios[ratio] || (loadedImage ? (rotation%180?loadedImage.naturalHeight/loadedImage.naturalWidth:loadedImage.naturalWidth/loadedImage.naturalHeight) : 4/3);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-5xl"><DialogHeader><DialogTitle className="font-serif text-3xl">Image studio</DialogTitle><DialogDescription>Crop, place, resize and tune the image here. Applying creates a new edited copy; the original remains untouched.</DialogDescription></DialogHeader><input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(event) => chooseFile(event.target.files?.[0])}/><div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_290px]"><div><div className="relative flex min-h-[340px] items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(45deg,#e8ebf1_25%,transparent_25%),linear-gradient(-45deg,#e8ebf1_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e8ebf1_75%),linear-gradient(-45deg,transparent_75%,#e8ebf1_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0] p-5"><div onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={() => { drag.current = null; }} className="relative w-full max-w-[680px] touch-none cursor-grab overflow-hidden rounded-xl bg-[#17275d] shadow-2xl active:cursor-grabbing" style={{ aspectRatio }}><canvas ref={previewCanvas} aria-label="Exact crop and colour preview" className="absolute inset-0 h-full w-full"/>{previewError&&<p className="relative bg-white p-4 text-sm text-red-600">{previewError}</p>}<div className="pointer-events-none absolute inset-0 border border-white/60"><span className="absolute left-1/3 top-0 h-full border-l border-white/35"/><span className="absolute left-2/3 top-0 h-full border-l border-white/35"/><span className="absolute left-0 top-1/3 w-full border-t border-white/35"/><span className="absolute left-0 top-2/3 w-full border-t border-white/35"/></div></div></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-[#768198]">Drag the image to choose its focal point.</p><Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}><Upload /> Choose original</Button></div></div><div className="rounded-2xl border border-[#e2e6ef] bg-[#fbfcfe] p-4"><Field label="Crop shape"><Select value={ratio} onValueChange={setRatio}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="original">Original</SelectItem><SelectItem value="square">Square · 1:1</SelectItem><SelectItem value="landscape">Landscape · 4:3</SelectItem><SelectItem value="widescreen">Wide · 16:9</SelectItem><SelectItem value="portrait">Portrait · 3:4</SelectItem></SelectContent></Select></Field><RangeField label="Zoom" value={Math.round(zoom * 100)} min={100} max={300} onChange={(value) => setZoom(value / 100)}/><RangeField label="Horizontal position" value={Math.round(positionX)} min={0} max={100} onChange={setPositionX}/><RangeField label="Vertical position" value={Math.round(positionY)} min={0} max={100} onChange={setPositionY}/><div className="mt-4 grid grid-cols-3 gap-2"><Button variant="outline" size="sm" onClick={() => setRotation((rotation + 90) % 360)} aria-label="Rotate"><RotateCw /></Button><Button variant={flipX ? "default" : "outline"} size="sm" onClick={() => setFlipX(!flipX)} aria-label="Flip horizontally"><FlipHorizontal2 /></Button><Button variant={flipY ? "default" : "outline"} size="sm" onClick={() => setFlipY(!flipY)} aria-label="Flip vertically"><FlipVertical2 /></Button></div><div className="my-5 border-t border-[#e2e6ef]"/><RangeField label="Brightness" value={brightness} min={40} max={160} onChange={setBrightness}/><RangeField label="Contrast" value={contrast} min={40} max={160} onChange={setContrast}/><RangeField label="Saturation" value={saturation} min={0} max={200} onChange={setSaturation}/><RangeField label="Opacity" value={opacity} min={0} max={100} onChange={setOpacity}/><Button variant="ghost" className="mt-5 w-full" onClick={() => { setZoom(1); setPositionX(50); setPositionY(50); setRotation(0); setFlipX(false); setFlipY(false); setBrightness(100); setContrast(100); setSaturation(100); setOpacity(100); }}><Crop /> Reset adjustments</Button></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="outline" onClick={download} disabled={!loadedImage}>Export PNG</Button><Button onClick={apply} disabled={!loadedImage || applying}><Check />{applying ? "Creating image…" : `Apply ${filename}`}</Button></DialogFooter></DialogContent></Dialog>;
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); if (!source.startsWith("blob:") && !source.startsWith("data:")) image.crossOrigin = "anonymous"; image.onload = () => resolve(image); image.onerror = () => reject(new Error("The source image could not be loaded for editing")); image.src = source; });
}

function editedCanvas(image:HTMLImageElement,{ratio,zoom,positionX,positionY,rotation,flipX,flipY,brightness,contrast,saturation,opacity}:any){
      const rotated = rotation % 180 !== 0;
      const stage = document.createElement("canvas"); stage.width = rotated ? image.naturalHeight : image.naturalWidth; stage.height = rotated ? image.naturalWidth : image.naturalHeight;
      const stageContext = stage.getContext("2d"); if (!stageContext) throw new Error("Image editing is unavailable in this browser");
      stageContext.translate(stage.width / 2, stage.height / 2); stageContext.rotate(rotation * Math.PI / 180); stageContext.scale(flipX ? -1 : 1, flipY ? -1 : 1); stageContext.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
      const targetRatio = ratios[ratio] || stage.width / stage.height; let cropWidth = stage.width; let cropHeight = cropWidth / targetRatio; if (cropHeight > stage.height) { cropHeight = stage.height; cropWidth = cropHeight * targetRatio; } cropWidth /= zoom; cropHeight /= zoom;
      const sourceX = (stage.width - cropWidth) * positionX / 100; const sourceY = (stage.height - cropHeight) * positionY / 100;
      const output = document.createElement("canvas"); output.width = Math.max(1, Math.round(Math.min(cropWidth, 1600))); output.height = Math.max(1, Math.round(output.width / targetRatio));
      const context = output.getContext("2d"); if (!context) throw new Error("Image editing is unavailable in this browser"); context.clearRect(0, 0, output.width, output.height); context.globalAlpha = opacity / 100; context.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`; context.drawImage(stage, sourceX, sourceY, cropWidth, cropHeight, 0, 0, output.width, output.height);
 return output;
}
