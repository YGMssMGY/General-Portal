import { NextRequest } from "next/server";
import { success, error } from "@/lib/api-response";
import * as cheerio from "cheerio";

interface LinkPreviewData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

export async function GET(request: NextRequest) {
  const requestUrl = request.url;
  try {
    const { searchParams } = new URL(requestUrl);
    const url = searchParams.get("url");
    if (!url) return error("url query param is required", 400);

    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
    } catch {
      return error("Invalid URL", 400);
    }

    const res = await fetch(targetUrl.toString(), {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "General-Portal/1.0 LinkPreview" },
    });

    if (!res.ok) return error("Failed to fetch URL", 502);

    const html = await res.text();
    const $ = cheerio.load(html);

    const title =
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="twitter:title"]').attr("content") ||
      $("title").text() ||
      null;

    const description =
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="twitter:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      null;

    const image =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      null;

    const siteName =
      $('meta[property="og:site_name"]').attr("content") ||
      targetUrl.hostname.replace("www.", "") ||
      null;

    const data: LinkPreviewData = {
      url: targetUrl.toString(),
      title: title?.slice(0, 200) ?? null,
      description: description?.slice(0, 400) ?? null,
      image: image ?? null,
      siteName: siteName?.slice(0, 100) ?? null,
    };

    return success(data);
  } catch (e) {
    console.error("GET /api/link-preview", e);
    return success({ url: "", title: null, description: null, image: null, siteName: null });
  }
}
