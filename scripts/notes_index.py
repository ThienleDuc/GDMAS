#!/usr/bin/env python3
"""Generate markdown index tables and validate consistency for .agents/notes/."""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

VALID_DECISIONS = {
    "Pending": "proposed",
    "Changes Requested": "changes_requested",
    "Approved": "approved",
    "Rejected": "rejected",
}
VALID_IMPL_STATUSES = {"planned", "in_progress", "blocked", "validation", "completed"}
VALID_BUG_STATUSES = {
    "open",
    "investigating",
    "fix-in-progress",
    "fixed",
    "wont-fix",
    "duplicate",
    "invalid",
}
VALID_BUG_SEVERITIES = {"critical", "high", "medium", "low"}
VALID_TESTCASE_MODES = {"proposal-paired", "single-file-test"}
VALID_TESTCASE_STATUSES = {"draft", "ready", "passed", "failed_with_bugs"}


@dataclass
class ProposalRecord:
    file_id: str
    path: Path
    title: str = ""
    meta_id: str = ""
    meta_type: str = ""
    meta_status: str = ""
    area: str = ""
    decision: str = ""
    reviewer: str = ""
    review_date: str = ""
    scope_of_rejection: str = ""
    overrides: list[str] = field(default_factory=list)
    superseded_by: list[str] = field(default_factory=list)
    implementation: str = "—"
    testcase: str = "—"


@dataclass
class TestcaseRecord:
    file_id: str
    path: Path
    title: str = ""
    meta_id: str = ""
    mode: str = ""
    proposal: str = ""
    target: str = ""
    test_file: str = ""
    status: str = ""
    related_bugs: str = ""


@dataclass
class BugRecord:
    bug_id: str
    path: Path
    title: str = ""
    status: str = ""
    severity: str = ""
    area: str = ""
    reported: str = ""
    fixed: str = ""
    duplicate_of: str = ""


def _strip_html_comments(text: str) -> str:
    return re.sub(r"<!--.*?-->", "", text, flags=re.DOTALL)


def _extract_bullet_field(text: str, key: str) -> str:
    pattern = rf"^-\s+(?:\*\*)?{re.escape(key)}(?::\*\*|\*\*:|:)\s*(.+?)\s*$"
    match = re.search(pattern, text, flags=re.MULTILINE)
    return match.group(1).strip() if match else ""


def _extract_plain_field(text: str, key: str) -> str:
    pattern = rf"^{re.escape(key)}:\s*(.*?)\s*$"
    match = re.search(pattern, text, flags=re.MULTILINE)
    return match.group(1).strip() if match else ""


def _extract_section(text: str, heading_pattern: str) -> str:
    match = re.search(rf"^##\s+{heading_pattern}\s*$", text, flags=re.MULTILINE)
    if not match:
        return ""
    start = match.end()
    next_heading = re.search(r"^##\s+", text[start:], flags=re.MULTILINE)
    return text[start : start + next_heading.start()] if next_heading else text[start:]


def parse_proposal(path: Path) -> ProposalRecord:
    raw = path.read_text(encoding="utf-8")
    cleaned = _strip_html_comments(raw)
    rec = ProposalRecord(file_id=path.stem, path=path)

    title_match = re.search(r"^#\s+(?:Proposal:\s*)?(.+?)\s*$", cleaned, flags=re.MULTILINE)
    if title_match:
        rec.title = title_match.group(1).strip()

    rec.meta_id = _extract_bullet_field(cleaned, "ID")
    rec.meta_type = _extract_bullet_field(cleaned, "Type")
    rec.meta_status = _extract_bullet_field(cleaned, "Status")
    rec.area = _extract_bullet_field(cleaned, "Area")

    for ov_match in re.finditer(r"^\s*-\s*Overrides:\s*(\S+)", cleaned, flags=re.MULTILINE):
        target = ov_match.group(1).strip().rstrip(".,;")
        if target and target.lower() not in {"none", "-", "<id>"}:
            rec.overrides.append(target)

    review_sec = _extract_section(cleaned, r"9\.\s+Human Review")
    rec.decision = _extract_plain_field(review_sec, "Decision")
    rec.reviewer = _extract_plain_field(review_sec, "Reviewer")
    rec.review_date = _extract_plain_field(review_sec, "Review Date")
    rec.scope_of_rejection = _extract_plain_field(review_sec, "Scope of Rejection")
    return rec


def parse_bug(path: Path) -> BugRecord:
    raw = path.read_text(encoding="utf-8")
    cleaned = _strip_html_comments(raw)
    stem_match = re.match(r"^(BUG-[A-Za-z0-9-]+?)(?:-[a-z0-9].*)?$", path.stem)
    bug_id = stem_match.group(1) if stem_match else path.stem
    id_heading = re.search(r"^#\s+(BUG-[A-Za-z0-9-]+):\s*(.+?)\s*$", cleaned, flags=re.MULTILINE)
    if id_heading:
        bug_id = id_heading.group(1).strip()
        title = id_heading.group(2).strip()
    else:
        t_match = re.search(r"^#\s+(.+?)\s*$", cleaned, flags=re.MULTILINE)
        title = t_match.group(1).strip() if t_match else path.stem

    return BugRecord(
        bug_id=bug_id,
        path=path,
        title=title,
        status=_extract_bullet_field(cleaned, "Status"),
        severity=_extract_bullet_field(cleaned, "Severity"),
        area=_extract_bullet_field(cleaned, "Area"),
        reported=_extract_bullet_field(cleaned, "Reported"),
        fixed=_extract_bullet_field(cleaned, "Fixed"),
        duplicate_of=_extract_bullet_field(cleaned, "Duplicate of"),
    )


def parse_testcase(path: Path) -> TestcaseRecord:
    raw = path.read_text(encoding="utf-8")
    cleaned = _strip_html_comments(raw)
    rec = TestcaseRecord(file_id=path.stem, path=path)

    title_match = re.search(r"^#\s+(?:Testcase:\s*)?(.+?)\s*$", cleaned, flags=re.MULTILINE)
    if title_match:
        rec.title = title_match.group(1).strip()

    rec.meta_id = _extract_bullet_field(cleaned, "ID").strip("`")
    rec.mode = _extract_bullet_field(cleaned, "Mode").strip("`")
    rec.proposal = _extract_bullet_field(cleaned, "Proposal").strip("`")
    rec.target = _extract_bullet_field(cleaned, "Target").strip("`")
    rec.test_file = _extract_bullet_field(cleaned, "Test File").strip("`")
    rec.status = _extract_bullet_field(cleaned, "Status").strip("`")
    rec.related_bugs = _extract_bullet_field(cleaned, "Related Bugs")
    return rec


def _is_note_file(path: Path) -> bool:
    name = path.name
    return (
        path.is_file()
        and path.suffix == ".md"
        and not name.startswith("_")
        and name not in {"README.md", "INDEX.md"}
    )


def load_testcases(root: Path) -> list[TestcaseRecord]:
    tc_dir = root / ".agents" / "notes" / "testcase"
    testcases: list[TestcaseRecord] = []
    if tc_dir.exists():
        for md_file in sorted(tc_dir.glob("*.md")):
            if _is_note_file(md_file):
                testcases.append(parse_testcase(md_file))
    return testcases


def load_notes(root: Path) -> tuple[list[ProposalRecord], dict[str, Path], list[BugRecord]]:
    notes_dir = root / ".agents" / "notes"
    proposed_dir = notes_dir / "proposed"
    impl_dir = notes_dir / "implemented"
    bugs_dir = notes_dir / "bugs"

    proposals: list[ProposalRecord] = []
    if proposed_dir.exists():
        for md_file in sorted(proposed_dir.glob("*.md")):
            if _is_note_file(md_file):
                proposals.append(parse_proposal(md_file))

    impl_dirs: dict[str, Path] = {}
    if impl_dir.exists():
        for item in sorted(impl_dir.iterdir()):
            if item.is_dir() and not item.name.startswith("_"):
                impl_dirs[item.name] = item

    tc_map = {tc.file_id: tc for tc in load_testcases(root)}
    proposal_map = {p.file_id: p for p in proposals}
    for p in proposals:
        if p.file_id in impl_dirs:
            status_file = impl_dirs[p.file_id] / "status.md"
            if status_file.exists():
                status_text = _strip_html_comments(status_file.read_text(encoding="utf-8"))
                st = _extract_bullet_field(status_text, "Status")
                if st:
                    p.implementation = st
        if p.file_id in tc_map and tc_map[p.file_id].status:
            p.testcase = tc_map[p.file_id].status
        for target_id in p.overrides:
            if target_id in proposal_map:
                proposal_map[target_id].superseded_by.append(p.file_id)

    bugs: list[BugRecord] = []
    if bugs_dir.exists():
        for bug_file in sorted(bugs_dir.glob("BUG-*.md")):
            if _is_note_file(bug_file):
                bugs.append(parse_bug(bug_file))

    return proposals, impl_dirs, bugs


def check_notes(root: Path) -> tuple[list[str], list[str]]:
    proposals, impl_dirs, bugs = load_notes(root)
    testcases = load_testcases(root)
    errors: list[str] = []
    warnings: list[str] = []

    proposal_map = {p.file_id: p for p in proposals}
    proposal_ids = set(proposal_map)
    tc_map = {tc.file_id: tc for tc in testcases}

    for p in proposals:
        rel = p.path.relative_to(root) if p.path.is_relative_to(root) else p.path
        if not p.title:
            errors.append(f"{rel}: thiếu tiêu đề `# Proposal: ...`")
        if not p.meta_id:
            errors.append(f"{rel}: thiếu Metadata `- ID:`")
        elif p.meta_id != p.file_id:
            errors.append(f"{rel}: Metadata ID `{p.meta_id}` không khớp tên file `{p.file_id}`")
        if not p.meta_type:
            errors.append(f"{rel}: thiếu Metadata `- Type:`")
        if not p.area:
            errors.append(f"{rel}: thiếu Metadata `- Area:`")
        if p.decision not in VALID_DECISIONS:
            errors.append(
                f"{rel}: §9 `Decision:` không hợp lệ (`{p.decision}`); cần một trong {list(VALID_DECISIONS)}"
            )
        else:
            expected_status = VALID_DECISIONS[p.decision]
            if p.meta_status != expected_status:
                errors.append(
                    f"{rel}: Metadata `Status: {p.meta_status}` lệch với §9 `Decision: {p.decision}` (kỳ vọng `{expected_status}`)"
                )

        if p.decision == "Approved":
            if not p.reviewer or p.reviewer == "-":
                errors.append(f"{rel}: `Decision: Approved` nhưng thiếu `Reviewer:` trong §9")
            if p.file_id not in impl_dirs:
                warnings.append(
                    f"{rel}: `Decision: Approved` nhưng chưa có thư mục `implemented/{p.file_id}/`"
                )
            if p.file_id not in tc_map:
                warnings.append(
                    f"{rel}: `Decision: Approved` nhưng chưa có tài liệu testcase `testcase/{p.file_id}.md`"
                )

        if p.decision == "Rejected" and (not p.scope_of_rejection or p.scope_of_rejection == "-"):
            errors.append(f"{rel}: `Decision: Rejected` nhưng thiếu `Scope of Rejection:` trong §9")

        for target_id in p.overrides:
            if target_id not in proposal_ids:
                errors.append(f"{rel}: `Overrides: {target_id}` trỏ tới proposal không tồn tại")

    for dir_name, dir_path in impl_dirs.items():
        rel_dir = dir_path.relative_to(root) if dir_path.is_relative_to(root) else dir_path
        matching = next((p for p in proposals if p.file_id == dir_name), None)
        if matching is None:
            errors.append(f"{rel_dir}: tồn tại thư mục implementation nhưng thiếu `proposed/{dir_name}.md`")
        elif matching.decision != "Approved":
            errors.append(
                f"{rel_dir}: tồn tại thư mục implementation nhưng proposal đang ở trạng thái `{matching.decision}` (chưa `Approved`)"
            )

        plan_file = dir_path / "plan.md"
        status_file = dir_path / "status.md"
        if not plan_file.exists():
            errors.append(f"{rel_dir}: thiếu `plan.md`")
        if not status_file.exists():
            errors.append(f"{rel_dir}: thiếu `status.md`")
        else:
            st_raw = _strip_html_comments(status_file.read_text(encoding="utf-8"))
            st_id = _extract_bullet_field(st_raw, "ID")
            st_status = _extract_bullet_field(st_raw, "Status")
            if not st_id:
                errors.append(f"{rel_dir}/status.md: thiếu Metadata `- ID:`")
            elif st_id != dir_name:
                errors.append(f"{rel_dir}/status.md: ID `{st_id}` không khớp thư mục `{dir_name}`")
            if st_status not in VALID_IMPL_STATUSES:
                errors.append(
                    f"{rel_dir}/status.md: `Status: {st_status}` không hợp lệ (cần một trong {sorted(VALID_IMPL_STATUSES)})"
                )

    seen_bugs: set[str] = set()
    for b in bugs:
        rel_b = b.path.relative_to(root) if b.path.is_relative_to(root) else b.path
        if b.bug_id in seen_bugs:
            errors.append(f"{rel_b}: trùng ID bug `{b.bug_id}`")
        seen_bugs.add(b.bug_id)
        if b.status not in VALID_BUG_STATUSES:
            errors.append(
                f"{rel_b}: `Status:` không hợp lệ (`{b.status}`); cần một trong {sorted(VALID_BUG_STATUSES)}"
            )
        if b.severity not in VALID_BUG_SEVERITIES:
            errors.append(
                f"{rel_b}: `Severity:` không hợp lệ (`{b.severity}`); cần một trong {sorted(VALID_BUG_SEVERITIES)}"
            )
        if b.status == "duplicate" and (not b.duplicate_of or b.duplicate_of == "-"):
            errors.append(f"{rel_b}: `Status: duplicate` nhưng thiếu `Duplicate of:`")

    for tc in testcases:
        rel_t = tc.path.relative_to(root) if tc.path.is_relative_to(root) else tc.path
        if not tc.title:
            errors.append(f"{rel_t}: thiếu tiêu đề `# Testcase: ...`")
        if not tc.meta_id:
            errors.append(f"{rel_t}: thiếu Metadata `- ID:`")
        elif tc.meta_id != tc.file_id:
            errors.append(f"{rel_t}: Metadata ID `{tc.meta_id}` không khớp tên file `{tc.file_id}`")
        if tc.mode not in VALID_TESTCASE_MODES:
            errors.append(
                f"{rel_t}: `Mode: {tc.mode}` không hợp lệ (cần một trong {sorted(VALID_TESTCASE_MODES)})"
            )
        if tc.status not in VALID_TESTCASE_STATUSES:
            errors.append(
                f"{rel_t}: `Status: {tc.status}` không hợp lệ (cần một trong {sorted(VALID_TESTCASE_STATUSES)})"
            )
        if not tc.target:
            errors.append(f"{rel_t}: thiếu Metadata `- Target:`")
        if not tc.test_file:
            errors.append(f"{rel_t}: thiếu Metadata `- Test File:`")

        prop_val = tc.proposal.strip()
        if tc.mode == "proposal-paired":
            if not prop_val or prop_val.lower() in {"none", "-", "n/a"}:
                errors.append(f"{rel_t}: `Mode: proposal-paired` nhưng thiếu `- Proposal:` hợp lệ")
            else:
                prop_id = Path(prop_val).stem if prop_val.endswith(".md") else prop_val
                if prop_id not in proposal_map:
                    errors.append(f"{rel_t}: `Proposal: {prop_val}` trỏ tới proposal không tồn tại")
                elif proposal_map[prop_id].decision != "Approved":
                    errors.append(
                        f"{rel_t}: testcase ghép cặp với `{prop_id}` nhưng proposal đang ở `{proposal_map[prop_id].decision}` (chưa `Approved`)"
                    )
        elif tc.mode == "single-file-test":
            if not prop_val:
                errors.append(f"{rel_t}: thiếu Metadata `- Proposal:` (ghi `none` cho single-file-test)")
            elif prop_val.lower() not in {"none", "-", "n/a"}:
                prop_id = Path(prop_val).stem if prop_val.endswith(".md") else prop_val
                if prop_id not in proposal_map:
                    errors.append(f"{rel_t}: `Proposal: {prop_val}` trỏ tới proposal không tồn tại")

        if tc.status == "failed_with_bugs" and (
            not tc.related_bugs or tc.related_bugs.strip().lower() in {"none", "-", "n/a"}
        ):
            warnings.append(
                f"{rel_t}: `Status: failed_with_bugs` nhưng chưa liên kết `BUG-...` trong `Related Bugs:`"
            )
        if tc.related_bugs and tc.related_bugs.strip().lower() not in {"none", "-", "n/a"}:
            for ref_bug in re.findall(r"BUG-[A-Za-z0-9]+-\d+", tc.related_bugs):
                if ref_bug not in seen_bugs:
                    errors.append(
                        f"{rel_t}: `Related Bugs` tham chiếu `{ref_bug}` không tồn tại trong `.agents/notes/bugs/`"
                    )

    return errors, warnings


def _esc(val: str) -> str:
    return (val or "—").replace("|", "\\|")


def format_proposals_table(proposals: list[ProposalRecord]) -> str:
    lines = [
        "| ID | Tiêu đề | Area | Decision | Implementation | Testcase |",
        "|---|---|---|---|---|---|",
    ]
    for p in proposals:
        decision_str = p.decision or "—"
        if p.superseded_by:
            decision_str = f"{decision_str} (superseded by {', '.join(p.superseded_by)})"
        lines.append(
            f"| `{_esc(p.file_id)}` | {_esc(p.title)} | {_esc(p.area)} | {_esc(decision_str)} | "
            f"{_esc(p.implementation)} | {_esc(p.testcase)} |"
        )
    if not proposals:
        lines.append("| — | *(Chưa có proposal nào)* | — | — | — | — |")
    return "\n".join(lines)


def format_testcases_table(testcases: list[TestcaseRecord]) -> str:
    lines = [
        "| ID | Tiêu đề | Mode | Target | Test File | Status | Related Bugs |",
        "|---|---|---|---|---|---|---|",
    ]
    for tc in testcases:
        target_cell = f"`{_esc(tc.target)}`" if tc.target else "—"
        test_file_cell = f"`{_esc(tc.test_file)}`" if tc.test_file else "—"
        lines.append(
            f"| `{_esc(tc.file_id)}` | {_esc(tc.title)} | {_esc(tc.mode)} | "
            f"{target_cell} | {test_file_cell} | {_esc(tc.status)} | {_esc(tc.related_bugs)} |"
        )
    if not testcases:
        lines.append("| — | *(Chưa có testcase nào)* | — | — | — | — | — |")
    return "\n".join(lines)


def format_bugs_table(bugs: list[BugRecord]) -> str:
    lines = [
        "| ID | Tiêu đề | Status | Severity | Area | Reported | Fixed | File |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for b in bugs:
        lines.append(
            f"| `{_esc(b.bug_id)}` | {_esc(b.title)} | {_esc(b.status)} | {_esc(b.severity)} | "
            f"{_esc(b.area)} | {_esc(b.reported)} | {_esc(b.fixed)} | `{b.path.name}` |"
        )
    if not bugs:
        lines.append("| — | *(Chưa có bug nào)* | — | — | — | — | — | — |")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Sinh bảng index và kiểm tra nhất quán .agents/notes/")
    parser.add_argument("--bugs", action="store_true", help="In bảng index bug")
    parser.add_argument("--testcases", action="store_true", help="In bảng index testcase")
    parser.add_argument("--check", action="store_true", help="Kiểm tra nhất quán toàn bộ notes")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="Thư mục gốc repo")
    args = parser.parse_args(argv)

    root = args.root.resolve()
    if args.check:
        errors, warnings = check_notes(root)
        for w in warnings:
            print(f"WARNING: {w}", file=sys.stderr)
        if errors:
            for e in errors:
                print(f"ERROR: {e}", file=sys.stderr)
            return 1
        print("notes_index --check: OK")
        return 0

    proposals, _, bugs = load_notes(root)
    if args.bugs:
        print(format_bugs_table(bugs))
    elif args.testcases:
        print(format_testcases_table(load_testcases(root)))
    else:
        print(format_proposals_table(proposals))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
