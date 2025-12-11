import {
  type JobContext,
  type JobProcess,
  WorkerOptions,
  cli,
  defineAgent,
  metrics,
  voice,
} from '@livekit/agents';
import * as cartesia from '@livekit/agents-plugin-cartesia';
import * as livekit from '@livekit/agents-plugin-livekit';
import * as openai from '@livekit/agents-plugin-openai';
import * as silero from '@livekit/agents-plugin-silero';
import { BackgroundVoiceCancellation } from '@livekit/noise-cancellation-node';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: '.env.local' });

class Assistant extends voice.Agent {
  constructor() {
    super({
      instructions: `You are a helpful voice AI assistant. The user is interacting with you via voice, even if you perceive the conversation as text.
      You eagerly assist users with their questions by providing information from your extensive knowledge.
      Your responses are concise, to the point, and without any complex formatting or punctuation including emojis, asterisks, or other symbols.
      You are curious, friendly, and have a sense of humor.`,

      // To add tools, specify `tools` in the constructor.
      // Here's an example that adds a simple weather tool.
      // You also have to add `import { llm } from '@livekit/agents' and `import { z } from 'zod'` to the top of this file
      // tools: {
      //   getWeather: llm.tool({
      //     description: `Use this tool to look up current weather information in the given location.
      //
      //     If the location is not supported by the weather service, the tool will indicate this. You must tell the user the location's weather is unavailable.`,
      //     parameters: z.object({
      //       location: z
      //         .string()
      //         .describe('The location to look up weather information for (e.g. city name)'),
      //     }),
      //     execute: async ({ location }) => {
      //       console.log(`Looking up weather for ${location}`);
      //
      //       return 'sunny with a temperature of 70 degrees.';
      //     },
      //   }),
      // },
    });
  }
}

export default defineAgent({
  prewarm: async (proc: JobProcess) => {
    proc.userData.vad = await silero.VAD.load();
  },
  entry: async (ctx: JobContext) => {
    // Set up a voice AI pipeline using:
    // - Local STT: MLX Whisper (Apple Silicon Optimized)
    // - Local LLM: MLX LM (Apple Silicon Optimized)
    // - Cartesia TTS: Using Cartesia plugin with your own API key
    //
    // LOCAL STT SETUP (MLX Whisper - Apple Silicon Optimized):
    // The MLX Whisper service is included in the whisper-service/ subdirectory
    // Model: mlx-community/whisper-large-v3-turbo (https://huggingface.co/mlx-community/whisper-large-v3-turbo)
    //
    // To start the MLX Whisper service:
    //   1. Run: pnpm run whisper:setup (first time only)
    //   2. Run: pnpm run whisper:start
    //   Or manually: cd whisper-service && ./start.sh
    //
    // The service will run on http://localhost:9000 by default
    //
    // TTS SETUP (Cartesia Plugin):
    // Using Cartesia TTS plugin with your own API key
    // Get your API key from: https://play.cartesia.ai/keys
    // Voice options: See https://play.cartesia.ai/voices (free account required)
    // Example voices (Sonic 3 model):
    // - 9626c31c-bec5-4cca-baa8-f8ba9e84c8bc (Jacqueline - Confident, young American adult female)
    // - a167e0f3-df7e-4d52-a9c3-f949145efdab (Blake - Energetic American adult male)
    // - f31cc6a7-c1e8-4764-980c-60a361443dd1 (Robyn - Neutral, mature Australian female)
    //
    // ENVIRONMENT VARIABLES (.env.local):
    // LIVEKIT_URL=wss://your-project.livekit.cloud (or ws://localhost:7880 for local)
    // LIVEKIT_API_KEY=your-api-key (or devkey for local)
    // LIVEKIT_API_SECRET=your-api-secret (or secret for local)
    // CARTESIA_API_KEY=your-cartesia-api-key  # Required for Cartesia TTS
    // LLM_BASE_URL=http://localhost:11434/v1  # Ollama (default) or LiteLLM endpoint (without /chat/completions)
    // LLM_MODEL=llama3.1  # Model name (e.g., llama3.1 for Ollama, or your LiteLLM model)
    // LLM_API_KEY=ollama  # API key (for Ollama, any value works; for LiteLLM, use your actual API key)
    // LOCAL_STT_BASE_URL=http://localhost:9000/v1  # MLX Whisper service
    // LOCAL_STT_API_KEY=local  # Dummy key for local STT server

    // Ensure VAD is loaded (required for non-streaming STT like Whisper)
    const vad = ctx.proc.userData.vad as silero.VAD;
    if (!vad) {
      throw new Error('VAD not loaded. Make sure prewarm completed successfully.');
    }

    const session = new voice.AgentSession({
      // Speech-to-text (STT) - Using local MLX Whisper server (optimized for Apple Silicon)
      // The MLX Whisper service runs in the whisper-service/ subdirectory
      // To start: cd whisper-service && ./start.sh
      // Or use: pnpm run whisper:start
      // Model: mlx-community/whisper-large-v3-turbo
      stt: new openai.STT({
        model: 'whisper-1', // Model name for OpenAI-compatible API
        language: 'en',
        baseURL: process.env.LOCAL_STT_BASE_URL || 'http://localhost:9000/v1',
        apiKey: process.env.LOCAL_STT_API_KEY || 'local',
      }),

      // A Large Language Model (LLM) - Supports OpenAI-compatible APIs
      // The OpenAI plugin automatically adds "Authorization: Bearer <apiKey>" header
      // 
      // Examples:
      // - Ollama: baseURL=http://localhost:11434/v1, apiKey=ollama (or any value)
      // - LiteLLM: baseURL=http://siestais-mac-studio:14000, apiKey=<your-litellm-api-key>
      //   (Note: Don't include /chat/completions in baseURL - the plugin adds it automatically)
      llm: new openai.LLM({
        model: process.env.LLM_MODEL || 'llama3.1',
        baseURL: process.env.LLM_BASE_URL || 'http://localhost:11434/v1',
        apiKey: process.env.LLM_API_KEY || 'ollama',
      }),

      // Text-to-speech (TTS) - Using Cartesia plugin with your API key
      // Requires CARTESIA_API_KEY environment variable
      // Model: sonic-3 (default, can be changed to sonic-2, sonic-turbo, or sonic)
      // Voice: Jacqueline - Confident, young American adult female (en-US)
      // See https://play.cartesia.ai/voices for more voices
      // See https://docs.livekit.io/agents/models/tts/plugins/cartesia for configuration options
      tts: new cartesia.TTS({
        model: process.env.CARTESIA_MODEL || 'sonic-3',
        voice: process.env.CARTESIA_VOICE_ID || '9626c31c-bec5-4cca-baa8-f8ba9e84c8bc',
        language: process.env.CARTESIA_LANGUAGE || 'en',
      }),

      // VAD and turn detection are used to determine when the user is speaking and when the agent should respond
      // VAD is required for non-streaming STT (like Whisper) to buffer audio until end of speech
      // See more at https://docs.livekit.io/agents/build/turns
      turnDetection: new livekit.turnDetector.MultilingualModel(),
      vad: vad,
      voiceOptions: {
        // Allow the LLM to generate a response while waiting for the end of turn
        preemptiveGeneration: true,
      },
    });

    // To use a realtime model instead of a voice pipeline, use the following session setup instead.
    // (Note: This is for the OpenAI Realtime API. For other providers, see https://docs.livekit.io/agents/models/realtime/))
    // 1. Install '@livekit/agents-plugin-openai'
    // 2. Set OPENAI_API_KEY in .env.local
    // 3. Add import `import * as openai from '@livekit/agents-plugin-openai'` to the top of this file
    // 4. Use the following session setup instead of the version above
    // const session = new voice.AgentSession({
    //   llm: new openai.realtime.RealtimeModel({ voice: 'marin' }),
    // });

    // Metrics collection, to measure pipeline performance
    // For more information, see https://docs.livekit.io/agents/build/metrics/
    const usageCollector = new metrics.UsageCollector();
    session.on(voice.AgentSessionEventTypes.MetricsCollected, (ev) => {
      metrics.logMetrics(ev.metrics);
      usageCollector.collect(ev.metrics);
    });

    const logUsage = async () => {
      const summary = usageCollector.getSummary();
      console.log(`Usage: ${JSON.stringify(summary)}`);
    };

    ctx.addShutdownCallback(logUsage);

    // Start the session, which initializes the voice pipeline and warms up the models
    // Note: VAD is configured in the session above (line 137), which is required for
    // non-streaming STT (like Whisper) to buffer audio until end of speech
    
    // Check if connecting to LiveKit Cloud (enhanced noise cancellation is Cloud-only)
    const isLiveKitCloud = process.env.LIVEKIT_URL?.includes('livekit.cloud') ?? false;
    
    await session.start({
      agent: new Assistant(),
      room: ctx.room,
      inputOptions: {
        // LiveKit Cloud enhanced noise cancellation
        // - Only use when connecting to LiveKit Cloud (not available for self-hosted)
        // - For telephony applications, use `BackgroundVoiceCancellationTelephony` for best results
        ...(isLiveKitCloud && {
          noiseCancellation: BackgroundVoiceCancellation(),
        }),
      },
    });

    // Join the room and connect to the user
    await ctx.connect();
  },
});

cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));
