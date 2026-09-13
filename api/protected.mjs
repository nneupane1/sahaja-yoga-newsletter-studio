import { nodeAuthHandler, organiserAuth } from "../lib/vercel-auth.mjs";
import { authErrorResponse, privateJson } from "../lib/organiser-auth.mjs";
// No unauthenticated fallback to sample data, private records or sending routes.
export default nodeAuthHandler(async request => {
  try { await organiserAuth.requireOrganiser(request); }
  catch (error) { return authErrorResponse(error); }
  return privateJson({ code: "LOCAL_WORKSPACE_ONLY", error: "This workspace stores its drafts in your browser. No email is sent by this endpoint." }, 404);
});
