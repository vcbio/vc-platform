import type { MetadataRoute } from "next";
import data from "../../public/data/ingredient-details.json";
import { SITE } from "@/lib/pageMetadata";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["/", "/insight/", "/faq/", "/match/", "/manufacturer/apply/", "/quote/ai/", "/privacy/"];
  return [...pages.map((path) => ({ url: `${SITE}${path}` })), ...data.rows.map(({ id }) => ({ url: `${SITE}/ingredient/${id}/` }))];
}
