import { describe, expect, it } from "vitest";
import {
  buildCantonFairApiRequest,
  buildCantonFairSearchUrlForCategory,
  buildCantonFairPageUrl,
  buildCantonFairSearchMatchPattern,
  buildCantonFairSearchRootUrl,
  isCantonFairSearchUrl,
  parseCantonFairSearchUrl,
} from "@/lib/canton-fair";

describe("parseCantonFairSearchUrl", () => {
  it("extrai os campos principais da URL", () => {
    const result = parseCantonFairSearchUrl(
      "https://365.cantonfair.org.cn/zh-CN/search?queryType=1&fCategoryId=461147369757478912&categoryId=461147369757478912&pageNo=3",
    );

    expect(result.queryType).toBe(1);
    expect(result.categoryId).toBe("461147369757478912");
    expect(result.fCategoryId).toBe("461147369757478912");
    expect(result.pageNo).toBe(3);
  });

  it("preserva filtros extras ao montar a próxima página", () => {
    const nextPageUrl = buildCantonFairPageUrl(
      "https://365.cantonfair.org.cn/zh-CN/search?queryType=1&fCategoryId=1&categoryId=1&keyword=compressor&offline=1",
      7,
    );

    const url = new URL(nextPageUrl);
    expect(url.searchParams.get("pageNo")).toBe("7");
    expect(url.searchParams.get("keyword")).toBe("compressor");
    expect(url.searchParams.get("offline")).toBe("1");
  });

  it("rejeita URLs fora da Canton Fair", () => {
    expect(() =>
      parseCantonFairSearchUrl("https://example.com/search?categoryId=1"),
    ).toThrow("Canton Fair");
  });

  it("identifica URLs de busca válidas da Canton Fair", () => {
    expect(
      isCantonFairSearchUrl(
        "https://365.cantonfair.org.cn/en-US/search?queryType=1&fCategoryId=1&categoryId=1",
      ),
    ).toBe(true);

    expect(isCantonFairSearchUrl("https://365.cantonfair.org.cn/en-US/product/1")).toBe(false);
  });

  it("remove pageNo ao montar a URL raiz da busca", () => {
    expect(
      buildCantonFairSearchRootUrl(
        "https://365.cantonfair.org.cn/zh-CN/search?queryType=1&fCategoryId=1&categoryId=1&pageNo=9",
      ),
    ).toBe("https://365.cantonfair.org.cn/zh-CN/search?queryType=1&fCategoryId=1&categoryId=1");
  });

  it("troca a categoria preservando os demais filtros da busca", () => {
    expect(
      buildCantonFairSearchUrlForCategory(
        "https://365.cantonfair.org.cn/zh-CN/search?queryType=1&fCategoryId=1&categoryId=1&searchWord=compressor&pageNo=9",
        "200",
      ),
    ).toBe(
      "https://365.cantonfair.org.cn/zh-CN/search?queryType=1&fCategoryId=1&categoryId=200&searchWord=compressor",
    );
  });

  it("gera regex que aceita outras páginas da mesma busca", () => {
    const pattern = new RegExp(
      buildCantonFairSearchMatchPattern(
        "https://365.cantonfair.org.cn/zh-CN/search?queryType=1&fCategoryId=1&categoryId=1&keyword=compressor",
      ),
    );

    expect(
      pattern.test(
        "https://365.cantonfair.org.cn/zh-CN/search?queryType=1&fCategoryId=1&categoryId=1&keyword=compressor&pageNo=5",
      ),
    ).toBe(true);
    expect(
      pattern.test(
        "https://365.cantonfair.org.cn/zh-CN/search?queryType=2&fCategoryId=1&categoryId=1&keyword=compressor&pageNo=5",
      ),
    ).toBe(false);
  });

  it("monta a requisição da API de produtos com paginação e locale em chinês", () => {
    const request = buildCantonFairApiRequest(
      "https://365.cantonfair.org.cn/zh-CN/search?queryType=1&fCategoryId=1&categoryId=1&searchWord=compressor",
      3,
    );

    expect(request.endpoint).toBe("/exhibition/queryproduct");
    expect(request.mode).toBe("product");
    expect(request.locale).toBe("zh-Hans");
    expect(request.acceptLanguage).toBe("zh-CN,zh;q=0.9");
    expect(request.pageSize).toBe(100);
    expect(request.payload).toMatchObject({
      categoryId: "1",
      companyType: "",
      pageIndex: 3,
      pageSize: 100,
      q: "compressor",
    });
  });

  it("monta a requisição da API de fornecedores em inglês", () => {
    const request = buildCantonFairApiRequest(
      "https://365.cantonfair.org.cn/en-US/search?queryType=2&fCategoryId=1&categoryId=1",
      2,
    );

    expect(request.endpoint).toBe("/exhibition/queryshop");
    expect(request.mode).toBe("supplier");
    expect(request.locale).toBe("en");
    expect(request.acceptLanguage).toBe("en-US,en;q=0.9");
    expect(request.pageSize).toBe(20);
    expect(request.payload).toMatchObject({
      categoryId: "1",
      companyType: "",
      pageIndex: 2,
      pageSize: 20,
      q: "",
      searchBooth: "N",
      searchProductShop: "N",
    });
  });
});
