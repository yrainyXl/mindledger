import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MindLedger｜个人日常消费记录",
  description: "一个简洁的个人日常消费记录项目（Next.js + API + 本地存储，预留 Notion 接入结构）",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
