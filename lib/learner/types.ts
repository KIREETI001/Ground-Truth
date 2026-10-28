export const skillIds = ['code-reading', 'collections', 'async', 'sql', 'testing', 'access'] as const;
export type SkillId = typeof skillIds[number];
export const languageIds = ['javascript', 'typescript', 'sql', 'python', 'java', 'cpp', 'csharp'] as const;
export type LanguageId = typeof languageIds[number];
export type LearnerProfile = {
  goal: 'frontend' | 'full-stack' | 'backend';
  languages: LanguageId[];
  interests: ('interfaces' | 'apis' | 'data' | 'reliability')[];
  minutes: 10 | 20 | 30;
};
export type BaselineAnswer = { questionId: string; choiceId: string };
export type BaselineQuestion = {
  id: string; skillId: SkillId; title: string; prompt: string; code: string;
  choices: { id: string; label: string; feedback: string; correct?: boolean }[];
};
export type ProjectSnapshot = {
  repository: string; url: string; commit: string; analysedAt: string;
  files: { path: string; language: string; excerpt: string }[];
  signals: { skillId: SkillId; path: string; note: string }[];
  suggestedMissionId: string | null;
  warnings: string[];
};
export type LearnerState = {
  version: 1;
  profile: LearnerProfile | null;
  baseline: BaselineAnswer[];
  completed: string[];
  project: ProjectSnapshot | null;
};
export type LearnerRecord = { state: LearnerState | null; revision: string | null; expiresAt: string | null };
export type SkillEvidence = {
  id: SkillId; title: string; description: string;
  status: 'not-started' | 'baseline' | 'guided' | 'found-in-project';
  label: string; evidence: string[]; missionId: string;
};
export type Recommendation = { missionId: string; reason: string; review: boolean };
export type Pulse = {
  id: string; question: string; choices: { id: string; label: string }[];
  total: number; counts: Record<string, number> | null; choiceId: string | null;
  closesAt: string; minimumResponses: number;
};
