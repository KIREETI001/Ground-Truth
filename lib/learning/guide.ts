import type { Phase } from '../contracts.ts';
export type GuideState = { phase: Phase; selectedCaseId?: string; requiredCaseId?: string; unfinishedCaseId?: string; hasPrediction: boolean; hasRun: boolean; hasEvidence: boolean; hasExplanation: boolean };
export type GuideStep = { kind: 'procedural'; targetId: string; title: string; detail: string };
export type NextAction = GuideStep & { action: 'review' | 'resume-other' | 'resume' | 'return-required' | 'predict' | 'run' | 'explain' | 'patch' | 'advance'; label: string; caseId?: string };

export function workspaceGuide(state: GuideState): NextAction {
  const step = (action: NextAction['action'], targetId: string, title: string, detail: string, label: string, caseId?: string): NextAction => ({ kind: 'procedural', action, targetId, title, detail, label, caseId });
  if (state.phase === 'complete') return step('review', 'workspace-history', 'Your investigation is saved.', 'Open the original record, download it, or choose another practice mission.', 'Open saved history');
  if (state.unfinishedCaseId && state.unfinishedCaseId !== state.selectedCaseId) return step('resume-other', 'workspace-next', 'Finish your saved run first.', 'Another case has an unfinished run. Open that case and use Resume run to reconcile its saved receipts.', 'Open unfinished case', state.unfinishedCaseId);
  if (state.unfinishedCaseId) return step('resume', 'workspace-run-control', 'Resume the saved run.', 'Use the run control below. It checks existing server receipts and sends only missing planned steps.', 'Go to resume control');
  if (!state.hasPrediction) return step('predict', 'workspace-prediction', 'Read the source. Save a prediction.', 'Use the App, Client, and Server tabs. Then complete each prediction field and save. Running unlocks after that.', 'Go to prediction');
  if (!state.hasEvidence) return step('run', 'workspace-run-control', 'Your prediction is locked. Run the test.', 'Use the run button below to execute the supplied fixture. Your saved prediction stays unchanged.', 'Go to run control');
  if (!state.hasExplanation) return step('explain', 'workspace-explanation', 'Connect your explanation to a record.', 'Inspect the saved evidence, choose or name a record, then save your own claim and reasoning.', 'Go to explanation');
  if (state.selectedCaseId !== state.requiredCaseId) return step('return-required', 'workspace-next', 'Probe saved. Return to the main case.', 'This additional probe has its own saved work. Continue the phase from the required case.', 'Open required case', state.requiredCaseId);
  if (state.phase === 'baseline' || state.phase === 'transfer') return step('patch', 'workspace-patch', 'Your explanation is saved.', 'Open the reviewed change below. Read it and enter your reason before applying it.', 'Go to reviewed change');
  return step('advance', 'workspace-advance', 'This phase is saved.', 'Use the explicit Continue control below when you are ready. Your original work remains saved.', state.phase === 'repair' ? 'Go to independent case' : 'Go to finish control');
}

export function workspaceTour(phase: Phase): GuideStep[] {
  const independent = phase === 'transfer' || phase === 'transfer_repair';
  return [
    { kind: 'procedural', targetId: 'workspace-navigation', title: 'Choose where to practice.', detail: 'Home has a quick warmup. Learn has three short JavaScript missions. Live playground keeps this saved investigation.' },
    { kind: 'procedural', targetId: 'workspace-progress', title: 'See the stage you are in.', detail: 'This path follows your saved server activity. It updates when you save work or complete a phase.' },
    { kind: 'procedural', targetId: 'workspace-next', title: 'One next action at a time.', detail: 'This card points to the next required control. An unfinished run takes priority before the phase can continue.' },
    { kind: 'procedural', targetId: 'workspace-investigation', title: 'Source, prediction, then execution.', detail: 'Use the source tabs and labelled form fields. Save a prediction to unlock the run control; a saved prediction is locked.' },
    { kind: 'procedural', targetId: 'workspace-history', title: 'Keep the original record.', detail: independent ? 'Activity history stays restricted until the current independent explanation is saved. This guide explains controls only.' : 'Open activity history for saved work and exports. Replaying a saved trace highlights existing receipts without sending requests.' },
  ];
}
