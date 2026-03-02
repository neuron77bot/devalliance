# OpenClaw Instances - DevAlliance

## Arquitecto

**Container:** `openclaw-arquitecto`
**Port:** 18790 → 18789
**Network:** devalliance
**Status:** ✅ Healthy

**URLs:**
- Web UI: http://localhost:18790
- Healthcheck: http://localhost:18790/healthz
- API: http://localhost:18790

**Config:**
- Path: `/var/www/devalliance/openclaw-containers/instances/arquitecto/config/`
- Workspace: `/var/www/devalliance/openclaw-containers/instances/arquitecto/workspace/`
- Token: `ed1b3f0d1d87cb0533e3d634f67d3c039ab464466aca9ff8`

**Docker Compose:**
```bash
cd /var/www/devalliance/openclaw-containers/instances/arquitecto
docker compose up -d    # Start
docker compose down     # Stop
docker compose logs -f  # View logs
```

---

## Developer

**Container:** `openclaw-developer`
**Port:** 18791 → 18789
**Network:** devalliance
**Status:** ✅ Healthy

**URLs:**
- Web UI: http://localhost:18791
- Healthcheck: http://localhost:18791/healthz
- API: http://localhost:18791

**Config:**
- Path: `/var/www/devalliance/openclaw-containers/instances/developer/config/`
- Workspace: `/var/www/devalliance/openclaw-containers/instances/developer/workspace/`
- Token: `f64422d81639a4765a3a6a0eb6bd898eb0eb852ca4770224`

**Docker Compose:**
```bash
cd /var/www/devalliance/openclaw-containers/instances/developer
docker compose up -d    # Start
docker compose down     # Stop
docker compose logs -f  # View logs
```

---

## Network

**Name:** `devalliance`
**Driver:** bridge
**Purpose:** Allows inter-agent communication

**Check network:**
```bash
docker network inspect devalliance
```

---

## Management Commands

**View all instances:**
```bash
docker ps --filter "name=openclaw-"
```

**Stop all instances:**
```bash
docker stop openclaw-arquitecto openclaw-developer
```

**Start all instances:**
```bash
docker start openclaw-arquitecto openclaw-developer
```

**Remove all instances:**
```bash
cd /var/www/devalliance/openclaw-containers/instances/arquitecto && docker compose down
cd /var/www/devalliance/openclaw-containers/instances/developer && docker compose down
```

---

## Next Steps

1. Configure API keys (Anthropic) for each instance
2. Set up cross-gateway communication (Issue #4)
3. Create DevAlliance Mission Control dashboard (Issue #5)
