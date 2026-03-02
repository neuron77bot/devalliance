# Testing DevAlliance Mission Control Backend v2

## Quick Health Check

```bash
# Health check
curl http://localhost:3101/health

# Expected:
# {"ok":true,"service":"mission-control","timestamp":"..."}
```

## Test All Endpoints

### 1. Health & Config

```bash
# Health check
curl http://localhost:3101/health

# Config
curl http://localhost:3101/config
```

### 2. Agents

```bash
# List all agents
curl http://localhost:3101/api/agents

# Get agent status
curl http://localhost:3101/api/agents/developer/status

# Call gateway RPC method (example)
curl -X POST http://localhost:3101/api/agents/developer/call \
  -H "Content-Type: application/json" \
  -d '{"method": "status"}'
```

### 3. System Status

```bash
# Get all agents status
curl http://localhost:3101/api/status
```

### 4. Tasks

```bash
# List tasks
curl http://localhost:3101/api/tasks

# Create task
curl -X POST http://localhost:3101/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test task",
    "description": "Testing task creation",
    "assignedTo": "developer",
    "priority": "high"
  }'

# Get task by ID (use _id from create response)
curl http://localhost:3101/api/tasks/{taskId}

# Update task
curl -X PATCH http://localhost:3101/api/tasks/{taskId} \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'

# Delete task
curl -X DELETE http://localhost:3101/api/tasks/{taskId}
```

## Swagger UI

Interactive API documentation available at:

```
http://localhost:3101/docs
```

Test all endpoints directly from the browser!

## Docker Testing

```bash
# Build and run with docker-compose
cd /var/www/devalliance/mission-control-v2/backend
docker compose up -d

# Check logs
docker compose logs -f backend

# Test endpoints (port 3100 in production)
curl http://localhost:3100/health

# Stop
docker compose down
```

## MongoDB Verification

```bash
# Connect to MongoDB
docker exec -it devalliance-mongo mongosh devalliance

# In mongo shell:
db.agents.find().pretty()
db.tasks.find().pretty()
db.teams.find().pretty()

# Exit
exit
```

## Common Issues

### Port already in use

```bash
# Check what's using port 3101
lsof -i :3101

# Kill process
kill -9 <PID>
```

### MongoDB not running

```bash
# Start MongoDB with docker
docker compose up -d mongo

# Or standalone:
docker run -d -p 27017:27017 --name mongo mongo:7
```

## Performance Testing

```bash
# Install autocannon (optional)
npm install -g autocannon

# Load test health endpoint
autocannon -c 100 -d 10 http://localhost:3101/health

# Load test agents endpoint
autocannon -c 50 -d 10 http://localhost:3101/api/agents
```

## Expected Results

✅ **Health**: `{"ok":true,"service":"mission-control"}`  
✅ **Agents**: 2 agents (arquitecto, developer)  
✅ **Status**: Both agents show health status  
✅ **Swagger**: Interactive docs at /docs  
✅ **MongoDB**: Agents persisted in database  
