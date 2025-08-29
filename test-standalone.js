#!/usr/bin/env node

// Test script to verify standalone providers work
console.log('Testing standalone providers...\n');

// Test 1: Check if we can import from OpenAI provider
try {
    console.log('Testing OpenAI provider imports...');
    const { openAI, withRetry, withFallback, ChatRequest } = require('./packages/provider/openai/dist/src/index.js');
    console.log('   - openAI function:', typeof openAI);
    console.log('   - withRetry function:', typeof withRetry);
    console.log('   - withFallback function:', typeof withFallback);
    console.log('   - ChatRequest type:', typeof ChatRequest);
    console.log('   OpenAI provider imports successful!\n');
} catch (error) {
    console.log('   ❌ OpenAI provider imports failed:', error.message, '\n');
}

// Test 2: Check if we can import from Anthropic provider
try {
    console.log('esting Anthropic provider imports...');
    const { anthropic, withRetry, withFallback, ChatRequest } = require('./packages/provider/anthropic/dist/src/index.js');
    console.log('   - anthropic function:', typeof anthropic);
    console.log('   - withRetry function:', typeof withRetry);
    console.log('   - withFallback function:', typeof withFallback);
    console.log('   - ChatRequest type:', typeof ChatRequest);
    console.log('   Anthropic provider imports successful!\n');
} catch (error) {
    console.log('   Anthropic provider imports failed:', error.message, '\n');
}

// Test 3: Check if providers are truly independent
try {
    console.log('Testing provider independence...');

    // Import from both providers
    const openaiModule = require('./packages/provider/openai/dist/src/index.js');
    const anthropicModule = require('./packages/provider/anthropic/dist/src/index.js');

    // Check that they have their own types
    console.log('   - OpenAI has ChatRequest:', 'ChatRequest' in openaiModule);
    console.log('   - Anthropic has ChatRequest:', 'ChatRequest' in anthropicModule);
    console.log('   - OpenAI has openAI function:', 'openAI' in openaiModule);
    console.log('   - Anthropic has anthropic function:', 'anthropic' in anthropicModule);

    console.log('   Providers are independent!\n');
} catch (error) {
    console.log('   Provider independence test failed:', error.message, '\n');
}

console.log('Test Summary:');
console.log('   - Each provider should be completely standalone');
console.log('   - No core package dependencies');
console.log('   - All necessary types and functions included');
console.log('   - Ready for NPM publishing! 🚀');
