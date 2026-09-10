import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {workspacePayload,validatePreferences} from '../lib/workspace-state.mjs';
import {dashboardData} from '../lib/dashboard-data.mjs';
import {renderDocument,safeUrl} from '../lib/newsletter-renderer.mjs';
import {templateCatalog} from '../lib/newsletter-templates.mjs';
import {getSenderStatistics,listAll} from '../lib/sender-statistics.mjs';

test('identity, range and read-state belong to the signed-in profile',()=>{
 const campaigns=[{id:'tour',title:'SY Europe Tour',status:'draft',updatedAt:'2026-09-10'},{id:'old',title:'Old edition',status:'sent',sentAt:'2025-01-01'}];
 const prefs=validatePreferences({displayName:'Bettina Muller',from:'2026-09-01',to:'2026-09-30',campaignId:'tour'});
 const bettina=workspacePayload({userId:'b'},prefs,campaigns);
 assert.equal(bettina.user.initials,'BM');assert.equal(bettina.user.firstName,'Bettina');assert.equal(bettina.campaign.title,'SY Europe Tour');assert.equal(bettina.campaigns.length,1);
 const read=validatePreferences({readIds:[bettina.notifications[0].id]},prefs);
 assert.equal(workspacePayload({userId:'b'},read,campaigns).notifications[0].read,true);
 assert.equal(workspacePayload({userId:'n',displayName:'Nischal Neupane'},{},campaigns).user.initials,'NN');
 assert.throws(()=>validatePreferences({from:'2026-02-31'}));assert.throws(()=>validatePreferences({from:'2026-10-01',to:'2026-09-01'}));
});
for(const flavor of ['desktop','hosted'])test(`${flavor} dashboard isolates campaigns and counts confirmed responses separately`,async()=>{
 const db=new DatabaseSync(':memory:');
 const schema=flavor==='desktop'?readFileSync(new URL('../desktop/local-schema.sql',import.meta.url),'utf8'):readFileSync(new URL('../drizzle/0000_classy_titanium_man.sql',import.meta.url),'utf8');
 db.exec(schema);
 if(flavor==='hosted')db.exec("ALTER TABLE events ADD COLUMN image_url TEXT NOT NULL DEFAULT ''");
 else if(!db.prepare("PRAGMA table_info(events)").all().some(c=>c.name==='image_url'))db.exec("ALTER TABLE events ADD COLUMN image_url TEXT NOT NULL DEFAULT ''");
 const created=flavor==='hosted'?',created_by':'';const owner=flavor==='hosted'?",'organiser'":'';
 db.exec(`INSERT INTO campaigns(id,title,recipient_count,status,content_json${created}) VALUES('a','Tour',10,'sent','[]'${owner}),('b','Other',50,'sent','[]'${owner});INSERT INTO subscribers(id,email,email_hash) VALUES('s','test@example.org','hash');INSERT INTO events(id,title,starts_at) VALUES('e','Music','2027-10-01');INSERT INTO rsvps(id,event_id,campaign_id,status) VALUES('r1','e','a','confirmed'),('r2','e','a','pending'),('r3','e','b','confirmed');INSERT INTO campaign_links(id,campaign_id,label,destination_url) VALUES('l','a','Album','https://photos.app.goo.gl/test');INSERT INTO tracking_events(campaign_id,subscriber_id,event_type,link_id) VALUES('a','s','click','l'),('a','s','click','l'),('a','s','open',NULL),('b','s','click',NULL);`);
 const data=await dashboardData(async(sql,args)=>db.prepare(sql).all(...args),{campaignId:'a',from:'2020-01-01',to:'2030-01-01'});
 assert.equal(data.metrics.sent,10);assert.equal(data.metrics.confirmed,1);assert.equal(data.metrics.rsvps,2);assert.equal(data.metrics.clicked,1);assert.equal(data.topLinks[0].clicks,2);assert.equal(data.topLinks[0].people,1);assert.equal(data.engagement.find(p=>p.name==='Opened only').value,0);assert.equal(data.audience.total,1);
 const empty=await dashboardData(async(sql,args)=>db.prepare(sql).all(...args),{campaignId:'missing'});assert.equal(empty.metrics.sent,0);assert.equal(empty.campaign,null);db.close();
});
test('all template layouts render safely and preserve source-specific album links',()=>{
 const catalog=templateCatalog();assert.equal(catalog.length,4);
 for(const t of catalog){const {html}=renderDocument({subject:t.name,blocks:t.blocks});assert.ok(html.includes('@media'));assert.ok(html.includes('{$unsubscribe_link}'));assert.ok(!html.includes('sahajaonline'));assert.ok(!html.includes('*|MC:SUBJECT|*'));assert.ok(html.includes('<table'));assert.ok(Buffer.byteLength(html)<100000);}
 const journal=catalog.find(t=>t.id==='journal');assert.equal(journal.blocks.filter(b=>b.type==='gallery').length,5);assert.equal(new Set(journal.blocks.map(b=>b.id)).size,journal.blocks.length);
 assert.equal(safeUrl('javascript:alert(1)'), '');
 const bad=renderDocument({subject:'<script>',blocks:[{id:'x',type:'story',data:{title:'<img onerror=x>',text:'<script>',url:'javascript:alert(1)',imageUrl:'javascript:alert(1)',accent:'red;position:fixed'}}]}).html;
 assert.ok(!bad.includes('<script>'));assert.ok(!bad.includes('onerror=x>'));assert.ok(!bad.includes('javascript:'));
});
test('Sender follows all pages sequentially and deduplicates people across interactions',async()=>{
 const calls=[];let active=0,max=0;
 const get=async path=>{calls.push(path);active++;max=Math.max(max,active);await Promise.resolve();active--;if(!path.includes('?'))return {data:{status:'SENT',sent_count:10,sent_time:'2026-09-01'}};if(path.includes('/opens'))return {data:[{recipient_id:'r',email:'a@example.org'}]};if(path.includes('/clicks'))return path.endsWith('page=1')?{data:[{recipient_id:'r',url:'https://example.org/a'}],links:{next:'https://untrusted.invalid/page=2'}}:{data:[{recipient_id:'r',url:'https://example.org/b'}]};return {data:[]};};
 const {report}=await getSenderStatistics(get,{provider_campaign_id:'provider',status:'sent',recipient_count:10});
 assert.equal(report.clicks.unique_clicks,1);assert.equal(report.opens.unique_opens,1);assert.equal(report.emails_sent,10);assert.equal(max,1);assert.ok(calls.some(p=>p.endsWith('/clicks?limit=100&page=2')));assert.ok(calls.every(p=>p.startsWith('campaigns/')));
 await assert.rejects(()=>listAll(async()=>({data:[],has_more_resources:true}),'campaigns/x/clicks'),/empty intermediate/);
});
