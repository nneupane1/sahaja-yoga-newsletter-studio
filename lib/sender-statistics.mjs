// Sequential pagination uses the existing throttled Sender client. Never follow
// a provider-supplied hostname with the API bearer token.
export async function listAll(get, endpoint) {
 const rows=[];
 for(let page=1;page<=2000;page++){
  const result=await get(`${endpoint}?limit=100&page=${page}`);
  const items=Array.isArray(result?.data)?result.data:result?.data?[result.data]:[];
  rows.push(...items);
  const more=Boolean(result?.has_more_resources||result?.links?.next||Number(result?.meta?.last_page)>page);
  if(!more)return rows;
  if(!items.length)throw Error("Sender returned an empty intermediate page. Previous statistics were retained.");
 }
 throw Error("Sender report exceeded the paging limit. Previous statistics were retained.");
}
export const personKey=row=>String(row.recipient_id||row.email||"");
export async function getSenderStatistics(get,campaign){
 const endpoint=`campaigns/${encodeURIComponent(campaign.provider_campaign_id)}`;
 const details=await get(endpoint),raw={};
 for(const kind of ["opens","clicks","hard_bounces","soft_bounces","unsubscribes"])raw[kind]=await listAll(get,`${endpoint}/${kind}`);
 const unique=rows=>new Set(rows.map(personKey).filter(Boolean)).size;
 const item=details.data||{},sent=Number(item.sent_count??campaign.recipient_count??0);
 const bounced=unique([...raw.hard_bounces,...raw.soft_bounces]);
 const delivered=Math.max(0,sent-bounced),opened=unique(raw.opens),clicked=unique(raw.clicks);
 return {raw,status:String(item.status||campaign.status).toLowerCase(),sentAt:item.sent_time||campaign.sent_at,report:{provider:"Sender",syncedAt:new Date().toISOString(),emails_sent:sent,delivered,opens:{unique_opens:opened,open_rate:delivered?opened/delivered:0},clicks:{unique_clicks:clicked,click_rate:delivered?clicked/delivered:0,items:raw.clicks},bounces:{hard_bounces:unique(raw.hard_bounces),soft_bounces:unique(raw.soft_bounces)},unsubscribed:unique(raw.unsubscribes),rsvpClicks:unique(raw.clicks.filter(e=>/rsvp|anmeld|register|eventbrite|forms\.gle|docs\.google\.com\/forms/i.test(e.url||"")))}};
}
export function canonicalLink(value){try{return new URL(/^https?:\/\//i.test(value)?value:`https://${value}`).href.replace(/\/$/,"");}catch{return "";}}
