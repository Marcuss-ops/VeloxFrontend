# VeloxEditing Frontend

A modern, feature-rich video editing and YouTube management platform built with React, TypeScript, and Next.js.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Go backend server (for full functionality)

### Installation

```bash
# Install dependencies for main app
npm install

# Install dependencies for dark editor
cd dark_editor
npm install
```

### Development

```bash
# Start main app (Vite)
npm run dev

# Start dark editor (Next.js) - open it through `/dark_editor` on the main app
cd dark_editor
npm run dev
```

### Building

```bash
# Build main app
npm run build

# Build dark editor
cd dark_editor
npm run build
```

## 📁 Project Structure

```
web/
├── src/                          # Main frontend application (Vite + React)
│   ├── app/                      # App shell, routing, and providers
│   │   ├── providers/            # Context providers (Auth, I18n, ErrorBoundary)
│   │   ├── shell/                # Layout components (Sidebar, Header)
│   │   ├── views/                # Page components
│   │   └── router.tsx            # Centralized routing configuration
│   ├── components/               # Feature components
│   │   ├── Analytics/            # Analytics dashboard
│   │   ├── Ansible/              # Ansible integration
│   │   ├── Drive/                # Google Drive integration
│   │   ├── Finance/              # Financial tracking
│   │   ├── Script/               # Script generation & editing
│   │   ├── Workers/              # Worker management
│   │   ├── YouTubeManager/       # YouTube management
│   │   └── ui/                   # Reusable UI components
│   ├── hooks/                    # Custom React hooks
│   │   ├── useApi.ts             # API call hooks
│   │   ├── useDebounce.ts        # Debounce utilities
│   │   ├── useLocalStorage.ts    # Storage hooks
│   │   └── useScriptGenerator.ts # Script generation hook
│   ├── lib/                      # Utility libraries
│   │   ├── api/                  # API client and endpoints
│   │   │   ├── core.ts           # Core API client with retry logic
│   │   │   ├── jobsApi.ts        # Jobs API
│   │   │   ├── youtubeApi.ts     # YouTube API
│   │   │   └── ...               # Other API modules
│   │   └── utils/                # Utility functions
│   ├── types/                    # TypeScript type definitions
│   │   ├── api.ts                # API types (centralized)
│   │   └── scriptGenerator.ts    # Script generator types
│   └── utils/                    # General utilities
├── dark_editor/                  # Video editor (Next.js + Konva)
│   ├── app/                      # Next.js app directory
│   │   ├── api/                  # API routes (proxy to Go backend)
│   │   ├── editor/               # Editor pages
│   │   └── layout.tsx            # Root layout
│   ├── components/               # Editor components
│   │   ├── editor/               # Canvas, toolbar, panels
│   │   └── ui/                   # UI components
│   ├── stores/                   # Zustand state stores
│   │   ├── editorStore.ts        # Canvas state management
│   │   ├── projectStore.ts       # Project management
│   │   └── ...                   # Other stores
│   ├── hooks/                    # Editor-specific hooks
│   ├── lib/                      # Editor utilities
│   │   ├── imageFilters.ts       # Image filter implementations
│   │   ├── layerCompositor.ts    # Layer composition
│   ├── wasm/                 # WebAssembly filters
├── data/                         # Local data storage

│   ├── velox.db                  # SQLite database
│   └── jobs/                     # Job data
└── docs/                         # Documentation
```

## 🏗️ Architecture

### Frontend Stack

- **Main App**: Vite + React 19 + TypeScript
- **Dark Editor**: Next.js 14 + React 18 + TypeScript
- **Styling**: Tailwind CSS
- **State Management**: 
  - Main App: React Query + Context API
  - Dark Editor: Zustand + Immer
- **Canvas**: Konva.js for video editing
- **Performance**: WebAssembly for image filters

### Backend Integration

The frontend communicates with a Go backend server:

- **API Base**: handled internally by the dark editor proxy layer
- **API Versioning**: `/api/v1/*` for core endpoints
- **Proxy**: Next.js API routes proxy requests to Go backend

### API Client

The API client (`src/lib/api/core.ts`) provides:

- Automatic endpoint versioning
- Retry logic with exponential backoff
- Timeout handling
- Consistent error handling
- TypeScript type safety

## 🎨 UI Components

Reusable UI components are located in `src/components/ui/`:

- `Button` - Customizable button with variants
- `Card` - Content containers
- `Dialog` - Modal dialogs
- `Select` - Dropdown selects
- `NavBar` - Navigation bar
- `BeamsBackground` - Animated background
- `GlowingEffect` - Visual effects

Import from the centralized index:

```typescript
import { Button, Card, Dialog } from '@/components/ui';
```

## 🪝 Custom Hooks

Custom hooks are organized in `src/hooks/`:

- `useApi` - Generic API call hook with loading/error states
- `useFetch` - Simplified GET requests
- `useMutation` - POST/PUT/DELETE requests
- `useDebounce` - Value debouncing
- `useLocalStorage` - Persistent storage

```typescript
import { useApi, useDebounce } from '@/hooks';
```

## 📝 Type Definitions

All TypeScript types are centralized in `src/types/`:

- `api.ts` - API request/response types
- `scriptGenerator.ts` - Script generation types

```typescript
import { Job, Worker, YouTubeVideo } from '@/types';
```

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

## 🔧 Configuration

### Environment Variables

Create `.env.local` in `dark_editor/`:

```env
DARK_EDITOR_API_BASE=<backend-url>
```

For the main app, set the dark editor URL with `VITE_DARK_EDITOR_URL` when it is not running on `/dark_editor`.

### Vite Configuration

Main app configuration in `vite.config.ts`:

- React plugin
- Path aliases (`@/` → `src/`)
- Proxy configuration for API

### Next.js Configuration

Dark editor configuration in `next.config.js`:

- Image optimization
- API rewrites
- Webpack configuration for WASM

## 📊 Features

### Main Application

- **Dashboard**: Overview of jobs, workers, and analytics
- **YouTube Manager**: Upload, channels, livestream management
- **Script Generator**: AI-powered script generation
- **Finance**: Revenue tracking and analytics
- **Calendar**: Event scheduling
- **Ansible**: Infrastructure management
- **Drive**: Google Drive integration

### Dark Editor

- **Canvas Editing**: Drag-and-drop object manipulation
- **Layers**: Z-index management
- **Filters**: Blur, sharpen, pixelation (WASM-accelerated)
- **Text Effects**: Shadow, stroke, gradient, curve
- **Export**: Multiple format support
- **Undo/Redo**: History management with Immer patches

## 🚀 Performance Optimizations

1. **Lazy Loading**: Routes and components loaded on demand
2. **Code Splitting**: Automatic chunk splitting
3. **WebAssembly**: Image filters run in WASM for performance
4. **Caching**: React Query for API response caching
5. **Debouncing**: Input debouncing for search/filter operations

## 🐛 Debugging

### Browser DevTools

- React DevTools for component inspection
- Redux DevTools for Zustand stores (dark editor)
- Network tab for API calls

### Console Logging

The app uses structured logging:

```typescript
console.log('[MAIN] Starting React initialization...');
console.log('[API] Retrying endpoint in 1000ms...');
```

## 📚 Documentation

- [API Documentation](docs/API.md)
- [Agent 13 Consolidated Plan](docs/AGENT_13_CONSOLIDATED_PLAN.md)
- [Dark Editor Roadmap](dark_editor/DARK_EDITOR_ROADMAP.md)
- [TypeScript Fix Plan](TYPESCRIPT_FIX_PLAN.md)

## 🤝 Contributing

1. Follow the existing code structure
2. Add types for new features in `src/types/`
3. Create reusable components in `src/components/ui/`
4. Add custom hooks in `src/hooks/`
5. Write tests for new functionality
6. Update documentation

## 📄 License

Private - All rights reserved
