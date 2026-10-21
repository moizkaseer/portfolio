import respx
from httpx import Response

from app.knowledge.bm25 import BM25Index
from app.tools import ToolContext
from app.tools.scheduling import build as build_scheduling_tools

FALLBACK_URL = "https://calendly.com/moizkaseer/30-min-intro-call"


def make_ctx(settings) -> ToolContext:
    return ToolContext(
        settings=settings, index=BM25Index(), known_slugs=[], toolbox_names=[], prompt_state=None, client_ip=None
    )


def test_get_availability(settings, content_dir):
    ctx = make_ctx(settings)
    result = build_scheduling_tools(ctx)["get_availability"].execute({})
    assert result["status"] == "available"
    assert result["bookingUrl"] == FALLBACK_URL


def test_propose_meeting_slots_without_token_falls_back_to_the_link(settings, content_dir):
    settings = settings  # calendly_token is None by default in the fixture
    ctx = make_ctx(settings)
    result = build_scheduling_tools(ctx)["propose_meeting_slots"].execute({})
    assert result["slots"] == []
    assert result["schedulingUrl"] == FALLBACK_URL
    assert "no calendly" in result["note"].lower() or "token" in result["note"].lower()


def test_propose_meeting_slots_with_token_lists_times_and_never_books(tmp_path, content_dir):
    from conftest import make_settings

    s = make_settings(tmp_path, content_dir, calendly_token="fake-token")

    with respx.mock(assert_all_called=True) as mock:
        mock.get("https://api.calendly.com/users/me").mock(
            return_value=Response(200, json={"resource": {"uri": "https://api.calendly.com/users/ABC"}})
        )
        mock.get("https://api.calendly.com/event_types").mock(
            return_value=Response(
                200,
                json={
                    "collection": [
                        {
                            "uri": "https://api.calendly.com/event_types/XYZ",
                            "slug": "30-min-intro-call",
                            "scheduling_url": FALLBACK_URL,
                        }
                    ]
                },
            )
        )
        mock.get("https://api.calendly.com/event_type_available_times").mock(
            return_value=Response(
                200,
                json={
                    "collection": [
                        {"status": "available", "start_time": "2026-11-01T15:00:00.000000Z", "scheduling_url": FALLBACK_URL},
                        {"status": "available", "start_time": "2026-11-01T16:00:00.000000Z", "scheduling_url": FALLBACK_URL},
                    ]
                },
            )
        )

        ctx = make_ctx(s)
        result = build_scheduling_tools(ctx)["propose_meeting_slots"].execute({})

    assert result["schedulingUrl"] == FALLBACK_URL
    assert len(result["slots"]) == 2
    # the only assertion that matters for "never books": no booking/invitee endpoint was ever registered,
    # so respx's assert_all_called would have failed loudly had the client tried to call anything else, and
    # we never provided a route for POST /scheduled_events or similar booking endpoints.
    assert "never claim" in result["note"].lower() or "book" in result["note"].lower()
