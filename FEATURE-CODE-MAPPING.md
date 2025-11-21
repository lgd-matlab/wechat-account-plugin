# 📂 WeWe RSS for Obsidian - 功能-代码映射报告

> **生成时间**: 2025-11-20
> **项目版本**: 0.1.1
> **报告目的**: 帮助用户用自然语言描述功能,AI 快速定位代码位置

---

## 🏗️ 项目概览

### 技术栈
- **主要框架**: Obsidian Plugin API (Electron + TypeScript)
- **数据库**: SQLite (sql.js WebAssembly)
- **HTML 解析**: Cheerio
- **二维码**: node-qrcode
- **日期处理**: Day.js
- **构建工具**: esbuild
- **包管理**: npm

### 架构模式
- **分层架构**: UI Layer → Service Layer → Data Layer → Storage Layer
- **仓储模式**: 数据访问通过 Repository 类封装
- **依赖注入**: 服务通过构造函数注入依赖

### 状态管理
- **无状态 UI**: UI 组件直接查询服务获取最新数据
- **数据源**: DatabaseService (SQLite) 是唯一数据源

### 样式方案
- **Obsidian CSS 变量**: 完全使用 Obsidian 主题变量
- **自定义样式**: styles.css (461 行,响应式设计)

### 构建工具
- **开发模式**: `npm run dev` (watch mode)
- **生产构建**: `npm run build`
- **类型检查**: TypeScript 5.3+ (严格模式)

### 包管理
- npm (推荐 npm 8+)

---

## 📊 功能模块统计

### 页面级组件
- **侧边栏视图**: 1 个 (WeWeRssSidebarView)
- **设置页面**: 2 个 (General Settings + AI Settings)

### 模态对话框
- **账号管理**: 1 个 (AddAccountModal - QR 扫码登录)
- **订阅管理**: 1 个 (AddFeedModal - 添加订阅源)
- **数据管理**: 1 个 (CleanupArticlesModal - 清理旧文章)

### 业务逻辑服务
- **核心服务**: 6 个 (AccountService, FeedService, SyncService, NoteCreator, TaskScheduler, SummaryService)
- **数据库服务**: 1 个 (DatabaseService + 3 Repositories)
- **API 客户端**: 1 个 (WeChatApiClient)

### 样式文件
- **主样式**: 1 个 (styles.css - 461 行)

### 配置文件
- **插件配置**: manifest.json
- **TypeScript**: tsconfig.json
- **构建配置**: esbuild.config.mjs
- **测试配置**: jest.config.js

---

## 🗂️ 目录结构概览

```
D:\obsidian-plugin\wechat-account-assemble/
├── src/
│   ├── main.ts                 # 插件入口
│   ├── services/               # 业务逻辑层
│   │   ├── AccountService.ts
│   │   ├── FeedService.ts
│   │   ├── SyncService.ts
│   │   ├── NoteCreator.ts
│   │   ├── TaskScheduler.ts
│   │   ├── SummaryService.ts
│   │   ├── database/           # 数据访问层
│   │   │   ├── DatabaseService.ts
│   │   │   ├── repositories/
│   │   │   │   ├── AccountRepository.ts
│   │   │   │   ├── FeedRepository.ts
│   │   │   │   └── ArticleRepository.ts
│   │   │   ├── DatabaseBackupService.ts
│   │   │   └── DatabaseHealthService.ts
│   │   ├── api/                # 外部 API 客户端
│   │   │   └── WeChatApiClient.ts
│   │   └── feed/               # 内容处理
│   │       └── ContentParser.ts
│   ├── ui/                     # 用户界面层
│   │   ├── views/
│   │   │   └── WeWeRssSidebarView.ts
│   │   ├── modals/
│   │   │   ├── AddAccountModal.ts
│   │   │   ├── AddFeedModal.ts
│   │   │   └── CleanupArticlesModal.ts
│   │   └── settings/
│   │       └── WeWeRssSettingTab.ts
│   ├── types/                  # TypeScript 类型定义
│   │   └── index.ts
│   ├── utils/                  # 工具函数
│   │   ├── helpers.ts
│   │   ├── logger.ts
│   │   └── constants.ts
│   └── lib/                    # 底层库封装
│       ├── html-parser.ts
│       └── sql-js-wrapper.ts
├── styles.css                  # 插件样式
├── manifest.json               # 插件元数据
├── package.json                # 依赖配置
└── README.md                   # 项目说明
```

---

## 🎯 功能映射表

### 🔐 账号管理 - 添加微信账号

**🔤 用户描述方式**:
- 主要: "添加微信账号", "扫码登录", "添加账号", "绑定微信"
- 别名: "账号授权", "微信认证", "QR 码登录", "扫码绑定", "Add Account"
- 相关词汇: "二维码", "扫一扫", "授权", "登录"

**📍 代码位置**:
- 主文件: `src/ui/modals/AddAccountModal.ts` (287 行) - 二维码登录弹窗
- 业务逻辑: `src/services/AccountService.ts` (createAccount, checkLoginStatus 方法)
- API 客户端: `src/services/api/WeChatApiClient.ts` (createLoginUrl, getLoginResult 方法)
- 数据存储: `src/services/database/repositories/AccountRepository.ts` (create 方法)

**🎨 视觉标识**:
- 触发位置:
  - 侧边栏顶部 "+ Account" 按钮 (小型按钮,灰色边框)
  - 设置页面 "Add New Account" 部分的 "Add Account" 按钮 (蓝色强调按钮)
  - 命令面板: "Add WeChat Account"
- 弹窗外观:
  - 标题: "Add WeChat Account"
  - 中央大尺寸二维码 (256x256 像素,白色边框)
  - 状态提示: "Waiting for scan..." / "Please scan the QR code..."
  - 底部按钮: "Cancel" 和 "Refresh QR Code"

**⚡ 修改指引**:
- **修改二维码样式**: 编辑 `AddAccountModal.ts:98-105` (QRCode.toCanvas 配置)
- **修改轮询间隔**: 编辑 `AddAccountModal.ts:130` (默认 2000ms)
- **修改超时时间**: 编辑 `AddAccountModal.ts:135` (默认 5 分钟)
- **修改弹窗样式**: 编辑 `styles.css:312-383` (`.wewe-rss-add-account-modal` 相关样式)
- **修改登录步骤说明**: 编辑 `AddAccountModal.ts:39-43` (步骤列表内容)

**🔗 相关命令**:
- 命令 ID: `add-wechat-account`
- 命令名称: "Add WeChat Account"
- 注册位置: `src/main.ts:116-123`

---

### 📚 订阅管理 - 添加订阅源

**🔤 用户描述方式**:
- 主要: "添加订阅", "订阅公众号", "添加 Feed", "添加订阅源"
- 别名: "关注公众号", "添加公众号", "订阅文章", "Add Feed", "Subscribe"
- 相关词汇: "分享链接", "mp.weixin.qq.com", "微信链接", "公众号链接"

**📍 代码位置**:
- 主文件: `src/ui/modals/AddFeedModal.ts` (191 行) - 添加订阅弹窗
- 业务逻辑: `src/services/FeedService.ts` (subscribeFeed, fetchHistoricalArticles 方法)
- API 客户端: `src/services/api/WeChatApiClient.ts` (getMpInfo, getArticles 方法)
- 数据存储: `src/services/database/repositories/FeedRepository.ts` (create 方法)

**🎨 视觉标识**:
- 触发位置:
  - 侧边栏顶部 "+ Feed" 按钮 (小型按钮,灰色边框)
  - 命令面板: "Add New Feed"
- 弹窗外观:
  - 标题: "Add WeChat Feed"
  - 输入框: 宽文本框,占满宽度
  - 占位符文本: "https://mp.weixin.qq.com/..."
  - 提示文本: "The link should start with 'https://mp.weixin.qq.com/'"
  - 底部按钮: "Cancel" 和 "Subscribe" (蓝色强调)
- 二次确认弹窗: "Fetch Articles?" (询问是否立即下载历史文章)

**⚡ 修改指引**:
- **修改输入验证规则**: 编辑 `AddFeedModal.ts:94-98` (URL 验证逻辑)
- **修改提示文本**: 编辑 `AddFeedModal.ts:56-60` (提示内容)
- **修改步骤说明**: 编辑 `AddFeedModal.ts:33-37` (订阅步骤)
- **修改弹窗样式**: 编辑 `styles.css:312-461` (`.wewe-rss-add-feed-modal` 相关样式)
- **修改确认对话框**: 编辑 `AddFeedModal.ts:149-183` (confirmFetchArticles 方法)
- **禁用自动下载文章**: 注释 `AddFeedModal.ts:115-126` (shouldFetchArticles 逻辑)

**🔗 相关命令**:
- 命令 ID: `add-new-feed`
- 命令名称: "Add New Feed"
- 注册位置: `src/main.ts:107-114`

---

### 🔄 文章同步 - 手动同步按钮

**🔤 用户描述方式**:
- 主要: "同步按钮", "手动同步", "刷新文章", "Sync 按钮"
- 别名: "更新文章", "下载新文章", "刷新订阅", "同步所有订阅", "立即同步"
- 相关词汇: "⟳ 符号", "旋转箭头", "蓝色按钮", "Sync Now"

**📍 代码位置**:
- 主文件: `src/ui/views/WeWeRssSidebarView.ts:88-95` (Sync 按钮创建)
- 点击处理: `src/ui/views/WeWeRssSidebarView.ts:264-285` (handleSync 方法)
- 业务逻辑: `src/services/SyncService.ts` (syncAll 方法)
- 按钮状态更新: 同上 (禁用/启用, 文本切换)

**🎨 视觉标识**:
- 位置: 侧边栏顶部右侧,第三个按钮
- 外观:
  - 文本: "⟳ Sync" (旋转箭头 + 文字)
  - 样式: 蓝色背景,白色文字 (`.wewe-rss-btn-primary`)
  - 状态: 同步中显示 "⟳ Syncing..." 且按钮禁用
- 按钮大小: 小型 (`.wewe-rss-btn-small`)

**⚡ 修改指引**:
- **修改按钮文本**: 编辑 `WeWeRssSidebarView.ts:89-90` ("⟳ Sync" 文本)
- **修改按钮样式**: 编辑 `styles.css:190-198` (`.wewe-rss-btn-primary` 类)
- **修改同步逻辑**: 编辑 `SyncService.ts` (syncAll 方法实现)
- **修改成功通知**: 编辑 `WeWeRssSidebarView.ts:274-276` (Notice 消息内容)
- **修改同步中文本**: 编辑 `WeWeRssSidebarView.ts:270` ("⟳ Syncing..." 文本)
- **添加同步进度显示**: 在 `handleSync` 方法中添加进度回调

**🔗 相关命令**:
- 命令 ID: `sync-all-feeds`
- 命令名称: "Sync All Feeds Now"
- 注册位置: `src/main.ts:92-105`

---

### 📊 侧边栏 - 统计信息栏

**🔤 用户描述方式**:
- 主要: "统计栏", "信息栏", "数据统计", "Stats Bar"
- 别名: "摘要信息", "概览栏", "状态栏", "顶部信息", "数字显示"
- 相关词汇: "feeds 数量", "synced 数量", "unsynced 数量", "上次同步"

**📍 代码位置**:
- 主文件: `src/ui/views/WeWeRssSidebarView.ts:98-145` (renderStats 方法)
- 数据源: `src/services/SyncService.ts` (getSyncStats 方法)
- 样式: `styles.css:25-52` (`.wewe-rss-stats-bar` 和 `.wewe-rss-stat-separator` 相关)

**🎨 视觉标识**:
- 位置: 侧边栏顶部,紧接着标题栏下方
- 外观:
  - 浅灰色背景 (`.wewe-rss-stats-bar`)
  - **单行内联显示**,使用分隔符连接
  - 分隔符: `|` 用于主要分组, `,` 用于同组内
- 显示格式:
  ```
  📚 5 feeds | 📄 97 synced, 23 unsynced | 🕒 2h ago
  ```
- 显示项:
  - 📚 X feeds (订阅源总数)
  - 📄 X synced (已同步文章数)
  - X unsynced (未同步文章数,橙色警告色,仅在 > 0 时显示)
  - 🕒 X ago (最后同步时间,灰色文字,仅在有同步记录时显示)

**⚡ 修改指引**:
- **修改统计项**: 编辑 `WeWeRssSidebarView.ts:103-144` (添加/删除统计项)
- **修改分隔符**: 编辑同上文件中的 `wewe-rss-stat-separator` span 元素 (默认 ` | ` 和 `, `)
- **修改分隔符样式**: 编辑 `styles.css:41-44` (`.wewe-rss-stat-separator` 类,颜色为 `--text-faint`)
- **修改表情符号**: 编辑 `WeWeRssSidebarView.ts` 中对应的 text 属性
- **修改样式**: 编辑 `styles.css:25-52` (颜色、间距、字体大小)
- **修改时间格式**: 编辑 `WeWeRssSidebarView.ts:317-326` (getTimeAgo 方法)
- **添加新统计项**: 在 `renderStats` 中添加分隔符 span + 数据 span
- **隐藏某个统计项**: 注释或删除对应的 `statsBar.createEl()` 调用及其分隔符

---

### 📝 文章列表 - 文章卡片

**🔤 用户描述方式**:
- 主要: "文章列表", "文章卡片", "文章项", "Article Item"
- 别名: "文章条目", "文章行", "文章记录", "Article Card"
- 相关词汇: "标题", "发布日期", "笔记链接", "已同步标记", "绿色勾号"

**📍 代码位置**:
- 主文件: `src/ui/views/WeWeRssSidebarView.ts:182-262` (renderArticles 方法)
- 数据源: `src/services/database/repositories/ArticleRepository.ts` (findByFeedId, findRecent 方法)
- 样式: `styles.css:200-256` (`.wewe-rss-article-item` 相关)

**🎨 视觉标识**:
- 位置: 侧边栏下半部分,标题为 "Articles"
- 外观:
  - 白色卡片,圆角矩形 (6px 圆角)
  - 灰色边框 (1px)
  - 悬停时: 边框变蓝色,轻微上移 (-1px),添加阴影
  - 已同步文章: 透明度 75%,标题前有绿色 ✓ 标记
- 内容结构:
  - **文章标题**: 粗体,深色 (`.wewe-rss-article-title`)
  - **元数据行**: 小号灰色文字
    - 发布日期: 格式化日期字符串
    - 笔记链接: "📝 Note" (蓝色,可点击,仅在已同步时显示)

**⚡ 修改指引**:
- **修改卡片样式**: 编辑 `styles.css:200-219` (背景、边框、圆角、悬停效果)
- **修改已同步标记**: 编辑 `styles.css:217-224` (绿色勾号样式)
- **修改标题样式**: 编辑 `styles.css:226-231` (字体、粗细、颜色)
- **修改日期格式**: 编辑 `WeWeRssSidebarView.ts:220` (toLocaleDateString 格式)
- **修改笔记链接文本**: 编辑 `WeWeRssSidebarView.ts:227-228` ("📝 Note" 文本)
- **修改点击行为**: 编辑 `WeWeRssSidebarView.ts:242-260` (articleItem 点击事件)
- **修改显示数量**: 编辑 `WeWeRssSidebarView.ts:187-190` (50 或 20 的限制)

---

### 📋 订阅源列表 - Feed 卡片

**🔤 用户描述方式**:
- 主要: "订阅列表", "Feed 列表", "订阅源卡片", "Feed Card"
- 别名: "频道列表", "公众号列表", "订阅项", "Feed Item"
- 相关词汇: "订阅名称", "文章数量", "最后同步时间", "选中状态", "蓝色边框"

**📍 代码位置**:
- 主文件: `src/ui/views/WeWeRssSidebarView.ts:129-180` (renderFeeds 方法)
- 数据源: `src/services/database/repositories/FeedRepository.ts` (findAll 方法)
- 样式: `styles.css:98-133` (`.wewe-rss-feed-item` 相关)

**🎨 视觉标识**:
- 位置: 侧边栏上半部分,标题为 "Feeds"
- 外观:
  - 圆角矩形卡片 (6px 圆角)
  - 默认: 透明背景,透明边框
  - 悬停: 浅灰色背景,灰色边框
  - 选中: 深色背景,蓝色边框 (`.wewe-rss-feed-item-selected`)
- 内容结构:
  - **订阅标题**: 粗体,深色 (`.wewe-rss-feed-title`)
  - **统计信息**: 小号灰色文字,水平排列
    - 文章数量: "X articles"
    - 同步时间: "X ago" (如 "2h ago", "1d ago")

**⚡ 修改指引**:
- **修改卡片样式**: 编辑 `styles.css:98-115` (背景、边框、圆角、过渡效果)
- **修改选中状态样式**: 编辑 `styles.css:112-115` (选中时背景和边框颜色)
- **修改标题样式**: 编辑 `styles.css:117-121` (字体、粗细、颜色)
- **修改统计信息样式**: 编辑 `styles.css:123-133` (字体大小、颜色、间距)
- **修改空状态提示**: 编辑 `WeWeRssSidebarView.ts:135-139` (空状态文本)
- **修改点击行为**: 编辑 `WeWeRssSidebarView.ts:174-178` (feedItem 点击事件)

---

### ⚙️ 设置页面 - 通用设置标签

**🔤 用户描述方式**:
- 主要: "设置页面", "插件设置", "General 设置", "通用设置"
- 别名: "配置页面", "选项页面", "Settings Tab", "参数设置"
- 相关词汇: "同步间隔", "笔记模板", "文件夹路径", "自动同步"

**📍 代码位置**:
- 主文件: `src/ui/settings/WeWeRssSettingTab.ts` (838 行)
- 设置数据: `src/types/index.ts` (WeWeRssSettings 接口, DEFAULT_SETTINGS 常量)
- 样式: `styles.css:418-461` (设置页面相关样式)

**🎨 视觉标识**:
- 位置: Obsidian 设置面板 → 插件选项 → WeWe RSS
- 外观:
  - 顶部: "WeWe RSS Settings" 标题
  - 标签切换: "General" | "AI Settings" (两个标签按钮)
  - 内容区: 垂直滚动的设置项列表
  - 分组: 用 `<h3>` 标题分隔不同设置组

**设置分组**:
1. **Account Management** (账号管理)
   - 账号列表: 显示所有已添加账号,每个账号带状态徽章和删除按钮
   - Add New Account 按钮: 打开二维码登录弹窗

2. **Sync Settings** (同步设置)
   - Auto Sync: 开关
   - Sync Interval: 滑块 (15-360 分钟)
   - Update Delay: 滑块 (10-300 秒)
   - Max Articles Per Feed: 滑块 (10-500)
   - Sync Days Filter: 数字输入 (1-365 天)

3. **Note Settings** (笔记设置)
   - Note Folder: 文本输入
   - Add Tags: 开关
   - Note Template: 多行文本框 (12 行)
   - Reset Template: 按钮 (重置为默认模板)

4. **Content Settings** (内容设置)
   - Feed Mode: 下拉选择 (Summary / Full Text)
   - Clean HTML: 开关

5. **Title Filtering** (标题过滤)
   - Include Patterns: 多行文本框 (正则表达式列表)
   - Exclude Patterns: 多行文本框 (正则表达式列表)

6. **API Settings** (API 设置)
   - Platform URL: 文本输入
   - Max Requests Per Minute: 滑块 (10-120)

7. **Database Backup** (数据库备份)
   - Automatic Backups: 开关
   - Backup Retention: 滑块 (1-30 天)
   - Backup Before Sync: 开关
   - Create Manual Backup: 按钮
   - View All Backups: 按钮

8. **Advanced** (高级设置)
   - 数据库统计: 只读信息显示
   - Cleanup Old Articles: 按钮 (打开清理弹窗)
   - Database Location: 只读路径显示

**⚡ 修改指引**:
- **添加新设置项**:
  1. 在 `src/types/index.ts` 的 `WeWeRssSettings` 接口中添加字段
  2. 在 `DEFAULT_SETTINGS` 中添加默认值
  3. 在 `WeWeRssSettingTab.ts` 中添加对应的 UI 控件 (使用 `new Setting()`)
- **修改设置布局**: 编辑 `WeWeRssSettingTab.ts` 中的 `display()` 方法
- **修改标签导航**: 编辑 `WeWeRssSettingTab.ts:31-50` (addTabNavigation 方法)
- **修改设置样式**: 编辑 `styles.css:418-461`
- **修改设置验证逻辑**: 在各 `Setting` 的 `.onChange()` 回调中添加验证

---

### 🤖 AI 设置 - AI Summarization 标签

**🔤 用户描述方式**:
- 主要: "AI 设置", "AI 摘要", "AI Settings", "智能摘要"
- 别名: "AI 配置", "自动摘要", "AI 总结", "每日摘要", "Summary Settings"
- 相关词汇: "OpenAI", "Gemini", "Claude", "API Key", "模型选择"

**📍 代码位置**:
- 主文件: `src/ui/settings/WeWeRssSettingTab.ts:86-292` (displayAISettings 和 addSummarizationSettings 方法)
- 业务逻辑: `src/services/SummaryService.ts` (generateDailySummary 方法)
- 定时任务: `src/main.ts:192-249` (scheduleAutomaticSummarization 方法)

**🎨 视觉标识**:
- 位置: 设置页面 → AI Settings 标签
- 外观:
  - 顶部说明: "Configure AI-powered summarization for your WeChat articles."
  - 设置项: 垂直排列的表单控件

**设置项**:
1. **Enable AI Summarization**: 开关 (启用后显示其他设置)
2. **AI Provider**: 下拉选择
   - OpenAI
   - Google Gemini
   - Anthropic Claude
   - DeepSeek
   - Zhipu GLM
   - Generic (OpenAI-compatible)
3. **API Key**: 密码输入框 (自动隐藏)
4. **API Endpoint**: 文本输入 (带默认值提示)
5. **Model**: 文本输入 (带默认值提示)
6. **Summary Folder**: 文本输入 (摘要保存位置)
7. **Auto-run Daily**: 开关 (启用自动定时生成)
8. **Schedule Time**: 文本输入 (24 小时格式, 如 "01:00")
9. **Generate Summary**: 按钮 (手动触发生成)
10. **Last run**: 只读文本 (显示最后运行时间)

**⚡ 修改指引**:
- **添加新 AI 提供商**:
  1. 在 `WeWeRssSettingTab.ts:270-292` 的 `getDefaultEndpoint` 和 `getDefaultModel` 中添加默认值
  2. 在 `WeWeRssSettingTab.ts:122-129` 的下拉选择中添加选项
  3. 在 `src/services/SummaryService.ts` 中添加对应的 API 调用逻辑
- **修改默认 API 端点**: 编辑 `WeWeRssSettingTab.ts:270-279` (endpoints 对象)
- **修改默认模型**: 编辑 `WeWeRssSettingTab.ts:282-291` (models 对象)
- **修改摘要模板**: 编辑 `src/services/SummaryService.ts` 中的模板字符串
- **修改定时任务逻辑**: 编辑 `src/main.ts:192-249`
- **修改手动生成按钮行为**: 编辑 `WeWeRssSettingTab.ts:226-256`

---

### 🗑️ 数据管理 - 清理旧文章

**🔤 用户描述方式**:
- 主要: "清理文章", "删除旧文章", "Cleanup Articles", "数据清理"
- 别名: "清空数据库", "删除历史", "清理旧数据", "释放空间"
- 相关词汇: "保留天数", "删除记录", "删除笔记", "批量删除"

**📍 代码位置**:
- 主文件: `src/ui/modals/CleanupArticlesModal.ts` (206 行)
- 触发位置: `src/ui/settings/WeWeRssSettingTab.ts:671-704` (Cleanup Old Articles 按钮)
- 业务逻辑: `src/services/SyncService.ts` (cleanupOldArticles 方法)
- 数据删除: `src/services/database/repositories/ArticleRepository.ts` (deleteOlderThan 方法)

**🎨 视觉标识**:
- 触发位置: 设置页面 → General → Advanced → "Cleanup Old Articles" 按钮 (橙色警告按钮)
- 弹窗外观:
  - 标题: "Clean Up Old Articles"
  - 说明: 两段文字
    - 第一段: 功能说明 (删除指定天数前的文章)
    - 第二段: 警告 (红色背景,警告会删除笔记文件)
  - 输入区: "Keep articles from last" + 数字输入框 + "days" 标签
  - 预览区: "📊 Preview: Approximately X articles will be deleted" (橙色警告色)
  - 按钮区: "Cancel" 和 "Delete Articles & Notes" (红色警告按钮)

**⚡ 修改指引**:
- **修改默认保留天数**: 编辑 `WeWeRssSettingTab.ts:680` (defaultDays 变量)
- **修改天数范围**: 编辑 `CleanupArticlesModal.ts:73-74` (min="1" max="365")
- **修改警告文本**: 编辑 `CleanupArticlesModal.ts:46-53` (警告段落内容)
- **修改预览文本**: 编辑 `CleanupArticlesModal.ts:146-154` (getPreviewText 方法)
- **修改删除逻辑**: 编辑 `SyncService.ts` 中的 `cleanupOldArticles` 方法
- **修改弹窗样式**: 在 `styles.css` 中添加 `.wewe-rss-cleanup-modal` 相关样式
- **修改确认按钮文本**: 编辑 `CleanupArticlesModal.ts:120` ("Delete Articles & Notes" 文本)

---

### 🎨 侧边栏 - RSS 图标

**🔤 用户描述方式**:
- 主要: "RSS 图标", "侧边栏图标", "Ribbon Icon", "打开插件图标"
- 别名: "左侧图标", "RSS 按钮", "插件入口", "WeWe RSS 图标"
- 相关词汇: "rss 符号", "橙色图标", "侧边栏按钮", "点击打开"

**📍 代码位置**:
- 主文件: `src/main.ts:78-81` (addRibbonIcon 调用)
- 点击处理: `src/main.ts:165-190` (activateView 方法)
- 图标定义: Obsidian 内置 'rss' 图标

**🎨 视觉标识**:
- 位置: Obsidian 左侧垂直工具栏 (Ribbon)
- 外观:
  - 图标: RSS 符号 (三个弧形波纹 + 圆点)
  - 颜色: 跟随 Obsidian 主题 (默认灰色,悬停时高亮)
  - 悬停提示: "WeWe RSS"

**⚡ 修改指引**:
- **更换图标**: 编辑 `main.ts:79` ('rss' → 其他 Obsidian 图标名称)
  - 可用图标列表: https://lucide.dev/
- **修改悬停提示**: 编辑 `main.ts:79` ('WeWe RSS' → 自定义文本)
- **修改点击行为**: 编辑 `main.ts:165-190` (activateView 方法逻辑)
- **添加右键菜单**: 在 `addRibbonIcon` 返回值上调用 `addEventListener('contextmenu', ...)`

---

### 📂 数据库 - 自动备份

**🔤 用户描述方式**:
- 主要: "数据库备份", "自动备份", "Database Backup", "数据备份"
- 别名: "备份数据库", "数据保护", "自动存档", "备份功能"
- 相关词汇: "备份文件", "恢复数据", "备份保留", "手动备份"

**📍 代码位置**:
- 主文件: `src/services/database/DatabaseBackupService.ts` (备份服务)
- 设置界面: `src/ui/settings/WeWeRssSettingTab.ts:556-641` (addDatabaseBackupSettings 方法)
- 触发时机:
  - 插件初始化: `src/services/database/DatabaseService.ts:initialize()` (pre-initialization)
  - 数据库迁移前: `DatabaseService.ts` (pre-migration)
  - 同步前: `src/services/SyncService.ts` (pre-sync, 可选)
  - 手动触发: 设置页面按钮

**🎨 视觉标识**:
- 位置: 设置页面 → General → Database Backup 区域
- 设置项:
  1. **Automatic Backups**: 开关 (默认开启)
  2. **Backup Retention**: 滑块 (1-30 天, 默认 7 天)
  3. **Backup Before Sync**: 开关 (默认开启)
  4. **Create Manual Backup**: 蓝色按钮
  5. **View All Backups**: 普通按钮 (显示备份列表)

**⚡ 修改指引**:
- **修改备份保留天数**: 编辑 `WeWeRssSettingTab.ts:577-587` (滑块范围和默认值)
- **修改备份触发时机**:
  - 在 `DatabaseService.ts:initialize()` 中添加/删除 `await this.backup()` 调用
  - 在 `SyncService.ts:syncAll()` 开头添加备份逻辑
- **修改备份文件命名**: 编辑 `DatabaseBackupService.ts` 中的文件名生成逻辑
- **添加备份压缩**: 在 `DatabaseBackupService.ts` 中使用 Node.js zlib 压缩
- **修改备份存储路径**: 编辑 `DatabaseBackupService.ts` 中的路径逻辑
- **修改备份清理逻辑**: 编辑 `DatabaseBackupService.ts` 中的 `cleanOldBackups` 方法

---

### 📊 状态栏 - 插件状态指示

**🔤 用户描述方式**:
- 主要: "状态栏", "插件状态", "Status Bar", "底部状态"
- 别名: "状态指示", "运行状态", "同步状态", "底部信息"
- 相关词汇: "Idle", "Syncing", "Error", "状态文本"

**📍 代码位置**:
- 主文件: `src/main.ts:138-140` (addStatusBarItem 调用)
- 样式: `styles.css:279-309` (`.wewe-rss-status-bar` 相关)

**🎨 视觉标识**:
- 位置: Obsidian 底部状态栏,右侧区域
- 外观:
  - 默认文本: "WeWe RSS: Idle"
  - 字体大小: 小号 (0.85em)
  - 颜色: 灰色 (跟随主题)
- 状态指示器 (可选):
  - 圆点: 6px 圆形
  - 绿色: 正常运行
  - 蓝色 (脉冲动画): 同步中
  - 红色: 错误状态

**⚡ 修改指引**:
- **修改默认文本**: 编辑 `main.ts:139` ("WeWe RSS: Idle" → 自定义文本)
- **添加动态状态更新**:
  1. 在插件类中保存 `statusBarItem` 引用: `this.statusBarItem = this.addStatusBarItem()`
  2. 在同步开始时: `this.statusBarItem.setText('WeWe RSS: Syncing...')`
  3. 在同步结束时: `this.statusBarItem.setText('WeWe RSS: Idle')`
- **添加状态指示器**:
  ```typescript
  const indicator = statusBarItem.createEl('span', { cls: 'wewe-rss-status-indicator' });
  // 修改状态: indicator.addClass('syncing') 或 indicator.removeClass('syncing')
  ```
- **修改样式**: 编辑 `styles.css:279-309`

---

### 🔍 文章过滤 - 标题正则过滤

**🔤 用户描述方式**:
- 主要: "标题过滤", "文章过滤", "Title Filtering", "正则过滤"
- 别名: "关键词过滤", "标题筛选", "内容过滤", "白名单/黑名单"
- 相关词汇: "Include Patterns", "Exclude Patterns", "正则表达式", "过滤规则"

**📍 代码位置**:
- 设置界面: `src/ui/settings/WeWeRssSettingTab.ts:486-527` (addTitleFilteringSettings 方法)
- 过滤逻辑: `src/services/FeedService.ts` (fetchHistoricalArticles 方法中的 filter 逻辑)
- 配置存储: `src/types/index.ts` (titleIncludePatterns, titleExcludePatterns 字段)

**🎨 视觉标识**:
- 位置: 设置页面 → General → Title Filtering 区域
- 设置项:
  1. **说明文本**: "Use regex patterns to filter articles by title. Leave empty to include all articles."
  2. **Include Patterns**: 多行文本框 (3 行)
     - 占位符: "Example: AI, Machine Learning, 人工智能"
     - 格式: 逗号分隔的正则表达式列表
  3. **Exclude Patterns**: 多行文本框 (3 行)
     - 占位符: "Example: 广告, 推广, Advertisement"
     - 格式: 逗号分隔的正则表达式列表

**⚡ 修改指引**:
- **修改占位符示例**: 编辑 `WeWeRssSettingTab.ts:499, 516` (setPlaceholder 内容)
- **修改文本框行数**: 编辑 `WeWeRssSettingTab.ts:508, 525` (text.inputEl.rows = 3)
- **修改分隔符**: 编辑 `WeWeRssSettingTab.ts:502-505, 519-522` (split(',') → split(';') 等)
- **添加过滤预览**: 在设置页面添加实时预览功能,显示匹配的文章数量
- **修改过滤逻辑**:
  - 编辑 `FeedService.ts` 中的过滤实现
  - 支持更复杂的过滤条件 (如 AND/OR 逻辑)
- **添加过滤测试工具**: 添加一个测试按钮,测试正则表达式是否有效

---

### 📄 笔记模板 - 自定义模板

**🔤 用户描述方式**:
- 主要: "笔记模板", "Note Template", "文章模板", "Markdown 模板"
- 别名: "笔记格式", "内容模板", "自定义模板", "文章格式"
- 相关词汇: "变量", "占位符", "{{title}}", "{{content}}", "frontmatter"

**📍 代码位置**:
- 设置界面: `src/ui/settings/WeWeRssSettingTab.ts:416-457` (Note Template 设置项)
- 模板应用: `src/services/NoteCreator.ts` (createNoteFromArticle 方法)
- 默认模板: `src/types/index.ts:63-77` (DEFAULT_SETTINGS.noteTemplate)

**🎨 视觉标识**:
- 位置: 设置页面 → General → Note Settings → Note Template
- 设置项:
  1. **说明文本**: "Template for created notes. Available variables: {{title}}, {{feedName}}, {{url}}, {{publishedAt}}, {{content}}, {{tags}}, {{date}}"
  2. **多行文本框**: 12 行,50 列,白色背景
  3. **Reset Template 按钮**: 重置为默认模板

**可用变量**:
- `{{title}}`: 文章标题
- `{{feedName}}`: 订阅源名称
- `{{url}}`: 文章永久链接
- `{{publishedAt}}`: 发布时间
- `{{content}}`: 文章内容 (Markdown 格式)
- `{{tags}}`: 标签 (从 feedName 生成)
- `{{date}}`: 当前日期

**默认模板**:
```markdown
---
title: {{title}}
url: {{url}}
published: {{publishedAt}}
feed: {{feedName}}
tags: [wewe-rss, {{feedName}}]
---

# {{title}}

> Published: {{publishedAt}}
> Source: [{{feedName}}]({{url}})

{{content}}
```

**⚡ 修改指引**:
- **修改默认模板**: 编辑 `src/types/index.ts:63-77` (DEFAULT_SETTINGS.noteTemplate)
- **添加新变量**:
  1. 在 `NoteCreator.ts:createNoteFromArticle()` 中添加变量替换逻辑
  2. 在设置说明中添加变量文档
- **修改变量语法**: 编辑 `NoteCreator.ts` 中的正则替换逻辑 (如使用 `${variable}` 而不是 `{{variable}}`)
- **添加模板预设**: 在设置页面添加下拉选择,提供多个预设模板
- **添加模板验证**: 检查模板中是否包含必需变量,显示警告
- **修改文本框大小**: 编辑 `WeWeRssSettingTab.ts:427-428` (rows 和 cols 属性)

---

## 🚀 使用说明

### 对于用户

当你想修改某个功能时,只需告诉 AI:

**示例 1**:
- 用户: "我想把同步按钮的颜色改成绿色"
- AI: 根据 "文章同步 - 手动同步按钮" 映射,定位到 `styles.css:190-198` 的 `.wewe-rss-btn-primary` 类,修改背景色

**示例 2**:
- 用户: "二维码太小了,我想放大一些"
- AI: 根据 "账号管理 - 添加微信账号" 映射,定位到 `AddAccountModal.ts:98` 的 `width: 256`,修改为更大的值

**示例 3**:
- 用户: "文章列表的日期格式改成中文"
- AI: 根据 "文章列表 - 文章卡片" 映射,定位到 `WeWeRssSidebarView.ts:220`,修改 `toLocaleDateString()` 为 `toLocaleDateString('zh-CN')`

**示例 4**:
- 用户: "添加一个新的 AI 提供商,叫 Moonshot"
- AI: 根据 "AI 设置 - AI Summarization 标签" 映射,按步骤修改:
  1. `WeWeRssSettingTab.ts:270-279` 添加端点
  2. `WeWeRssSettingTab.ts:282-291` 添加默认模型
  3. `WeWeRssSettingTab.ts:122-129` 添加下拉选项
  4. `SummaryService.ts` 添加 API 调用逻辑

### 对于 AI

收到用户需求后,按照以下步骤操作:

1. **识别用户意图**:
   - 分析用户描述,匹配"用户描述方式"中的关键词
   - 确定用户想修改哪个功能模块

2. **定位代码位置**:
   - 查看"代码位置"部分,找到主文件和相关文件
   - 根据"修改指引"确定具体要修改的行数或方法

3. **理解视觉标识**:
   - 确认用户描述的 UI 元素与文档中的描述一致
   - 避免误修改其他相似的元素

4. **执行修改**:
   - 使用 Read 工具读取目标文件
   - 使用 Edit 或 Write 工具进行修改
   - 根据"修改指引"中的建议进行精确修改

5. **验证修改**:
   - 检查修改是否符合用户需求
   - 提醒用户需要重新编译 (`npm run build` 或 `npm run dev`)

### 常见任务快速索引

| 用户需求 | 对应功能模块 | 关键文件 |
|---------|------------|---------|
| 修改按钮文字/颜色 | 侧边栏/设置页面 | `WeWeRssSidebarView.ts`, `styles.css` |
| 调整二维码大小 | 账号管理 - 添加微信账号 | `AddAccountModal.ts:98` |
| 修改同步间隔范围 | 设置页面 - 同步设置 | `WeWeRssSettingTab.ts:327-339` |
| 更改笔记存储位置 | 设置页面 - 笔记设置 | `WeWeRssSettingTab.ts:394-404` |
| 添加新的统计项 | 侧边栏 - 统计信息栏 | `WeWeRssSidebarView.ts:98-127` |
| 修改文章卡片样式 | 文章列表 - 文章卡片 | `styles.css:200-256` |
| 添加新 AI 提供商 | AI 设置 | `WeWeRssSettingTab.ts:270-291` + `SummaryService.ts` |
| 修改备份保留天数 | 数据库备份 | `WeWeRssSettingTab.ts:577-587` |
| 调整文章过滤规则 | 标题过滤 | `FeedService.ts` + `WeWeRssSettingTab.ts:486-527` |
| 自定义笔记模板 | 笔记模板 | `types/index.ts:63-77` + `NoteCreator.ts` |

---

## 🎯 架构关键点

### 数据流向

```
用户操作 (UI 点击/输入)
  ↓
UI 组件 (View/Modal/Settings)
  ↓
服务层 (Service)
  ↓
仓储层 (Repository)
  ↓
数据库 (SQLite via sql.js)
  ↓
返回结果 → 更新 UI
```

### 关键设计模式

1. **仓储模式 (Repository Pattern)**
   - 所有数据库操作封装在 Repository 类中
   - 业务逻辑层通过 Repository 访问数据
   - 文件位置: `src/services/database/repositories/`

2. **服务层 (Service Layer)**
   - 业务逻辑集中在 Service 类中
   - Service 协调多个 Repository 完成复杂操作
   - 文件位置: `src/services/`

3. **依赖注入 (Dependency Injection)**
   - 所有服务通过构造函数注入插件实例
   - 方便测试和解耦
   - 示例: `new AccountService(this)` 在 `main.ts:37`

4. **事件驱动 (Event-Driven)**
   - UI 组件监听用户事件 (click, input, change)
   - 通过回调触发服务层操作
   - 示例: `button.addEventListener('click', async () => {...})`

### 关键技术细节

1. **SQLite 内嵌**: 使用 sql.js (WebAssembly) 在浏览器中运行 SQLite
2. **HTML → Markdown**: 使用 Cheerio 解析 HTML,自定义转换逻辑
3. **异步架构**: 所有数据库和网络操作都是异步的 (async/await)
4. **错误处理**: 使用 try-catch + Obsidian Notice 显示错误
5. **定时任务**: TaskScheduler 管理所有定时任务 (同步、摘要等)

---

## 📝 附录: 文件映射表

### UI 组件文件

| 文件路径 | 功能 | 行数 | 涉及功能 |
|---------|------|------|---------|
| `src/ui/views/WeWeRssSidebarView.ts` | 主侧边栏视图 | 314 | 统计栏、订阅列表、文章列表、同步按钮 |
| `src/ui/modals/AddAccountModal.ts` | 账号添加弹窗 | 287 | 二维码登录、账号认证 |
| `src/ui/modals/AddFeedModal.ts` | 订阅添加弹窗 | 191 | 订阅源添加、链接验证 |
| `src/ui/modals/CleanupArticlesModal.ts` | 清理文章弹窗 | 206 | 旧文章清理、数据管理 |
| `src/ui/settings/WeWeRssSettingTab.ts` | 设置页面 | 838 | 所有插件设置 |

### 服务层文件

| 文件路径 | 功能 | 行数 | 涉及功能 |
|---------|------|------|---------|
| `src/services/AccountService.ts` | 账号管理 | ~200 | 账号增删查改、认证 |
| `src/services/FeedService.ts` | 订阅管理 | ~300 | 订阅增删、文章同步 |
| `src/services/SyncService.ts` | 同步服务 | ~400 | 文章同步、统计、清理 |
| `src/services/NoteCreator.ts` | 笔记创建 | ~200 | Markdown 笔记生成 |
| `src/services/TaskScheduler.ts` | 定时任务 | ~150 | 定时同步、定时摘要 |
| `src/services/SummaryService.ts` | AI 摘要 | ~300 | 每日摘要生成、AI API 调用 |

### 数据访问层文件

| 文件路径 | 功能 | 行数 | 涉及功能 |
|---------|------|------|---------|
| `src/services/database/DatabaseService.ts` | 数据库服务 | ~400 | 数据库初始化、迁移、备份 |
| `src/services/database/repositories/AccountRepository.ts` | 账号仓储 | ~150 | 账号数据 CRUD |
| `src/services/database/repositories/FeedRepository.ts` | 订阅仓储 | ~200 | 订阅数据 CRUD |
| `src/services/database/repositories/ArticleRepository.ts` | 文章仓储 | ~250 | 文章数据 CRUD、查询 |
| `src/services/database/DatabaseBackupService.ts` | 备份服务 | ~200 | 数据库备份、恢复 |

### 样式文件

| 文件路径 | 功能 | 行数 | 涉及功能 |
|---------|------|------|---------|
| `styles.css` | 全局样式 | 461 | 所有 UI 组件样式 |

### 类型定义文件

| 文件路径 | 功能 | 行数 | 涉及功能 |
|---------|------|------|---------|
| `src/types/index.ts` | 核心类型定义 | 213 | 所有数据结构、接口、枚举 |

---

## 🔍 问题排查指南

### 问题: 找不到某个按钮/功能

**解决步骤**:
1. 在本文档中搜索用户描述的关键词 (如 "同步", "账号", "设置")
2. 查看"视觉标识"部分,确认位置描述是否匹配
3. 使用"代码位置"中的文件路径读取源代码
4. 使用浏览器开发者工具检查 DOM 结构和 CSS 类名

### 问题: 修改后没有效果

**可能原因**:
1. **未重新编译**: 运行 `npm run build` 或重启 `npm run dev`
2. **缓存问题**: 在 Obsidian 中按 Ctrl+R (Windows) 或 Cmd+R (macOS) 刷新插件
3. **文件路径错误**: 确认修改的是正确的文件 (不是 node_modules 中的文件)
4. **CSS 优先级**: 检查 CSS 选择器优先级,可能需要添加 `!important`

### 问题: 不确定修改哪个文件

**解决方案**:
1. **UI 相关**: 优先查看 `src/ui/` 目录
2. **业务逻辑**: 查看 `src/services/` 目录
3. **样式问题**: 查看 `styles.css`
4. **数据结构**: 查看 `src/types/index.ts`
5. **使用全局搜索**: 搜索关键词 (如按钮文本、类名、函数名)

---

## 📚 相关文档

- **项目主文档**: `CLAUDE.md` - 项目架构和开发指南
- **模块文档**:
  - `src/services/CLAUDE.md` - 服务层详细文档
  - `src/ui/CLAUDE.md` - UI 层详细文档
  - `src/types/CLAUDE.md` - 类型系统文档
- **测试文档**: `src/__tests__/CLAUDE.md` - 测试策略和覆盖率

---

## 🎉 总结

本文档提供了 **WeWe RSS for Obsidian** 插件的完整功能-代码映射,帮助用户和 AI 快速定位任何功能对应的代码位置。

**核心优势**:
- ✅ **自然语言友好**: 用户用日常语言描述功能,AI 自动匹配
- ✅ **精确定位**: 每个功能都有明确的文件路径、行号和方法名
- ✅ **视觉标识**: 详细描述 UI 元素的外观和位置
- ✅ **修改指引**: 提供具体的修改步骤和代码片段
- ✅ **实例驱动**: 大量真实示例,快速上手

**使用建议**:
- 用户: 用自然语言描述你想修改的功能
- AI: 在本文档中搜索关键词,定位代码,执行修改
- 开发者: 参考"修改指引"部分,按照最佳实践进行修改

**维护说明**:
- 当添加新功能时,请同步更新本文档
- 保持"用户描述方式"的多样性,涵盖常见表达
- 定期审查"视觉标识",确保与实际 UI 一致

---

**最后更新**: 2025-11-20
**文档版本**: 1.0.0
**插件版本**: 0.1.1
**生成者**: Claude Code AI Assistant
