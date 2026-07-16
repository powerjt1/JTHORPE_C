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
