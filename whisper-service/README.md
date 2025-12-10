# MLX Whisper STT Service

A local Speech-to-Text service using [MLX Whisper](https://huggingface.co/mlx-community/whisper-large-v3-turbo) optimized for Apple Silicon. This service exposes OpenAI-compatible API endpoints for integration with LiveKit Agents.

## Features

- ✅ Optimized for Apple Silicon (MLX framework)
- ✅ OpenAI-compatible API endpoints
- ✅ Supports multiple audio formats (mp3, wav, webm, etc.)
- ✅ Real-time transcription
- ✅ Low latency on Apple Silicon

## Prerequisites

- Python 3.9 or higher
- Apple Silicon Mac (M1/M2/M3)
- macOS 12.0 or later

## Installation

1. Create a virtual environment (recommended):

```bash
python3 -m venv venv
source venv/bin/activate  # On macOS/Linux
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. The MLX Whisper model will be automatically downloaded from Hugging Face on first use.

## Usage

### Start the Service

```bash
python server.py
```

Or with custom port:

```bash
PORT=9000 python server.py
```

The service will start on `http://localhost:9000` by default.

### Environment Variables

- `PORT`: Server port (default: 9000)
- `HOST`: Server host (default: 0.0.0.0)
- `WHISPER_MODEL`: Hugging Face model name (default: `mlx-community/whisper-large-v3-turbo`)

### API Endpoints

#### Health Check
```bash
curl http://localhost:9000/health
```

#### List Models
```bash
curl http://localhost:9000/v1/models
```

#### Transcribe Audio
```bash
curl -X POST http://localhost:9000/v1/audio/transcriptions \
  -H "Content-Type: multipart/form-data" \
  -F "file=@audio.wav" \
  -F "model=whisper-1" \
  -F "language=en"
```

## Integration with LiveKit Agents

The service is automatically configured in `agent.ts` to use this local service. Make sure:

1. The service is running on port 9000 (or update `LOCAL_STT_BASE_URL` in `.env.local`)
2. The agent is configured to use the local STT service

## Performance

- **First transcription**: ~2-5 seconds (model loading)
- **Subsequent transcriptions**: ~0.5-2 seconds (depending on audio length)
- **Memory usage**: ~2-4 GB RAM
- **CPU usage**: Optimized for Apple Silicon Neural Engine

## Troubleshooting

### Model Download Issues

If the model fails to download, you can manually download it:

```python
from huggingface_hub import snapshot_download
snapshot_download("mlx-community/whisper-large-v3-turbo", local_dir="./models")
```

### Port Already in Use

Change the port:

```bash
PORT=9001 python server.py
```

And update `.env.local`:
```env
LOCAL_STT_BASE_URL=http://localhost:9001/v1
```

## References

- [MLX Whisper Model](https://huggingface.co/mlx-community/whisper-large-v3-turbo)
- [MLX Framework](https://github.com/ml-explore/mlx)
- [OpenAI Audio API](https://platform.openai.com/docs/api-reference/audio)

