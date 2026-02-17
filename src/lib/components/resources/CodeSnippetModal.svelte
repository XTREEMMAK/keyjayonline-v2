<script>
	import Swal from 'sweetalert2';
	import { sanitizeHtml } from '$lib/utils/sanitize.js';
	import { fade } from 'svelte/transition';
	import { pushModalState, setupPopstateHandler } from '$lib/utils/modalHistory.js';
	
	let {
		snippet
	} = $props();
	
	export async function showModal() {
		const modalContent = createModalContent();

		// Push history state for back button handling
		pushModalState(`code-snippet-${snippet.id || snippet.title}`);

		// Track cleanup function for popstate listener
		let cleanupPopstate;

		const result = await Swal.fire({
			title: snippet.title,
			html: modalContent,
			width: '95%',
			maxWidth: '900px',
			showCloseButton: true,
			showConfirmButton: false,
			customClass: {
				popup: 'code-modal-popup',
				htmlContainer: 'code-modal-content'
			},
			background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f172a 100%)',
			color: '#ffffff',
			didOpen: () => {
				// Setup back button handler
				cleanupPopstate = setupPopstateHandler(() => {
					Swal.close();
				});

				initializeModalComponents();
				// Calculate scrollbar width for compensation
				const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
				document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
				// Lock body scroll
				document.body.classList.add('modal-open');
			},
			willClose: () => {
				// Cleanup popstate listener
				if (cleanupPopstate) cleanupPopstate();

				document.body.classList.remove('modal-open');
				document.documentElement.style.removeProperty('--scrollbar-width');
			}
		});

		return result;
	}

	function getDifficultyColor(level) {
		switch (level) {
			case 'beginner':
				return { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.2)' };
			case 'intermediate':
				return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.2)' };
			case 'advanced':
				return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)' };
			default:
				return { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.2)' };
		}
	}

	function getLanguageIcon(language) {
		const icons = {
			'javascript': 'vscode-icons:file-type-js',
			'typescript': 'vscode-icons:file-type-typescript',
			'python': 'vscode-icons:file-type-python',
			'java': 'vscode-icons:file-type-java',
			'css': 'vscode-icons:file-type-css',
			'html': 'vscode-icons:file-type-html',
			'php': 'vscode-icons:file-type-php',
			'go': 'vscode-icons:file-type-go',
			'rust': 'vscode-icons:file-type-rust',
			'cpp': 'vscode-icons:file-type-cpp',
			'c': 'vscode-icons:file-type-c',
			'shell': 'vscode-icons:file-type-shell',
			'sql': 'vscode-icons:file-type-sql',
			'json': 'vscode-icons:file-type-json',
			'yaml': 'vscode-icons:file-type-yaml',
			'xml': 'vscode-icons:file-type-xml'
		};
		return icons[language.toLowerCase()] || 'mdi:code-braces';
	}

	function createModalContent() {
		const difficulty = getDifficultyColor(snippet.difficulty_level);
		
		return `
			<div class="code-modal-container">
				<div class="code-header-section">
					<div class="code-info">
						<div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: center;">
							<div style="display: flex; align-items: center; gap: 8px;">
								<iconify-icon noobserver icon="${getLanguageIcon(snippet.programming_language)}" style="font-size: 24px;"></iconify-icon>
								<span style="background: rgba(59, 130, 246, 0.2); color: #3b82f6; padding: 6px 12px; border-radius: 16px; font-weight: 500; font-size: 0.9rem;">${snippet.programming_language}</span>
							</div>
							<span style="background: ${difficulty.bg}; color: ${difficulty.color}; padding: 6px 12px; border-radius: 16px; font-weight: 500; font-size: 0.9rem;">${snippet.difficulty_level}</span>
							${snippet.featured ? `<span style="background: rgba(245, 158, 11, 0.2); color: #f59e0b; padding: 6px 12px; border-radius: 16px; font-size: 0.875rem;">Featured</span>` : ''}
						</div>
						
						${snippet.description ? `
							<p style="color: #d1d5db; line-height: 1.6; margin-bottom: 16px; font-size: 1rem;">${snippet.description}</p>
						` : ''}
						
						${snippet.use_case ? `
							<div style="background: rgba(139, 92, 246, 0.1); border-left: 3px solid #8b5cf6; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px;">
								<p style="color: #8b5cf6; font-weight: 500; margin-bottom: 4px; font-size: 0.9rem;">Use Case:</p>
								<p style="color: #d1d5db; font-size: 0.9rem; line-height: 1.5;">${snippet.use_case}</p>
							</div>
						` : ''}
						
						${snippet.tags?.length > 0 ? `
							<div style="margin-bottom: 16px;">
								<div style="display: flex; gap: 6px; flex-wrap: wrap;">
									${snippet.tags.map(tag => `
										<span style="background: rgba(107, 114, 128, 0.2); color: #9ca3af; padding: 4px 8px; border-radius: 12px; font-size: 0.75rem;">#${tag}</span>
									`).join('')}
								</div>
							</div>
						` : ''}
						
						<div style="display: flex; gap: 12px;">
							<button onclick="copyCodeToClipboard()" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; background: linear-gradient(45deg, #10b981, #22c55e); color: white; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; transition: transform 0.2s;" 
								onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
								<iconify-icon noobserver icon="mdi:content-copy"></iconify-icon>
								Copy Code
							</button>
							${snippet.category ? `
								<span style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; background: rgba(59, 130, 246, 0.1); color: #3b82f6; border-radius: 8px; font-size: 0.9rem;">
									<iconify-icon noobserver icon="mdi:folder"></iconify-icon>
									${snippet.category.name}
								</span>
							` : ''}
						</div>
					</div>
				</div>
				
				<div class="code-content-section">
					<div style="position: relative; background: #0d1117; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.1);">
						<!-- Code Header -->
						<div style="background: #161b22; padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); display: flex; justify-content: between; align-items: center;">
							<div style="display: flex; align-items: center; gap: 12px;">
								<div style="display: flex; gap: 6px;">
									<div style="width: 12px; height: 12px; background: #ff5f56; border-radius: 50%;"></div>
									<div style="width: 12px; height: 12px; background: #ffbd2e; border-radius: 50%;"></div>
									<div style="width: 12px; height: 12px; background: #27ca3f; border-radius: 50%;"></div>
								</div>
								<span style="color: #8b949e; font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace; font-size: 0.85rem;">${snippet.programming_language.toLowerCase()}.${getFileExtension(snippet.programming_language)}</span>
							</div>
							<button id="copy-btn" onclick="copyCodeToClipboard()" style="background: rgba(56, 139, 253, 0.15); color: #58a6ff; border: 1px solid rgba(56, 139, 253, 0.3); padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; cursor: pointer; transition: all 0.2s; font-family: inherit;">
								<iconify-icon noobserver icon="mdi:content-copy" style="margin-right: 4px;"></iconify-icon>
								Copy
							</button>
						</div>
						
						<!-- Code Content -->
						<div style="max-height: 400px; overflow-y: auto;">
							<pre id="code-content" style="margin: 0; padding: 20px; background: transparent; color: #c9d1d9; font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace; font-size: 14px; line-height: 1.45; overflow-x: auto; white-space: pre;"><code>${escapeHtml(snippet.code_content || '')}</code></pre>
						</div>
					</div>
					
					${snippet.created_at ? `
						<div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255, 255, 255, 0.1); color: #6b7280; font-size: 0.85rem; text-align: center;">
							Created on ${new Date(snippet.created_at).toLocaleDateString()}
						</div>
					` : ''}
				</div>
			</div>
		`;
	}
	
	function getFileExtension(language) {
		const extensions = {
			'javascript': 'js',
			'typescript': 'ts',
			'python': 'py',
			'java': 'java',
			'css': 'css',
			'html': 'html',
			'php': 'php',
			'go': 'go',
			'rust': 'rs',
			'cpp': 'cpp',
			'c': 'c',
			'shell': 'sh',
			'bash': 'sh',
			'sql': 'sql',
			'json': 'json',
			'yaml': 'yml',
			'xml': 'xml'
		};
		return extensions[language.toLowerCase()] || 'txt';
	}
	
	function escapeHtml(text) {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}
	
	function initializeModalComponents() {
		// Apply syntax highlighting if available
		if (typeof hljs !== 'undefined') {
			const codeBlock = document.querySelector('#code-content code');
			if (codeBlock) {
				hljs.highlightElement(codeBlock);
			}
		}
	}
	
	// Global functions for the modal
	window.copyCodeToClipboard = async function() {
		const codeContent = snippet.code_content || '';
		const copyBtn = document.getElementById('copy-btn');
		
		try {
			await navigator.clipboard.writeText(codeContent);
			
			// Update button to show success
			const originalHTML = copyBtn.innerHTML;
			copyBtn.innerHTML = '<iconify-icon noobserver icon="mdi:check" style="margin-right: 4px;"></iconify-icon>Copied!';
			copyBtn.style.background = 'rgba(34, 197, 94, 0.15)';
			copyBtn.style.color = '#22c55e';
			copyBtn.style.borderColor = 'rgba(34, 197, 94, 0.3)';
			
			// Reset after 2 seconds
			setTimeout(() => {
				copyBtn.innerHTML = originalHTML;
				copyBtn.style.background = 'rgba(56, 139, 253, 0.15)';
				copyBtn.style.color = '#58a6ff';
				copyBtn.style.borderColor = 'rgba(56, 139, 253, 0.3)';
			}, 2000);
			
		} catch (err) {
			console.error('Failed to copy code:', err);
			
			// Fallback for older browsers
			const textArea = document.createElement('textarea');
			textArea.value = codeContent;
			document.body.appendChild(textArea);
			textArea.select();
			document.execCommand('copy');
			document.body.removeChild(textArea);
			
			// Show success message
			const originalHTML = copyBtn.innerHTML;
			copyBtn.innerHTML = '<iconify-icon noobserver icon="mdi:check" style="margin-right: 4px;"></iconify-icon>Copied!';
			setTimeout(() => {
				copyBtn.innerHTML = originalHTML;
			}, 2000);
		}
	};
</script>

<style>
	:global(.code-modal-popup) {
		border-radius: 16px !important;
	}
	
	:global(.code-modal-content) {
		padding: 0 !important;
	}
	
	:global(.code-modal-container) {
		display: flex;
		flex-direction: column;
		gap: 24px;
		text-align: left;
		max-height: 80vh;
		overflow: hidden;
	}
	
	:global(.code-header-section) {
		flex-shrink: 0;
	}
	
	:global(.code-content-section) {
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}
	
	/* Syntax highlighting styles (GitHub Dark theme inspired) */
	:global(.code-modal-container pre code) {
		color: #c9d1d9;
	}
	
	:global(.hljs-comment), :global(.hljs-quote) {
		color: #8b949e;
		font-style: italic;
	}
	
	:global(.hljs-keyword), :global(.hljs-selector-tag), :global(.hljs-subst) {
		color: #ff7b72;
	}
	
	:global(.hljs-number), :global(.hljs-literal), :global(.hljs-variable), :global(.hljs-template-variable) {
		color: #79c0ff;
	}
	
	:global(.hljs-string), :global(.hljs-doctag) {
		color: #a5d6ff;
	}
	
	:global(.hljs-title), :global(.hljs-section), :global(.hljs-selector-id) {
		color: #d2a8ff;
	}
	
	:global(.hljs-type), :global(.hljs-class .hljs-title) {
		color: #ffa657;
	}
	
	:global(.hljs-tag), :global(.hljs-name), :global(.hljs-attribute) {
		color: #7ee787;
	}
	
	:global(.hljs-regexp), :global(.hljs-link) {
		color: #f85149;
	}
	
	:global(.hljs-symbol), :global(.hljs-bullet) {
		color: #79c0ff;
	}
	
	:global(.hljs-built_in), :global(.hljs-builtin-name) {
		color: #ffa657;
	}
	
	:global(.hljs-meta) {
		color: #8b949e;
	}
	
	:global(.hljs-deletion) {
		background: #ffeef0;
	}
	
	:global(.hljs-addition) {
		background: #e6ffed;
	}
	
	/* Custom scrollbar for code content */
	:global(.code-content-section pre) {
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
	}
	
	:global(.code-content-section pre::-webkit-scrollbar) {
		width: 6px;
		height: 6px;
	}
	
	:global(.code-content-section pre::-webkit-scrollbar-track) {
		background: transparent;
	}
	
	:global(.code-content-section pre::-webkit-scrollbar-thumb) {
		background: rgba(255, 255, 255, 0.2);
		border-radius: 3px;
	}
	
	:global(.code-content-section pre::-webkit-scrollbar-thumb:hover) {
		background: rgba(255, 255, 255, 0.3);
	}
</style>