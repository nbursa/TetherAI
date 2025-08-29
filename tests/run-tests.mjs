#!/usr/bin/env node

/**
 * Simple test runner for TetherAI tests
 * This script runs basic validation without external dependencies
 */

import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function validateTests() {
    console.log('🧪 Validating TetherAI Test Suite...\n');

    try {
        // Check test structure
        const testDir = join(__dirname);
        const testFiles = await readdir(testDir, { recursive: true });

        console.log('✅ Test directory structure:');
        testFiles
            .filter(file => typeof file === 'string' && file.endsWith('.ts'))
            .forEach(file => {
                console.log(`   📄 ${file}`);
            });

        // Check types file
        const typesFile = join(__dirname, 'types', 'test-types.ts');
        const typesContent = await readFile(typesFile, 'utf-8');

        if (typesContent.includes('interface MockProvider')) {
            console.log('\n✅ Test types file is valid');
        } else {
            console.log('\n❌ Test types file is missing required interfaces');
        }

        // Check for any remaining 'any' types in test files
        let anyTypeCount = 0;
        for (const file of testFiles) {
            if (typeof file === 'string' && file.endsWith('.ts') && !file.includes('test-types.ts')) {
                const filePath = join(testDir, file);
                const content = await readFile(filePath, 'utf-8');
                const anyMatches = content.match(/:\s*any\b/g);
                if (anyMatches) {
                    anyTypeCount += anyMatches.length;
                    console.log(`   ⚠️  ${file}: ${anyMatches.length} 'any' types found`);
                }
            }
        }

        if (anyTypeCount === 0) {
            console.log('\n✅ No remaining "any" types found in test files');
        } else {
            console.log(`\n⚠️  Total "any" types found: ${anyTypeCount}`);
        }

        console.log('\n🎉 Test validation complete!');
        console.log('\nTo run tests with Vitest:');
        console.log('  pnpm run test:run');
        console.log('\nTo run tests in watch mode:');
        console.log('  pnpm run test');

    } catch (error) {
        console.error('❌ Test validation failed:', error.message);
        process.exit(1);
    }
}

validateTests();
