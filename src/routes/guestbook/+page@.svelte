<script>
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';

	const API_BASE = '/api';
	const ENTRIES_URL = API_BASE + '/guestbook/entries';
	const PER_PAGE = 25;

	let entries = $state([]);
	let currentPage = $state(1);
	let totalPages = $state(1);
	let loading = $state(true);
	let loadError = $state(false);

	let nameValue = $state('');
	let websiteValue = $state('');
	let messageValue = $state('');
	let submitting = $state(false);
	let statusMessage = $state('');
	let statusIsError = $state(false);

	let pickerOpen = $state(false);
	let emojiPickerWrap;
	let emojiBtn;
	let messageEl;

	const COOLDOWN_MS = 5 * 60 * 1000;
	const COOLDOWN_KEY = 'kjo_gb_cooldown';
	let cooldownRemaining = $state(0);
	let cooldownInterval;
	const onCooldown = $derived(cooldownRemaining > 0);

	const charCount = $derived(messageValue.length);
	const charWarn = $derived(charCount > 450);

	function formatCooldown(seconds) {
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return m + ':' + String(s).padStart(2, '0');
	}

	function startCooldown() {
		localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
		cooldownRemaining = Math.ceil(COOLDOWN_MS / 1000);
		clearInterval(cooldownInterval);
		cooldownInterval = setInterval(tickCooldown, 1000);
	}

	function tickCooldown() {
		const stored = parseInt(localStorage.getItem(COOLDOWN_KEY) || '0', 10);
		const elapsed = Date.now() - stored;
		if (elapsed >= COOLDOWN_MS) {
			cooldownRemaining = 0;
			clearInterval(cooldownInterval);
			localStorage.removeItem(COOLDOWN_KEY);
		} else {
			cooldownRemaining = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
		}
	}

	function formatDate(dateStr) {
		if (!dateStr) return '';
		const d = new Date(dateStr);
		const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
		return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
	}

	async function loadEntries(page) {
		currentPage = page || 1;
		loading = true;
		loadError = false;

		try {
			const res = await fetch(ENTRIES_URL + '?page=' + currentPage + '&limit=' + PER_PAGE);
			const data = await res.json();

			if (!data || !data.entries) {
				entries = [];
				totalPages = 1;
			} else {
				entries = data.entries;
				totalPages = data.pages || 1;
			}
		} catch {
			entries = [];
			loadError = true;
		} finally {
			loading = false;
		}
	}

	function handleEmojiClick(e) {
		const emoji = e.detail.unicode;
		if (messageEl) {
			const start = messageEl.selectionStart;
			const end = messageEl.selectionEnd;
			const text = messageValue;
			messageValue = text.slice(0, start) + emoji + text.slice(end);
			// Restore cursor after Svelte updates the DOM
			requestAnimationFrame(() => {
				messageEl.selectionStart = messageEl.selectionEnd = start + emoji.length;
				messageEl.focus();
			});
		}
		pickerOpen = false;
	}

	function handleClickOutside(e) {
		if (emojiPickerWrap && !emojiPickerWrap.contains(e.target) && emojiBtn && e.target !== emojiBtn) {
			pickerOpen = false;
		}
	}

	async function handleSubmit(e) {
		e.preventDefault();

		const name = nameValue.trim();
		const website = websiteValue.trim();
		const message = messageValue.trim();

		if (!name || !message) {
			statusMessage = 'Please fill in your name and message.';
			statusIsError = true;
			return;
		}

		submitting = true;
		statusMessage = '';

		let token = '';
		if (env.PUBLIC_RECAPTCHA_SITE_KEY && window.grecaptcha?.enterprise) {
			try {
				token = await window.grecaptcha.enterprise.execute(env.PUBLIC_RECAPTCHA_SITE_KEY, { action: 'guestbook' });
			} catch (err) {
				console.error('reCAPTCHA error:', err);
			}
		}

		try {
			const res = await fetch(ENTRIES_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name,
					website,
					message,
					recaptcha_token: token
				})
			});

			const resp = await res.json();

			if (resp && resp.error) {
				statusMessage = resp.error;
				statusIsError = true;
			} else {
				nameValue = '';
				websiteValue = '';
				messageValue = '';
				statusMessage = 'Thanks for signing the guestbook!';
				statusIsError = false;
				loadEntries(1);
				startCooldown();
			}
		} catch {
			statusMessage = 'Something went wrong. Please try again.';
			statusIsError = true;
		} finally {
			submitting = false;
		}
	}

	onMount(async () => {
		await import('emoji-picker-element');

		// Bind emoji-click event
		requestAnimationFrame(() => {
			const picker = emojiPickerWrap?.querySelector('emoji-picker');
			if (picker) {
				picker.addEventListener('emoji-click', handleEmojiClick);
			}
		});

		// Resume cooldown if active
		const stored = parseInt(localStorage.getItem(COOLDOWN_KEY) || '0', 10);
		if (stored && Date.now() - stored < COOLDOWN_MS) {
			tickCooldown();
			cooldownInterval = setInterval(tickCooldown, 1000);
		}

		loadEntries(1);

		return () => {
			clearInterval(cooldownInterval);
			const picker = emojiPickerWrap?.querySelector('emoji-picker');
			if (picker) {
				picker.removeEventListener('emoji-click', handleEmojiClick);
			}
		};
	});
</script>

<svelte:head>
	<title>Guestbook — Key Jay Online</title>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
	<link href="https://fonts.googleapis.com/css2?family=Michroma&display=swap" rel="stylesheet">
	{#if env.PUBLIC_RECAPTCHA_SITE_KEY}
		<script src="https://www.google.com/recaptcha/enterprise.js?render={env.PUBLIC_RECAPTCHA_SITE_KEY}"></script>
	{/if}
</svelte:head>

<svelte:document onclick={handleClickOutside} />

<div class="gb-container">
	<!-- Header -->
	<div class="gb-header">
		<h1>Guestbook</h1>
		<p>Leave a message — say hello, share a thought, or just vibe.</p>
	</div>

	<!-- Submission Form -->
	<form class="gb-form glass-card" autocomplete="off" onsubmit={handleSubmit}>
		<fieldset disabled={onCooldown || submitting} class="gb-fieldset">
			<div class="gb-form-row">
				<input type="text" class="gb-input" placeholder="Your name" maxlength="50" required bind:value={nameValue}>
			</div>
			<input type="url" class="gb-input gb-website-input" placeholder="Website (optional)" maxlength="200" bind:value={websiteValue}>
			<div class="gb-textarea-wrap">
				<textarea class="gb-textarea" placeholder="Your message..." maxlength="500" required
					bind:value={messageValue} bind:this={messageEl}></textarea>
				<button type="button" class="gb-emoji-trigger-inline" bind:this={emojiBtn} title="Pick an emoji"
					onclick={() => pickerOpen = !pickerOpen}>😊</button>
			</div>
			<div class="gb-emoji-wrap" bind:this={emojiPickerWrap}>
				<div class="gb-emoji-picker-wrap" class:gb-picker-open={pickerOpen}>
					<emoji-picker></emoji-picker>
				</div>
			</div>
			<div class="gb-form-footer">
				<span class="gb-char-count" class:gb-char-warn={charWarn}>{charCount} / 500</span>
				<button type="submit" class="neu-button neu-button-round">
					{submitting ? 'Sending...' : 'Sign Guestbook'}
				</button>
			</div>
		</fieldset>
		{#if onCooldown}
			<div class="gb-cooldown">You can sign again in {formatCooldown(cooldownRemaining)}</div>
		{:else if statusMessage}
			<div class={statusIsError ? 'gb-form-error' : 'gb-success'}>{statusMessage}</div>
		{/if}
	</form>

	<!-- Entries List -->
	<div class="gb-entries">
		{#if loading}
			<div class="gb-loading">Loading entries...</div>
		{:else if loadError}
			<div class="gb-empty">Could not load entries.</div>
		{:else if entries.length === 0}
			<div class="gb-empty">No entries yet. Be the first to sign!</div>
		{:else}
			{#each entries as entry (entry.id)}
				<div class="gb-entry glass-card">
					<div class="gb-entry-header">
						<div class="gb-entry-info">
							<span class="gb-entry-name">{entry.name}</span>
							{#if entry.website}
								<a class="gb-entry-website" href={entry.website} target="_blank" rel="noopener nofollow">{entry.website.replace(/^https?:\/\/(www\.)?/, '')}</a>
							{/if}
						</div>
						<span class="gb-entry-date">{formatDate(entry.created_at)}</span>
					</div>
					<div class="gb-entry-body">{entry.message}</div>
				</div>
			{/each}
		{/if}
	</div>

	<!-- Pagination -->
	{#if totalPages > 1}
		<div class="gb-pagination">
			<button class="neu-button neu-button-round" disabled={currentPage <= 1}
				onclick={() => loadEntries(currentPage - 1)}>&lt; Prev</button>
			<span class="gb-page-info">Page {currentPage} / {totalPages}</span>
			<button class="neu-button neu-button-round" disabled={currentPage >= totalPages}
				onclick={() => loadEntries(currentPage + 1)}>Next &gt;</button>
		</div>
	{/if}

	<p class="gb-captcha-notice">
		Protected by reCAPTCHA.
		<a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Privacy</a> &middot;
		<a href="https://policies.google.com/terms" target="_blank" rel="noopener">Terms</a>
	</p>
</div>

<style>
	/* Design Tokens */
	:root {
		--neu-bg: #2a2d35;
		--neu-bg-light: #32363f;
		--neu-bg-dark: #22252b;
		--neu-shadow-light: rgba(60, 64, 72, 0.5);
		--neu-shadow-dark: rgba(18, 20, 24, 0.8);
		--neu-accent: #667eea;
		--neu-accent-purple: #764ba2;
		--neu-accent-soft: rgba(102, 126, 234, 0.15);
		--neu-border: rgba(255, 255, 255, 0.05);
		--neu-text-primary: #ffffff;
		--neu-text-secondary: #9ca3af;
		--neu-text-muted: #6b7280;
	}

	:global(*, *::before, *::after) {
		box-sizing: border-box;
	}

	:global(body) {
		margin: 0;
		padding: 0;
		background: var(--neu-bg-dark);
		color: var(--neu-text-primary);
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
		font-size: 15px;
		line-height: 1.6;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	h1 {
		font-family: 'Michroma', sans-serif;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	a {
		color: var(--neu-accent);
		text-decoration: none;
		transition: color 0.2s ease;
	}
	a:hover { color: #8da2f0; }

	.glass-card {
		background: rgba(42, 45, 53, 0.6);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.37);
		border-radius: 20px;
	}

	.neu-button {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		background: var(--neu-bg);
		border-radius: 12px;
		border: 1px solid var(--neu-border);
		box-shadow: 4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light);
		padding: 12px 24px;
		color: var(--neu-text-primary);
		font-weight: 500;
		font-size: 14px;
		cursor: pointer;
		transition: all 0.2s ease;
		font-family: inherit;
	}
	.neu-button:hover {
		box-shadow: 2px 2px 4px var(--neu-shadow-dark), -2px -2px 4px var(--neu-shadow-light);
	}
	.neu-button:active {
		box-shadow: inset 4px 4px 8px var(--neu-shadow-dark), inset -4px -4px 8px var(--neu-shadow-light);
	}
	.neu-button-round { border-radius: 50px; padding: 10px 20px; }
	.neu-button:disabled { opacity: 0.5; cursor: not-allowed; }

	/* Layout */
	.gb-container { max-width: 680px; margin: 0 auto; padding: 1.5rem 1.25rem 2rem; }
	.gb-header { text-align: center; margin-bottom: 1.5rem; }
	.gb-header h1 { font-size: 1.1rem; color: var(--neu-text-primary); margin-bottom: 0.25rem; }
	.gb-header p { font-size: 0.85rem; color: var(--neu-text-muted); }

	/* Form */
	.gb-form { padding: 1.25rem; margin-bottom: 1.5rem; }
	.gb-form-row { display: flex; gap: 10px; margin-bottom: 12px; align-items: stretch; }

	.gb-input, .gb-textarea {
		width: 100%;
		background: var(--neu-bg-dark);
		border: 1px solid var(--neu-border);
		border-radius: 10px;
		padding: 10px 14px;
		color: var(--neu-text-primary);
		font-size: 0.9rem;
		font-family: inherit;
		box-shadow: inset 2px 2px 4px var(--neu-shadow-dark), inset -2px -2px 4px var(--neu-shadow-light);
		transition: border-color 0.2s ease;
		outline: none;
	}
	.gb-input::placeholder, .gb-textarea::placeholder { color: var(--neu-text-muted); }
	.gb-input:focus, .gb-textarea:focus { border-color: var(--neu-accent); }
	.gb-website-input { margin-bottom: 12px; }
	.gb-textarea { min-height: 300px; resize: vertical; margin-bottom: 0; }
	.gb-textarea-wrap { position: relative; }
	.gb-emoji-trigger-inline {
		position: absolute;
		bottom: 8px;
		right: 8px;
		background: var(--neu-bg);
		border: 1px solid var(--neu-border);
		border-radius: 8px;
		padding: 4px 8px;
		font-size: 1.1rem;
		cursor: pointer;
		box-shadow: 1px 1px 3px var(--neu-shadow-dark), -1px -1px 3px var(--neu-shadow-light);
		transition: all 0.2s ease;
		line-height: 1;
		opacity: 0.7;
	}
	.gb-emoji-trigger-inline:hover { opacity: 1; }

	.gb-form-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; }
	.gb-char-count { font-size: 0.75rem; color: var(--neu-text-muted); }
	.gb-char-count.gb-char-warn { color: #f97316; }

	/* Emoji */
	.gb-emoji-wrap { position: relative; }
	.gb-emoji-picker-wrap {
		position: absolute;
		bottom: 100%;
		left: 0;
		margin-bottom: 8px;
		z-index: 100;
		display: none;
	}
	.gb-emoji-picker-wrap.gb-picker-open { display: block; }

	:global(emoji-picker) {
		--background: var(--neu-bg);
		--border-color: rgba(255, 255, 255, 0.08);
		--button-active-background: var(--neu-accent-soft);
		--button-hover-background: rgba(255, 255, 255, 0.06);
		--indicator-color: var(--neu-accent);
		--input-border-color: var(--neu-border);
		--input-font-color: var(--neu-text-primary);
		--input-placeholder-color: var(--neu-text-muted);
		--outline-color: var(--neu-accent);
		--category-font-color: var(--neu-text-muted);
		--text-color: var(--neu-text-primary);
		--input-border-radius: 10px;
		--num-columns: 8;
		width: 100%;
		border-radius: 14px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
	}

	/* Entries */
	.gb-entries { display: flex; flex-direction: column; gap: 12px; margin-bottom: 1.5rem; }
	.gb-entry { padding: 1rem 1.25rem; }
	.gb-entry-header { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 0.5rem; }
	.gb-entry-info { display: flex; flex-direction: column; gap: 2px; }
	.gb-entry-name {
		font-family: 'Michroma', sans-serif;
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--neu-text-primary);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	.gb-entry-website {
		font-size: 0.7rem;
		color: var(--neu-accent);
		text-decoration: none;
		opacity: 0.8;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 250px;
	}
	.gb-entry-website:hover { opacity: 1; text-decoration: underline; }
	.gb-entry-date { margin-left: auto; font-size: 0.72rem; color: var(--neu-text-muted); flex-shrink: 0; }
	.gb-entry-body { font-size: 0.9rem; color: var(--neu-text-secondary); line-height: 1.5; word-break: break-word; }

	/* Pagination */
	.gb-pagination { display: flex; align-items: center; justify-content: center; gap: 12px; }
	.gb-page-info { font-size: 0.78rem; color: var(--neu-text-muted); font-family: 'Michroma', sans-serif; letter-spacing: 0.03em; }

	/* Fieldset */
	.gb-fieldset { border: none; margin: 0; padding: 0; }
	.gb-fieldset:disabled { opacity: 0.5; pointer-events: none; }

	/* States */
	.gb-loading, .gb-empty { text-align: center; padding: 2rem 1rem; color: var(--neu-text-muted); font-size: 0.9rem; }
	.gb-success {
		text-align: center; padding: 0.75rem; margin-top: 12px;
		background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2);
		border-radius: 10px; color: #6ee7b7; font-size: 0.85rem;
	}
	.gb-cooldown {
		text-align: center; padding: 0.75rem; margin-top: 12px;
		background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.2);
		border-radius: 10px; color: #fbbf24; font-size: 0.85rem;
		font-family: 'Michroma', sans-serif; letter-spacing: 0.03em;
	}
	.gb-form-error { color: #f87171; font-size: 0.8rem; margin-top: 4px; }

	.gb-captcha-notice { font-size: 0.65rem; color: var(--neu-text-muted); text-align: center; margin-top: 1rem; line-height: 1.4; }

	@media (max-width: 480px) {
		.gb-container { padding: 1rem 0.75rem 1.5rem; }
		.gb-form-row { flex-wrap: wrap; }
		.gb-emoji-picker-wrap { right: 0; }
		:global(emoji-picker) { --num-columns: 6; width: 100%; }
	}
</style>
