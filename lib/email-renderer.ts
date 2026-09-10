export type EmailBlock = {
  id: string;
  type: "hero" | "heading" | "text" | "image" | "button" | "divider" | "spacer";
  data: Record<string, string | number>;
};

const esc = (value: unknown) => String(value ?? "").replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char] || char));
const safeUrl = (value: unknown) => {
  try {
    const url = new URL(String(value));
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch { return ""; }
};
const richText = (value: unknown) => esc(value).replace(/\n/g, "<br>");

export async function renderEmail(input: { campaignId: string; subject: string; preheader: string; blocks: EmailBlock[]; baseUrl: string }) {
  const links: Array<{ id: string; label: string; destinationUrl: string; position: number }> = [];
  let position = 0;
  const body: string[] = [];

  for (const block of input.blocks) {
    const data = block.data;
    if (block.type === "hero") {
      const image = safeUrl(data.imageUrl);
      body.push(`<tr><td style="padding:0;background:#17275d;text-align:center">${image ? `<img src="${esc(image)}" width="640" alt="" style="display:block;width:100%;max-width:640px;height:auto">` : ""}<div style="padding:34px 42px 38px;color:#fff"><div style="font:700 12px Arial,sans-serif;letter-spacing:1.4px;text-transform:uppercase;color:#ffc976">${esc(data.eyebrow || "Sahaja Yoga")}</div><h1 style="margin:12px 0 0;font:600 42px Georgia,serif;line-height:1.08">${esc(data.title)}</h1>${data.text ? `<p style="margin:16px 0 0;font:16px Arial,sans-serif;line-height:1.65;color:#dfe7ff">${richText(data.text)}</p>` : ""}</div></td></tr>`);
    } else if (block.type === "heading") {
      body.push(`<tr><td style="padding:28px 42px 8px"><h2 style="margin:0;color:${esc(data.color || "#17213f")};font:600 ${Number(data.size) || 30}px Georgia,serif;line-height:1.2;text-align:${esc(data.align || "left")}">${esc(data.text)}</h2></td></tr>`);
    } else if (block.type === "text") {
      body.push(`<tr><td style="padding:12px 42px;color:${esc(data.color || "#57627a")};font:16px Arial,sans-serif;line-height:1.75;text-align:${esc(data.align || "left")}">${richText(data.text)}</td></tr>`);
    } else if (block.type === "image") {
      const image = safeUrl(data.imageUrl);
      const padding = Math.max(0, Math.min(Number(data.padding) || 0, 56));
      const width = Math.min(Number(data.width) || 556, 640 - padding * 2);
      const opacity = Math.max(0, Math.min(Number(data.opacity ?? 100), 100)) / 100;
      const brightness = Number(data.brightness ?? 100);
      const contrast = Number(data.contrast ?? 100);
      const saturation = Number(data.saturation ?? 100);
      if (image) body.push(`<tr><td style="padding:18px ${padding}px;text-align:${esc(data.align || "center")}"><img src="${esc(image)}" width="${width}" alt="${esc(data.alt)}" style="display:inline-block;width:${width}px;max-width:100%;height:auto;border-radius:${Number(data.radius) || 0}px;opacity:${opacity};filter:brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)"></td></tr>`);
    } else if (block.type === "button") {
      const destinationUrl = safeUrl(data.url);
      if (!destinationUrl) continue;
      const linkId = `lnk_${block.id}`;
      links.push({ id: linkId, label: String(data.label || "Open"), destinationUrl, position: position++ });
      body.push(`<tr><td style="padding:24px 42px;text-align:${esc(data.align || "center")}"><a href="${esc(destinationUrl)}" style="display:inline-block;padding:14px 24px;border-radius:${Number(data.radius) || 12}px;background:${esc(data.background || "#175cdf")};color:${esc(data.color || "#ffffff")};font:700 15px Arial,sans-serif;text-decoration:none">${esc(data.label || "Learn more")}</a></td></tr>`);
    } else if (block.type === "divider") {
      body.push(`<tr><td style="padding:20px 42px"><div style="height:1px;background:${esc(data.color || "#e6eaf1")}"></div></td></tr>`);
    } else if (block.type === "spacer") {
      body.push(`<tr><td height="${Math.min(Number(data.height) || 24, 80)}" style="font-size:0;line-height:0">&nbsp;</td></tr>`);
    }
  }

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(input.subject)}</title></head><body style="margin:0;padding:0;background:#f2f4f8"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(input.preheader)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f4f8"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;background:#fff;border-radius:20px;overflow:hidden">${body.join("")}<tr><td style="padding:30px 42px;text-align:center;background:#f8f9fc;color:#8791a6;font:12px Arial,sans-serif;line-height:1.6">You are receiving this because you subscribed to Sahaja Yoga updates.<br><a href="{$unsubscribe_link}" style="color:#576c9e">Unsubscribe</a></td></tr></table></td></tr></table></body></html>`;
  return { html, links };
}
