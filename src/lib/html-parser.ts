/**
 * Lightweight HTML parser using browser DOM API
 * Alternative to cheerio for parsing HTML content
 */

/**
 * Parse HTML string to DOM
 */
export function parseHtml(html: string): Document {
	const parser = new DOMParser();
	return parser.parseFromString(html, 'text/html');
}

/**
 * Convert HTML to plain text
 */
export function htmlToText(html: string): string {
	const doc = parseHtml(html);
	return doc.body.textContent || '';
}

/**
 * Extract text content from specific element
 */
export function extractText(html: string, selector: string): string {
	const doc = parseHtml(html);
	const element = doc.querySelector(selector);
	return element?.textContent || '';
}

/**
 * Remove elements by selector
 */
export function removeElements(html: string, selector: string): string {
	const doc = parseHtml(html);
	const elements = doc.querySelectorAll(selector);
	elements.forEach(el => el.remove());
	return doc.body.innerHTML;
}

/**
 * Get all elements by selector
 */
export function queryAll(html: string, selector: string): Element[] {
	const doc = parseHtml(html);
	return Array.from(doc.querySelectorAll(selector));
}

/**
 * Get element attribute
 */
export function getAttribute(element: Element, attr: string): string | null {
	return element.getAttribute(attr);
}
