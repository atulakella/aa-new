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


def main():
    lore_data = json.loads(LORE_INPUT.read_text(encoding="utf-8"))
    github_data = json.loads(GITHUB_INPUT.read_text(encoding="utf-8"))

    contributions = (
        normalize_lore(lore_data)
        + normalize_github(github_data)
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