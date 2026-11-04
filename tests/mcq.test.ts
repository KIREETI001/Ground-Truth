import test from 'node:test';
import assert from 'node:assert/strict';
import { shuffleMCQ,type MCQExercise } from '../lib/study/mcq.ts';

const quiz=():MCQExercise=>({format:'mcq',options:[{id:'A',text:'Trim and accept lengths 1 through 80.'},{id:'B',text:'Reject length 80.'},{id:'C',text:'Keep original surrounding spaces.'},{id:'D',text:'Accept length 81.'}],correctOption:'A',answerExplanation:'Answer A preserves the accepted boundary. Option B wrongly rejects 80; option C is wrong because it keeps spaces.',reviewPoints:['Option A is correct. Option B wrongly rejects 80; option C is wrong.','Choices B, C, and D each change the required behavior.']});

test('shuffling keeps the actual source answer and private letter references aligned in one mapping pass',()=>{
 const input=quiz(),before=structuredClone(input),shuffled=shuffleMCQ(input,()=>0);
 // Fisher-Yates with zero places original B,C,D,A at displayed A,B,C,D.
 assert.equal(shuffled.correctOption,'D');assert.equal(shuffled.options.find(option=>option.id===shuffled.correctOption)?.text,input.options[0].text);
 assert.equal(shuffled.answerExplanation,'Answer D preserves the accepted boundary. Option A wrongly rejects 80; option B is wrong because it keeps spaces.');
 assert.equal(shuffled.reviewPoints?.[0],'Option D is correct. Option A wrongly rejects 80; option B is wrong.');
 assert.equal(shuffled.reviewPoints?.[1],'Choices A, B, and C each change the required behavior.');
 assert.deepEqual(input,before);
});

test('compound explicit references preserve connectors, formatting and noncontiguous option ranges',()=>{
 const input={...quiz(),answerExplanation:'OPTIONS B AND C fail; choices A/C differ; answers B and/or D fail.',reviewPoints:['Options A–C need comparison; choice **B** rejects the endpoint.','Choices (B), [C], and `D` miss the rule. Answer: "A" is the accepted path.','Answers D through B are distractors.']};
 const shuffled=shuffleMCQ(input,()=>0);
 assert.equal(shuffled.answerExplanation,'OPTIONS A AND B fail; choices D/B differ; answers A and/or C fail.');
 assert.equal(shuffled.reviewPoints[0],'Options D, A, B need comparison; choice **A** rejects the endpoint.');
 assert.equal(shuffled.reviewPoints[1],'Choices (A), [B], and `C` miss the rule. Answer: "D" is the accepted path.');
 assert.equal(shuffled.reviewPoints[2],'Answers C, B, A are distractors.');
});

test('code variables, quoted source strings and unqualified A-D prose remain unchanged',()=>{
 const untouched='A string can be empty. B and C are code variables. `const A = input; const answer = "B"; return A;` Source says "option B" and \'choice C\'.\n```js\nconst A = "option B";\nreturn A;\n```';
 const input={...quiz(),answerExplanation:untouched+' Option A returns the accepted title.',reviewPoints:['Inspect `option A` and `answer B`; keep the code variable A unchanged. Choice D is the rejected-length case.','The identifier answer A_value stays literal; option a valid title is ordinary prose.']};
 const shuffled=shuffleMCQ(input,()=>0);
 assert.equal(shuffled.answerExplanation,untouched+' Option D returns the accepted title.');
 assert.equal(shuffled.reviewPoints[0],'Inspect `option A` and `answer B`; keep the code variable A unchanged. Choice C is the rejected-length case.');
 assert.equal(shuffled.reviewPoints[1],input.reviewPoints[1]);
});

test('possessive prose does not turn the surrounding review explanation into a quoted source literal',()=>{
 const input={...quiz(),answerExplanation:"Option A follows the learner's trace. Option B contradicts the source's accepted boundary."};
 assert.equal(shuffleMCQ(input,()=>0).answerExplanation,"Option D follows the learner's trace. Option A contradicts the source's accepted boundary.");
});

test('explicit answer-is and choice-letter phrasing stays aligned after shuffling',()=>{
 const input={...quiz(),answerExplanation:'The correct answer is A; rejected choices are B and C. The final choice should be letter A.',reviewPoints:['The answer would be A; the rejected option was B. Choices are either C or D.']};
 const shuffled=shuffleMCQ(input,()=>0);
 assert.equal(shuffled.answerExplanation,'The correct answer is D; rejected choices are A and B. The final choice should be letter D.');
 assert.equal(shuffled.reviewPoints[0],'The answer would be D; the rejected option was A. Choices are either B or C.');
});

test('unquoted code assignments and type annotations do not become answer-letter references',()=>{
 const input={...quiz(),answerExplanation:'const option = A; const answer: A = B; option = A; Option A is the selected boundary.'};
 assert.equal(shuffleMCQ(input,()=>0).answerExplanation,'const option = A; const answer: A = B; option = A; Option D is the selected boundary.');
});
