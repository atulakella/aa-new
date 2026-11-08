#!/usr/bin/env python3

import json
import re

from datetime import datetime, timezone
from pathlib import Path


LORE_INPUT = Path("data/lore-contributions.json")
GITHUB_INPUT = Path("data/github.json")
OUTPUT = Path("data/contributions.json.tmp")


def classify_lore_project(mailing_lists):
    lists = " ".join(mailing_lists).lower()

    if "u-boot" in lists:
        return "U-Boot"

    return "Linux kernel"


def normalize_lore(data):
    contributions = []

    for item in data["contributions"]:
        project = classify_lore_project(item["mailing_lists"])

        contributions.append({
            "id": "lore-" + item["id"],
            "project": project,
            "repository": None,
            "title": item["title"],
            "subsystem": item["subsystem"],
            "contribution_type": item["patch_type"],
            "source": "lore",
            "status": item.get("status", "under_review"),
            "status_evidence": {
                "type": "lore_thread",
                "message_ids": item["message_ids"],
                "message_count": item["message_count"],
                "application": item.get("status_evidence"),
            },
            "submitted_at": item["submitted_at"],
            "updated_at": (
                item.get("status_evidence") or {}
            ).get("date"),
            "merged_at": None,
            "url": item["lore_url"],
            "mailing_lists": item["mailing_lists"],
            "thread_root": item["thread_root"],
            "patches": item.get("patches", []),
        })

    return contributions


def normalize_github(data):
    contributions = []

    for pr in data["pull_requests"]:
        contributions.append({
            "id": (
                data["repository"].replace("/", "-")
                + "-pr-"
                + str(pr["number"])
            ),
            "project": "OpenAMP",
            "repository": data["repository"],
            "title": pr["title"],
            "subsystem": None,
            "contribution_type": "PULL_REQUEST",
            "source": "github",
                        "status": (
                "upstream" if pr["merged_at"]
                else "under_review"
            ),
            "status_evidence": {
                "type": "github_pull_request",
                "pr_number": pr["number"],
                "state": pr["state"],
                "merged_at": pr["merged_at"],
                "merge_commit_sha": pr["merge_commit_sha"],
            },
            "submitted_at": pr["created_at"],
            "updated_at": pr["updated_at"],
            "merged_at": pr["merged_at"],
            "url": pr["url"],
            "pull_request": {
                "number": pr["number"],
                "labels": pr["labels"],
                "base_branch": pr["base_branch"],
                "head_sha": pr["head_sha"],
                "merge_commit_sha": pr["merge_commit_sha"],
            },
        })

    return contributions

STATUS_RANK = {
    "under_review": 0,
    "maintainer_applied": 1,
    "upstream": 2,
}


def merge_status_evidence(previous, current):
    if not isinstance(previous, dict):
        return current

    if not isinstance(current, dict):
        return previous

    merged = dict(previous)

    for key, value in current.items():
        old_value = merged.get(key)

        if isinstance(old_value, dict) and isinstance(value, dict):
            merged[key] = merge_status_evidence(old_value, value)
        elif value is not None:
            merged[key] = value
        elif key not in merged:
            merged[key] = value

    return merged

def merge_contribution(previous, current):
    if previous is None:
        return current

    merged = dict(previous)
    merged.update(current)

    # Preserve evidence collected by earlier pipeline runs.
    merged["status_evidence"] = merge_status_evidence(
        previous.get("status_evidence"),
        current.get("status_evidence"),
    )

    # Status must never move backwards.
    previous_status = previous.get("status", "under_review")
    current_status = current.get("status", "under_review")

    if STATUS_RANK.get(previous_status, -1) > STATUS_RANK.get(current_status, -1):
        merged["status"] = previous_status

    # Preserve patch IDs if the latest Lore fetch is incomplete.
    if not current.get("patches") and previous.get("patches"):
        merged["patches"] = previous["patches"]

    # Don't lose known timestamps when the latest source omits them.
    for field in ("merged_at", "updated_at"):
        if not merged.get(field) and previous.get(field):
            merged[field] = previous[field]

    return merged

def main():
    lore_data = json.loads(LORE_INPUT.read_text(encoding="utf-8"))
    github_data = json.loads(GITHUB_INPUT.read_text(encoding="utf-8"))

    fresh_contributions = (
        normalize_lore(lore_data)
        + normalize_github(github_data)
    )

    previous_contributions = {}

    previous_output = Path("data/contributions.json")

    if previous_output.exists():
        previous_data = json.loads(
            previous_output.read_text(encoding="utf-8")
        )
        previous_contributions = {
            item["id"]: item
            for item in previous_data.get("contributions", [])
        }

    contributions = [
        merge_contribution(
            previous_contributions.get(item["id"]),
            item,
        )
        for item in fresh_contributions
    ]

    fresh_ids = {
        item["id"] for item in fresh_contributions
    }

    contributions.extend(
        item
        for item_id, item in previous_contributions.items()
        if item_id not in fresh_ids
    )

    contributions.sort(
        key=lambda item: item.get("submitted_at") or "",
        reverse=True,
    )

    result = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "contribution_count": len(contributions),
        "projects": sorted({
            item["project"] for item in contributions
        }),
        "contributions": contributions,
    }

    OUTPUT.write_text(
        json.dumps(result, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    final_output = OUTPUT.with_name("contributions.json")
    OUTPUT.replace(final_output)

    print(f"Generated {len(contributions)} contributions.")
    print("Projects: " + ", ".join(result["projects"]))
    print(f"Saved to {final_output}")


if __name__ == "__main__":
    main()