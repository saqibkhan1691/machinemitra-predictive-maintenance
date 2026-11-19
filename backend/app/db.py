import os, sqlite3, json
from pathlib import Path
DB_PATH = os.getenv('APP_DB_PATH', '/app/data/machinemitra.db')

def connect():
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con

def init_db():
    with connect() as con:
        con.executescript('''
        CREATE TABLE IF NOT EXISTS predictions (
          id TEXT PRIMARY KEY, machine_id TEXT NOT NULL, timestamp TEXT NOT NULL,
          probability REAL NOT NULL, failure INTEGER NOT NULL, risk TEXT NOT NULL,
          action TEXT NOT NULL, sensors TEXT NOT NULL, model TEXT NOT NULL, version TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS machines (
          id TEXT PRIMARY KEY, name TEXT NOT NULL, product_type TEXT NOT NULL,
          sensors TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Healthy', created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS work_orders (
          id TEXT PRIMARY KEY, machine_id TEXT NOT NULL, title TEXT NOT NULL,
          priority TEXT NOT NULL, status TEXT NOT NULL, technician TEXT DEFAULT '',
          due_date TEXT DEFAULT '', created_at TEXT NOT NULL
        );
        ''')
