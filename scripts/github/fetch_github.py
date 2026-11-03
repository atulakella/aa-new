#!/usr/bin/env python3

import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


REPOSITORY = "OpenAMP/open-amp"
AUTHOR = "atulakella"
OUTPUT = Path("data/github.json")


def fetch_pull_requests():
    pull_requests = []
    page = 1

    while True:
        url = (
            f"https://api.github.com/repos/{REPOSITORY}/pulls"
            f"?state=all&per_page=100&page={page}"
        )

        request = urllib.request.Request(
            url,
            headers={"Accept": "application/vnd.github+json"},
        )

        with urllib.request.urlopen(request, timeout=30) as response:
            batch = json.load(response)

        if not batch:
            break

        for pr in batch:
            if pr["user"]["login"].lower() != AUTHOR.lower():
                continue

            pull_requests.append({
                "number": pr["number"],
                "title": pr["title"],
                "url": pr["html_url"],
                "state": pr["state"],
                "status": (
                    "merged" if pr["merged_at"]
                    else "closed" if pr["state"] == "closed"
                    else "open"
                ),
                "created_at": pr["created_at"],
                "updated_at": pr["updated_at"],
                "closed_at": pr["closed_at"],
                "merged_at": pr["merged_at"],
                "labels": [label["name"] for label in pr["labels"]],
                "base_branch": pr["base"]["ref"],
                "head_sha": pr["head"]["sha"],
                "merge_commit_sha": pr["merge_commit_sha"],
            })

        if len(batch) < 100:
            break

        page += 1

    return pull_requests


def main():
    pull_requests = fetch_pull_requests()

    result = {
        "source": "github",
        "repository": REPOSITORY,
        "author": AUTHOR,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "pull_request_count": len(pull_requests),
        "pull_requests": pull_requests,
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(result, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"Found {len(pull_requests)} pull requests.")
    print(f"Saved to {OUTPUT}")


if __name__ == "__main__":
    main()