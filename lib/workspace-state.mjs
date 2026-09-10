export const defaultRange=()=>{const end=new Date(),start=new Date(end);start.setDate(start.getDate()-29);return {from:start.toISOString().slice(0,10),to:end.toISOString().slice(0,10)};};
export function validatePreferences(input,current={}) {
 if(!input||typeof input!=="object"||Array.isArray(input))throw Error("Invalid preferences");
 const out={...current};
 if("displayName" in input){if(typeof input.displayName!=="string"||!input.displayName.trim())throw Error("Enter your name");out.displayName=input.displayName.trim().slice(0,100);}
 for(const key of ["from","to"])if(key in input){if(!/^\d{4}-\d{2}-\d{2}$/.test(input[key])||Number.isNaN(Date.parse(input[key]))||new Date(input[key]).toISOString().slice(0,10)!==input[key])throw Error("Choose valid dates");out[key]=input[key];}
 if(out.from && out.to && out.from>out.to)throw Error("Start date must precede end date");
 if("campaignId" in input)out.campaignId=String(input.campaignId||"").slice(0,100);
 if("readIds" in input){if(!Array.isArray(input.readIds))throw Error("Invalid notifications");out.readIds=[...new Set([...(current.readIds||[]),...input.readIds.filter(v=>typeof v==="string")])].slice(-500);}
 return out;
}
export function workspacePayload(user,prefs,campaigns,events=[]) {
 const range={...defaultRange(),...prefs};
 const name=prefs.displayName||user.fullName||user.displayName||user.name||user.email?.split("@")[0]||"Organiser";
 const words=name.trim().split(/\s+/);
 const identity={...user,displayName:name,firstName:words[0],initials:(words.length>1 ? words[0][0]+words.at(-1)[0] : words[0].slice(0,2)).toUpperCase()};
 const filtered=campaigns.filter(c=>{const day=String(c.sentAt||c.scheduledAt||c.updatedAt||"").slice(0,10);return day>=range.from && day<=range.to;});
 const selected=filtered.find(c=>c.id===prefs.campaignId)||filtered[0]||null;
 const notices=campaigns.slice(0,30).map(c=>({id:c.id+":"+c.status+":"+c.updatedAt,title:c.title,message:c.status==="draft"?"Draft ready to continue":c.status==="scheduled"?"Scheduled for "+c.scheduledAt:"Campaign status: "+c.status,campaignId:c.id,view:"editor",date:c.updatedAt}));
 for(const e of events)notices.push({id:"event:"+e.id+":"+e.startsAt,title:e.title,message:"Upcoming · "+e.startsAt,campaignId:"",view:"events",date:e.startsAt});
 return {user:identity,preferences:{...range,campaignId:selected?.id||""},campaigns:filtered,campaign:selected,notifications:notices.map(n=>({...n,read:(prefs.readIds||[]).includes(n.id)}))};
}

