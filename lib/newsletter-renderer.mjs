// Shared by the browser preview, hosted API and Electron sender.
export const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const n = (v, fallback, min=0, max=640) => Math.max(min, Math.min(max, Number.isFinite(Number(v)) ? Number(v) : fallback));
const colour = (v, fallback) => /^#[\da-f]{3,8}$/i.test(String(v)) ? v : fallback;
const align = v => ["left","center","right"].includes(v) ? v : "left";
export function safeUrl(value, local=false) {
 const s=String(value||"");
 if(local && /^\/api\/assets\/[a-zA-Z0-9_-]+$/.test(s)) return s;
 try { const u=new URL(s); return ["https:","http:"].includes(u.protocol) ? u.href : ""; } catch { return ""; }
}
const text = v => esc(v).replace(/\n/g,"<br>");
function photo(d, key="imageUrl", width=556) {
 const src=safeUrl(d[key],true); if(!src)return "";
 return `<img src="${esc(src)}" width="${width}" alt="${esc(d[key+"Alt"] || d.alt || "")}" style="display:block;width:100%;max-width:${width}px;height:auto;border:0;border-radius:${n(d.radius,8,0,32)}px;opacity:${n(d.opacity,100,0,100)/100};filter:brightness(${n(d.brightness,100,40,160)}%) contrast(${n(d.contrast,100,40,160)}%) saturate(${n(d.saturation,100,0,200)}%)">`;
}
function button(d) {
 const url=safeUrl(d.url);return url ? `<a href="${esc(url)}" style="display:inline-block;padding:14px 22px;background:${colour(d.background,"#175cdf")};color:${colour(d.color,"#ffffff")};border-radius:${n(d.radius,6,0,28)}px;font:700 15px Arial,sans-serif;text-decoration:none">${esc(d.label || "Mehr erfahren")}</a>` : "";
}
export function renderBlock(block) {
 const d=block.data||{}, accent=colour(d.accent,"#175cdf");
 const wrap=body=>`<tr><td class="email-pad" style="padding:20px 36px">${body}</td></tr>`;
 if(block.type==="hero")return `<tr><td style="background:${colour(d.background,"#17275d")};color:#fff">${photo(d,"imageUrl",640)}<div class="email-pad" style="padding:36px"><p style="font:700 12px Arial;letter-spacing:2px;color:#f2ca85">${esc(d.eyebrow||"Sahaja Yoga")}</p><h1 style="font:500 38px Georgia;line-height:1.15;margin:14px 0">${text(d.title)}</h1><p style="font:17px Arial;line-height:1.7;color:#e4eaf6">${text(d.text)}</p></div></td></tr>`;
 if(block.type==="heading")return wrap(`<h2 style="margin:4px 0;color:${colour(d.color,"#17213f")};font:500 ${n(d.size,30,20,48)}px Georgia;text-align:${align(d.align)}">${esc(d.text)}</h2>`);
 if(block.type==="text")return wrap(`<div style="font:16px Arial;line-height:1.8;color:${colour(d.color,"#46536b")};text-align:${align(d.align)}">${text(d.text)}</div>`);
 if(block.type==="image"){const pad=n(d.padding,36,0,56),width=n(d.width,556,120,640-pad*2);return `<tr><td style="padding:16px ${pad}px" align="${align(d.align)}"><div style="max-width:${width}px">${photo(d,"imageUrl",width)}</div></td></tr>`;}
 if(block.type==="button")return wrap(`<div style="text-align:${align(d.align)}">${button(d)}</div>`);
 if(block.type==="divider")return wrap(`<div style="border-top:1px solid ${colour(d.color,"#e2e7ef")}"></div>`);
 if(block.type==="spacer")return `<tr><td height="${n(d.height,24,8,80)}">&nbsp;</td></tr>`;
 if(block.type==="story"){
  const copy=`<p style="font:700 12px Arial;letter-spacing:1px;color:${accent};margin:0 0 10px">${esc(d.meta)}</p><h2 style="font:500 28px Georgia;line-height:1.25;color:#17213f;margin:0 0 16px">${esc(d.title)}</h2><div style="font:16px Arial;line-height:1.8;color:#46536b">${text(d.text)}</div>${d.url ? `<p style="margin:22px 0 0">${button({...d,background:accent})}</p>`:""}`;
  const img=`${photo(d)}${d.caption ? `<p style="font:12px Arial;line-height:1.5;color:#6c778b">${esc(d.caption)}</p>`:""}`;
  if(["left","right"].includes(d.layout) && safeUrl(d.imageUrl,true)){
   const cells=[`<td class="stack" valign="top" width="42%" style="padding:0 12px 16px 0">${img}</td>`,`<td class="stack" valign="top" width="58%" style="padding:0 0 16px 12px">${copy}</td>`];
   if(d.layout==="right")cells.reverse();
   return wrap(`<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>${cells.join("")}</tr></table>`);
  }
  return wrap(d.layout==="below" ? copy+img : img+copy);
 }
 if(block.type==="gallery"){
  const keys=["imageUrl","image2","image3"].filter(k=>safeUrl(d[k],true));
  return wrap(`<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>${keys.map(k=>`<td class="stack" valign="top" width="${Math.floor(100/keys.length)}%" style="padding:4px">${photo(d,k,Math.floor(556/keys.length))}${d[k+"Caption"] ? `<p style="font:12px Arial;color:#6c778b;line-height:1.5">${esc(d[k+"Caption"])}</p>`:""}</td>`).join("")}</tr></table>${d.url ? `<p style="text-align:center">${button(d)}</p>`:""}`);
 }
 return "";
}
/** @param {{subject?:string,preheader?:string,blocks?:Array<{id:string,type:string,data:Record<string,string|number>}>}} input */
export function renderDocument({subject="",preheader="",blocks=[]}) {
 const theme=blocks.find(b=>b.type==="hero")?.data||{};
 const html=`<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title><style>@media(max-width:600px){.stack{display:block!important;width:100%!important;padding:8px 0!important}.stack img{max-width:100%!important}.email-pad{padding:20px!important}h1{font-size:30px!important}}</style></head><body style="margin:0;background:${colour(theme.pageBackground,"#eef1f6")}"><div style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 8px"><table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;background:${colour(theme.surfaceBackground,"#ffffff")}">${blocks.map(renderBlock).join("")}<tr><td class="email-pad" style="padding:32px 36px;background:#f4f6fa;font:13px Arial;line-height:1.7;color:#68738a">Sahaja Yoga Kultur e.V.<br>Am Lilienberg 2a · 81669 München<br><a href="https://www.meditationmuenchen.org/" style="color:#435f9b">Kontakt &amp; Informationen</a> · <a href="https://www.meditationmuenchen.org/datenschutz/" style="color:#435f9b">Datenschutz</a><br>Du erhältst diese E-Mail, weil du unsere Neuigkeiten abonniert hast.<br><a href="{$unsubscribe_link}" style="color:#435f9b">Abmelden</a></td></tr></table></td></tr></table></body></html>`;
 const links=[];for(const b of blocks){const url=safeUrl(b.data?.url);if(url)links.push({id:`lnk_${b.id}`,label:String(b.data.label||b.data.title||"Link"),destinationUrl:url,position:links.length});}
 return {html,links};
}

