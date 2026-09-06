-- Heist Escape Room Database Schema

CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  atmosphere TEXT NOT NULL,
  exits TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS objects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  name TEXT NOT NULL UNIQUE,
  short_description TEXT NOT NULL,
  full_description TEXT NOT NULL,
  interaction_hints TEXT,
  is_takeable INTEGER DEFAULT 0,
  is_container INTEGER DEFAULT 0,
  locked INTEGER DEFAULT 0,
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);

CREATE TABLE IF NOT EXISTS drawers (
  id TEXT PRIMARY KEY,
  object_id INTEGER NOT NULL,
  contents TEXT,
  locked INTEGER DEFAULT 0,
  lock_code_hash TEXT,
  FOREIGN KEY (object_id) REFERENCES objects(id)
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  clue_type TEXT,
  room_id INTEGER,
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);

CREATE TABLE IF NOT EXISTS puzzles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  puzzle_type TEXT NOT NULL,
  solution_hash TEXT NOT NULL,
  success_message TEXT NOT NULL,
  failure_message TEXT NOT NULL,
  unlocks_what TEXT,
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);

CREATE TABLE IF NOT EXISTS hints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  sequence INTEGER NOT NULL,
  hint_text TEXT NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);
