import httpx

from app.config import settings


def send_telegram_message(text: str) -> dict:
    if not settings.telegram_bot_token or not settings.telegram_chat_id:
        return {
            "ok": False,
            "skipped": True,
            "detail": "Telegram belum dikonfigurasi (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)",
        }

    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    payload = {
        "chat_id": settings.telegram_chat_id,
        "text": text,
        "disable_web_page_preview": True,
    }
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(url, json=payload)
            data = resp.json()
            if resp.status_code != 200 or not data.get("ok"):
                return {"ok": False, "skipped": False, "detail": data}
            return {"ok": True, "skipped": False, "detail": data}
    except Exception as exc:
        return {"ok": False, "skipped": False, "detail": str(exc)}
