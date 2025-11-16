/**
 * Unit tests for ContentParser
 * Tests HTML to Markdown conversion and content processing
 */

import { ContentParser } from '../../../services/feed/ContentParser';

describe('ContentParser', () => {
	let parser: ContentParser;

	beforeEach(() => {
		parser = new ContentParser(false);
	});

	describe('parseContent', () => {
		it('should parse simple HTML to Markdown', () => {
			const html = '<p>This is a paragraph</p>';
			const result = parser.parseContent(html);

			expect(result.markdown).toContain('This is a paragraph');
			expect(result.cleanHtml).toBeTruthy();
		});

		it('should handle parsing errors gracefully', () => {
			const invalidHtml = '<div><p>Unclosed tag';
			const result = parser.parseContent(invalidHtml);

			// Should return fallback
			expect(result).toBeDefined();
			expect(result.markdown).toBeTruthy();
		});

		it('should clean HTML when enableCleanHtml is true', () => {
			const htmlWithScript = '<div><p>Content</p><script>alert("test")</script></div>';
			parser.setEnableCleanHtml(true);
			const result = parser.parseContent(htmlWithScript);

			// Script tags should be removed
			expect(result.cleanHtml).not.toContain('<script>');
		});

		it('should not clean HTML when enableCleanHtml is false', () => {
			const htmlWithScript = '<div><p>Content</p><script>alert("test")</script></div>';
			parser.setEnableCleanHtml(false);
			const result = parser.parseContent(htmlWithScript);

			// HTML should be unchanged
			expect(result.cleanHtml).toContain('<script>');
		});
	});

	describe('headings conversion', () => {
		it('should convert H1 tags', () => {
			const result = parser.parseContent('<h1>Title</h1>');
			expect(result.markdown).toMatch(/# Title/);
		});

		it('should convert H2 tags', () => {
			const result = parser.parseContent('<h2>Subtitle</h2>');
			expect(result.markdown).toMatch(/## Subtitle/);
		});

		it('should convert H3 tags', () => {
			const result = parser.parseContent('<h3>Section</h3>');
			expect(result.markdown).toMatch(/### Section/);
		});

		it('should convert all heading levels', () => {
			const html = '<h1>H1</h1><h2>H2</h2><h3>H3</h3><h4>H4</h4><h5>H5</h5><h6>H6</h6>';
			const result = parser.parseContent(html);

			expect(result.markdown).toContain('# H1');
			expect(result.markdown).toContain('## H2');
			expect(result.markdown).toContain('### H3');
			expect(result.markdown).toContain('#### H4');
			expect(result.markdown).toContain('##### H5');
			expect(result.markdown).toContain('###### H6');
		});
	});

	describe('text formatting', () => {
		it('should convert bold text with strong', () => {
			const result = parser.parseContent('<strong>bold</strong>');
			expect(result.markdown).toContain('**bold**');
		});

		it('should convert bold text with b', () => {
			const result = parser.parseContent('<b>bold</b>');
			expect(result.markdown).toContain('**bold**');
		});

		it('should convert italic text with em', () => {
			const result = parser.parseContent('<em>italic</em>');
			expect(result.markdown).toContain('*italic*');
		});

		it('should convert italic text with i', () => {
			const result = parser.parseContent('<i>italic</i>');
			expect(result.markdown).toContain('*italic*');
		});

		it('should convert inline code', () => {
			const result = parser.parseContent('<code>code</code>');
			expect(result.markdown).toContain('`code`');
		});

		it('should convert code blocks', () => {
			const result = parser.parseContent('<pre>code block</pre>');
			expect(result.markdown).toMatch(/```/);
		});
	});

	describe('lists', () => {
		it('should convert unordered lists', () => {
			const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
			const result = parser.parseContent(html);

			expect(result.markdown).toContain('- Item 1');
			expect(result.markdown).toContain('- Item 2');
		});

		it('should convert ordered lists', () => {
			const html = '<ol><li>First</li><li>Second</li></ol>';
			const result = parser.parseContent(html);

			expect(result.markdown).toContain('1. First');
			expect(result.markdown).toContain('2. Second');
		});
	});

	describe('links and images', () => {
		it('should convert links', () => {
			const html = '<a href="https://test.com">Link</a>';
			const result = parser.parseContent(html);

			expect(result.markdown).toContain('[Link](https://test.com)');
		});

		it('should handle links without href', () => {
			const html = '<a>No href</a>';
			const result = parser.parseContent(html);

			expect(result.markdown).toContain('No href');
		});

		it('should convert images', () => {
			const html = '<img src="test.jpg" alt="Test">';
			const result = parser.parseContent(html);

			expect(result.markdown).toContain('![Test](test.jpg)');
		});

		it('should handle images without src', () => {
			const html = '<img alt="No src">';
			const result = parser.parseContent(html);

			// Should not create image markdown without src
			expect(result.markdown).not.toContain('![');
		});
	});

	describe('blockquotes', () => {
		it('should convert blockquotes', () => {
			const html = '<blockquote>Quote text</blockquote>';
			const result = parser.parseContent(html);

			expect(result.markdown).toContain('> Quote text');
		});
	});

	describe('tables', () => {
		it('should convert simple tables', () => {
			const html = '<table><tr><th>H1</th><th>H2</th></tr><tr><td>C1</td><td>C2</td></tr></table>';
			const result = parser.parseContent(html);

			expect(result.markdown).toContain('|');
			expect(result.markdown).toContain('---');
		});
	});

	describe('special elements', () => {
		it('should convert horizontal rules', () => {
			const html = '<hr>';
			const result = parser.parseContent(html);

			expect(result.markdown).toContain('---');
		});

		it('should convert line breaks', () => {
			const html = '<p>Line 1<br>Line 2</p>';
			const result = parser.parseContent(html);

			expect(result.markdown).toContain('Line 1\nLine 2');
		});
	});

	describe('extractImages', () => {
		it('should extract images from HTML', () => {
			const html = '<img src="test.jpg" alt="Test Image">';
			const images = parser.extractImages(html);

			expect(images).toHaveLength(1);
			expect(images[0].src).toBe('test.jpg');
			expect(images[0].alt).toBe('Test Image');
		});

		it('should extract multiple images', () => {
			const html = '<img src="1.jpg" alt="One"><img src="2.jpg" alt="Two">';
			const images = parser.extractImages(html);

			expect(images).toHaveLength(2);
		});

		it('should return empty array for no images', () => {
			const images = parser.extractImages('<p>No images</p>');
			expect(images).toEqual([]);
		});
	});

	describe('extractLinks', () => {
		it('should extract links from HTML', () => {
			const html = '<a href="https://test.com">Test Link</a>';
			const links = parser.extractLinks(html);

			expect(links).toHaveLength(1);
			expect(links[0].href).toBe('https://test.com');
			expect(links[0].text).toBe('Test Link');
		});

		it('should extract multiple links', () => {
			const html = '<a href="1.html">One</a><a href="2.html">Two</a>';
			const links = parser.extractLinks(html);

			expect(links).toHaveLength(2);
		});

		it('should return empty array for no links', () => {
			const links = parser.extractLinks('<p>No links</p>');
			expect(links).toEqual([]);
		});
	});

	describe('getExcerpt', () => {
		it('should extract text from HTML', () => {
			const excerpt = parser.getExcerpt('<p>Test paragraph</p>');
			expect(excerpt).toBe('Test paragraph');
		});

		it('should respect maxLength', () => {
			const longText = '<p>' + 'a'.repeat(300) + '</p>';
			const excerpt = parser.getExcerpt(longText, 50);

			expect(excerpt.length).toBeLessThanOrEqual(53); // 50 + '...'
			expect(excerpt).toContain('...');
		});

		it('should not add ellipsis for short text', () => {
			const excerpt = parser.getExcerpt('<p>Short</p>', 100);

			expect(excerpt).toBe('Short');
			expect(excerpt).not.toContain('...');
		});

		it('should clean whitespace', () => {
			const excerpt = parser.getExcerpt('<p>Text   with    spaces</p>');
			expect(excerpt).toBe('Text with spaces');
		});

		it('should strip HTML tags', () => {
			const excerpt = parser.getExcerpt('<p><strong>Bold</strong> text</p>');
			expect(excerpt).toBe('Bold text');
		});
	});

	describe('cleanHtml', () => {
		it('should remove script tags when enabled', () => {
			parser.setEnableCleanHtml(true);
			const html = '<div><script>alert("test")</script><p>Content</p></div>';
			const result = parser.parseContent(html);

			expect(result.cleanHtml).not.toContain('<script>');
			expect(result.cleanHtml).toContain('Content');
		});

		it('should remove style tags when enabled', () => {
			parser.setEnableCleanHtml(true);
			const html = '<div><style>.test{}</style><p>Content</p></div>';
			const result = parser.parseContent(html);

			expect(result.cleanHtml).not.toContain('<style>');
		});

		it('should remove HTML comments when enabled', () => {
			parser.setEnableCleanHtml(true);
			const html = '<div><!-- comment --><p>Content</p></div>';
			const result = parser.parseContent(html);

			expect(result.cleanHtml).not.toContain('<!--');
		});

		it('should remove empty paragraphs when enabled', () => {
			parser.setEnableCleanHtml(true);
			const html = '<div><p>Text</p><p></p><p>More</p></div>';
			const result = parser.parseContent(html);

			// Count <p> tags in clean HTML
			const pCount = (result.cleanHtml.match(/<p>/g) || []).length;
			expect(pCount).toBeLessThan(3);
		});

		it('should remove inline styles when enabled', () => {
			parser.setEnableCleanHtml(true);
			const html = '<p style="color:red">Text</p>';
			const result = parser.parseContent(html);

			expect(result.cleanHtml).not.toContain('style=');
		});
	});

	describe('setEnableCleanHtml', () => {
		it('should toggle cleaning on', () => {
			parser.setEnableCleanHtml(true);
			const html = '<div><script>test</script></div>';
			const result = parser.parseContent(html);

			expect(result.cleanHtml).not.toContain('<script>');
		});

		it('should toggle cleaning off', () => {
			parser.setEnableCleanHtml(false);
			const html = '<div><script>test</script></div>';
			const result = parser.parseContent(html);

			expect(result.cleanHtml).toContain('<script>');
		});
	});

	describe('edge cases', () => {
		it('should handle empty input', () => {
			const result = parser.parseContent('');
			expect(result.markdown).toBe('');
		});

		it('should handle plain text', () => {
			const result = parser.parseContent('Plain text');
			expect(result.markdown).toContain('Plain text');
		});

		it('should handle Unicode characters', () => {
			const html = '<p>中文测试 English mixed</p>';
			const result = parser.parseContent(html);

			expect(result.markdown).toContain('中文测试');
			expect(result.markdown).toContain('English');
		});

		it('should handle unknown tags gracefully', () => {
			const html = '<custom-tag>Content</custom-tag>';
			const result = parser.parseContent(html);

			expect(result.markdown).toContain('Content');
		});
	});
});
