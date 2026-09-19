# Audio: TTS and forced alignment

Audio is optional. The canonical workflow is silent, and no cloud account is
required.

## Local TTS

```bash
python scripts/tts_narration.py --project examples/lesa --voice Samantha
```

Backends, checked by `video_doctor.py`:

- **macOS `say`** — free, local, no account. Writes `transcript/audio/<scene>.aiff`.
- **pyttsx3** — optional cross-platform backend.
- Cloud TTS (Speechify/OpenAI/ElevenLabs) is intentionally *not* required.

Local TTS does not expose word boundaries, so timings are **estimated from the
audio duration** and labelled as such. `manim-voiceover` is a compatible future
integration; it is not required.

## Recorded narration → forced alignment

```bash
python scripts/align_recording.py --project examples/lesa --audio narration.wav
```

- If **WhisperX** is installed, the canonical transcript text is force-aligned to
  the recording (word-level timestamps via wav2vec2 phoneme alignment).
- Otherwise the command prints a clear note and falls back to an **estimate**
  that scales the transcript's word times to the audio duration. This is labelled
  `estimated-from-duration`; it is **not** presented as forced alignment.

The canonical transcript text is never replaced by unconstrained ASR output.

## `word_times.json`

```json
{ "method": "estimated | estimated-from-duration | whisperx-forced-alignment",
  "words": [{ "word": "Diffusion", "start": 0.0, "end": 0.081 }] }
```

`word_times.json` is the single source for SRT/VTT, animation cues and karaoke
highlighting; those are generated from it, never maintained separately.

## Honesty

WhisperX and pyttsx3 are not installed in the reference environment, so the
forced-alignment and pyttsx3 paths are implemented but untested there. The macOS
`say` TTS path and the estimated alignment fallback are tested.
