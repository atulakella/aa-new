#!/usr/bin/env python3

import argparse
import json
import mailbox
import subprocess
import sys

from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path


LORE_URL = "https://lore.kernel.org/all/"
AUTHOR_EMAIL = "atul.akella@gmail.com"


def fetch_mailbox(output_path: Path) -> None:
    """Fetch authored Lore threads, including replies, as an mbox."""

    command = [
        "lei",
        "q",
        "-I", LORE_URL,
        "--threads",
        "--format", "mboxrd",
        f"f:{AUTHOR_EMAIL}",
    ]

    print("Fetching Lore threads...")

    with output_path.open("wb") as output:
        subprocess.run(
            command,
            stdout=output,
            stderr=sys.stderr,
            check=True,
        )


def parse_message(message) -> dict:
    """Convert an email message into a JSON-compatible record."""

    body = ""

    parts = message.walk() if message.is_multipart() else [message]

    for part in parts:
        if part.get_content_type() != "text/plain":
            continue

        if part.get_content_disposition() == "attachment":
            continue

        raw = part.get_payload(decode=True)

        if raw:
            charset = part.get_content_charset() or "utf-8"
            body = raw.decode(charset, errors="replace")
            break

    date_value = message.get("Date")
    parsed_date = None

    if date_value:
        try:
            parsed_date = parsedate_to_datetime(date_value)
            if parsed_date.tzinfo is None:
                parsed_date = parsed_date.replace(tzinfo=timezone.utc)
            parsed_date = parsed_date.astimezone(timezone.utc).isoformat()
        except (TypeError, ValueError, OverflowError):
            pass

    return {
        "message_id": message.get("Message-ID", "").strip(),
        "from": message.get("From", ""),
        "to": message.get("To", ""),
        "cc": message.get("Cc", ""),
        "date": parsed_date,
        "subject": message.get("Subject", ""),
        "in_reply_to": message.get("In-Reply-To", ""),
        "references": message.get("References", "").split(),
        "headers": {
            "list_id": message.get("List-Id", ""),
            "list_post": message.get("List-Post", ""),
            "list_archive": message.get("List-Archive", ""),
            "list_help": message.get("List-Help", ""),
        },
        "body": body,

    }


def parse_mailbox(mbox_path: Path) -> list[dict]:
    """Parse and deduplicate messages by Message-ID."""

    messages = {}
    mailbox_file = mailbox.mbox(mbox_path)

    for message in mailbox_file:
        record = parse_message(message)
        message_id = record["message_id"]

        if not message_id:
            continue

        messages[message_id] = record

    return sorted(
        messages.values(),
        key=lambda item: item["date"] or "",
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fetch Linux kernel contribution threads from Lore."
    )

    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/lore.json"),
        help="Output JSON path (default: data/lore.json)",
    )

    args = parser.parse_args()

    args.output.parent.mkdir(parents=True, exist_ok=True)

    temporary_mbox = args.output.with_suffix(".mbox")

    try:
        fetch_mailbox(temporary_mbox)
        messages = parse_mailbox(temporary_mbox)

        result = {
            "source": LORE_URL,
            "author": AUTHOR_EMAIL,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "message_count": len(messages),
            "messages": messages,
        }

        args.output.write_text(
            json.dumps(result, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )

        print(f"Collected {len(messages)} unique messages.")
        print(f"Saved to {args.output}")

    except subprocess.CalledProcessError as error:
        print(f"lei failed with exit code {error.returncode}", file=sys.stderr)
        return error.returncode

    finally:
        temporary_mbox.unlink(missing_ok=True)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())