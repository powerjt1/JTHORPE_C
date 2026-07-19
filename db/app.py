#!/usr/bin/env python3
"""
Lucy AI — minimal accounts database bridge.

A tiny, dependency-free HTTP service over SQLite that the Node auth backend
calls to persist trial accounts. Standard library only (http.server + sqlite3).

Endpoints (all JSON):
  GET  /healthz
  POST /accounts/find-or-create   {provider, sub, email, name}
  GET  /accounts/by-email?email=...
  POST /accounts/verify           {email}

Auth: if DB_TOKEN is set, callers must send  X-DB-Token: <DB_TOKEN>.

Env:
  DB_PATH   SQLite file path        (default: ./lucy.db next to this file)
  PORT      listen port             (default: 8799)
  DB_TOKEN  shared secret           (default: unset -> open, dev only)
"""

import json
import os
import sqlite3
import threading
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

HERE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get("DB_PATH", os.path.join(HERE, "lucy.db"))
PORT = int(os.environ.get("PORT", "8799"))
DB_TOKEN = os.environ.get("DB_TOKEN", "")

_lock = threading.Lock()
_conn = sqlite3.connect(DB_PATH, check_same_thread=False)
_conn.row_factory = sqlite3.Row


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def init_db():
    with _lock:
        _conn.execute(
            """
            CREATE TABLE IF NOT EXISTS accounts (
                id               TEXT PRIMARY KEY,
                email            TEXT NOT NULL,
                name             TEXT,
                provider         TEXT NOT NULL,
                email_verified   INTEGER NOT NULL DEFAULT 0,
                trial_started_at TEXT NOT NULL,
                verified_at      TEXT
            )
            """
        )
        _conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(lower(email))"
        )
        _conn.execute(
            """
            CREATE TABLE IF NOT EXISTS projects (
                id          TEXT PRIMARY KEY,
                name        TEXT NOT NULL,
                owner_email TEXT NOT NULL,
                status      TEXT NOT NULL,
                created_at  TEXT NOT NULL
            )
            """
        )
        _conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                id          TEXT PRIMARY KEY,
                project_id  TEXT NOT NULL,
                agent       TEXT NOT NULL,
                phase       INTEGER NOT NULL,
                phase_name  TEXT,
                order_index INTEGER NOT NULL,
                status      TEXT NOT NULL,
                message     TEXT
            )
            """
        )
        _conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)"
        )
        _conn.commit()


def row_to_account(row):
    if row is None:
        return None
    return {
        "id": row["id"],
        "email": row["email"],
        "name": row["name"],
        "provider": row["provider"],
        "emailVerified": bool(row["email_verified"]),
        "trialStartedAt": row["trial_started_at"],
        "verifiedAt": row["verified_at"],
    }


def key_for(provider, sub, email):
    return "%s:%s" % (provider, sub or email)


def find_or_create(profile):
    provider = profile.get("provider") or "email"
    email = profile.get("email")
    if not email:
        raise ValueError("email is required")
    key = key_for(provider, profile.get("sub"), email)
    with _lock:
        cur = _conn.execute("SELECT * FROM accounts WHERE id = ?", (key,))
        existing = cur.fetchone()
        if existing:
            acc = row_to_account(existing)
            acc["isNew"] = False
            return acc
        verified = 0 if provider == "email" else 1
        _conn.execute(
            "INSERT INTO accounts (id, email, name, provider, email_verified, trial_started_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (key, email, profile.get("name"), provider, verified, now_iso()),
        )
        _conn.commit()
        cur = _conn.execute("SELECT * FROM accounts WHERE id = ?", (key,))
        acc = row_to_account(cur.fetchone())
        acc["isNew"] = True
        return acc


def get_by_email(email):
    with _lock:
        cur = _conn.execute(
            "SELECT * FROM accounts WHERE lower(email) = lower(?) LIMIT 1", (email,)
        )
        return row_to_account(cur.fetchone())


def mark_verified(email):
    with _lock:
        cur = _conn.execute(
            "UPDATE accounts SET email_verified = 1, verified_at = ? "
            "WHERE lower(email) = lower(?) AND email_verified = 0",
            (now_iso(), email),
        )
        _conn.commit()
        return cur.rowcount


# ---- projects & tasks ----

def task_row_to_dict(row):
    return {
        "id": row["id"],
        "projectId": row["project_id"],
        "agent": row["agent"],
        "phase": row["phase"],
        "phaseName": row["phase_name"],
        "orderIndex": row["order_index"],
        "status": row["status"],
        "message": row["message"],
    }


def project_row_to_dict(row, tasks=None):
    d = {
        "id": row["id"],
        "name": row["name"],
        "ownerEmail": row["owner_email"],
        "status": row["status"],
        "createdAt": row["created_at"],
    }
    if tasks is not None:
        d["tasks"] = tasks
    return d


def create_project(p):
    with _lock:
        _conn.execute(
            "INSERT INTO projects (id, name, owner_email, status, created_at) VALUES (?, ?, ?, ?, ?)",
            (p["id"], p["name"], p.get("ownerEmail"), p.get("status", "active"), p.get("createdAt", now_iso())),
        )
        _conn.commit()


def update_project(pid, status):
    with _lock:
        cur = _conn.execute("UPDATE projects SET status = ? WHERE id = ?", (status, pid))
        _conn.commit()
        return cur.rowcount


def create_task(t):
    with _lock:
        _conn.execute(
            "INSERT INTO tasks (id, project_id, agent, phase, phase_name, order_index, status, message) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (t["id"], t["projectId"], t["agent"], t["phase"], t.get("phaseName"),
             t["orderIndex"], t.get("status", "queued"), t.get("message", "")),
        )
        _conn.commit()


def update_task(tid, status, message):
    with _lock:
        cur = _conn.execute(
            "UPDATE tasks SET status = ?, message = ? WHERE id = ?", (status, message, tid)
        )
        _conn.commit()
        return cur.rowcount


def get_project(pid):
    with _lock:
        prow = _conn.execute("SELECT * FROM projects WHERE id = ?", (pid,)).fetchone()
        if prow is None:
            return None
        trows = _conn.execute(
            "SELECT * FROM tasks WHERE project_id = ? ORDER BY order_index ASC", (pid,)
        ).fetchall()
        return project_row_to_dict(prow, [task_row_to_dict(r) for r in trows])


def list_projects(email):
    with _lock:
        rows = _conn.execute(
            "SELECT * FROM projects WHERE lower(owner_email) = lower(?) ORDER BY created_at DESC",
            (email,),
        ).fetchall()
        return [project_row_to_dict(r) for r in rows]


class Handler(BaseHTTPRequestHandler):
    def _send(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _authorized(self):
        if not DB_TOKEN:
            return True
        return self.headers.get("X-DB-Token") == DB_TOKEN

    def _read_json(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length == 0:
            return {}
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return None

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/healthz":
            return self._send(200, {"ok": True, "db": DB_PATH})
        if not self._authorized():
            return self._send(401, {"error": "unauthorized"})
        if parsed.path == "/accounts/by-email":
            qs = parse_qs(parsed.query)
            email = (qs.get("email") or [""])[0]
            if not email:
                return self._send(400, {"error": "email required"})
            return self._send(200, {"account": get_by_email(email)})
        if parsed.path == "/projects/get":
            qs = parse_qs(parsed.query)
            pid = (qs.get("id") or [""])[0]
            if not pid:
                return self._send(400, {"error": "id required"})
            return self._send(200, {"project": get_project(pid)})
        if parsed.path == "/projects/list":
            qs = parse_qs(parsed.query)
            email = (qs.get("email") or [""])[0]
            if not email:
                return self._send(400, {"error": "email required"})
            return self._send(200, {"projects": list_projects(email)})
        return self._send(404, {"error": "not found"})

    def do_POST(self):
        parsed = urlparse(self.path)
        if not self._authorized():
            return self._send(401, {"error": "unauthorized"})
        data = self._read_json()
        if data is None:
            return self._send(400, {"error": "invalid json"})

        if parsed.path == "/accounts/find-or-create":
            try:
                return self._send(200, {"account": find_or_create(data)})
            except ValueError as e:
                return self._send(400, {"error": str(e)})
        if parsed.path == "/accounts/verify":
            email = data.get("email")
            if not email:
                return self._send(400, {"error": "email required"})
            return self._send(200, {"updated": mark_verified(email)})
        if parsed.path == "/projects/create":
            try:
                create_project(data)
                return self._send(200, {"ok": True})
            except (KeyError, sqlite3.Error) as e:
                return self._send(400, {"error": str(e)})
        if parsed.path == "/projects/update":
            pid = data.get("id")
            if not pid:
                return self._send(400, {"error": "id required"})
            return self._send(200, {"updated": update_project(pid, data.get("status", "active"))})
        if parsed.path == "/tasks/create":
            try:
                create_task(data)
                return self._send(200, {"ok": True})
            except (KeyError, sqlite3.Error) as e:
                return self._send(400, {"error": str(e)})
        if parsed.path == "/tasks/update":
            tid = data.get("id")
            if not tid:
                return self._send(400, {"error": "id required"})
            return self._send(200, {"updated": update_task(tid, data.get("status"), data.get("message", ""))})
        return self._send(404, {"error": "not found"})

    def log_message(self, fmt, *args):  # quieter logs
        pass


def main():
    init_db()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print("Lucy AI DB bridge on :%d  (db=%s, auth=%s)"
          % (PORT, DB_PATH, "on" if DB_TOKEN else "off"))
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()


if __name__ == "__main__":
    main()
