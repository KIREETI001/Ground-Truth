export type Phase = 'baseline' | 'repair' | 'transfer' | 'transfer_repair' | 'complete';
export type FixtureId = 'lost-success.v1' | 'concurrent-retry.v1' | 'fail-before-commit.v1' | 'intent-lifecycle.v1';
export type Outcome = 'created' | 'replayed' | 'conflict' | 'fault' | 'unsure';
export type RunStatus = 'running' | 'complete' | 'infra_error';
export interface Prediction {
  id: string; rowsAfterEachGroup: number[]; requestOutcomes: Outcome[];
  rationale: string; confidence: number; lockedAt: string;
}
export interface Explanation {
  claim: string; evidence: string; reasoning: string; lockedAt: string;
}
export interface SignupPayload { eventId: string; attendeeRef: string }
export interface PlannedStep {
  stepId: string; index: number; group: number; requiresStepIds: string[];
  intentId: string; action: 'signup' | 'retry' | 'new-signup';
  payload: SignupPayload; idempotencyKey: string | null;
}
export interface RunPlan {
  runId: string; caseId: string; phase: Exclude<Phase, 'complete'>;
  fixtureId: FixtureId; sourceDigest: string; steps: PlannedStep[]; expiresAt: string;
}
export interface SignupSuccess { registrationId: string; eventId: string; attendeeRef: string; registeredAt: string }
export interface StepReceipt {
  receiptId: string; runId: string; stepId: string; index: number; intentId: string;
  decision: 'created' | 'replayed' | 'payload_conflict' | 'not_executed';
  registrationId: string | null; handlerStatus: number | null; deliveredStatus: number;
  deliveryPolicy: 'normal' | 'discard-success' | 'fail-before-handler';
  committedRowCountAfter: number; committedAt: string;
}
export interface RunEvidence {
  schemaVersion: 'groundtruth-evidence.v1'; runId: string; caseId: string; sessionId: string;
  phase: Exclude<Phase, 'complete'>; fixtureId: FixtureId; executionMode: 'live-fixture';
  sourceDigest: string; planDigest: string; predictionId: string; finalizedAt: string;
  evidenceHash: string; receipts: StepReceipt[]; registrations: SignupSuccess[];
  probes: Record<string, number | boolean | null>;
}
export interface InvestigationCase {
  id: string; phase: Exclude<Phase, 'complete'>; fixtureId: FixtureId;
  prediction: Prediction | null; runId: string | null;
  evidence: RunEvidence | null; explanation: Explanation | null;
}
export interface LearningSession {
  id: string; labId: 'campus-signup.v1'; phase: Phase; revision: number;
  createdAt: string; expiresAt: string; cases: InvestigationCase[];
  patches: { phase: string; patchId: string; reason: string; selectedAt: string }[];
  suggestionDecisions?: { caseId: string; decision: 'accepted' | 'changed' | 'rejected'; reason: string; at: string }[];
}
export interface Me {
  authenticated: boolean; userId: string | null; enrolled: boolean; instructor: boolean;
  noticeAcknowledged: boolean; researchConsent: boolean; aiAvailable: boolean;
  pilotOpen: boolean; localDevelopment: boolean;
}
export interface SourceView {
  title: string; client: string; server: string; sourceDigest: string;
  stages: string[]; groups: number; requestCount: number;
}
export interface CoachContext {
  phase: Phase; sessionId: string; stateRevision: number;
  caseId: string; fixtureId: FixtureId; prediction: Prediction;
  explanation: Explanation | null; source: SourceView; evidence: RunEvidence | null;
  allowedFixtures: FixtureId[];
}
export interface CoachDecision {
  action: 'clarify' | 'propose_experiment' | 'ask_followup' | 'abstain';
  fixtureId: FixtureId | null; question: string; rationale: string; evidenceRefs: string[];
}
export interface CoachResult {
  status: 'ready' | 'unavailable'; mode: 'live-meta' | 'instructor-authored';
  decision: CoachDecision | null; code?: string;
  model?: string; usage?: { inputTokens: number; outputTokens: number };
}
export interface RuntimeConfig {
  DB: D1Database;
  MODEL_API_KEY?: string; MODEL_BASE_URL?: string; MODEL_ID?: string; MODEL_CALLS_ENABLED?: string;
  PILOT_ID?: string; PILOT_MAX_MEMBERS?: string; PILOT_ENROLLMENT_CODE?: string;
  PILOT_ENROLLMENT_ENABLED?: string; STAFF_USER_ROLES?: string;
}
