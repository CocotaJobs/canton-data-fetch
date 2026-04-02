export const DEFAULT_CANTON_FAIR_SEARCH_URL =
  "https://365.cantonfair.org.cn/zh-CN/search?queryType=1&fCategoryId=461147369757478912&categoryId=461147369757478912";

export const DEFAULT_AUTO_MAX_PAGES = 120;
export const EMPTY_PAGES_BEFORE_STOP = 2;

export interface CantonFairSearchConfig {
  categoryId: string;
  pageNo: number;
  queryType: number;
  searchUrl: string;
}

function toPositiveInt(value: string | number | null | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export function parseCantonFairSearchUrl(searchUrl: string): CantonFairSearchConfig {
  const trimmedUrl = searchUrl.trim();

  if (!trimmedUrl) {
    throw new Error("Informe a URL da busca da Canton Fair.");
  }

  let url: URL;
  try {
    url = new URL(trimmedUrl);
  } catch {
    throw new Error("A URL informada é inválida.");
  }

  if (!url.hostname.toLowerCase().includes("cantonfair.org.cn")) {
    throw new Error("A URL precisa ser da Canton Fair.");
  }

  const categoryId = url.searchParams.get("categoryId") || url.searchParams.get("fCategoryId") || "";
  if (!categoryId) {
    throw new Error("A URL precisa conter categoryId ou fCategoryId.");
  }

  const queryType = toPositiveInt(url.searchParams.get("queryType"), 1);
  const pageNo = toPositiveInt(url.searchParams.get("pageNo"), 1);

  url.searchParams.set("queryType", String(queryType));
  url.searchParams.set("categoryId", categoryId);
  url.searchParams.set("fCategoryId", url.searchParams.get("fCategoryId") || categoryId);

  if (url.searchParams.has("pageNo")) {
    url.searchParams.set("pageNo", String(pageNo));
  } else {
    url.searchParams.delete("pageNo");
  }

  return {
    categoryId,
    pageNo,
    queryType,
    searchUrl: url.toString(),
  };
}

export function buildCantonFairPageUrl(searchUrl: string, pageNo: number): string {
  const config = parseCantonFairSearchUrl(searchUrl);
  const url = new URL(config.searchUrl);
  url.searchParams.set("pageNo", String(toPositiveInt(pageNo, config.pageNo || 1)));
  return url.toString();
}
