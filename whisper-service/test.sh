#!/bin/bash

# Test script for MLX Whisper STT Service
# This script tests the service endpoints

BASE_URL="${1:-http://localhost:9000}"

echo "Testing MLX Whisper STT Service at $BASE_URL"
echo ""

# Health check
echo "1. Health Check:"
curl -s "$BASE_URL/health" | python3 -m json.tool
echo ""

# List models
echo "2. List Models:"
curl -s "$BASE_URL/v1/models" | python3 -m json.tool
echo ""

# Test transcription (if you have a test audio file)
if [ -f "test_audio.wav" ]; then
    echo "3. Test Transcription:"
    curl -s -X POST "$BASE_URL/v1/audio/transcriptions" \
        -H "Content-Type: multipart/form-data" \
        -F "file=@test_audio.wav" \
        -F "model=whisper-1" \
        -F "language=en" | python3 -m json.tool
    echo ""
else
    echo "3. Test Transcription: (skipped - no test_audio.wav file found)"
    echo "   Create a test_audio.wav file to test transcription"
fi

echo "Done!"

