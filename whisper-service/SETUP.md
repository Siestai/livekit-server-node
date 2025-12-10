# MLX Whisper STT Service Setup Guide

This guide will help you set up the MLX Whisper STT service for local speech-to-text processing on Apple Silicon.

## Quick Start

1. **Navigate to the whisper-service directory:**
   ```bash
   cd whisper-service
   ```

2. **Run the setup script:**
   ```bash
   ./start.sh
   ```

   Or manually:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   python server.py
   ```

3. **The service will start on `http://localhost:9000`**

## Using npm/pnpm Scripts

From the project root:

```bash
# Setup (first time only)
pnpm run whisper:setup

# Start the service
pnpm run whisper:start
```

## Verification

Once the service is running, verify it's working:

```bash
# Health check
curl http://localhost:9000/health

# List models
curl http://localhost:9000/v1/models
```

## Integration

The agent is already configured to use this service. Make sure:

1. The service is running on port 9000 (or update `LOCAL_STT_BASE_URL` in `.env.local`)
2. Your `.env.local` has:
   ```env
   LOCAL_STT_BASE_URL=http://localhost:9000/v1
   LOCAL_STT_API_KEY=local
   ```

## Model Information

- **Model**: [mlx-community/whisper-large-v3-mlx](https://huggingface.co/mlx-community/whisper-large-v3-mlx)
- **Framework**: MLX (optimized for Apple Silicon)
- **Size**: ~3GB (downloaded automatically on first use)
- **Performance**: Optimized for M1/M2/M3 chips

## Troubleshooting

### Port Already in Use

If port 9000 is already in use:

```bash
PORT=9001 python server.py
```

Update `.env.local`:
```env
LOCAL_STT_BASE_URL=http://localhost:9001/v1
```

### Model Download Issues

The model downloads automatically from Hugging Face. If you encounter issues:

1. Check your internet connection
2. Ensure you have ~3GB free disk space
3. The model will be cached in `~/.cache/huggingface/`

### Performance Issues

- First transcription may take 2-5 seconds (model loading)
- Subsequent transcriptions are faster (~0.5-2 seconds)
- Ensure you're running on Apple Silicon for best performance

## Development

To modify the service:

1. Edit `server.py`
2. Restart the service
3. Changes take effect immediately

## References

- [MLX Whisper Model](https://huggingface.co/mlx-community/whisper-large-v3-mlx)
- [MLX Framework](https://github.com/ml-explore/mlx)
- [MLX Whisper Package](https://github.com/ml-explore/mlx-examples/tree/main/whisper)

