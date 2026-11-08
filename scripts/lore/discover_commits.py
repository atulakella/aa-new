import json
import re
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

RAW = Path("data/lore.json")
CONTRIBUTIONS = Path("data/lore-contributions.json")
OUTPUT = Path("data/discovered-commits.json")

REPOSITORIES = {
    "torvalds/linux": {
        "url": "https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git",
        "branches": ["master"],
    },
    "remoteproc/linux": {
        "url": "https://git.kernel.org/pub/scm/linux/kernel/git/remoteproc/linux.git",
        "branches": ["rproc-next", "rproc-fixes", "rpmsg-next", "for-next"],
    },
}


def normalize_subject(subject):
    return " ".join(subject.casefold().split())


def patch_subject(subject):
    subject = re.sub(r"^(Re:\s*)+", "", subject, flags=re.I).strip()
    match = re.match(r"^\[(?:PATCH|RFC)(?:\s+[^\]]*)?\]\s*(.*)$", subject, re.I)
    if not match:
        return None

    # Exclude cover letters such as [PATCH 0/2].
    if re.match(r"^(?:PATCH|RFC)\s+0/", subject, re.I):
        return None

    return match.group(1).strip()


class CommitParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows = []
        self.row = None
        self.anchor = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "tr":
            self.row = {"links": [], "text": ""}
        elif tag == "a" and self.row is not None:
            self.anchor = {"href": attrs.get("href", ""), "text": ""}
        elif tag == "br" and self.row is not None:
            self.row["text"] += " "

    def handle_data(self, data):
        if self.row is not None:
            self.row["text"] += data
        if self.anchor is not None:
            self.anchor["text"] += data

    def handle_endtag(self, tag):
        if tag == "a" and self.anchor is not None:
            if self.row is not None:
                self.row["links"].append(self.anchor)
            self.anchor = None
        elif tag == "tr" and self.row is not None:
            self.rows.append(self.row)
            self.row = None


def search_branch(repo, branch, subject):
    params = urllib.parse.urlencode({
        "h": branch,
        "qt": "grep",
        "q": subject,
    })
    url = repo["url"] + "/log/?" + params
    request = urllib.request.Request(
        url, headers={"User-Agent": "Mozilla/5.0"}
    )

    with urllib.request.urlopen(request, timeout=20) as response:
        html = response.read().decode("utf-8", errors="replace")

    parser = CommitParser()
    parser.feed(html)

    matches = []
    for row in parser.rows:
        row_text = " ".join(row["text"].split())

        for link in row["links"]:
            if "/commit/" not in link["href"]:
                continue

            parsed = urllib.parse.urlparse(link["href"])
            sha = urllib.parse.parse_qs(parsed.query).get("id", [""])[0]
            if not re.fullmatch(r"[0-9a-f]{40}", sha):
                continue

            author_matches = "atul akella" in row_text.casefold() and any(
                "atul akella" in item["text"].casefold()
                for item in row["links"]
            )
            commit_subject = " ".join(link["text"].split())

            if (
                author_matches
                and normalize_subject(commit_subject) == normalize_subject(subject)
            ):
                matches.append({
                    "repository": repo["url"],
                    "branch": branch,
                    "sha": sha,
                    "subject": commit_subject,
                    "author": "Atul Akella",
                    "url": urllib.parse.urljoin(repo["url"] + "/", link["href"]),
                    "matched_patch_subject": subject,
                    "row": row_text,
                })

    return matches


def main():
    raw = json.loads(RAW.read_text())
    contributions = json.loads(CONTRIBUTIONS.read_text())["contributions"]
    messages = {m["message_id"]: m for m in raw["messages"]}

    results = []

    for contribution in contributions:
        project = contribution.get("project", "Linux kernel")
        if project != "Linux kernel":
            continue

        subjects = []
        for message_id in contribution["message_ids"]:
            message = messages.get(message_id)
            if not message:
                continue

            subject = patch_subject(message["subject"])
            if subject and subject not in subjects:
                subjects.append(subject)

        matches = []
        errors = []

        for subject in subjects:
            for repo_name, repo in REPOSITORIES.items():
                for branch in repo["branches"]:
                    try:
                        found = search_branch(repo, branch, subject)
                        for item in found:
                            item["repository_name"] = repo_name
                        matches.extend(found)
                    except Exception as exc:
                        errors.append({
                            "repository": repo_name,
                            "branch": branch,
                            "subject": subject,
                            "error": str(exc),
                        })

        unique = {
            (item["repository_name"], item["branch"], item["sha"]): item
            for item in matches
        }

        results.append({
            "contribution_id": contribution["id"],
            "title": contribution["title"],
            "patch_subjects": subjects,
            "matches": list(unique.values()),
            "errors": errors,
        })

        print(f'{contribution["title"]}: {len(unique)} commit match(es)')

    OUTPUT.write_text(json.dumps({"contributions": results}, indent=2) + "\n")
    print(f"\nSaved discovery results to {OUTPUT}")


if __name__ == "__main__":
    main()
