import { describe, expect, it } from "vitest";
import {
  buildCantonFairPageUrl,
  parseCantonFairSearchUrl,
} from "@/lib/canton-fair";

describe("parseCantonFairSearchUrl", () => {
  it("extrai os campos principais da URL", () => {
    const result = parseCantonFairSearchUrl(
      "https://365.cantonfair.org.cn/zh-CN/search?queryType=1&fCategoryId=461147369757478912&categoryId=461147369757478912&pageNo=3",
    );

    expect(result.queryType).toBe(1);
    expect(result.categoryId).toBe("461147369757478912");
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
});
