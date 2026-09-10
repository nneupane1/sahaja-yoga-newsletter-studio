// Aggregate only saved data. The query adapter works with SQLite and D1.
export async function dashboardData(all, {campaignId="",from,to}={}) {
 const today=new Date().toISOString().slice(0,10);from=from||today.slice(0,7)+"-01";to=to||today;
 const one=async(sql,args=[]) => (await all(sql,args))[0]||{};
 const campaign=campaignId ? await one("SELECT id,title,subject,status,recipient_count AS sent,content_json AS contentJson,sent_at AS sentAt FROM campaigns WHERE id=?",[campaignId]) : {};
 const [audience,growth,counts,rsvps,trend,topLinks,engagement,history,upcoming,cache]=await Promise.all([
  one("SELECT COUNT(*) AS total,COALESCE(SUM(status='subscribed'),0) AS active,COALESCE(SUM(status='unsubscribed'),0) AS unsubscribed,COALESCE(SUM(substr(created_at,1,10) BETWEEN ? AND ?),0) AS newSubscribers FROM subscribers",[from,to]),
  all("SELECT substr(created_at,1,7) AS month,COUNT(*) AS total FROM subscribers GROUP BY month ORDER BY month DESC LIMIT 6",[]),
  all("SELECT event_type AS type,COUNT(*) AS total,COUNT(DISTINCT subscriber_id) AS people FROM tracking_events WHERE campaign_id=? GROUP BY event_type",[campaignId]),
  one("SELECT COUNT(*) AS total,COALESCE(SUM(status='confirmed'),0) AS confirmed FROM rsvps WHERE campaign_id=? AND status IN ('confirmed','pending')",[campaignId]),
  all("SELECT substr(created_at,1,10) AS day,COUNT(*) AS total FROM rsvps WHERE campaign_id=? AND status IN ('confirmed','pending') AND substr(created_at,1,10) BETWEEN ? AND ? GROUP BY day ORDER BY day",[campaignId,from,to]),
  all("SELECT l.id,l.label,l.destination_url AS url,COUNT(t.id) AS clicks,COUNT(DISTINCT t.subscriber_id) AS people FROM campaign_links l LEFT JOIN tracking_events t ON t.link_id=l.id AND t.event_type='click' AND t.campaign_id=l.campaign_id WHERE l.campaign_id=? GROUP BY l.id ORDER BY clicks DESC,l.position LIMIT 100",[campaignId]),
  all("SELECT subscriber_id AS id,MAX(event_type='click') AS clicked,MAX(event_type='open') AS opened FROM tracking_events WHERE campaign_id=? AND subscriber_id IS NOT NULL GROUP BY subscriber_id",[campaignId]),
  all("SELECT c.id,c.title,c.status,c.recipient_count AS sent,c.sent_at AS sentAt,c.updated_at AS updatedAt,(SELECT COUNT(DISTINCT subscriber_id) FROM tracking_events WHERE campaign_id=c.id AND event_type='open') AS opened,(SELECT COUNT(DISTINCT subscriber_id) FROM tracking_events WHERE campaign_id=c.id AND event_type='click') AS clicked,(SELECT COUNT(*) FROM rsvps WHERE campaign_id=c.id AND status='confirmed') AS confirmed FROM campaigns c WHERE substr(COALESCE(c.sent_at,c.scheduled_at,c.updated_at),1,10) BETWEEN ? AND ? ORDER BY COALESCE(c.sent_at,c.updated_at) DESC LIMIT 20",[from,to]),
  all("SELECT id,title,starts_at AS startsAt,location FROM events WHERE julianday(starts_at)>=julianday('now') ORDER BY starts_at LIMIT 6",[]),
  one("SELECT value FROM settings WHERE key=?",["report:"+campaignId])
 ]);
 const map=Object.fromEntries(counts.map(c=>[c.type,c]));
 let report=null;try{report=cache.value?JSON.parse(cache.value):null;}catch{}
 const metrics={sent:Number(report?.emails_sent??campaign.sent??0),delivered:report?.delivered??(map.delivered?Number(map.delivered.people||map.delivered.total):null),opened:Number(map.open?.people||report?.opens?.unique_opens||0),clicked:Number(map.click?.people||report?.clicks?.unique_clicks||0),rsvps:Number(rsvps.total||0),confirmed:Number(rsvps.confirmed||0)};
 const clickedPeople=engagement.filter(p=>p.clicked).length,openedOnly=engagement.filter(p=>p.opened&&!p.clicked).length;
 const known=Math.max(metrics.sent,clickedPeople+openedOnly);
 let running=0;
 let blocks=[];try{blocks=JSON.parse(campaign.contentJson||"[]");}catch{}
 const content=blocks.filter(b=>["hero","story","gallery","button"].includes(b.type)).map(b=>{const link=topLinks.find(l=>l.id===`lnk_${campaignId}_${b.id}`||l.id===`lnk_${b.id}`);return {id:b.id,title:b.data.title||b.data.label||({hero:"Cover story",gallery:"Photo gallery"}[b.type])||"Story",image:b.data.imageUrl||"",type:b.type,clicks:link?Number(link.clicks):null,url:link?.url||null};});
 return {campaign:campaign.id?{id:campaign.id,title:campaign.title,status:campaign.status}:null,metrics,audience,growth:growth.reverse(),trend:trend.map(p=>({...p,rsvps:running+=Number(p.total)})),topLinks,content,engagement:[{name:"Clicked",value:clickedPeople,color:"#175cdf"},{name:"Opened only",value:openedOnly,color:"#51a8f2"},{name:"No tracked interaction",value:Math.max(0,known-clickedPeople-openedOnly),color:"#dbe2ed"}],history,upcoming,syncedAt:report?.syncedAt||null,range:{from,to}};
}
