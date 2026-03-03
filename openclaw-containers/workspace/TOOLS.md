# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Audio Transcription

### whisper-cpp (Local)
- **Engine:** whisper.cpp v1.7.1
- **Model:** ggml-tiny.bin (español, 75MB)
- **Script:** `/usr/local/bin/transcribe-audio.sh`
- **Model path:** `/usr/local/share/whisper-models/ggml-tiny.bin`
- **Uso:** Automático en mensajes de voz de Telegram
- **Pipeline:** OGG → FFmpeg → WAV (16kHz mono) → Whisper → Texto

### Capacidades
- ✅ Transcripción automática de audios en español
- ✅ Sin APIs externas (100% local)
- ✅ Modelo optimizado para velocidad
- ✅ Soporte para múltiples formatos: OGG, MP3, WAV, FLAC

### Manual Usage (si necesitas transcribir manualmente)
```bash
transcribe-audio.sh /path/to/audio.ogg
```

---

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.
