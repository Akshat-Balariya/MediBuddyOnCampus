-- Passwords are now stored as bcrypt hashes, which are 60 characters long.
-- Run this once before deploying the new server.js, otherwise new registrations
-- (and the automatic upgrade of old plain-text passwords at login) can fail or be truncated.
ALTER TABLE stud_cred MODIFY Passwd VARCHAR(100) NOT NULL;
ALTER TABLE doc_cred  MODIFY Passwd VARCHAR(100) NOT NULL;
