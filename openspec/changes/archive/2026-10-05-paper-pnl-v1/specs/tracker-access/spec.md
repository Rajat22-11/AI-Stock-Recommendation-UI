## Purpose

Defines who can read and write the paper tracker's tables and views, and how the public dashboard connects, so that public read access never implies public write access.

## ADDED Requirements

### Requirement: Public roles are read-only
The `anon` and `authenticated` roles SHALL hold SELECT, and no INSERT, UPDATE, DELETE or TRUNCATE, on every table and view in the `public` schema. Tables created later in `public` SHALL NOT grant those write privileges to these roles by default.

#### Scenario: Existing objects
- **WHEN** checking `has_table_privilege('anon', <object>, 'INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE')` for each table and view in `public`
- **THEN** every check returns false
- **AND** `has_table_privilege('anon', <object>, 'SELECT')` returns true

#### Scenario: Write attempt through the API with the anon key
- **WHEN** a client sends an insert, update or delete for any tracker table using the anon key
- **THEN** the request is rejected and no row changes

#### Scenario: New table
- **WHEN** a new table is created in `public` by the migration role
- **THEN** `anon` and `authenticated` hold no write privileges on it

### Requirement: Revocation does not break the scheduled runs
Write privileges SHALL be revoked only after confirming that no scheduled run or script writes with the anon or authenticated key. The scheduled Claude runs SHALL keep the ability to insert runs, signals, price bars and reviews, and to execute `process_ledger`.

#### Scenario: Next scheduled run after revocation
- **WHEN** the next weekly scan or mid-week check-in runs after the revocation
- **THEN** its inserts and its `process_ledger` call succeed

### Requirement: Dashboard reads with the anon key on the server and never writes
The dashboard SHALL read the tracker using only the publishable (anon) key, from server-side code. It SHALL NOT include a service-role or secret key in any environment, bundle or response. It SHALL NOT issue any insert, update, delete or RPC call that changes data.

#### Scenario: Client bundle inspection
- **WHEN** the production client JavaScript is searched for the Supabase key and for any service-role key
- **THEN** neither is present

#### Scenario: Page view
- **WHEN** the dashboard page is requested
- **THEN** the server issues only read requests to Supabase
