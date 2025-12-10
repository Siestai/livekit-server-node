#!/bin/bash

# Start MLX Whisper STT Service
# This script sets up the environment and starts the service

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install/update dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Start the server
echo "Starting MLX Whisper STT Service..."
echo "Service will be available at http://localhost:${PORT:-9000}"
python server.py

