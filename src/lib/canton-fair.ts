export const DEFAULT_CANTON_FAIR_SEARCH_URL =
  "https://365.cantonfair.org.cn/zh-CN/search?queryType=1&fCategoryId=461147369757478912&categoryId=461147369757478912";

export const DEFAULT_AUTO_MAX_PAGES = 120;
export const EMPTY_PAGES_BEFORE_STOP = 2;

export type CantonFairSearchMode = "product" | "supplier";

export interface CantonFairSearchConfig {
  categoryId: string;
  fCategoryId: string;
  pageNo: number;
  pathname: string;
  queryType: number;
  searchUrl: string;
}

export interface CantonFairApiRequest {
  acceptLanguage: string;
  endpoint: string;
  locale: string;
  mode: CantonFairSearchMode;
  pageIndex: number;
  pageSize: number;
  payload: Record<string, number | string>;
  title: string;
}

export interface CantonFairCategoryListRequest {
  acceptLanguage: string;
  locale: string;
  queryType: number;
}

export const CANTON_FAIR_PRODUCT_PAGE_SIZE = 100;
export const CANTON_FAIR_SUPPLIER_PAGE_SIZE = 20;

function toPositiveInt(value: string | number | null | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isCantonFairSearchUrl(searchUrl: string): boolean {
  try {
    parseCantonFairSearchUrl(searchUrl);
    return true;
  } catch {
    return false;
  }
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

  if (!/\/search\/?$/i.test(url.pathname)) {
    throw new Error("A URL precisa ser da página de busca da Canton Fair.");
  }

  const categoryId = url.searchParams.get("categoryId") || url.searchParams.get("fCategoryId") || "";
  if (!categoryId) {
    throw new Error("A URL precisa conter categoryId ou fCategoryId.");
  }

  const fCategoryId = url.searchParams.get("fCategoryId") || categoryId;
  const queryType = toPositiveInt(url.searchParams.get("queryType"), 1);
  const pageNo = toPositiveInt(url.searchParams.get("pageNo"), 1);

  url.searchParams.set("queryType", String(queryType));
  url.searchParams.set("categoryId", categoryId);
  url.searchParams.set("fCategoryId", fCategoryId);

  if (url.searchParams.has("pageNo")) {
    url.searchParams.set("pageNo", String(pageNo));
  } else {
    url.searchParams.delete("pageNo");
  }

  return {
    categoryId,
    fCategoryId,
    pageNo,
    pathname: url.pathname,
    queryType,
    searchUrl: url.toString(),
  };
}

export function buildCantonFairSearchRootUrl(searchUrl: string): string {
  const config = parseCantonFairSearchUrl(searchUrl);
  const url = new URL(config.searchUrl);
  url.searchParams.delete("pageNo");
  return url.toString();
}

export function buildCantonFairPageUrl(searchUrl: string, pageNo: number): string {
  const config = parseCantonFairSearchUrl(searchUrl);
  const url = new URL(config.searchUrl);
  url.searchParams.set("pageNo", String(toPositiveInt(pageNo, config.pageNo || 1)));
  return url.toString();
}

export function buildCantonFairSearchUrlForCategory(searchUrl: string, categoryId: string): string {
  const config = parseCantonFairSearchUrl(searchUrl);
  const url = new URL(config.searchUrl);
  url.searchParams.set("categoryId", categoryId);
  url.searchParams.delete("pageNo");

  if (!url.searchParams.get("fCategoryId")) {
    url.searchParams.set("fCategoryId", config.fCategoryId);
  }

  return url.toString();
}

export function buildCantonFairSearchMatchPattern(searchUrl: string): string {
  const rootUrl = new URL(buildCantonFairSearchRootUrl(searchUrl));
  const requiredParams = [...rootUrl.searchParams.entries()]
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      `${leftKey}=${leftValue}`.localeCompare(`${rightKey}=${rightValue}`),
    )
    .map(
      ([key, value]) =>
        `(?=.*(?:\\?|&)${escapeRegExp(key)}=${escapeRegExp(value)}(?:&|$))`,
    )
    .join("");

  return `^${escapeRegExp(rootUrl.origin)}${escapeRegExp(rootUrl.pathname)}${requiredParams}.*$`;
}

function getCantonFairLocale(pathname: string) {
  if (pathname.includes("/en-US/")) {
    return {
      acceptLanguage: "en-US,en;q=0.9",
      locale: "en",
    };
  }

  return {
    acceptLanguage: "zh-CN,zh;q=0.9",
    locale: "zh-Hans",
  };
}

export function buildCantonFairCategoryListRequest(searchUrl: string): CantonFairCategoryListRequest {
  const config = parseCantonFairSearchUrl(searchUrl);
  const { acceptLanguage, locale } = getCantonFairLocale(config.pathname);

  return {
    acceptLanguage,
    locale,
    queryType: config.queryType,
  };
}

export function buildCantonFairApiRequest(searchUrl: string, pageIndex: number): CantonFairApiRequest {
  const config = parseCantonFairSearchUrl(searchUrl);
  const url = new URL(config.searchUrl);
  const searchWord = url.searchParams.get("searchWord") || url.searchParams.get("q") || "";
  const normalizedCategoryId = config.categoryId === "import" ? "" : config.categoryId;
  const companyType = config.categoryId === "import" ? "2" : "";
  const { acceptLanguage, locale } = getCantonFairLocale(config.pathname);

  if (config.queryType === 1) {
    return {
      acceptLanguage,
      endpoint: "/exhibition/queryproduct",
      locale,
      mode: "product",
      pageIndex: toPositiveInt(pageIndex, 1),
      pageSize: CANTON_FAIR_PRODUCT_PAGE_SIZE,
      payload: {
        categoryId: normalizedCategoryId,
        companyType,
        pageIndex: toPositiveInt(pageIndex, 1),
        pageSize: CANTON_FAIR_PRODUCT_PAGE_SIZE,
        q: searchWord,
      },
      title: locale === "en" ? "Products List-Canton Fair 365" : "产品列表-广交会365",
    };
  }

  if (config.queryType === 2) {
    return {
      acceptLanguage,
      endpoint: "/exhibition/queryshop",
      locale,
      mode: "supplier",
      pageIndex: toPositiveInt(pageIndex, 1),
      pageSize: CANTON_FAIR_SUPPLIER_PAGE_SIZE,
      payload: {
        categoryId: normalizedCategoryId,
        companyType,
        pageIndex: toPositiveInt(pageIndex, 1),
        pageSize: CANTON_FAIR_SUPPLIER_PAGE_SIZE,
        q: searchWord,
        searchBooth: "N",
        searchProductShop: "N",
      },
      title: locale === "en" ? "Suppliers List-Canton Fair 365" : "供应商列表-广交会365",
    };
  }

  throw new Error(`queryType=${config.queryType} ainda não é suportado para busca paginada da Canton Fair.`);
}
