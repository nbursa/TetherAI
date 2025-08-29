#!/usr/bin/env node

import { copyFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Shared files to copy to each provider
const SHARED_FILES = [
    'types.ts',
    'sse.ts',
    'middleware.ts'
];

// Provider packages to copy shared files to
const PROVIDER_PACKAGES = [
    'openai',
    'anthropic',
    'mistral',
    'grok',
    'local',
    // Add more providers here
    // 'grok',
    // 'local'
];

async function copySharedFiles() {
    console.log('Copying shared files to provider packages...');

    for (const provider of PROVIDER_PACKAGES) {
        const providerDir = join(rootDir, 'packages', 'provider', provider, 'src');

        try {
            await mkdir(providerDir, { recursive: true });

            for (const file of SHARED_FILES) {
                if ((provider === 'mistral' || provider === 'grok' || provider === 'local') && file === 'types.ts') {
                    console.log(`Skipping ${file} for ${provider} (has custom types)`);
                    continue;
                }

                const sourcePath = join(rootDir, 'packages', 'shared', file);
                const targetPath = join(providerDir, file);

                try {
                    await copyFile(sourcePath, targetPath);
                    console.log(`Copied ${file} to ${provider}`);
                } catch (error) {
                    console.error(`Failed to copy ${file} to ${provider}:`, error.message);
                }
            }
        } catch (error) {
            console.error(`Failed to process ${provider}:`, error.message);
        }
    }

    console.log('Shared files copied successfully!');
}

async function main() {
    try {
        await copySharedFiles();
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

main();
