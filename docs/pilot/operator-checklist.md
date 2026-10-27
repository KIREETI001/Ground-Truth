# Operator release and pilot checklist

This checklist records gates; its existence does not mean they passed. Keep a private release ledger containing source revision, public source revision, saved Site version, deployment ID/URL, environment revision, migration revision, audience, check results, operator, and time. Exclude secrets and participant content.

## Configure and verify privately

- [ ] Run the frozen pnpm install, typecheck, Node/SQLite tests, and build on the exact candidate revision. Apply committed migrations to an empty local D1 database and exercise real HTTP requests. Record checks actually run and browser limits.
- [ ] Review public source for credentials, enrollment codes, staff IDs, private proposal material, participant content, and logs. Preserve dependency notices and accurate prior-proposal credit.
- [ ] Keep the Site owner-private during verification. Preserve its existing opaque ID and source integration. A Sites URL is a production URL even during private staging.
- [ ] Configure `DB`, pilot namespace, five-student limit, and closed enrollment. Use secure secret entries for `MODEL_API_KEY`, `PILOT_ENROLLMENT_CODE`, and `STAFF_USER_ROLES`. Never paste keys into ordinary chat, commit them, or put them in URLs.
- [ ] Have owner/tutor sign in to obtain actual Site-scoped opaque IDs. Configure explicit staff roles; do not infer IDs from email or use `local_seedy` in hosted configuration. Verify learner-to-tutor escalation is denied.
- [ ] Verify Meta account/billing access and provider data handling with the owner. Set the supported endpoint/model; enable calls only for a synthetic smoke. Deploy a saved version to apply environment changes. Read back key presence/secret flags and revision only.
- [ ] Record one genuine successful deployed Meta request, validated output, model identity, latency/usage when supplied, and honest failure behavior. A fixture, fallback, or build is not live-provider evidence. Keep live access pending if no key has been supplied securely.
- [ ] Verify native sign-in, signed-out denial, signed-in nonmember denial, student ownership, read-only tutor access, atomic five-seat cap, reload, export, and deletion with legitimate identities. A forged request header does not verify hosted identity.
- [ ] Check the full browser flow, no premature answers, zero AI in transfer/debrief/repair, keyboard, focus, status announcements, 200% zoom, and narrow viewport. Complete two internal rehearsals and exclude them from participant results.
- [ ] Confirm notice, consent owner/contact, provider handling, 30-day session expiry, seven-day operational expiry, synchronous own learning-activity deletion with its disclosed enrollment-counter exception, and implemented `POST /api/admin/purge-expired` cleanup. Test deletion while requests are in flight. Arrange manual operator cleanup on the retention schedule.

## Publish and moderate

- [ ] Resolve serious defects before participants. Live-provider and multi-user gates must pass before a real-user pilot. Publish the landing page only when private-data gates also pass.
- [ ] Record the supported Sites audience change and verify its returned state. Public access exposes landing/sign-in; server membership and authorization still protect records/tools. Do not send invitations or widen access to substitute for a failed check.
- [ ] Open enrollment for moderated onboarding only. The moderator provides the code verbally. Close enrollment afterward; rotate a disclosed code. Staff do not consume student seats.
- [ ] Obtain separate usability and optional research choices. Recording defaults off. Preserve version/assistance and use the manual rubric. Exclude raw text/quotes/notes from research analysis and exports.
- [ ] Review after the first two participants. Fix serious defects, repeat affected checks, and record the new build before continuing. Retain incomplete/assisted sessions honestly.

## Stop, recover, and close

Stop sessions and close enrollment for ownership/role leaks, secret exposure, fabricated evidence, consent violations, unexpected repeated provider charging, or a core flow blocker. Disable model calls for provider/cost incidents. Capture minimum sanitized diagnostic evidence. Environment switches require deployment to take effect.

Use the release ledger to select a known-good saved Site version compatible with the **current** database schema, then redeploy with the current environment revision. Code rollback does not roll back migrations or restore old secrets. Prefer forward repair if schema compatibility is uncertain. Never recreate the Site, discard participant records, or rewrite an applied migration as a recovery shortcut. Inspect supported audience controls before narrowing access; confirm the returned audience.

Repeat deployment smoke and the failed case before reopening. At pilot close, close enrollment and stop model calls when testing ends. Invoke expiry cleanup and record its returned counts. Repeat cleanup as records reach the seven-day operational and 30-day session cutoffs; expiry-aware reads alone do not erase stored data.

Expiry cleanup is implemented at **`POST /api/admin/purge-expired`**. Use an enrolled, unexpired owner/tutor account in a normal signed-in Site session. Send `Content-Type: application/json`, body `{}`, and an `Origin` matching the Site origin. A same-origin browser request supplies `Origin` automatically:

```javascript
const cleanupResponse = await fetch('/api/admin/purge-expired', {
  method: 'POST',
  credentials: 'same-origin',
  headers: { 'Content-Type': 'application/json' },
  body: '{}',
});
if (!cleanupResponse.ok) throw new Error(`Cleanup failed: ${cleanupResponse.status}`);
console.log(await cleanupResponse.json());
```

No dedicated UI button is required. This route removes expired records, expired enrollment security counters, and provider receipts past their seven-day cutoff; it does not erase unexpired participant activity. For immediate own learning-activity removal, use `DELETE /api/activity` with the participant's authenticated identity, same-origin `Origin`, and no request body. Verify deletion removes learning records and derivatives synchronously and prevents in-flight requests recreating them. If immediate removal at pilot close is required, complete participants' own-data deletion before their access expires.

Enrollment code-attempt count/window metadata remains linked to the native account separately from deleted learning activity. An active ten-minute counter survives own deletion so deletion cannot reset enrollment throttling. Expired counters are removed by `POST /api/admin/purge-expired` or a later own `DELETE /api/activity`; passing the window end does not automatically erase the row. Check `deleted.enrollmentAttempts`, `retained.enrollmentSecurityCounters`, `retained.enrollmentSecurityWindowEndsAt`, and `retained.enrollmentSecurityCleanup` in the deletion response. If a counter remains, arrange cleanup after the reported window ends and record the result without storing account-linked metadata in research records.

Delete downloaded copies and private notes according to disclosed retention. Explain limits for outside copies, platform backups/native logs, and provider inputs. Record purge date, actor, counts, and unresolved external-copy action without content. Do not claim automatic deletion unless its scheduler and actual deletion have been tested.

## Report evidence honestly

Record invited / attended / usability-agreed / research-consented / completed counts, builds, AI mode, assistance, valid evidence, independent transfer, issue IDs, changes, missing/withdrawn records, and untested access combinations. Use exact denominators and de-identified structured summaries. No raw participant work belongs in this public repo or research export. No participant data has been collected by this kit.
