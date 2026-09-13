import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { createOrganiserAuth } from "../lib/organiser-auth.mjs";

test("official SDK uses remote user verification and authenticated RPC; failures never expose the studio", async () => {
  const env = {STUDIO_APP_ORIGIN:"https://studio.example.test",STUDIO_ORGANISER_EMAILS:"bettina@example.test",VITE_SUPABASE_URL:"https://example.supabase.co",VITE_SUPABASE_PUBLISHABLE_KEY:"public-test-fixture"};
  const id="22222222-2222-4222-8222-222222222222", calls=[];
  let invalid=false, rpcMissing=false;
  const auth=createOrganiserAuth({env,client:token=>createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_PUBLISHABLE_KEY,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
    global:{headers:{Authorization:`Bearer ${token}`},fetch:async(input,init)=>{
      const url=new URL(input); calls.push(url.pathname);
      assert.equal(new Headers(init.headers).get("Authorization"),"Bearer opaque-test-token");
      if(url.pathname==="/auth/v1/user") return invalid ? Response.json({code:"bad_jwt",message:"Invalid JWT"},{status:401}) : Response.json({id,email:"bettina@example.test",email_confirmed_at:"2026-09-01T00:00:00Z",user_metadata:{full_name:"Bettina Muller"}});
      if(url.pathname==="/rest/v1/rpc/studio_session_status") return rpcMissing ? Response.json({message:"missing function"},{status:404}) : Response.json({user_id:id,active:true,mfa_required:false,aal:"aal1"});
      throw Error("Unexpected provider request");
    }},
  })});
  const request=()=>new Request(env.STUDIO_APP_ORIGIN+"/api/auth",{headers:{Authorization:"Bearer opaque-test-token"}});
  assert.equal((await auth.handle(request())).status,200);
  assert.deepEqual(calls,["/auth/v1/user","/rest/v1/rpc/studio_session_status"]);
  invalid=true; calls.length=0;
  assert.equal((await auth.handle(request())).status,401);assert.deepEqual(calls,["/auth/v1/user"]);
  invalid=false;rpcMissing=true;assert.equal((await auth.handle(request())).status,503);
});
