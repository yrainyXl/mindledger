import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 允许指定域名在开发环境访问资源，解决跨域警告
  allowedDevOrigins: ["lumora-lab.top"],
};

export default nextConfig;
