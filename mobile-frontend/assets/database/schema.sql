PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;
DROP TABLE IF EXISTS student;
CREATE TABLE student (
    id INTEGER PRIMARY KEY,
    student_number TEXT,
    family_name TEXT NOT NULL,
    given_name TEXT NOT NULL,
    phone_number TEXT,
    email TEXT UNIQUE
);
DROP TABLE IF EXISTS message;
CREATE TABLE message (
    id INTEGER PRIMARY KEY,
    student_number TEXT,
    student_id INTEGER,
    title TEXT,
    content TEXT,
    priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
    group_name TEXT,
    edited_at TEXT,
    images TEXT,
    sent_time TEXT,
    read_status INTEGER CHECK (read_status IN (0, 1)) DEFAULT 0,
    read_time TEXT,
    sent_status INTEGER CHECK (sent_status IN (0, 1)) DEFAULT 0, came_time TEXT,
    FOREIGN KEY (student_number) REFERENCES student (student_number) ON DELETE CASCADE
);
DROP TABLE IF EXISTS user;
CREATE TABLE user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    given_name TEXT,
    family_name TEXT,
    phone_number TEXT,
    email TEXT
);
DELETE FROM sqlite_sequence;
COMMIT;
