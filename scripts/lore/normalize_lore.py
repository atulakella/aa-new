#!/usr/bin/env python3

import json
import re
import subprocess

from collections import defaultdict
from email.utils import parseaddr
from pathlib import Path


INPUT = Path("data/lore.json")
OUTPUT = Path("data/lore-contributions.json")
USER_EMAIL = "atul.akella@gmail.com"


def get_thread_root(message, by_id, visited=None):
    if visited is None:
        visited = set()

    message_id = message["message_id"]

    if message_id in visited:
        return message_id

    visited.add(message_id)

    references = message.get("references", [])

    if references:
        root = references[0]
        if root in by_id:
            return get_thread_root(by_id[root], by_id, visited)
        return root

    parent = message.get("in_reply_to", "")

    if parent and parent in by_id:
        return get_thread_root(by_id[parent], by_id, visited)

    return message_id


def extract_patch_type(subject):
    match = re.search(r"\[(PATCH|RFC)(?:\s+[^\]]*)?\]", subject, re.I)
    return match.group(1).upper() if match else "DISCUSSION"


def extract_subsystem(subject):
    match = re.search(
        r"\[(?:PATCH|RFC)(?:\s+[^\]]*)?\]\s+([^:]+):",
        subject,
        re.I,
    )
    return match.group(1).strip() if match else "Other"


def clean_title(subject):
    title = re.sub(r"^(?:Re:\s*)+", "", subject, flags=re.I)
    title = re.sub(r"^\[(?:PATCH|RFC)[^\]]*\]\s*", "", title, flags=re.I)
    return title.strip()



def extract_patches(thread):
    patches = []

    for message in thread:
        subject = message.get("subject", "")

        if not re.match(r"^\s*\[PATCH(?:\s+[^\]]*)?\]", subject, re.I):
            continue

        body = message.get("body", "")
        marker = "diff --git "

        if marker not in body:
            continue

        diff = marker + body.split(marker, 1)[1]

        result = subprocess.run(
            ["git", "patch-id", "--stable"],
            input=diff,
            text=True,
            capture_output=True,
            check=True,
        )

        if not result.stdout.strip():
            continue

        patch_id = result.stdout.split()[0]

        patches.append({
            "message_id": message["message_id"],
            "subject": subject,
            "patch_id": patch_id,
        })

    return patches


def detect_application(thread):
    for message in sorted(thread, key=lambda m: m.get("date") or ""):
        sender_email = parseaddr(message.get("from", ""))[1].lower()

        if sender_email == USER_EMAIL:
            continue

        if not message.get("in_reply_to") and not message.get("references"):
            continue

        body_lines = [
            line.strip()
            for line in message.get("body", "").splitlines()
            if not line.lstrip().startswith(">")
        ]

        for line in body_lines:
            if re.fullmatch(
                r"Applied(?:\s+to\b[^.!?]*)?[.!]?",
                line,
                re.IGNORECASE,
            ):
                message_id = message["message_id"]

                return {
                    "status": "maintainer_applied",
                    "status_evidence": {
                        "type": "lore_application_reply",
                        "message_id": message_id,
                        "from": message.get("from"),
                        "date": message.get("date"),
                        "url": (
                            "https://lore.kernel.org/all/"
                            + message_id.strip("<>")
                            + "/"
                        ),
                        "matched_text": line,
                    },
                }

    return {
        "status": "under_review",
        "status_evidence": None,
    }


def normalize(messages):
    by_id = {m["message_id"]: m for m in messages}
    groups = defaultdict(list)

    for message in messages:
        root = get_thread_root(message, by_id)
        groups[root].append(message)

    contributions = []

    for root, thread in groups.items():
        thread.sort(key=lambda m: m.get("date") or "")

        original = next(
            (m for m in thread if m["message_id"] == root),
            thread[0],
        )

        subject = original["subject"]

        mailing_lists = sorted({
            m.get("headers", {}).get("list_id", "Unknown")
            for m in thread
        })

        application = detect_application(thread)

        contributions.append({
            "id": root.strip("<>").replace("@", "-"),
            "thread_root": root,
            "title": clean_title(subject),
            "patch_type": extract_patch_type(subject),
            "subsystem": extract_subsystem(subject),
            "mailing_lists": mailing_lists,
            "submitted_at": original.get("date"),
            "message_count": len(thread),
            "message_ids": [m["message_id"] for m in thread],
            "patches": extract_patches(thread),
            "lore_url": (
                "https://lore.kernel.org/all/"
                + root.strip("<>")
                + "/"
            ),
            "status": application["status"],
            "status_evidence": application["status_evidence"],
        })

    return sorted(
        contributions,
        key=lambda item: item.get("submitted_at") or "",
        reverse=True,
    )


def main():
    data = json.loads(INPUT.read_text(encoding="utf-8"))

    contributions = normalize(data["messages"])

    result = {
        "generated_at": data["fetched_at"],
        "source": data["source"],
        "contribution_count": len(contributions),
        "contributions": contributions,
    }

    OUTPUT.write_text(
        json.dumps(result, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    print(f"Generated {len(contributions)} contributions.")
    print(f"Saved to {OUTPUT}")


if __name__ == "__main__":
    main()
