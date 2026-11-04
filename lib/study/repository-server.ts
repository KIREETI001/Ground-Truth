import type { RuntimeConfig } from '../contracts.ts';
import type { DiscoveryFetcher } from '../discovery/types.ts';
import { projectTree,analyseProject } from '../discovery/github.ts';
import { cloudGitHubFetcher } from '../cloud/github-fetch.ts';
import { ApiError,fields,string } from '../server/http.ts';
import { generateStudy,type StudyGenerator } from './model.ts';
import { localRepositoryTree,localRepositorySnapshot } from './local-repository.ts';
import { repositoryCatalogue,representativePaths,mapSnapshot,validateRepositoryMap,type RepositoryMap,type LearningPath } from './repository.ts';

export async function createRepositoryMap(c:RuntimeConfig,user:string,body:Record<string,unknown>,isIndependent:()=>Promise<boolean>,generator?:StudyGenerator,fetcher?:DiscoveryFetcher):Promise<RepositoryMap>{
 fields(body,['url','ref','acknowledged']);
 if(body.acknowledged!==true)throw new ApiError(400,'SOURCE_CONSENT_REQUIRED');
 if(await isIndependent())throw new ApiError(403,'INDEPENDENT_MODE','Finish your independent answer before mapping another repository.');
 const at=new Date().toISOString();
 const count=await c.DB.prepare('SELECT count(*) AS n FROM study_repository_maps WHERE owner_id=? AND expires_at>?').bind(user,at).first<{n:number}>();
 if((count?.n||0)>=6)throw new ApiError(429,'REPOSITORY_MAP_LIMIT','Six repository maps are already available. Reuse a map or retry after its 24-hour expiry.');
 const network=cloudGitHubFetcher(c,fetcher),useLocal=!!c.LOCAL_WORKSPACE_TOKEN&&!fetcher;
 const tree=useLocal?await localRepositoryTree(c,body.url,body.ref):await projectTree({url:body.url,ref:body.ref},network),catalogue=repositoryCatalogue(tree);
 if(!catalogue.length)throw new ApiError(422,'NO_SUPPORTED_WORKFLOWS','No readable source was found within the prototype limits. Try a smaller public repository.');
 const sample=useLocal?await localRepositorySnapshot(c,tree,representativePaths(catalogue)):await analyseProject({url:tree.url,commit:tree.commit,paths:representativePaths(catalogue)},network);
 const snapshot=mapSnapshot(tree,sample,catalogue);
 const data={catalogue:catalogue.map(f=>({path:f.path,language:f.language})),sampledPaths:sample.files.map(f=>f.path),scope:'Partial file-structure catalogue plus representative source. Unseen workflows are suggestions, not verified functionality.'};
 if(await isIndependent())throw new ApiError(403,'INDEPENDENT_MODE');
 const output=generator?await generator('repository',data,snapshot):await generateStudy(c,user,'repository',data,snapshot);
 const generated=validateRepositoryMap(output,snapshot);
 if(await isIndependent())throw new ApiError(409,'EXERCISE_STATE_CHANGED','The activity became independent; the generated map was discarded.');
 // Keep each automatically chosen workflow inside the source importer budget.
 const features=generated.features.map(feature=>{let bytes=0;return {...feature,filePaths:feature.filePaths.filter(path=>{const size=catalogue.find(f=>f.path===path)!.size;if(bytes+size>32768)return false;bytes+=size;return true;})};});
 const map:RepositoryMap={id:crypto.randomUUID(),repository:tree.repository,url:tree.url,commit:tree.commit,summary:generated.summary,features,sampledPaths:sample.files.map(f=>f.path),catalogueCount:catalogue.length,listedCount:tree.files.length,expiresAt:new Date(Date.now()+86400000).toISOString(),warnings:[...tree.warnings,'Learning areas are inferred from a bounded file catalogue and a small source sample, not a complete repository analysis.',...(catalogue.length<tree.files.length?['The learning map uses a balanced subset of the supported file listing.']:[])]};
 await c.DB.prepare('INSERT INTO study_repository_maps(id,owner_id,pilot_id,map_json,created_at,expires_at) VALUES(?,?,?,?,?,?)').bind(map.id,user,c.PILOT_ID||'groundtruth-pilot.v1',JSON.stringify(map),at,map.expiresAt).run();
 return map;
}

export async function focusedRepository(c:RuntimeConfig,user:string,body:Record<string,unknown>,fetcher?:DiscoveryFetcher){
 fields(body,['mapId','featureId','purpose','goal','transferGoal','acknowledged']);
 if(body.acknowledged!==true)throw new ApiError(400,'SOURCE_CONSENT_REQUIRED');
 if(body.purpose!=='improve'&&body.purpose!=='transfer')throw new ApiError(400,'LEARNING_PURPOSE_INVALID');
 const mapId=string(body.mapId,'mapId',1,100),featureId=string(body.featureId,'featureId',1,32);
 const saved=await c.DB.prepare('SELECT map_json FROM study_repository_maps WHERE id=? AND owner_id=? AND pilot_id=? AND expires_at>?').bind(mapId,user,c.PILOT_ID||'groundtruth-pilot.v1',new Date().toISOString()).first<{map_json:string}>();
 if(!saved)throw new ApiError(404,'REPOSITORY_MAP_NOT_FOUND','Reopen or regenerate your repository map; it is private and expires after 24 hours.');
 const map=JSON.parse(saved.map_json) as RepositoryMap,feature=map.features.find(f=>f.id===featureId);
 if(!feature)throw new ApiError(400,'WORKFLOW_NOT_IN_MAP');
 const transferGoal=body.purpose==='transfer'?string(body.transferGoal,'transferGoal',8,600):'';
 const goal=body.goal===undefined||body.goal===''?(`Understand ${feature.title}${transferGoal?' and adapt its concepts to: '+transferGoal:' so I can improve this workflow independently.'}`).slice(0,600):string(body.goal,'goal',8,600);
 const learningPath:LearningPath={purpose:body.purpose,area:feature.area,featureTitle:feature.title,concepts:feature.concepts,transferGoal,mapId};
 const snapshot=c.LOCAL_WORKSPACE_TOKEN&&!fetcher?await localRepositorySnapshot(c,map,feature.filePaths):await analyseProject({url:map.url,commit:map.commit,paths:feature.filePaths},cloudGitHubFetcher(c,fetcher));
 return {snapshot,learningPath,goal};
}
export async function loadLearningPath(c:RuntimeConfig,projectId:string):Promise<LearningPath|null>{
 const row=await c.DB.prepare('SELECT purpose,area,feature_title,concepts_json,transfer_goal,map_id FROM study_learning_paths WHERE project_id=?').bind(projectId).first<{purpose:'improve'|'transfer';area:string;feature_title:string;concepts_json:string;transfer_goal:string;map_id:string}>();
 return row?{purpose:row.purpose,area:row.area,featureTitle:row.feature_title,concepts:JSON.parse(row.concepts_json),transferGoal:row.transfer_goal,mapId:row.map_id}:null;
}
