import type { MetadataRoute } from "next";
import { SITE } from "@/lib/pageMetadata";
export const dynamic = "force-static";
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/vc-platform/", disallow: ["/vc-platform/admin/", "/vc-platform/profile/", "/vc-platform/deal/", "/vc-platform/login/", "/vc-platform/signup/", "/vc-platform/quote/$", "/vc-platform/ingredient/$"] }, sitemap: `${SITE}/sitemap.xml` };
}
