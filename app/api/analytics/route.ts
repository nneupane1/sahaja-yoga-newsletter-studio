import { apiError, getDatabase, json, requireAdminApi } from "@/lib/server";
export async function GET(request:Request) {
 const auth=await requireAdminApi();if(auth.response)return auth.response;
 try{
 const db=getDatabase(),id=new URL(request.url).searchParams.get("campaignId")||"";
 const latest=await db.prepare("SELECT id,title,status,recipient_count AS recipientCount,sent_at AS sentAt FROM campaigns WHERE id=?").bind(id).first();
 const events=await db.prepare("SELECT event_type AS eventType,COUNT(*) AS total,COUNT(DISTINCT subscriber_id) AS uniquePeople FROM tracking_events WHERE campaign_id=? GROUP BY event_type").bind(id).all();
 const rsvps=await db.prepare("SELECT COUNT(*) AS total,SUM(status='confirmed') AS confirmed FROM rsvps WHERE campaign_id=? AND status IN ('confirmed','pending')").bind(id).first();
 return json({campaign:latest,events:events.results,rsvps,provider:null,runtime:"web-preview"});
 }catch(e){return apiError(e);}
}
