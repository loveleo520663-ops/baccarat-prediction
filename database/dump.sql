-- SQLite 資料庫備份
-- 生成時間: 2025-11-08T00:15:46.181Z

-- 表結構: users
DROP TABLE IF EXISTS users;
CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            duration_days INTEGER NOT NULL,
            expiration_date TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          , is_admin INTEGER DEFAULT 0);

-- 表結構: sqlite_sequence
DROP TABLE IF EXISTS sqlite_sequence;
CREATE TABLE sqlite_sequence(name,seq);

-- 表資料: users
INSERT INTO users (id, username, password, duration_days, expiration_date, is_active, created_at, is_admin) VALUES (1, 'admin', '$2a$10$7x6XyfJN9aNwGTGm444TZOTk0J.ZYyXKGJOZ3DD9QXRsqlxQqu2qm', 365, '2026-11-07T22:25:54.703Z', 1, '2025-11-07 22:25:54', 1);
INSERT INTO users (id, username, password, duration_days, expiration_date, is_active, created_at, is_admin) VALUES (2, 'test001', '$2a$10$wjGbur0OxCwTeFJahvMGIONIa9JlmjykfaOWMzq3irH8z.taZbPgG', 30, '2025-12-07T22:25:54.793Z', 1, '2025-11-07 22:25:54', 0);
INSERT INTO users (id, username, password, duration_days, expiration_date, is_active, created_at, is_admin) VALUES (3, 'user001', '$2a$10$aY7h1tk76VJ28U7VbcW6NeY3dPhMXbXGicM6kMfS5mfyNjTYXTUaG', 7, '2025-11-14T22:25:54.881Z', 1, '2025-11-07 22:25:54', 0);
INSERT INTO users (id, username, password, duration_days, expiration_date, is_active, created_at, is_admin) VALUES (4, 'demo001', '$2a$10$K1Z1BEwDJG3DJo76a/F5VOP/Q3zZvH8f27rExuy1kgHlZg1e2HRZO', 1, '2025-11-08T22:25:54.973Z', 1, '2025-11-07 22:25:54', 0);

-- 表資料: sqlite_sequence
INSERT INTO sqlite_sequence (name, seq) VALUES ('users', 4);

