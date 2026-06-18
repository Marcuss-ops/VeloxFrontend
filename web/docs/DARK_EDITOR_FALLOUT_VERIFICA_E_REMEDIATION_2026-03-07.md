# Dark Editor - Fix Fallout e Remediazione

**Data**: 2026-03-07  
**Autore**: Agent  

## Problema

Click su "Dark Editor" nel sidebar:
1. Apre nuova tab ✓
2. Ma URL sbagliato: `/dark_editor_v2` → redirect 302 → `/creator_studio_app/dist/` → fallback SPA → `/dashboard-channels`

**Causa root**: Il server Go non aveva configurato il proxy per `/dark_editor_v2` verso Next.js.

## Soluzione Applicata

### 1. Configurazione Next.js

**File**: `web/dark_editor/package.json`
```json
"scripts": {
  "dev": "next dev"
}
```

**File**: `web/dark_editor/next.config.js`
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // basePath allows serving the app under /dark_editor_v2 prefix
  // Dark editor is mounted under /dark_editor
  basePath: '/dark_editor_v2',
  images: {
    domains: ['img.youtube.com', 'i.ytimg.com'],
    unoptimized: true,
  },
}
module.exports = nextConfig;
```

### 2. Configurazione Server Go

**File**: `DataServer/velox-server.service`
```ini
[Service]
Environment=VELOX_DARK_EDITOR_PROXY_URL=<internal-proxy-url>
```

### 3. Frontend (invariato)

**File**: `web/src/app/shell/MainSidebar.tsx`
```typescript
{ href: '/dark_editor_v2', icon: 'edit', label: 'Dark Editor', newTab: true }
```

## Comandi per Riavvio

```bash
# 1. Copia file servizio aggiornato
sudo cp /home/pierone/Pyt/VeloxEditing/refactored/DataServer/velox-server.service /etc/systemd/system/

# 2. Ricarica systemd
sudo systemctl daemon-reload

# 3. Riavvia server
sudo systemctl restart velox-server
```

## Verifica Post-Fix

```bash
# Test HTTP (senza redirect)
curl -I http://51.91.11.36:8000/dark_editor_v2
# Atteso: 200 OK

# Test browser
# Apri http://51.91.11.36:8000/dashboard-channels
# Click "Dark Editor" -> nuova tab con /dark_editor_v2
```

## Note

- Dark Editor Next.js è servito sotto `/dark_editor`
- Il proxy interno indirizza `/dark_editor` verso il server del dark editor
- Il server Go deve fare proxy di TUTTE le route `/dark_editor_v2/*` (non solo `/dark_editor_v2`)
- Dopo aver modificato next.config.js, eseguire `npm run build` per rigenerare l'app con il basePath
- Nessun redirect a `/creator_studio_app/dist/`
- Nessun fallback a `/dashboard-channels`
