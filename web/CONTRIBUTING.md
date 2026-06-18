# Contributing to VeloxEditing Frontend

Thank you for your interest in contributing to VeloxEditing! This document provides guidelines and instructions for contributing.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

This project follows a standard code of conduct. Please be respectful and constructive in all interactions.

## Getting Started

1. **Fork the repository** (if applicable)
2. **Clone your fork**:
   ```bash
   git clone <repository-url>
   cd VeloxEditing/refactored/frontend_standalone/web
   ```
3. **Install dependencies**:
   ```bash
   npm install
   cd dark_editor && npm install
   ```
4. **Create a branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Branch Naming

Use descriptive branch names with prefixes:

- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates
- `test/` - Test additions/updates
- `chore/` - Maintenance tasks

Examples:
- `feature/youtube-upload-progress`
- `fix/canvas-zoom-bug`
- `refactor/api-client-types`

### Running Locally

```bash
# Main app
npm run dev

# Dark editor (separate terminal)
cd dark_editor
npm run dev
```

## Code Style

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Avoid `any` type - use proper typing
- Use interfaces for object shapes
- Use type aliases for unions and complex types

```typescript
// ❌ Bad
function processData(data: any) { ... }

// ✅ Good
interface UserData {
  id: string;
  name: string;
  email: string;
}

function processData(data: UserData) { ... }
```

### React Components

- Use functional components with hooks
- Use TypeScript for props
- Keep components small and focused
- Extract reusable logic into custom hooks

```typescript
// ❌ Bad
export const MyComponent = (props) => {
  return <div>{props.name}</div>;
};

// ✅ Good
interface MyComponentProps {
  name: string;
  onClick?: () => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({ name, onClick }) => {
  return <div onClick={onClick}>{name}</div>;
};
```

### File Organization

- One component per file
- Use index files for exports
- Group related files in folders
- Keep utilities in `lib/` or `utils/`

### Naming Conventions

- **Files**: PascalCase for components (`MyComponent.tsx`), camelCase for utilities (`myUtility.ts`)
- **Components**: PascalCase (`MyComponent`)
- **Functions**: camelCase (`myFunction`)
- **Constants**: UPPER_SNAKE_CASE (`MY_CONSTANT`)
- **Types/Interfaces**: PascalCase (`MyInterface`)

### Imports

Use path aliases for cleaner imports:

```typescript
// ❌ Bad
import { Button } from '../../../components/ui/button';
import { fetchJSON } from '../../lib/api/core';

// ✅ Good
import { Button } from '@/components/ui';
import { fetchJSON } from '@/lib/api/core';
```

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test additions/updates
- `chore`: Maintenance tasks

### Examples

```bash
feat(youtube): add upload progress indicator
fix(canvas): resolve zoom scaling issue
docs(readme): update installation instructions
refactor(api): consolidate type definitions
test(hooks): add useApi hook tests
```

## Pull Request Process

1. **Update your branch** with the latest main:
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Run tests**:
   ```bash
   npm run test
   npm run lint
   ```

3. **Create a Pull Request** with:
   - Clear title following commit conventions
   - Description of changes
   - Screenshots for UI changes
   - Related issues

4. **Wait for review** and address feedback

5. **Merge** after approval

## Testing

### Unit Tests

Write tests for:
- Custom hooks
- Utility functions
- Complex components
- API clients

```typescript
// Example: hooks/useApi.test.ts
import { renderHook, act } from '@testing-library/react';
import { useApi } from './useApi';

describe('useApi', () => {
  it('should handle loading state', async () => {
    const { result } = renderHook(() => useApi(mockFetcher));
    
    expect(result.current.loading).toBe(false);
    
    await act(async () => {
      await result.current.execute();
    });
    
    expect(result.current.loading).toBe(false);
  });
});
```

### E2E Tests

Add E2E tests for critical user flows:

```typescript
// Example: e2e/youtube-upload.spec.ts
import { test, expect } from '@playwright/test';

test('should upload video to YouTube', async ({ page }) => {
  await page.goto('/youtube/upload');
  await page.fill('[data-testid="title"]', 'Test Video');
  await page.click('[data-testid="upload-button"]');
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
});
```

## Documentation

### Code Documentation

Add JSDoc comments for:
- Public APIs
- Complex functions
- Custom hooks
- Type definitions

```typescript
/**
 * Fetches data from the API with automatic retry logic.
 * 
 * @param endpoint - The API endpoint to fetch from
 * @param options - Request options
 * @returns Promise resolving to the response data
 * @throws ApiError if the request fails after retries
 * 
 * @example
 * ```typescript
 * const data = await fetchJSON<Job[]>('/api/v1/jobs');
 * ```
 */
export async function fetchJSON<T>(
  endpoint: string,
  options?: RequestOptions
): Promise<T> { ... }
```

### README Updates

Update README.md when:
- Adding new features
- Changing architecture
- Updating dependencies
- Modifying build process

## Questions?

If you have questions about contributing, please reach out to the team or open an issue for discussion.

Thank you for contributing! 🎉