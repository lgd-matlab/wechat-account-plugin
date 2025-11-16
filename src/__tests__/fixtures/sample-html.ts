/**
 * Sample HTML fixtures for testing ContentParser
 * Provides various HTML patterns and edge cases
 */

// Simple paragraph
export const htmlSimpleParagraph = '<p>这是一个简单的段落。</p>';
export const expectedSimpleParagraph = '这是一个简单的段落。';

// Headings (h1-h6)
export const htmlHeadings = `
<h1>一级标题</h1>
<h2>二级标题</h2>
<h3>三级标题</h3>
<h4>四级标题</h4>
<h5>五级标题</h5>
<h6>六级标题</h6>
`;

export const expectedHeadings = `# 一级标题

## 二级标题

### 三级标题

#### 四级标题

##### 五级标题

###### 六级标题`;

// Lists (ul, ol)
export const htmlUnorderedList = `
<ul>
	<li>第一项</li>
	<li>第二项</li>
	<li>第三项</li>
</ul>
`;

export const expectedUnorderedList = `- 第一项
- 第二项
- 第三项`;

export const htmlOrderedList = `
<ol>
	<li>第一步</li>
	<li>第二步</li>
	<li>第三步</li>
</ol>
`;

export const expectedOrderedList = `1. 第一步
2. 第二步
3. 第三步`;

// Nested lists
export const htmlNestedList = `
<ul>
	<li>主项目1
		<ul>
			<li>子项目1.1</li>
			<li>子项目1.2</li>
		</ul>
	</li>
	<li>主项目2</li>
</ul>
`;

export const expectedNestedList = `- 主项目1
  - 子项目1.1
  - 子项目1.2
- 主项目2`;

// Links
export const htmlLinks = `
<p>访问 <a href="https://example.com">示例网站</a> 了解更多。</p>
<p><a href="https://docs.example.com">查看文档</a></p>
`;

export const expectedLinks = `访问 [示例网站](https://example.com) 了解更多。

[查看文档](https://docs.example.com)`;

// Images
export const htmlImages = `
<p>示例图片：</p>
<img src="https://example.com/image1.jpg" alt="示例图片1" />
<img src="https://example.com/image2.png" alt="示例图片2" title="图片标题" />
`;

export const expectedImages = `示例图片：

![示例图片1](https://example.com/image1.jpg)

![示例图片2](https://example.com/image2.png)`;

// Code blocks
export const htmlCodeBlock = `
<pre><code class="language-javascript">
function hello() {
	console.log("Hello, World!");
}
</code></pre>
`;

export const expectedCodeBlock = `\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\``;

// Inline code
export const htmlInlineCode = '<p>使用 <code>console.log()</code> 输出调试信息。</p>';
export const expectedInlineCode = '使用 `console.log()` 输出调试信息。';

// Blockquote
export const htmlBlockquote = `
<blockquote>
	<p>这是一段引用文字。</p>
	<p>引用可以有多个段落。</p>
</blockquote>
`;

export const expectedBlockquote = `> 这是一段引用文字。
>
> 引用可以有多个段落。`;

// Tables
export const htmlTable = `
<table>
	<thead>
		<tr>
			<th>姓名</th>
			<th>年龄</th>
			<th>职业</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td>张三</td>
			<td>25</td>
			<td>工程师</td>
		</tr>
		<tr>
			<td>李四</td>
			<td>30</td>
			<td>设计师</td>
		</tr>
	</tbody>
</table>
`;

export const expectedTable = `| 姓名 | 年龄 | 职业 |
| --- | --- | --- |
| 张三 | 25 | 工程师 |
| 李四 | 30 | 设计师 |`;

// Text formatting (strong, em, del)
export const htmlTextFormatting = `
<p>这是<strong>粗体文字</strong>，这是<em>斜体文字</em>，这是<del>删除线</del>。</p>
<p>也可以<b>使用b标签</b>和<i>i标签</i>。</p>
`;

export const expectedTextFormatting = `这是**粗体文字**，这是*斜体文字*，这是~~删除线~~。

也可以**使用b标签**和*i标签*。`;

// Horizontal rule
export const htmlHorizontalRule = `
<p>段落1</p>
<hr />
<p>段落2</p>
`;

export const expectedHorizontalRule = `段落1

---

段落2`;

// Complex nested HTML
export const htmlComplexNested = `
<div class="rich_media_content">
	<h2>文章标题</h2>
	<p>简介文字</p>

	<h3>第一部分</h3>
	<p>这是第一部分的内容，包含<strong>重点</strong>和<a href="https://example.com">链接</a>。</p>

	<ul>
		<li>列表项1</li>
		<li>列表项2</li>
	</ul>

	<blockquote>
		<p>引用的内容</p>
	</blockquote>

	<pre><code class="language-typescript">
const example: string = "code";
	</code></pre>

	<p>结束语。</p>
</div>
`;

export const expectedComplexNested = `## 文章标题

简介文字

### 第一部分

这是第一部分的内容，包含**重点**和[链接](https://example.com)。

- 列表项1
- 列表项2

> 引用的内容

\`\`\`typescript
const example: string = "code";
\`\`\`

结束语。`;

// WeChat specific HTML (with section tags)
export const htmlWeChatArticle = `
<div id="page-content">
	<div class="rich_media_content">
		<section>
			<h2>微信公众号文章标题</h2>
		</section>

		<section>
			<p>第一段内容</p>
		</section>

		<section>
			<p style="text-align: center;">
				<img src="https://mmbiz.qpic.cn/mmbiz_png/example.png" alt="图片" />
			</p>
		</section>

		<section>
			<p>第二段内容</p>
		</section>
	</div>
</div>
`;

export const expectedWeChatArticle = `## 微信公众号文章标题

第一段内容

![图片](https://mmbiz.qpic.cn/mmbiz_png/example.png)

第二段内容`;

// Edge cases
export const htmlEmptyElements = '<p></p><div></div><span></span>';
export const expectedEmptyElements = '';

export const htmlWhitespaceOnly = '   \n\t  \n  ';
export const expectedWhitespaceOnly = '';

export const htmlSpecialChars = '<p>&lt;div&gt; &amp; &quot;quotes&quot; &apos;apostrophe&apos;</p>';
export const expectedSpecialChars = '<div> & "quotes" \'apostrophe\'';

export const htmlInvalidNesting = '<p><div>Invalid nesting</div></p>';
export const expectedInvalidNesting = 'Invalid nesting';

// HTML with attributes to be stripped
export const htmlWithAttributes = `
<p class="text-red" id="para1" style="color: red;" data-value="123">
	带有各种属性的段落
</p>
`;
export const expectedWithAttributes = '带有各种属性的段落';

// Mixed content
export const htmlMixedContent = `
<div>
	<h2>混合内容测试</h2>
	<p>包含<strong>粗体</strong>、<em>斜体</em>、<code>代码</code>和<a href="#">链接</a>。</p>
	<ul>
		<li>列表项包含<strong>粗体</strong></li>
		<li>列表项包含<code>代码</code></li>
	</ul>
	<blockquote>
		<p>引用包含<a href="https://example.com">链接</a></p>
	</blockquote>
</div>
`;

export const expectedMixedContent = `## 混合内容测试

包含**粗体**、*斜体*、\`代码\`和[链接](#)。

- 列表项包含**粗体**
- 列表项包含\`代码\`

> 引用包含[链接](https://example.com)`;

// Complete article structure
export const htmlCompleteArticle = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<title>完整文章示例</title>
</head>
<body>
	<div id="js_article">
		<div class="rich_media_content">
			<h2>TypeScript 最佳实践</h2>

			<p>TypeScript 是JavaScript的超集，为大型项目提供了类型安全保障。</p>

			<h3>核心优势</h3>
			<ul>
				<li>静态类型检查</li>
				<li>更好的IDE支持</li>
				<li>易于重构</li>
			</ul>

			<h3>示例代码</h3>
			<pre><code class="language-typescript">
interface User {
	id: number;
	name: string;
}

function getUser(id: number): User {
	// Implementation
	return { id, name: "User" };
}
			</code></pre>

			<blockquote>
				<p>使用TypeScript让代码更加健壮。</p>
			</blockquote>

			<h3>了解更多</h3>
			<p>访问<a href="https://www.typescriptlang.org">TypeScript官网</a>获取详细文档。</p>
		</div>
	</div>
</body>
</html>
`;

export const expectedCompleteArticle = `## TypeScript 最佳实践

TypeScript 是JavaScript的超集，为大型项目提供了类型安全保障。

### 核心优势

- 静态类型检查
- 更好的IDE支持
- 易于重构

### 示例代码

\`\`\`typescript
interface User {
  id: number;
  name: string;
}

function getUser(id: number): User {
  // Implementation
  return { id, name: "User" };
}
\`\`\`

> 使用TypeScript让代码更加健壮。

### 了解更多

访问[TypeScript官网](https://www.typescriptlang.org)获取详细文档。`;

// Test cases collection
export const htmlTestCases = [
	{ name: 'simple paragraph', html: htmlSimpleParagraph, expected: expectedSimpleParagraph },
	{ name: 'headings', html: htmlHeadings, expected: expectedHeadings },
	{ name: 'unordered list', html: htmlUnorderedList, expected: expectedUnorderedList },
	{ name: 'ordered list', html: htmlOrderedList, expected: expectedOrderedList },
	{ name: 'nested list', html: htmlNestedList, expected: expectedNestedList },
	{ name: 'links', html: htmlLinks, expected: expectedLinks },
	{ name: 'images', html: htmlImages, expected: expectedImages },
	{ name: 'code block', html: htmlCodeBlock, expected: expectedCodeBlock },
	{ name: 'inline code', html: htmlInlineCode, expected: expectedInlineCode },
	{ name: 'blockquote', html: htmlBlockquote, expected: expectedBlockquote },
	{ name: 'table', html: htmlTable, expected: expectedTable },
	{ name: 'text formatting', html: htmlTextFormatting, expected: expectedTextFormatting },
	{ name: 'horizontal rule', html: htmlHorizontalRule, expected: expectedHorizontalRule },
	{ name: 'complex nested', html: htmlComplexNested, expected: expectedComplexNested },
	{ name: 'WeChat article', html: htmlWeChatArticle, expected: expectedWeChatArticle },
	{ name: 'empty elements', html: htmlEmptyElements, expected: expectedEmptyElements },
	{ name: 'whitespace only', html: htmlWhitespaceOnly, expected: expectedWhitespaceOnly },
	{ name: 'special chars', html: htmlSpecialChars, expected: expectedSpecialChars },
	{ name: 'with attributes', html: htmlWithAttributes, expected: expectedWithAttributes },
	{ name: 'mixed content', html: htmlMixedContent, expected: expectedMixedContent },
	{ name: 'complete article', html: htmlCompleteArticle, expected: expectedCompleteArticle },
];
