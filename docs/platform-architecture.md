> Historical notes, superseded by the local-only implementation. See [current setup and architecture](local-project-mvp.md). Live deployment is outside the current scope.

# GroundTruth platform architecture

## Product contract
One live campus-signup investigation. Learners predict, execute, inspect, explain, repair and transfer. Teacher review reads the original saved evidence. Developers manage readiness and access. Extra learning, project and Radar routes remain accessible by their old URLs but are outside the main pitch navigation.

## Access matrix
| Capability | User | Teacher | Developer |
|---|---|---|---|
| Personal investigation | Enrolled, own records | Enrolled, own records | Enrolled, own records |
| Pilot roster and retained evidence | No | Assigned pilot, enrolled | Assigned pilot, enrolled |
| Read system readiness / role assignments | No | No | Assigned pilot |
| Grant, downgrade or revoke platform access | No | No | Assigned pilot; cannot change own role |
| Global expired-data cleanup | No | No | Additionally requires operator owner configuration and enrollment |

Unauthenticated visitors can read platform introductions but not protected data. Navigation never assigns a role. Native identity is established by the existing hosted authentication boundary or loopback-only development simulation. Every protected API checks identity and authorization. Teacher review remains read-only; no automatic grading is introduced.

## Database
Existing D1/SQLite tables retain sessions, versioned learning documents, runs, receipts, registrations, evidence, membership, consent and quotas.
- platform_access: composite key (user_id, pilot_id); checked user/teacher/developer tier; granting actor and modification time. An explicit user assignment revokes higher privileges.
- access_audit: append-only through the application API; role assignment and audit insertion share a rollback-capable database batch. It records actor, target, pilot, resulting role and time. It is an operational log, not a tamper-proof ledger.
- session_scopes: foreign key to sessions with cascading deletion, fixed pilot association, indexed for teacher roster queries.
- SQL insert trigger binds new sessions to the membership pilot. Existing sessions are backfilled from current membership during migration. Historical membership at the original creation date cannot be reconstructed; orphan sessions receive no teacher scope.

Migrations 0003 and 0004 are additive. Schema definitions and generated snapshots are committed with them. Fresh installations apply 0000 through 0004 in order; existing installations apply only missing migrations. No production migration was performed.

## Authorization
/api/me includes the effective platformRole. /api/developer/status returns bounded configuration flags, pilot counts, up to 100 assignments and 20 recent access changes; it never returns credentials or learner answers. POST /api/developer/access validates its closed body and native developer identity, enforces same-origin JSON, prevents self-role changes, and atomically writes the assignment and audit event.

Existing teacher APIs remain /api/admin/pilot and /api/admin/sessions/:id/proof.json. Both require current pilot membership and teacher/developer permission; evidence also requires its immutable session scope to match. Existing learner endpoints preserve ownership checks. The legacy /tutor route remains a compatibility alias for the teacher screen.

STAFF_USER_ROLES owner/tutor mappings bootstrap durable developer/teacher assignments once per pilot on access. Persisted assignments take precedence, so downgrades survive restart. Configure only intended bootstrap identities. Global retention cleanup additionally requires the operator-configured owner identity, because it can affect multiple pilots.

## MVP limits
This is one pilot per deployment, with one current pilot membership per learner. It is not a multi-school tenancy or billing system. Platform access assignments are operational records and are not deleted by personal learning-activity deletion. Operational access/audit retention must be agreed before broader deployment. Role assignment uses exact native account IDs; no email lookup, invitations or self-service teacher registration is claimed.

The local simulated owner can open all three areas. Distinct-role denials are covered by backend tests. Hosted identity boundaries and live Meta inference still require separate deployment verification.

