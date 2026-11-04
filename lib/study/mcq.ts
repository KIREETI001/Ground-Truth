export type MCQOption={id:string;text:string};
export type MCQExercise={format:'mcq';options:MCQOption[];correctOption:string;answerExplanation:string;reviewPoints?:string[]};
function remapOptionReferences(text:string,mapping:Map<string,string>){
 // Remap only labelled prose. Code spans and quoted source literals may use
 // A–D as identifiers or data, so their contents are deliberately preserved.
 const protectedSpans=[...text.matchAll(/```[\s\S]*?```|`[^`\n]*`|"(?:\\.|[^"\\])*"|(?<![A-Za-z0-9_])'(?:\\.|[^'\\])*'(?![A-Za-z0-9_])|\b(?:const|let|var)\s+[A-Za-z_$][\w$]*(?:\s*:[^=;\n]+)?(?:\s*=[^;\n]*)?;/g)].map(match=>({start:match.index,end:match.index+match[0].length}));
 const label='(?<![A-Za-z0-9_])(?:\\*\\*[A-D]\\*\\*|__[A-D]__|\\*[A-D]\\*|_[A-D]_|`[A-D]`|\\([A-D]\\)|\\[[A-D]\\]|["“\'‘][A-D]["”\'’]|[A-D])(?![A-Za-z0-9_])';
 const separator='(?:\\s*(?:,|/|&|[-–—]|\\band\\s*/\\s*or\\b|\\band\\b|\\bor\\b|\\bthrough\\b|\\bto\\b)\\s*(?:(?:and|or)\\s+)?)';
 const references=new RegExp('(\\b(?:options?|choices?|answers?)\\b\\s*(?:(?:is|are|was|were|would\\s+be|should\\s+be)\\b\\s*)?:?\\s*(?:letter\\s+)?(?:either\\s+)?)('+label+'(?:'+separator+label+')*)','gi');
 return text.replace(references,(match:string,prefix:string,sequence:string,offset:number)=>{
  if(protectedSpans.some(span=>offset>=span.start&&offset<span.end))return match;
  // An old A–C range need not remain contiguous after shuffling. Expand the
  // original IDs first, then apply the mapping once rather than cascading it.
  const expanded=sequence.replace(new RegExp('('+label+')\\s*(?:[-–—]|\\bthrough\\b|\\bto\\b)\\s*('+label+')','gi'),(range:string,from:string,to:string)=>{
   const first=from.match(/[A-D]/)?.[0],last=to.match(/[A-D]/)?.[0];if(!first||!last)return range;
   const start=first.charCodeAt(0),end=last.charCodeAt(0),step=start<=end?1:-1,letters:string[]=[];
   for(let value=start;value!==end+step;value+=step)letters.push(String.fromCharCode(value));
   return letters.join(', ');
  });
  return prefix+expanded.replace(new RegExp(label,'g'),token=>token.replace(/[A-D]/,letter=>mapping.get(letter)||letter));
 });
}
export function shuffleMCQ<T extends MCQExercise>(input:T,random:()=>number=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296):T{
 const options=input.options.map(o=>({...o})),correct=options.find(o=>o.id===input.correctOption);
 for(let i=options.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[options[i],options[j]]=[options[j],options[i]];}
 const mapping=new Map(options.map((option,index)=>[option.id,String.fromCharCode(65+index)]));
 return {...input,correctOption:String.fromCharCode(65+options.indexOf(correct!)),options:options.map((o,i)=>({...o,id:String.fromCharCode(65+i)})),answerExplanation:remapOptionReferences(input.answerExplanation,mapping),...(input.reviewPoints?{reviewPoints:input.reviewPoints.map(point=>remapOptionReferences(point,mapping))}:{})};
}
export function suggestedMCQResult(status:string,answer:string|null,rubric:unknown){
 if(status!=='submitted'||!answer||!rubric||typeof rubric!=='object'||!('mcq' in rubric))return null;
 const key=(rubric as {mcq:{correctOption:string;answerExplanation:string}}).mcq;
 if(!key||!['A','B','C','D'].includes(key.correctOption))return null;
 return {selectedOption:answer.slice(0,1),suggestedOption:key.correctOption,matchesSuggestedAnswer:answer.slice(0,1)===key.correctOption,explanation:key.answerExplanation};
}
