ALTER TABLE profiles ADD COLUMN first_name text NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN last_name text NOT NULL DEFAULT '';

UPDATE profiles SET first_name = 'Rishabh', last_name = 'Agarwal' WHERE username = 'roobmoob';
UPDATE profiles SET first_name = 'John', last_name = 'Doe' WHERE username = 'admin';
