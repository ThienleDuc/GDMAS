#!/usr/bin/env bash
# Wrapper Git an toàn cho GDMAS — bọc các lệnh me, start, status, scope, update, push, merge, sync.
# Không force-push, không rebase sau review; cho phép bất kỳ thành viên nào merge khi kiểm tra không xung đột.

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

GIT_BASE="${GIT_BASE:-develop}"
GIT_REVIEWER="${GIT_REVIEWER:-ThienleDuc}"
TEAM_FILE=".agents/team.md"
ME_FILE=".agents/me"

die() {
    echo "ERROR: $*" >&2
    exit 1
}

ensure_hooks() {
    if [ -d ".githooks" ] && [ "$(git config --get core.hooksPath 2>/dev/null || true)" != ".githooks" ]; then
        bash scripts/git-setup.sh >/dev/null 2>&1 || true
    fi
}

valid_handles() {
    if [ ! -f "$TEAM_FILE" ]; then
        die "Không tìm thấy $TEAM_FILE"
    fi
    python3 - "$TEAM_FILE" <<'PY'
import re, sys
from pathlib import Path
text = Path(sys.argv[1]).read_text(encoding="utf-8")
handles = re.findall(r"^\|\s*`([a-z0-9_-]{2,16})`\s*\|", text, flags=re.MULTILINE)
print(" ".join(handles))
PY
}

current_branch() {
    git branch --show-current 2>/dev/null || true
}

github_repo_https() {
    local url
    url="$(git remote get-url origin 2>/dev/null || true)"
    if [ -z "$url" ]; then
        return 0
    fi
    url="${url%.git}"
    if [[ "$url" == git@github.com:* ]]; then
        echo "https://github.com/${url#git@github.com:}"
    elif [[ "$url" == https://github.com/* ]]; then
        echo "$url"
    else
        echo "$url"
    fi
}

cmd_me() {
    local handles
    handles="$(valid_handles)"
    if [ $# -eq 0 ]; then
        if [ ! -f "$ME_FILE" ]; then
            die "Chưa đặt handle cá nhân. Hãy hỏi người dùng họ là ai ($handles) rồi chạy: ./scripts/git-ship.sh me <handle>"
        fi
        local h
        h="$(tr -d '[:space:]' < "$ME_FILE")"
        if [ -z "$h" ]; then
            die "File $ME_FILE đang rỗng. Chạy: ./scripts/git-ship.sh me <handle> ($handles)"
        fi
        for vh in $handles; do
            if [ "$h" = "$vh" ]; then
                echo "$h"
                return 0
            fi
        done
        die "Handle '$h' trong $ME_FILE không có trong $TEAM_FILE ($handles)"
    fi

    local target
    target="$(echo "$1" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')"
    for vh in $handles; do
        if [ "$target" = "$vh" ]; then
            mkdir -p "$(dirname "$ME_FILE")"
            printf '%s\n' "$target" > "$ME_FILE"
            echo "Đã đặt handle hiện tại: $target"
            return 0
        fi
    done
    die "Handle '$target' không hợp lệ. Chỉ nhận một trong: $handles (xem $TEAM_FILE)"
}

cmd_status() {
    ensure_hooks
    local br
    br="$(current_branch)"
    local me_val="(chưa đặt)"
    if [ -f "$ME_FILE" ]; then
        me_val="$(tr -d '[:space:]' < "$ME_FILE")"
    fi
    echo "Branch  : ${br:-DETACHED}"
    echo "Handle  : $me_val"
    echo "Base    : $GIT_BASE"
    echo "Reviewer: @$GIT_REVIEWER (mặc định — mọi thành viên đều có thể merge khi không xung đột)"
    if [ -n "$br" ] && git rev-parse --verify "origin/$GIT_BASE" >/dev/null 2>&1; then
        local counts
        counts="$(git rev-list --left-right --count "origin/$GIT_BASE...HEAD" 2>/dev/null || echo "0 0")"
        echo "Vs origin/$GIT_BASE: behind/ahead = $counts"
    fi
    echo "--- Working tree ---"
    git status -s
}

cmd_start() {
    ensure_hooks
    [ $# -ge 1 ] || die "Thiếu tên nhánh. Dùng: ./scripts/git-ship.sh start <type>/<id>"
    local target="$1"
    if [ "$target" = "main" ] || [ "$target" = "develop" ]; then
        die "Không được dùng nhánh dùng chung '$target' làm nhánh làm việc."
    fi
    if ! [[ "$target" =~ ^(feat|feature|fix|bugfix|hotfix|docs|refactor|test|chore)/[a-z0-9._-]+$ ]]; then
        die "Tên nhánh '$target' sai định dạng. Cần: <type>/<id> (type ∈ feat|feature|fix|bugfix|hotfix|docs|refactor|test|chore)."
    fi

    local cur
    cur="$(current_branch)"
    if [ "$cur" = "$target" ]; then
        echo "Đang ở sẵn nhánh $target."
        return 0
    fi

    local base="$GIT_BASE"
    if [[ "$target" == hotfix/* ]]; then
        base="main"
    fi

    if [ "$cur" != "$GIT_BASE" ] && [ "$cur" != "main" ] && [ -n "$cur" ]; then
        die "Bạn đang ở nhánh tính năng '$cur' (không phải '$GIT_BASE'). Hãy hoàn tất/chuyển về '$GIT_BASE' trước khi tạo nhánh mới '$target'."
    fi

    if git remote get-url origin >/dev/null 2>&1; then
        git fetch origin "$base" >/dev/null 2>&1 || echo "Cảnh báo: không fetch được origin/$base (làm việc với ref local)." >&2
    fi

    if git show-ref --verify --quiet "refs/heads/$target"; then
        git switch "$target"
        return 0
    fi

    if git show-ref --verify --quiet "refs/remotes/origin/$target"; then
        git switch -c "$target" --track "origin/$target"
        return 0
    fi

    # Nếu working tree có thay đổi chưa commit, mang theo sang nhánh mới từ HEAD hiện tại
    if [ -n "$(git status --porcelain)" ]; then
        git switch -c "$target"
    elif git rev-parse --verify "origin/$base" >/dev/null 2>&1; then
        git switch -c "$target" "origin/$base"
    elif git rev-parse --verify "$base" >/dev/null 2>&1; then
        git switch -c "$target" "$base"
    else
        die "Không tìm thấy nhánh cơ sở '$base' (hoặc origin/$base). Kiểm tra lại remote."
    fi
}

cmd_scope() {
    local br id
    br="$(current_branch)"
    if [ $# -ge 1 ]; then
        id="$1"
    else
        id="${br#*/}"
    fi

    local base_ref="origin/$GIT_BASE"
    if ! git rev-parse --verify "$base_ref" >/dev/null 2>&1; then
        base_ref="$GIT_BASE"
    fi

    python3 - "$ROOT" "$id" "$base_ref" <<'PY'
import fnmatch, re, subprocess, sys
from pathlib import Path

root = Path(sys.argv[1])
task_id = sys.argv[2]
base_ref = sys.argv[3]

def run_git(*args: str) -> list[str]:
    out = subprocess.check_output(["git", *args], cwd=root, text=True)
    return [line for line in out.splitlines() if line.strip()]

changed: set[str] = set()
try:
    mb = subprocess.check_output(["git", "merge-base", base_ref, "HEAD"], cwd=root, text=True).strip()
    changed.update(run_git("diff", "--name-only", f"{mb}...HEAD"))
except subprocess.CalledProcessError:
    pass

for line in subprocess.check_output(["git", "status", "--porcelain", "-uall"], cwd=root, text=True).splitlines():
    if not line.strip():
        continue
    path_part = line[3:].strip()
    if " -> " in path_part:
        path_part = path_part.split(" -> ", 1)[1].strip()
    changed.add(path_part.strip('"'))

plan_path = root / ".agents" / "notes" / "implemented" / task_id / "plan.md"
if not plan_path.exists():
    # Hỗ trợ tìm theo hậu tố nếu nhánh không trùng hoàn toàn
    candidates = list((root / ".agents" / "notes" / "implemented").glob(f"*{task_id}*/plan.md"))
    if candidates:
        plan_path = candidates[0]
        task_id = plan_path.parent.name

if not plan_path.exists():
    print(f"Không tìm thấy plan.md cho '{task_id}' (tác vụ nhỏ / Fast-Track / single-file-test).")
    print("Các tệp đang thay đổi:")
    for f in sorted(changed):
        print(f"  - {f}")
    sys.exit(0)

text = plan_path.read_text(encoding="utf-8")
m = re.search(r"###\s+In Scope.*?\n(.*?)(?:\n###|\n##|\Z)", text, flags=re.DOTALL | re.IGNORECASE)
if not m:
    print(f"Cảnh báo: {plan_path} không có mục ### In Scope rõ ràng.")
    sys.exit(0)

in_scope: list[str] = []
for raw_line in m.group(1).splitlines():
    s = raw_line.strip()
    if not re.match(r"^[-*]\s+", s):
        continue
    s = re.sub(r"^[-*]\s+", "", s)
    bt_all = re.findall(r"`([^`]+)`", s)
    if bt_all:
        candidates_pat = [p.strip().rstrip(".,;") for p in bt_all]
    else:
        head = re.split(r"\s+\(|:\s+|\s+—\s+", s, maxsplit=1)[0].strip().rstrip(".,;")
        candidates_pat = [head]
    for pattern in candidates_pat:
        if pattern and not pattern.startswith("<"):
            in_scope.append(pattern)

allowed_bookkeeping = (
    f".agents/notes/implemented/{task_id}/",
    f".agents/notes/proposed/{task_id}.md",
    f".agents/notes/testcase/{task_id}.md",
    ".agents/notes/bugs/",
)

outside: list[str] = []
for f in sorted(changed):
    if any(f == p or f.startswith(p) for p in allowed_bookkeeping):
        continue
    matched = False
    for pat in in_scope:
        norm = pat.rstrip("/")
        if f == norm or f.startswith(norm + "/") or fnmatch.fnmatch(f, pat):
            matched = True
            break
    if not matched:
        outside.append(f)

if outside:
    print("SCOPE MISMATCH")
    for f in outside:
        print(f"Outside declared scope: {f}")
    print(f"Declared In Scope ({plan_path.relative_to(root)}): {', '.join(in_scope)}")
    sys.exit(1)

print(f"Scope OK ({len(changed)} tệp nằm trong phạm vi plan {task_id}).")
PY
}

cmd_update() {
    ensure_hooks
    local br
    br="$(current_branch)"
    if [ -z "$br" ] || [ "$br" = "develop" ] || [ "$br" = "main" ]; then
        die "Chỉ chạy 'update' trên nhánh tính năng (hiện tại: '${br:-DETACHED}')."
    fi

    git fetch origin "$GIT_BASE"
    if ! git merge --no-edit "origin/$GIT_BASE"; then
        local conflicts
        conflicts="$(git diff --name-only --diff-filter=U || true)"
        echo "CẢNH BÁO XUNG ĐỘT khi gộp origin/$GIT_BASE:" >&2
        echo "$conflicts" >&2
        if echo "$conflicts" | grep -qE "^(contracts/|AGENTS\.md|apps/api/alembic/versions/|docs/quyuocchung\.md)"; then
            echo "DỪNG CỨNG: Xung đột chạm tệp lõi dùng chung — đưa vào danh sách câu hỏi cuối phiên để nhóm quyết định." >&2
        fi
        exit 1
    fi
    echo "Đã merge-forward origin/$GIT_BASE vào $br."
}

cmd_push() {
    ensure_hooks
    local create_pr=1
    for arg in "$@"; do
        case "$arg" in
            --no-mr|--no-pr) create_pr=0 ;;
        esac
    done

    local br
    br="$(current_branch)"
    if [ -z "$br" ] || [ "$br" = "develop" ] || [ "$br" = "main" ]; then
        die "BỊ CHẶN: Không được push trực tiếp lên nhánh '$br'. Hãy đẩy nhánh tính năng và merge qua PR hoặc ./scripts/git-ship.sh merge."
    fi

    if [ -f "scripts/notes_index.py" ]; then
        python3 scripts/notes_index.py --check
    fi

    git push -u origin "$br"

    local repo_url pr_url=""
    repo_url="$(github_repo_https)"

    if [ "$create_pr" -eq 1 ] && command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
        pr_url="$(gh pr view "$br" --json url -q .url 2>/dev/null || true)"
        if [ -z "$pr_url" ]; then
            local title body_file=".artifacts/mr/${br//\//-}.md"
            title="$(git log -1 --pretty=%s)"
            if [ -f "$body_file" ]; then
                pr_url="$(gh pr create --base "$GIT_BASE" --head "$br" --title "$title" --body-file "$body_file" --reviewer "$GIT_REVIEWER" 2>/dev/null || \
                          gh pr create --base "$GIT_BASE" --head "$br" --title "$title" --body-file "$body_file" 2>/dev/null || true)"
            else
                pr_url="$(gh pr create --base "$GIT_BASE" --head "$br" --title "$title" --fill --reviewer "$GIT_REVIEWER" 2>/dev/null || \
                          gh pr create --base "$GIT_BASE" --head "$br" --title "$title" --fill 2>/dev/null || true)"
            fi
        fi
    fi

    echo ""
    if [ -n "$pr_url" ]; then
        echo "PR sẵn sàng (target: $GIT_BASE, reviewer: @$GIT_REVIEWER): $pr_url"
    elif [ -n "$repo_url" ]; then
        echo "Link tạo PR (target: $GIT_BASE, reviewer: @$GIT_REVIEWER):"
        echo "  $repo_url/compare/$GIT_BASE...$br?expand=1"
    fi
    echo "Lưu ý: Không bắt buộc riêng @$GIT_REVIEWER — chỉ cần kiểm tra không xung đột và đạt checks là có thể merge PR vào $GIT_BASE (./scripts/git-ship.sh merge)."
}

cmd_merge() {
    ensure_hooks
    local mode="auto"
    local dry_run=0
    local base="$GIT_BASE"
    local target=""

    while [ $# -gt 0 ]; do
        case "$1" in
            --local) mode="local"; shift ;;
            --dry-run) dry_run=1; shift ;;
            --base)
                shift
                [ $# -ge 1 ] || die "Thiếu tên nhánh sau --base."
                base="$1"
                shift
                ;;
            -h|--help)
                echo "Dùng: ./scripts/git-ship.sh merge [--dry-run] [--local] [--base <branch>] [pr_number_or_branch]"
                return 0
                ;;
            *)
                target="$1"
                shift
                ;;
        esac
    done

    if [ -n "$(git status --porcelain)" ]; then
        die "Working tree đang có thay đổi chưa commit. Hãy commit/stash trước khi kiểm tra & merge."
    fi

    if [ -f "scripts/notes_index.py" ]; then
        python3 scripts/notes_index.py --check >/dev/null
    fi

    local cur source_ref
    cur="$(current_branch)"
    source_ref="${target:-$cur}"
    if [ -z "$source_ref" ] || [ "$source_ref" = "develop" ] || [ "$source_ref" = "main" ]; then
        die "Hãy đứng trên nhánh tính năng hoặc truyền tên nhánh / số PR cần merge (hiện tại: '${source_ref:-DETACHED}')."
    fi

    if [[ "$source_ref" == hotfix/* ]] && [ "$base" = "$GIT_BASE" ]; then
        base="main"
    fi

    if git remote get-url origin >/dev/null 2>&1; then
        git fetch origin "$base" >/dev/null 2>&1 || true
    fi

    local base_targets=()
    if [ "$mode" = "local" ]; then
        if git rev-parse --verify "$base" >/dev/null 2>&1; then
            base_targets+=("$base")
        fi
        if git rev-parse --verify "origin/$base" >/dev/null 2>&1; then
            base_targets+=("origin/$base")
        fi
    else
        if git rev-parse --verify "origin/$base" >/dev/null 2>&1; then
            base_targets+=("origin/$base")
        elif git rev-parse --verify "$base" >/dev/null 2>&1; then
            base_targets+=("$base")
        fi
    fi

    if [ "${#base_targets[@]}" -eq 0 ]; then
        die "Không tìm thấy nhánh đích '$base' (hoặc 'origin/$base')."
    fi
    local base_ref="${base_targets[0]}"

    if [ "$mode" != "local" ] && command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
        local pr_json mergeable merge_state pr_url
        pr_json="$(gh pr view "$source_ref" --json url,mergeable,mergeStateStatus 2>/dev/null || true)"
        if [ -n "$pr_json" ]; then
            read -r pr_url mergeable merge_state <<<"$(python3 -c '
import json, sys
d = json.loads(sys.argv[1])
print(d.get("url", ""), d.get("mergeable", ""), d.get("mergeStateStatus", ""))
' "$pr_json")"
            if [ "$mergeable" = "CONFLICTING" ] || [ "$merge_state" = "DIRTY" ]; then
                die "BỊ CHẶN [CONFLICT]: PR ($pr_url) đang xung đột ($merge_state). Hãy chạy ./scripts/git-ship.sh update và xử lý xung đột trước khi merge."
            fi
            if [ "$dry_run" -eq 1 ]; then
                echo "MERGE READY (GitHub PR): $pr_url không có xung đột (mergeable=$mergeable, state=$merge_state)."
                return 0
            fi
            gh pr merge "$source_ref" --merge --delete-branch
            if [ "$(current_branch)" != "$base" ]; then
                git switch "$base"
            fi
            git pull --ff-only origin "$base" >/dev/null 2>&1 || true
            git fetch origin --prune >/dev/null 2>&1 || true
            echo "Đã kiểm tra không xung đột và merge PR ($pr_url) vào $base."
            return 0
        fi
    fi

    if ! git rev-parse --verify "$source_ref" >/dev/null 2>&1; then
        die "Không tìm thấy nhánh nguồn '$source_ref' ở local và chưa có PR GitHub khả dụng."
    fi

    local merge_out check_ref
    for check_ref in "${base_targets[@]}"; do
        if ! merge_out="$(git merge-tree --write-tree "$check_ref" "$source_ref" 2>&1)"; then
            echo "Chi tiết kiểm tra xung đột ($source_ref -> $check_ref):" >&2
            echo "$merge_out" >&2
            die "BỊ CHẶN [CONFLICT]: Nhánh '$source_ref' đang xung đột với '$check_ref'. Không thể merge cho tới khi giải quyết hết xung đột."
        fi
    done

    if [ "$dry_run" -eq 1 ]; then
        echo "MERGE READY: Nhánh '$source_ref' không có xung đột với '$base_ref'."
        return 0
    fi

    git switch "$base"
    if git rev-parse --verify "origin/$base" >/dev/null 2>&1; then
        git pull --ff-only origin "$base" >/dev/null 2>&1 || true
    fi
    if ! git merge --no-ff --no-edit "$source_ref"; then
        git merge --abort >/dev/null 2>&1 || true
        die "BỊ CHẶN [CONFLICT]: Phát hiện xung đột khi merge '$source_ref' vào '$base'. Đã hoàn tác nguyên trạng."
    fi
    echo "Đã kiểm tra không xung đột và merge '$source_ref' vào '$base' thành công."
}

cmd_sync() {
    ensure_hooks
    if [ -n "$(git status --porcelain)" ]; then
        die "Working tree đang có thay đổi chưa commit. Hãy dọn/commit trước khi sync."
    fi
    local prev
    prev="$(current_branch)"
    git switch "$GIT_BASE"
    git pull --ff-only origin "$GIT_BASE"
    git fetch origin --prune
    if [ -n "$prev" ] && [ "$prev" != "$GIT_BASE" ] && [ "$prev" != "main" ]; then
        if git branch --merged "origin/$GIT_BASE" --format='%(refname:short)' | grep -qx "$prev"; then
            git branch -d "$prev"
            echo "Đã xóa nhánh local đã merge: $prev"
        else
            echo "Giữ nguyên nhánh '$prev' vì chưa thấy merge vào origin/$GIT_BASE."
        fi
    fi
}

cmd="${1:-}"
shift || true

case "$cmd" in
    me)     cmd_me "$@" ;;
    status) cmd_status "$@" ;;
    start)  cmd_start "$@" ;;
    scope)  cmd_scope "$@" ;;
    update) cmd_update "$@" ;;
    push)   cmd_push "$@" ;;
    sync)   cmd_sync "$@" ;;
    merge)  cmd_merge "$@" ;;
    *)
        cat <<EOF
Cách dùng: ./scripts/git-ship.sh <lệnh>
  me [handle]          Đọc hoặc đặt handle từ .agents/team.md
  status               Xem trạng thái nhánh, handle, ahead/behind
  start <type>/<id>    Tạo/chuyển sang nhánh tính năng từ $GIT_BASE
  scope [id]           Kiểm tra diff khớp In Scope của plan.md
  update               Merge-forward origin/$GIT_BASE vào nhánh hiện tại
  push [--no-pr]       Kiểm notes, push nhánh, tạo/in link PR
  merge [--dry-run] [--local]  Kiểm tra không xung đột và merge PR/nhánh vào $GIT_BASE
  sync                 Về $GIT_BASE sau khi đã merge PR
EOF
        exit 1
        ;;
esac
