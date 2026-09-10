import { apiError, getDatabase, json, requireAdminApi } from "@/lib/server";
import { validatePreferences, workspacePayload } from "@/lib/workspace-state.mjs";
async function handle(request: Request) {
 const auth=await requireAdminApi();if(auth.response)return auth.response;
 try {
 const db=getDatabase(), key="workspace:"+auth.user!.userId;
 const row=await db.prepare("SELECT value FROM settings WHERE key=?").bind(key).first<{value:string}>();
 let prefs=row?JSON.parse(row.value):{};
 if(request.method==="PATCH"){
  prefs=validatePreferences(await request.json(),prefs);
  await db.prepare("INSERT INTO settings (key,value,updated_by) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP").bind(key,JSON.stringify(prefs),auth.user!.userId).run();
 }
 const campaigns=await db.prepare("SELECT id,title,subject,status,recipient_count AS recipientCount,sent_at AS sentAt,scheduled_at AS scheduledAt,updated_at AS updatedAt FROM campaigns ORDER BY updated_at DESC LIMIT 500").all();
 const events=await db.prepare("SELECT id,title,starts_at AS startsAt FROM events WHERE starts_at>=CURRENT_TIMESTAMP ORDER BY starts_at LIMIT 20").all();
 return json(workspacePayload(auth.user,prefs,campaigns.results,events.results));
 }catch(error){return apiError(error);}
}
export const GET=handle;
export const PATCH=handle;
