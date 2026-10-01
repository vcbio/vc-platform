import type { Metadata } from "next";
export const SITE = "https://vcbio.github.io/vc-platform";
export const BRAND = "Vita Core Platform";
export function pageMetadata(title: string, description: string, path: string, image = "home", index = true): Metadata {
  const fullTitle = `${title} · ${BRAND}`;
  const url = `${SITE}${path}`;
  return {
    title: { absolute: fullTitle }, description, alternates: { canonical: url }, robots: { index, follow: index },
    openGraph: { title: fullTitle, description, url, siteName: BRAND, type: "website", locale: "ko_KR", images: [{ url: `${SITE}/og/${image}.png`, width: 1200, height: 630, alt: title }] },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [`${SITE}/og/${image}.png`] },
  };
}
