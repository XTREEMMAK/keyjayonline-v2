<script>
	import Swal from 'sweetalert2';
	import { sanitizeHtml } from '$lib/utils/sanitize.js';
	import { fade } from 'svelte/transition';
	import '$lib/styles/album-modal.css';
	
	/** @typedef {import('$lib/types').Game} Game */
	
	let {
		/** @type {Game} */
		game
	} = $props();
	
	export async function showModal() {
		const modalContent = createModalContent();
		
		const result = await Swal.fire({
			title: game.title,
			html: modalContent,
			width: '95%',
			maxWidth: '1200px',
			showCloseButton: true,
			showConfirmButton: false,
			customClass: {
				popup: 'album-modal-popup game-modal-popup',
				htmlContainer: 'album-modal-content'
			},
			background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f172a 100%)',
			color: '#ffffff',
			didOpen: () => {
				initializeModalComponents();
				// Calculate scrollbar width for compensation
				const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
				document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
				// Lock body scroll
				document.body.classList.add('modal-open');
			},
			willClose: () => {
				document.body.classList.remove('modal-open');
				document.documentElement.style.removeProperty('--scrollbar-width');
			}
		});
		
		return result;
	}

	function createModalContent() {
		return `
			<div class="game-modal-container">
				<div class="game-info-section">
					<div class="game-artwork">
						<img src="${game.cover_image || game.image || 'https://placehold.co/400x600/1a1a1a/3B82F6?text=Game+Cover'}" 
							 alt="${game.title}" 
							 style="width: 100%; max-width: 300px; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.4);" />
						
						${game.igdb_rating ? `
							<div style="margin-top: 12px; text-align: center;">
								<div style="background: rgba(255, 193, 7, 0.2); color: #ffc107; padding: 8px 16px; border-radius: 20px; display: inline-block;">
									<iconify-icon icon="mdi:star" style="margin-right: 4px;"></iconify-icon>
									IGDB: ${game.igdb_rating}/10
								</div>
							</div>
						` : ''}
					</div>
					
					<div class="game-details">
						<h2 class="game-modal-title" style="font-size: clamp(1.25rem, 4vw, 2rem); font-weight: bold; margin-bottom: 8px; color: #ffffff; line-height: 1.2;">${game.title}</h2>
						
						<div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
							${game.platform ? `<span style="background: rgba(59, 130, 246, 0.2); color: #3b82f6; padding: 4px 12px; border-radius: 16px; font-size: 0.875rem;">${game.platform}</span>` : ''}
							${game.category ? `<span style="background: rgba(168, 85, 247, 0.2); color: #a855f7; padding: 4px 12px; border-radius: 16px; font-size: 0.875rem;">${game.category}</span>` : ''}
							${game.completion_status ? `<span style="background: rgba(34, 197, 94, 0.2); color: #22c55e; padding: 4px 12px; border-radius: 16px; font-size: 0.875rem;">${game.completion_status}</span>` : ''}
						</div>
						
						${game.rating || game.personal_rating ? `
							<div style="margin-bottom: 16px;">
								<div style="display: flex; align-items: center; gap: 8px;">
									<span style="color: #d1d5db; font-weight: 500;">My Rating:</span>
									<div style="display: flex; align-items: center; gap: 4px;">
										<iconify-icon icon="mdi:star" style="color: #fbbf24;"></iconify-icon>
										<span style="color: #ffffff; font-weight: bold; font-size: 1.1rem;">${game.rating || game.personal_rating}/10</span>
									</div>
								</div>
							</div>
						` : ''}
						
						${game.playtime ? `
							<div style="margin-bottom: 16px; color: #9ca3af;">
								<iconify-icon icon="mdi:clock" style="margin-right: 8px;"></iconify-icon>
								<span>${game.playtime} hours played</span>
							</div>
						` : ''}
						
						${game.last_played ? `
							<div style="margin-bottom: 16px; color: #9ca3af;">
								<iconify-icon icon="mdi:calendar" style="margin-right: 8px;"></iconify-icon>
								<span>Last played: ${new Date(game.last_played).toLocaleDateString()}</span>
							</div>
						` : ''}
					</div>
				</div>
				
				<div class="game-content-section">
					<!-- Desktop Tab System -->
					<div class="desktop-tabs-system">
						<div class="tab-navigation" style="display: flex; gap: 4px; margin-bottom: 24px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 0; overflow-x: auto;">
							<button id="tab-review" class="tab-button active" onclick="switchGameTab('review')" style="padding: 8px 12px; min-width: max-content; white-space: nowrap; background: transparent; color: #ffffff; border: none; border-bottom: 2px solid #3b82f6; cursor: pointer; font-weight: 500; font-size: 0.875rem; transition: all 0.3s;">
								Review
							</button>
							${game.screenshots?.length > 0 ? `
							<button id="tab-screenshots" class="tab-button" onclick="switchGameTab('screenshots')" style="padding: 8px 12px; min-width: max-content; white-space: nowrap; background: transparent; color: #9ca3af; border: none; border-bottom: 2px solid transparent; cursor: pointer; font-weight: 500; font-size: 0.875rem; transition: all 0.3s;">
								Screenshots
							</button>
							` : ''}
							${(game.developer || game.publisher) ? `
							<button id="tab-info" class="tab-button" onclick="switchGameTab('info')" style="padding: 8px 12px; min-width: max-content; white-space: nowrap; background: transparent; color: #9ca3af; border: none; border-bottom: 2px solid transparent; cursor: pointer; font-weight: 500; font-size: 0.875rem; transition: all 0.3s;">
								Game Info
							</button>
							` : ''}
						</div>
						
						<div class="tab-content" style="position: relative; height: clamp(400px, 60vh, 600px); overflow: hidden;">
							<!-- Review Tab -->
							<div id="content-review" class="tab-panel active" style="opacity: 1; position: absolute; top: 0; left: 0; right: 0; bottom: 0; overflow-y: auto; transition: opacity 0.3s ease;">
								${game.description || game.review_text ? `
									<div style="margin-bottom: 32px;">
										<h3 style="font-size: clamp(1.1rem, 3vw, 1.5rem); font-weight: 600; color: #ffffff; margin-bottom: 16px; text-align: left;">My Review</h3>
										${game.rich_review ? 
											`<div class="game-description" style="color: #d1d5db; line-height: 1.8; font-size: 1rem; text-align: left;">${sanitizeHtml(game.rich_review)}</div>` : 
											`<p class="game-description" style="color: #d1d5db; line-height: 1.8; font-size: 1rem; text-align: left;">${game.description || game.review_text}</p>`}
									</div>
								` : ''}
								
								${game.pros?.length > 0 || game.cons?.length > 0 ? `
									<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px;">
										${game.pros?.length > 0 ? `
											<div>
												<h4 style="color: #22c55e; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
													<iconify-icon icon="mdi:check-circle"></iconify-icon>
													Pros
												</h4>
												<ul style="list-style: none; padding: 0;">
													${game.pros.map(pro => `<li style="color: #d1d5db; margin-bottom: 8px; padding-left: 16px; position: relative;">
														<span style="position: absolute; left: 0; color: #22c55e;">+</span>
														${pro}
													</li>`).join('')}
												</ul>
											</div>
										` : ''}
										
										${game.cons?.length > 0 ? `
											<div>
												<h4 style="color: #ef4444; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
													<iconify-icon icon="mdi:close-circle"></iconify-icon>
													Cons
												</h4>
												<ul style="list-style: none; padding: 0;">
													${game.cons.map(con => `<li style="color: #d1d5db; margin-bottom: 8px; padding-left: 16px; position: relative;">
														<span style="position: absolute; left: 0; color: #ef4444;">-</span>
														${con}
													</li>`).join('')}
												</ul>
											</div>
										` : ''}
									</div>
								` : ''}
								
								${game.review_date ? `
									<div style="border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 16px; color: #9ca3af; font-size: 0.9rem;">
										Review written on ${new Date(game.review_date).toLocaleDateString()}
									</div>
								` : ''}
							</div>
							
							<!-- Screenshots Tab -->
							${game.screenshots?.length > 0 ? `
								<div id="content-screenshots" class="tab-panel" style="opacity: 0; position: absolute; top: 0; left: 0; right: 0; bottom: 0; overflow-y: auto; pointer-events: none; transition: opacity 0.3s ease;">
									<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
										${game.screenshots.map(screenshot => `
											<div style="background: rgba(55, 65, 81, 0.3); border-radius: 12px; overflow: hidden; transition: transform 0.3s; cursor: pointer;" 
												 onclick="openScreenshot('${screenshot.url}')"
												 onmouseover="this.style.transform='scale(1.02)'" 
												 onmouseout="this.style.transform='scale(1)'">
												<img src="${screenshot.thumbnail || screenshot.url}" alt="${screenshot.title}" style="width: 100%; height: 140px; object-fit: cover;" />
												${screenshot.title ? `<div style="padding: 12px;"><h4 style="color: #ffffff; font-weight: 500; font-size: 0.9rem;">${screenshot.title}</h4></div>` : ''}
											</div>
										`).join('')}
									</div>
								</div>
							` : ''}
							
							<!-- Game Info Tab -->
							${(game.developer || game.publisher) ? `
								<div id="content-info" class="tab-panel" style="opacity: 0; position: absolute; top: 0; left: 0; right: 0; bottom: 0; overflow-y: auto; pointer-events: none; transition: opacity 0.3s ease;">
									<div style="display: grid; gap: 20px;">
										${game.developer ? `
											<div style="background: rgba(55, 65, 81, 0.3); padding: 16px; border-radius: 12px;">
												<h4 style="color: #3b82f6; font-weight: 600; margin-bottom: 8px;">Developer</h4>
												<p style="color: #d1d5db;">${Array.isArray(game.developer) ? game.developer.join(', ') : game.developer}</p>
											</div>
										` : ''}
										
										${game.publisher ? `
											<div style="background: rgba(55, 65, 81, 0.3); padding: 16px; border-radius: 12px;">
												<h4 style="color: #8b5cf6; font-weight: 600; margin-bottom: 8px;">Publisher</h4>
												<p style="color: #d1d5db;">${Array.isArray(game.publisher) ? game.publisher.join(', ') : game.publisher}</p>
											</div>
										` : ''}
										
										${game.release_date ? `
											<div style="background: rgba(55, 65, 81, 0.3); padding: 16px; border-radius: 12px;">
												<h4 style="color: #10b981; font-weight: 600; margin-bottom: 8px;">Release Date</h4>
												<p style="color: #d1d5db;">${new Date(game.release_date).toLocaleDateString()}</p>
											</div>
										` : ''}
										
										${game.genres?.length > 0 ? `
											<div style="background: rgba(55, 65, 81, 0.3); padding: 16px; border-radius: 12px;">
												<h4 style="color: #f59e0b; font-weight: 600; margin-bottom: 8px;">Genres</h4>
												<div style="display: flex; gap: 8px; flex-wrap: wrap;">
													${game.genres.map(genre => `<span style="background: rgba(245, 158, 11, 0.2); color: #f59e0b; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem;">${genre}</span>`).join('')}
												</div>
											</div>
										` : ''}
									</div>
								</div>
							` : ''}
						</div>
					</div>
				</div>
			</div>
		`;
	}
	
	function initializeModalComponents() {
		// No complex components to initialize like audio players
		// Screenshots will use simple onclick handlers
	}
	
	// Global functions for the modal
	window.switchGameTab = function(tabName) {
		const tabs = document.querySelectorAll('.tab-button');
		const contents = document.querySelectorAll('.tab-panel');
		
		tabs.forEach(tab => {
			const tabEl = tab;
			if (tabEl.id === `tab-${tabName}`) {
				tabEl.classList.add('active');
				tabEl.style.color = '#ffffff';
				tabEl.style.borderBottomColor = '#3b82f6';
			} else {
				tabEl.classList.remove('active');
				tabEl.style.color = '#9ca3af';
				tabEl.style.borderBottomColor = 'transparent';
			}
		});
		
		contents.forEach(content => {
			const contentEl = content;
			if (contentEl.id === `content-${tabName}`) {
				setTimeout(() => {
					contentEl.classList.add('active');
					contentEl.style.opacity = '1';
					contentEl.style.pointerEvents = 'auto';
				}, 150);
			} else {
				contentEl.classList.remove('active');
				contentEl.style.opacity = '0';
				setTimeout(() => {
					if (!contentEl.classList.contains('active')) {
						contentEl.style.pointerEvents = 'none';
					}
				}, 300);
			}
		});
	};
	
	window.openScreenshot = function(imageUrl) {
		Swal.fire({
			imageUrl: imageUrl,
			imageWidth: 'auto',
			imageHeight: 'auto',
			showCloseButton: true,
			showConfirmButton: false,
			background: 'rgba(0, 0, 0, 0.9)',
			customClass: {
				image: 'screenshot-modal-image'
			}
		});
	};
</script>

<style>
	:global(.game-modal-popup) {
		border-radius: 16px !important;
	}
	
	:global(.game-modal-container) {
		display: grid;
		grid-template-columns: 300px 1fr;
		gap: 32px;
		text-align: left;
	}
	
	:global(.game-info-section) {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}
	
	:global(.game-content-section) {
		min-height: 500px;
	}
	
	:global(.screenshot-modal-image) {
		border-radius: 8px;
		max-width: 90vw;
		max-height: 90vh;
		object-fit: contain;
	}
	
	/* Mobile responsive */
	@media (max-width: 768px) {
		:global(.game-modal-container) {
			grid-template-columns: 1fr;
			gap: 24px;
		}
		
		:global(.game-info-section) {
			flex-direction: row;
			align-items: flex-start;
		}
		
		:global(.game-artwork) {
			flex-shrink: 0;
			width: 120px;
		}
		
		:global(.game-details) {
			flex: 1;
			margin-left: 16px;
		}
	}
</style>