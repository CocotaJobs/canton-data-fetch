import type { VercelRequest, VercelResponse } from "@vercel/node";

function setCors(res: VercelResponse): VercelResponse {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type, x-api-key");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  return res;
}

function validateApiKey(req: VercelRequest): boolean {
  const clientKey = req.headers["x-api-key"];
  const serverKey = process.env.APP_API_KEY;
  if (!serverKey) return true;
  return clientKey === serverKey;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!validateApiKey(req)) {
    const hasServerKey = !!process.env.APP_API_KEY;
    const clientKey = (req.headers["x-api-key"] as string) || "";
    const hint = hasServerKey
      ? `x-api-key recebida (${clientKey.slice(0, 4)}…) não corresponde a APP_API_KEY (${process.env.APP_API_KEY!.slice(0, 4)}…).`
      : "APP_API_KEY não está definida nas env vars da Vercel (modo aberto desativado).";
    console.error(`Auth failed: ${hint}`);
    return res.status(401).json({
      error: `Unauthorized: ${hint} Verifique VITE_APP_API_KEY no frontend e APP_API_KEY nas env vars da Vercel.`,
    });
  }

  try {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }

    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "FIRECRAWL_API_KEY não configurada nas env vars da Vercel." });
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data.error || `Firecrawl error: ${response.status}`,
      });
    }

    const markdown = data.data?.markdown || data.markdown || "";
    const metadata = data.data?.metadata || data.metadata || {};

    return res.status(200).json({
      success: true,
      markdown,
      title: metadata.title || "",
      description: metadata.description || "",
      sourceURL: metadata.sourceURL || formattedUrl,
    });
  } catch (error: any) {
    console.error("Scrape error:", error);
    return res.status(500).json({ error: error.message || "Failed to scrape" });
  }
}
