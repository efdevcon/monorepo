-- Devcon 8 Memory codes: a keyed hash (HMAC-SHA256) of the address each ticket's memory email went to, so a
-- later email sign-in can find a person's tickets without the table holding any address. The key
-- (MEMORY_EMAIL_SECRET) lives outside the database: the table alone can't be matched against guessed addresses,
-- and deleting the key makes the column meaningless. To undo: drop the column and delete the key.
alter table devcon8_memory_codes add column if not exists email_hmac text;
create index if not exists devcon8_memory_codes_email_hmac_idx on devcon8_memory_codes (email_hmac);
