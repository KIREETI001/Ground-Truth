# 07. Advanced Queries

The features in this file separate basic SQL from analytical SQL: window functions, CTEs, recursive queries. These are where SQL becomes genuinely powerful for analysis and reporting — patterns that would require pages of procedural code reduce to one query.

If you do any analytics work or write non-trivial application queries, this is the most leverage-per-effort chapter.

---

## Table of Contents

1. [Subqueries](#subqueries)
2. [Common Table Expressions (CTEs)](#common-table-expressions-ctes)
3. [Window Functions: The Concept](#window-functions-the-concept)
4. [ROW_NUMBER, RANK, DENSE_RANK](#row_number-rank-dense_rank)
5. [LAG, LEAD: Comparing Rows](#lag-lead-comparing-rows)
6. [FIRST_VALUE, LAST_VALUE, NTH_VALUE](#first_value-last_value-nth_value)
7. [Window Aggregates: Running Totals](#window-aggregates-running-totals)
8. [Custom Frames](#custom-frames)
9. [Recursive CTEs](#recursive-ctes)
10. [UNION, INTERSECT, EXCEPT](#union-intersect-except)
11. [LATERAL Joins](#lateral-joins)
12. [Pivoting Data](#pivoting-data)

---

## Subqueries

A subquery is a query inside another query. Three places they appear:

### In the WHERE clause

```sql
-- Users with above-average order totals
SELECT * FROM users
WHERE id IN (
    SELECT user_id FROM orders
    WHERE total > (SELECT AVG(total) FROM orders)
);
```

The outermost query gets users; the middle subquery finds qualifying user IDs; the innermost computes the average.

### In the FROM clause (derived tables)

```sql
SELECT u.name, summary.order_count
FROM users u
JOIN (
    SELECT user_id, COUNT(*) AS order_count
    FROM orders
    GROUP BY user_id
) summary ON u.id = summary.user_id;
```

The subquery acts like a table. Useful for pre-aggregating before joining.

### In the SELECT clause (scalar subqueries)

```sql
SELECT
    u.name,
    (SELECT COUNT(*) FROM orders WHERE user_id = u.id) AS order_count
FROM users u;
```

Returns one value per outer row. Each subquery runs per row of the outer (though the planner may optimize).

### Correlated vs uncorrelated

- **Uncorrelated**: the subquery doesn't reference the outer query. Computed once.
- **Correlated**: the subquery references the outer (e.g., `WHERE user_id = u.id`). Conceptually computed per outer row, though optimizers do better in practice.

Correlated subqueries are powerful but can be slow on large data. Equivalent JOINs or window functions are often faster.

### `EXISTS` and `NOT EXISTS`

Test for the existence of matching rows (covered in `03_joins.md` for semi/anti-joins):

```sql
SELECT * FROM users u WHERE EXISTS (
    SELECT 1 FROM orders WHERE user_id = u.id
);
```

The `1` is conventional; you can `SELECT *` or any expression — `EXISTS` only checks "are there rows?", not what they contain.

---

## Common Table Expressions (CTEs)

CTEs are named subqueries that come at the top of the query. They make complex queries readable.

```sql
WITH active_users AS (
    SELECT * FROM users WHERE last_login_at >= NOW() - INTERVAL '30 days'
)
SELECT * FROM active_users WHERE country = 'USA';
```

`active_users` is defined once, used like a table.

### Multiple CTEs

```sql
WITH
    active_users AS (
        SELECT * FROM users WHERE last_login_at >= NOW() - INTERVAL '30 days'
    ),
    recent_orders AS (
        SELECT * FROM orders WHERE placed_at >= NOW() - INTERVAL '30 days'
    )
SELECT u.name, COUNT(o.id) AS order_count
FROM active_users u
LEFT JOIN recent_orders o ON u.id = o.user_id
GROUP BY u.name;
```

CTEs can reference earlier ones. Each is named once and reusable.

### CTEs vs subqueries

```sql
-- With subquery (works but harder to read for complex logic)
SELECT u.name, COUNT(o.id)
FROM (SELECT * FROM users WHERE ...) u
LEFT JOIN (SELECT * FROM orders WHERE ...) o ON u.id = o.user_id
GROUP BY u.name;

-- With CTE (clearer)
WITH active_users AS (...), recent_orders AS (...)
SELECT u.name, COUNT(o.id)
FROM active_users u
LEFT JOIN recent_orders o ON u.id = o.user_id
GROUP BY u.name;
```

The CTE version reads top-to-bottom: define active users, define recent orders, combine them.

### Performance

In Postgres pre-12, CTEs were "optimization fences" — the database materialized them as separate operations. Postgres 12+ optimizes through CTEs by default (`MATERIALIZED` keyword can force materialization).

Other databases (MySQL 8+, SQL Server, SQLite) handle CTEs as inline subqueries by default.

For most cases, CTEs and subqueries perform similarly. Use CTEs for readability; reach for subqueries when the planner needs hints.

### Writable CTEs (Postgres)

CTEs can contain INSERT/UPDATE/DELETE in Postgres:

```sql
WITH archived AS (
    DELETE FROM orders
    WHERE placed_at < NOW() - INTERVAL '1 year'
    RETURNING *
)
INSERT INTO archived_orders SELECT * FROM archived;
```

Move data atomically: delete from one table and insert into another in one statement.

---

## Window Functions: The Concept

A window function computes a value for each row, looking at a "window" of related rows. Unlike aggregate functions (which collapse rows into groups), window functions keep all rows.

The basic syntax:

```sql
function() OVER (
    [PARTITION BY columns]
    [ORDER BY columns]
    [frame clause]
)
```

- `PARTITION BY`: divide rows into groups (like GROUP BY but each row still returned).
- `ORDER BY`: order within each partition (for ranking, running totals, lead/lag).
- Frame clause: which rows in the partition to include.

Example:

```sql
SELECT
    name,
    department,
    salary,
    AVG(salary) OVER (PARTITION BY department) AS dept_avg
FROM employees;
```

Result:

```
name  | department | salary | dept_avg
------|------------|--------|----------
Alice | Eng        | 100000 | 95000
Bob   | Eng        | 90000  | 95000
Carol | Sales      | 80000  | 85000
Dave  | Sales      | 90000  | 85000
```

Each row has the average for its department. The original rows are preserved.

This would be much harder without window functions — you'd compute the average per department in a subquery, then join back.

### Window functions vs GROUP BY

```sql
-- GROUP BY: collapses rows
SELECT department, AVG(salary) FROM employees GROUP BY department;
-- Returns one row per department

-- Window: keeps all rows
SELECT name, department, AVG(salary) OVER (PARTITION BY department) FROM employees;
-- Returns one row per employee with the dept average alongside
```

Use window when you need both row-level detail and group-level computation.

---

## ROW_NUMBER, RANK, DENSE_RANK

Three ranking functions.

```sql
SELECT
    name,
    salary,
    ROW_NUMBER() OVER (ORDER BY salary DESC) AS row_num,
    RANK()       OVER (ORDER BY salary DESC) AS rank,
    DENSE_RANK() OVER (ORDER BY salary DESC) AS dense_rank
FROM employees;
```

If salaries are 100, 90, 90, 80:

```
salary | row_num | rank | dense_rank
-------|---------|------|------------
100    | 1       | 1    | 1
90     | 2       | 2    | 2
90     | 3       | 2    | 2
80     | 4       | 4    | 3
```

- **ROW_NUMBER**: 1, 2, 3, 4. Always sequential. Ties broken arbitrarily.
- **RANK**: 1, 2, 2, 4. Ties get the same rank; next rank skips.
- **DENSE_RANK**: 1, 2, 2, 3. Ties get the same rank; next rank doesn't skip.

### Partitioning for "top N per group"

```sql
-- Top 3 earners per department
SELECT *
FROM (
    SELECT
        name,
        department,
        salary,
        ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rn
    FROM employees
) ranked
WHERE rn <= 3;
```

Each department is ranked independently. Filter to top 3 in each.

This is the canonical "top N per group" pattern. Equivalent without window functions requires complex correlated subqueries.

### Picking the latest row per group

```sql
-- For each user, the most recent order
SELECT *
FROM (
    SELECT *,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY placed_at DESC) AS rn
    FROM orders
) ranked
WHERE rn = 1;
```

Or in Postgres, `DISTINCT ON`:

```sql
SELECT DISTINCT ON (user_id) *
FROM orders
ORDER BY user_id, placed_at DESC;
```

Both work. ROW_NUMBER is portable; DISTINCT ON is more concise but Postgres-only.

---

## LAG, LEAD: Comparing Rows

`LAG` and `LEAD` give you the value from a previous/next row in the partition.

```sql
SELECT
    placed_at,
    total,
    LAG(total) OVER (ORDER BY placed_at) AS prev_total,
    total - LAG(total) OVER (ORDER BY placed_at) AS change_from_prev
FROM orders;
```

For each order, show the previous order's total and the difference.

```
placed_at  | total | prev_total | change
-----------|-------|------------|-------
2024-01-01 | 100   | NULL       | NULL
2024-01-02 | 150   | 100        | 50
2024-01-03 | 120   | 150        | -30
2024-01-04 | 200   | 120        | 80
```

First row has NULL because there's no previous.

### Per-user previous order

```sql
SELECT
    user_id,
    placed_at,
    total,
    LAG(total) OVER (PARTITION BY user_id ORDER BY placed_at) AS prev_total
FROM orders;
```

Within each user's orders, get the previous one.

### LAG with offset and default

```sql
LAG(total, 1, 0) OVER (ORDER BY placed_at)
-- Look back 1 row; if no row exists, return 0 instead of NULL
```

`LAG(col, offset, default)` — second arg is how far back; third is the default.

### Use cases

- **Period-over-period change**: this month vs last month.
- **Detecting state changes**: when did this status flip?
- **Time gaps**: how long between consecutive events?

```sql
-- Time gap between consecutive events
SELECT
    user_id,
    event_at,
    event_at - LAG(event_at) OVER (PARTITION BY user_id ORDER BY event_at) AS gap
FROM events;
```

---

## FIRST_VALUE, LAST_VALUE, NTH_VALUE

Get specific values from within the window.

```sql
SELECT
    name,
    department,
    salary,
    FIRST_VALUE(salary) OVER (PARTITION BY department ORDER BY salary DESC) AS highest_in_dept,
    FIRST_VALUE(name)   OVER (PARTITION BY department ORDER BY salary DESC) AS top_earner_in_dept
FROM employees;
```

Each row gets the highest salary (and the name of the person earning it) in its department.

`LAST_VALUE` is trickier because the default frame doesn't include rows after the current — see frame clauses below.

---

## Window Aggregates: Running Totals

Aggregate functions can be window functions too.

```sql
SELECT
    placed_at,
    total,
    SUM(total) OVER (ORDER BY placed_at) AS running_total
FROM orders;
```

Running sum of orders:

```
placed_at  | total | running_total
-----------|-------|---------------
2024-01-01 | 100   | 100
2024-01-02 | 150   | 250
2024-01-03 | 120   | 370
2024-01-04 | 200   | 570
```

Per group:

```sql
SELECT
    user_id,
    placed_at,
    total,
    SUM(total) OVER (PARTITION BY user_id ORDER BY placed_at) AS user_running_total
FROM orders;
```

Each user gets their own running total reset.

### Moving averages

```sql
SELECT
    day,
    revenue,
    AVG(revenue) OVER (
        ORDER BY day
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS rolling_7day_avg
FROM daily_revenue;
```

7-day moving average. The `ROWS BETWEEN` is a **frame clause** specifying which rows the AVG operates over.

---

## Custom Frames

The frame clause specifies which rows in the partition the window function sees. Defaults:

- With `ORDER BY`: `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` — from the start to the current row.
- Without `ORDER BY`: the entire partition.

That's why `SUM(...) OVER (ORDER BY ...)` gives a running total — the default frame is "everything up to here."

### `ROWS` vs `RANGE`

- **ROWS** — based on physical row positions.
- **RANGE** — based on values (rows with equal ORDER BY values are treated as one group).

```sql
-- Sum of current row and 2 preceding rows (3-row window)
SUM(x) OVER (ORDER BY day ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)

-- Sum of all rows with ORDER BY values within "2 PRECEDING" range
SUM(x) OVER (ORDER BY day RANGE BETWEEN 2 PRECEDING AND CURRENT ROW)
```

For most cases, `ROWS` is what you want.

### Frame syntax

```sql
ROWS BETWEEN
    [UNBOUNDED PRECEDING | n PRECEDING | CURRENT ROW]
    AND
    [CURRENT ROW | n FOLLOWING | UNBOUNDED FOLLOWING]
```

Examples:

```sql
-- All rows in partition
ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING

-- Current row and all after
ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING

-- 3 rows before, 3 rows after, plus current
ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING

-- Just the current row
ROWS BETWEEN CURRENT ROW AND CURRENT ROW
```

### `LAST_VALUE` needs explicit frame

```sql
-- Wrong: returns current row's value (default frame ends at current row)
LAST_VALUE(x) OVER (ORDER BY day)

-- Right: explicitly extend to end of partition
LAST_VALUE(x) OVER (
    ORDER BY day
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
)
```

This is a common gotcha. `LAST_VALUE` looks like it should give "the last value in the partition" but with the default frame, "last" means "the current row's value."

---

## Recursive CTEs

CTEs can reference themselves, enabling recursive queries. Used for hierarchies, graph traversal, sequence generation.

### Syntax

```sql
WITH RECURSIVE cte_name AS (
    -- Base case
    SELECT ...

    UNION ALL

    -- Recursive step
    SELECT ... FROM cte_name JOIN ... WHERE ...
)
SELECT * FROM cte_name;
```

The `WITH RECURSIVE` is required (in MySQL, Postgres, SQL Server allows just `WITH`). The base case provides initial rows; the recursive step adds more by referring to the CTE.

### Example: Employee hierarchy

Using the employees table from `03_joins.md`:

```sql
WITH RECURSIVE employee_tree AS (
    -- Base: top-level employees (no manager)
    SELECT id, name, manager_id, 1 AS level
    FROM employees
    WHERE manager_id IS NULL

    UNION ALL

    -- Recursive: add employees whose manager is in the tree
    SELECT e.id, e.name, e.manager_id, et.level + 1
    FROM employees e
    JOIN employee_tree et ON e.manager_id = et.id
)
SELECT * FROM employee_tree ORDER BY level, id;
```

Result:

```
id | name  | manager_id | level
---|-------|------------|------
1  | Alice | NULL       | 1
2  | Bob   | 1          | 2
3  | Carol | 1          | 2
4  | Dave  | 2          | 3
5  | Eve   | 2          | 3
```

The CEO at level 1, direct reports at level 2, and so on.

### Generating sequences

```sql
WITH RECURSIVE numbers AS (
    SELECT 1 AS n
    UNION ALL
    SELECT n + 1 FROM numbers WHERE n < 100
)
SELECT * FROM numbers;
-- 1, 2, 3, ..., 100
```

Generate a series. Postgres has `generate_series` for this; recursive CTEs are the portable way.

### Date series

```sql
WITH RECURSIVE date_range AS (
    SELECT DATE '2024-01-01' AS day
    UNION ALL
    SELECT day + INTERVAL '1 day' FROM date_range WHERE day < '2024-12-31'
)
SELECT * FROM date_range;
```

Useful for filling missing dates in reports — LEFT JOIN to actual data.

### Cycle detection

Recursive CTEs can loop infinitely on cyclic data. Most databases have a `CYCLE` clause (standard) or you add a depth limit:

```sql
WITH RECURSIVE friend_chain AS (
    SELECT user_id, friend_id, 1 AS depth, ARRAY[user_id] AS path
    FROM friendships
    WHERE user_id = 1

    UNION ALL

    SELECT f.user_id, f.friend_id, fc.depth + 1, fc.path || f.user_id
    FROM friendships f
    JOIN friend_chain fc ON f.user_id = fc.friend_id
    WHERE fc.depth < 5            -- depth limit
      AND NOT (f.user_id = ANY(fc.path))    -- cycle detection
)
SELECT * FROM friend_chain;
```

Tracks the path; refuses to revisit visited nodes.

### Performance

Recursive CTEs can be slow on large data — each iteration is a separate join. For deep hierarchies or graph traversal over many rows, a dedicated graph database may be better.

For typical org charts (depth < 10) or fixed-depth chains, recursive CTEs are fine.

---

## UNION, INTERSECT, EXCEPT

Set operations: combine results from multiple queries.

### UNION

Combine and deduplicate:

```sql
SELECT email FROM users
UNION
SELECT email FROM newsletter_subscribers;
```

Each row appears once even if it's in both tables.

### UNION ALL

Combine without deduplication:

```sql
SELECT email FROM users
UNION ALL
SELECT email FROM newsletter_subscribers;
```

Faster (no dedup work). Use when you know there are no duplicates or want all rows.

### INTERSECT

Rows in both queries:

```sql
SELECT email FROM users
INTERSECT
SELECT email FROM newsletter_subscribers;
```

### EXCEPT (or MINUS in Oracle)

Rows in the first but not the second:

```sql
SELECT email FROM users
EXCEPT
SELECT email FROM newsletter_subscribers;
-- Users who aren't subscribed
```

### Rules

- All queries must have the same number of columns.
- Column types must match (or be implicitly convertible).
- Column names come from the first query.
- `ORDER BY` only on the final result, not individual queries.

```sql
-- ORDER BY on the whole
(SELECT email FROM users WHERE ...)
UNION
(SELECT email FROM newsletter_subscribers WHERE ...)
ORDER BY email;
```

### Use cases

- **Combining heterogeneous sources**: emails from two tables, events from multiple logs.
- **Computing set differences**: who unsubscribed, what's new since yesterday.
- **Reporting subtotals manually** (alternative to `ROLLUP`).

---

## LATERAL Joins

A LATERAL join lets the right side of a join reference columns from the left.

```sql
SELECT u.name, recent.placed_at, recent.total
FROM users u
CROSS JOIN LATERAL (
    SELECT placed_at, total FROM orders
    WHERE user_id = u.id
    ORDER BY placed_at DESC
    LIMIT 3
) recent;
```

For each user, get their 3 most recent orders. Without LATERAL, you can't reference `u.id` from a subquery in FROM.

This is "top N per group" with arbitrary logic per group. More flexible than window functions when you need to apply complex per-group queries.

Standard SQL since SQL:1999. Postgres, SQL Server (called `CROSS APPLY` / `OUTER APPLY`), MySQL 8+, Oracle. SQLite added it in 3.39.

### LEFT JOIN LATERAL

```sql
SELECT u.name, recent.placed_at, recent.total
FROM users u
LEFT JOIN LATERAL (
    SELECT placed_at, total FROM orders
    WHERE user_id = u.id
    ORDER BY placed_at DESC
    LIMIT 1
) recent ON TRUE;
```

Outer-join variant: users without orders still appear (with NULL in `recent`).

### Use cases

- Top N per group with extra columns.
- Applying a function or complex query per row.
- Replacing complex correlated subqueries with cleaner syntax.

---

## Pivoting Data

Pivoting transforms rows into columns. SQL doesn't have a clean built-in pivot in all dialects.

### CASE-based pivot (portable)

```sql
SELECT
    user_id,
    SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END) AS completed_revenue,
    SUM(CASE WHEN status = 'pending'   THEN total ELSE 0 END) AS pending_revenue,
    SUM(CASE WHEN status = 'cancelled' THEN total ELSE 0 END) AS cancelled_revenue
FROM orders
GROUP BY user_id;
```

This produces one row per user with three columns (one per status). Works everywhere.

With `FILTER` (cleaner):

```sql
SELECT
    user_id,
    SUM(total) FILTER (WHERE status = 'completed') AS completed_revenue,
    SUM(total) FILTER (WHERE status = 'pending')   AS pending_revenue,
    SUM(total) FILTER (WHERE status = 'cancelled') AS cancelled_revenue
FROM orders
GROUP BY user_id;
```

### SQL Server PIVOT

SQL Server has explicit PIVOT syntax:

```sql
SELECT *
FROM (SELECT user_id, status, total FROM orders) src
PIVOT (
    SUM(total) FOR status IN ([completed], [pending], [cancelled])
) AS pvt;
```

Compact but SQL Server-specific.

### Postgres crosstab

```sql
SELECT * FROM crosstab(
    'SELECT user_id, status, total FROM orders ORDER BY 1, 2'
) AS ct(user_id INT, completed NUMERIC, pending NUMERIC, cancelled NUMERIC);
```

Requires `tablefunc` extension. Awkward; most teams use CASE-based pivots.

### Unpivot

The reverse — turning columns into rows. Use `UNION ALL` for portable code:

```sql
SELECT user_id, 'completed' AS status, completed_revenue AS total FROM ...
UNION ALL
SELECT user_id, 'pending', pending_revenue FROM ...
UNION ALL
SELECT user_id, 'cancelled', cancelled_revenue FROM ...;
```

Postgres has `UNNEST` for arrays. SQL Server has `UNPIVOT`. BigQuery has `UNNEST`.

---

## Putting it together

A query that uses CTEs, window functions, and an outer aggregate — a realistic monthly cohort analysis:

```sql
WITH user_first_order AS (
    SELECT
        user_id,
        DATE_TRUNC('month', MIN(placed_at)) AS cohort_month
    FROM orders
    GROUP BY user_id
),
order_summary AS (
    SELECT
        o.user_id,
        ufo.cohort_month,
        DATE_TRUNC('month', o.placed_at) AS order_month,
        o.total
    FROM orders o
    JOIN user_first_order ufo ON o.user_id = ufo.user_id
)
SELECT
    cohort_month,
    order_month,
    COUNT(DISTINCT user_id) AS active_users,
    SUM(total) AS revenue,
    SUM(SUM(total)) OVER (
        PARTITION BY cohort_month
        ORDER BY order_month
    ) AS cumulative_revenue
FROM order_summary
GROUP BY cohort_month, order_month
ORDER BY cohort_month, order_month;
```

This computes:
- Each user's "cohort" (month of first order).
- Per cohort × month, active users and revenue.
- Cumulative revenue per cohort over time (window aggregate).

That's a real analytics query — and it's just SQL.

---

## Key principles

- **CTEs make queries readable.** Use them for multi-step logic.
- **Window functions keep rows but compute group values.** Different from GROUP BY.
- **`ROW_NUMBER` for "top N per group"** — partition + order + filter.
- **`LAG` and `LEAD` for period-over-period comparisons.**
- **Watch the default frame.** `LAST_VALUE` needs an explicit frame to mean "last in partition."
- **Recursive CTEs handle hierarchies and graphs.** Add cycle detection for safety.
- **`UNION` deduplicates; `UNION ALL` doesn't.** Use ALL when you can.
- **`LATERAL` for per-row subqueries** that need columns from the outer query.
- **Pivot with `CASE WHEN` or `FILTER`.** Portable and clear.

Next, and last: dialect differences — what changes between databases.
