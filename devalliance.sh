#!/bin/bash
# DevAlliance Management Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTANCES_DIR="$SCRIPT_DIR/openclaw-containers/instances"
MC_DIR="$SCRIPT_DIR/mission-control"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

function print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}⚡ DevAlliance Management${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

function status() {
    print_header
    echo ""
    echo -e "${YELLOW}📊 System Status:${NC}"
    echo ""
    
    docker ps --filter "name=openclaw-\|mission-control" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    echo ""
    echo -e "${YELLOW}🌐 URLs:${NC}"
    echo -e "  ${GREEN}•${NC} Mission Control: http://localhost:3100"
    echo -e "  ${GREEN}•${NC} Arquitecto:      http://localhost:18790"
    echo -e "  ${GREEN}•${NC} Developer:       http://localhost:18791"
}

function start() {
    print_header
    echo ""
    echo -e "${YELLOW}🚀 Starting DevAlliance...${NC}"
    echo ""
    
    # Start agents
    echo -e "${BLUE}Starting Arquitecto...${NC}"
    cd "$INSTANCES_DIR/arquitecto" && docker compose up -d
    
    echo -e "${BLUE}Starting Developer...${NC}"
    cd "$INSTANCES_DIR/developer" && docker compose up -d
    
    # Start Mission Control
    echo -e "${BLUE}Starting Mission Control...${NC}"
    cd "$MC_DIR" && docker compose up -d
    
    echo ""
    echo -e "${GREEN}✅ All systems started!${NC}"
    sleep 2
    status
}

function stop() {
    print_header
    echo ""
    echo -e "${YELLOW}🛑 Stopping DevAlliance...${NC}"
    echo ""
    
    # Stop Mission Control
    echo -e "${BLUE}Stopping Mission Control...${NC}"
    cd "$MC_DIR" && docker compose down
    
    # Stop agents
    echo -e "${BLUE}Stopping Arquitecto...${NC}"
    cd "$INSTANCES_DIR/arquitecto" && docker compose down
    
    echo -e "${BLUE}Stopping Developer...${NC}"
    cd "$INSTANCES_DIR/developer" && docker compose down
    
    echo ""
    echo -e "${GREEN}✅ All systems stopped!${NC}"
}

function restart() {
    stop
    sleep 2
    start
}

function logs() {
    local service="${1:-all}"
    
    print_header
    echo ""
    echo -e "${YELLOW}📋 Showing logs for: $service${NC}"
    echo ""
    
    case "$service" in
        arquitecto)
            docker logs -f openclaw-arquitecto
            ;;
        developer)
            docker logs -f openclaw-developer
            ;;
        mission-control|mc)
            docker logs -f devalliance-mission-control
            ;;
        all)
            docker logs -f openclaw-arquitecto &
            docker logs -f openclaw-developer &
            docker logs -f devalliance-mission-control
            ;;
        *)
            echo -e "${RED}❌ Unknown service: $service${NC}"
            echo "Available: arquitecto, developer, mission-control (mc), all"
            exit 1
            ;;
    esac
}

function help() {
    print_header
    echo ""
    echo "Usage: ./devalliance.sh <command>"
    echo ""
    echo "Commands:"
    echo "  start          Start all services"
    echo "  stop           Stop all services"
    echo "  restart        Restart all services"
    echo "  status         Show system status"
    echo "  logs [service] Show logs (all, arquitecto, developer, mc)"
    echo "  help           Show this help"
    echo ""
}

# Main
case "${1:-help}" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        status
        ;;
    logs)
        logs "${2:-all}"
        ;;
    help|--help|-h)
        help
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo ""
        help
        exit 1
        ;;
esac
