import { apiError, getDatabase, json, requireAdminApi } from "@/lib/server";
import { dashboardData } from "@/lib/dashboard-data.mjs";
import { validatePreferences } from "@/lib/workspace-state.mjs";
export async function GET(request:Request){
 const auth=await requireAdminApi();if(auth.response)return auth.response;
 try{const params=Object.fromEntries(new URL(request.url).searchParams);const options=validatePreferences(params);const db=getDatabase();return json(await dashboardData(async(sql:string,args:unknown[])=>{const r=await db.prepare(sql).bind(...args).all();return r.results;},options));}catch(e){return apiError(e);}
}
