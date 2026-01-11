import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 允许指定域名在开发环境访问资源，解决跨域警告
  allowedDevOrigins: ["lumora-lab.top"],
  // 启用 standalone 输出模式，用于 Docker 部署
  output: 'standalone',
};

export default nextConfig;
