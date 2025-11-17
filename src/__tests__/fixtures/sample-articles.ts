/**
 * Sample article fixtures for testing
 * Provides realistic article data with full HTML and markdown content
 */

export const sampleArticleHtml1 = `
<div class="rich_media_content">
	<h2>TypeScript 在现代前端开发中的应用</h2>
	<p>TypeScript 是由微软开发的 JavaScript 超集，为大型应用开发提供了强类型支持。</p>

	<h3>核心特性</h3>
	<ul>
		<li>静态类型检查</li>
		<li>接口定义</li>
		<li>泛型支持</li>
		<li>装饰器模式</li>
	</ul>

	<h3>示例代码</h3>
	<pre><code class="language-typescript">
interface User {
	id: number;
	name: string;
	email: string;
}

function getUser(id: number): Promise&lt;User&gt; {
	return fetch(\`/api/users/\${id}\`)
		.then(res =&gt; res.json());
}
	</code></pre>

	<blockquote>
		TypeScript 让 JavaScript 更加安全和可维护。
	</blockquote>

	<p>图片示例：</p>
	<img src="https://example.com/typescript-logo.png" alt="TypeScript Logo" />

	<h3>最佳实践</h3>
	<ol>
		<li>启用 strict 模式</li>
		<li>使用接口定义数据结构</li>
		<li>避免使用 any 类型</li>
		<li>合理使用泛型</li>
	</ol>

	<p>了解更多请访问 <a href="https://www.typescriptlang.org">TypeScript 官网</a>。</p>
</div>
`;

export const sampleArticleMarkdown1 = `## TypeScript 在现代前端开发中的应用

TypeScript 是由微软开发的 JavaScript 超集，为大型应用开发提供了强类型支持。

### 核心特性

- 静态类型检查
- 接口定义
- 泛型支持
- 装饰器模式

### 示例代码

\`\`\`typescript
interface User {
  id: number;
  name: string;
  email: string;
}

function getUser(id: number): Promise<User> {
  return fetch(\`/api/users/\${id}\`)
    .then(res => res.json());
}
\`\`\`

> TypeScript 让 JavaScript 更加安全和可维护。

图片示例：

![TypeScript Logo](https://example.com/typescript-logo.png)

### 最佳实践

1. 启用 strict 模式
2. 使用接口定义数据结构
3. 避免使用 any 类型
4. 合理使用泛型

了解更多请访问 [TypeScript 官网](https://www.typescriptlang.org)。`;

export const sampleArticleHtml2 = `
<div class="rich_media_content">
	<h2>Obsidian 插件开发完全指南</h2>
	<p>Obsidian 是一款强大的知识管理工具，支持通过插件扩展功能。</p>

	<h3>开发环境准备</h3>
	<p>首先需要安装以下工具：</p>
	<ul>
		<li>Node.js (v16+)</li>
		<li>TypeScript</li>
		<li>Obsidian</li>
	</ul>

	<h3>插件结构</h3>
	<pre><code>
my-plugin/
├── main.ts
├── manifest.json
├── styles.css
└── package.json
	</code></pre>

	<p><strong>注意</strong>：插件必须遵循 Obsidian 的 API 规范。</p>

	<p>参考文档：<a href="https://docs.obsidian.md">Obsidian Docs</a></p>
</div>
`;

export const sampleArticleMarkdown2 = `## Obsidian 插件开发完全指南

Obsidian 是一款强大的知识管理工具，支持通过插件扩展功能。

### 开发环境准备

首先需要安装以下工具：

- Node.js (v16+)
- TypeScript
- Obsidian

### 插件结构

\`\`\`
my-plugin/
├── main.ts
├── manifest.json
├── styles.css
└── package.json
\`\`\`

**注意**：插件必须遵循 Obsidian 的 API 规范。

参考文档：[Obsidian Docs](https://docs.obsidian.md)`;

export const sampleArticleHtml3 = `
<div class="rich_media_content">
	<h2>前端性能优化实战</h2>
	<p>本文分享几个实用的前端性能优化技巧。</p>

	<h3>1. 图片优化</h3>
	<p>使用现代图片格式：</p>
	<ul>
		<li>WebP 格式（减少 25-35% 体积）</li>
		<li>AVIF 格式（最新标准）</li>
	</ul>

	<h3>2. 代码分割</h3>
	<p>使用 React.lazy 和 Suspense：</p>
	<pre><code class="language-javascript">
const LazyComponent = React.lazy(() =&gt; import('./LazyComponent'));

function App() {
	return (
		&lt;Suspense fallback={&lt;div&gt;Loading...&lt;/div&gt;}&gt;
			&lt;LazyComponent /&gt;
		&lt;/Suspense&gt;
	);
}
	</code></pre>

	<h3>3. 缓存策略</h3>
	<table>
		<tr>
			<th>资源类型</th>
			<th>缓存时间</th>
		</tr>
		<tr>
			<td>静态资源</td>
			<td>1年</td>
		</tr>
		<tr>
			<td>API响应</td>
			<td>5分钟</td>
		</tr>
	</table>
</div>
`;

export const sampleArticleMarkdown3 = `## 前端性能优化实战

本文分享几个实用的前端性能优化技巧。

### 1. 图片优化

使用现代图片格式：

- WebP 格式（减少 25-35% 体积）
- AVIF 格式（最新标准）

### 2. 代码分割

使用 React.lazy 和 Suspense：

\`\`\`javascript
const LazyComponent = React.lazy(() => import('./LazyComponent'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent />
    </Suspense>
  );
}
\`\`\`

### 3. 缓存策略

| 资源类型 | 缓存时间 |
| --- | --- |
| 静态资源 | 1年 |
| API响应 | 5分钟 |`;

// Full article database records
export interface ArticleFixture {
	id?: number; // Optional for auto-increment
	feed_id: number; // Numeric foreign key to feeds.id
	title: string;
	content: string;
	content_html: string;
	url: string;
	published_at: number;
	synced: number;
	note_id: string | null;
	created_at: number;
}

export const sampleArticle1: ArticleFixture = {
	feed_id: 1, // References sampleFeed1.id
	title: 'TypeScript 在现代前端开发中的应用',
	content: sampleArticleMarkdown1,
	content_html: sampleArticleHtml1,
	url: 'https://mp.weixin.qq.com/s/test-article-001',
	published_at: 1704067200000,
	synced: 0,
	note_id: null,
	created_at: Date.now(),
};

export const sampleArticle2: ArticleFixture = {
	feed_id: 1, // References sampleFeed1.id
	title: 'Obsidian 插件开发完全指南',
	content: sampleArticleMarkdown2,
	content_html: sampleArticleHtml2,
	url: 'https://mp.weixin.qq.com/s/test-article-002',
	published_at: 1704153600000,
	synced: 0,
	note_id: null,
	created_at: Date.now(),
};

export const sampleArticle3: ArticleFixture = {
	feed_id: 2, // References sampleFeed2.id
	title: '前端性能优化实战',
	content: sampleArticleMarkdown3,
	content_html: sampleArticleHtml3,
	url: 'https://mp.weixin.qq.com/s/test-article-003',
	published_at: 1704240000000,
	synced: 1,
	note_id: 'note-20240103-001.md',
	created_at: Date.now(),
};

export const sampleArticleSynced: ArticleFixture = {
	feed_id: 1, // References sampleFeed1.id
	title: '已同步的测试文章',
	content: '# 已同步\n\n这篇文章已经创建笔记。',
	content_html: '<h1>已同步</h1><p>这篇文章已经创建笔记。</p>',
	url: 'https://mp.weixin.qq.com/s/test-article-synced',
	published_at: 1704326400000,
	synced: 1,
	note_id: 'synced-note.md',
	created_at: Date.now(),
};

export const sampleArticleUnsynced: ArticleFixture = {
	feed_id: 2, // References sampleFeed2.id
	title: '未同步的测试文章',
	content: '# 未同步\n\n这篇文章还未创建笔记。',
	content_html: '<h1>未同步</h1><p>这篇文章还未创建笔记。</p>',
	url: 'https://mp.weixin.qq.com/s/test-article-unsynced',
	published_at: 1704412800000,
	synced: 0,
	note_id: null,
	created_at: Date.now(),
};

// Collection of all sample articles
export const allSampleArticles: ArticleFixture[] = [
	sampleArticle1,
	sampleArticle2,
	sampleArticle3,
	sampleArticleSynced,
	sampleArticleUnsynced,
];

// Helper function to create custom article
export function createSampleArticle(overrides?: Partial<ArticleFixture>): ArticleFixture {
	return {
		feed_id: 1, // Default to sampleFeed1.id
		title: '测试文章',
		content: '# 测试\n\n这是一篇测试文章。',
		content_html: '<h1>测试</h1><p>这是一篇测试文章。</p>',
		url: `https://mp.weixin.qq.com/s/test-${Date.now()}`,
		published_at: Date.now(),
		synced: 0,
		note_id: null,
		created_at: Date.now(),
		...overrides,
	};
}

/**
 * Convert ArticleFixture (database format) to Article (domain model)
 *
 * Transforms snake_case properties to camelCase and converts types
 */
export function fixtureToArticle(fixture: ArticleFixture): Article {
	return {
		id: fixture.id!,
		feedId: fixture.feed_id,
		title: fixture.title,
		content: fixture.content,
		contentHtml: fixture.content_html,
		url: fixture.url,
		publishedAt: fixture.published_at,
		synced: fixture.synced === 1,  // Convert number (0/1) → boolean
		noteId: fixture.note_id ?? undefined,
		createdAt: fixture.created_at
	};
}

// Import Article type for conversion helper
import type { Article } from '../../types';
