
#!/usr/bin/env python3

import json
import os
import sys
import tempfile
import urllib.error
import urllib.request

from datetime import datetime, timezone
from pathlib import Path


REPOSITORY = "OpenAMP/open-amp"
AUTHOR = "atulakella"
OUTPUT = Path("data/github.json")


def fetch_pull_requests():
    pull_requests = []
    page = 1

    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "aa-contribution-feed",
    }

    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"

    while True:
        url = (
            f"https://api.github.com/repos/{REPOSITORY}/pulls"
            f"?state=all&per_page=100&page={page}"
        )

        request = urllib.request.Request(url, headers=headers)

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


def save_atomically(result):
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=OUTPUT.parent,
            prefix=f".{OUTPUT.name}.",
            suffix=".tmp",
            delete=False,
        ) as temp_file:
            temp_path = Path(temp_file.name)
            json.dump(result, temp_file, indent=2)
            temp_file.write("\n")

        temp_path.replace(OUTPUT)

    finally:
        if temp_path and temp_path.exists():
            temp_path.unlink()


def main():
    try:
        pull_requests = fetch_pull_requests()

    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")

        if error.code == 403:
            remaining = error.headers.get("X-RateLimit-Remaining")
            reset = error.headers.get("X-RateLimit-Reset")

            if remaining == "0" or "rate limit exceeded" in body.lower():
                print("GitHub API rate limit exceeded.")
                print(f"Remaining requests: {remaining}")

                if reset:
                    print(f"Rate limit resets at Unix timestamp: {reset}")
            else:
                print("GitHub API returned HTTP 403 Forbidden.")
                print(body[:500])

        else:
            print(f"GitHub API returned HTTP {error.code}.")
            print(body[:500])

        print(f"Existing cache preserved: {OUTPUT}")
        return 1

    except (urllib.error.URLError, TimeoutError, OSError) as error:
        print(f"GitHub fetch failed: {error}")
        print(f"Existing cache preserved: {OUTPUT}")
        return 1

    except (json.JSONDecodeError, KeyError, TypeError, ValueError) as error:
        print(f"Invalid or unexpected GitHub response: {error}")
        print(f"Existing cache preserved: {OUTPUT}")
        return 1

    result = {
        "source": "github",
        "repository": REPOSITORY,
        "author": AUTHOR,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "pull_request_count": len(pull_requests),
        "pull_requests": pull_requests,
    }

    try:
        save_atomically(result)
    except OSError as error:
        print(f"Failed to save GitHub cache: {error}")
        print(f"Existing cache preserved if replacement did not complete: {OUTPUT}")
        return 1

    print(f"Found {len(pull_requests)} pull requests.")
    print(f"Saved to {OUTPUT}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
