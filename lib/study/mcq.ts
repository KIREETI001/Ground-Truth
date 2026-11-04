export type MCQOption={id:string;text:string};
export type MCQExercise={format:'mcq';options:MCQOption[];correctOption:string;answerExplanation:string};
export function shuffleMCQ<T extends MCQExercise>(input:T,random:()=>number=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296):T{
 const options=input.options.map(o=>({...o})),correct=options.find(o=>o.id===input.correctOption);
 for(let i=options.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[options[i],options[j]]=[options[j],options[i]];}
 return {...input,correctOption:String.fromCharCode(65+options.indexOf(correct!)),options:options.map((o,i)=>({...o,id:String.fromCharCode(65+i)}))};
}
export function suggestedMCQResult(status:string,answer:string|null,rubric:unknown){
 if(status!=='submitted'||!answer||!rubric||typeof rubric!=='object'||!('mcq' in rubric))return null;
 const key=(rubric as {mcq:{correctOption:string;answerExplanation:string}}).mcq;
 if(!key||!['A','B','C','D'].includes(key.correctOption))return null;
 return {selectedOption:answer.slice(0,1),suggestedOption:key.correctOption,matchesSuggestedAnswer:answer.slice(0,1)===key.correctOption,explanation:key.answerExplanation};
}
