#!/usr/bin/env bash
# Run Podwise locally. Usage:
#   ./run-local.sh          — starts both API server and Expo in parallel
#   ./run-local.sh api      — API server only
#   ./run-local.sh expo     — Expo only

set -e

API_PORT=5000
EXPO_PORT=8081
WEB_PORT=$((EXPO_PORT + 1))

export PORT=$API_PORT
export EXPO_PUBLIC_DOMAIN="http://localhost:$API_PORT"

case "${1:-all}" in
  api)
    echo "▶ API server → http://localhost:$API_PORT"
    PORT=$API_PORT pnpm --filter @workspace/api-server run dev
    ;;
  expo)
    echo "▶ Expo web  → http://localhost:$WEB_PORT"
    PORT=$EXPO_PORT EXPO_PUBLIC_DOMAIN=$EXPO_PUBLIC_DOMAIN \
      pnpm --filter @workspace/podcast-app run dev
    ;;
  all)
    echo "▶ Starting API server on :$API_PORT and Expo web on :$WEB_PORT"
    echo "   Open http://localhost:$WEB_PORT in your browser"
    echo "   Press Ctrl+C to stop both"
    echo ""
    PORT=$API_PORT pnpm --filter @workspace/api-server run dev &
    API_PID=$!
    PORT=$EXPO_PORT EXPO_PUBLIC_DOMAIN=$EXPO_PUBLIC_DOMAIN \
      pnpm --filter @workspace/podcast-app run dev &
    EXPO_PID=$!
    trap "kill $API_PID $EXPO_PID 2>/dev/null; exit 0" SIGINT SIGTERM
    wait $API_PID $EXPO_PID
    ;;
  *)
    echo "Usage: $0 [api|expo|all]"
    exit 1
    ;;
esac
