"""Optional audio backends: local TTS and forced alignment.

TTS and alignment are backends, not the point of the feature. Nothing here is
required for the default silent workflow, and no cloud account is required.
"""

from __future__ import annotations

import importlib.util
import json
import pathlib
import shutil
import subprocess


class AudioError(Exception):
    pass


def probe_duration(path: str | pathlib.Path) -> float:
    if not shutil.which("ffprobe"):
        raise AudioError("ffprobe not found (install ffmpeg) to measure audio")
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "json", str(path)], capture_output=True, text=True)
    if r.returncode != 0:
        raise AudioError(f"ffprobe failed on {path}")
    return float(json.loads(r.stdout)["format"]["duration"])


# ---------------------------------------------------------------------------
# TTS
# ---------------------------------------------------------------------------
def gemini_status() -> dict:
    try:
        from tts_gemini import auth_status
        return auth_status()
    except Exception as exc:  # pragma: no cover
        return {"available": False, "mode": None, "detail": f"gemini adapter unavailable: {exc}"}


def tts_backends() -> dict:
    return {"say": bool(shutil.which("say")), "pyttsx3": _has("pyttsx3"),
            "gemini": gemini_status()["available"]}


def voice_backends() -> dict:
    """Backend availability for doctor output and selection (never credentials)."""
    gem = gemini_status()
    say = bool(shutil.which("say"))
    return {
        "gemini": {"available": gem["available"], "mode": gem["mode"], "detail": gem["detail"],
                   "quality": "expressive synthesized narration (preferred)"},
        "macos-say": {"available": say, "mode": "local" if say else None,
                      "detail": "macOS say (local fallback / smoke test)" if say else "say not on PATH",
                      "quality": "intelligible but flat; fallback only"},
        "pyttsx3": {"available": _has("pyttsx3"), "mode": "local" if _has("pyttsx3") else None,
                    "detail": "pyttsx3", "quality": "fallback only"},
        "recorded": {"available": True, "mode": "human",
                     "detail": "human recording + forced alignment (highest quality)", "quality": "human"},
    }


def select_backend(requested: str = "auto", *, prefer=("gemini", "macos-say", "pyttsx3")) -> str:
    name = "macos-say" if requested == "say" else requested
    backends = voice_backends()
    if name in (None, "", "auto"):
        for candidate in prefer:
            if backends[candidate]["available"]:
                return candidate
        return "none"
    if name == "silent":
        return "silent"
    if name not in backends:
        raise AudioError(f"unknown TTS backend '{requested}' (have: {', '.join(backends)})")
    if not backends[name]["available"]:
        raise AudioError(f"backend '{name}' unavailable: {backends[name]['detail']}")
    return name


def synthesize(text: str, out_path: pathlib.Path, backend: str = "auto",
               voice: str | None = None) -> dict:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    backend = "say" if backend == "macos-say" else backend
    if backend == "auto":
        backend = select_backend("auto")
        if backend == "macos-say":
            backend = "say"
        elif backend == "gemini":
            raise AudioError("gemini needs a delivery plan; use tts_narration.py --backend gemini")
    if backend == "say":
        cmd = ["say", "-o", str(out_path)]
        if voice:
            cmd += ["-v", voice]
        cmd.append(text)
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0:
            raise AudioError(f"'say' failed: {r.stderr.strip()}")
        return {"backend": "say", "path": str(out_path), "duration": probe_duration(out_path)}
    if backend == "pyttsx3":
        try:
            import pyttsx3
        except Exception as exc:  # pragma: no cover
            raise AudioError("pyttsx3 not installed") from exc
        engine = pyttsx3.init()
        if voice:
            engine.setProperty("voice", voice)
        engine.save_to_file(text, str(out_path))
        engine.runAndWait()
        return {"backend": "pyttsx3", "path": str(out_path), "duration": probe_duration(out_path)}
    raise AudioError("no local TTS backend available (macOS 'say' or pyttsx3)")


# ---------------------------------------------------------------------------
# forced alignment
# ---------------------------------------------------------------------------
def alignment_backends() -> dict:
    return {"whisperx": _has("whisperx"), "estimated": True}


def align(audio_path: pathlib.Path, data: dict, backend: str = "auto",
          language: str = "en") -> tuple[list[dict], str]:
    """Return (word_times, method).

    whisperx is used when installed; otherwise timing is estimated by scaling the
    transcript's estimated word times to the recording duration. Estimated
    alignment is labelled honestly, not presented as forced alignment.
    """
    if backend == "auto":
        backend = "whisperx" if _has("whisperx") else "estimated"
    if backend == "whisperx":
        return _align_whisperx(audio_path, data, language), "whisperx-forced-alignment"
    return _align_estimated(audio_path, data), "estimated-from-duration"


def _align_estimated(audio_path: pathlib.Path, data: dict) -> list[dict]:
    duration = probe_duration(audio_path)
    estimated = data.get("duration_seconds")
    words = []
    for scene in data["scenes"]:
        for beat in scene["narration"]:
            for w in beat.get("words_timed", []):
                words.append(w)
    if not words:
        words = _reestimate_words(data)
    est_total = estimated or (words[-1]["end"] if words else duration)
    scale = duration / est_total if est_total else 1.0
    return [{"word": w["word"], "start": round(w["start"] * scale, 3),
             "end": round(w["end"] * scale, 3)} for w in words]


def _reestimate_words(data: dict) -> list[dict]:
    from transcript import _distribute, words_of, speaking_seconds
    out = []
    t = 0.0
    for scene in data["scenes"]:
        for beat in scene["narration"]:
            words = words_of(beat["text"])
            d = speaking_seconds(words, beat["text"], data.get("target_wpm", 140))
            out.extend(_distribute(words, t, d))
            t += d + beat.get("dwell_seconds", 0.0)
    return out


def _align_whisperx(audio_path: pathlib.Path, data: dict, language: str) -> list[dict]:
    import whisperx  # type: ignore

    device = "cpu"
    audio = whisperx.load_audio(str(audio_path))
    model_a, metadata = whisperx.load_align_model(language_code=language, device=device)
    # Build segments from the canonical transcript so the text is not re-inferred.
    segments = []
    for scene in data["scenes"]:
        for beat in scene["narration"]:
            segments.append({"start": beat.get("start", 0.0), "end": beat.get("end", 0.0),
                             "text": beat["text"]})
    result = whisperx.align(segments, model_a, metadata, audio, device,
                            return_char_alignments=False)
    out = []
    for seg in result["segments"]:
        for w in seg.get("words", []):
            if "start" in w and "end" in w:
                out.append({"word": w["word"], "start": round(w["start"], 3),
                            "end": round(w["end"], 3)})
    return out


def _has(name: str) -> bool:
    return importlib.util.find_spec(name) is not None
