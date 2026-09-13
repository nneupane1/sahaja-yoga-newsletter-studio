import { nodeAuthHandler, organiserAuth } from "../lib/vercel-auth.mjs";
export default nodeAuthHandler(request => organiserAuth.handle(request));
