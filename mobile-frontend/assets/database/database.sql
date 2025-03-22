PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;


CREATE TABLE IF NOT EXISTS student (
    id INTEGER PRIMARY KEY,
    student_number TEXT,
    family_name TEXT NOT NULL,
    given_name TEXT NOT NULL,
    phone_number TEXT,
    email TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS message (
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
    sent_status INTEGER CHECK (sent_status IN (0, 1)) DEFAULT 0,
    FOREIGN KEY (student_number) REFERENCES student (student_number) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    given_name TEXT,
    family_name TEXT,
    phone_number TEXT,
    email TEXT
);


/* query to show messages in home page */
SELECT * FROM message
WHERE read_status = 0
ORDER BY sent_time DESC;
/* query to send queued messages to database */
SELECT * FROM message
WHERE sent_status = 0;
/* query to send queued forms to database */
SELECT * FROM form
WHERE sent_status = 0;
