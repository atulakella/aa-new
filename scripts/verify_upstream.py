#!/usr/bin/env python3

import json
import re
import subprocess
import urllib.error
import urllib.parse
import urllib.request
import tempfile
import os

from datetime import datetime, timezone
from pathlib import Path


INPUT = Path("data/contributions.json")
CACHE = Path("data/upstream-cache.json")

REPOSITORIES = {
    "Linux kernel": "torvalds/linux",
    "U-Boot": "u-boot/u-boot",
}


def save_json(path, data):
    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=path.parent,
            delete=False,
        ) as temp_file:
            json.dump(data, temp_file, indent=2, ensure_ascii=False)
            temp_file.write("\n")
            temp_path = Path(temp_file.name)

        temp_path.replace(path)

    finally:
        if temp_path and temp_path.exists():
            temp_path.unlink()


def github_request(url):
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "contribution-feed-verifier",
    }

    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = urllib.request.Request(url, headers=headers)

    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def get_patch_id(patch_text):
    result = subprocess.run(
        ["git", "patch-id", "--stable"],
        input=patch_text,
        text=True,
        capture_output=True,
    )

    if result.returncode != 0 or not result.stdout.strip():
        return None

    return result.stdout.split()[0]


def find_upstream_commit(repository, patch):
    subject = re.sub(
        r"^\s*\[(?:RFC\s+)?PATCH[^\]]*\]\s*",
        "",
        patch["subject"],
        flags=re.IGNORECASE,
    ).strip()

    query = f'repo:{repository} "{subject}"'
    url = (
        "https://api.github.com/search/commits?"
        + urllib.parse.urlencode({
            "q": query,
            "per_page": 10,
        })
    )

    print(f"  Searching: {subject}")

    try:
        results = json.loads(github_request(url))
    except urllib.error.HTTPError as error:
        print(f"  GitHub search failed: HTTP {error.code}")
        return None
    except Exception as error:
        print(f"  Search error: {error}")
        return None

    for candidate in results.get("items", []):
        sha = candidate["sha"]
        message = candidate["commit"]["message"].splitlines()[0]

        if message.lower().startswith("merge "):
            continue

        patch_url = (
            f"https://github.com/{repository}/commit/{sha}.patch"
        )

        try:
            candidate_patch = github_request(patch_url).decode("utf-8")
        except Exception as error:
            print(f"  Could not download {sha}: {error}")
            continue

        candidate_id = get_patch_id(candidate_patch)

        if candidate_id != patch["patch_id"]:
            continue

        print(f"  Exact match: {sha}")

        return {
            "repository": repository,
            "commit": sha,
            "url": f"https://github.com/{repository}/commit/{sha}",
            "patch_id": candidate_id,
            "commit_date": (
                candidate.get("commit", {})
                .get("committer", {})
                .get("date")
            ),
        }

    print("  No exact patch match found.")
    return None


def main():
    data = json.loads(INPUT.read_text(encoding="utf-8"))

    cache = (
        json.loads(CACHE.read_text(encoding="utf-8"))
        if CACHE.exists()
        else {}
    )

    for contribution in data["contributions"]:
        if contribution.get("source") != "lore":
            continue

        patches = contribution.get("patches", [])

        if not patches:
            continue

        repository = REPOSITORIES.get(contribution["project"])

        if not repository:
            continue

        print(f"\n{contribution['title']}")

        matches = []

        for patch in patches:
            patch_id = patch["patch_id"]
            match = cache.get(patch_id)

            if match and (
                match.get("repository") != repository
                or match.get("patch_id") != patch_id
            ):
                match = None

            if match:
                print(f"  Cached match: {match['commit']}")
            else:
                match = find_upstream_commit(repository, patch)

                if match:
                    cache[patch_id] = match
                    save_json(CACHE, cache)

            if match:
                matches.append({
                    "message_id": patch["message_id"],
                    "patch_id": patch_id,
                    **match,
                })

        if len(matches) != len(patches):
            print(
                f"  Not promoted: matched {len(matches)}"
                f" of {len(patches)} patches."
            )
            continue

        evidence = contribution.setdefault("status_evidence", {})

        evidence["upstream"] = {
            "type": "exact_patch_id_match",
            "repository": repository,
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "matched_patches": matches,
        }

        contribution["status"] = "upstream"

        dates = [
            match["commit_date"]
            for match in matches
            if match.get("commit_date")
        ]

        if dates:
            contribution["merged_at"] = max(dates)
            contribution["updated_at"] = max(dates)

        print(f"  Promoted to upstream ({len(matches)} patches).")

    save_json(INPUT, data)
    print(f"\nUpdated {INPUT}")
    print(f"Updated {CACHE}")


if __name__ == "__main__":
    main()
