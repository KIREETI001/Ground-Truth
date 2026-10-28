export type PracticeLink = { label: string; href: string; detail: string };
export type LessonChoice = { id: string; label: string; correct?: boolean; feedback: string };
export type Checkpoint = {
  id: string; label: string; title: string; prompt: string; code?: string;
  visual: 'queue' | 'receipt' | 'marker-start' | 'marker-next' | 'marker-unsorted' | 'code';
  choices: LessonChoice[]; hint: string; takeaway: string;
};
export type Mission = { id: string; number: string; title: string; topic: string; summary: string; color: string; checkpoints: Checkpoint[]; links: PracticeLink[] };

export const missions: Mission[] = [
  {
    id: 'scan-the-queue', number: '01', title: 'Scan the queue', topic: 'Loops + conditions', color: 'violet',
    summary: 'Choose a tool, follow the count, and catch an early stop.',
    checkpoints: [
      {
        id: 'queue-choose', label: 'Choose the tool', title: 'Every open slot counts.', visual: 'queue',
        prompt: 'A desk has a queue of slots marked “open” or “full”. You need the total number of open slots. Which approach fits?',
        choices: [
          { id: 'loop', label: 'Visit every slot; add 1 only when it is open.', correct: true, feedback: 'Yes. The loop visits every slot, and the condition decides whether to increase the count.' },
          { id: 'first', label: 'Stop as soon as you find one open slot.', feedback: 'That tells you whether an open slot exists. It misses any open slots later in the queue, so it cannot give the total.' },
          { id: 'sort', label: 'Sort the slots and use the first slot as the count.', feedback: 'Sorting changes the order, but the first slot is still a label, not a total. You need to count the matching slots.' },
        ],
        hint: 'A total needs every matching item. Which option keeps looking after the first match?',
        takeaway: 'A loop repeats the visit. A condition selects which visits change the count.',
      },
      {
        id: 'queue-trace', label: 'Trace the code', title: 'Follow the changing value.', visual: 'queue',
        prompt: 'Start at 0. Read each state in order. What is open after the loop?',
        code: 'let open=0;\nfor(const state of ["open","full","open"]){\n  if(state==="open") open+=1;\n}',
        choices: [
          { id: 'one', label: '1', feedback: 'The first open slot adds 1, but the loop keeps going. The final slot is also open.' },
          { id: 'two', label: '2', correct: true, feedback: 'Exactly. The count changes 0 → 1 → 1 → 2. The full slot does not increase it.' },
          { id: 'three', label: '3', feedback: 'There are three slots, but the condition excludes the full slot. Only two visits increase open.' },
        ],
        hint: 'Write down open after each visit. On “full”, the condition is false, so the value stays the same.',
        takeaway: 'Track the variable after each iteration, including the iterations that leave it unchanged.',
      },
      {
        id: 'queue-boundary', label: 'Find the boundary', title: 'One match or every match?', visual: 'queue',
        prompt: 'Someone adds a stop immediately after the first open slot is found. What question can that version answer reliably?',
        choices: [
          { id: 'exists', label: '“Is there at least one open slot?”', correct: true, feedback: 'Right. One match proves existence. To find the total, you must also visit the remaining slots.' },
          { id: 'total', label: '“How many open slots are there in total?”', feedback: 'It may leave later open slots unvisited. A count of the first match is not the total count.' },
          { id: 'last', label: '“Is the last slot open?”', feedback: 'An early stop might never reach the last slot. It tells you about a match it visited, not the final item.' },
        ],
        hint: 'Think about what remains unknown when the loop stops: it has not read the rest of the queue.',
        takeaway: 'Choose when to stop based on the question: finding any match and counting all matches are different tasks.',
      },
    ],
    links: [
      { label: 'Exercism · JavaScript for loops', href: 'https://exercism.org/tracks/javascript/concepts/for-loops', detail: 'Explore the loop concept and its exercises.' },
      { label: 'Codewars · JavaScript practice', href: 'https://www.codewars.com/kata/search/javascript', detail: 'Start with Fundamentals at 8 or 7 kyu.' },
    ],
  },
  {
    id: 'find-the-receipt', number: '02', title: 'Find the receipt', topic: 'Maps + lookup', color: 'lime',
    summary: 'Match a request ID to a value, then ask when a Map fits.',
    checkpoints: [
      {
        id: 'receipt-choose', label: 'Choose the tool', title: 'An ID is your way in.', visual: 'receipt',
        prompt: 'You repeatedly need a receipt’s status from its exact request ID. Which structure expresses that lookup directly?',
        choices: [
          { id: 'map', label: 'A Map from request ID to status.', correct: true, feedback: 'Yes. A Map expresses the key → value relationship, and get(id) retrieves the value for that exact key.' },
          { id: 'count', label: 'A single number storing the number of receipts.', feedback: 'A count loses the relationship between a particular request ID and its status.' },
          { id: 'position', label: 'Only the position of the most recently displayed receipt.', feedback: 'A display position is not the request ID. It will not identify an arbitrary earlier request by its exact key.' },
        ],
        hint: 'The important relationship is “this exact ID → its status”, rather than “how many” or “which display position”.',
        takeaway: 'A Map associates keys with values. JavaScript objects have different semantics and APIs; they are not identical to Maps.',
      },
      {
        id: 'receipt-trace', label: 'Trace the code', title: 'Use the key, get the value.', visual: 'receipt',
        prompt: 'What value does receipts.get("r-5") return?',
        code: 'const receipts = new Map([\n  ["r-2", "saved"],\n  ["r-5", "queued"]\n]);\nreceipts.get("r-5");',
        choices: [
          { id: 'saved', label: '"saved"', feedback: 'Saved belongs to r-2. The lookup uses the exact key r-5, not the first entry.' },
          { id: 'queued', label: '"queued"', correct: true, feedback: 'That is it. The entry with key r-5 has value queued. get returns that value.' },
          { id: 'key', label: '"r-5"', feedback: 'r-5 is the key supplied to get. The result is the value associated with that key.' },
        ],
        hint: 'Find the entry whose first part is exactly r-5. Its second part is the returned value.',
        takeaway: 'Follow the lookup from the supplied key to its associated value.',
      },
      {
        id: 'receipt-boundary', label: 'Find the boundary', title: 'A useful tool needs a reason.', visual: 'receipt',
        prompt: 'You only need to display three items once, in arrival order. Is a Map automatically a better choice than an array?',
        choices: [
          { id: 'always', label: 'Yes. A Map is always the better collection.', feedback: 'No collection is automatically best. This task does not need repeated lookup by an exact key.' },
          { id: 'fit', label: 'No. An array already fits a short, ordered display.', correct: true, feedback: 'Exactly. A Map can preserve insertion order, but it adds no automatic benefit here. Choose the structure for the operations you need.' },
          { id: 'impossible', label: 'Yes. An array cannot preserve arrival order.', feedback: 'Arrays can preserve the sequence you append. An ordered display is a normal use for an array.' },
        ],
        hint: 'Ask which operation matters in this task: repeated key lookup, or one pass over a short sequence?',
        takeaway: 'Choose a collection for its operations and semantics, not because one structure is always “better”.',
      },
    ],
    links: [
      { label: 'LeetCode · 30 Days of JavaScript', href: 'https://leetcode.com/studyplan/30-days-of-javascript/', detail: 'Continue with its JavaScript practice plan.' },
      { label: 'Exercism · JavaScript objects', href: 'https://exercism.org/tracks/javascript/concepts/objects', detail: 'Explore object properties and compare their use with Maps.' },
    ],
  },
  {
    id: 'move-the-marker', number: '03', title: 'Move the marker', topic: 'Sorted two pointers', color: 'peach',
    summary: 'Read both pointer positions and reason about the next move.',
    checkpoints: [
      {
        id: 'marker-choose', label: 'Choose a move', title: 'The total is too large.', visual: 'marker-start',
        prompt: 'The quantities are sorted: [2, 4, 7, 11]. Target: 11. left = 0 and right = 3, so the total is 2 + 11 = 13. Which move can reduce it?',
        choices: [
          { id: 'right', label: 'Decrease right from 3 to 2: use 2 + 7.', correct: true, feedback: 'Yes. Keeping left at 0 and moving right to 2 replaces 11 with 7. The total falls from 13 to 9.' },
          { id: 'left', label: 'Increase left from 0 to 1: use 4 + 11.', feedback: 'That replaces 2 with 4, raising the total to 15. It moves farther above the target.' },
          { id: 'end', label: 'Keep both pointers still; the pair already totals 11.', feedback: 'The current values are 2 and 11, not their indices 0 and 3. Their total is 13.' },
        ],
        hint: 'Because the values are sorted, moving the right pointer left chooses a smaller value while left stays fixed.',
        takeaway: 'Reason about the values at the pointers, not just the pointer indices.',
      },
      {
        id: 'marker-trace', label: 'Trace the next move', title: 'Now the total is too small.', visual: 'marker-next',
        prompt: 'After that move, left = 0 and right = 2. Their values are 2 and 7, totaling 9. Which move can increase the total toward 11?',
        choices: [
          { id: 'right', label: 'Decrease right again, from 2 to 1.', feedback: 'That chooses 4 instead of 7: 2 + 4 = 6, farther below the target.' },
          { id: 'left', label: 'Increase left from 0 to 1, keeping right at 2.', correct: true, feedback: 'Exactly. left now points to 4 and right still points to 7. Their total is 4 + 7 = 11.' },
          { id: 'index', label: 'Add the pointer indices: 0 + 2 = 2.', feedback: 'The target compares quantities, not index positions. Read the values at those positions before adding.' },
        ],
        hint: 'Which pointer can move to a larger value without undoing the previous move? Keep right at index 2.',
        takeaway: 'On sorted values, increasing left can raise the total; decreasing right can lower it.',
      },
      {
        id: 'marker-boundary', label: 'Find the boundary', title: 'Order makes the reasoning work.', visual: 'marker-unsorted',
        prompt: 'The same values arrive as [7, 2, 11, 4]. Can you apply the same ordered-elimination rule directly?',
        choices: [
          { id: 'same', label: 'Yes. It has the same four values, so every move is safe.', feedback: 'The values match, but their order does not. Moving a pointer no longer guarantees a smaller or larger value.' },
          { id: 'sorted', label: 'No. Establish sorted order first, or choose another approach.', correct: true, feedback: 'Right. The elimination argument relies on sorted input. For example, moving right from value 4 to value 11 would increase the total, not reduce it.' },
          { id: 'indices', label: 'Yes. Pointer indices always increase with their values.', feedback: 'Indices describe positions. In this array, position 1 has value 2 and position 2 has value 11; values do not follow a consistent order.' },
        ],
        hint: 'Look at the rightmost value 4. Moving one position left reaches 11. Does the expected direction still hold?',
        takeaway: 'A pointer is a position. A safe elimination rule needs an ordering argument about the values.',
      },
    ],
    links: [
      { label: 'LeetCode · Programming Skills', href: 'https://leetcode.com/studyplan/programming-skills/', detail: 'A broader programming plan for continued practice.' },
      { label: 'Exercism · JavaScript arrays', href: 'https://exercism.org/tracks/javascript/concepts/arrays', detail: 'Build confidence reading positions and array values.' },
    ],
  },
  {
    id: 'async-in-order', number: '04', title: 'Async, in order', topic: 'Promises + await', color: 'violet',
    summary: 'Trace an async save and make the interface wait for the right thing.',
    checkpoints: [
      {
        id: 'async-choose', label: 'Choose the wait', title: 'Saved should mean saved.', visual: 'code',
        prompt: 'saveDraft returns a promise that resolves after the server accepts the draft. Which change makes “Saved” appear after acceptance?',
        code: 'async function onSave() {\n  saveDraft(draft);\n  setStatus("Saved");\n}',
        choices: [
          { id: 'await', label: 'Use await saveDraft(draft) before setStatus.', correct: true, feedback: 'Yes. Await pauses this async function until that promise settles. The success message follows a successful resolution.' },
          { id: 'timer', label: 'Wait a fixed 100 milliseconds before showing “Saved”.', feedback: 'The server may take longer than that timer. Elapsed time does not establish that the draft was accepted.' },
          { id: 'label', label: 'Rename saveDraft to savedDraft.', feedback: 'A name does not change execution order. The promise still needs to be awaited before reporting success.' },
        ],
        hint: 'Follow the value returned by saveDraft. Which option waits for that specific operation?',
        takeaway: 'Await the operation whose result your next interface state depends on.',
      },
      {
        id: 'async-trace', label: 'Trace the order', title: 'A pause has a boundary.', visual: 'code',
        prompt: 'The promise is already resolved. What order is logged?',
        code: 'async function load() {\n  console.log("start");\n  await Promise.resolve();\n  console.log("ready");\n}\nload();\nconsole.log("outside");',
        choices: [
          { id: 'straight', label: 'start → ready → outside', feedback: 'Even an already fulfilled promise resumes the code after await later, after the current synchronous work finishes.' },
          { id: 'order', label: 'start → outside → ready', correct: true, feedback: 'Exactly. load starts immediately, pauses at await, and the caller logs outside. Then the awaited continuation logs ready.' },
          { id: 'deferred', label: 'outside → start → ready', feedback: 'Calling an async function begins its body immediately. It runs synchronously until the first await.' },
        ],
        hint: 'Separate the function into code before await and its continuation after await.',
        takeaway: 'Await pauses the current async function; it does not stop the caller’s synchronous work.',
      },
      {
        id: 'async-boundary', label: 'Handle failure', title: 'Success is only one outcome.', visual: 'code',
        prompt: 'saveDraft can reject when the connection fails. What does this code still need for useful feedback?',
        code: 'async function onSave() {\n  setStatus("Saving…");\n  await saveDraft(draft);\n  setStatus("Saved");\n}',
        choices: [
          { id: 'catch', label: 'Catch a rejection and show a retryable error while keeping the draft.', correct: true, feedback: 'Right. On rejection the success line is skipped. Handle that outcome explicitly so the user can keep their work and retry.' },
          { id: 'finally', label: 'Always set “Saved” in finally.', feedback: 'Finally also runs after a failure. Showing Saved there would report success without successful acceptance.' },
          { id: 'remove', label: 'Remove await so failures cannot happen.', feedback: 'The network operation can still fail. Removing await only stops this function from waiting for its outcome.' },
        ],
        hint: 'A rejected awaited promise throws into the async function. Which path should the interface show then?',
        takeaway: 'Pair a success path with an honest failure path; preserve user input for recovery.',
      },
    ],
    links: [{ label: 'MDN · Using promises', href: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises', detail: 'Read more about promise chains and error handling.' }],
  },
  {
    id: 'query-the-data', number: '05', title: 'Query the data', topic: 'SQL + filters', color: 'lime',
    summary: 'Read a filter, count matching records, and notice what a query leaves out.',
    checkpoints: [
      {
        id: 'sql-choose', label: 'Choose the filter', title: 'Ask for the rows you need.', visual: 'code',
        prompt: 'A tasks table stores id, done, and owner_id. Which query returns only unfinished tasks?',
        code: '-- tasks\n-- id | done | owner_id\n--  1 |    0 | ada\n--  2 |    1 | ben\n--  3 |    0 | ben',
        choices: [
          { id: 'where', label: 'SELECT * FROM tasks WHERE done = 0;', correct: true, feedback: 'Yes. WHERE tests each row. Rows 1 and 3 meet done = 0, so they are returned.' },
          { id: 'order', label: 'SELECT * FROM tasks ORDER BY done;', feedback: 'ORDER BY changes the result order. It does not remove completed tasks from the result.' },
          { id: 'all', label: 'SELECT * FROM tasks;', feedback: 'Without a filter, this query returns completed and unfinished tasks alike.' },
        ],
        hint: 'Which clause selects rows by a condition rather than changing their order?',
        takeaway: 'WHERE filters rows. ORDER BY orders the rows that remain.',
      },
      {
        id: 'sql-trace', label: 'Trace the result', title: 'Both conditions must hold.', visual: 'code',
        prompt: 'Using the same three rows, what count does this query return?',
        code: 'SELECT COUNT(*) AS total\nFROM tasks\nWHERE owner_id = \'ben\' AND done = 0;\n\n-- (1, 0, ada), (2, 1, ben), (3, 0, ben)',
        choices: [
          { id: 'one', label: '1', correct: true, feedback: 'Exactly. Only row 3 belongs to ben and is unfinished. Row 2 belongs to ben but fails done = 0.' },
          { id: 'two', label: '2', feedback: 'There are two rows owned by ben, but the AND condition also requires done = 0. Completed row 2 is excluded.' },
          { id: 'three', label: '3', feedback: 'COUNT counts the rows after the WHERE filter. It does not count every row in the original table here.' },
        ],
        hint: 'Check owner_id and done separately for each row. An AND needs both tests to pass.',
        takeaway: 'Trace the filter first, then apply the aggregate to its matching rows.',
      },
      {
        id: 'sql-boundary', label: 'Find the boundary', title: 'A filter is not permission.', visual: 'code',
        prompt: 'The browser supplies ownerId to this server query. What must happen before treating the result as private to the signed-in user?',
        code: 'const ownerId = request.body.ownerId;\n// query uses a bound parameter, not string concatenation\nSELECT * FROM tasks WHERE owner_id = ?;',
        choices: [
          { id: 'identity', label: 'Use the authenticated server identity to choose the owner, and check access.', correct: true, feedback: 'Right. A bound parameter helps separate values from SQL, but a caller can still supply another owner ID. Ownership must come from trusted authentication and authorization.' },
          { id: 'parameter', label: 'Nothing: the bound parameter proves the caller owns that ID.', feedback: 'Binding a parameter does not establish identity or permission. It is a separate concern from deciding whose rows the caller may read.' },
          { id: 'hidden', label: 'Hide the ownerId input in the browser.', feedback: 'A hidden field is still caller-controlled. The server must enforce who may read the requested rows.' },
        ],
        hint: 'A query can safely handle a value while still asking for data the caller does not own.',
        takeaway: 'Query correctness, parameter binding, and authorization are separate checks.',
      },
    ],
    links: [{ label: 'SQLite · SELECT', href: 'https://www.sqlite.org/lang_select.html', detail: 'Inspect the clauses used by a SELECT statement.' }],
  },
  {
    id: 'check-the-owner', number: '06', title: 'Check the owner', topic: 'Server access + tests', color: 'peach',
    summary: 'Follow a server-side ownership check and choose a test that challenges it.',
    checkpoints: [
      {
        id: 'owner-choose', label: 'Choose the boundary', title: 'The server decides access.', visual: 'code',
        prompt: 'A user can edit their own note. Which condition belongs on the server before this update?',
        code: 'const note = await db.getNote(request.params.id);\nconst user = await authenticate(request);\n// decide access here\nawait db.updateNote(note.id, request.body.text);',
        choices: [
          { id: 'owner', label: 'Require a signed-in user and note.ownerId === user.id.', correct: true, feedback: 'Yes. Check authenticated identity against the stored owner before allowing the update, and handle missing users or notes before reading their fields.' },
          { id: 'button', label: 'Allow it whenever the browser shows an Edit button.', feedback: 'The browser can be changed or bypassed. A displayed button does not establish server-side permission.' },
          { id: 'body', label: 'Require request.body.ownerId to match note.ownerId.', feedback: 'The caller controls request.body. Matching a supplied ID does not establish that the signed-in caller owns the note.' },
        ],
        hint: 'Compare a trusted authenticated identity with the ownership recorded by the server.',
        takeaway: 'Enforce access at the server boundary before reading or changing protected data.',
      },
      {
        id: 'owner-trace', label: 'Trace the decision', title: 'Follow the rejecting path.', visual: 'code',
        prompt: 'User ben requests a note owned by ada. Which line decides the outcome?',
        code: 'const user = { id: "ben" };\nconst note = { ownerId: "ada", text: "draft" };\nif (note.ownerId !== user.id) {\n  return response(403);\n}\nawait update(note);\nreturn response(200);',
        choices: [
          { id: 'reject', label: 'The mismatch returns 403 before update runs.', correct: true, feedback: 'Exactly. ada differs from ben, so the condition is true. The return exits the handler before the update.' },
          { id: 'update', label: 'update runs, then the handler returns 403.', feedback: 'The earlier return exits this handler. Execution does not continue to the update after that return.' },
          { id: 'success', label: 'A signed-in user always reaches response(200).', feedback: 'Authentication identifies the user. This separate ownership condition can still reject an authenticated user.' },
        ],
        hint: 'Evaluate the string comparison, then follow return rather than skipping past it.',
        takeaway: 'Authentication answers who the caller is; authorization decides what that caller may do.',
      },
      {
        id: 'owner-boundary', label: 'Test the boundary', title: 'Challenge the allowed path.', visual: 'code',
        prompt: 'The owner can update a note successfully. Which additional test most directly checks the ownership boundary?',
        code: '// Existing check\n// Ada updates Ada’s note → 200, text changes.\n\n// Add one test that can disprove isolation.',
        choices: [
          { id: 'other', label: 'Ben tries to update Ada’s note; expect denial and unchanged stored text.', correct: true, feedback: 'Right. This exercises a different signed-in identity and checks both the response and the protected record. A denial alone would miss a write that happened first.' },
          { id: 'repeat', label: 'Ada updates Ada’s note twice successfully.', feedback: 'That repeats the permitted path. It does not challenge whether a different user can change the note.' },
          { id: 'color', label: 'Check that the Edit button has the correct color.', feedback: 'Appearance does not exercise the server boundary or verify that the stored note stayed unchanged.' },
        ],
        hint: 'Change the caller while keeping the target note fixed. Inspect the stored result as well as the response.',
        takeaway: 'A useful denial test checks that an unauthorized request causes no protected write.',
      },
    ],
    links: [{ label: 'OWASP · Authorization cheat sheet', href: 'https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html', detail: 'Continue with authorization design and testing principles.' }],
  },
];

export const checkpointIds = new Set(missions.flatMap(mission => mission.checkpoints.map(checkpoint => checkpoint.id)));

export const checkpointTotal = checkpointIds.size;
export const practicePointMaximum = checkpointTotal * 10;
