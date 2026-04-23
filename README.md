# GEO Growth Tool (MVP)

帮助跨境电商卖家把商品内容分发到 AI 搜索生态，并用一个简单面板查看"AI 曝光"（MVP 阶段可用模拟数据）。

## 你能在 3 分钟演示什么

- **Step 1 导入商品**：去 `/products` 添加一个商品（先用手动填写最稳）
- **Step 2 AI 生成内容**：去 `/generator` 选择商品 → 一键生成 3 类内容
- **Step 2.5 Chat 问答**：去 `/chat` 输入一句话 → 直接调用 `gpt-4.1-mini` 返回结果
- **Step 3 发布内容**：去 `/publish` 选择内容 → 选择平台（Twitter/Reddit/Blog）→ Publish
- **Step 4 看曝光**：去 `/analytics` 查看 ChatGPT/Perplexity/Gemini 的 mentions（MVP 先模拟）
- **Step 5 竞争策略分析**：去 `/strategy` 输入关键词 → 分析 Google SERP → 得到页面策略建议

## 技术栈（MVP）

- **Frontend**: Next.js（App Router）+ TailwindCSS
- **Backend**: Next.js Route Handlers（`/api/`*）
- **Database**: Prisma（MVP 默认用 SQLite，方便你本机直接跑；后续可切到 Postgres/Supabase）
- **AI**: OpenAI（可选；MVP 可以先用模拟输出）
- **SERP API**: DataForSEO（用于竞争策略分析）

## 本机启动（最简单）

前置条件：

- Node.js **18+**（你目前就是 18，可以直接跑）

安装依赖：

```bash
npm install
```

初始化数据库（第一次运行需要）：

```bash
npx prisma migrate dev
```

启动开发服务器：

```bash
npm run dev
```

打开：

- `http://localhost:3000/dashboard`

## 页面说明

- `/dashboard`：总览（Products / Content Generated / Posts Published / AI Mentions）
- `/products`：导入商品（URL 导入后续再增强；MVP 先手动填也能演示闭环）
- `/generator`：选择商品 → 生成 3 类 GEO 内容
- `/chat`：一个输入框 → 提交后调用 `gpt-4.1-mini` → 返回模型文本
- `/publish`：选择内容 → 选择平台 → 发布（MVP 先做"记录发布状态"）
- `/analytics`：曝光统计（MVP 先模拟；后续可接真实监控）
- `/strategy`：竞争策略分析 → 输入关键词 → Google SERP 分析 → 页面策略建议
- `/strategy-v2`：**分层策略分析（推荐）** → 五步流水线：读懂 SERP → 评估可行性 → 选页面形态 → 产出打法大纲 → **一键复制「SERP 总结 + 特色板块 + 打法手册 + 控制指令」完整 JSON**（给下游内容生成当输入）

## 数据模型（MVP）

- **Product**：商品
- **Content**：AI 生成内容（3 种类型）
- **Post**：发布记录（平台、状态）
- **Mention**：AI 来源的提及数（MVP 可模拟）
- **StrategyAnalysis**：竞争策略分析记录（关键词、SERP 数据、策略建议）

## 环境变量（后续接真实 AI / Postgres 时用）

复制一份：

```bash
cp .env.example .env
```

字段说明：

- `OPENAI_API_KEY`：用于调用 OpenAI（不填则 `/generator` 使用模拟内容；`/chat` 会提示你先配置）
- `DATABASE_URL`：Prisma 数据库连接（MVP 默认 SQLite）
- `DATAFORSEO_CRED`：DataForSEO API 认证凭据（base64 编码的 login:password，用于竞争策略分析）

## 竞争策略分析功能

### 功能说明

输入一个关键词，系统会自动：

1. 调用 DataForSEO API 获取 Google SERP 搜索结果
2. 分析 TOP 10 结果的页面类型分布（列表页/内容页/产品页/功能页等）
3. 识别 SERP 特色区块（People Also Ask、知识面板、购物结果等）
4. 评估竞争对手强度
5. 输出推荐策略（页面类型+切入点+差异化方向+标题建议）
6. 提供相关关键词机会

### 使用步骤

1. 访问 `/strategy`
2. 输入关键词（例如：best solar garden lights）
3. 选择目标市场（中国/美国/英国/日本）
4. 选择目标语言（中文/English/日本語）
5. 点击"开始分析"
6. 等待数秒后查看完整分析报告

### API 接口说明

#### 开始分析

- **POST** `/api/strategy/analyze`
- **请求 JSON**
  - `keyword`：string，搜索关键词（必填）
  - `location`：string（可选），目标市场代码，默认 "2156"（中国）
  - `language`：string（可选），目标语言代码，默认 "zh-cn"
- **返回 JSON**
  - 成功：包含完整分析报告（搜索意图、页面类型分布、竞争对手列表、推荐策略等）
  - 失败：`{ "error": "..." }`

#### 历史记录

- **GET** `/api/strategy/history`
- **返回 JSON**：`{ "items": [{ id, keyword, status, createdAt }] }`

#### 分层策略（V2）

- **POST** `/api/strategy-v2/analyze`
- **请求 JSON**：`keyword`（必填）、`location`、`language`、`layer`（`layer1` … `layer5`）
- **Layer5 返回**：除 `finalStrategy` 外，还有 `finalBundle` / `finalBundleJson`：**已合并 SERP 人话总结、特色板块总结、打法手册（缺什么/风险/你能做什么）、以及 `controlSignals`**，便于整条粘贴到内容生成流程。

### 页面类型分类说明

系统会将 SERP 结果分为 8 种类型：

- **列表页 (Listicle)**：测评排行、对比清单（"best of", "top 10", "vs"）
- **内容页 (Content)**：教程、指南、深度文章（"how to", "guide", "tutorial"）
- **产品页 (Product)**：单一商品详情页（电商 URL、价格、购买按钮）
- **功能页 (Tool)**：在线工具、计算器（交互功能、表单）
- **首页 (Homepage)**：网站首页（域名根路径）
- **百科页 (Wiki)**：Wikipedia、百度百科（wiki 域名）
- **论坛页 (Forum)**：Reddit、知乎、Quora（论坛域名、UGC）
- **文档页 (Documentation)**：API 文档、技术文档（docs 路径、代码示例）

### 如何判断该做什么类型的页面？

看页面类型分布占比：

- 某类型占比 **≥ 40%**：Google 偏好此类内容，优先跟进
- 某类型占比 **20-40%**：有机会，需要差异化
- 某类型占比 **< 20%**：蓝海或需求不强

## Chat（最简单的 GPT 调用示例）

### 1) 配置 Key

在 `.env` 里新增（或取消注释）：

```bash
OPENAI_API_KEY="你的key"
```

### 2) 打开页面

启动后访问：

- `/chat`

### 3) 接口说明（给你做二次开发用）

- **POST** `/api/chat`
- **请求 JSON**
  - `input`：string，你输入的内容
  - `model`：string（可选），模型 ID（例如 `gpt-4.1-mini`）
- **返回 JSON**
  - 成功：`{ "output": "..." }`
  - 失败：`{ "error": "..." }`

### 4) 为什么现在能"边生成边显示"

为了让你看到中间态（不再"卡住半天"），`/chat` 页面默认走 **流式接口**：

- **POST** `/api/chat/stream`
- 返回是 **SSE（Server-Sent Events）**，前端会逐步收到：
  - `status`：当前阶段（已提交/已连接/生成中/完成）
  - `token`：模型输出的一小段文本（不断追加到页面）
  - `done`：结束
  - `error`：错误信息

### 5) 模型下拉框从哪里来

`/chat` 页面会调用：

- **GET** `/api/chat/models`

服务端会用你的 `OPENAI_API_KEY` 拉取可用模型，并过滤出"文本相关"的模型用于下拉框。