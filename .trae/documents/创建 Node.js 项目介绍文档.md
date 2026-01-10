## 计划：创建 Node.js 项目介绍文档

### 分析结果
这是一个基于 **Next.js** 的个人消费记录应用（MindLedger），使用 TypeScript 开发。

### 执行步骤
1. **创建 `doc` 文件夹** - 用于存放项目介绍文档
2. **创建 `nodejs-project-intro.md`** - 详细的项目介绍文档，包含：
   - 项目整体框架介绍（用 Java 类比）
   - 技术栈详解
   - 目录结构说明
   - 核心文件解析
   - 文件生成方式
   - 运行流程说明

### 文档内容概览
- **与 Java 的类比**：将 Next.js 类比为 Spring Boot，TypeScript 类比为 Java，package.json 类比为 pom.xml
- **架构层次**：前端（React）→ API 路由（Controller）→ 业务逻辑（Service）→ 数据存储（Repository）
- **核心文件**：package.json、tsconfig.json、next.config.ts、src/app/、src/lib/ 等