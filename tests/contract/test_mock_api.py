from __future__ import annotations

import asyncio

from fastapi.testclient import TestClient
from shotmill.devtools.mock_api import create_mock_app


def test_mock_api_serves_a_stateful_frontend_scenario(tmp_path) -> None:
    application = asyncio.run(create_mock_app(tmp_path / "mock-api"))

    with TestClient(application) as client:
        projects = client.get("/api/v1/projects").json()["items"]
        assert len(projects) == 1
        assert projects[0]["title"] == "雨夜仓库 · Mock 项目"
        assert projects[0]["taskCount"] == 3
        assert projects[0]["assetCount"] == 2

        project_id = projects[0]["id"]
        workspace = client.get(f"/api/v1/projects/{project_id}/workspace").json()
        assert [item["title"] for item in workspace["tasks"]] == [
            "抵达仓库",
            "推门进入",
            "待补充任务",
        ]

        assets = client.get(f"/api/v1/projects/{project_id}/assets").json()["items"]
        assert {item["category"] for item in assets} == {"character", "scene"}
        assert all(item["thumbnailUrl"].startswith("/media/") for item in assets)

        task_id = workspace["tasks"][1]["id"]
        editor = client.get(
            f"/api/v1/projects/{project_id}/tasks/{task_id}/editor"
        ).json()
        assert editor["promptSource"] == "ai"
        assert editor["aiEnhancedPrompt"]

        revisions = client.get(
            f"/api/v1/projects/{project_id}/tasks/{task_id}/prompt-revisions"
        ).json()["items"]
        assert len(revisions) == 1
        assert revisions[0]["providerId"] == "shotmill-mock-prompt"


def test_mock_api_uses_the_same_paths_and_schemas_as_the_real_api(tmp_path) -> None:
    from shotmill.app import create_app as create_real_app

    mock_schema = asyncio.run(create_mock_app(tmp_path / "mock-api")).openapi()
    real_schema = create_real_app().openapi()

    assert mock_schema["paths"] == real_schema["paths"]
    assert mock_schema["components"]["schemas"] == real_schema["components"]["schemas"]
