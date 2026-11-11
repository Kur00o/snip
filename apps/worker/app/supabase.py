"""Minimal Supabase REST + Storage client for the worker (service role).

Only what the worker needs: RPC calls, row updates/selects and Storage uploads/deletes.
Talking to the REST API directly keeps the worker light (no extra SDK on an 8 GB laptop).
"""

from typing import Any
from urllib.parse import quote

import httpx

Json = Any  # PostgREST returns arbitrary JSON


class SupabaseError(RuntimeError):
    pass


class SupabaseClient:
    def __init__(self, url: str, secret_key: str, http: httpx.AsyncClient | None = None) -> None:
        self.url = url.rstrip("/")
        headers = {"apikey": secret_key}
        # Legacy service_role keys are JWTs and go in Authorization too; new sb_secret_ keys
        # are only accepted in the apikey header.
        if secret_key.count(".") == 2:
            headers["Authorization"] = f"Bearer {secret_key}"
        self.http = http or httpx.AsyncClient(timeout=60)
        self.headers = headers

    async def close(self) -> None:
        await self.http.aclose()

    async def _request(self, method: str, path: str, **kwargs: object) -> httpx.Response:
        extra = kwargs.pop("headers", None)
        headers = {**self.headers, **(extra if isinstance(extra, dict) else {})}
        response = await self.http.request(
            method,
            f"{self.url}{path}",
            headers=headers,
            **kwargs,  # type: ignore[arg-type]
        )
        if response.status_code >= 400:
            raise SupabaseError(f"{method} {path} → {response.status_code}: {response.text[:300]}")
        return response

    async def rpc(self, name: str, params: dict[str, object]) -> Json:
        response = await self._request("POST", f"/rest/v1/rpc/{name}", json=params)
        return response.json() if response.content else None

    async def select(self, table: str, query: dict[str, str]) -> list[dict[str, Any]]:
        response = await self._request("GET", f"/rest/v1/{table}", params=query)
        data = response.json()
        return data if isinstance(data, list) else []

    async def update(self, table: str, filters: dict[str, str], values: dict[str, Any]) -> int:
        response = await self._request(
            "PATCH",
            f"/rest/v1/{table}",
            params=filters,
            json=values,
            headers={"Prefer": "return=representation"},
        )
        data = response.json()
        return len(data) if isinstance(data, list) else 0

    async def upload(self, bucket: str, path: str, content: bytes, content_type: str) -> None:
        await self._request(
            "POST",
            f"/storage/v1/object/{bucket}/{quote(path)}",
            content=content,
            headers={"Content-Type": content_type, "x-upsert": "true"},
        )

    async def remove(self, bucket: str, paths: list[str]) -> None:
        if paths:
            await self._request("DELETE", f"/storage/v1/object/{bucket}", json={"prefixes": paths})
