import httpx
from fastapi import HTTPException

from app.config import get_settings


async def synthesize_speech(text: str) -> bytes:
    settings = get_settings()
    if not settings.elevenlabs_api_key:
        raise HTTPException(status_code=503, detail="ElevenLabs is not configured.")

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{settings.elevenlabs_voice_id}"
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {"stability": 0.45, "similarity_boost": 0.75},
    }
    headers = {
        "xi-api-key": settings.elevenlabs_api_key,
        "accept": "audio/mpeg",
        "content-type": "application/json",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(url, json=payload, headers=headers)
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="ElevenLabs speech synthesis failed.")
    return response.content
