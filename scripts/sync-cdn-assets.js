#!/usr/bin/env node

/**
 * Sync CDN assets (videos, audio) to DigitalOcean Spaces
 * Run this before git push when you've changed files in static/videos or static/audio
 *
 * Usage: node scripts/sync-cdn-assets.js
 *        npm run cdn:sync
 *
 * Credentials: Set S3_ACCESS_KEY/S3_SECRET_KEY in environment or .env.local
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname, resolve } from 'path';
import {
	S3Client,
	PutObjectCommand,
	HeadObjectCommand
} from '@aws-sdk/client-s3';

const BUCKET = 'kjo';
const REGION = 'nyc3';
const ENDPOINT = `https://${REGION}.digitaloceanspaces.com`;
const CDN_URL = `https://${BUCKET}.${REGION}.cdn.digitaloceanspaces.com`;

const CONTENT_TYPES = {
	'.mp4': 'video/mp4',
	'.webm': 'video/webm',
	'.mp3': 'audio/mpeg',
	'.wav': 'audio/wav',
	'.ogg': 'audio/ogg',
	'.flac': 'audio/flac',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.gif': 'image/gif',
	'.svg': 'image/svg+xml'
};

const IGNORED_FILES = ['.DS_Store', '.gitkeep', 'Thumbs.db'];

// Colors for terminal output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const NC = '\x1b[0m';

function loadCredentials() {
	let accessKey = process.env.S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID;
	let secretKey = process.env.S3_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY;

	if (!accessKey || !secretKey) {
		const envLocalPath = resolve(process.cwd(), '.env.local');
		if (existsSync(envLocalPath)) {
			const content = readFileSync(envLocalPath, 'utf-8');
			for (const line of content.split('\n')) {
				const trimmed = line.trim();
				if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
				const [key, ...valueParts] = trimmed.split('=');
				const value = valueParts.join('=');
				if (key === 'S3_ACCESS_KEY' && !accessKey) accessKey = value;
				if (key === 'S3_SECRET_KEY' && !secretKey) secretKey = value;
			}
		}
	}

	if (!accessKey || !secretKey) {
		console.error(`${RED}Error: S3 credentials not found${NC}`);
		console.error('Set S3_ACCESS_KEY and S3_SECRET_KEY in environment or .env.local');
		process.exit(1);
	}

	return { accessKey, secretKey };
}

function walkDir(dir) {
	const files = [];
	if (!existsSync(dir)) return files;

	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (IGNORED_FILES.includes(entry.name)) continue;
		const fullPath = join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...walkDir(fullPath));
		} else {
			files.push(fullPath);
		}
	}
	return files;
}

async function getRemoteSize(client, key) {
	try {
		const response = await client.send(new HeadObjectCommand({
			Bucket: BUCKET,
			Key: key
		}));
		return response.ContentLength;
	} catch {
		return null;
	}
}

async function syncDirectory(client, localDir, s3Prefix) {
	const files = walkDir(localDir);

	if (files.length === 0) {
		console.log(`${YELLOW}No files to sync in ${localDir}${NC}`);
		return { uploaded: 0, skipped: 0 };
	}

	console.log(`${GREEN}Syncing ${localDir} → s3://${BUCKET}/${s3Prefix}${NC}`);

	let uploaded = 0;
	let skipped = 0;

	for (const filePath of files) {
		const relativePath = filePath.replace(localDir + '/', '');
		const s3Key = `${s3Prefix}${relativePath}`;
		const localSize = statSync(filePath).size;
		const ext = extname(filePath).toLowerCase();
		const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';

		// Check if file already exists with same size
		const remoteSize = await getRemoteSize(client, s3Key);
		if (remoteSize === localSize) {
			console.log(`  ${CYAN}Skip${NC} ${s3Key} (unchanged)`);
			skipped++;
			continue;
		}

		const fileContent = readFileSync(filePath);
		await client.send(new PutObjectCommand({
			Bucket: BUCKET,
			Key: s3Key,
			Body: fileContent,
			ContentType: contentType,
			ACL: 'public-read'
		}));

		const sizeMB = (localSize / 1024 / 1024).toFixed(1);
		console.log(`  ${GREEN}Upload${NC} ${s3Key} (${sizeMB} MB)`);
		uploaded++;
	}

	return { uploaded, skipped };
}

async function main() {
	console.log(`${YELLOW}Syncing CDN assets to DigitalOcean Spaces...${NC}`);
	console.log(`Bucket: ${BUCKET}`);
	console.log(`Endpoint: ${ENDPOINT}`);
	console.log('');

	const { accessKey, secretKey } = loadCredentials();

	const client = new S3Client({
		region: REGION,
		endpoint: ENDPOINT,
		credentials: {
			accessKeyId: accessKey,
			secretAccessKey: secretKey
		},
		forcePathStyle: false
	});

	let totalUploaded = 0;
	let totalSkipped = 0;

	// Sync videos
	const videos = await syncDirectory(client, 'static/videos', 'videos/');
	totalUploaded += videos.uploaded;
	totalSkipped += videos.skipped;

	console.log('');

	// Sync audio
	const audio = await syncDirectory(client, 'static/audio', 'audio/');
	totalUploaded += audio.uploaded;
	totalSkipped += audio.skipped;

	console.log('');
	console.log(`${GREEN}CDN sync complete!${NC}`);
	console.log(`  Uploaded: ${totalUploaded} files`);
	console.log(`  Skipped:  ${totalSkipped} files (unchanged)`);

	if (totalUploaded > 0) {
		console.log(`\n  Videos: ${CDN_URL}/videos/`);
		console.log(`  Audio:  ${CDN_URL}/audio/`);
	}
}

main().catch((err) => {
	console.error(`${RED}Error: ${err.message}${NC}`);
	process.exit(1);
});
