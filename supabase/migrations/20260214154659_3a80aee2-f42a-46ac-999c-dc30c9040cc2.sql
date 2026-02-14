
-- Drop V1 School tables
DROP TABLE IF EXISTS lesson_absences CASCADE;
DROP TABLE IF EXISTS homework CASCADE;
DROP TABLE IF EXISTS absences CASCADE;
DROP TABLE IF EXISTS timetable_entries CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS custom_holidays CASCADE;

-- Drop V1 Finance tables
DROP TABLE IF EXISTS balance_history CASCADE;
DROP TABLE IF EXISTS investments CASCADE;
DROP TABLE IF EXISTS loans CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;

-- Drop Lifetime tables
DROP TABLE IF EXISTS active_time_tracker CASCADE;
DROP TABLE IF EXISTS time_entries CASCADE;
DROP TABLE IF EXISTS lifetime_goals CASCADE;
DROP TABLE IF EXISTS lifetime_events CASCADE;

-- Drop Journal table
DROP TABLE IF EXISTS journal_entries CASCADE;
