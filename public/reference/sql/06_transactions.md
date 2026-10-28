# 06. Transactions

A transaction groups multiple SQL statements into a unit that either all succeed or all fail together. Transactions are how SQL gives you correctness in the face of concurrent access, crashes, and partial failures.

This file covers the mechanics of transactions, the trade-offs of isolation levels, and how locks and deadlocks work.

---

## Table of Contents

1. [Why Transactions](#why-transactions)
2. [ACID](#acid)
3. [BEGIN, COMMIT, ROLLBACK](#begin-commit-rollback)
4. [Savepoints](#savepoints)
5. [Isolation Levels](#isolation-levels)
6. [Read Phenomena](#read-phenomena)
7. [Read Committed (Default)](#read-committed-default)
8. [Repeatable Read](#repeatable-read)
9. [Serializable](#serializable)
10. [Choosing an Isolation Level](#choosing-an-isolation-level)
11. [Locking](#locking)
12. [Explicit Locks](#explicit-locks)
13. [Deadlocks](#deadlocks)
14. [Long-Running Transactions](#long-running-transactions)

---

## Why Transactions

Consider a money transfer:

```sql
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
```

Without transactions:

- If the first UPDATE succeeds and the second fails (crash, error), $100 vanished.
- If another query runs between them, it sees an inconsistent state ($100 missing).

Transactions solve both. Wrapped in a transaction, the two updates are atomic — both happen, or neither does — and other queries don't see the intermediate state.

---

## ACID

The transactional guarantees:

- **Atomicity** — all statements succeed or all fail. No partial application.
- **Consistency** — transactions move the database from one valid state to another. Constraints (NOT NULL, UNIQUE, FK) are checked.
- **Isolation** — concurrent transactions appear to run one at a time (subject to isolation level).
- **Durability** — once committed, data survives crashes.

ACID is what makes relational databases reliable. NoSQL systems often relax some guarantees in exchange for scale; SQL keeps them by default.

---

## BEGIN, COMMIT, ROLLBACK

### Basic transaction

```sql
BEGIN;
    UPDATE accounts SET balance = balance - 100 WHERE id = 1;
    UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

`BEGIN` starts a transaction. `COMMIT` makes the changes permanent.

If something goes wrong:

```sql
BEGIN;
    UPDATE accounts SET balance = balance - 100 WHERE id = 1;
    -- something detects an error
ROLLBACK;
```

`ROLLBACK` discards all changes since `BEGIN`.

### Syntax variants

Most databases accept:

```sql
BEGIN;          -- start
START TRANSACTION;  -- equivalent (standard)
COMMIT;          -- commit
END;             -- some databases accept END as alias for COMMIT (Postgres)
ROLLBACK;        -- abort
```

In application code, your database driver typically wraps this:

```python
# Python with psycopg
with conn:
    with conn.cursor() as cur:
        cur.execute("UPDATE ...")
        cur.execute("UPDATE ...")
    # commit on success, rollback on exception
```

```javascript
// Node.js with pg
await client.query('BEGIN');
try {
    await client.query('UPDATE ...');
    await client.query('UPDATE ...');
    await client.query('COMMIT');
} catch (e) {
    await client.query('ROLLBACK');
    throw e;
}
```

### Autocommit

By default, most database connections are in **autocommit** mode — each statement is its own transaction.

```sql
UPDATE users SET name = 'Alice' WHERE id = 1;
-- equivalent to:
-- BEGIN; UPDATE ...; COMMIT;
```

When you write `BEGIN`, you're saying "stop auto-committing until I say COMMIT."

Some clients (like the MySQL `mysql` CLI) disable autocommit by default — be aware of which mode you're in. Postgres `psql` is autocommit by default.

### Behavior on errors

When a statement errors inside a transaction, behavior differs:

- **Postgres**: the entire transaction is poisoned. Any subsequent statements error until you ROLLBACK.
- **MySQL**: only the failed statement is rolled back. Others stand. You can choose to continue or roll back.
- **SQL Server**: depends on settings (`XACT_ABORT`).
- **SQLite**: similar to Postgres.

Postgres's behavior is the safest — you're forced to acknowledge the error before continuing. Other databases require care.

### Commit means it's persisted (mostly)

After COMMIT, the data is durably written to disk and will survive a crash. Almost always. There are nuances:

- Postgres's `synchronous_commit = off` returns from COMMIT before the WAL is flushed (small risk of loss on power failure).
- MySQL's `innodb_flush_log_at_trx_commit = 0` or `2` similarly trade durability for speed.

Defaults are safe. Don't change these without understanding the implications.

---

## Savepoints

A savepoint is a marker within a transaction you can roll back to without aborting the whole thing.

```sql
BEGIN;
    INSERT INTO users (name) VALUES ('Alice');
    SAVEPOINT after_alice;
    
    INSERT INTO users (name) VALUES ('Bob');
    -- something goes wrong with Bob
    ROLLBACK TO SAVEPOINT after_alice;
    
    INSERT INTO users (name) VALUES ('Carol');
COMMIT;
```

Alice and Carol are inserted; Bob is not.

Savepoints let you handle expected errors (e.g., duplicate key) inside a transaction without losing all the work.

```sql
BEGIN;
    INSERT INTO users (email) VALUES ('a@example.com');
    SAVEPOINT sp;
    INSERT INTO users (email) VALUES ('a@example.com');  -- duplicate; errors
    ROLLBACK TO SAVEPOINT sp;
    -- continue with other work
COMMIT;
```

Without the savepoint, that duplicate-key error would (in Postgres) poison the transaction.

Most ORMs use savepoints internally for nested transactions ("subtransactions").

---

## Isolation Levels

Multiple transactions run concurrently. Isolation levels define what one transaction can see of another's in-progress work.

Four standard levels, from least to most strict:

1. **READ UNCOMMITTED** — can see uncommitted changes (rare in practice).
2. **READ COMMITTED** — sees only committed data; the default in most DBs.
3. **REPEATABLE READ** — same query returns same results within a transaction.
4. **SERIALIZABLE** — transactions appear to run sequentially; full isolation.

Setting:

```sql
-- Per session
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- Per transaction
BEGIN ISOLATION LEVEL REPEATABLE READ;
    -- ...
COMMIT;

-- Per session default (Postgres)
SET default_transaction_isolation = 'repeatable read';
```

Defaults vary:
- **Postgres**: Read Committed.
- **MySQL InnoDB**: Repeatable Read.
- **SQL Server**: Read Committed.
- **Oracle**: Read Committed.

---

## Read Phenomena

Three classic anomalies that stricter isolation levels prevent:

### Dirty read

Reading another transaction's uncommitted changes.

```
T1: BEGIN; UPDATE accounts SET balance = 500 WHERE id = 1;
T2: SELECT balance FROM accounts WHERE id = 1;   -- sees 500
T1: ROLLBACK;
-- T2 saw a value that never existed
```

Prevented at READ COMMITTED and above. Almost no real-world database operates at READ UNCOMMITTED.

### Non-repeatable read

A row's value changes between two reads within the same transaction.

```
T1: BEGIN; SELECT balance FROM accounts WHERE id = 1;  -- 1000
T2: UPDATE accounts SET balance = 500 WHERE id = 1; COMMIT;
T1: SELECT balance FROM accounts WHERE id = 1;  -- 500 (different!)
```

Prevented at REPEATABLE READ and above.

### Phantom read

New rows appear (or disappear) between queries within a transaction.

```
T1: BEGIN; SELECT COUNT(*) FROM accounts WHERE balance > 1000;  -- 5
T2: INSERT INTO accounts (balance) VALUES (2000); COMMIT;
T1: SELECT COUNT(*) FROM accounts WHERE balance > 1000;  -- 6
```

Prevented at SERIALIZABLE. In some implementations (Postgres, MySQL InnoDB), also prevented at REPEATABLE READ.

### Standards vs reality

The SQL standard says which levels must prevent which anomalies:

| Level | Dirty Read | Non-repeatable | Phantom |
|---|---|---|---|
| READ UNCOMMITTED | Allowed | Allowed | Allowed |
| READ COMMITTED | Prevented | Allowed | Allowed |
| REPEATABLE READ | Prevented | Prevented | Allowed |
| SERIALIZABLE | Prevented | Prevented | Prevented |

But implementations differ:
- **Postgres**: Read Uncommitted == Read Committed (no actual dirty reads). Repeatable Read also prevents phantoms (via snapshot isolation).
- **MySQL InnoDB**: Similar — Repeatable Read prevents phantoms.

In practice, most databases offer stronger guarantees than the standard requires. Test what your specific database does.

---

## Read Committed (Default)

Each statement sees a snapshot of committed data at the time the statement began. Within a transaction, two SELECTs can see different data.

```
T1: BEGIN; SELECT balance FROM accounts WHERE id = 1;  -- 1000
T2: UPDATE accounts SET balance = 500; COMMIT;
T1: SELECT balance FROM accounts WHERE id = 1;  -- 500
T1: COMMIT;
```

Pros: high concurrency, no surprising blocks.

Cons: queries within a transaction can return different data.

Sufficient for most application code. The default for a reason.

### Lost updates

A classic problem at Read Committed:

```
T1: BEGIN; SELECT balance FROM accounts WHERE id = 1;  -- 1000
T2: BEGIN; SELECT balance FROM accounts WHERE id = 1;  -- 1000
T1: UPDATE accounts SET balance = 1000 + 100;  -- 1100
T1: COMMIT;
T2: UPDATE accounts SET balance = 1000 + 50;   -- 1050  ← T1's change lost
T2: COMMIT;
```

Both transactions read 1000, both add to it, both commit. T1's $100 deposit is lost.

Fix: use atomic UPDATEs or row-level locks.

```sql
-- Atomic UPDATE (no lost updates)
UPDATE accounts SET balance = balance + 100 WHERE id = 1;

-- Or explicit lock
BEGIN;
    SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;  -- lock the row
    UPDATE accounts SET balance = balance + 100 WHERE id = 1;
COMMIT;
```

---

## Repeatable Read

Within a transaction, all reads see the same snapshot — taken at the start of the transaction. Other transactions' commits aren't visible until you commit/rollback.

```
T1: BEGIN; SELECT balance FROM accounts WHERE id = 1;  -- 1000
T2: UPDATE accounts SET balance = 500; COMMIT;
T1: SELECT balance FROM accounts WHERE id = 1;  -- still 1000
T1: COMMIT;
```

Pros: consistent reads.

Cons: more chance of conflicts. If you try to update a row that's been modified by another transaction, you may get an error (Postgres: "could not serialize access due to concurrent update").

### MySQL InnoDB's quirk

InnoDB at Repeatable Read uses next-key locking on reads with `SELECT ... FOR UPDATE` (and updates). This prevents phantom reads but can cause deadlocks and locking contention.

InnoDB also has a behavior where reads don't lock but writes inside a transaction see committed-after-tx-start data (the "current read" mode). This breaks the strict snapshot model but is common.

### Postgres snapshot isolation

Postgres's Repeatable Read implements snapshot isolation. No locks on reads, true snapshot. But two transactions modifying the same data:

```
T1: BEGIN ISOLATION LEVEL REPEATABLE READ;
    SELECT balance FROM accounts WHERE id = 1;  -- 1000
T2: BEGIN; UPDATE accounts SET balance = 500 WHERE id = 1; COMMIT;
T1: UPDATE accounts SET balance = balance - 100 WHERE id = 1;
-- ERROR: could not serialize access due to concurrent update
```

You retry T1.

---

## Serializable

The strongest level. Transactions execute as if there were a serial order — no concurrency anomalies possible.

```
T1: BEGIN ISOLATION LEVEL SERIALIZABLE;
    SELECT COUNT(*) FROM accounts WHERE balance > 1000;
    INSERT INTO accounts (balance) VALUES (1500);
COMMIT;
```

If another transaction interferes in a way that would violate serializability, one transaction will be aborted with an error. You retry.

Postgres uses Serializable Snapshot Isolation (SSI) — a lock-free implementation that detects conflicts and aborts transactions only when needed.

MySQL/InnoDB implements Serializable via shared locks on reads — heavy and reduces concurrency.

### Practical use

Serializable is the right answer for code that's hard to reason about with weaker levels — financial transfers, inventory updates with complex constraints, anything requiring multi-row invariants.

Cost: more transaction retries needed in your application. Your code must handle "concurrent update" errors by re-running the transaction.

```python
for attempt in range(3):
    try:
        with conn.transaction(isolation_level='SERIALIZABLE'):
            # do work
        break
    except SerializationError:
        if attempt == 2:
            raise
        continue
```

---

## Choosing an Isolation Level

Pragmatic guidance:

- **Default (Read Committed)** — fine for most application code. Use atomic UPDATEs or explicit row locks for "read-modify-write" patterns.
- **Repeatable Read** — useful for reports and analytics that need a consistent snapshot.
- **Serializable** — use when correctness depends on complex multi-row invariants and you can afford retries.

Don't overthink it. Most teams ship at the default, fix concurrency bugs as they arise (often by adding `FOR UPDATE` to selects or restructuring the logic), and rarely change the isolation level globally.

---

## Locking

Beyond isolation levels, the database uses **locks** to control concurrent access.

### Lock types

**Row locks**: lock individual rows. Most contention is at this level.

**Table locks**: lock the entire table. Heavier; used for DDL operations.

**Shared locks**: multiple transactions can hold them. For reads (often).

**Exclusive locks**: only one transaction at a time. For writes.

The matrix: a transaction holding an exclusive lock blocks any other transaction wanting any lock on that resource. A shared lock allows other shared locks but blocks exclusive.

### Implicit locking

Regular UPDATE / DELETE / INSERT acquire row-level exclusive locks on affected rows for the duration of the transaction.

```sql
BEGIN;
    UPDATE accounts SET balance = 500 WHERE id = 1;  -- acquires exclusive lock on row 1
    -- other transactions trying to update row 1 wait
COMMIT;  -- lock released
```

This is why keeping transactions short matters — held locks block others.

### Multi-Version Concurrency Control (MVCC)

Postgres and MySQL (InnoDB) use MVCC: reads don't take locks, they see a snapshot. Writes create new row versions and the old version is kept for older transactions to see.

This means readers don't block writers and vice versa — a big concurrency win over older lock-everything designs.

Older databases (and SQL Server in default mode) used pessimistic locking — reads took shared locks, blocking writers. SQL Server now has snapshot isolation (RCSI) which behaves like MVCC, but it's opt-in:

```sql
ALTER DATABASE MyDb SET READ_COMMITTED_SNAPSHOT ON;
```

---

## Explicit Locks

### `SELECT ... FOR UPDATE`

Acquires an exclusive lock on the selected rows.

```sql
BEGIN;
    SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;  -- locks row 1
    -- compute new balance based on this
    UPDATE accounts SET balance = ... WHERE id = 1;
COMMIT;
```

Other transactions that try to `UPDATE`, `DELETE`, or `SELECT ... FOR UPDATE` on the same row wait until this commits.

Use when:
- You read a value, compute something, then update based on it.
- You need to prevent concurrent modifications during a read-write sequence.

### `SELECT ... FOR SHARE` (Postgres / MySQL)

Shared lock — others can read but not modify.

```sql
SELECT * FROM users WHERE id = 1 FOR SHARE;
```

Less common; usually plain SELECT (no lock under MVCC) or `FOR UPDATE` is what you want.

### `FOR UPDATE SKIP LOCKED`

For job queues:

```sql
BEGIN;
    SELECT * FROM jobs WHERE status = 'pending' ORDER BY created_at
    LIMIT 1 FOR UPDATE SKIP LOCKED;
    
    -- got a job exclusively; mark as in-progress and process
COMMIT;
```

Workers don't block each other — each grabs a job nobody else is processing. Avoids contention on the queue.

Available in Postgres 9.5+, MySQL 8+, SQL Server (different syntax: `WITH (READPAST)`).

### `LOCK TABLE` (table-level locks)

```sql
LOCK TABLE accounts IN EXCLUSIVE MODE;     -- blocks all access
LOCK TABLE accounts IN SHARE MODE;          -- blocks writes
```

Heavy. Used for bulk operations or DDL coordination. Rare in application code.

### Advisory locks (Postgres)

Application-defined locks that don't correspond to any table/row:

```sql
SELECT pg_advisory_lock(42);
-- only one client at a time holds lock 42; others wait
SELECT pg_advisory_unlock(42);
```

Use for mutex-style coordination across application instances. Like Redis or Zookeeper locks but inside Postgres.

---

## Deadlocks

When two transactions each hold a lock the other needs, neither can proceed.

```
T1: BEGIN; UPDATE accounts SET ... WHERE id = 1;  -- holds lock on row 1
T2: BEGIN; UPDATE accounts SET ... WHERE id = 2;  -- holds lock on row 2
T1: UPDATE accounts SET ... WHERE id = 2;          -- waits for T2
T2: UPDATE accounts SET ... WHERE id = 1;          -- waits for T1
-- DEADLOCK
```

Databases detect deadlocks and abort one transaction:

```
ERROR: deadlock detected
DETAIL: Process X waits for ShareLock on transaction Y; ...
```

Your application receives the error and should retry.

### Preventing deadlocks

Lock in a consistent order. If every transaction locks rows in ascending order by ID, deadlocks are impossible:

```sql
-- Always lock the lower ID first
BEGIN;
    UPDATE accounts SET ... WHERE id = LEAST(1, 2);
    UPDATE accounts SET ... WHERE id = GREATEST(1, 2);
COMMIT;
```

Or use a single statement when possible:

```sql
UPDATE accounts SET ... WHERE id IN (1, 2);
```

The database orders the updates internally.

### Common deadlock patterns

- **Foreign key cascades**: deleting from a parent table cascades to multiple child tables in some order; concurrent deletes can deadlock.
- **Index lock contention** (MySQL gap locks): less obvious — even non-overlapping ranges can deadlock due to gap locking.
- **DDL during writes**: ALTER TABLE blocks reads/writes and can deadlock.

For deadlocks that keep happening, your application logic needs review. Logs include both transactions' queries — read them carefully.

---

## Long-Running Transactions

Long transactions are a problem in MVCC databases like Postgres.

### Why they're bad

MVCC keeps old versions of rows for in-progress transactions. A transaction open for hours forces the database to retain row versions that long.

Symptoms:
- Table bloat (Postgres): old row versions accumulate.
- Autovacuum can't reclaim space until the long transaction finishes.
- Replication lag (replicas wait for the source).

### What "long" means

In an OLTP system, "long" is anything over a few seconds for a typical workload. Analytics queries running for an hour are fine if they're rare; a transaction held open for hours by an unhandled application error is a problem.

### Tracking down long transactions

```sql
-- Postgres
SELECT pid, now() - xact_start AS age, query
FROM pg_stat_activity
WHERE xact_start IS NOT NULL
ORDER BY xact_start;
```

### Avoiding accidentally long transactions

- Don't `BEGIN` and wait for user input. The transaction is open during the wait.
- Set client/server timeouts.
- Commit periodically in long batch jobs.

```sql
-- Postgres: idle-in-transaction timeout
SET idle_in_transaction_session_timeout = '5min';
```

After 5 minutes idle in a transaction, the session is terminated. Catches forgotten transactions.

---

## Putting it together

A complete pattern for the money-transfer scenario:

```python
def transfer_money(from_id, to_id, amount):
    for attempt in range(3):
        try:
            with conn.transaction(isolation_level='REPEATABLE READ'):
                # Lock both accounts in a consistent order to prevent deadlocks
                ids = sorted([from_id, to_id])
                rows = conn.execute(
                    "SELECT id, balance FROM accounts WHERE id IN %s FOR UPDATE",
                    (tuple(ids),)
                ).fetchall()
                balances = {r['id']: r['balance'] for r in rows}
                
                if balances[from_id] < amount:
                    raise InsufficientFunds()
                
                conn.execute("UPDATE accounts SET balance = balance - %s WHERE id = %s", (amount, from_id))
                conn.execute("UPDATE accounts SET balance = balance + %s WHERE id = %s", (amount, to_id))
                
                # Implicit COMMIT at end of `with` block
            return  # success
        except SerializationError:
            if attempt == 2:
                raise
            continue
```

This is robust against:
- **Concurrent updates**: serializable + row locks prevent lost updates.
- **Deadlocks**: locking in sorted order.
- **Insufficient funds**: explicit check.
- **Transient errors**: retry loop.

Most real applications don't need quite this much. But for actual money, this is the shape.

---

## Key principles

- **Wrap multi-statement operations in transactions.** Atomicity is free.
- **Default isolation is Read Committed.** Fine for most cases.
- **Watch for lost updates** at lower isolation levels. Use `FOR UPDATE` or atomic UPDATEs.
- **Lock in consistent order** to prevent deadlocks.
- **Retry on serialization errors.** Concurrent failures are expected at higher isolation levels.
- **Keep transactions short.** Long transactions cause table bloat and lock contention.
- **Set timeouts.** Both query and idle-in-transaction.
- **Don't hold transactions across user input or external calls.** Read, close, do the slow thing, then start a new transaction to write.

Next: advanced queries — window functions, CTEs, recursive queries, subqueries.
