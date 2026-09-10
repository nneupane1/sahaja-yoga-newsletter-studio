"use client";
import { useState } from "react";
import { Bell, CalendarDays, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
type Props={workspace:any; update:(patch:any)=>Promise<void>; open:(id:string)=>void; events:()=>void};
export function WorkspaceControls({workspace,update,open,events}:Props){
 const [panel,setPanel]=useState<"date"|"notifications"|"profile"|null>(null);
 const [from,setFrom]=useState(""),[to,setTo]=useState(""),[name,setName]=useState("");
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const unread=workspace?.notifications?.filter((n:any)=>!n.read).length||0;
 async function save(patch:any){setBusy(true);setError("");try{await update(patch);setPanel(null);}catch(e){setError(e instanceof Error?e.message:"Could not save");}finally{setBusy(false);}}
 return <>
 <Button variant="outline" aria-label="Choose reporting period" className="flex" onClick={()=>{setFrom(workspace?.preferences.from||"");setTo(workspace?.preferences.to||"");setError("");setPanel("date");}}><CalendarDays/><span className="hidden lg:inline">{workspace?.preferences.from} – {workspace?.preferences.to}</span><ChevronDown/></Button>
 <Button variant="outline" size="icon" aria-label={`Notifications, ${unread} unread`} className="relative" onClick={()=>setPanel("notifications")}><Bell/>{unread>0&&<span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-xs text-white">{unread}</span>}</Button>
 <button className="studio-profile flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-blue-800" aria-label="Your organiser profile" title={workspace?.user.displayName||"Your profile"} onClick={()=>{setName(workspace?.user.displayName||"");setError("");setPanel("profile");}}><span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-[#3e85ff] to-[#1353d1] text-sm font-bold text-white">{workspace?.user.initials||"…"}</span><span className="hidden text-left lg:block"><b className="block text-sm">{workspace?.user.displayName||"Organiser"}</b><span className="block text-xs text-slate-500">Organiser</span></span><ChevronDown className="size-3"/></button>
 <Dialog open={panel!==null} onOpenChange={o=>!o&&setPanel(null)}><DialogContent className="max-h-[85vh] overflow-auto"><DialogHeader><DialogTitle>{panel==="date"?"Reporting period":panel==="profile"?"Your organiser profile":"Notifications"}</DialogTitle><DialogDescription>{panel==="date"?"Choose which campaigns appear in the dashboard. Delivery totals remain campaign lifetime totals.":panel==="profile"?"Your preferred name is saved for this signed-in account.":"Updates from your saved campaigns and upcoming events."}</DialogDescription></DialogHeader>
 {panel==="date"&&<><label>From<Input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>To<Input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label><div className="flex gap-2">{[7,30,90].map(days=><Button key={days} variant="outline" onClick={()=>{const end=new Date(),start=new Date(end);start.setDate(start.getDate()-days+1);setFrom(start.toISOString().slice(0,10));setTo(end.toISOString().slice(0,10));}}>{days} days</Button>)}</div><Button disabled={busy||!from||!to} onClick={()=>save({from,to,campaignId:""})}>Apply period</Button></>}
 {panel==="profile"&&<><p className="text-sm text-slate-500">{workspace?.user.email||workspace?.user.identitySource}</p><label>Full display name<Input value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/></label><Button disabled={busy||!name.trim()} onClick={()=>save({displayName:name})}>Save profile</Button></>}
 {panel==="notifications"&&<><Button variant="outline" disabled={!unread||busy} onClick={()=>save({readIds:workspace.notifications.map((n:any)=>n.id)})}><Check/>Mark all read</Button>{!workspace?.notifications?.length&&<p className="py-8 text-center text-slate-500">You're all caught up. Saved campaign activity will appear here.</p>}{workspace?.notifications?.map((n:any)=><button key={n.id} className={`rounded-xl border p-4 text-left ${n.read?"bg-white":"bg-blue-50"}`} onClick={async()=>{try{await update({readIds:[n.id]});setPanel(null);n.campaignId?open(n.campaignId):events();}catch(e){setError("Could not update notification");}}}><p className="font-semibold">{n.title}</p><p className="mt-1 text-sm text-slate-500">{n.message}</p></button>)}</>}
 {error&&<p role="alert" className="text-sm text-red-600">{error}</p>}
 </DialogContent></Dialog>
 </>;
}

