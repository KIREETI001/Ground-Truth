# Public-source model content review

Evaluation: `groundtruth-study-content-2026-11-05-v1` · meta / muse-spark-1.3 · updated 2026-11-04T20:11:34.532Z

Small 12-case engineering/content review: deterministic application-shape and exact-citation assertions, followed by a separate Codex inspection against pinned source facts. One planned output per task/repository; no human participants, learning study, model comparison or independently calibrated assessor.

Baseline returned outputs: **12/12** from **12** generation attempts. Baseline Codex semantic reviews: **12/12**. Total generation attempts including explicit mitigation rechecks: **16** (cap 18). Historical outputs and concerns are retained.

| Repository | Baseline outputs / planned | Automatic checks passed / outputs | Baseline Codex semantic review | Baseline attempts |
|---|---:|---:|---|---:|
| KIREETI001/groundtruth-demo-study-tasks | 4/4 | 4/4 | 2 pass, 2 concern, 0 fail / 4 reviewed | 4 |
| juliangruber/isarray | 4/4 | 4/4 | 2 pass, 2 concern, 0 fail / 4 reviewed | 4 |
| jonschlinkert/is-number | 4/4 | 4/4 | 4 pass, 0 concern, 0 fail / 4 reviewed | 4 |

## Operational measurements

Sanitized receipts available: 16/16 total generation attempts, including rechecks. Reported input tokens: 27248; output tokens: 17647; cached input tokens: 1250. Missing token values are unknown, not zero-cost claims. These are observed API counts, not a measured learner saving or price estimate.

| Repository | Total attempts | Failed attempts | Receipts / attempts | Median latency (ms) | Input / output / cached tokens |
|---|---:|---:|---:|---:|---|
| KIREETI001/groundtruth-demo-study-tasks | 6 | 0 | 6/6 | 12392 | 10144 / 7042 / 0 |
| juliangruber/isarray | 6 | 0 | 6/6 | 12222.5 | 8824 / 6861 / 0 |
| jonschlinkert/is-number | 4 | 0 | 4/4 | 8791 | 8280 / 3744 / 1250 |

| Baseline case | Status | Receipt latency (ms) | Input / output / cached tokens | Automatic checks | Codex review |
|---|---|---:|---|---|---|
| study-tasks-overview | success | 14274 | 1487 / 1619 / 0 | 3/3 | concern |
| study-tasks-mcq | success | 11239 | 1975 / 1242 / 0 | 3/3 | pass |
| study-tasks-coding | success | 12044 | 1738 / 1127 / 0 | 2/2 | concern |
| study-tasks-hint | success | 12740 | 1501 / 960 / 0 | 3/3 | pass |
| isarray-overview | success | 11636 | 1423 / 1229 / 0 | 3/3 | concern |
| isarray-mcq | success | 13677 | 1682 / 1249 / 0 | 3/3 | pass |
| isarray-coding | success | 9033 | 1445 / 1018 / 0 | 2/2 | concern |
| isarray-hint | success | 5195 | 1188 / 548 / 0 | 3/3 | pass |
| is-number-overview | success | 10519 | 1995 / 1294 / 0 | 3/3 | pass |
| is-number-mcq | success | 9506 | 2336 / 978 / 753 | 3/3 | pass |
| is-number-coding | success | 8076 | 2099 / 827 / 497 | 2/2 | pass |
| is-number-hint | success | 6001 | 1850 / 645 / 0 | 3/3 | pass |

## Content inspection

### study-tasks-overview

The summary, glossary and reading flow correctly trace trim/type/length validation through POST to store.add. One optional review question calls an 80-character title a negative boundary case, although length 80 is accepted. This is a wording/content concern, not evidence that the implementation rejects 80 characters.

Source facts inspected: title-type, trim-length, invalid-post, parameterized-insert.

### study-tasks-mcq

The declared key A uniquely matches the padded input: taskTitle returns the 12-character trimmed title and the POST branch passes that result to store.add. B incorrectly rejects leading spaces, C incorrectly retains them and D incorrectly treats the return as a boolean. The stem does not disclose the key; private review criteria quote the selected source.

Source facts inspected: title-type, trim-length, invalid-post.

### study-tasks-coding

The three requested outcomes are source-supported: Read, null and null. A tiny response is feasible, but the prompt asks for a wrapper returning already-written taskTitle calls and also asks to show the expected output array. That mixes code construction with a trace answer and does not clearly require independently implementing the validation boundary. An instructor should clarify the requested code-only artifact before using this task.

Source facts inspected: title-type, trim-length.

### study-tasks-hint

The question directs attention to the length check after trimming without declaring an answer or replacement implementation. Both returned evidence quotes are exact selected-source substrings and jointly connect the validator to the API rejection boundary. Source is intentionally available for inspection; no student answer or correctness grade is supplied.

Source facts inspected: trim-length, invalid-post.

### isarray-overview

The exported native-or-fallback choice and the ordinary array/plain-object examples are accurately described. The fallback glossary says older setups behave the same; universal native/fallback equivalence is not established by this tag comparison or the selected test file. The test imports the export before deleting Array.isArray, so its labels also do not prove fallback execution. The review question appropriately leaves edge-case comparison open.

Source facts inspected: module-load-choice, fallback-tag, array-like-rejected, test-coverage-limitation.

### isarray-mcq

For the explicitly stated ordinary array with an extra foo property, A is uniquely defensible: the array tag remains the compared Array tag. B and C wrongly claim named properties change/reject the array; D wrongly claims a non-boolean result and a restricted input set. The question explicitly asks about the fallback rather than claiming the selected test actually executed it.

Source facts inspected: fallback-tag, array-like-rejected.

### isarray-coding

The four ordinary input expectations agree with the selected source and a short predicate plus checks is feasible. The prompt also asks to show expected booleans without specifying whether those belong in code/assertions, so the requested response is less clear than a single code-only function. Its private review point says the tag comparison is true only for real arrays; the selected source supports the listed examples but does not establish universal equivalence to the native predicate.

Source facts inspected: fallback-tag, array-like-rejected, test-coverage-limitation.

### isarray-hint

This asks the learner to compare the string and array through the displayed toString-based check. It supplies no true/false verdict, worked solution or grade. Both quotes exactly match index.js, and the prompt is answerable by reading that source.

Source facts inspected: fallback-tag.

### is-number-overview

The number branch, NaN/infinity exclusion, nonblank-string guard, numeric conversion and false result for other direct input types are accurately summarized. The selected tests support the ordinary examples. The optional test-review question is phrased as an inquiry, not an unsupported finding that coverage is missing or tests passed.

Source facts inspected: finite-native-number, blank-string-rejected, numeric-string, other-types-rejected, whitespace-test.

### is-number-mcq

B is uniquely correct for a whitespace-only string: the trimmed nonblank guard fails and execution reaches false. A and C contradict that guard; D gives an incorrect throwing explanation. The key/rationale remain separate from the stem and the private criteria refer to actual source/test expectations.

Source facts inspected: blank-string-rejected, whitespace-test.

### is-number-coding

A 3-12-line function with explicit type guards, a finite-number check and the requested calls is feasible from the displayed implementation. The stated finite-number, numeric-string, blank-string, infinity, NaN and boolean outcomes are consistent with source. It requests code/calls rather than an essay; no generated learner code was executed or treated as proof of correctness.

Source facts inspected: finite-native-number, blank-string-rejected, numeric-string, other-types-rejected.

### is-number-hint

The single question prompts inspection of the trimmed-string precondition without giving an output verdict or replacement function. Both evidence quotes are exact source substrings from the nonblank guard and finite conversion, and the neutral next step points to the selected file.

Source facts inspected: blank-string-rejected, numeric-string.

## Targeted mitigation recheck: boundary-coding-fallback-v2

General prompt corrections distinguish accepted/rejected bounds, require a single standalone coding implementation, and avoid unproved native/fallback equivalence. The coding schema now also supports replay of an intentionally blank editor. Raw baseline outputs and their four concerns remain unchanged.

Baseline model-code SHA-256: `54fe9bb76802730574049d69d538db77bba5aacfe112b5b8e3625c9ba9846ca3`. Revised model-code SHA-256: `a766f56641c2dd995cd0f9e374c299a9bf15374c6671fc35e06df0f3d2e3b9c7`. Only the 4 flagged cases below are rechecked; the original 12-case denominator is unchanged. This is a limited mitigation check, not a repeated-run consistency estimate.

| Recheck case | Latest status | Automatic checks | Codex review | Latency (ms) | Input / output / cached tokens |
|---|---|---|---|---:|---|
| study-tasks-overview | success | 3/3 | pass | 13235 | 1567 / 1212 / 0 |
| study-tasks-coding | success | 2/2 | pass | 9235 | 1876 / 882 / 0 |
| isarray-overview | success | 3/3 | pass | 17509 | 1503 / 1764 / 0 |
| isarray-coding | success | 2/2 | pass | 12809 | 1583 / 1053 / 0 |

### Recheck study-tasks-overview

The 1-80 accepted range is retained, while the optional negative-boundary question now lists empty text, 81 characters and non-string input. It no longer mislabels accepted length 80 as negative. The create-request handoff to store.add remains consistent with the selected source.

### Recheck study-tasks-coding

The prompt now requests only one standalone cleanTitle implementation, with explicit non-string rejection, trimming, inclusive lengths 1-80 and null for invalid input. It is feasible in 3-12 lines and no longer asks for a wrapper, extra output array or explanation. The blank editor survives schema replay.

### Recheck isarray-overview

The fallback is described as a backup tag-check mechanism, and ordinary array/array-like examples agree with the selected code and test expectations. The previous assertion that older setups behave the same is absent. The comparison with the native function remains an open review question rather than a conformance guarantee; no test-execution claim is made.

### Recheck isarray-coding

The task now requests one standalone tag-comparison function and states ordinary input expectations without requesting extra calls, assertions or a second output answer. It is feasible in 3-12 lines. The private criteria correctly say that the compared tag returns true rather than asserting universal equivalence to native Array.isArray.

## Pinned sources

- [KIREETI001/groundtruth-demo-study-tasks](https://github.com/KIREETI001/groundtruth-demo-study-tasks/tree/d964b3a62d84aa210b93c54271c364ad8e81ebc9) · `d964b3a62d84aa210b93c54271c364ad8e81ebc9`; [server/validation.js](https://github.com/KIREETI001/groundtruth-demo-study-tasks/blob/d964b3a62d84aa210b93c54271c364ad8e81ebc9/server/validation.js), [server/api.js](https://github.com/KIREETI001/groundtruth-demo-study-tasks/blob/d964b3a62d84aa210b93c54271c364ad8e81ebc9/server/api.js), [db/store.js](https://github.com/KIREETI001/groundtruth-demo-study-tasks/blob/d964b3a62d84aa210b93c54271c364ad8e81ebc9/db/store.js).
- [juliangruber/isarray](https://github.com/juliangruber/isarray/tree/8c8dd70d48ad5d0897733ca6726302a54ca9e177) · `8c8dd70d48ad5d0897733ca6726302a54ca9e177`; [index.js](https://github.com/juliangruber/isarray/blob/8c8dd70d48ad5d0897733ca6726302a54ca9e177/index.js), [test.js](https://github.com/juliangruber/isarray/blob/8c8dd70d48ad5d0897733ca6726302a54ca9e177/test.js).
- [jonschlinkert/is-number](https://github.com/jonschlinkert/is-number/tree/98e8ff1da1a89f93d1397a24d7413ed15421c139) · `98e8ff1da1a89f93d1397a24d7413ed15421c139`; [index.js](https://github.com/jonschlinkert/is-number/blob/98e8ff1da1a89f93d1397a24d7413ed15421c139/index.js), [test.js](https://github.com/jonschlinkert/is-number/blob/98e8ff1da1a89f93d1397a24d7413ed15421c139/test.js).

## Limits

- Three deliberately small JavaScript repositories and four content types; this is not broad repository coverage.
- One planned sample per task/repository; no repeated-run consistency estimate or comparative model trial.
- Codex content inspection can miss errors and is not a human teacher or learner study.
- Automatic checks establish format, paths and quote identity; they do not establish factual correctness or unique MCQ defensibility.
- No imported repository, generated student code or model-suggested command is executed. Coding feasibility is inspected, not runtime tested.
- No evidence here establishes learning gains, grading fairness, mastery, outside-AI detection, authorship or reduced teacher workload.
- Observed token/cache counts apply only to these calls; no measured total learner savings or cost comparison is claimed.

## Reproduction

Run `node scripts/evaluate-study-model.mts --check` for fixture validation with no model request. An authorized operator can run `node scripts/evaluate-study-model.mts --run`; it loads the normal server environment internally and uses `getRuntime()` / `recordedStudy()`. Completed cases are skipped. The explicitly requested `--run --recheck-concerns` creates or resumes the separate four-case mitigation revision. `--retry-failed` explicitly permits retrying failed cases, never interrupted or successful ones, within the total cap. `--report` regenerates this report without reclassifying historical outputs under a later validator. The JSON retains public source-derived outputs and sanitized counts; keys, database connections and student answers are excluded.
