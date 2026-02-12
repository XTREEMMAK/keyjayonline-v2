/**
 * Tech Section API Endpoint
 * Returns all data needed for the Tech section
 *
 * TODO: Remove TEMP_DATA and uncomment Directus fetching once collections are created
 */

import { json } from '@sveltejs/kit';
// import { getTechPageHeader } from '$lib/api/content/pages.js';
// import { getTechProjects, getTechStack } from '$lib/api/content/tech.js';

// ── Temporary mock data for layout preview ──
const TEMP_DATA = {
	techPageHeader: null,
	projects: [
		{
			id: 1,
			name: 'KeyJay Online v2',
			slug: 'keyjay-online-v2',
			tagline: 'Personal portfolio & creative hub built with SvelteKit, CMS-driven content, and CDN asset delivery.',
			description: '<p>A from-scratch rebuild of my personal website using SvelteKit and Svelte 5. Designed as a single-page application with hash-based navigation, backed by Directus CMS and DigitalOcean Spaces CDN.</p><p>Features include a persistent music player, gallery viewer with zoom/pan, production showcases with embedded media, and a neumorphic design system. Built with the help of AI-assisted development tools.</p>',
			project_url: 'https://keyjayonline.com',
			repo_url: null,
			cover_image: null,
			tech_stack: ['SvelteKit', 'Svelte 5', 'TailwindCSS 4', 'Directus', 'Node.js', 'Docker', 'DigitalOcean'],
			project_status: 'active',
			featured: true,
			sort: 1,
			date_started: '2024-06-01'
		},
		{
			id: 2,
			name: 'Medical Supply Solutions — Network Overhaul',
			slug: 'medical-supply-network',
			tagline: 'Complete network infrastructure restructure for a medical supply company.',
			description: '<p>Led the full network redesign for a medical supply company, including VLAN segmentation, VPN configuration for remote access, Windows Server domain setup with Active Directory and Group Policy, and QuickBooks server migration.</p><p>Project involved physical infrastructure work (cabling, patch panels, rack setup) alongside logical network architecture and security hardening.</p>',
			project_url: null,
			repo_url: null,
			cover_image: null,
			tech_stack: ['Proxmox', 'VLANs', 'VPN', 'Windows Server', 'Active Directory', 'Structured Cabling'],
			project_status: 'maintained',
			featured: false,
			sort: 2,
			date_started: '2023-01-01'
		},
		{
			id: 3,
			name: 'Homelab Environment',
			slug: 'homelab-environment',
			tagline: 'Self-hosted infrastructure for development, media, and services.',
			description: '<p>A continuously evolving home lab environment built on Proxmox VE, running various Docker containers and VMs for development servers, media services, network monitoring, and personal projects.</p><p>Includes WireGuard VPN for remote access, Nginx reverse proxy, automated backups, and monitoring dashboards.</p>',
			project_url: null,
			repo_url: null,
			cover_image: null,
			tech_stack: ['Proxmox VE', 'Docker', 'Ubuntu Server', 'Nginx', 'WireGuard'],
			project_status: 'active',
			featured: false,
			sort: 3,
			date_started: '2022-01-01'
		},
		{
			id: 4,
			name: 'J2IT',
			slug: 'j2it',
			tagline: 'Micro MSP offering IT support, consulting, and infrastructure services.',
			description: '<p>A small IT services venture providing desktop support, network setup, server configuration, and general technology consulting for small businesses and individuals.</p>',
			project_url: 'https://j2it.us',
			repo_url: null,
			cover_image: null,
			tech_stack: ['IT Support', 'Networking', 'Windows', 'Linux'],
			project_status: 'in_development',
			featured: false,
			sort: 4,
			date_started: '2024-01-01'
		},
		{
			id: 5,
			name: 'Client Web Projects',
			slug: 'client-web-projects',
			tagline: 'Various portfolio and business websites built for clients over the years.',
			description: '<p>A collection of web projects completed for clients ranging from small businesses to creative professionals. Technologies have evolved over time from WordPress and PHP to modern SvelteKit builds.</p>',
			project_url: null,
			repo_url: null,
			cover_image: null,
			tech_stack: ['SvelteKit', 'WordPress', 'PHP', 'HTML/CSS'],
			project_status: 'maintained',
			featured: false,
			sort: 5,
			date_started: '2018-01-01'
		}
		// TODO: Add Game Development projects (G.G Appz Suite, etc.) and Music Tools projects when ready
	],
	techStack: [
		// Systems & Networking
		{ id: 1, name: 'Active Directory / Group Policy', description: 'Domain management, user provisioning, and policy enforcement', category: 'systems_networking', icon: 'mdi:microsoft-windows', url: null, proficiency: 4, featured: true, sort: 1 },
		{ id: 2, name: 'VLANs & Network Segmentation', description: 'Enterprise network design and traffic isolation', category: 'systems_networking', icon: 'mdi:lan', url: null, proficiency: 4, featured: false, sort: 2 },
		{ id: 3, name: 'VPN Configuration', description: 'Site-to-site and remote access (OpenVPN, WireGuard)', category: 'systems_networking', icon: 'mdi:vpn', url: null, proficiency: 4, featured: false, sort: 3 },
		{ id: 4, name: 'TCP/IP / DNS / DHCP', description: 'Core networking fundamentals', category: 'systems_networking', icon: 'mdi:ip-network', url: null, proficiency: 4, featured: false, sort: 4 },
		{ id: 5, name: 'Windows Server', description: 'AD, file servers, print servers, and domain services', category: 'systems_networking', icon: 'mdi:microsoft-windows', url: null, proficiency: 4, featured: false, sort: 5 },
		{ id: 6, name: 'Red Hat / CentOS', description: 'Enterprise Linux server administration', category: 'systems_networking', icon: 'simple-icons:redhat', url: null, proficiency: 3, featured: false, sort: 6 },

		// Infrastructure & Virtualization
		{ id: 10, name: 'Proxmox VE', description: 'Homelab and client VM/container hosting', category: 'infrastructure', icon: 'simple-icons:proxmox', url: 'https://www.proxmox.com', proficiency: 4, featured: true, sort: 1 },
		{ id: 11, name: 'Docker', description: 'Containerization for services and dev environments', category: 'infrastructure', icon: 'simple-icons:docker', url: null, proficiency: 4, featured: true, sort: 2 },
		{ id: 12, name: 'Ubuntu Server', description: 'Primary Linux for servers and VMs', category: 'infrastructure', icon: 'simple-icons:ubuntu', url: null, proficiency: 4, featured: false, sort: 3 },
		{ id: 13, name: 'DigitalOcean', description: 'Cloud hosting and S3-compatible CDN', category: 'infrastructure', icon: 'simple-icons:digitalocean', url: null, proficiency: 3, featured: false, sort: 4 },

		// Web Development
		{ id: 20, name: 'SvelteKit / Svelte 5', description: 'Current primary web framework — powers this site', category: 'web_development', icon: 'simple-icons:svelte', url: 'https://kit.svelte.dev', proficiency: 4, featured: true, sort: 1 },
		{ id: 21, name: 'TailwindCSS', description: 'Utility-first CSS framework', category: 'web_development', icon: 'simple-icons:tailwindcss', url: 'https://tailwindcss.com', proficiency: 4, featured: false, sort: 2 },
		{ id: 22, name: 'Node.js', description: 'Server-side runtime and tooling', category: 'web_development', icon: 'simple-icons:nodedotjs', url: null, proficiency: 3, featured: false, sort: 3 },
		{ id: 23, name: 'React', description: 'Used for some client projects', category: 'web_development', icon: 'simple-icons:react', url: null, proficiency: 2, featured: false, sort: 4 },
		{ id: 24, name: 'WordPress', description: 'Legacy client sites and content management', category: 'web_development', icon: 'simple-icons:wordpress', url: null, proficiency: 3, featured: false, sort: 5 },
		{ id: 25, name: 'HTML / CSS', description: 'Foundational web technologies', category: 'web_development', icon: 'mdi:language-html5', url: null, proficiency: 4, featured: false, sort: 6 },

		// Languages & Scripting
		{ id: 30, name: 'JavaScript', description: 'Primary scripting and web language', category: 'languages', icon: 'simple-icons:javascript', url: null, proficiency: 4, featured: true, sort: 1 },
		{ id: 31, name: 'Bash', description: 'Sysadmin automation and shell scripting', category: 'languages', icon: 'simple-icons:gnubash', url: null, proficiency: 3, featured: false, sort: 2 },
		{ id: 32, name: 'Python', description: 'Automation and scripting', category: 'languages', icon: 'simple-icons:python', url: null, proficiency: 2, featured: false, sort: 3 },
		{ id: 33, name: 'PHP', description: 'Legacy web projects', category: 'languages', icon: 'simple-icons:php', url: null, proficiency: 2, featured: false, sort: 4 },

		// AI & Automation
		{ id: 40, name: 'Claude Code', description: 'AI-assisted development workflow', category: 'ai_automation', icon: 'simple-icons:anthropic', url: null, proficiency: 4, featured: true, sort: 1 },
		{ id: 41, name: 'GitHub Actions', description: 'CI/CD pipelines for builds and deployments', category: 'ai_automation', icon: 'simple-icons:githubactions', url: null, proficiency: 3, featured: false, sort: 2 },
		{ id: 42, name: 'Home Assistant', description: 'Home automation platform and routines', category: 'ai_automation', icon: 'simple-icons:homeassistant', url: null, proficiency: 3, featured: false, sort: 3 },

		// Hardware & Home Automation
		{ id: 50, name: 'PC Building', description: 'Custom desktops and workstations', category: 'hardware', icon: 'mdi:desktop-tower', url: null, proficiency: 5, featured: true, sort: 1 },
		{ id: 51, name: 'Server Builds', description: 'Rack and tower server assembly and configuration', category: 'hardware', icon: 'mdi:server', url: null, proficiency: 4, featured: false, sort: 2 },
		{ id: 52, name: 'Smart Home Setup', description: 'Device integration, routines, and automation', category: 'hardware', icon: 'mdi:home-automation', url: null, proficiency: 3, featured: false, sort: 3 },
		{ id: 53, name: 'Structured Cabling', description: 'Cable management, patch panels, and wiring', category: 'hardware', icon: 'mdi:ethernet-cable', url: null, proficiency: 4, featured: false, sort: 4 },

		// Platforms & Services
		{ id: 60, name: 'Directus', description: 'Headless CMS powering site content', category: 'services', icon: 'simple-icons:directus', url: 'https://directus.io', proficiency: 3, featured: false, sort: 1 },
		{ id: 61, name: 'Cloudflare', description: 'DNS, CDN caching, and security', category: 'services', icon: 'simple-icons:cloudflare', url: null, proficiency: 3, featured: false, sort: 2 },
		{ id: 62, name: 'Git / GitHub', description: 'Version control and collaboration', category: 'services', icon: 'simple-icons:github', url: null, proficiency: 4, featured: false, sort: 3 },
		{ id: 63, name: 'Nginx', description: 'Reverse proxy and web server', category: 'services', icon: 'simple-icons:nginx', url: null, proficiency: 3, featured: false, sort: 4 }
	],
	// Future: lab photos, video embeds, write-ups
	showcase: [
		{
			id: 1,
			title: 'Homelab Rack Setup',
			description: 'Custom server rack with Proxmox nodes, networking gear, and cable management.',
			type: 'photo',
			image: null,
			video_url: null
		},
		{
			id: 2,
			title: 'Network Overhaul — Before & After',
			description: 'Server room restructure for a medical supply company. Patch panels, VLAN configuration, and clean cable runs.',
			type: 'photo',
			image: null,
			video_url: null
		},
		{
			id: 3,
			title: 'PC Build — Gaming/Workstation Hybrid',
			description: 'Custom watercooled build with Ryzen 9, dual-purpose for gaming and development work.',
			type: 'photo',
			image: null,
			video_url: null
		}
	]
};

export async function GET() {
	// Return temporary mock data for layout preview
	return json(TEMP_DATA);

	// ── Uncomment below and delete TEMP_DATA when Directus collections are ready ──
	// const safePromise = (promise, name = 'Promise') =>
	// 	promise.catch((err) => {
	// 		console.error(`${name} failed:`, err);
	// 		return null;
	// 	});
	//
	// try {
	// 	const [techPageHeader, projects, techStack] = await Promise.all([
	// 		safePromise(getTechPageHeader(), 'getTechPageHeader'),
	// 		safePromise(getTechProjects(), 'getTechProjects'),
	// 		safePromise(getTechStack(), 'getTechStack')
	// 	]);
	//
	// 	return json({
	// 		techPageHeader: techPageHeader || null,
	// 		projects: projects || [],
	// 		techStack: techStack || []
	// 	});
	// } catch (error) {
	// 	console.error('Error loading tech section data:', error);
	//
	// 	return json(
	// 		{
	// 			error: 'Failed to load tech section data',
	// 			techPageHeader: null,
	// 			projects: [],
	// 			techStack: []
	// 		},
	// 		{ status: 500 }
	// 	);
	// }
}
