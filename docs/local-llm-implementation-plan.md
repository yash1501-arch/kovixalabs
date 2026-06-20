# AISMOS Local LLM Implementation Plan

> **Created**: 2026-06-11
> **Project**: KOVIXAILABS AISMOS - AI Social Media Operating System
> **Goal**: Replace paid OpenAI/OpenRouter LLM providers with a free, self-hosted, self-learning local LLM

---

## 1. Hardware Environment

### Current Machine (Narayan-PC)

| Component | Specification |
|-----------|---------------|
| **Processor** | Intel Core i5-7400 @ 3.00 GHz (4 cores, 4 threads, 7th gen) |
| **RAM** | 8 GB DDR4 |
| **Storage** | 466 GB SSD (WD Blue SA510 2.5" 500GB) |
| **GPU** | NVIDIA GeForce GT 730 (2 GB VRAM, Kepler architecture, Compute Capability 3.5) |
| **OS** | Windows 10 Pro 22H2 (Build 19045.6396) |
| **System Type** | 64-bit, x64-based processor |

### Hardware Limitations (Honest Assessment)

| Bottleneck | Impact | Decision |
|------------|--------|----------|
| **GT 730 2GB VRAM** | Cannot train or run any meaningful LLM; no modern CUDA support (CC 3.5, PyTorch 2.0+ dropped) | **CPU-only inference** |
| **8 GB RAM** | Fits only 1-3B quantized models with ~3-4 GB headroom | **Tiny models only (qwen2.5:1.5b)** |
| **i5-7400 4C/4T** | ~10-15 tokens/sec on CPU | Acceptable for single-user |
| **No GPU training** | QLoRA/fine-tuning not feasible | **Deferred training to cloud (Kaggle/Vast.ai optional)** |

---

## 2. Architecture Decision

### Chosen Approach: Cloud-Train + Local-Inference (Hybrid)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         LOCAL-ONLY ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  WINDOWS HOST                                                           │
│  ┌─────────────────┐    ┌──────────────────────────────────────────┐   │
│  │   Ollama         │    │  Docker Containers                       │   │
│  │   (Native)       │    │  ┌────────────────────────────────────┐  │   │
│  │   Port 11434     │◀───┤  │ AI Service (FastAPI)              │  │   │
│  │                  │    │  │ › LocalLLMProvider                 │  │   │
│  │  qwen2.5:1.5b    │    │  │   → http://host.docker.internal:   │  │   │
│  │  (chat model)    │    │  │     11434/api/chat                 │  │   │
│  └─────────────────┘    │  │ › LocalEmbeddingProvider            │  │   │
│                         │  │   → sentence-transformers           │  │   │
│  sentence-transformers   │  │   (BAAI/bge-small-en-v1.5)         │  │   │
│  (bge-small, Python)    │  └────────────────────────────────────┘  │   │
│                         │  ┌────────────────────────────────────┐  │   │
│                         │  │ API Service (Node.js/Express)      │  │   │
│                         │  │ Web Service (Next.js)              │  │   │
│                         │  │ PostgreSQL, Redis, Qdrant          │  │   │
│                         │  └────────────────────────────────────┘  │   │
│                         └──────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Provider Chain (Future-Proof)

```
Request → TaskClassifier → Priority Chain:
  1. LocalLLMProvider   (Ollama, qwen2.5:1.5b, CPU, FREE)
  2. CloudLLMProvider   (vLLM/TGI on Vast.ai RunPod, FUTURE)
  3. OpenAIProvider     (GPT-4o-mini, LAST RESORT, paid)
```

---

## 3. Model Selection

### Chosen Models

| Role | Model | License | Size | RAM | Speed | Quality |
|------|-------|---------|------|-----|-------|---------|
| **Primary LLM** | `qwen2.5:1.5b` | Apache 2.0 | ~1 GB (Q4_K_M) | 2-3 GB | ~15 tok/s | Best <2B |
| **Embeddings** | `BAAI/bge-small-en-v1.5` | MIT | 33M params (~130 MB) | 500 MB | ~100 texts/sec | MTEB 62.3 |
| **Alternative LLM** | `phi3:mini` | MIT | ~2.5 GB (Q4_K_M) | 4-5 GB | ~10 tok/s | Better reasoning |

### Why qwen2.5:1.5b?

1. **Apache 2.0 license** — no restrictions for commercial use
2. **Smallest viable** for instruction following (fits 8GB RAM with headroom)
3. **Strong benchmarks** — best under-2B model as of 2025-2026
4. **Active development** — frequent updates, good quantization support
5. **Multilingual** — supports English, Chinese, and others

### Why bge-small-en-v1.5 over Ollama embeddings?

| Reason | Detail |
|--------|--------|
| **Faster** | 50-100 texts/sec CPU vs ~10-20 via Ollama |
| **Smaller** | 384-dim vectors → smaller Qdrant storage |
| **Lighter** | 130 MB vs ~1 GB for nomic-embed-text |
| **Independent** | Works without Ollama running |
| **Better benchmarked** | MTEB score 62.3, well-documented |

---

## 4. Activity-to-Model Mapping

| AISMOS Module | Primary Model | Feasibility | Quality |
|---------------|---------------|-------------|---------|
| **Copy AI** (short posts, tweets, captions) | qwen2.5:1.5b (local) | ✅ Excellent | Good |
| **Copy AI** (long-form, LinkedIn, blog) | qwen2.5:1.5b (local, chained) | ✅ Good | Fair |
| **Hashtag Generation** | qwen2.5:1.5b (local) | ✅ Excellent | Good |
| **Brand Memory Ingestion** | bge-small (local) + Qdrant | ✅ Excellent | Good |
| **Brand Memory Search** | bge-small (local) + Qdrant | ✅ Excellent | Good |
| **Content Planning** | qwen2.5:1.5b (local) | ✅ Good | Fair |
| **Trend Analysis** | qwen2.5:1.5b (local) | ✅ Fair | Fair |
| **Analytics Summaries** | qwen2.5:1.5b (local, template-driven) | ✅ Fair | Fair |
| **Learning Insights** | qwen2.5:1.5b (local) | ✅ Fair | Fair |
| **Autopilot Scheduling** | qwen2.5:1.5b (local) | ✅ Fair | Fair |
| **Image Generation** | External API (Stability/Replicate) | ❌ Not local | - |
| **Video Generation** | External API (Runway/Pika) | ❌ Not local | - |
| **Music Generation** | External API (Suno/Udio) | ❌ Not local | - |
| **Voiceover/TTS** | External API (ElevenLabs) | ❌ Not local | - |
| **Agent Swarm (multi-step)** | Simplified single-step → Cloud future | ⚠️ Limited | Poor |
| **Fine-tuning** | Cloud GPU only (Kaggle/Vast.ai) | ❌ Not local | - |

### What the Local Model CANNOT Do

| Capability | Why | Alternative |
|------------|-----|-------------|
| Image generation | Requires GPU + diffusion models | External API (Stability, Replicate) |
| Video generation | Requires GPU + video models | External API (Runway, Pika) |
| Music generation | Requires GPU + audio models | External API (Suno, Udio) |
| Voice synthesis | Requires GPU + TTS models | External API (ElevenLabs) |
| Complex reasoning | 1.5B context window too small | Chain prompts, defer to cloud |
| Multi-step agent workflows | Unreliable with small models | Simplify to single-step tasks |
| Fine-tuning | Needs 12GB+ VRAM | Kaggle free (T4×2, 30h/wk) |

---

## 5. Implementation Phases

### Phase 1: Core Local Providers (Week 1, Days 1-2)

**Goal**: Working `LocalLLMProvider` + `LocalEmbeddingProvider` integrated into AI service

#### Files to Create

| # | File | Description |
|---|------|-------------|
| 1 | `services/ai/app/services/local_llm.py` | Ollama `/api/chat` client, streaming, JSON mode, health check, model listing |
| 2 | `services/ai/app/services/local_embeddings.py` | `sentence-transformers` wrapper for `bge-small-en-v1.5`, batch encoding |
| 3 | `services/ai/app/services/prompt_templates.py` | Optimized prompts for 1.5B: shorter, few-shot, chained for complex tasks |

#### Files to Modify

| # | File | Changes |
|---|------|---------|
| 4 | `services/ai/app/config.py` | Add: `LLM_PROVIDER=local`, `OLLAMA_BASE_URL=http://host.docker.internal:11434`, `LOCAL_CHAT_MODEL=qwen2.5:1.5b`, `OLLAMA_TIMEOUT=120`, `OLLAMA_NUM_CTX=2048`, `EMBEDDING_PROVIDER=local`, `LOCAL_EMBEDDING_MODEL=BAAI/bge-small-en-v1.5`, `LOCAL_EMBEDDING_DIM=384` |
| 5 | `services/ai/app/services/llm.py` | Factory: update `create_llm_provider()` to return `LocalLLMProvider` when `LLM_PROVIDER=local`. Add `LocalLLMProvider` class. |
| 6 | `services/ai/app/services/embeddings.py` | Factory: update `create_embedding_provider()` for local. Add `LocalEmbeddingProvider` class. |
| 7 | `services/ai/app/main.py` | Startup: verify Ollama connectivity, log model info, auto-pull model if missing |
| 8 | `.env.example` | Document all local settings |

#### Python Dependencies (`services/ai/requirements.txt`)

```
sentence-transformers>=3.0.0
torch>=2.4.0 --index-url https://download.pytorch.org/whl/cpu
httpx>=0.27.0
```

### Phase 2: Model Management & Docker Integration (Week 1, Days 2-3)

**Goal**: REST API for model management + Docker wiring for Windows host

#### Files to Create

| # | File | Description |
|---|------|-------------|
| 9 | `services/ai/app/services/model_manager.py` | List/pull/delete models via Ollama API, verify availability, health check |
| 10 | `services/ai/app/routers/models.py` | REST: `GET /models`, `POST /models/pull`, `DELETE /models/{name}`, `GET /models/{name}/status` |

#### Files to Modify

| # | File | Changes |
|---|------|---------|
| 11 | `services/ai/app/routers/__init__.py` | Register `models` router |
| 12 | `services/ai/Dockerfile` | Add `sentence-transformers`, `torch` (CPU only), build dependencies |
| 13 | `docker-compose.yml` | AI service: add `extra_hosts: ["host.docker.internal:host-gateway"]`, set env vars for local provider |

### Phase 3: Router Integration & Prompt Optimization (Week 1-2, Days 3-5)

**Goal**: All AI routers working with local model config, acceptable quality

#### Files to Modify

| # | File | Changes |
|---|------|---------|
| 14 | `services/ai/app/routers/copy.py` | Reduce variants to 2, use optimized prompts, chain if needed (outline → draft) |
| 15 | `services/ai/app/routers/hashtags.py` | Simplify prompt, fewer examples, simpler schema |
| 16 | `services/ai/app/routers/embed.py` | Use local embeddings provider, update dimension (384 vs 1536) |
| 17 | `services/ai/app/routers/memory.py` | Test vector search with new embedding dim, update Qdrant collection |
| 18 | `services/ai/app/routers/images.py` | Return 503 with message: "Image generation unavailable locally. Configure external API." |
| 19 | `services/ai/app/routers/video.py` | Return 503 with message |
| 20 | `services/ai/app/routers/voiceover.py` | Return 503 with message |

#### Files to Create

| # | File | Description |
|---|------|-------------|
| 21 | `services/ai/app/services/task_classifier.py` | Heuristic: classify task complexity → route to local vs cloud (future) |

#### Qdrant Migration

Current: 1536-dim (OpenAI embedding), new: 384-dim (bge-small)

| Option | Approach |
|--------|----------|
| **A** (Recommended) | Drop & recreate `brand_memory` collection on startup at 384-dim |
| **B** (Safe) | Create new collection `brand_memory_v2`, migrate gradually |
| **C** | Delete all existing points, recreate collection |

### Phase 4: Web UI Integration (Week 2, Days 5-6)

**Goal**: UI shows local model status, model selector

#### Files to Modify

| # | File | Changes |
|---|------|---------|
| 22 | `apps/web/app/content/content-studio-client.tsx` | Add "Local Model" badge, model selector dropdown, local vs cloud toggle |
| 23 | `apps/web/app/components/ai-social-orbit.tsx` | Visual indicator: local inference status (green dot when active) |
| 24 | `apps/web/app/api/ai/route.ts` | Proxy with optional `model` param passthrough |
| 25 | `apps/web/app/dashboard/dashboard-client.tsx` | Model status widget: show active model, latency, tokens |

### Phase 5: Optimization & Monitoring (Week 2-3, Days 6-7)

**Goal**: Caching, metrics, production readiness

#### Files to Create

| # | File | Description |
|---|------|-------------|
| 26 | `services/ai/app/services/response_cache.py` | Redis cache for embeddings (TTL 1h) and frequent prompts (TTL 10min) |
| 27 | `services/ai/app/services/metrics_collector.py` | Track: latency, tokens/sec, error rate, cache hit ratio per provider |
| 28 | `services/ai/app/middleware/request_logging.py` | Structured logging for AI calls: model, latency, tokens, cache hit |

#### Files to Modify

| # | File | Changes |
|---|------|---------|
| 29 | `services/ai/app/main.py` | Add metrics middleware, cache initialization, startup checks |

## 6. Prompt Engineering Guide (1.5B Models)

### Key Principles

| Principle | Why | How |
|-----------|-----|-----|
| **Keep system prompts <500 tokens** | 1.5B has 2K context, needs room for input | Be concise, omit examples from system prompt |
| **Use 2-3 few-shot examples** | Small models need demonstration | Show input → output pattern in user message |
| **Reduce variants** | 1-2 variants only (not 3-5) | Ask for 1 best, or 2 alternatives |
| **Chain complex tasks** | Break into steps | Outline → Draft → Refine |
| **Be explicit about format** | Small models need structure | Use numbered lists, markdown tables, JSON template |
| **Temperature matters** | Lower = more reliable | 0.3-0.5 for structured, 0.7-0.8 for creative |
| **Repeat instructions** | Small models lose context | Restate format requirement in the user message |

### Template Structure

```python
# Good for 1.5B (CONCISE)
SYSTEM_PROMPT = """You are a social media copywriter for {brand}.
Tone: {tone}. Platform: {platform}.
Output JSON: {{"variants": [{{"caption": "...", "rationale": "..."}}]}}"""

USER_PROMPT = """Topic: {topic}
Objective: {objective}

Example 1:
Input: Product launch, Instagram
Output: {{"caption": "Meet the new XYZ...", "rationale": "Bold hook for launch"}}

Example 2:
Input: Holiday promotion, LinkedIn
Output: {{"caption": "This season, we're...", "rationale": "Professional and warm"}}

Now generate 2 variants for: {topic} on {platform}"""
```

```python
# Bad for 1.5B (TOO LONG - loses context)
SYSTEM_PROMPT = """You are an expert social media content strategist and copywriter... (200+ tokens of role description)...
Here are 5 examples of good copy... (300+ tokens of examples)...
Remember these brand guidelines... (200+ tokens of guidelines)...
Output format specifications... (100+ tokens)..."""
```

### Task Chaining Pattern (for Complex Tasks)

```python
async def generate_long_form_copy(brand_id, topic, platform):
    # Step 1: Outline
    outline_prompt = f"Create 3-point outline for {topic} on {platform}..."
    outline = await local_llm.chat(outline_prompt, max_tokens=300)

    # Step 2: Draft each point
    drafts = []
    for point in parse_outline(outline):
        draft = await local_llm.chat(f"Write 2 sentences for: {point}...", max_tokens=200)
        drafts.append(draft)

    # Step 3: Combine and refine
    combined = "\n".join(drafts)
    final = await local_llm.chat(
        f"Combine these into cohesive {platform} post. Make it flow naturally:\n{combined}",
        max_tokens=400
    )
    return final
```

## 7. Performance Expectations

### On Current Hardware (i5-7400, 8GB RAM, CPU)

| Operation | Model | Latency | Tokens/sec | Acceptable? |
|-----------|-------|---------|------------|-------------|
| Short copy (tweet, 50 tokens) | qwen2.5:1.5b | 2-4s | ~15 | ✅ Good |
| Medium copy (LinkedIn, 150 tokens) | qwen2.5:1.5b | 5-12s | ~15 | ✅ OK |
| Long copy (blog, 400 tokens) | qwen2.5:1.5b | 15-30s | ~15 | ⚠️ Slow, cache recommended |
| Hashtags (10 tags) | qwen2.5:1.5b | 1-3s | ~15 | ✅ Excellent |
| Embeddings (batch 10) | bge-small | 1-3s | ~50-100/s | ✅ Excellent |
| Brand memory search | bge-small + Qdrant | <500ms | - | ✅ Excellent |
| Content plan (weekly) | qwen2.5:1.5b | 5-10s | ~15 | ✅ Good |

### RAM Budget

| Process | RAM Usage |
|---------|-----------|
| Ollama (qwen2.5:1.5b loaded) | ~1.5 GB |
| bge-small (sentence-transformers) | ~500 MB |
| AI Service (FastAPI + Python) | ~200-400 MB |
| PostgreSQL | ~200-500 MB |
| Qdrant | ~100-300 MB |
| Others (Redis, Node.js, Next.js) | ~500-800 MB |
| **Total** | **~3.5-4.5 GB** |
| **Available** | **3.5-4.5 GB free** |

---

## 8. File Change Summary

### New Files (10)

```
services/ai/app/services/local_llm.py           # Phase 1 - Core
services/ai/app/services/local_embeddings.py    # Phase 1 - Core
services/ai/app/services/prompt_templates.py    # Phase 1 - Core
services/ai/app/services/model_manager.py       # Phase 2 - Management
services/ai/app/services/task_classifier.py     # Phase 3 - Routing
services/ai/app/services/response_cache.py      # Phase 5 - Optimization
services/ai/app/services/metrics_collector.py   # Phase 5 - Monitoring
services/ai/app/middleware/request_logging.py   # Phase 5 - Monitoring
services/ai/app/routers/models.py              # Phase 2 - API
```

### Modified Files (16)

```
services/ai/app/config.py                       # Phase 1
services/ai/app/services/llm.py                 # Phase 1
services/ai/app/services/embeddings.py          # Phase 1
services/ai/app/main.py                         # Phase 1, 5
.env.example                                    # Phase 1
services/ai/app/routers/__init__.py             # Phase 2
services/ai/Dockerfile                          # Phase 2
docker-compose.yml                              # Phase 2
services/ai/app/routers/copy.py                 # Phase 3
services/ai/app/routers/hashtags.py             # Phase 3
services/ai/app/routers/embed.py                # Phase 3
services/ai/app/routers/memory.py               # Phase 3
services/ai/app/routers/images.py               # Phase 3
services/ai/app/routers/video.py                # Phase 3
services/ai/app/routers/voiceover.py            # Phase 3
apps/web/app/content/content-studio-client.tsx  # Phase 4
apps/web/app/components/ai-social-orbit.tsx     # Phase 4
apps/web/app/api/ai/route.ts                    # Phase 4
apps/web/app/dashboard/dashboard-client.tsx     # Phase 4
```

### Total: 26 files (10 new, 16 modified)

---

## 9. Prerequisites (Already Done ✓)

- ✅ Ollama installed on Windows (`winget install Ollama.Ollama` or ollama.com/download)
- ✅ Models pulled: `ollama pull qwen2.5:1.5b`
- ✅ Docker Desktop with WSL2 integration
- ✅ Verify: `curl http://host.docker.internal:11434/api/tags`

### Setup Commands

```powershell
# 1. Pull the recommended model
ollama pull qwen2.5:1.5b

# 2. Start Ollama server (run in background)
ollama serve

# 3. Verify from WSL2 or PowerShell
curl http://host.docker.internal:11434/api/tags
# Expected: {"models":[{"name":"qwen2.5:1.5b",...}]}

# 4. Install Python deps (for local embeddings)
pip install sentence-transformers torch --index-url https://download.pytorch.org/whl/cpu
```

---

## 10. Known Limitations (Accepted)

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| **No fine-tuning locally** | Cannot deeply adapt to brand voice | Strong prompt engineering + few-shot examples + RAG (brand memory) |
| **2K context window** | Limited brand memory per request | Retrieve top-3 only, summarize context |
| **No vision/audio** | Images, video, music, voiceover unavailable locally | External API integration (future) |
| **1.5B reasoning limits** | Complex multi-step tasks fail | Chain prompts: plan → execute → refine |
| **Slow generation** | 10-15 tok/s on CPU | Redis cache for frequent queries, batch embeddings |
| **Single concurrent user** | Cannot handle parallel requests | Sequential queue, moderate usage |

---

## 11. Future Enhancements (When Budget Available)

- **Cloud GPU fine-tuning** via Kaggle (free, 30h/wk) or Vast.ai ($0.15-0.34/hr)
- **QLoRA adapter merging** → deploy custom GGUF to Ollama
- **Self-learning loop**: collect feedback → DPO/RLHF → retrain → deploy
- **Upgrade GPU** to RTX 3060 12GB (~$250 used) for local fine-tuning + faster inference
- **Upgrade RAM** to 32 GB for larger models (7B+, phi3:mini, qwen2.5:7b quantized)
- **External API integration** for image/video/music generation
- **Cloud LLM fallback** for complex reasoning tasks

---

## 12. Quick Reference

### Ollama Commands

```powershell
# List installed models
ollama list

# Pull a model
ollama pull qwen2.5:1.5b

# Remove a model
ollama rm qwen2.5:1.5b

# Run interactive
ollama run qwen2.5:1.5b

# API test
curl http://localhost:11434/api/generate -d '{"model":"qwen2.5:1.5b","prompt":"Hi","stream":false}'
```

### Key Environment Variables

```bash
LLM_PROVIDER=local
OLLAMA_BASE_URL=http://host.docker.internal:11434
LOCAL_CHAT_MODEL=qwen2.5:1.5b
OLLAMA_TIMEOUT=120
OLLAMA_NUM_CTX=2048
OLLAMA_NUM_PREDICT=1024
EMBEDDING_PROVIDER=local
LOCAL_EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
LOCAL_EMBEDDING_DIM=384
```

### Docker Networking (Windows)

```yaml
# docker-compose.yml
services:
  ai:
    extra_hosts:
      - "host.docker.internal:host-gateway"
    environment:
      - LLM_PROVIDER=local
      - OLLAMA_BASE_URL=http://host.docker.internal:11434
      - LOCAL_CHAT_MODEL=qwen2.5:1.5b
      - LOCAL_EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
```

---

## 13. Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-11 | **Ollama on Windows host** (not Docker) | Easier GPU passthrough, simpler networking via `host.docker.internal` |
| 2026-06-11 | **qwen2.5:1.5b** as primary LLM | Apache 2.0 license, best <2B model, fits 8GB RAM |
| 2026-06-11 | **BAAI/bge-small-en-v1.5** for embeddings | MIT license, 384-dim, fastest CPU, independent of Ollama |
| 2026-06-11 | **No local fine-tuning** | GT 730 2GB VRAM insufficient; cloud GPU required |
| 2026-06-11 | **Local-only for text**, external APIs for media | Images/video/music cannot run on this hardware |
| 2026-06-11 | **Prompt engineering + RAG** instead of training | Leverage brand memory (Qdrant) + optimized prompts for quality |
| 2026-06-11 | **Provider abstraction** designed for cloud fallback | Future-proof: local → cloud → OpenAI priority chain |
| 2026-06-11 | **Qdrant collection recreated at 384-dim** | Previously 1536-dim for OpenAI; must migrate |

---

## 14. Next Start Point

**Phase 1, Task 1: Create `services/ai/app/services/local_llm.py`**

This is the `LocalLLMProvider` class that wraps Ollama API:

```python
# Key endpoints to implement:
# - /api/chat (POST) - Chat completion
# - /api/tags (GET) - List models
# - /api/pull (POST) - Pull model
# - /api/delete (DELETE) - Remove model

# Methods:
# - chat(messages, temperature, max_tokens) → str
# - chat_json(messages, temperature) → dict (JSON mode)
# - stream_chat(messages, temperature) → AsyncGenerator[str]
# - is_healthy() → bool (ping /api/tags)
# - list_models() → list[dict]
# - pull_model(name) → bool
# - delete_model(name) → bool
```
