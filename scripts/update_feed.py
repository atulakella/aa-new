#!/usr/bin/env python3

import subprocess
import sys

from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent

STAGES = [
    ("Fetch Lore threads", "scripts/lore/fetch_lore.py"),
    ("Normalize Lore contributions", "scripts/lore/normalize_lore.py"),
    ("Fetch GitHub pull requests", "scripts/github/fetch_github.py"),
    ("Normalize contribution feed", "scripts/normalize.py"),
    ("Verify upstream commits", "scripts/verify_upstream.py"),
]


def main() -> int:
    for description, script in STAGES:
        print(f"\n=== {description} ===", flush=True)

        try:
            subprocess.run(
                [sys.executable, str(ROOT / script)],
                cwd=ROOT,
                check=True,
            )
        except subprocess.CalledProcessError as error:
            print(
                f"\nPipeline stopped: {description} failed "
                f"with exit code {error.returncode}.",
                file=sys.stderr,
            )
            return error.returncode or 1

    print("\nContribution feed update completed.", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
