import { parseHtml, removeElements } from '../../lib/html-parser';
import { logger } from '../../utils/logger';

/**
 * ContentParser - Converts HTML content to clean Markdown
 *
 * Handles WeChat article HTML parsing and cleaning
 */
export class ContentParser {
	private enableCleanHtml: boolean;

	constructor(enableCleanHtml: boolean = false) {
		this.enableCleanHtml = enableCleanHtml;
	}

	/**
	 * Parse HTML content and convert to Markdown
	 */
	parseContent(html: string): { markdown: string; cleanHtml: string } {
		try {
			// Extract embedded WeChat content if present
			const extractedHtml = this.extractWeChatContent(html);

			// Clean HTML first
			const cleanHtml = this.enableCleanHtml ? this.cleanHtml(extractedHtml) : extractedHtml;

			// Convert to Markdown
			const markdown = this.htmlToMarkdown(cleanHtml);

			return { markdown, cleanHtml };
		} catch (error) {
			logger.error('Failed to parse content:', error);
			// Return original HTML as fallback
			return { markdown: html, cleanHtml: html };
		}
	}

	/**
	 * Extract WeChat article content from JavaScript variable
	 * WeChat embeds article content in content_noencode with hex escapes
	 */
	private extractWeChatContent(html: string): string {
		try {
			// Pattern: content_noencode: JsDecode('...') or content_noencode: "..." or content_noencode: '...'
			const patterns = [
				/content_noencode\s*:\s*JsDecode\s*\(\s*['"](.+?)['"]\s*\)/s,  // JsDecode('...')
				/content_noencode\s*:\s*["'](.+?)["']/s                        // "..." or '...'
			];

			let encodedContent: string | null = null;

			for (const pattern of patterns) {
				const match = html.match(pattern);
				if (match && match[1]) {
					encodedContent = match[1];
					break;
				}
			}

			if (!encodedContent) {
				// Not a WeChat embedded article, return original HTML
				logger.debug('No WeChat content_noencode found, using original HTML');
				return html;
			}

			logger.debug('Found WeChat content_noencode, decoding...');

			// Decode JavaScript escape sequences
			const decodedContent = this.decodeJsEscapes(encodedContent);

			return decodedContent;
		} catch (error) {
			logger.error('Failed to extract WeChat content:', error);
			// Fallback to original HTML on extraction failure
			return html;
		}
	}

	/**
	 * Decode JavaScript escape sequences to plain text
	 * Handles hex escapes like \x3c (< character)
	 */
	private decodeJsEscapes(content: string): string {
		// Decode hex escape sequences
		// Note: We use replace with callback to handle all escape sequences at once
		let decoded = content;

		// Replace common JavaScript hex escape sequences
		decoded = decoded.replace(/\\x5c/gi, '\\');   // Backslash
		decoded = decoded.replace(/\\x0d/gi, '\r');   // Carriage return
		decoded = decoded.replace(/\\x22/gi, '"');    // Double quote
		decoded = decoded.replace(/\\x26/gi, '&');    // Ampersand
		decoded = decoded.replace(/\\x27/gi, "'");    // Single quote
		decoded = decoded.replace(/\\x3c/gi, '<');    // Less than
		decoded = decoded.replace(/\\x3e/gi, '>');    // Greater than
		decoded = decoded.replace(/\\x0a/gi, '\n');   // Newline

		return decoded;
	}

	/**
	 * Clean HTML by removing unnecessary elements
	 */
	private cleanHtml(html: string): string {
		try {
			const doc = parseHtml(html);

			// Remove scripts
			doc.querySelectorAll('script').forEach(el => el.remove());

			// Remove styles
			doc.querySelectorAll('style').forEach(el => el.remove());

			// Remove comments
			const removeComments = (node: Node) => {
				for (let i = node.childNodes.length - 1; i >= 0; i--) {
					const child = node.childNodes[i];
					if (child.nodeType === Node.COMMENT_NODE) {
						node.removeChild(child);
					} else if (child.nodeType === Node.ELEMENT_NODE) {
						removeComments(child);
					}
				}
			};
			removeComments(doc.body);

			// Remove empty paragraphs
			doc.querySelectorAll('p').forEach(p => {
				if (!p.textContent?.trim()) {
					p.remove();
				}
			});

			// Remove inline styles (optional)
			doc.querySelectorAll('[style]').forEach(el => {
				el.removeAttribute('style');
			});

			return doc.body.innerHTML;
		} catch (error) {
			logger.error('Failed to clean HTML:', error);
			return html;
		}
	}

	/**
	 * Convert HTML to Markdown (basic implementation)
	 * For a more robust solution, consider using a library like turndown
	 */
	private htmlToMarkdown(html: string): string {
		try {
			const doc = parseHtml(html);
			return this.nodeToMarkdown(doc.body);
		} catch (error) {
			logger.error('Failed to convert HTML to Markdown:', error);
			return html;
		}
	}

	/**
	 * Recursively convert DOM node to Markdown
	 */
	private nodeToMarkdown(node: Node): string {
		if (node.nodeType === Node.TEXT_NODE) {
			return node.textContent || '';
		}

		if (node.nodeType !== Node.ELEMENT_NODE) {
			return '';
		}

		const element = node as Element;
		const tagName = element.tagName.toLowerCase();
		const children = Array.from(element.childNodes)
			.map(child => this.nodeToMarkdown(child))
			.join('');

		switch (tagName) {
			case 'h1':
				return `\n# ${children}\n\n`;
			case 'h2':
				return `\n## ${children}\n\n`;
			case 'h3':
				return `\n### ${children}\n\n`;
			case 'h4':
				return `\n#### ${children}\n\n`;
			case 'h5':
				return `\n##### ${children}\n\n`;
			case 'h6':
				return `\n###### ${children}\n\n`;
			case 'p':
				return `${children}\n\n`;
			case 'br':
				return '\n';
			case 'hr':
				return '\n---\n\n';
			case 'strong':
			case 'b':
				return `**${children}**`;
			case 'em':
			case 'i':
				return `*${children}*`;
			case 'code':
				return `\`${children}\``;
			case 'pre':
				return `\n\`\`\`\n${children}\n\`\`\`\n\n`;
			case 'blockquote':
				return `\n> ${children.replace(/\n/g, '\n> ')}\n\n`;
			case 'ul':
				return `\n${children}\n`;
			case 'ol':
				return `\n${children}\n`;
			case 'li':
				const parent = element.parentElement;
				const isOrdered = parent?.tagName.toLowerCase() === 'ol';
				const index = Array.from(parent?.children || []).indexOf(element) + 1;
				const prefix = isOrdered ? `${index}. ` : '- ';
				return `${prefix}${children}\n`;
			case 'a': {
				const href = element.getAttribute('href');
				if (href) {
					return `[${children}](${href})`;
				}
				return children;
			}
			case 'img': {
				const src = element.getAttribute('src');
				const alt = element.getAttribute('alt') || '';
				if (src) {
					return `\n![${alt}](${src})\n\n`;
				}
				return '';
			}
			case 'table':
				return `\n${this.tableToMarkdown(element)}\n\n`;
			default:
				return children;
		}
	}

	/**
	 * Convert HTML table to Markdown table
	 */
	private tableToMarkdown(table: Element): string {
		const rows = Array.from(table.querySelectorAll('tr'));
		if (rows.length === 0) return '';

		const markdownRows: string[] = [];

		rows.forEach((row, rowIndex) => {
			const cells = Array.from(row.querySelectorAll('th, td'));
			const cellContents = cells.map(cell => this.nodeToMarkdown(cell).trim());
			markdownRows.push(`| ${cellContents.join(' | ')} |`);

			// Add separator after header row
			if (rowIndex === 0) {
				const separator = cells.map(() => '---').join(' | ');
				markdownRows.push(`| ${separator} |`);
			}
		});

		return markdownRows.join('\n');
	}

	/**
	 * Extract images from HTML content
	 */
	extractImages(html: string): Array<{ src: string; alt: string }> {
		try {
			const doc = parseHtml(html);
			const images = Array.from(doc.querySelectorAll('img'));

			return images.map(img => ({
				src: img.getAttribute('src') || '',
				alt: img.getAttribute('alt') || '',
			}));
		} catch (error) {
			logger.error('Failed to extract images:', error);
			return [];
		}
	}

	/**
	 * Extract links from HTML content
	 */
	extractLinks(html: string): Array<{ href: string; text: string }> {
		try {
			const doc = parseHtml(html);
			const links = Array.from(doc.querySelectorAll('a[href]'));

			return links.map(link => ({
				href: link.getAttribute('href') || '',
				text: link.textContent || '',
			}));
		} catch (error) {
			logger.error('Failed to extract links:', error);
			return [];
		}
	}

	/**
	 * Get text excerpt from HTML
	 */
	getExcerpt(html: string, maxLength: number = 200): string {
		try {
			const doc = parseHtml(html);
			const text = doc.body.textContent || '';
			const cleaned = text.replace(/\s+/g, ' ').trim();

			if (cleaned.length <= maxLength) {
				return cleaned;
			}

			return cleaned.substring(0, maxLength) + '...';
		} catch (error) {
			logger.error('Failed to get excerpt:', error);
			return '';
		}
	}

	/**
	 * Update clean HTML setting
	 */
	setEnableCleanHtml(enable: boolean): void {
		this.enableCleanHtml = enable;
	}
}
