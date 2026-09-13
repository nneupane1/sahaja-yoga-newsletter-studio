import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

test("image service worker authorises the owning account before touching IndexedDB", async () => {
  const source = await readFile(new URL("../share/asset-worker.js", import.meta.url), "utf8");
  const userId = "11111111-1111-4111-8111-111111111111";
  let valid = true, identity = userId;
  const opened = [], listeners = {};
  class Channel {
    constructor() {
      this.port1 = { onmessage: null, close() {} };
      this.port2 = { postMessage: data => queueMicrotask(()=>this.port1.onmessage({data})), close(){} };
    }
  }
  const client = {id:"tab", postMessage: (_,ports)=>ports[0].postMessage({token:"verified-by-server"})};
  vm.runInNewContext(source, {
    self: {addEventListener:(name,fn)=>listeners[name]=fn,location:{origin:"https://studio.example.test"},clients:{get:async()=>client,matchAll:async()=>[client]}},
    MessageChannel: Channel, URL, Response, AbortSignal, setTimeout, clearTimeout,
    fetch: async (_,init)=>{assert.equal(init.headers.Authorization,"Bearer verified-by-server");return Response.json({user:{userId:identity}},{status:valid?200:401});},
    indexedDB: {open(name) {opened.push(name); const open={result:{close(){},transaction(){return {objectStore(){return {get(){const get={result:new Blob(["image"],{type:"image/png"})};queueMicrotask(()=>get.onsuccess());return get;}};}};}}};queueMicrotask(()=>open.onsuccess());return open;}},
  });
  const get = account => new Promise(resolve=>listeners.fetch({request:new Request(`https://studio.example.test/api/assets/photo-1${account ? '?account='+account : ''}`),clientId:"tab",respondWith: result=>resolve(result)}));
  assert.equal((await get(null)).status,401); assert.equal(opened.length,0);
  identity="22222222-2222-4222-8222-222222222222";
  assert.equal((await get(userId)).status,401); assert.equal(opened.length,0);
  identity=userId; const response=await get(userId);
  assert.equal(response.status,200); assert.equal(await response.text(),"image");
  assert.equal(opened[0],`sy-newsletter-account-${userId}-v1`);
  valid=false; assert.equal((await get(userId)).status,401); assert.equal(opened.length,1);
});
