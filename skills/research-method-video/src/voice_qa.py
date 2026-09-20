"""Voice QA: static narration checks and audio sanity checks.

This module never claims to measure "human-likeness" from waveform statistics.
It checks what can be checked: writing that is hard to speak, delivery metadata
that is missing or too short, and audio that is clipped, inaudible, or has the
wrong length. Listening remains a human judgement.
"""

from __future__ import annotations

import json
import pathlib
import re
import shutil
import subprocess
import wave

from delivery import DEFAULT_PROFILE, delivery_for
from qa_transcript import MAX_SENTENCE_WORDS, GLOSSARY_STOP
from transcript import ACRONYM, PAPER_PROSE, SENTENCE_SPLIT, words_of

COMMON_LAST_WORDS = {"the", "a", "an", "it", "is", "to", "of", "and", "that", "this", "in",
                     "on", "for", "with", "as", "at", "we", "you", "be", "are", "was"}
MIN_CHUNK_SECONDS = 6.0
MAX_CHUNK_SECONDS = 28.0
PADDING_WARN_SECONDS = 1.5
PADDING_HIGH_SECONDS = 3.0


def _add(findings: list[dict], level: str, where: str, message: str) -> None:
    findings.append({"level": level, "where": where, "message": message})


# ---------------------------------------------------------------------------
# static checks
# ---------------------------------------------------------------------------
def static_findings(data: dict, plan: dict | None = None) -> list[dict]:
    findings: list[dict] = []
    narration_cfg = data.get("narration") or {}
    profile = (plan or {}).get("profile") or narration_cfg.get("profile") or DEFAULT_PROFILE
    min_dwell = int((narration_cfg.get("pacing") or {}).get("min_concept_dwell_ms", 500))

    openings: dict[str, int] = {}
    endings: dict[str, int] = {}
    seen_terms: set[str] = set()

    for scene in data.get("scenes", []):
        for beat in scene.get("narration", []):
            where = f"{scene['id']}/{beat['beat_id']}"
            text = str(beat.get("text", ""))
            sentences = [s.strip() for s in SENTENCE_SPLIT.split(text) if s.strip()]
            if sentences:
                opening = " ".join(words_of(sentences[0])[:2]).lower()
                if opening:
                    openings[opening] = openings.get(opening, 0) + 1
                for s in sentences:
                    ws = [w.lower() for w in words_of(s)]
                    if ws and ws[-1] not in COMMON_LAST_WORDS:
                        endings[ws[-1]] = endings.get(ws[-1], 0) + 1
            for s in sentences:
                if len(words_of(s)) > MAX_SENTENCE_WORDS:
                    _add(findings, "warning", where,
                         f"sentence has {len(words_of(s))} words; hard to speak in one breath")
            if PAPER_PROSE.search(text):
                _add(findings, "warning", where, f"paper-like prose: '{PAPER_PROSE.search(text).group(0)}'")

            novel = [w for w in {t.lower() for t in words_of(text)} - GLOSSARY_STOP
                     if w not in seen_terms and len(w) > 4]
            seen_terms.update(w.lower() for w in words_of(text))
            if len(novel) > 2 and len(sentences) >= 2:
                _add(findings, "warning", where,
                     f"{len(novel)} new technical terms in one beat; split the concept")
            for m in ACRONYM.finditer(text):
                ac = m.group(0)
                if ac.lower() in ("ok", "us", "i", "id", "url", "http"):
                    continue
                if not re.search(rf"\(({ac})\)|({ac})\s*\(", text):
                    _add(findings, "warning", where, f"acronym '{ac}' used without expansion")
            d = delivery_for(beat, profile=profile, narration_cfg=narration_cfg)
            if beat.get("kind") in ("introduction", "equation") and d["pause_after_ms"] < min_dwell:
                _add(findings, "warning", where,
                     f"only {d['pause_after_ms']}ms pause after a new concept (want {min_dwell}ms)")
            if beat.get("kind") in ("aha", "conclusion") and not d["direction"]:
                _add(findings, "info", where, "no delivery direction for a key beat; add one for expressiveness")

    repeated_openings = {k: v for k, v in openings.items() if v >= 3}
    if repeated_openings:
        worst = max(repeated_openings, key=repeated_openings.get)
        _add(findings, "warning", "narration",
             f"{repeated_openings[worst]} beats open with '{worst}'; vary the transitions")
    repeated_endings = {k: v for k, v in endings.items() if v >= 4}
    if repeated_endings:
        worst = max(repeated_endings, key=repeated_endings.get)
        _add(findings, "warning", "narration",
             f"{repeated_endings[worst]} sentences end with '{worst}'; cadence may feel repetitive")

    for chunk in (plan or {}).get("chunks", []):
        secs = chunk.get("estimated_seconds", 0.0)
        if secs and secs < MIN_CHUNK_SECONDS:
            _add(findings, "warning", chunk["chunk_id"],
                 f"chunk is ~{secs:.1f}s; merge it with a neighbour to avoid a prosody reset")
        if secs and secs > MAX_CHUNK_SECONDS:
            _add(findings, "warning", chunk["chunk_id"],
                 f"chunk is ~{secs:.1f}s; split it for voice consistency")
    return findings


# ---------------------------------------------------------------------------
# audio checks
# ---------------------------------------------------------------------------
def _wav_peak(path: pathlib.Path) -> tuple[float, float]:
    with wave.open(str(path), "rb") as w:
        frames = w.readframes(w.getnframes())
        rate = w.getframerate()
        width = w.getsampwidth()
        duration = w.getnframes() / float(rate)
    if width != 2:
        return 0.0, duration
    peak = 0
    for i in range(0, len(frames) - 1, 2):
        sample = int.from_bytes(frames[i:i + 2], "little", signed=True)
        peak = max(peak, abs(sample))
    return peak / 32768.0, duration


def _ffmpeg_stats(path: pathlib.Path) -> dict:
    if not shutil.which("ffmpeg"):
        return {}
    out: dict = {}
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "volumedetect",
                        "-f", "null", "-"], capture_output=True, text=True)
    for line in (r.stderr or "").splitlines():
        m = re.search(r"mean_volume:\s*(-?[\d.]+) dB", line)
        if m:
            out["mean_volume_db"] = float(m.group(1))
        m = re.search(r"max_volume:\s*(-?[\d.]+) dB", line)
        if m:
            out["max_volume_db"] = float(m.group(1))
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-af",
                        "silencedetect=n=-45dB:d=2.5", "-f", "null", "-"],
                       capture_output=True, text=True)
    silences = [float(m.group(1)) for m in re.finditer(r"silence_duration:\s*([\d.]+)", r.stderr or "")]
    if silences:
        out["longest_silence"] = max(silences)
    return out


def audio_findings(path: pathlib.Path, *, estimated_seconds: float | None = None,
                   is_chunk: bool = False) -> list[dict]:
    findings: list[dict] = []
    where = path.stem
    if not path.exists():
        _add(findings, "error", where, f"audio file missing: {path}")
        return findings
    stats = _ffmpeg_stats(path)
    duration = None
    peak = None
    if path.suffix == ".wav":
        peak, duration = _wav_peak(path)
    if duration is None:
        duration = stats.get("duration")
    if peak is not None and peak >= 0.999:
        _add(findings, "warning", where, "audio is clipped (peak at full scale); lower the input level")
    mean = stats.get("mean_volume_db")
    if mean is not None and mean < -30:
        _add(findings, "warning", where, f"audio is quiet (mean {mean:.1f} dB); raise the level")
    if mean is not None and mean > -8:
        _add(findings, "warning", where, f"audio is loud (mean {mean:.1f} dB); check clipping")
    silence = stats.get("longest_silence")
    if silence and silence > 2.5:
        _add(findings, "warning", where, f"{silence:.1f}s of continuous silence; check for a stalled take")
    if duration and estimated_seconds:
        if duration > estimated_seconds * 1.6:
            _add(findings, "warning", where,
                 f"audio runs {duration:.1f}s vs ~{estimated_seconds:.1f}s estimated; speech may be rushed or over-paused")
        elif duration < estimated_seconds * 0.5:
            _add(findings, "warning", where,
                 f"audio is {duration:.1f}s vs ~{estimated_seconds:.1f}s estimated; check for dropped words")
    if is_chunk and duration and (duration < 4.0 or duration > 30.0):
        _add(findings, "warning", where, f"chunk is {duration:.1f}s; keep chunks between 4s and 30s")
    return findings


def padding_findings(scene_audio: dict[str, float], rendered: dict[str, float]) -> list[dict]:
    """End-frame padding: audio longer than the rendered animation."""
    findings: list[dict] = []
    for sid, audio in scene_audio.items():
        video = rendered.get(sid)
        if not video:
            continue
        pad = audio - video
        if pad > PADDING_HIGH_SECONDS:
            _add(findings, "error", sid,
                 f"narration is {pad:.1f}s longer than the animation; rebuild the pacing around the audio, "
                 "do not finish the narration on a frozen frame")
        elif pad > PADDING_WARN_SECONDS:
            _add(findings, "warning", sid,
                 f"narration is {pad:.1f}s longer than the animation; re-pace or re-render with --timing transcript")
    return findings


# ---------------------------------------------------------------------------
# aggregate
# ---------------------------------------------------------------------------
def qa(data: dict, plan: dict | None = None, *, audio_dir: pathlib.Path | None = None,
       rendered: dict[str, float] | None = None, manifest: dict | None = None) -> list[dict]:
    findings = static_findings(data, plan)
    scene_audio: dict[str, float] = {}
    if manifest:
        for scene in manifest.get("scenes", []):
            scene_audio[scene["id"]] = scene.get("duration", 0.0)
    if audio_dir and audio_dir.exists():
        for path in sorted(audio_dir.glob("*.wav")) + sorted(audio_dir.glob("*.aiff")):
            if path.stem in {s["id"] for s in data.get("scenes", [])}:
                est = next((s.get("duration_seconds") for s in data["scenes"] if s["id"] == path.stem), None)
                findings.extend(audio_findings(path, estimated_seconds=est))
                if path.stem not in scene_audio:
                    scene_audio[path.stem] = _ffmpeg_stats(path).get("duration") or 0.0
        chunk_dir = audio_dir / "chunks"
        if chunk_dir.exists():
            for path in sorted(chunk_dir.glob("*.wav")):
                findings.extend(audio_findings(path, is_chunk=True))
    if rendered:
        findings.extend(padding_findings(scene_audio, rendered))
    return findings


def summarize(findings: list[dict]) -> dict:
    return {"errors": sum(1 for f in findings if f["level"] == "error"),
            "warnings": sum(1 for f in findings if f["level"] == "warning"),
            "infos": sum(1 for f in findings if f["level"] == "info"),
            "findings": findings}


def write_report(findings: list[dict], path: pathlib.Path) -> dict:
    report = summarize(findings)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    return report
