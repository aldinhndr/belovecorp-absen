import math

import httpx


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def reverse_geocode(lat: float, lon: float) -> str | None:
    url = "https://nominatim.openstreetmap.org/reverse"
    params = {"lat": lat, "lon": lon, "format": "json", "zoom": 18, "addressdetails": 1}
    headers = {"User-Agent": "BeloveAbsen/1.0 (attendance-system)"}
    try:
        with httpx.Client(timeout=8.0) as client:
            resp = client.get(url, params=params, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("display_name")
    except Exception:
        return None
    return None
