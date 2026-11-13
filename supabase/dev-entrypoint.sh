#!/bin/sh
set -e

# Graceful termination handler
cleanup() {
    rc=$?
    trap - INT TERM HUP EXIT
    rm -f /tmp/.supabase-ready
    echo ""
    echo "🛑 Shutting down local Supabase development containers..."
    supabase stop || true
    echo "✅ Local Supabase development server stopped."
    exit "$rc"
}

# Trap termination signals from Docker Compose lifecycle
trap 'cleanup' EXIT
trap 'exit 0' INT TERM HUP

rm -f /tmp/.supabase-ready
echo "🚀 Starting local Supabase development server..."
supabase start
touch /tmp/.supabase-ready

echo "✅ Local Supabase development server is running and ready."

# Keep container alive and wait for termination signal
while true; do
    sleep 2 &
    wait $!
done
