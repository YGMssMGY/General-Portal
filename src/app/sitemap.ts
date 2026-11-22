import type { MetadataRoute } from "next";
import { publicRoutes, siteUrl } from "@/lib/seo";

const LOCALES = ["en-US", "zh-CN", "de-DE", "fr-FR", "es-ES"];

export default function sitemap(): MetadataRoute.Sitemap {
    const base = siteUrl();
    return publicRoutes().map((path): MetadataRoute.Sitemap[number] => ({
        url: `${base}${path}`,
        lastModified: new Date(),
        changeFrequency: path === "/" ? "weekly" : "monthly",
        priority: path === "/" ? 1 : 0.7,
        alternates: {
            languages: Object.fromEntries(LOCALES.map((locale) => [locale, `${base}${path}`])),
        },
    }));
}
