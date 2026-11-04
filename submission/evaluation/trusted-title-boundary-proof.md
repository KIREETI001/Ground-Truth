# Trusted fixture: independent title-change validation

Status: **120 / 120 checks passed**. This is an operator-authored fixture check. It contains no learner outcomes, educator validation or live model calls.

The source is the owned MIT Study Tasks repository at commit `026d25d212336d5e26c42b32bb31a37c1bfc157b`, file `server/validation.js`. Its SHA-256 is `bf5faa68b8a04f454e43d31045c9bbd35aa9c9ec330ccf8cccb3380e88ceb680`. The command reads that exact Git object, verifies its complete hash, and imports only that helper and two prescribed hash-checked variants in a separate temporary folder under ignored `.sites-runtime`. It does not run the task app, its server, its database tests or arbitrary imported/user code. The temporary folder was removed after validation.

The manual variation changes only `title.length > 80` to `title.length > 100`. The separate transfer requirement changes the revised helper’s minimum from 1 to 3 after trimming while retaining the 100 limit. Both changes are authored fixtures, not learner submissions.

| Variant | Title checks | Unchanged ID regression checks | Total passed |
| --- | ---: | ---: | ---: |
| original80 · 1–80 | 28 | 12 | 40 |
| manual100 · 1–100 | 28 | 12 | 40 |
| transferMin3 · 3–100 | 28 | 12 | 40 |

| Input | Original 1–80 | Manual 1–100 | Fresh transfer 3–100 |
| --- | --- | --- | --- |
| Empty string | rejected | rejected | rejected |
| Spaces only | rejected | rejected | rejected |
| Tabs and line breaks only | rejected | rejected | rejected |
| Spaces around Learn SQL | accepted · 9 code units | accepted · 9 code units | accepted · 9 code units |
| One character | accepted · 1 code unit | accepted · 1 code unit | rejected |
| Two characters | accepted · 2 code units | accepted · 2 code units | rejected |
| Three characters | accepted · 3 code units | accepted · 3 code units | accepted · 3 code units |
| Padded two-character title | accepted · 2 code units | accepted · 2 code units | rejected |
| Padded three-character title | accepted · 3 code units | accepted · 3 code units | accepted · 3 code units |
| Internal space is retained | accepted · 3 code units | accepted · 3 code units | accepted · 3 code units |
| 79 ASCII characters | accepted · 79 code units | accepted · 79 code units | accepted · 79 code units |
| 80 ASCII characters | accepted · 80 code units | accepted · 80 code units | accepted · 80 code units |
| 81 ASCII characters | rejected | accepted · 81 code units | accepted · 81 code units |
| 99 ASCII characters | rejected | accepted · 99 code units | accepted · 99 code units |
| 100 ASCII characters | rejected | accepted · 100 code units | accepted · 100 code units |
| 101 ASCII characters | rejected | rejected | rejected |
| 100 characters with surrounding whitespace | rejected | accepted · 100 code units | accepted · 100 code units |
| 101 characters with surrounding whitespace | rejected | rejected | rejected |
| Number 123 | rejected | rejected | rejected |
| Number zero | rejected | rejected | rejected |
| Null | rejected | rejected | rejected |
| Undefined | rejected | rejected | rejected |
| Object | rejected | rejected | rejected |
| Array | rejected | rejected | rejected |
| Boolean | rejected | rejected | rejected |
| Punctuation is plain title text | accepted · 33 code units | accepted · 33 code units | accepted · 33 code units |
| 50 emoji = 100 UTF-16 code units | rejected | accepted · 100 code units | accepted · 100 code units |
| 51 emoji = 102 UTF-16 code units | rejected | rejected | rejected |

The unchanged `taskId` helper also passed positive-ID and maximum-safe-integer checks, rejecting zero, negative, decimal, alphabetic, unsafe, leading-zero, exponent, padded and empty IDs in all three variants. Title lengths follow JavaScript UTF-16 `.length`, rather than a count of displayed graphemes. Punctuation was supplied only as input text to `taskTitle`; no SQL or snippets were executed.

Downloaded draft: its complete content matched the trusted manual variant after CRLF-to-LF normalization. Raw SHA-256: `1ba3ba6185074ec97465e605516ced8229614346b9ce47a23e8ff588c9789570`. The downloaded file was **not executed**. The executable manual fixture was independently constructed from pinned trusted source.

Reproduce from the prototype directory:

```powershell
node scripts/verify-trusted-title-change.mjs
node --test scripts/trusted-title-proof.test.mjs
```

To check a later downloaded `validation.js` as data:

```powershell
node scripts/verify-trusted-title-change.mjs --draft "C:\path\to\validation.js"
```

Use `--repo "C:\path\to\groundtruth-demo-study-tasks"` if the owned fixture checkout is elsewhere. An unknown source hash or a downloaded file with any other code change is refused before execution.

Scope: this proves the listed input/output behavior for one known helper and its prescribed changes. It does not validate arbitrary repository changes, the whole app, production deployment, learner understanding, transfer by a learner, authorship or external AI use.
