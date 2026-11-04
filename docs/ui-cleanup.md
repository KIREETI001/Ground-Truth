# Focused workspace interaction contract

Primary job: choose a workflow, practise a concept and see the next useful action. Retain the existing paper/green styling; reduce the large hero and repeated explanations. Main actions, errors and consent remain visible. Source limits, metric definitions and secondary guidance move to compact question-mark help icons.

Help must work on hover, keyboard focus and tap; Escape and an outside click dismiss it. Tooltips must stay within the viewport and remain hoverable. Existing learning evidence and server permissions are unchanged.

Interaction defects to verify: the initial import form closes/remounts when saved records arrive; a reused map's start button depends on a distant consent checkbox; transfer mode can show only a disabled generation action when an exercise already exists; concept cards look clickable but only their titles respond; workflow selection can update content below the fold without moving focus. Empty/invalid forms should guide the user to the missing field rather than present a silent disabled primary button. Read-only teacher concepts should not masquerade as disabled learner actions.

Check desktop and narrow layouts, keyboard focus/Escape, all five stages, map reuse/filtering/selection, concept selection, continued exercise navigation and source disclosures. Keep destructive actions in project settings, not beside the primary practice action. Loading shows a stable placeholder; errors retain data and offer retry. Independent-mode restrictions retain a short visible state indicator with details in help.

## Verified locally

- Initial loading is a stable placeholder; forms no longer remount when saved projects arrive.
- Reused-map selection, backend filter, full-card selection and keyboard Enter advance to a focused goal form.
- Missing URL and missing consent produce browser validation at the relevant field; primary buttons are not silently disabled for these prerequisites.
- Concept-card body clicks navigate to Practice. An existing transfer exercise offers a working Continue action.
- Help opens on keyboard focus and click; Escape closes it. Portalled help stays inside the viewport at desktop and phone widths.
- Manual/AI editor tabs and existing-copy loading work. An unapplied editor draft survives changing stages; the test draft was restored without applying any file change.
- Desktop 1280×900 and phone 390×844 were checked. No horizontal page overflow was observed on the phone layout. Viewport overrides were restored.
- Type checking, the 195-test suite and the build passed. These UI checks did not send teacher shares, apply new code changes or delete saved evidence.
