export function sanitizeHtml(html) {
	if (!html) return '';
	
	// Check if we're in a browser environment
	if (typeof document === 'undefined') {
		// Server-side: Decode HTML entities multiple times to handle double-encoding
		let decoded = html;
		
		// console.log('Original HTML:', html);
		
		// Decode multiple times to handle nested encoding
		for (let i = 0; i < 3; i++) {
			const previousDecoded = decoded;
			decoded = decoded
				.replace(/&lt;/g, '<')
				.replace(/&gt;/g, '>')
				.replace(/&amp;/g, '&')
				.replace(/&quot;/g, '"')
				.replace(/&#x27;/g, "'")
				.replace(/&#39;/g, "'");
			
			// console.log(`Decode pass ${i + 1}:`, decoded);
			
			// If no more changes, break out of loop
			if (decoded === previousDecoded) break;
		}
		
		// Remove dangerous content
		decoded = decoded
			.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
			.replace(/\son\w+="[^"]*"/gi, '');
			
		return decoded;
	}
	
	// Client-side: Use DOM APIs for better sanitization with multiple decoding
	let decoded = html;
	
	// Decode multiple times to handle nested encoding using DOM
	for (let i = 0; i < 3; i++) {
		const tempDiv = document.createElement('div');
		tempDiv.innerHTML = decoded;
		const newDecoded = tempDiv.innerHTML;
		
		// If no more changes, break out of loop
		if (newDecoded === decoded) break;
		decoded = newDecoded;
	}
	
	// Final sanitization pass
	const finalDiv = document.createElement('div');
	finalDiv.innerHTML = decoded;
	
	// Remove script tags for security
	const scripts = finalDiv.getElementsByTagName('script');
	for (let i = scripts.length - 1; i >= 0; i--) {
		scripts[i].remove();
	}
	
	// Remove on* event handlers for security
	const allElements = finalDiv.getElementsByTagName('*');
	for (let element of allElements) {
		for (let attr of [...element.attributes]) {
			if (attr.name.startsWith('on')) {
				element.removeAttribute(attr.name);
			}
		}
	}
	
	// Return the sanitized HTML with formatting preserved
	return finalDiv.innerHTML;
}