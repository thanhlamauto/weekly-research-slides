"""Gemini TTS adapter (REST, standard library only).

The adapter is deliberately thin: the canonical transcript and the delivery
plan decide what is said and how; this module only turns a chunk prompt into a
WAV file, with deterministic caching, bounded retries and actionable errors.

Auth (never logged, never committed):
  * ``GEMINI_API_KEY`` / ``GOOGLE_API_KEY`` -> ``x-goog-api-key`` header
  * Application Default Credentials -> ``Authorization: Bearer <token>``
    (google-auth when installed, else ``gcloud auth print-access-token``)

Set ``WRS_GEMINI_BASE_URL`` to point at a local mock in tests.
"""

from __future__ import annotations

import base64
import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import time
import urllib.error
import urllib.request
import wave

DEFAULT_MODEL = "gemini-2.5-flash-preview-tts"
DEFAULT_VOICE = "Kore"
DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com"
DEFAULT_TIMEOUT = 120.0
DEFAULT_RETRIES = 2
SAMPLE_RATE = 24000


class GeminiError(Exception):
    pass


# ---------------------------------------------------------------------------
# auth
# ---------------------------------------------------------------------------
def api_key() -> str | None:
    return os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")


def _gcloud_token() -> str | None:
    gcloud = shutil.which("gcloud")
    if not gcloud:
        return None
    try:
        r = subprocess.run([gcloud, "auth", "print-access-token"],
                           capture_output=True, text=True, timeout=30)
    except Exception:
        return None
    token = (r.stdout or "").strip()
    return token if r.returncode == 0 and token else None


def _google_auth_token() -> str | None:
    try:
        import google.auth  # type: ignore
        import google.auth.transport.requests  # type: ignore
    except Exception:
        return None
    try:
        creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
        creds.refresh(google.auth.transport.requests.Request())
        return creds.token
    except Exception:
        return None


def access_token() -> str | None:
    if os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
        token = _google_auth_token()
        if token:
            return token
    return _google_auth_token() or _gcloud_token()


def auth_status() -> dict:
    """Safe, credential-free status for doctor output."""
    if api_key():
        return {"available": True, "mode": "api-key", "warn": False,
                "detail": "GEMINI_API_KEY is set (value never printed)"}
    if os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
        if _google_auth_token():
            return {"available": True, "mode": "adc-service-account", "warn": False,
                    "detail": "Application Default Credentials (service account)"}
        return {"available": False, "mode": "adc-service-account", "warn": False,
                "detail": "GOOGLE_APPLICATION_CREDENTIALS set but no token; install google-auth"}
    if _gcloud_token():
        return {"available": True, "mode": "adc-gcloud-user", "warn": True,
                "detail": ("gcloud user credentials found; the Gemini API commonly rejects "
                           "these with HTTP 403. Prefer GEMINI_API_KEY or a service-account ADC")}
    return {"available": False, "mode": None, "warn": False,
            "detail": "set GEMINI_API_KEY or run 'gcloud auth application-default login'"}


def base_url() -> str:
    return (os.environ.get("WRS_GEMINI_BASE_URL") or DEFAULT_BASE_URL).rstrip("/")


# ---------------------------------------------------------------------------
# cache
# ---------------------------------------------------------------------------
def cache_key(*, model: str, voice: str, prompt: str) -> str:
    """Deterministic key: animation changes never regenerate audio."""
    h = hashlib.sha256()
    for part in (model, voice, prompt):
        h.update(part.encode("utf-8"))
        h.update(b"\x00")
    return h.hexdigest()[:32]


# ---------------------------------------------------------------------------
# transport
# ---------------------------------------------------------------------------
def _urllib_transport(url: str, headers: dict, body: bytes, timeout: float):
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read()
    except urllib.error.URLError as exc:
        raise GeminiError(f"Gemini TTS unreachable ({exc.reason}); check network or WRS_GEMINI_BASE_URL") from exc
    except TimeoutError as exc:
        raise GeminiError(f"Gemini TTS timed out after {timeout:.0f}s") from exc


def request_body(prompt: str, voice: str) -> bytes:
    return json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}},
            },
        },
    }).encode("utf-8")


def _headers() -> dict:
    key = api_key()
    if key:
        return {"Content-Type": "application/json", "x-goog-api-key": key}
    token = access_token()
    if not token:
        raise GeminiError("no Gemini credentials: set GEMINI_API_KEY or run 'gcloud auth application-default login'")
    return {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}


def _parse_audio(payload: bytes) -> bytes:
    try:
        data = json.loads(payload.decode("utf-8"))
    except Exception as exc:
        raise GeminiError(f"Gemini TTS returned non-JSON payload ({len(payload)} bytes)") from exc
    if "error" in data:
        msg = data["error"].get("message", "unknown error")
        raise GeminiError(f"Gemini TTS error: {msg}")
    candidates = data.get("candidates") or []
    if not candidates:
        raise GeminiError("Gemini TTS returned no candidates (prompt may have been blocked)")
    parts = (candidates[0].get("content") or {}).get("parts") or []
    for part in parts:
        inline = part.get("inlineData") or part.get("inline_data")
        if inline and inline.get("data"):
            return base64.b64decode(inline["data"])
    raise GeminiError("Gemini TTS response contained no audio data")


def _write_wav(raw: bytes, out_path: pathlib.Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    if raw[:4] == b"RIFF":
        out_path.write_bytes(raw)
        return
    # Raw PCM 16-bit mono at 24kHz, no WAV header.
    with wave.open(str(out_path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(raw)


def synthesize(text: str, out_path: pathlib.Path, *, model: str = DEFAULT_MODEL,
               voice: str = DEFAULT_VOICE, prompt: str | None = None,
               timeout: float = DEFAULT_TIMEOUT, retries: int = DEFAULT_RETRIES,
               cache_dir: pathlib.Path | None = None, force: bool = False,
               transport=_urllib_transport) -> dict:
    """Synthesize one chunk. Returns {path, duration, cached, key}."""
    prompt = prompt if prompt is not None else text
    key = cache_key(model=model, voice=voice, prompt=prompt)
    out_path = pathlib.Path(out_path)

    if cache_dir is not None and not force:
        cached_wav = pathlib.Path(cache_dir) / f"{key}.wav"
        if cached_wav.exists():
            out_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(cached_wav, out_path)
            return {"path": str(out_path), "duration": probe_duration(out_path),
                    "cached": True, "key": key}

    url = f"{base_url()}/v1beta/models/{model}:generateContent"
    body = request_body(prompt, voice)
    last_error: Exception | None = None
    for attempt in range(retries + 1):
        try:
            status, payload = transport(url, _headers(), body, timeout)
            if status == 200:
                _write_wav(_parse_audio(payload), out_path)
                if cache_dir is not None:
                    cache_dir = pathlib.Path(cache_dir)
                    cache_dir.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(out_path, cache_dir / f"{key}.wav")
                    (cache_dir / f"{key}.json").write_text(json.dumps({
                        "model": model, "voice": voice, "chars": len(text),
                        "prompt_sha256": hashlib.sha256(prompt.encode()).hexdigest(),
                    }, indent=2), encoding="utf-8")
                return {"path": str(out_path), "duration": probe_duration(out_path),
                        "cached": False, "key": key}
            if status in (429, 500, 502, 503, 504) and attempt < retries:
                # Rate limits need a longer pause than transient 5xx errors.
                time.sleep(max(12.0 * (attempt + 1), 12.0) if status == 429 else 2 ** attempt)
                continue
            detail = payload[:300].decode("utf-8", "replace") if payload else ""
            if status in (401, 403):
                raise GeminiError(f"Gemini TTS auth failed (HTTP {status}); check GEMINI_API_KEY / ADC. {detail}".strip())
            raise GeminiError(f"Gemini TTS HTTP {status}: {detail}")
        except GeminiError as exc:
            last_error = exc
            if "timed out" in str(exc) and attempt < retries:
                time.sleep(2 ** attempt)
                continue
            raise
    raise GeminiError(str(last_error) if last_error else "Gemini TTS failed")


def probe_duration(path: pathlib.Path) -> float:
    with wave.open(str(path), "rb") as w:
        return round(w.getnframes() / float(w.getframerate()), 3)


# ---------------------------------------------------------------------------
# chunk plan -> audio, then stitch per scene
# ---------------------------------------------------------------------------
def synthesize_plan(plan: dict, out_dir: pathlib.Path, *, model: str = DEFAULT_MODEL,
                    voice: str = DEFAULT_VOICE, force: bool = False,
                    transport=_urllib_transport, delay: float = 0.0) -> dict:
    out_dir = pathlib.Path(out_dir)
    chunk_dir = out_dir / "chunks"
    cache_dir = out_dir / "cache"
    manifest_path = out_dir / "audio_manifest.json"
    existing = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
    new_chunk_ids = {c["chunk_id"] for c in plan["chunks"]}
    new_scene_ids = {c["scene_id"] for c in plan["chunks"]}
    kept_chunks = [c for c in existing.get("chunks", []) if c["chunk_id"] not in new_chunk_ids]
    kept_scenes = [s for s in existing.get("scenes", []) if s["id"] not in new_scene_ids]
    models = sorted({c.get("model", model) for c in kept_chunks} | {model})
    manifest = {"backend": "gemini", "models": models, "voice": voice,
                "chunks": kept_chunks, "scenes": kept_scenes}
    by_scene: dict[str, list[dict]] = {}
    for i, chunk in enumerate(plan["chunks"]):
        out = chunk_dir / f"{chunk['chunk_id']}.wav"
        cached = (cache_dir / f"{cache_key(model=model, voice=voice, prompt=chunk['prompt'])}.wav").exists()
        if i > 0 and delay > 0 and not cached and not force:
            time.sleep(delay)
        info = synthesize(chunk["text"], out, model=model, voice=voice,
                          prompt=chunk["prompt"], cache_dir=cache_dir, force=force,
                          transport=transport)
        entry = {"chunk_id": chunk["chunk_id"], "scene_id": chunk["scene_id"],
                 "beat_ids": chunk["beat_ids"], "path": str(out.relative_to(out_dir)),
                 "duration": info["duration"], "cached": info["cached"], "key": info["key"],
                 "model": model}
        manifest["chunks"].append(entry)
        by_scene.setdefault(chunk["scene_id"], []).append(entry)

    for scene_id, entries in by_scene.items():
        scene_wav = out_dir / f"{scene_id}.wav"
        pauses = _scene_pauses(plan, scene_id)
        stitch([out_dir / e["path"] for e in entries], pauses, scene_wav)
        manifest["scenes"].append({
            "id": scene_id, "path": str(scene_wav.relative_to(out_dir)),
            "duration": probe_duration(scene_wav), "model": entries[0].get("model", model),
            "chunks": [e["chunk_id"] for e in entries],
        })
    manifest["chunks"].sort(key=lambda c: c["chunk_id"])
    manifest["scenes"].sort(key=lambda s: s["id"])
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    return manifest


def _scene_pauses(plan: dict, scene_id: str) -> list[float]:
    """Silence between consecutive chunks: previous pause_after + next pause_before."""
    chunks = [c for c in plan["chunks"] if c["scene_id"] == scene_id]
    pauses = []
    for prev, nxt in zip(chunks, chunks[1:]):
        after = int(prev["delivery"][prev["beat_ids"][-1]]["pause_after_ms"])
        before = int(nxt["delivery"][nxt["beat_ids"][0]]["pause_before_ms"])
        pauses.append(min(1.2, (after + before) / 1000.0))
    return pauses


def stitch(chunk_paths: list[pathlib.Path], pauses: list[float], out_path: pathlib.Path) -> None:
    """Concatenate chunk WAVs, inserting semantic silence between them."""
    if not chunk_paths:
        raise GeminiError("no chunk audio to stitch")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(chunk_paths[0]), "rb") as first:
        params = first.getparams()
    for path in chunk_paths[1:]:
        with wave.open(str(path), "rb") as w:
            if w.getparams()[:3] != params[:3]:
                raise GeminiError(f"chunk format mismatch in {path.name}; regenerate all chunks together")
    with wave.open(str(out_path), "wb") as out:
        out.setparams(params)
        for i, path in enumerate(chunk_paths):
            if i > 0 and i - 1 < len(pauses) and pauses[i - 1] > 0:
                silence_frames = int(pauses[i - 1] * params.framerate)
                out.writeframes(b"\x00\x00" * silence_frames * params.nchannels)
            with wave.open(str(path), "rb") as w:
                out.writeframes(w.readframes(w.getnframes()))
