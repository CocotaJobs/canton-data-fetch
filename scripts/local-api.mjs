import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { URL } from "node:url";

const PORT = Number(process.env.PORT || 3000);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const fileContents = fs.readFileSync(filePath, "utf8");
  for (const line of fileContents.split(/\r?\n/)) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) continue;

    const separatorIndex = trimmedLine.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1).trim();
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const projectRoot = process.cwd();
loadEnvFile(path.join(projectRoot, ".env"));
loadEnvFile(path.join(projectRoot, ".env.local"));

const routeModules = {
  "/api/ai-match": () => import("../api/ai-match.ts"),
  "/api/crawl-suppliers": () => import("../api/crawl-suppliers.ts"),
  "/api/scrape-website": () => import("../api/scrape-website.ts"),
};

function parseBody(rawBody, contentType) {
  if (!rawBody) return {};

  if ((contentType || "").includes("application/json")) {
    return JSON.parse(rawBody);
  }

  if ((contentType || "").includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(rawBody);
    return Object.fromEntries(params.entries());
  }

  return rawBody;
}

function attachVercelHelpers(res) {
  const response = res;

  response.status = (code) => {
    response.statusCode = code;
    return response;
  };

  response.json = (payload) => {
    if (!response.headersSent) {
      response.setHeader("Content-Type", "application/json; charset=utf-8");
    }
    response.end(JSON.stringify(payload));
    return response;
  };

  response.send = (payload) => {
    if (typeof payload === "object" && payload !== null && !Buffer.isBuffer(payload)) {
      return response.json(payload);
    }

    response.end(payload);
    return response;
  };

  return response;
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || `localhost:${PORT}`}`);
  const loadRoute = routeModules[requestUrl.pathname];

  if (!loadRoute) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Route not found" }));
    return;
  }

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const rawBody = Buffer.concat(chunks).toString("utf8");
    const body = parseBody(rawBody, req.headers["content-type"]);
    const request = req;
    request.body = body;
    request.query = Object.fromEntries(requestUrl.searchParams.entries());

    const response = attachVercelHelpers(res);
    const module = await loadRoute();
    await module.default(request, response);
  } catch (error) {
    console.error("Local API error:", error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
    }
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }));
  }
});

server.listen(PORT, () => {
  console.log(`[local-api] listening on http://localhost:${PORT}`);
});
