export type EmailBlock = {
  id: string;
  type: "hero" | "heading" | "text" | "image" | "button" | "divider" | "spacer" | "story" | "gallery";
  data: Record<string, string | number>;
};

import { renderDocument } from "./newsletter-renderer.mjs";
export async function renderEmail(input: { campaignId: string; subject: string; preheader: string; blocks: EmailBlock[]; baseUrl: string }) { const rendered=renderDocument(input);return {...rendered,links:rendered.links.map(link=>({...link,id:link.id.replace("lnk_",`lnk_${input.campaignId}_`)}))}; }
