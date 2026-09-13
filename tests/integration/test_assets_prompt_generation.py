from __future__ import annotations

import time


def _project(client):
    response = client.post(
        "/api/v1/projects",
        json={
            "title": "H3 Flow",
            "description": "角色在异星荒漠建立基地",
            "useDescriptionForAiPrompt": True,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def _upload_image(client, project_id: str):
    response = client.post(
        f"/api/v1/projects/{project_id}/assets",
        files={"file": ("terry.png", b"PNG-FAKE-BYTES", "image/png")},
        data={"name": "Terry 主视觉", "category": "character", "tags": '["主角"]'},
    )
    assert response.status_code == 201, response.text
    return response.json()


def _task(client, project_id: str, asset_id: str):
    response = client.post(
        f"/api/v1/projects/{project_id}/tasks",
        json={
            "title": "特瑞驾驶越野车",
            "summary": "特瑞继续向基地移动",
            "userIntent": "特瑞驾驶越野车穿过荒漠",
            "userPrompt": "特瑞驾驶越野车高速穿过荒漠",
            "promptSource": "user",
            "durationSeconds": 6,
            "generation": {
                "resolution": "1080p",
                "quality": "标准",
                "mode": "全能参考",
                "contextMode": "不承接",
                "target": "minimax-h3",
            },
            "assetBindings": [
                {"assetId": asset_id, "reference": "<Picture 1>", "role": "角色外观"}
            ],
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def _wait_job(client, job_id: str):
    deadline = time.time() + 3
    while time.time() < deadline:
        response = client.get(f"/api/v1/jobs/{job_id}")
        assert response.status_code == 200
        data = response.json()
        if data["status"] in {"completed", "failed"}:
            return data
        time.sleep(0.02)
    raise AssertionError("job did not finish")


def test_asset_name_is_independent_and_delete_checks_bindings(client) -> None:
    project = _project(client)
    asset = _upload_image(client, project["id"])
    assert asset["name"] == "Terry 主视觉"
    assert asset["originalFileName"] == "terry.png"
    assert not asset["projectRelativePath"].startswith("/")

    renamed = client.patch(
        f"/api/v1/projects/{project['id']}/assets/{asset['id']}",
        json={"name": "Terry 雨夜造型"},
    )
    assert renamed.status_code == 200
    assert renamed.json()["originalFileName"] == "terry.png"

    task = _task(client, project["id"], asset["id"])
    blocked = client.delete(f"/api/v1/projects/{project['id']}/assets/{asset['id']}")
    assert blocked.status_code == 409
    assert blocked.json()["error"]["code"] == "ASSET_IN_USE"
    assert task["assetCount"] == 1


def test_prompt_enhancement_uses_bound_real_media_and_keeps_revision_history(
    client, providers
) -> None:
    prompt_provider, _ = providers
    project = _project(client)
    asset = _upload_image(client, project["id"])
    task = _task(client, project["id"], asset["id"])

    payload = {
        "target": "minimax-h3",
        "userPrompt": "让特瑞冲过断层",
        "media": [{"assetId": asset["id"], "reference": "<Picture 1>", "role": "角色外观"}],
        "context": {"includeProjectBackground": True, "includePreviousTaskSummary": False},
        "generation": {"durationSeconds": 6, "mode": "全能参考", "contextMode": "不承接"},
    }
    first = client.post(
        f"/api/v1/projects/{project['id']}/tasks/{task['id']}/prompt-enhancements",
        json=payload,
    )
    assert first.status_code == 201, first.text
    second = client.post(
        f"/api/v1/projects/{project['id']}/tasks/{task['id']}/prompt-enhancements",
        json={**payload, "userPrompt": "让特瑞跃过断层并稳定落地"},
    )
    assert second.status_code == 201, second.text

    assert len(prompt_provider.requests) == 2
    assert prompt_provider.requests[0].media[0].path.read_bytes() == b"PNG-FAKE-BYTES"
    assert "异星荒漠" in prompt_provider.requests[0].user_text
    assert "<Picture 1>" in prompt_provider.requests[0].user_text

    history = client.get(
        f"/api/v1/projects/{project['id']}/tasks/{task['id']}/prompt-revisions"
    )
    assert history.status_code == 200
    items = history.json()["items"]
    assert len(items) == 2
    assert items[0]["id"] != items[1]["id"]
    assert items[0]["includePreviousTaskSummary"] is False


def test_generation_keeps_job_snapshot_and_result_history(client, providers) -> None:
    _, video_provider = providers
    project = _project(client)
    asset = _upload_image(client, project["id"])
    task = _task(client, project["id"], asset["id"])

    first_submit = client.post(
        f"/api/v1/projects/{project['id']}/tasks/{task['id']}/generation",
        json={"seed": 42},
    )
    assert first_submit.status_code == 202, first_submit.text
    first_job = first_submit.json()
    finished = _wait_job(client, first_job["id"])
    assert finished["status"] == "completed", finished

    stored_job = client.app.state.container.generation_service.get_job(first_job["id"])
    original_snapshot = stored_job.final_prompt_snapshot
    assert original_snapshot.startswith("特瑞驾驶")
    assert video_provider.requests[0].assets[0].path.read_bytes() == b"PNG-FAKE-BYTES"

    editor = client.get(
        f"/api/v1/projects/{project['id']}/tasks/{task['id']}/editor"
    ).json()
    update = client.patch(
        f"/api/v1/projects/{project['id']}/tasks/{task['id']}",
        json={
            "title": editor["title"],
            "summary": editor["summary"],
            "userIntent": editor["userIntent"],
            "userPrompt": "完全不同的新提示词",
            "aiEnhancedPrompt": editor["aiEnhancedPrompt"],
            "promptSource": "user",
            "durationSeconds": 6,
            "generation": editor["generation"],
            "assetBindings": editor["assetBindings"],
            "editorPreference": editor["editorPreference"],
            "revision": editor["revision"],
        },
    )
    assert update.status_code == 200, update.text
    assert (
        client.app.state.container.generation_service.get_job(
            first_job["id"]
        ).final_prompt_snapshot
        == original_snapshot
    )

    second_submit = client.post(
        f"/api/v1/projects/{project['id']}/tasks/{task['id']}/generation",
        json={},
    )
    assert second_submit.status_code == 202
    assert _wait_job(client, second_submit.json()["id"])["status"] == "completed"

    results = client.get(
        f"/api/v1/projects/{project['id']}/tasks/{task['id']}/results"
    ).json()["items"]
    assert len(results) == 2
    workspace = client.get(f"/api/v1/projects/{project['id']}/workspace").json()
    assert workspace["tasks"][0]["resultCount"] == 2
    assert workspace["tasks"][0]["status"] == "completed"
