# 03. Joins

A join combines rows from two (or more) tables. It's the operation that makes relational databases relational — without joins, you'd have isolated tables. With joins, you can express relationships like "for each order, also give me the customer's name."

Joins are also where new SQL users hit their first wall. The mental model is everything.

---

## Table of Contents

1. [The Mental Model](#the-mental-model)
2. [The Setup: Two Related Tables](#the-setup-two-related-tables)
3. [INNER JOIN](#inner-join)
4. [LEFT JOIN (LEFT OUTER JOIN)](#left-join-left-outer-join)
5. [RIGHT JOIN](#right-join)
6. [FULL OUTER JOIN](#full-outer-join)
7. [CROSS JOIN](#cross-join)
8. [SELF JOIN](#self-join)
9. [Multi-Table Joins](#multi-table-joins)
10. [USING and Natural Joins](#using-and-natural-joins)
11. [Join Conditions Beyond Equality](#join-conditions-beyond-equality)
12. [Common Join Mistakes](#common-join-mistakes)
13. [Anti-Joins and Semi-Joins](#anti-joins-and-semi-joins)

---

## The Mental Model

A join is conceptually:

1. Take every row from the left table.
2. Take every row from the right table.
3. Produce all pairwise combinations.
4. Filter to keep only the pairs where the join condition is true.

That's the **inner join**. Other join types modify step 4 to also keep unmatched rows from one or both sides.

The Cartesian product (every pair) is usually huge — 1,000 × 1,000 = 1,000,000 candidate rows. The join condition reduces this to a sensible number. The database doesn't literally compute all pairs; it uses indexes and clever algorithms. But the *result* matches the conceptual model.

### Why this matters

When you write `SELECT a.x, b.y FROM a JOIN b ON a.id = b.a_id`, you're not "for each `a`, look up the matching `b`s." You're saying "pair every `a` with every `b`, keep where `a.id = b.a_id`."

Most of the time both descriptions produce the same result. But edge cases — duplicates, NULLs, missing matches — only make sense if you have the set-based model in your head.

---

## The Setup: Two Related Tables

Throughout this file, we'll use these tables:

```sql
CREATE TABLE users (
    id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name  TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);

CREATE TABLE orders (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     BIGINT REFERENCES users(id),
    total       NUMERIC(10, 2) NOT NULL,
    placed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO users (name, email) VALUES
    ('Alice', 'alice@example.com'),
    ('Bob',   'bob@example.com'),
    ('Carol', 'carol@example.com'),
    ('Dave',  'dave@example.com');

INSERT INTO orders (user_id, total) VALUES
    (1, 100.00),  -- Alice
    (1, 50.00),   -- Alice (second order)
    (2, 75.00),   -- Bob
    (NULL, 25.00); -- Anonymous order, no user
-- Dave has no orders.
-- Carol has no orders.
```

So we have:
- 4 users (Alice, Bob, Carol, Dave).
- 4 orders.
- Alice has 2 orders.
- Bob has 1 order.
- Carol and Dave have 0 orders.
- One order has no user (user_id is NULL).

---

## INNER JOIN

The default join. Returns rows where the join condition matches in both tables.

```sql
SELECT
    users.name,
    orders.total,
    orders.placed_at
FROM users
INNER JOIN orders ON users.id = orders.user_id;
```

Result:

```
name   | total  | placed_at
-------|--------|-------------
Alice  | 100.00 | 2024-03-15 ...
Alice  | 50.00  | 2024-03-15 ...
Bob    | 75.00  | 2024-03-15 ...
```

What's *not* there:
- Carol — no orders.
- Dave — no orders.
- The orphan order with `user_id = NULL` — no matching user.

`INNER` is optional; `JOIN` alone means `INNER JOIN`. Most SQL writers omit `INNER`:

```sql
SELECT users.name, orders.total
FROM users
JOIN orders ON users.id = orders.user_id;
```

### With table aliases

Cleaner with aliases:

```sql
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id;
```

For multi-table queries, aliases save a lot of typing.

### Inner join produces row duplication

Alice appears twice because she has two orders. This isn't a "duplicate" — it's the join doing its job. One row per matching (user, order) pair.

If you want one row per user with a count or sum, you need `GROUP BY` — see `04_aggregation.md`.

---

## LEFT JOIN (LEFT OUTER JOIN)

Returns all rows from the **left** table, plus matching rows from the right table. If there's no match, the right table's columns are NULL.

```sql
SELECT u.name, o.total, o.placed_at
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;
```

Result:

```
name   | total  | placed_at
-------|--------|-------------
Alice  | 100.00 | 2024-03-15 ...
Alice  | 50.00  | 2024-03-15 ...
Bob    | 75.00  | 2024-03-15 ...
Carol  | NULL   | NULL
Dave   | NULL   | NULL
```

Now Carol and Dave appear, with NULLs for the order columns. The orphan order (user_id = NULL) still isn't there — that's a right-side row with no left match.

### Why use LEFT JOIN

When you want "all left-side rows, plus their matches (if any)":

- All users, plus their orders if they have any.
- All products, plus their reviews if they have any.
- All employees, plus their managers if they have one.

### `OUTER` is optional

`LEFT JOIN` and `LEFT OUTER JOIN` are the same. The word `OUTER` is redundant. Most writers omit it.

### Finding rows without matches

Common pattern: find left-side rows that have no right-side match.

```sql
SELECT u.name
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.id IS NULL;
```

Result: `Carol`, `Dave`. Users with no orders.

The `WHERE o.id IS NULL` filters to rows where the join produced no right-side match. Since `id` is the right table's PK (which is `NOT NULL` for real rows), it's NULL only when the right side was unmatched.

This is one of the most useful join patterns. Often called an **anti-join**.

---

## RIGHT JOIN

Mirror image of LEFT JOIN. Returns all rows from the **right** table, plus matching left rows.

```sql
SELECT u.name, o.total
FROM users u
RIGHT JOIN orders o ON u.id = o.user_id;
```

Result:

```
name   | total
-------|--------
Alice  | 100.00
Alice  | 50.00
Bob    | 75.00
NULL   | 25.00    -- orphan order
```

The orphan order appears; Carol and Dave don't.

### Most people never use RIGHT JOIN

You can always rewrite a RIGHT JOIN as a LEFT JOIN by swapping the table order:

```sql
SELECT u.name, o.total FROM users u RIGHT JOIN orders o ON u.id = o.user_id;
-- ≡
SELECT u.name, o.total FROM orders o LEFT JOIN users u ON u.id = o.user_id;
```

It's a stylistic convention: keep all joins as LEFT JOIN, swap tables as needed. Reduces cognitive load — only one direction to think about.

---

## FULL OUTER JOIN

Returns all rows from both tables. If there's no match, the other side's columns are NULL.

```sql
SELECT u.name, o.total
FROM users u
FULL OUTER JOIN orders o ON u.id = o.user_id;
```

Result:

```
name   | total
-------|--------
Alice  | 100.00
Alice  | 50.00
Bob    | 75.00
Carol  | NULL
Dave   | NULL
NULL   | 25.00
```

Both unmatched users (Carol, Dave) and the orphan order appear.

### Use case

Comparison and reconciliation. "Show me users with orders, users without orders, and orders without users." Find inconsistencies between two related sets.

### MySQL has no FULL OUTER JOIN

MySQL doesn't support it directly. Workaround: `UNION` of LEFT and RIGHT join results:

```sql
SELECT u.name, o.total FROM users u LEFT JOIN orders o ON u.id = o.user_id
UNION
SELECT u.name, o.total FROM users u RIGHT JOIN orders o ON u.id = o.user_id;
```

Postgres, SQLite (3.39+), SQL Server all support FULL OUTER JOIN natively.

---

## CROSS JOIN

The unfiltered Cartesian product — every combination of rows. No `ON` clause.

```sql
SELECT u.name, o.id
FROM users u
CROSS JOIN orders o;
```

4 users × 4 orders = 16 rows. Every user paired with every order, regardless of who placed it.

### When it's useful

Rare. Some legitimate uses:

- **Generating combinations** — every possible (size, color) pair from two lists.
- **Building reports with empty cells** — every (region, product) combo with a fact table on the side, then LEFT JOIN to fill in actual values.
- **Some statistical or analytical queries** — e.g., a calendar table joined to entities to fill in missing dates.

### The accidental cross join

If you forget the `ON` clause in an inner join, some dialects treat it as a cross join. More commonly, if you list multiple tables in `FROM` without a `WHERE` filter, you get a cross join:

```sql
-- Implicit cross join (old-style syntax)
SELECT u.name, o.total FROM users u, orders o;

-- Same as:
SELECT u.name, o.total FROM users u CROSS JOIN orders o;
```

This is why we use `JOIN ... ON` syntax explicitly. The old comma-separated style mixed with `WHERE` makes accidental cross joins easy:

```sql
-- "JOIN" by listing tables and filtering with WHERE — old style, error-prone
SELECT u.name, o.total
FROM users u, orders o
WHERE u.id = o.user_id;       -- if you forget this, cross join
```

Use `JOIN ... ON` syntax for explicit joins. The old comma-list-with-WHERE works but isn't recommended.

---

## SELF JOIN

Joining a table to itself. Always requires aliases (you need two names for the table).

### Example: hierarchical data

```sql
CREATE TABLE employees (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name      TEXT NOT NULL,
    manager_id BIGINT REFERENCES employees(id)
);

INSERT INTO employees (name, manager_id) VALUES
    ('Alice',  NULL),     -- CEO, no manager
    ('Bob',    1),        -- reports to Alice
    ('Carol',  1),        -- reports to Alice
    ('Dave',   2),        -- reports to Bob
    ('Eve',    2);        -- reports to Bob
```

Find each employee and their manager's name:

```sql
SELECT
    e.name AS employee_name,
    m.name AS manager_name
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;
```

Result:

```
employee_name | manager_name
--------------|--------------
Alice         | NULL
Bob           | Alice
Carol         | Alice
Dave          | Bob
Eve           | Bob
```

The same table is referenced twice with different aliases (`e` for employee, `m` for manager).

LEFT JOIN here so the CEO (no manager) still appears.

### When self-join falls short

Self-join finds direct relationships only. For multi-level hierarchies ("find all of Alice's descendants"), you need **recursive CTEs** — see `07_advanced_queries.md`.

---

## Multi-Table Joins

Real applications join many tables together.

```sql
CREATE TABLE products (
    id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name  TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL
);

CREATE TABLE order_items (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id   BIGINT NOT NULL REFERENCES orders(id),
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity   INT NOT NULL,
    price      NUMERIC(10, 2) NOT NULL    -- snapshot of price at order time
);
```

Now: for each order item, get the user, the order date, the product, and the quantity:

```sql
SELECT
    u.name AS user_name,
    o.placed_at,
    p.name AS product_name,
    oi.quantity,
    oi.price
FROM users u
JOIN orders o      ON u.id = o.user_id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p     ON oi.product_id = p.id
ORDER BY o.placed_at DESC, u.name;
```

Each `JOIN ... ON` adds another table to the result. The order of joins matters for readability but not for correctness — the database optimizer picks the actual execution order.

### Mix join types

```sql
SELECT
    u.name,
    o.placed_at,
    COUNT(oi.id) AS item_count
FROM users u
LEFT JOIN orders o      ON u.id = o.user_id           -- include users with no orders
LEFT JOIN order_items oi ON o.id = oi.order_id        -- include orders with no items
GROUP BY u.name, o.placed_at;
```

All users included, even those without orders. Orders included even if empty. Then count their items (will be 0 for users with no orders, since LEFT JOIN preserves them with NULL on the right).

Note: `COUNT(oi.id)` not `COUNT(*)` — `COUNT(*)` counts the row even when join produced a NULL right side. `COUNT(oi.id)` counts only rows with actual items.

### Join condition vs WHERE in outer joins

Important: where you put a filter affects the result.

```sql
-- Filter as part of the JOIN condition
SELECT u.name, o.total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id AND o.total > 50;
```

```sql
-- Filter in WHERE clause
SELECT u.name, o.total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.total > 50;
```

These produce different results:

- **Join-condition filter**: keep all users, but only match orders with `total > 50`. Carol/Dave still appear (with NULL).
- **WHERE filter**: filter the joined result. Since Carol and Dave have NULL `total`, `NULL > 50` is NULL, and they're filtered out. The LEFT JOIN behaves like an INNER JOIN.

This is a very common source of bugs. The rule: when filtering the right side of an outer join, put the filter in the `ON` clause to preserve the outer-join semantics; put it in `WHERE` to filter the joined result.

For INNER JOINs, it doesn't matter where you put the filter.

---

## USING and Natural Joins

### USING

When the columns being joined have the same name:

```sql
SELECT u.name, o.total
FROM users u
JOIN orders o USING (user_id);   -- but our column is called user_id in orders and id in users
```

That doesn't work for our schema. But if both tables had `user_id`:

```sql
SELECT u.name, o.total
FROM users u
JOIN orders o USING (user_id);
-- equivalent to: JOIN orders o ON u.user_id = o.user_id
```

`USING` also collapses the column into one in the output (you can't reference `u.user_id` and `o.user_id` separately — just `user_id`).

A bit cleaner when column names match. Some teams use it; some prefer explicit `ON` for clarity. I lean toward explicit `ON` — it's more flexible and more readable in complex queries.

### NATURAL JOIN — avoid

```sql
SELECT * FROM users NATURAL JOIN orders;
```

Joins on all columns with the same name. Looks elegant. Don't use it.

- If a column is added to either table with a matching name, the query silently changes meaning.
- Reading the query, you can't tell what it's joining on without looking at both schemas.

The fragility outweighs the conciseness. Use explicit `ON` or `USING`.

---

## Join Conditions Beyond Equality

Most joins are equi-joins (`ON a.x = b.y`). But the condition is just a boolean expression — anything is legal.

### Inequality joins

```sql
-- For each user, find all orders placed more recently than their last login
SELECT u.name, o.total, o.placed_at
FROM users u
JOIN orders o ON u.id = o.user_id AND o.placed_at > u.last_login_at;
```

### Range joins (e.g., for binning)

```sql
CREATE TABLE price_tiers (
    name      TEXT,
    min_price NUMERIC,
    max_price NUMERIC
);

SELECT p.name, pt.name AS tier
FROM products p
JOIN price_tiers pt ON p.price >= pt.min_price AND p.price < pt.max_price;
```

Each product matched to the tier whose range contains its price.

### Self-join with inequality

Find pairs of users with the same email domain:

```sql
SELECT u1.name AS user1, u2.name AS user2
FROM users u1
JOIN users u2 ON u1.id < u2.id    -- avoid (a,b) and (b,a) duplicates, and (a,a)
              AND split_part(u1.email, '@', 2) = split_part(u2.email, '@', 2);
```

The `u1.id < u2.id` is important — it filters out duplicates (each pair appears once) and avoids self-pairs (a user paired with themselves).

Inequality joins are powerful but can be slow — they often can't use indexes as effectively. Profile if performance matters.

---

## Common Join Mistakes

### Forgetting the join condition

```sql
SELECT u.name, o.total FROM users u JOIN orders o;     -- error in some dialects; cross join in others
```

Postgres requires `ON` or `USING` in explicit joins. MySQL treats this as cross join. Either way, almost certainly a bug.

### The N+1 query problem (application-side)

```python
# Slow! N+1 queries
users = db.query("SELECT * FROM users")
for user in users:
    orders = db.query(f"SELECT * FROM orders WHERE user_id = {user.id}")
```

A bug, not a SQL bug. Application makes 1 query for users, then N more for each user's orders. Solution: one JOIN query, or batch with `WHERE user_id IN (...)`.

### Joining on the wrong columns

```sql
-- Bug: joining on price (a random value), not on ID
SELECT u.name, o.total FROM users u JOIN orders o ON u.id = o.total;
```

The query "works" — it produces a result. The result is nonsense. SQL won't tell you the columns don't make sense; the join condition just has to be a boolean expression.

### Duplicating rows via fan-out

```sql
-- Suppose each user has multiple orders AND multiple addresses
SELECT u.name, o.total, a.city
FROM users u
JOIN orders u ON u.id = o.user_id
JOIN addresses a ON u.id = a.user_id;
```

If Alice has 3 orders and 2 addresses, she appears 6 times — once per (order, address) combination. The join "multiplies" through unrelated dimensions.

To fix: aggregate first or restructure. Often the right answer is to query each subset separately and stitch in the application, or use a CTE/subquery.

### Filtering an outer join with WHERE (covered above)

Restating: `WHERE` filtering on the right side of an outer join effectively turns it into an inner join. Use the `ON` clause for outer-join-side filtering.

### Misuse of `COUNT(*)` with LEFT JOIN

```sql
-- "Number of orders per user, including users with 0 orders"
SELECT u.name, COUNT(*) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.name;
```

Result: Carol and Dave get `order_count = 1` (because the LEFT JOIN gave them one row with NULL on the order side, and `COUNT(*)` counts that row).

Fix: `COUNT(o.id)`:

```sql
SELECT u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.name;
```

`COUNT(o.id)` counts non-NULL values of `o.id`. Carol and Dave now correctly get 0.

---

## Anti-Joins and Semi-Joins

### Anti-join: "rows in A with no match in B"

The LEFT JOIN + IS NULL pattern:

```sql
SELECT u.* FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.id IS NULL;
```

Or `NOT EXISTS`:

```sql
SELECT * FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM orders o WHERE o.user_id = u.id
);
```

Or `NOT IN`:

```sql
SELECT * FROM users WHERE id NOT IN (SELECT user_id FROM orders WHERE user_id IS NOT NULL);
```

All three find users with no orders. Performance and NULL-handling differ:

- `NOT EXISTS` — usually fast, handles NULLs cleanly.
- `LEFT JOIN ... IS NULL` — fast, depends on optimizer.
- `NOT IN` — slower in many DBs; **buggy with NULL** (covered in `02_querying.md`).

`NOT EXISTS` is generally the cleanest and safest choice.

### Semi-join: "rows in A that have a match in B"

`EXISTS`:

```sql
SELECT * FROM users u WHERE EXISTS (
    SELECT 1 FROM orders o WHERE o.user_id = u.id
);
```

Or `IN`:

```sql
SELECT * FROM users WHERE id IN (SELECT user_id FROM orders);
```

Both find users with at least one order. Unlike `JOIN`, neither duplicates the row when there are multiple matches — semi-join returns one row per match-existing row.

```sql
-- This duplicates Alice (she has 2 orders)
SELECT u.* FROM users u JOIN orders o ON u.id = o.user_id;

-- This gives Alice once
SELECT * FROM users u WHERE EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);
```

`EXISTS` is the right choice when you want "users who have an order" (one row per user) rather than "all (user, order) pairs."

### `EXISTS` vs `IN`

For semi-joins:

- `EXISTS (SELECT 1 FROM ...)` — boolean. Tests whether any row exists.
- `IN (SELECT col FROM ...)` — set membership.

Performance is usually similar; both can use indexes. `EXISTS` is more flexible (the subquery can correlate with the outer query on multiple columns). `IN` is sometimes more readable.

For NULL-safe behavior, prefer `EXISTS`.

---

## Putting it together

A realistic query that pulls a customer's full recent order with line items:

```sql
SELECT
    u.name AS customer_name,
    u.email,
    o.id AS order_id,
    o.placed_at,
    o.total,
    p.name AS product_name,
    oi.quantity,
    oi.price AS price_at_purchase,
    oi.quantity * oi.price AS line_total
FROM users u
JOIN orders o      ON u.id = o.user_id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p     ON oi.product_id = p.id
WHERE o.placed_at >= NOW() - INTERVAL '30 days'
  AND u.email = 'alice@example.com'
ORDER BY o.placed_at DESC, oi.id;
```

Reads: "for customer Alice, find every order placed in the last 30 days; for each order, list every item; show the product details and pricing."

This is a typical e-commerce query. Each `JOIN ... ON` adds another dimension. The `WHERE` filters; the `ORDER BY` sorts.

---

## Key principles

- **A join is a Cartesian product filtered by a condition.** Keep this mental model.
- **INNER JOIN keeps only matches; LEFT JOIN keeps all left-side rows.** Pick based on whether unmatched rows should appear.
- **Filter outer-join-side conditions in the `ON` clause**, not `WHERE`, or you'll turn outer into inner.
- **Use table aliases.** Especially with multiple tables.
- **`COUNT(o.id)` vs `COUNT(*)`** in LEFT JOIN aggregates — only the former gives accurate zero counts.
- **Use `EXISTS` / `NOT EXISTS` for semi/anti-joins.** They're clearer and NULL-safe.
- **Avoid `NATURAL JOIN`.** Implicit behavior is fragile.
- **Be aware of fan-out** — joining a row to multiple matches multiplies rows. May or may not be what you want.

Next: aggregation — counting, summing, averaging, and grouping rows.
