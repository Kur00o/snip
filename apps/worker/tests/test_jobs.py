import asyncio
import json

import httpx

from app.jobs import render_carousel, slide_path
from app.models import Job
from app.poller import Poller
from app.supabase import SupabaseClient

BIZ = "11111111-1111-4111-8111-111111111111"
POST = "22222222-2222-4222-8222-222222222222"
HTML = "<!doctype html><html><body>slide</body></html>"


def job_row(**overrides):
    row = {
        "id": "job-1",
        "business_id": BIZ,
        "kind": "render_carousel",
        "status": "running",
        "attempts": 1,
        "payload": {
            "postId": POST,
            "slides": [
                {"slideId": "s1", "position": 0, "html": HTML},
                {"slideId": "s2", "position": 1, "html": HTML},
                {"slideId": "gone", "position": 2, "html": HTML},
            ],
        },
    }
    row.update(overrides)
    return row


class FakeSupabase:
    """Records every request and answers like PostgREST / Storage would."""

    def __init__(self, jobs):
        self.jobs = list(jobs)
        self.requests: list[httpx.Request] = []

    def handler(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        path = request.url.path
        if path.endswith("/rpc/claim_job"):
            return httpx.Response(200, json=[self.jobs.pop(0)] if self.jobs else [])
        if path.endswith("/rpc/complete_job"):
            return httpx.Response(200, json={})
        if request.method == "GET" and path.endswith("/rest/v1/slides"):
            return httpx.Response(
                200,
                json=[{"id": "s1", "image_path": "old/s1.png"}, {"id": "s2", "image_path": None}],
            )
        if request.method == "PATCH":
            return httpx.Response(200, json=[{}])
        if path.startswith("/storage/v1/object"):
            return httpx.Response(200, json={"Key": "ok"})
        return httpx.Response(404, json={"message": "unexpected"})

    def client(self, key="sb_secret_test"):
        http = httpx.AsyncClient(transport=httpx.MockTransport(self.handler))
        return SupabaseClient("https://x.supabase.co", key, http)

    def calls(self, method, contains):
        return [r for r in self.requests if r.method == method and contains in r.url.path]


class FakeRenderer:
    def __init__(self, fail=False):
        self.fail = fail
        self.calls = 0

    async def render(self, html: str) -> bytes:
        self.calls += 1
        if self.fail:
            raise RuntimeError("Chromium crashed")
        return b"\x89PNG fake"

    async def stop(self) -> None:
        pass


def test_slide_paths_live_in_the_business_folder():
    assert slide_path(BIZ, POST, 0, 123) == f"{BIZ}/posts/{POST}/slide-01-123.png"


def test_render_carousel_uploads_updates_and_cleans_up():
    fake = FakeSupabase([])
    renderer = FakeRenderer()
    job = Job.model_validate(job_row())

    result = asyncio.run(render_carousel(job, fake.client(), renderer, now=99))

    assert result.rendered == ["s1", "s2"]
    assert result.skipped == ["gone"]  # deleted after the job was queued
    assert renderer.calls == 2
    uploads = fake.calls("POST", "/storage/v1/object/renders/")
    assert [u.headers["content-type"] for u in uploads] == ["image/png", "image/png"]
    assert uploads[0].headers["x-upsert"] == "true"
    patches = fake.calls("PATCH", "/rest/v1/slides")
    assert json.loads(patches[0].content) == {"image_path": slide_path(BIZ, POST, 0, 99)}
    removed = fake.calls("DELETE", "/storage/v1/object/renders")
    assert json.loads(removed[0].content) == {"prefixes": ["old/s1.png"]}
    post_update = fake.calls("PATCH", "/rest/v1/posts")[0]
    assert post_update.url.params["status"] == "eq.draft"
    assert json.loads(post_update.content) == {"status": "review"}


def test_secret_keys_go_in_the_apikey_header_only():
    fake = FakeSupabase([])
    asyncio.run(fake.client("sb_secret_abc").rpc("claim_job", {"p_kinds": ["render_carousel"]}))
    asyncio.run(fake.client("aaa.bbb.ccc").rpc("claim_job", {"p_kinds": ["render_carousel"]}))
    first, second = fake.requests
    assert first.headers["apikey"] == "sb_secret_abc"
    assert "authorization" not in first.headers
    assert second.headers["authorization"] == "Bearer aaa.bbb.ccc"


def test_poller_completes_successful_jobs():
    fake = FakeSupabase([job_row()])
    poller = Poller(fake.client(), FakeRenderer(), ["render_carousel"])
    assert asyncio.run(poller.run_once()) is True
    assert asyncio.run(poller.run_once()) is False  # queue empty
    complete = fake.calls("POST", "/rpc/complete_job")
    assert json.loads(complete[0].content) == {"p_job_id": "job-1"}
    assert poller.status.jobs_done == 1


def test_poller_reports_failures_back_for_retry():
    fake = FakeSupabase([job_row()])
    poller = Poller(fake.client(), FakeRenderer(fail=True), ["render_carousel"])
    asyncio.run(poller.run_once())
    body = json.loads(fake.calls("POST", "/rpc/complete_job")[0].content)
    assert body == {"p_job_id": "job-1", "p_error": "Chromium crashed"}
    assert poller.status.jobs_failed == 1


def test_poller_rejects_bad_payloads_and_unknown_kinds():
    fake = FakeSupabase(
        [job_row(payload={"postId": POST, "slides": []}), job_row(id="job-2", kind="edit_reel")]
    )
    poller = Poller(fake.client(), FakeRenderer(), ["render_carousel", "edit_reel"])
    asyncio.run(poller.run_once())
    asyncio.run(poller.run_once())
    errors = [
        json.loads(r.content).get("p_error", "") for r in fake.calls("POST", "/rpc/complete_job")
    ]
    assert errors[0].startswith("Invalid job payload")
    assert "can't handle edit_reel" in errors[1]
