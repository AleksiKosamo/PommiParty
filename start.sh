#!/bin/bash
# PommiParty Launcher for macOS and Linux
# This script starts the development server and client

set -e

echo "🎮 PommiParty Launcher"
echo "====================="

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ] || [ ! -d "server/node_modules" ] || [ ! -d "client/node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm run install:all
fi

echo "🚀 Starting PommiParty..."
echo "   Server: http://localhost:3000"
echo "   Client: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop the game."
echo ""

# Start dev servers
npm run dev
