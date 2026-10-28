# 04. Aggregation

Aggregation collapses many rows into fewer rows by computing summary values: counts, sums, averages, mins, maxes. It's the bridge from "row-by-row data" to "answers about the data."

If joins answer "what's connected to what," aggregation answers "how much, how many, what's the average."

---

## Table of Contents

1. [The Mental Model](#the-mental-model)
2. [Aggregate Functions](#aggregate-functions)
3. [GROUP BY](#group-by)
4. [HAVING: Filtering Groups](#having-filtering-groups)
5. [Aggregation Without GROUP BY](#aggregation-without-group-by)
6. [DISTINCT in Aggregates](#distinct-in-aggregates)
7. [FILTER and Conditional Aggregates](#filter-and-conditional-aggregates)
8. [Multi-Column Grouping](#multi-column-grouping)
9. [GROUP BY with JOIN](#group-by-with-join)
10. [GROUPING SETS, ROLLUP, CUBE](#grouping-sets-rollup-cube)
11. [NULL Handling in Aggregates](#null-handling-in-aggregates)
12. [Common Mistakes](#common-mistakes)

---

## The Mental Model

`GROUP BY` collapses rows that share the same value(s) in the grouping column(s) into a single row. Aggregate functions compute a value from each group.

Without GROUP BY, an aggregate operates on the whole result set (one group = all rows).

Conceptually:

1. Filter rows with `WHERE` (per row).
2. Group remaining rows into buckets by `GROUP BY` keys.
3. Compute aggregates for each bucket.
4. Filter groups with `HAVING` (per group).
5. Order and limit.

The order matters. `WHERE` filters individual rows *before* grouping. `HAVING` filters groups *after* aggregating.

---

## Aggregate Functions

The core ones, in every SQL dialect:

```sql
COUNT(*)         -- count rows (including NULLs)
COUNT(col)       -- count non-NULL values of col
COUNT(DISTINCT col) -- count distinct non-NULL values
SUM(col)         -- sum of non-NULL values
AVG(col)         -- average (mean) of non-NULL values
MIN(col)         -- minimum non-NULL value
MAX(col)         -- maximum non-NULL value
```

Less common but standard:

```sql
STDDEV(col)            -- standard deviation
STDDEV_POP(col)        -- population standard deviation
STDDEV_SAMP(col)       -- sample standard deviation (usually what you want)
VARIANCE(col)          -- variance
```

Postgres / SQL Server / others also have:

```sql
STRING_AGG(col, ',')   -- concatenate values (Postgres, SQL Server)
GROUP_CONCAT(col)      -- MySQL/SQLite equivalent
ARRAY_AGG(col)         -- Postgres: collect into an array
JSON_AGG(col)          -- Postgres: collect into JSON array
```

### Basic examples

```sql
-- Total number of users
SELECT COUNT(*) FROM users;

-- Number of users with an email
SELECT COUNT(email) FROM users;

-- Number of unique countries
SELECT COUNT(DISTINCT country) FROM users;

-- Total order value
SELECT SUM(total) FROM orders;

-- Average order value
SELECT AVG(total) FROM orders;

-- Min and max order
SELECT MIN(total), MAX(total) FROM orders;
```

Each of these returns a single row.

### `COUNT(*)` vs `COUNT(col)`

```sql
COUNT(*)          -- counts rows
COUNT(col)        -- counts rows where col IS NOT NULL
COUNT(DISTINCT col) -- counts unique non-NULL values
```

```sql
-- Imagine users: 100 total, 80 have a phone, 60 unique phone area codes
SELECT COUNT(*) FROM users;                         -- 100
SELECT COUNT(phone) FROM users;                     -- 80
SELECT COUNT(DISTINCT LEFT(phone, 3)) FROM users;   -- 60
```

This distinction matters constantly. Use `COUNT(*)` to count rows; `COUNT(col)` to count rows where a column has a value.

---

## GROUP BY

Groups rows by the value(s) of one or more columns, then aggregates each group.

```sql
-- How many orders per user?
SELECT user_id, COUNT(*) AS order_count
FROM orders
GROUP BY user_id;
```

Result:

```
user_id | order_count
--------|------------
1       | 2
2       | 1
NULL    | 1
```

One row per distinct `user_id` value, with the count of orders in each group.

### Reading the result

Each row is a group. `user_id` is the group identifier. `COUNT(*)` is the aggregate computed across that group's rows.

The "raw" rows are gone after grouping — you can only see them collectively, via aggregates.

### Multiple aggregates per group

```sql
SELECT
    user_id,
    COUNT(*)       AS order_count,
    SUM(total)     AS total_spent,
    AVG(total)     AS avg_order_value,
    MIN(total)     AS smallest_order,
    MAX(total)     AS largest_order
FROM orders
GROUP BY user_id;
```

You can compute as many aggregates as you want over each group.

### Rule: every non-aggregated SELECT column must appear in GROUP BY

```sql
-- WRONG: name isn't in GROUP BY, isn't an aggregate
SELECT user_id, name, COUNT(*) FROM users_orders GROUP BY user_id;
-- Error in strict SQL (Postgres, SQL Server). Allowed but weird in MySQL.
```

Postgres / SQL Server / SQLite (strict mode): error. The reason — each group might have multiple `name` values; which one should you return?

MySQL (in older versions or non-strict mode): picks an arbitrary one, often the first encountered. Source of bugs. Modern MySQL with `ONLY_FULL_GROUP_BY` (default in 5.7+) raises the error.

The fix is to either include in GROUP BY or wrap in an aggregate:

```sql
SELECT user_id, name, COUNT(*) FROM users_orders GROUP BY user_id, name;
-- Or
SELECT user_id, MAX(name), COUNT(*) FROM users_orders GROUP BY user_id;
```

If `name` is the same across all rows in a group (e.g., it's a column from a 1:1 joined table), `MAX(name)` returns it without issue.

### Postgres exception: functional dependencies

Postgres relaxes this when the grouped column is a primary key:

```sql
SELECT u.id, u.name, COUNT(o.id) AS order_count
FROM users u
JOIN orders o ON u.id = o.user_id
GROUP BY u.id;     -- name doesn't need to be in GROUP BY because id is the PK
```

Since `u.id` is a primary key, `name` is functionally dependent on it. Postgres knows this. Convenient but somewhat non-portable.

---

## HAVING: Filtering Groups

`WHERE` filters rows; `HAVING` filters groups (after aggregation).

```sql
-- Users who have placed more than 5 orders
SELECT user_id, COUNT(*) AS order_count
FROM orders
GROUP BY user_id
HAVING COUNT(*) > 5;
```

`WHERE COUNT(*) > 5` would be an error — `WHERE` runs before the aggregation, so `COUNT(*)` isn't defined yet.

### Use WHERE for row filters, HAVING for group filters

```sql
-- WHERE filters rows: only completed orders
-- HAVING filters groups: only users whose total is > $1000
SELECT user_id, SUM(total) AS total_spent
FROM orders
WHERE status = 'completed'
GROUP BY user_id
HAVING SUM(total) > 1000;
```

If you can filter before grouping, do — it's more efficient. Use `HAVING` only for conditions that depend on the aggregate.

### HAVING without GROUP BY

`HAVING` without `GROUP BY` is allowed — it filters the whole result (which is one group).

```sql
SELECT COUNT(*) FROM users HAVING COUNT(*) > 100;
-- Returns the count IF the count is > 100, otherwise no rows.
```

Rare in practice.

---

## Aggregation Without GROUP BY

When there's no `GROUP BY`, all rows are one group:

```sql
SELECT COUNT(*) FROM users;          -- one row: total count
SELECT AVG(total) FROM orders;       -- one row: average across all orders
SELECT MIN(price), MAX(price), AVG(price) FROM products;
```

Returns one row regardless of how many input rows. Useful for global statistics.

### Mixing aggregates and bare columns without GROUP BY

```sql
SELECT name, COUNT(*) FROM users;     -- error in strict SQL
```

`COUNT(*)` returns one value; `name` has many. The query can't make sense. Either group by `name` (and get one row per name) or wrap in an aggregate.

---

## DISTINCT in Aggregates

```sql
SELECT COUNT(DISTINCT user_id) FROM orders;     -- number of unique customers
SELECT SUM(DISTINCT amount) FROM payments;       -- sum of unique amounts (weird but legal)
```

`DISTINCT` inside an aggregate operates on the values *fed into the aggregate*, not on rows.

```sql
SELECT
    COUNT(*) AS total_orders,
    COUNT(DISTINCT user_id) AS unique_customers
FROM orders;
```

`total_orders` = number of orders. `unique_customers` = number of distinct users who placed orders.

### Common use: customer counts

```sql
-- "Daily Active Users" pattern
SELECT
    DATE(login_at) AS day,
    COUNT(DISTINCT user_id) AS dau
FROM logins
GROUP BY DATE(login_at)
ORDER BY day DESC;
```

`COUNT(DISTINCT user_id)` per day = unique users active that day.

### Performance note

`COUNT(DISTINCT col)` is more expensive than `COUNT(col)`. The database needs to track which values it's seen. On huge tables, this can be slow. Approximate-distinct algorithms (`APPROX_COUNT_DISTINCT` in BigQuery, Snowflake, Postgres extensions) are dramatically faster for large datasets where exact counts don't matter.

---

## FILTER and Conditional Aggregates

Sometimes you want different aggregates over different subsets of the same group.

### `FILTER` (standard SQL, Postgres, SQLite 3.30+)

```sql
SELECT
    DATE(placed_at) AS day,
    COUNT(*) AS total_orders,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed_orders,
    COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_orders,
    SUM(total) FILTER (WHERE status = 'completed') AS completed_revenue
FROM orders
GROUP BY DATE(placed_at)
ORDER BY day DESC;
```

Each aggregate has its own filter. Much cleaner than alternative approaches.

### `CASE` workaround (any database)

If your database doesn't support `FILTER`:

```sql
SELECT
    DATE(placed_at) AS day,
    COUNT(*) AS total_orders,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_orders,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled_orders,
    SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END) AS completed_revenue
FROM orders
GROUP BY DATE(placed_at)
ORDER BY day DESC;
```

The CASE expressions evaluate per row; the aggregate then aggregates over the values.

For `COUNT`, `CASE WHEN cond THEN 1 END` produces 1 when the condition matches and NULL otherwise. `COUNT` skips NULLs, so it counts only the matches.

For `SUM`, use `CASE WHEN cond THEN value ELSE 0 END` — `0` rather than NULL because `SUM` of all NULLs is NULL, not 0.

Or `SUM(CASE WHEN cond THEN value END)` works fine for most cases (`SUM` skips NULLs).

### Comparison of styles

```sql
-- FILTER (cleaner, more modern)
COUNT(*) FILTER (WHERE status = 'active') AS active_count

-- CASE inside aggregate (more portable)
COUNT(CASE WHEN status = 'active' THEN 1 END) AS active_count

-- Subquery (more verbose, sometimes needed)
(SELECT COUNT(*) FROM users WHERE status = 'active') AS active_count
```

Prefer `FILTER` when available. Fall back to `CASE` for compatibility.

---

## Multi-Column Grouping

```sql
SELECT
    country,
    city,
    COUNT(*) AS user_count
FROM users
GROUP BY country, city;
```

Groups by (country, city) pairs. Each distinct combination is one group.

```
country | city          | user_count
--------|---------------|------------
USA     | San Francisco | 42
USA     | New York      | 35
UK      | London        | 28
USA     | Boston        | 12
```

### Grouping by computed values

```sql
-- Orders per month
SELECT
    DATE_TRUNC('month', placed_at) AS month,
    COUNT(*) AS order_count,
    SUM(total) AS revenue
FROM orders
GROUP BY DATE_TRUNC('month', placed_at)
ORDER BY month DESC;
```

Or by extracted parts:

```sql
SELECT
    EXTRACT(YEAR FROM placed_at) AS year,
    EXTRACT(MONTH FROM placed_at) AS month,
    COUNT(*) AS order_count
FROM orders
GROUP BY EXTRACT(YEAR FROM placed_at), EXTRACT(MONTH FROM placed_at);
```

### `GROUP BY` by alias or position

```sql
-- Some dialects allow grouping by alias
SELECT
    DATE_TRUNC('month', placed_at) AS month,
    COUNT(*)
FROM orders
GROUP BY month;                          -- works in MySQL, Postgres 16+

-- Or by position
GROUP BY 1;                              -- works in Postgres, MySQL, others
```

Postgres added GROUP BY alias support in 16; older versions need the full expression repeated. SQL Server requires the full expression.

Grouping by position is portable but fragile (column reordering breaks it). Most production code repeats the expression.

---

## GROUP BY with JOIN

Aggregation across joined tables is one of the most common SQL patterns.

```sql
-- Users with their total spend
SELECT
    u.id,
    u.name,
    u.email,
    COALESCE(SUM(o.total), 0) AS total_spent,
    COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name, u.email
ORDER BY total_spent DESC;
```

Notes:

- **LEFT JOIN** so users with no orders still appear.
- **`COUNT(o.id)`** not `COUNT(*)` — count actual orders, not the placeholder row from the LEFT JOIN.
- **`COALESCE(SUM, 0)`** — `SUM` of no rows is NULL; coalesce to 0 for cleaner output.

### The fan-out problem

When joining a row to multiple matches, aggregates over the join multiply.

```sql
-- Suppose each user has 3 orders and 2 addresses (from a separate addresses table)
SELECT u.id, COUNT(o.id) AS order_count
FROM users u
JOIN orders o ON u.id = o.user_id
JOIN addresses a ON u.id = a.user_id
GROUP BY u.id;
-- Each user appears 6 times in the join (3 orders × 2 addresses)
-- order_count comes out as 6, not 3
```

The fix is either:
1. Aggregate first, then join: use subqueries or CTEs.
2. Use `COUNT(DISTINCT o.id)` to deduplicate.

```sql
-- Option 1: deduplicate
SELECT
    u.id,
    COUNT(DISTINCT o.id) AS order_count,
    COUNT(DISTINCT a.id) AS address_count
FROM users u
JOIN orders o ON u.id = o.user_id
JOIN addresses a ON u.id = a.user_id
GROUP BY u.id;

-- Option 2: aggregate in subqueries (often cleaner and faster)
SELECT
    u.id,
    (SELECT COUNT(*) FROM orders WHERE user_id = u.id) AS order_count,
    (SELECT COUNT(*) FROM addresses WHERE user_id = u.id) AS address_count
FROM users u;
```

Or via lateral joins / CTEs — see `07_advanced_queries.md`.

### Group by joined columns

```sql
-- Revenue per product category
SELECT
    p.category,
    COUNT(DISTINCT o.id) AS order_count,
    SUM(oi.quantity * oi.price) AS revenue
FROM products p
JOIN order_items oi ON p.id = oi.product_id
JOIN orders o ON oi.order_id = o.id
WHERE o.placed_at >= NOW() - INTERVAL '30 days'
GROUP BY p.category
ORDER BY revenue DESC;
```

Group by a column from a different table than the one being aggregated. Common in analytics queries.

---

## GROUPING SETS, ROLLUP, CUBE

Compute multiple groupings in a single query. Useful for reports with subtotals.

### GROUPING SETS

Compute several groupings at once:

```sql
SELECT
    country,
    city,
    COUNT(*) AS user_count
FROM users
GROUP BY GROUPING SETS (
    (country, city),    -- group by country+city
    (country),          -- group by country only
    ()                  -- grand total
);
```

Result includes:
- One row per (country, city) — the most granular.
- One row per country — subtotals.
- One row with both NULL — grand total.

### ROLLUP

Hierarchical subtotals. `ROLLUP(a, b, c)` is shorthand for `GROUPING SETS ((a,b,c), (a,b), (a), ())`.

```sql
SELECT
    country,
    city,
    COUNT(*)
FROM users
GROUP BY ROLLUP (country, city);
```

Gives totals at each level + grand total.

### CUBE

Every combination of groupings. `CUBE(a, b)` is `GROUPING SETS ((a,b), (a), (b), ())`.

```sql
SELECT
    country,
    city,
    COUNT(*)
FROM users
GROUP BY CUBE (country, city);
```

Includes all combinations. Heavier than ROLLUP; useful when you want a full pivot.

### Identifying subtotal rows

`GROUPING()` function tells you which columns are "rolled up" in a given row.

```sql
SELECT
    country,
    city,
    COUNT(*) AS user_count,
    GROUPING(country) AS country_rolled,
    GROUPING(city) AS city_rolled
FROM users
GROUP BY ROLLUP (country, city);
```

`GROUPING(col) = 1` means that column is rolled up (NULL in the result represents "all values"). `GROUPING(col) = 0` means it's an actual value.

Useful for formatting reports — distinguish "NULL because no value" from "NULL because subtotal."

### Support

- Postgres, SQL Server, Oracle, BigQuery, Snowflake: full support.
- MySQL: supports ROLLUP, not GROUPING SETS or CUBE directly.
- SQLite: limited; mostly use UNION ALL of separate queries.

In application code, often easier to compute subtotals client-side or with multiple queries.

---

## NULL Handling in Aggregates

Aggregate functions **skip NULLs by default** (except `COUNT(*)`).

```sql
-- Sample data: column 'amount' has values 10, 20, NULL, 30
SELECT
    COUNT(*) AS row_count,            -- 4
    COUNT(amount) AS non_null_count,  -- 3
    SUM(amount) AS total,             -- 60
    AVG(amount) AS average,           -- 20 (not 15; NULL is skipped)
    MIN(amount) AS min,               -- 10
    MAX(amount) AS max                -- 30
FROM table;
```

This is usually what you want — NULL means "missing" so excluding it makes sense. But two pitfalls:

### `AVG` excludes NULLs

If you have a "rating from 0 to 10, or NULL if not rated," `AVG` gives the mean of rated items. If you want NULLs to count as 0:

```sql
SELECT AVG(COALESCE(rating, 0)) FROM reviews;
```

Or include them in a different way. Be intentional about what NULL means.

### `SUM` of all NULLs is NULL

```sql
-- If there are no orders for a user:
SELECT SUM(total) FROM orders WHERE user_id = 999;   -- NULL, not 0
```

`COALESCE(SUM(total), 0)` to default to 0:

```sql
SELECT COALESCE(SUM(total), 0) FROM orders WHERE user_id = 999;   -- 0
```

This matters in LEFT JOIN + GROUP BY queries — users with no orders get NULL totals unless coalesced.

### `COUNT(DISTINCT)` skips NULLs

```sql
SELECT COUNT(DISTINCT phone) FROM users;
-- Counts distinct non-NULL phone numbers. NULLs are not "one value."
```

To count NULL as a distinct group, use `GROUP BY` instead:

```sql
SELECT phone, COUNT(*) FROM users GROUP BY phone;
-- NULLs form their own group
```

---

## Common Mistakes

### `WHERE` with aggregates

```sql
SELECT user_id, COUNT(*) FROM orders WHERE COUNT(*) > 5 GROUP BY user_id;
-- Error: aggregate in WHERE
```

`WHERE` runs before grouping. Use `HAVING`:

```sql
SELECT user_id, COUNT(*) FROM orders GROUP BY user_id HAVING COUNT(*) > 5;
```

### Forgetting columns in GROUP BY

```sql
SELECT user_id, name, COUNT(*) FROM joined_data GROUP BY user_id;
-- Error in strict mode; ambiguous in MySQL
```

Either add `name` to GROUP BY or wrap in `MAX(name)` / `MIN(name)`.

### Counting NULL-containing columns

```sql
-- Bug: doesn't count rows where last_login_at is NULL
SELECT COUNT(last_login_at) FROM users WHERE country = 'USA';
-- Probably wanted:
SELECT COUNT(*) FROM users WHERE country = 'USA';
```

Use `COUNT(*)` for row counts. `COUNT(col)` is specifically "count rows where col has a value."

### SUM of nothing is NULL

```sql
SELECT SUM(total) FROM orders WHERE user_id = 999;   -- NULL if no rows
```

Coalesce when zero is the right answer:

```sql
SELECT COALESCE(SUM(total), 0) FROM orders WHERE user_id = 999;
```

### Fan-out duplicating sums

Covered above. The fix is either `DISTINCT` aggregation or aggregating before joining.

### `AVG` over an empty set

```sql
SELECT AVG(rating) FROM reviews WHERE product_id = 999;
-- NULL if no rows; 0/0 isn't a runtime error
```

Coalesce or check for NULL.

### Counting rows in a LEFT JOIN

```sql
-- Bug: Carol gets order_count = 1 (the NULL-padded row)
SELECT u.name, COUNT(*) FROM users u LEFT JOIN orders o ON u.id = o.user_id GROUP BY u.name;

-- Fix: count something from the right side
SELECT u.name, COUNT(o.id) FROM users u LEFT JOIN orders o ON u.id = o.user_id GROUP BY u.name;
```

Carol's row: `o.id` is NULL (no match), so `COUNT(o.id)` is 0. Correct.

---

## Putting it together

A realistic analytics query — monthly revenue and customer counts by product category:

```sql
SELECT
    p.category,
    DATE_TRUNC('month', o.placed_at) AS month,
    COUNT(DISTINCT o.user_id) AS unique_customers,
    COUNT(DISTINCT o.id) AS order_count,
    SUM(oi.quantity * oi.price) AS revenue,
    AVG(oi.quantity * oi.price) AS avg_line_value,
    SUM(oi.quantity) AS units_sold
FROM products p
JOIN order_items oi ON p.id = oi.product_id
JOIN orders o ON oi.order_id = o.id
WHERE o.placed_at >= NOW() - INTERVAL '12 months'
  AND o.status = 'completed'
GROUP BY p.category, DATE_TRUNC('month', o.placed_at)
HAVING SUM(oi.quantity * oi.price) > 1000     -- only meaningful months
ORDER BY month DESC, revenue DESC;
```

This query:

- Joins products, items, orders.
- Filters to completed orders in the last 12 months (WHERE).
- Groups by category and month.
- Computes multiple aggregates per group, using `DISTINCT` to handle fan-out from order/item join.
- Filters groups to those over $1,000 (HAVING).
- Orders by month and revenue.

A query like this would power a "monthly revenue by category" dashboard.

---

## Key principles

- **`GROUP BY` collapses rows into groups; aggregates compute per group.**
- **Every non-aggregated SELECT column must be in GROUP BY.** Strict SQL enforces this; non-strict MySQL doesn't (and lies to you).
- **`WHERE` filters rows; `HAVING` filters groups.** Use WHERE when possible — it's more efficient.
- **`COUNT(*)` counts rows; `COUNT(col)` counts non-NULLs; `COUNT(DISTINCT col)` counts unique non-NULLs.**
- **`SUM` over no rows is NULL.** `COALESCE(SUM(x), 0)` for "default to zero."
- **Aggregates skip NULLs (except `COUNT(*)`).** Consider what NULL means in your data.
- **Fan-out duplicates sums.** Use `DISTINCT` aggregation or pre-aggregate.
- **Prefer `FILTER` for conditional aggregates.** Falls back to `CASE WHEN ... END` for compatibility.

Next: indexes and performance — what makes queries fast or slow.
