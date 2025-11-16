/**
 * Unit tests for HTML parser library
 * Tests HTML parsing and DOM manipulation utilities
 */

import {
	parseHtml,
	htmlToText,
	extractText,
	removeElements,
	queryAll,
	getAttribute,
} from '../../../lib/html-parser';

describe('html-parser', () => {
	describe('parseHtml', () => {
		it('should parse valid HTML', () => {
			const html = '<div><p>Hello World</p></div>';
			const doc = parseHtml(html);

			expect(doc).toBeDefined();
			expect(doc.body).toBeDefined();
		});

		it('should parse HTML with multiple elements', () => {
			const html = '<div><h1>Title</h1><p>Paragraph</p></div>';
			const doc = parseHtml(html);

			const h1 = doc.querySelector('h1');
			const p = doc.querySelector('p');

			expect(h1?.textContent).toBe('Title');
			expect(p?.textContent).toBe('Paragraph');
		});

		it('should handle malformed HTML gracefully', () => {
			const html = '<div><p>Unclosed tag';
			const doc = parseHtml(html);

			expect(doc).toBeDefined();
			expect(doc.body).toBeDefined();
		});

		it('should parse empty string', () => {
			const doc = parseHtml('');

			expect(doc).toBeDefined();
			expect(doc.body).toBeDefined();
		});

		it('should parse plain text as HTML', () => {
			const text = 'Plain text without tags';
			const doc = parseHtml(text);

			expect(doc.body.textContent).toContain('Plain text without tags');
		});

		it('should handle self-closing tags', () => {
			const html = '<img src="test.jpg" /><br />';
			const doc = parseHtml(html);

			const img = doc.querySelector('img');
			const br = doc.querySelector('br');

			expect(img).toBeDefined();
			expect(br).toBeDefined();
		});

		it('should preserve attributes', () => {
			const html = '<div class="container" id="main"><span data-value="123">Text</span></div>';
			const doc = parseHtml(html);

			const div = doc.querySelector('div');
			const span = doc.querySelector('span');

			expect(div?.className).toBe('container');
			expect(div?.id).toBe('main');
			expect(span?.getAttribute('data-value')).toBe('123');
		});

		it('should handle nested elements', () => {
			const html = '<div><ul><li><span>Item</span></li></ul></div>';
			const doc = parseHtml(html);

			const span = doc.querySelector('span');
			expect(span?.textContent).toBe('Item');
		});

		it('should handle special characters', () => {
			const html = '<p>&lt;script&gt;alert("xss")&lt;/script&gt;</p>';
			const doc = parseHtml(html);

			const p = doc.querySelector('p');
			expect(p?.textContent).toContain('<script>');
		});

		it('should handle Chinese characters', () => {
			const html = '<p>中文内容</p>';
			const doc = parseHtml(html);

			const p = doc.querySelector('p');
			expect(p?.textContent).toBe('中文内容');
		});
	});

	describe('htmlToText', () => {
		it('should extract text from HTML', () => {
			const html = '<p>Hello World</p>';
			const text = htmlToText(html);

			expect(text).toBe('Hello World');
		});

		it('should remove all HTML tags', () => {
			const html = '<div><strong>Bold</strong> and <em>italic</em> text</div>';
			const text = htmlToText(html);

			expect(text).toBe('Bold and italic text');
			expect(text).not.toContain('<');
			expect(text).not.toContain('>');
		});

		it('should handle nested elements', () => {
			const html = '<div><p>Paragraph <span>with <strong>nested</strong> elements</span></p></div>';
			const text = htmlToText(html);

			expect(text).toBe('Paragraph with nested elements');
		});

		it('should return empty string for empty HTML', () => {
			const text = htmlToText('');
			expect(text).toBe('');
		});

		it('should handle plain text', () => {
			const plainText = 'No HTML here';
			const text = htmlToText(plainText);

			expect(text).toBe('No HTML here');
		});

		it('should preserve whitespace within text', () => {
			const html = '<p>Text   with    spaces</p>';
			const text = htmlToText(html);

			expect(text).toContain('Text');
			expect(text).toContain('spaces');
		});

		it('should handle script tags', () => {
			const html = '<div>Content<script>alert("test")</script>More content</div>';
			const text = htmlToText(html);

			expect(text).toContain('Content');
			expect(text).toContain('More content');
		});

		it('should handle style tags', () => {
			const html = '<div>Content<style>.test { color: red; }</style>More content</div>';
			const text = htmlToText(html);

			expect(text).toContain('Content');
			expect(text).toContain('More content');
		});

		it('should handle Chinese text', () => {
			const html = '<p>这是中文内容</p>';
			const text = htmlToText(html);

			expect(text).toBe('这是中文内容');
		});

		it('should handle mixed content', () => {
			const html = '<div>English text 中文内容 123</div>';
			const text = htmlToText(html);

			expect(text).toBe('English text 中文内容 123');
		});
	});

	describe('extractText', () => {
		it('should extract text from specific selector', () => {
			const html = '<div><p class="target">Target text</p><p>Other</p></div>';
			const text = extractText(html, '.target');

			expect(text).toBe('Target text');
		});

		it('should return empty string for non-existent selector', () => {
			const html = '<div><p>Content</p></div>';
			const text = extractText(html, '.nonexistent');

			expect(text).toBe('');
		});

		it('should extract text from first matching element', () => {
			const html = '<div><p>First</p><p>Second</p></div>';
			const text = extractText(html, 'p');

			expect(text).toBe('First');
		});

		it('should handle nested selectors', () => {
			const html = '<div class="parent"><div class="child"><span>Target</span></div></div>';
			const text = extractText(html, '.parent .child span');

			expect(text).toBe('Target');
		});

		it('should return empty for empty HTML', () => {
			const text = extractText('', 'p');
			expect(text).toBe('');
		});
	});

	describe('removeElements', () => {
		it('should remove elements by selector', () => {
			const html = '<div><script>alert("test")</script><p>Content</p></div>';
			const result = removeElements(html, 'script');

			expect(result).not.toContain('<script>');
			expect(result).toContain('<p>Content</p>');
		});

		it('should remove multiple elements', () => {
			const html = '<div><script>1</script><p>Keep</p><script>2</script></div>';
			const result = removeElements(html, 'script');

			expect(result).not.toContain('<script>');
			expect(result).toContain('<p>Keep</p>');
		});

		it('should handle non-existent selector', () => {
			const html = '<div><p>Content</p></div>';
			const result = removeElements(html, 'script');

			expect(result).toContain('<p>Content</p>');
		});

		it('should remove by class selector', () => {
			const html = '<div><span class="remove">A</span><span>B</span></div>';
			const result = removeElements(html, '.remove');

			expect(result).not.toContain('A');
			expect(result).toContain('B');
		});

		it('should return body innerHTML', () => {
			const html = '<div><p>Test</p></div>';
			const result = removeElements(html, '.nonexistent');

			expect(result).toBe('<div><p>Test</p></div>');
		});
	});

	describe('queryAll', () => {
		it('should find all matching elements', () => {
			const html = '<div><p>First</p><p>Second</p><p>Third</p></div>';
			const elements = queryAll(html, 'p');

			expect(elements).toHaveLength(3);
			expect(elements[0]?.textContent).toBe('First');
			expect(elements[1]?.textContent).toBe('Second');
			expect(elements[2]?.textContent).toBe('Third');
		});

		it('should return empty array for non-existent selector', () => {
			const html = '<div><p>Content</p></div>';
			const elements = queryAll(html, '.nonexistent');

			expect(elements).toEqual([]);
		});

		it('should find elements by class', () => {
			const html = '<div><span class="item">A</span><span class="item">B</span></div>';
			const elements = queryAll(html, '.item');

			expect(elements).toHaveLength(2);
			expect(elements[0]?.textContent).toBe('A');
			expect(elements[1]?.textContent).toBe('B');
		});

		it('should find nested elements', () => {
			const html = '<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>';
			const elements = queryAll(html, 'li');

			expect(elements).toHaveLength(3);
		});

		it('should handle complex selectors', () => {
			const html = '<div class="container"><div class="item"><span>A</span></div><div class="item"><span>B</span></div></div>';
			const elements = queryAll(html, '.container .item span');

			expect(elements).toHaveLength(2);
		});

		it('should return empty array for empty HTML', () => {
			const elements = queryAll('', 'p');
			expect(elements).toEqual([]);
		});

		it('should find elements with attributes', () => {
			const html = '<div><img src="1.jpg"><img src="2.jpg"><img src="3.jpg"></div>';
			const elements = queryAll(html, 'img[src]');

			expect(elements).toHaveLength(3);
		});

		it('should return Array of Elements', () => {
			const html = '<div><p>1</p><p>2</p></div>';
			const elements = queryAll(html, 'p');

			expect(Array.isArray(elements)).toBe(true);
			expect(elements[0]).toBeInstanceOf(Element);
		});
	});

	describe('getAttribute', () => {
		it('should get attribute value', () => {
			const html = '<img src="test.jpg" alt="Test Image">';
			const doc = parseHtml(html);
			const img = doc.querySelector('img')!;

			const src = getAttribute(img, 'src');
			const alt = getAttribute(img, 'alt');

			expect(src).toBe('test.jpg');
			expect(alt).toBe('Test Image');
		});

		it('should return null for non-existent attribute', () => {
			const html = '<div><p>Content</p></div>';
			const doc = parseHtml(html);
			const p = doc.querySelector('p')!;

			const result = getAttribute(p, 'nonexistent');

			expect(result).toBeNull();
		});

		it('should get data attributes', () => {
			const html = '<div data-value="123" data-name="test"></div>';
			const doc = parseHtml(html);
			const div = doc.querySelector('div')!;

			const value = getAttribute(div, 'data-value');
			const name = getAttribute(div, 'data-name');

			expect(value).toBe('123');
			expect(name).toBe('test');
		});

		it('should get class attribute', () => {
			const html = '<div class="container main"></div>';
			const doc = parseHtml(html);
			const div = doc.querySelector('div')!;

			const className = getAttribute(div, 'class');

			expect(className).toBe('container main');
		});

		it('should get id attribute', () => {
			const html = '<div id="main"></div>';
			const doc = parseHtml(html);
			const div = doc.querySelector('div')!;

			const id = getAttribute(div, 'id');

			expect(id).toBe('main');
		});
	});

	describe('edge cases', () => {
		it('should handle very large HTML documents', () => {
			const largeHtml = '<div>' + '<p>Item</p>'.repeat(1000) + '</div>';
			const doc = parseHtml(largeHtml);

			expect(doc).toBeDefined();
			const paragraphs = doc.querySelectorAll('p');
			expect(paragraphs.length).toBe(1000);
		});

		it('should handle HTML with comments', () => {
			const html = '<div><!-- Comment --><p>Content</p><!-- Another comment --></div>';
			const doc = parseHtml(html);

			const p = doc.querySelector('p');
			expect(p?.textContent).toBe('Content');
		});

		it('should handle CDATA sections', () => {
			const html = '<div><![CDATA[Some data]]><p>Content</p></div>';
			const doc = parseHtml(html);

			expect(doc).toBeDefined();
		});

		it('should handle DOCTYPE declarations', () => {
			const html = '<!DOCTYPE html><html><body><p>Content</p></body></html>';
			const doc = parseHtml(html);

			const p = doc.querySelector('p');
			expect(p?.textContent).toBe('Content');
		});

		it('should handle HTML entities', () => {
			const html = '<p>&amp; &lt; &gt; &quot; &apos;</p>';
			const text = htmlToText(html);

			expect(text).toContain('&');
			expect(text).toContain('<');
			expect(text).toContain('>');
		});

		it('should handle tables', () => {
			const html = '<table><tr><td>Cell 1</td><td>Cell 2</td></tr></table>';
			const cells = queryAll(html, 'td');

			expect(cells).toHaveLength(2);
			expect(cells[0]?.textContent).toBe('Cell 1');
		});

		it('should handle forms', () => {
			const html = '<form><input type="text" name="field1"><input type="submit"></form>';
			const inputs = queryAll(html, 'input');

			expect(inputs).toHaveLength(2);
		});
	});
});
