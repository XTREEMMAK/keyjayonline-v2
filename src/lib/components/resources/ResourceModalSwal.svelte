<script>
	import Swal from 'sweetalert2';
	import { sanitizeHtml } from '$lib/utils/sanitize.js';
	import { fade } from 'svelte/transition';
	import { pushModalState, setupPopstateHandler } from '$lib/utils/modalHistory.js';
	import '$lib/styles/album-modal.css';
	
	let {
		resource
	} = $props();
	
	export async function showModal() {
		const modalContent = createModalContent();

		// Push history state for back button handling
		pushModalState(`resource-${resource.id || resource.title}`);

		// Track cleanup function for popstate listener
		let cleanupPopstate;

		const result = await Swal.fire({
			title: resource.title,
			html: modalContent,
			width: '95%',
			maxWidth: '1200px',
			showCloseButton: true,
			showConfirmButton: false,
			customClass: {
				popup: 'album-modal-popup resource-modal-popup',
				htmlContainer: 'album-modal-content'
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

	function getPricingInfo(resource) {
		switch (resource.pricing_type) {
			case 'free':
				return { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.2)', text: 'Free' };
			case 'paid':
				return { 
					color: '#3b82f6', 
					bg: 'rgba(59, 130, 246, 0.2)', 
					text: resource.price_amount ? `$${resource.price_amount}` : 'Paid' 
				};
			case 'subscription':
				return { 
					color: '#f59e0b', 
					bg: 'rgba(245, 158, 11, 0.2)', 
					text: resource.price_amount ? `$${resource.price_amount}/mo` : 'Subscription' 
				};
			case 'freemium':
				return { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.2)', text: 'Freemium' };
			default:
				return { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.2)', text: 'Unknown' };
		}
	}

	function createModalContent() {
		const pricing = getPricingInfo(resource);
		
		return `
			<div class="resource-modal-container">
				<div class="resource-info-section">
					<div class="resource-artwork">
						${resource.featured_image ? 
							`<img src="${resource.featured_image}" alt="${resource.title}" style="width: 100%; max-width: 350px; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.3);" />` :
							`<div style="width: 100%; max-width: 350px; height: 200px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; display: flex; items-center: justify-content: center;">
								<iconify-icon icon="mdi:tools" style="font-size: 64px; color: white;"></iconify-icon>
							</div>`
						}
					</div>
					
					<div class="resource-details">
						<h2 class="resource-modal-title" style="font-size: clamp(1.25rem, 4vw, 2rem); font-weight: bold; margin-bottom: 8px; color: #ffffff; line-height: 1.2;">${resource.title}</h2>
						
						<div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
							<span style="background: ${pricing.bg}; color: ${pricing.color}; padding: 6px 12px; border-radius: 16px; font-weight: 500;">${pricing.text}</span>
							${resource.category ? `<span style="background: rgba(59, 130, 246, 0.2); color: #3b82f6; padding: 6px 12px; border-radius: 16px; font-size: 0.875rem;">${resource.category.name}</span>` : ''}
							${resource.featured ? `<span style="background: rgba(245, 158, 11, 0.2); color: #f59e0b; padding: 6px 12px; border-radius: 16px; font-size: 0.875rem;">Featured</span>` : ''}
						</div>
						
						${resource.personal_rating ? `
							<div style="margin-bottom: 16px;">
								<div style="display: flex; align-items: center; gap: 8px;">
									<span style="color: #d1d5db; font-weight: 500;">My Rating:</span>
									<div style="display: flex; align-items: center; gap: 4px;">
										<iconify-icon icon="mdi:star" style="color: #fbbf24;"></iconify-icon>
										<span style="color: #ffffff; font-weight: bold; font-size: 1.1rem;">${resource.personal_rating}/10</span>
									</div>
								</div>
							</div>
						` : ''}
						
						<!-- Action Buttons -->
						<div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
							${resource.website_url ? `
								<a href="${resource.website_url}" target="_blank" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; background: linear-gradient(45deg, #3b82f6, #8b5cf6); color: white; text-decoration: none; border-radius: 8px; font-weight: 500; transition: transform 0.2s;" 
								   onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
									<iconify-icon icon="mdi:web"></iconify-icon>
									Visit Website
								</a>
							` : ''}
							${resource.download_url ? `
								<a href="${resource.download_url}" target="_blank" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; background: linear-gradient(45deg, #10b981, #22c55e); color: white; text-decoration: none; border-radius: 8px; font-weight: 500; transition: transform 0.2s;"
								   onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
									<iconify-icon icon="mdi:download"></iconify-icon>
									Download
								</a>
							` : ''}
							${resource.documentation_url ? `
								<a href="${resource.documentation_url}" target="_blank" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; background: rgba(107, 114, 128, 0.2); color: #d1d5db; text-decoration: none; border-radius: 8px; font-weight: 500; border: 1px solid rgba(107, 114, 128, 0.3); transition: all 0.2s;"
								   onmouseover="this.style.background='rgba(107, 114, 128, 0.3)'" onmouseout="this.style.background='rgba(107, 114, 128, 0.2)'">
									<iconify-icon icon="mdi:book-open"></iconify-icon>
									Documentation
								</a>
							` : ''}
						</div>
						
						${resource.system_requirements ? `
							<div style="margin-bottom: 16px; padding: 12px; background: rgba(59, 130, 246, 0.1); border-left: 3px solid #3b82f6; border-radius: 4px;">
								<p style="color: #3b82f6; font-weight: 500; margin-bottom: 4px; font-size: 0.9rem;">System Requirements:</p>
								<p style="color: #d1d5db; font-size: 0.85rem;">${resource.system_requirements}</p>
							</div>
						` : ''}
					</div>
				</div>
				
				<div class="resource-content-section">
					<div class="desktop-tabs-system">
						<div class="tab-navigation" style="display: flex; gap: 4px; margin-bottom: 24px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 0; overflow-x: auto;">
							<button id="tab-overview" class="tab-button active" onclick="switchResourceTab('overview')" style="padding: 8px 12px; min-width: max-content; white-space: nowrap; background: transparent; color: #ffffff; border: none; border-bottom: 2px solid #3b82f6; cursor: pointer; font-weight: 500; font-size: 0.875rem; transition: all 0.3s;">
								Overview
							</button>
							${(resource.pros?.length > 0 || resource.cons?.length > 0) ? `
							<button id="tab-analysis" class="tab-button" onclick="switchResourceTab('analysis')" style="padding: 8px 12px; min-width: max-content; white-space: nowrap; background: transparent; color: #9ca3af; border: none; border-bottom: 2px solid transparent; cursor: pointer; font-weight: 500; font-size: 0.875rem; transition: all 0.3s;">
								Analysis
							</button>
							` : ''}
							${resource.screenshots?.length > 0 ? `
							<button id="tab-screenshots" class="tab-button" onclick="switchResourceTab('screenshots')" style="padding: 8px 12px; min-width: max-content; white-space: nowrap; background: transparent; color: #9ca3af; border: none; border-bottom: 2px solid transparent; cursor: pointer; font-weight: 500; font-size: 0.875rem; transition: all 0.3s;">
								Screenshots
							</button>
							` : ''}
							${(resource.tutorial_links?.length > 0 || resource.alternative_tools?.length > 0) ? `
							<button id="tab-extras" class="tab-button" onclick="switchResourceTab('extras')" style="padding: 8px 12px; min-width: max-content; white-space: nowrap; background: transparent; color: #9ca3af; border: none; border-bottom: 2px solid transparent; cursor: pointer; font-weight: 500; font-size: 0.875rem; transition: all 0.3s;">
								Extras
							</button>
							` : ''}
						</div>
						
						<div class="tab-content" style="position: relative; height: clamp(400px, 60vh, 600px); overflow: hidden;">
							<!-- Overview Tab -->
							<div id="content-overview" class="tab-panel active" style="opacity: 1; position: absolute; top: 0; left: 0; right: 0; bottom: 0; overflow-y: auto; transition: opacity 0.3s ease;">
								${resource.description || resource.rich_description ? `
									<div style="margin-bottom: 32px;">
										<h3 style="font-size: clamp(1.1rem, 3vw, 1.5rem); font-weight: 600; color: #ffffff; margin-bottom: 16px; text-align: left;">Description</h3>
										${resource.rich_description ? 
											`<div class="resource-description" style="color: #d1d5db; line-height: 1.8; font-size: 1rem; text-align: left;">${sanitizeHtml(resource.rich_description)}</div>` : 
											`<p class="resource-description" style="color: #d1d5db; line-height: 1.8; font-size: 1rem; text-align: left;">${resource.description}</p>`}
									</div>
								` : ''}
								
								${resource.use_cases ? `
									<div style="margin-bottom: 32px;">
										<h3 style="font-size: clamp(1.1rem, 3vw, 1.5rem); font-weight: 600; color: #ffffff; margin-bottom: 16px; text-align: left;">Use Cases</h3>
										<div style="color: #d1d5db; line-height: 1.8; font-size: 1rem; text-align: left;">${sanitizeHtml(resource.use_cases)}</div>
									</div>
								` : ''}
								
								${resource.installation_notes ? `
									<div style="margin-bottom: 32px;">
										<h3 style="font-size: clamp(1.1rem, 3vw, 1.5rem); font-weight: 600; color: #ffffff; margin-bottom: 16px; text-align: left; display: flex; align-items: center; gap: 8px;">
											<iconify-icon icon="mdi:download-circle" style="color: #10b981;"></iconify-icon>
											Installation Notes
										</h3>
										<div style="background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10b981; padding: 16px; border-radius: 8px;">
											<div style="color: #d1d5db; line-height: 1.6; font-size: 0.95rem; white-space: pre-wrap;">${resource.installation_notes}</div>
										</div>
									</div>
								` : ''}
								
								${resource.tags?.length > 0 ? `
									<div style="margin-bottom: 16px;">
										<h4 style="color: #9ca3af; font-size: 0.9rem; margin-bottom: 8px;">Tags:</h4>
										<div style="display: flex; gap: 8px; flex-wrap: wrap;">
											${resource.tags.map(tag => `
												<span style="background: ${tag.color ? tag.color + '20' : 'rgba(107, 114, 128, 0.2)'}; color: ${tag.color || '#9ca3af'}; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem;">${tag.name}</span>
											`).join('')}
										</div>
									</div>
								` : ''}
								
								<div style="border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 16px; color: #6b7280; font-size: 0.85rem;">
									<div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
										${resource.date_added ? `<span>Added: ${new Date(resource.date_added).toLocaleDateString()}</span>` : ''}
										${resource.last_updated ? `<span>Updated: ${new Date(resource.last_updated).toLocaleDateString()}</span>` : ''}
									</div>
								</div>
							</div>
							
							<!-- Analysis Tab -->
							${(resource.pros?.length > 0 || resource.cons?.length > 0) ? `
								<div id="content-analysis" class="tab-panel" style="opacity: 0; position: absolute; top: 0; left: 0; right: 0; bottom: 0; overflow-y: auto; pointer-events: none; transition: opacity 0.3s ease;">
									<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px;">
										${resource.pros?.length > 0 ? `
											<div>
												<h3 style="color: #22c55e; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; font-size: clamp(1.1rem, 3vw, 1.5rem);">
													<iconify-icon icon="mdi:check-circle" style="font-size: 1.2em;"></iconify-icon>
													Pros
												</h3>
												<ul style="list-style: none; padding: 0; display: grid; gap: 12px;">
													${resource.pros.map(pro => `
														<li style="background: rgba(34, 197, 94, 0.1); border-left: 3px solid #22c55e; padding: 12px 16px; border-radius: 8px; position: relative;">
															<div style="color: #d1d5db; line-height: 1.6;">${pro}</div>
														</li>
													`).join('')}
												</ul>
											</div>
										` : ''}
										
										${resource.cons?.length > 0 ? `
											<div>
												<h3 style="color: #ef4444; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; font-size: clamp(1.1rem, 3vw, 1.5rem);">
													<iconify-icon icon="mdi:close-circle" style="font-size: 1.2em;"></iconify-icon>
													Cons
												</h3>
												<ul style="list-style: none; padding: 0; display: grid; gap: 12px;">
													${resource.cons.map(con => `
														<li style="background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; padding: 12px 16px; border-radius: 8px; position: relative;">
															<div style="color: #d1d5db; line-height: 1.6;">${con}</div>
														</li>
													`).join('')}
												</ul>
											</div>
										` : ''}
									</div>
								</div>
							` : ''}
							
							<!-- Screenshots Tab -->
							${resource.screenshots?.length > 0 ? `
								<div id="content-screenshots" class="tab-panel" style="opacity: 0; position: absolute; top: 0; left: 0; right: 0; bottom: 0; overflow-y: auto; pointer-events: none; transition: opacity 0.3s ease;">
									<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
										${resource.screenshots.map(screenshot => `
											<div style="background: rgba(55, 65, 81, 0.3); border-radius: 12px; overflow: hidden; transition: transform 0.3s; cursor: pointer;" 
												 onclick="openScreenshot('${screenshot.url}')"
												 onmouseover="this.style.transform='scale(1.02)'" 
												 onmouseout="this.style.transform='scale(1)'">
												<img src="${screenshot.thumbnail || screenshot.url}" alt="${screenshot.title}" style="width: 100%; height: 160px; object-fit: cover;" />
												${screenshot.title ? `<div style="padding: 12px;"><h4 style="color: #ffffff; font-weight: 500; font-size: 0.9rem;">${screenshot.title}</h4></div>` : ''}
											</div>
										`).join('')}
									</div>
								</div>
							` : ''}
							
							<!-- Extras Tab -->
							${(resource.tutorial_links?.length > 0 || resource.alternative_tools?.length > 0) ? `
								<div id="content-extras" class="tab-panel" style="opacity: 0; position: absolute; top: 0; left: 0; right: 0; bottom: 0; overflow-y: auto; pointer-events: none; transition: opacity 0.3s ease;">
									${resource.tutorial_links?.length > 0 ? `
										<div style="margin-bottom: 32px;">
											<h3 style="font-size: clamp(1.1rem, 3vw, 1.5rem); font-weight: 600; color: #ffffff; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
												<iconify-icon icon="mdi:school" style="color: #8b5cf6;"></iconify-icon>
												Tutorial Links
											</h3>
											<div style="display: grid; gap: 12px;">
												${resource.tutorial_links.map(link => `
													<a href="${link.url || link}" target="_blank" style="display: flex; items-center; gap: 12px; padding: 12px; background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 8px; text-decoration: none; transition: all 0.2s;"
													   onmouseover="this.style.background='rgba(139, 92, 246, 0.2)'" onmouseout="this.style.background='rgba(139, 92, 246, 0.1)'">
														<iconify-icon icon="mdi:external-link" style="color: #8b5cf6; font-size: 1.2em;"></iconify-icon>
														<div>
															<div style="color: #ffffff; font-weight: 500;">${link.title || link}</div>
															${link.description ? `<div style="color: #9ca3af; font-size: 0.85rem; margin-top: 2px;">${link.description}</div>` : ''}
														</div>
													</a>
												`).join('')}
											</div>
										</div>
									` : ''}
									
									${resource.alternative_tools?.length > 0 ? `
										<div>
											<h3 style="font-size: clamp(1.1rem, 3vw, 1.5rem); font-weight: 600; color: #ffffff; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
												<iconify-icon icon="mdi:swap-horizontal" style="color: #f59e0b;"></iconify-icon>
												Alternatives
											</h3>
											<div style="display: flex; flex-wrap: wrap; gap: 8px;">
												${resource.alternative_tools.map(alt => `
													<span style="background: rgba(245, 158, 11, 0.2); color: #f59e0b; padding: 8px 12px; border-radius: 16px; font-size: 0.9rem; font-weight: 500;">${alt}</span>
												`).join('')}
											</div>
										</div>
									` : ''}
								</div>
							` : ''}
						</div>
					</div>
				</div>
			</div>
		`;
	}
	
	function initializeModalComponents() {
		// No complex components to initialize
	}
	
	// Global functions for the modal
	window.switchResourceTab = function(tabName) {
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
	:global(.resource-modal-popup) {
		border-radius: 16px !important;
	}
	
	:global(.resource-modal-container) {
		display: grid;
		grid-template-columns: 350px 1fr;
		gap: 32px;
		text-align: left;
	}
	
	:global(.resource-info-section) {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}
	
	:global(.resource-content-section) {
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
		:global(.resource-modal-container) {
			grid-template-columns: 1fr;
			gap: 24px;
		}
		
		:global(.resource-info-section) {
			flex-direction: row;
			align-items: flex-start;
		}
		
		:global(.resource-artwork) {
			flex-shrink: 0;
			width: 120px;
		}
		
		:global(.resource-details) {
			flex: 1;
			margin-left: 16px;
		}
	}
</style>