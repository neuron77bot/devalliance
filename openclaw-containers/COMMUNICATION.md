# Comunicación Inter-Gateway - DevAlliance

## Configuración de Red

**Red Docker:** `devalliance` (bridge)

Ambas instancias están conectadas a la misma red Docker, lo que permite:
- Resolución de nombres por hostname (`openclaw-arquitecto`, `openclaw-developer`)
- Comunicación directa HTTP/WebSocket
- Sin necesidad de exponer puertos adicionales

## Endpoints

### Arquitecto → Developer

```bash
URL: ws://openclaw-developer:18789
Token: f64422d81639a4765a3a6a0eb6bd898eb0eb852ca4770224
Health: http://openclaw-developer:18789/healthz
```

### Developer → Arquitecto

```bash
URL: ws://openclaw-arquitecto:18789
Token: ed1b3f0d1d87cb0533e3d634f67d3c039ab464466aca9ff8
Health: http://openclaw-arquitecto:18789/healthz
```

## Verificación de Conectividad

### Test HTTP básico

```bash
# Desde Arquitecto a Developer
docker exec openclaw-arquitecto curl -s http://openclaw-developer:18789/healthz

# Desde Developer a Arquitecto
docker exec openclaw-developer curl -s http://openclaw-arquitecto:18789/healthz
```

✅ **Status:** Conectividad HTTP verificada y funcionando

## Comunicación Programática

### Opción 1: Configurar Remote Gateway

Agregar a la configuración de cada instancia:

**Arquitecto (`/var/www/devalliance/openclaw-containers/instances/arquitecto/config/openclaw.json`):**
```json
{
  "gateway": {
    "remote": {
      "url": "ws://openclaw-developer:18789",
      "token": "f64422d81639a4765a3a6a0eb6bd898eb0eb852ca4770224",
      "transport": "direct"
    }
  }
}
```

**Developer (`/var/www/devalliance/openclaw-containers/instances/developer/config/openclaw.json`):**
```json
{
  "gateway": {
    "remote": {
      "url": "ws://openclaw-arquitecto:18789",
      "token": "ed1b3f0d1d87cb0533e3d634f67d3c039ab464466aca9ff8",
      "transport": "direct"
    }
  }
}
```

### Opción 2: API REST Directa (DevAlliance Mission Control)

El Mission Control de DevAlliance actuará como orquestador:
- Conoce las URLs y tokens de ambos gateways
- Envía comandos via WebSocket RPC
- Coordina tareas entre agentes
- Monitorea estado y recursos

## Próximos Pasos (Issue #5)

1. **API REST de DevAlliance:**
   - Endpoints para control de gateways
   - Proxy de comandos RPC
   - Gestión de sesiones

2. **Dashboard Web:**
   - Lista de agentes activos
   - Estado en tiempo real
   - Botones de control (start/stop/restart)
   - Logs en vivo

3. **Orquestación:**
   - Asignación de tareas a agentes específicos
   - Load balancing entre agentes
   - Manejo de errores y reintentos

## Configuración de Seguridad

**Importante:** Las instancias están configuradas con `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` para permitir WebSocket sin TLS en la red privada Docker.

**⚠️ Solo para desarrollo/testing en redes privadas confiables.**

Para producción:
- Usar Tailscale Serve/Funnel
- Configurar TLS con certificados
- O usar SSH tunneling

## Scripts de Utilidad

### Reiniciar ambas instancias
```bash
docker restart openclaw-arquitecto openclaw-developer
```

### Ver logs en tiempo real
```bash
# Ambas instancias
docker logs -f openclaw-arquitecto &
docker logs -f openclaw-developer &

# Solo una
docker logs -f openclaw-arquitecto
```

### Estado de ambas instancias
```bash
docker ps --filter "name=openclaw-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

---

**Documentación generada:** 2 de marzo, 2026
**Estado:** ✅ Configuración completa, listo para Issue #5
