import type { NextConfig } from "next";

// GitHub Pages 정적 호스팅 전용 설정.
// 서버가 없으므로 미들웨어·서버 액션·API 라우트를 쓰지 않는다.
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/vc-platform", // https://vcbio.github.io/vc-platform/
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
