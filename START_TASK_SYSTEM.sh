#!/bin/bash

echo "🚀 DevAlliance - Task Workflow System Startup"
echo "=============================================="
echo ""

# Check if MongoDB is running
if ! pgrep -x mongod > /dev/null; then
    echo "⚠️  MongoDB not running. Please start MongoDB first:"
    echo "   sudo systemctl start mongod"
    exit 1
fi

echo "✅ MongoDB is running"
echo ""

# Backend
echo "🔧 Starting Backend..."
cd /var/www/devalliance/backend

# Kill existing process
pkill -f "tsx.*server.ts" 2>/dev/null

# Start backend
nohup npm run dev > /tmp/devalliance-backend.log 2>&1 &
BACKEND_PID=$!

echo "   Backend PID: $BACKEND_PID"
echo "   Logs: tail -f /tmp/devalliance-backend.log"

# Wait for backend to start
echo "   Waiting for backend to start..."
sleep 5

# Check if backend is running
if ! ps -p $BACKEND_PID > /dev/null; then
    echo "   ❌ Backend failed to start. Check logs:"
    tail -20 /tmp/devalliance-backend.log
    exit 1
fi

echo "   ✅ Backend started successfully"
echo ""

# Frontend
echo "🎨 Starting Frontend..."
cd /var/www/devalliance/frontend

# Kill existing process
pkill -f "vite.*5173" 2>/dev/null

# Start frontend
nohup npm run dev > /tmp/devalliance-frontend.log 2>&1 &
FRONTEND_PID=$!

echo "   Frontend PID: $FRONTEND_PID"
echo "   Logs: tail -f /tmp/devalliance-frontend.log"

# Wait for frontend to start
echo "   Waiting for frontend to start..."
sleep 3

if ! ps -p $FRONTEND_PID > /dev/null; then
    echo "   ❌ Frontend failed to start. Check logs:"
    tail -20 /tmp/devalliance-frontend.log
    exit 1
fi

echo "   ✅ Frontend started successfully"
echo ""

# Summary
echo "=============================================="
echo "✨ DevAlliance Task Workflow System is RUNNING!"
echo "=============================================="
echo ""
echo "📊 Access Points:"
echo "   • Frontend:     http://localhost:5173/app/tasks"
echo "   • Backend API:  http://localhost:3100/api/tasks"
echo "   • Swagger Docs: http://localhost:3100/docs"
echo "   • WebSocket:    ws://localhost:3100/ws"
echo ""
echo "📝 Logs:"
echo "   • Backend:  tail -f /tmp/devalliance-backend.log"
echo "   • Frontend: tail -f /tmp/devalliance-frontend.log"
echo ""
echo "🛑 Stop Services:"
echo "   pkill -f 'tsx.*server.ts'"
echo "   pkill -f 'vite.*5173'"
echo ""
echo "🧪 Seed Test Data:"
echo "   cd /var/www/devalliance/backend"
echo "   npx tsx scripts/seedTasks.ts"
echo ""
echo "🎉 Happy Task Management!"
