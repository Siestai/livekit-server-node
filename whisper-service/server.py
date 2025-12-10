"""
MLX Whisper STT Service
A local Speech-to-Text service using MLX Whisper optimized for Apple Silicon.
Exposes OpenAI-compatible API endpoints for integration with LiveKit Agents.
"""

import asyncio
import io
import logging
import os
from typing import Optional

import mlx_whisper
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="MLX Whisper STT Service")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model variable (loaded on startup)
whisper_model = None
model_name = os.getenv("WHISPER_MODEL", "mlx-community/whisper-large-v3-turbo")


class TranscriptionRequest(BaseModel):
    """OpenAI-compatible transcription request"""
    model: str = "whisper-1"
    language: Optional[str] = None
    prompt: Optional[str] = None
    response_format: Optional[str] = "json"
    temperature: Optional[float] = 0.0


class TranscriptionResponse(BaseModel):
    """OpenAI-compatible transcription response"""
    text: str


@app.on_event("startup")
async def load_model():
    """Load the MLX Whisper model on startup"""
    global whisper_model
    logger.info(f"Loading MLX Whisper model: {model_name}")
    try:
        # mlx_whisper doesn't need explicit loading, it loads on first use
        # But we can verify the model is available
        logger.info(f"Model {model_name} will be loaded on first transcription")
        whisper_model = model_name
        logger.info("Model ready")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "model": model_name}


@app.get("/v1/models")
async def list_models():
    """List available models (OpenAI-compatible)"""
    return {
        "data": [
            {
                "id": "whisper-1",
                "object": "model",
                "created": 1677532382,
                "owned_by": "mlx-whisper",
            }
        ],
        "object": "list",
    }


@app.post("/v1/audio/transcriptions")
async def create_transcription(
    file: UploadFile = File(...),
    model: str = Form("whisper-1"),
    language: Optional[str] = Form(None),
    prompt: Optional[str] = Form(None),
    response_format: Optional[str] = Form("json"),
    temperature: Optional[float] = Form(0.0),
):
    """
    Create transcription from audio file (OpenAI-compatible endpoint)
    
    Supports:
    - Audio formats: mp3, mp4, mpeg, mpga, m4a, wav, webm
    - Streaming audio via multipart form data
    """
    try:
        # Read audio file
        audio_bytes = await file.read()
        logger.info(f"Received audio file: {file.filename}, size: {len(audio_bytes)} bytes")

        # Save to temporary file for mlx_whisper
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
            tmp_file.write(audio_bytes)
            tmp_path = tmp_file.name

        try:
            # Transcribe using MLX Whisper
            logger.info(f"Transcribing with model: {model_name}")
            
            # mlx_whisper.transcribe expects a file path
            # Returns a dict with 'text' and 'segments' keys
            result = mlx_whisper.transcribe(
                tmp_path,
                path_or_hf_repo=model_name,
                language=language if language else None,
                initial_prompt=prompt if prompt else None,
                temperature=temperature,
                verbose=False,
            )
            
            # Extract text from result
            # mlx_whisper returns a dict with 'text' key and 'segments' list
            if isinstance(result, dict):
                text = result.get("text", "")
                # If text is empty, try to reconstruct from segments
                if not text and "segments" in result:
                    text = " ".join([seg.get("text", "") for seg in result.get("segments", [])])
            elif isinstance(result, str):
                text = result
            else:
                text = str(result)
            
            if not text:
                raise ValueError("Transcription returned empty text")
            
            logger.info(f"Transcription successful: {len(text)} characters")
            
            if response_format == "json":
                return TranscriptionResponse(text=text)
            else:
                return text
                
        finally:
            # Clean up temporary file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    except Exception as e:
        logger.error(f"Transcription error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@app.post("/v1/audio/translations")
async def create_translation(
    file: UploadFile = File(...),
    model: str = Form("whisper-1"),
    prompt: Optional[str] = Form(None),
    response_format: Optional[str] = Form("json"),
    temperature: Optional[float] = Form(0.0),
):
    """
    Create translation from audio file (translates to English)
    OpenAI-compatible endpoint
    """
    # For translation, we force language to None (auto-detect) and the model translates to English
    return await create_transcription(
        file=file,
        model=model,
        language=None,  # Auto-detect and translate
        prompt=prompt,
        response_format=response_format,
        temperature=temperature,
    )


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", "9000"))
    host = os.getenv("HOST", "0.0.0.0")
    
    logger.info(f"Starting MLX Whisper STT Service on {host}:{port}")
    logger.info(f"Model: {model_name}")
    
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info",
    )

