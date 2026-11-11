-- Devcon 8 Memory claim codes keep no personal data: drop the attendee's
-- email and name that the first version of devcon8_memory_codes stored.
-- The table keeps only one-way values (the code's SHA-256 and the ticket
-- key); the send script reads emails and names from Pretix each run.

alter table devcon8_memory_codes
  drop column if exists email,
  drop column if exists attendee_name;
