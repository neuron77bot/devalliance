# Nginx Configuration for DevAlliance

## Backend API Proxy

**File:** `/etc/nginx/sites-available/default`

```nginx
# DevAlliance API (Fastify + TypeScript)
location /app/api/ {
    proxy_pass http://127.0.0.1:3101/api/;  # ✅ Port 3101 (Docker backend)
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_cache_bypass $http_upgrade;
}
```

## WebSocket Proxy for OpenClaw Agents

```nginx
# DevAlliance WebSocket Proxy for Agent Luna
location /app/ws/luna {
    proxy_pass http://127.0.0.1:18795;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 86400;
}

# DevAlliance WebSocket Proxy for Agent Sol
location /app/ws/sol {
    proxy_pass http://127.0.0.1:18796;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 86400;
}
```

## Port Configuration

- **Backend Docker:** Port 3101 (network mode: host)
- **Luna Gateway:** Port 18795 (network mode: host)
- **Sol Gateway:** Port 18796 (network mode: host)

## TUI WebSocket Flow

1. Frontend requests token: `GET /app/api/agents/sol/tui-token`
2. Backend returns: `{ "wsUrl": "wss://devalliance.com.ar/app/ws/sol" }`
3. Frontend connects: `new WebSocket('wss://devalliance.com.ar/app/ws/sol')`
4. Nginx proxies to: `ws://127.0.0.1:18796` (Sol's gateway)
5. Gateway authenticates with token → connection established

## Apply Changes

```bash
sudo nginx -t              # Test configuration
sudo systemctl reload nginx # Apply changes
```

## Last Modified

2026-03-03 12:19 GMT-3
