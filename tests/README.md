# TetherAI Tests

This directory contains all tests for the TetherAI project, organized by type and scope.

## Test Structure

```text
tests/
├── unit/                    # Unit tests for individual components
│   ├── providers/          # Provider-specific tests
│   ├── middleware/         # Middleware tests
│   └── utils/              # Utility function tests
├── integration/            # Integration tests between components
├── e2e/                    # End-to-end tests
├── fixtures/               # Test data and mocks
├── setup.ts                # Global test configuration
└── vitest.config.ts        # Vitest configuration
```

## Running Tests

### **Development Mode (Watch)**

```bash
pnpm run test
```

### **Single Run**

```bash
pnpm run test:run
```

### **With Coverage**

```bash
pnpm run test:coverage
```

### **UI Mode**

```bash
pnpm run test:ui
```

## Test Types

### **Unit Tests** (`tests/unit/`)

- **Purpose**: Test individual functions and components in isolation
- **Scope**: Single file, function, or class
- **Speed**: Fast execution
- **Examples**: SSE parsing, middleware functions, utility helpers

### **Integration Tests** (`tests/integration/`)

- **Purpose**: Test interactions between components
- **Scope**: Multiple components working together
- **Speed**: Medium execution
- **Examples**: Provider imports, build process validation

### **End-to-End Tests** (`tests/e2e/`)

- **Purpose**: Test complete user workflows
- **Scope**: Full application functionality
- **Speed**: Slower execution
- **Examples**: Standalone provider testing, example applications

## Writing Tests

### **Test File Naming**

- Use `.test.ts` extension
- Name files descriptively: `openai-provider.test.ts`
- Group related tests in subdirectories

### **Test Structure**

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Component Name', () => {
  it('should do something specific', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = someFunction(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

### **Mocking**

- Use `vi.fn()` for function mocks
- Use `vi.mock()` for module mocks
- Create reusable mock data in `tests/fixtures/`

## Test Configuration

### **Environment Variables**

- Tests run with `NODE_ENV=test`
- Mock API keys are automatically set
- No external API calls during testing

### **Coverage**

- V8 coverage provider
- HTML, JSON, and text reports
- Excludes test files and build artifacts

### **Aliases**

- `@tetherai/openai` → `packages/provider/openai/src`
- `@tetherai/anthropic` → `packages/provider/anthropic/src`

## Test Coverage Goals

- **Unit Tests**: 90%+ coverage
- **Integration Tests**: 80%+ coverage
- **E2E Tests**: Critical paths covered

## Common Issues

### **Node.js Version**

- Tests require Node.js 18+ for ES module support
- Use `.nvmrc` to ensure correct version

### **Import Paths**

- Use relative paths from test files
- Use aliases defined in `vitest.config.ts`

### **Async Tests**

- Always use `async/await` for asynchronous operations
- Use `vi.waitFor()` for time-based operations

## Continuous Integration

Tests run automatically in CI:

- **Unit tests** on every commit
- **Integration tests** on pull requests
- **Full test suite** before merging to main

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://vitest.dev/guide/best-practices.html)
- [Mocking Guide](https://vitest.dev/guide/mocking.html)
