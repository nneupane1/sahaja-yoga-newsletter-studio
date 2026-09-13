import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("real PostgreSQL migration enforces session revocation, MFA and restricted grants", async () => {
  const db = new PGlite();
  const n = "11111111-1111-4111-8111-111111111111", b = "22222222-2222-4222-8222-222222222222";
  const ns = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", bs = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  try {
    // Supabase-owned schemas/functions are fixtures; application SQL below is
    // the exact migration that will run in the hosted PostgreSQL project.
    await db.exec(`create role anon; create role authenticated;
      create schema auth;
      create table auth.users(id uuid primary key);
      create table auth.sessions(id uuid primary key, user_id uuid, not_after timestamptz);
      create table auth.mfa_factors(id uuid primary key, user_id uuid, status text);
      create function auth.jwt() returns jsonb language sql as $$ select nullif(current_setting('request.jwt.claims',true),'')::jsonb $$;
      create function auth.uid() returns uuid language sql as $$ select (auth.jwt()->>'sub')::uuid $$;
      insert into auth.users values ('${n}'),('${b}');
      insert into auth.sessions values ('${ns}','${n}',null),('${bs}','${b}',null);`);
    await db.exec(await readFile(new URL("../supabase/migrations/202609130001_studio_sessions.sql", import.meta.url), "utf8"));
    // Migration can be safely applied again.
    await db.exec(await readFile(new URL("../supabase/migrations/202609130001_studio_sessions.sql", import.meta.url), "utf8"));
    const claims = (user, session, aal="aal1") => db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({sub:user,session_id:session,aal})]);
    const status = async () => (await db.query("select public.studio_session_status() as status")).rows[0].status;
    await db.exec("set role anon");
    await assert.rejects(()=>status(), /permission denied/);
    await assert.rejects(()=>db.query("select public.studio_revoke_session()"), /permission denied/);
    await db.exec("set role authenticated");
    await assert.rejects(()=>db.query("select * from public.studio_revoked_sessions"), /permission denied/);
    await assert.rejects(()=>db.query(`insert into public.studio_revoked_sessions(user_id,session_id) values ('${b}','${bs}')`), /permission denied/);
    await claims(n,ns); assert.equal((await status()).active,true);
    await claims(n,bs); assert.equal((await status()).active,false);
    await db.query("select public.studio_revoke_session()");
    await claims(b,bs); assert.equal((await status()).active,true);
    await claims(n,ns); await db.query("select public.studio_revoke_session()");
    assert.equal((await status()).active,false);
    await db.query("select public.studio_revoke_session()"); // idempotent logout
    await claims(b,bs); assert.equal((await status()).active,true);
    await db.exec("reset role");
    await db.query("insert into auth.mfa_factors values ($1,$2,'verified')",[ns,b]);
    await db.exec("set role authenticated");
    assert.equal((await status()).mfa_required,true); assert.equal((await status()).aal,"aal1");
    await claims(b,bs,"aal2"); assert.equal((await status()).aal,"aal2");
    await db.exec("reset role");
    await db.query("update auth.sessions set not_after = now() - interval '1 second' where id=$1",[bs]);
    await db.exec("set role authenticated"); assert.equal((await status()).active,false);
    await db.exec("reset role"); await db.query("delete from auth.sessions where id=$1",[bs]);
    await db.exec("set role authenticated"); assert.equal((await status()).active,false);
  } finally { await db.close(); }
});
