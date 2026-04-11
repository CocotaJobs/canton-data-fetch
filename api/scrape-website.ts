import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  buildCantonFairApiRequest,
  buildCantonFairCategoryListRequest,
  buildCantonFairSearchMatchPattern,
  buildCantonFairSearchRootUrl,
  buildCantonFairSearchUrlForCategory,
  isCantonFairSearchUrl,
  parseCantonFairSearchUrl,
} from "../src/lib/canton-fair.ts";

const FIRECRAWL_API_BASE = "https://api.firecrawl.dev/v1";
const CANTON_FAIR_SEARCH_API_BASE = "https://appservice.cantonfair.org.cn/v9";
const CANTON_FAIR_API_CONCURRENCY = 4;
const CANTON_FAIR_PARTITION_CONCURRENCY = 2;
const CANTON_FAIR_API_MAX_RETRIES = 4;
const CANTON_FAIR_API_RETRY_MS = 800;
const CANTON_FAIR_FALLBACK_PRODUCT_PAGE_SIZE = 40;
const CANTON_FAIR_API_REQUEST_TIMEOUT_MS = 15 * 1000;
const CANTON_FAIR_CRAWL_TIMEOUT_MS = 3 * 60 * 1000;
const CANTON_FAIR_CRAWL_POLL_INTERVAL_MS = 3 * 1000;

interface FirecrawlScrapeResponse {
  data?: {
    markdown?: string;
    metadata?: {
      description?: string;
      sourceURL?: string;
      title?: string;
    };
  };
  markdown?: string;
  metadata?: {
    description?: string;
    sourceURL?: string;
    title?: string;
  };
}

interface FirecrawlCrawlCreateResponse {
  id?: string;
  success?: boolean;
  url?: string;
}

interface FirecrawlCrawlDocument {
  markdown?: string;
  metadata?: {
    description?: string;
    sourceURL?: string;
    title?: string;
  };
}

interface FirecrawlCrawlStatusResponse {
  completed?: number;
  data?: FirecrawlCrawlDocument[];
  next?: string;
  status?: string;
  total?: number;
}

interface CantonFairApiResponse<TItem> {
  errCode?: number;
  errMsg?: string;
  result?: {
    categoryList?: CantonFairCategoryNode[];
    itemList?: TItem[];
    totalCount?: number;
    totalElements?: number;
  };
}

interface CantonFairProductItem {
  id?: number | string;
  isCfAward?: string;
  isGreenLowCarbon?: string;
  isIntelligentProducts?: string;
  isNewProduct?: string;
  shopName?: string;
  skuId?: number | string;
  skuName?: string;
  scope?: string[];
}

interface CantonFairSupplierItem {
  companyId?: number | string;
  id?: number | string;
  name?: string;
  offlineShops?: Array<{
    categoryName?: string;
    content?: string;
    sessionPeriods?: number;
  }>;
  productList?: Array<{
    skuName?: string;
  }>;
  shopId?: number | string;
  tagList?: Array<{
    text?: string;
  }>;
}

interface CantonFairCategoryNode {
  childList?: CantonFairCategoryNode[] | null;
  id?: number | string;
  name?: string;
}

interface CantonFairCategoryListResponse {
  errCode?: number;
  errMsg?: string;
  result?: CantonFairCategoryNode[];
}

interface CantonFairApiPage<TItem> {
  categoryList: CantonFairCategoryNode[];
  itemList: TItem[];
  mode: "product" | "supplier";
  pageIndex: number;
  pageSize: number;
  partitionLabel?: string;
  partitionPath?: string[];
  searchUrl: string;
  title: string;
  totalCount: number;
  totalElements: number;
  truncated: boolean;
}

type CantonFairSearchItem = CantonFairProductItem | CantonFairSupplierItem;

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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Failed to scrape";
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function getCantonFairRequestHeaders(searchUrl: string, acceptLanguage: string, locale: string) {
  const parsedUrl = new URL(searchUrl);

  return {
    "Content-Type": "application/x-www-form-urlencoded",
    "accept-language": acceptLanguage,
    "cus-os-type": "WEB",
    deviceid: "canton-data-fetch",
    locale,
    origin: parsedUrl.origin,
    referer: `${parsedUrl.origin}/`,
  };
}

function normalizeCategoryId(categoryId: number | string | undefined) {
  return categoryId == null ? "" : String(categoryId);
}

function normalizeCategoryName(name: string | undefined) {
  return (name || "").trim();
}

function buildCantonFairPartitionLabel(partitionPath: string[]) {
  const normalizedParts = partitionPath.map(normalizeCategoryName).filter(Boolean);
  return normalizedParts.join(" / ");
}

async function mapInBatches<TItem, TResult>(
  items: TItem[],
  concurrency: number,
  worker: (item: TItem) => Promise<TResult>,
) {
  const results: TResult[] = [];

  for (let start = 0; start < items.length; start += concurrency) {
    const batch = items.slice(start, start + concurrency);
    results.push(...(await Promise.all(batch.map(worker))));
  }

  return results;
}

function findCantonFairCategoryNode(
  nodes: CantonFairCategoryNode[] | null | undefined,
  categoryId: string,
): CantonFairCategoryNode | null {
  for (const node of nodes || []) {
    if (normalizeCategoryId(node.id) === categoryId) {
      return node;
    }

    const nestedNode = findCantonFairCategoryNode(node.childList || [], categoryId);
    if (nestedNode) {
      return nestedNode;
    }
  }

  return null;
}

function getCantonFairItemKey(
  item: CantonFairProductItem | CantonFairSupplierItem,
  mode: "product" | "supplier",
) {
  if (mode === "product") {
    const productItem = item as CantonFairProductItem;
    return [
      productItem.id,
      productItem.skuId,
      productItem.skuName?.trim(),
      productItem.shopName?.trim(),
    ]
      .filter(Boolean)
      .join("::");
  }

  const supplierItem = item as CantonFairSupplierItem;
  return [
    supplierItem.id,
    supplierItem.companyId,
    supplierItem.shopId,
    supplierItem.name?.trim(),
  ]
    .filter(Boolean)
    .join("::");
}

async function fetchCantonFairCategoryTree(searchUrl: string) {
  const request = buildCantonFairCategoryListRequest(searchUrl);
  const body = new URLSearchParams({
    queryType: String(request.queryType),
  }).toString();

  for (let attempt = 1; attempt <= CANTON_FAIR_API_MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(`${CANTON_FAIR_SEARCH_API_BASE}/categorylist`, {
        method: "POST",
        headers: getCantonFairRequestHeaders(searchUrl, request.acceptLanguage, request.locale),
        body,
        signal: AbortSignal.timeout(CANTON_FAIR_API_REQUEST_TIMEOUT_MS),
      });

      const raw = await response.text();
      if (!response.ok) {
        throw new Error(`Canton Fair category API error: ${response.status}`);
      }

      const data = JSON.parse(raw) as CantonFairCategoryListResponse;
      if (data.errCode !== 0) {
        throw new Error(data.errMsg || "A Canton Fair retornou erro ao consultar as categorias.");
      }

      return data.result || [];
    } catch (error) {
      if (attempt === CANTON_FAIR_API_MAX_RETRIES) {
        throw error;
      }

      await delay(CANTON_FAIR_API_RETRY_MS * attempt);
    }
  }

  throw new Error("Falha inesperada ao buscar as categorias da Canton Fair.");
}

async function fetchCantonFairApiPage<TItem>(
  searchUrl: string,
  pageIndex: number,
  partitionPath: string[] = [],
  pageSizeOverride?: number,
): Promise<CantonFairApiPage<TItem>> {
  const request = buildCantonFairApiRequest(searchUrl, pageIndex);
  const candidatePageSizes = pageSizeOverride
    ? [pageSizeOverride]
    : request.mode === "product"
      ? [...new Set([request.pageSize, CANTON_FAIR_FALLBACK_PRODUCT_PAGE_SIZE])]
      : [request.pageSize];
  let lastError: unknown;

  for (const candidatePageSize of candidatePageSizes) {
    const body = new URLSearchParams({
      content: JSON.stringify({
        ...request.payload,
        pageIndex,
        pageSize: candidatePageSize,
      }),
    }).toString();

    for (let attempt = 1; attempt <= CANTON_FAIR_API_MAX_RETRIES; attempt += 1) {
      try {
        const response = await fetch(`${CANTON_FAIR_SEARCH_API_BASE}${request.endpoint}`, {
          method: "POST",
          headers: getCantonFairRequestHeaders(searchUrl, request.acceptLanguage, request.locale),
          body,
          signal: AbortSignal.timeout(CANTON_FAIR_API_REQUEST_TIMEOUT_MS),
        });

        const raw = await response.text();
        if (!response.ok) {
          throw new Error(`Canton Fair API error: ${response.status}`);
        }

        const data = JSON.parse(raw) as CantonFairApiResponse<TItem>;
        if (data.errCode !== 0) {
          throw new Error(data.errMsg || "A Canton Fair retornou erro ao consultar a listagem.");
        }

        return {
          categoryList: data.result?.categoryList || [],
          itemList: data.result?.itemList || [],
          mode: request.mode,
          pageIndex,
          pageSize: candidatePageSize,
          partitionLabel: buildCantonFairPartitionLabel(partitionPath),
          partitionPath,
          searchUrl,
          title: request.title,
          totalCount: data.result?.totalCount || 0,
          totalElements: data.result?.totalElements || 0,
          truncated: false,
        };
      } catch (error) {
        lastError = error;

        if (attempt === CANTON_FAIR_API_MAX_RETRIES) {
          break;
        }

        await delay(CANTON_FAIR_API_RETRY_MS * attempt);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Falha inesperada ao buscar a listagem da Canton Fair.");
}

function formatCantonFairProductItem(item: CantonFairProductItem) {
  const title = (item.skuName || "").trim();
  if (!title) return "";

  const tags = [
    item.isNewProduct === "Y" ? "New" : "",
    item.isIntelligentProducts === "Y" ? "Intelligent" : "",
    item.isGreenLowCarbon === "Y" ? "Green Low Carbon" : "",
    item.isCfAward === "Y" ? "CF Award" : "",
  ].filter(Boolean);

  const parts = [`- ${title}`];
  if (item.shopName) parts.push(`Fornecedor: ${item.shopName}`);
  if (tags.length) parts.push(`Tags: ${tags.join(", ")}`);
  if (item.scope?.length) parts.push(`Acesso: ${item.scope.join("; ")}`);

  return parts.join(" | ");
}

function formatCantonFairSupplierItem(item: CantonFairSupplierItem) {
  const title = (item.name || "").trim();
  if (!title) return "";

  const boothSummary = (item.offlineShops || [])
    .map((booth) => {
      const parts = [
        booth.categoryName,
        booth.sessionPeriods ? `Phase ${booth.sessionPeriods}` : "",
        booth.content,
      ].filter(Boolean);
      return parts.join(" / ");
    })
    .filter(Boolean)
    .slice(0, 3);

  const productPreview = (item.productList || [])
    .map((product) => (product.skuName || "").trim())
    .filter(Boolean)
    .slice(0, 3);

  const tags = (item.tagList || []).map((tag) => (tag.text || "").trim()).filter(Boolean);

  const parts = [`- ${title}`];
  if (boothSummary.length) parts.push(`Booths: ${boothSummary.join("; ")}`);
  if (productPreview.length) parts.push(`Produtos: ${productPreview.join("; ")}`);
  if (tags.length) parts.push(`Tags: ${tags.join(", ")}`);

  return parts.join(" | ");
}

function applyCantonFairPartitionMetadata<TItem>(
  page: CantonFairApiPage<TItem>,
  partitionPath: string[],
): CantonFairApiPage<TItem> {
  return {
    ...page,
    partitionLabel: buildCantonFairPartitionLabel(partitionPath),
    partitionPath,
  };
}

async function collectResolvedCantonFairPages(
  searchUrl: string,
  firstPage: CantonFairApiPage<CantonFairSearchItem>,
) {
  const totalPages = Math.max(
    1,
    Math.ceil((firstPage.totalElements || firstPage.itemList.length) / firstPage.pageSize),
  );
  const pages = [firstPage];
  const failedPageNumbers: number[] = [];
  const unresolvedPageNumbers: number[] = [];

  for (let pageStart = 2; pageStart <= totalPages; pageStart += CANTON_FAIR_API_CONCURRENCY) {
    const pageNumbers = Array.from(
      { length: Math.min(CANTON_FAIR_API_CONCURRENCY, totalPages - pageStart + 1) },
      (_, index) => pageStart + index,
    );

    const batchPages = await Promise.allSettled(
      pageNumbers.map((pageIndex) =>
        fetchCantonFairApiPage<CantonFairSearchItem>(
          searchUrl,
          pageIndex,
          firstPage.partitionPath || [],
          firstPage.pageSize,
        ),
      ),
    );

    batchPages.forEach((result, index) => {
      if (result.status === "fulfilled") {
        pages.push(result.value);
        return;
      }

      failedPageNumbers.push(pageNumbers[index]);
    });
  }

  for (const pageIndex of failedPageNumbers) {
    try {
      pages.push(
        await fetchCantonFairApiPage<CantonFairSearchItem>(
          searchUrl,
          pageIndex,
          firstPage.partitionPath || [],
          firstPage.pageSize,
        ),
      );
    } catch {
      unresolvedPageNumbers.push(pageIndex);
    }
  }

  return {
    pages,
    unresolvedPageNumbers,
  };
}

async function collectPartitionedCantonFairPages(
  searchUrl: string,
  categoryTree: CantonFairCategoryNode[],
  options: {
    firstPage?: CantonFairApiPage<CantonFairSearchItem>;
    parentPath?: string[];
    visited: Set<string>;
  },
): Promise<{
  pages: CantonFairApiPage<CantonFairSearchItem>[];
  truncatedPartitions: string[];
}> {
  const searchConfig = parseCantonFairSearchUrl(searchUrl);
  const visitKey = `${searchConfig.queryType}:${searchConfig.categoryId}`;

  if (options.visited.has(visitKey)) {
    return {
      pages: [],
      truncatedPartitions: [],
    };
  }

  options.visited.add(visitKey);

  const currentNode = findCantonFairCategoryNode(categoryTree, searchConfig.categoryId);
  const currentName = normalizeCategoryName(currentNode?.name);
  const partitionPath = currentName
    ? [...(options.parentPath || []), currentName]
    : [...(options.parentPath || [])];
  const firstPage = applyCantonFairPartitionMetadata(
    options.firstPage ||
      (await fetchCantonFairApiPage<CantonFairSearchItem>(searchUrl, 1, partitionPath)),
    partitionPath,
  );
  const childNodes = (currentNode?.childList || []).filter((node) => normalizeCategoryId(node.id));
  const isCappedByApi = firstPage.totalCount > firstPage.totalElements;

  if (firstPage.mode === "product" && isCappedByApi && childNodes.length > 0) {
    const childResults = await mapInBatches(
      childNodes,
      CANTON_FAIR_PARTITION_CONCURRENCY,
      async (childNode) => {
        const childCategoryId = normalizeCategoryId(childNode.id);
        const childLabel = buildCantonFairPartitionLabel([
          ...partitionPath,
          normalizeCategoryName(childNode.name) || childCategoryId,
        ]);

        if (!childCategoryId) {
          return {
            pages: [] as CantonFairApiPage<CantonFairSearchItem>[],
            truncatedPartitions: childLabel ? [childLabel] : ([] as string[]),
          };
        }

        try {
          return await collectPartitionedCantonFairPages(
            buildCantonFairSearchUrlForCategory(searchUrl, childCategoryId),
            categoryTree,
            {
              parentPath: partitionPath,
              visited: options.visited,
            },
          );
        } catch {
          return {
            pages: [] as CantonFairApiPage<CantonFairSearchItem>[],
            truncatedPartitions: childLabel ? [childLabel] : [childCategoryId],
          };
        }
      },
    );
    const nestedPages = childResults.flatMap((result) => result.pages);
    const truncatedPartitions = childResults.flatMap((result) => result.truncatedPartitions);

    if (nestedPages.length) {
      return {
        pages: nestedPages,
        truncatedPartitions,
      };
    }
  }

  const resolvedPages = await collectResolvedCantonFairPages(searchUrl, firstPage);
  const hasMissingPages = resolvedPages.unresolvedPageNumbers.length > 0;

  if (!isCappedByApi && !hasMissingPages) {
    return {
      pages: resolvedPages.pages,
      truncatedPartitions: [],
    };
  }

  const truncatedLabel = firstPage.partitionLabel || searchConfig.categoryId;
  return {
    pages: resolvedPages.pages.map((page) => ({ ...page, truncated: true })),
    truncatedPartitions: [truncatedLabel],
  };
}

function formatCantonFairApiMarkdown(
  sourceUrl: string,
  pages: CantonFairApiPage<CantonFairSearchItem>[],
  options: {
    reportedTotalItems: number;
    truncatedPartitions?: string[];
  },
) {
  const sortedPages = [...pages].sort((left, right) => {
    const leftPartition = left.partitionLabel || "";
    const rightPartition = right.partitionLabel || "";
    if (leftPartition !== rightPartition) {
      return leftPartition.localeCompare(rightPartition);
    }

    return left.pageIndex - right.pageIndex;
  });
  const firstPage = sortedPages[0];
  const partitionCount = new Set(sortedPages.map((page) => page.partitionLabel || page.searchUrl)).size;
  const seenItems = new Set<string>();
  const pageSections = sortedPages
    .map((page) => {
      const lines = page.itemList
        .map((item) => {
          const key =
            getCantonFairItemKey(item, page.mode) ||
            (page.mode === "product"
              ? formatCantonFairProductItem(item as CantonFairProductItem)
              : formatCantonFairSupplierItem(item as CantonFairSupplierItem));

          if (!key || seenItems.has(key)) {
            return "";
          }

          seenItems.add(key);
          return page.mode === "product"
            ? formatCantonFairProductItem(item as CantonFairProductItem)
            : formatCantonFairSupplierItem(item as CantonFairSupplierItem);
        })
        .filter(Boolean);

      if (!lines.length) {
        return "";
      }

      const headingParts = [page.partitionLabel, `Página ${page.pageIndex}`].filter(Boolean);
      return `## ${headingParts.join(" · ")}\n${lines.join("\n")}`.trim();
    })
    .filter(Boolean);

  const title = firstPage?.title || `Canton Fair Search (${sortedPages.length} páginas)`;
  const description =
    `${sortedPages.length} páginas agregadas via API da Canton Fair ` +
    `(${formatNumber(seenItems.size)} itens únicos extraídos em ${formatNumber(partitionCount)} partições).`;
  const uniqueTruncatedPartitions = [...new Set((options.truncatedPartitions || []).filter(Boolean))];
  const scopeLines = [
    `Total reportado pela Canton Fair: ${formatNumber(options.reportedTotalItems || seenItems.size)}`,
    `Itens únicos extraídos: ${formatNumber(seenItems.size)}`,
    `Partições consultadas: ${formatNumber(partitionCount)}`,
  ];

  if (uniqueTruncatedPartitions.length) {
    scopeLines.push(
      `Partições ainda limitadas ou indisponíveis na API: ${uniqueTruncatedPartitions.join("; ")}`,
    );
  } else if (partitionCount > 1) {
    scopeLines.push("Busca particionada por subcategorias para contornar o limite de 5.000 itens por listagem.");
  }

  return {
    title,
    description,
    markdown: [
      `# ${title}`,
      `Busca original: ${sourceUrl}`,
      `Páginas agregadas: ${formatNumber(sortedPages.length)}`,
      scopeLines.join("\n"),
      "",
      pageSections.join("\n\n---\n\n"),
    ].join("\n").trim(),
  };
}

async function scrapeCantonFairSearchViaApi(searchUrl: string) {
  const firstPage = await fetchCantonFairApiPage<CantonFairSearchItem>(searchUrl, 1);

  if (firstPage.mode !== "product") {
    const resolvedPages = await collectResolvedCantonFairPages(searchUrl, firstPage);
    return formatCantonFairApiMarkdown(searchUrl, resolvedPages.pages, {
      reportedTotalItems: firstPage.totalCount || resolvedPages.pages[0]?.totalCount || 0,
      truncatedPartitions: resolvedPages.unresolvedPageNumbers.length
        ? [firstPage.partitionLabel || parseCantonFairSearchUrl(searchUrl).categoryId]
        : [],
    });
  }

  const categoryTree = await fetchCantonFairCategoryTree(searchUrl);
  const partitionedResult = await collectPartitionedCantonFairPages(searchUrl, categoryTree, {
    firstPage,
    visited: new Set<string>(),
  });

  return formatCantonFairApiMarkdown(searchUrl, partitionedResult.pages, {
    reportedTotalItems: firstPage.totalCount || partitionedResult.pages[0]?.totalCount || 0,
    truncatedPartitions: partitionedResult.truncatedPartitions,
  });
}

async function fetchFirecrawlJson<T>(apiKey: string, input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const data = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    const errorMessage =
      typeof data === "object" && data && "error" in data && typeof data.error === "string"
        ? data.error
        : `Firecrawl error: ${response.status}`;
    throw new Error(errorMessage);
  }

  return data;
}

async function startFirecrawlCrawl(apiKey: string, searchUrl: string): Promise<string> {
  const rootUrl = buildCantonFairSearchRootUrl(searchUrl);
  const pattern = buildCantonFairSearchMatchPattern(searchUrl);
  const searchConfig = parseCantonFairSearchUrl(searchUrl);
  const crawlResponse = await fetchFirecrawlJson<FirecrawlCrawlCreateResponse>(
    apiKey,
    `${FIRECRAWL_API_BASE}/crawl`,
    {
      method: "POST",
      body: JSON.stringify({
        url: rootUrl,
        includePaths: [pattern],
        regexOnFullURL: true,
        ignoreSitemap: true,
        ignoreQueryParameters: false,
        limit: 120,
        crawlEntireDomain: true,
        allowExternalLinks: false,
        allowSubdomains: false,
        maxDiscoveryDepth: 3,
        delay: 1,
        maxConcurrency: 2,
        scrapeOptions: {
          formats: ["markdown"],
          onlyMainContent: false,
          waitFor: 5000,
          removeBase64Images: true,
          blockAds: true,
          location: {
            country: "CN",
            languages: searchConfig.pathname.includes("/en-US/") ? ["en-US"] : ["zh-CN"],
          },
        },
      }),
    },
  );

  if (!crawlResponse.id) {
    throw new Error("Firecrawl não retornou o id do crawl.");
  }

  return crawlResponse.id;
}

async function waitForFirecrawlCrawl(apiKey: string, crawlId: string): Promise<FirecrawlCrawlStatusResponse> {
  const deadline = Date.now() + CANTON_FAIR_CRAWL_TIMEOUT_MS;

  while (Date.now() <= deadline) {
    const statusResponse = await fetchFirecrawlJson<FirecrawlCrawlStatusResponse>(
      apiKey,
      `${FIRECRAWL_API_BASE}/crawl/${crawlId}`,
      { method: "GET", headers: { "Content-Type": "application/json" } },
    );

    if (statusResponse.status === "completed") {
      return statusResponse;
    }

    if (statusResponse.status === "failed" || statusResponse.status === "cancelled") {
      throw new Error(`Firecrawl crawl terminou com status "${statusResponse.status}".`);
    }

    await new Promise((resolve) => setTimeout(resolve, CANTON_FAIR_CRAWL_POLL_INTERVAL_MS));
  }

  throw new Error("Tempo limite excedido ao percorrer as páginas da Canton Fair.");
}

async function collectFirecrawlCrawlDocuments(
  apiKey: string,
  initialStatus: FirecrawlCrawlStatusResponse,
): Promise<FirecrawlCrawlDocument[]> {
  const documents = [...(initialStatus.data || [])];
  let nextUrl = initialStatus.next;

  while (nextUrl) {
    const nextStatus = await fetchFirecrawlJson<FirecrawlCrawlStatusResponse>(apiKey, nextUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    documents.push(...(nextStatus.data || []));
    nextUrl = nextStatus.next;
  }

  return documents;
}

function getPageNumberFromSourceUrl(sourceUrl: string | undefined): number {
  if (!sourceUrl) return Number.MAX_SAFE_INTEGER;

  try {
    const parsed = parseCantonFairSearchUrl(sourceUrl);
    return parsed.pageNo;
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

function formatCantonFairCrawlMarkdown(sourceUrl: string, documents: FirecrawlCrawlDocument[]) {
  const uniqueDocuments = documents
    .filter((document) => (document.markdown || "").trim())
    .reduce<FirecrawlCrawlDocument[]>((accumulator, document) => {
      const currentSourceUrl = document.metadata?.sourceURL || "";
      if (
        currentSourceUrl &&
        accumulator.some((existingDocument) => existingDocument.metadata?.sourceURL === currentSourceUrl)
      ) {
        return accumulator;
      }

      accumulator.push(document);
      return accumulator;
    }, [])
    .sort(
      (left, right) =>
        getPageNumberFromSourceUrl(left.metadata?.sourceURL) -
        getPageNumberFromSourceUrl(right.metadata?.sourceURL),
    );

  const firstDocument = uniqueDocuments[0];
  const title =
    firstDocument?.metadata?.title || `Canton Fair Search (${uniqueDocuments.length} páginas)`;
  const description = `${uniqueDocuments.length} páginas agregadas da listagem da Canton Fair.`;
  const markdownSections = uniqueDocuments.map((document, index) => {
    const currentSourceUrl = document.metadata?.sourceURL || sourceUrl;
    const detectedPageNumber = getPageNumberFromSourceUrl(currentSourceUrl);
    const pageLabel =
      detectedPageNumber === Number.MAX_SAFE_INTEGER ? `Página ${index + 1}` : `Página ${detectedPageNumber}`;

    return `## ${pageLabel}\nURL: ${currentSourceUrl}\n\n${(document.markdown || "").trim()}`;
  });

  return {
    title,
    description,
    markdown: `# ${title}\n\nBusca original: ${sourceUrl}\nPáginas agregadas: ${uniqueDocuments.length}\n\n${markdownSections.join("\n\n---\n\n")}`.trim(),
  };
}

async function crawlCantonFairSearch(apiKey: string, searchUrl: string) {
  const crawlId = await startFirecrawlCrawl(apiKey, searchUrl);
  const crawlStatus = await waitForFirecrawlCrawl(apiKey, crawlId);
  const documents = await collectFirecrawlCrawlDocuments(apiKey, crawlStatus);

  if (!documents.length) {
    throw new Error("Nenhuma página foi encontrada no crawl da Canton Fair.");
  }

  return formatCantonFairCrawlMarkdown(searchUrl, documents);
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

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    if (isCantonFairSearchUrl(formattedUrl)) {
      try {
        const apiResult = await scrapeCantonFairSearchViaApi(formattedUrl);
        return res.status(200).json({
          success: true,
          markdown: apiResult.markdown,
          title: apiResult.title,
          description: apiResult.description,
          sourceURL: formattedUrl,
        });
      } catch (cantonFairApiError) {
        console.warn("Canton Fair API scrape failed, falling back to Firecrawl crawl:", cantonFairApiError);
      }
    }

    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "FIRECRAWL_API_KEY não configurada nas env vars da Vercel." });
    }

    if (isCantonFairSearchUrl(formattedUrl)) {
      const crawlResult = await crawlCantonFairSearch(apiKey, formattedUrl);
      return res.status(200).json({
        success: true,
        markdown: crawlResult.markdown,
        title: crawlResult.title,
        description: crawlResult.description,
        sourceURL: formattedUrl,
      });
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

    const data = (await response.json()) as FirecrawlScrapeResponse & { error?: string };

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
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    console.error("Scrape error:", error);
    return res.status(500).json({ error: errorMessage });
  }
}
