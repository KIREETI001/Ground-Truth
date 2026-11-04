import { z } from 'zod';
import type { ProjectTree } from '../discovery/types.ts';
import type { ProjectSnapshot } from '../learner/types.ts';

import { areas } from './repository-types.ts';
export { areas,areaNames } from './repository-types.ts';
export type { RepositoryMap,RepositoryFeature,LearningPath } from './repository-types.ts';
export const featureSchema=z.object({id:z.string().regex(/^[a-z0-9-]{1,32}$/),area:z.enum(areas),title:z.string().min(1).max(80),summary:z.string().min(1).max(300),concepts:z.array(z.string().min(1).max(60)).min(2).max(4),filePaths:z.array(z.string().min(1).max(200)).min(1).max(3)}).strict();
export const repositoryMapSchema=z.object({summary:z.string().min(1).max(600),features:z.array(featureSchema).min(1).max(6)}).strict();

export function classifyPath(path:string):typeof areas[number]{
 const p=path.toLowerCase();
 if(/(?:^|\/)(?:__tests__|tests?|specs?)(?:\/|\.)|\.(?:test|spec)\./.test(p))return 'testing';
 if(/\.sql$|(?:^|\/)(?:db|database|drizzle|migrations?|schemas?|models?)(?:\/|\.)/.test(p))return 'data';
 if(/(?:^|\/)(?:server|api|routes?|controllers?|services?|middleware|auth|backend|workers?)(?:\/|\.)|(?:^|\/)(?:manage|wsgi|asgi)\.py$/.test(p))return 'backend';
 if(/\.(?:tsx|jsx|vue|svelte|html|css)$|(?:^|\/)(?:components?|pages?|views?|hooks|frontend|ui)(?:\/|\.)/.test(p))return 'frontend';
 if(/(?:^|\/)(?:scripts?|tools?|config)(?:\/|\.)|config\.[cm]?[jt]s$/.test(p))return 'tooling';
 return 'core';
}
// Balance the bounded catalogue across areas rather than letting alphabetic UI paths hide the backend.
export function repositoryCatalogue(tree:ProjectTree){
 const groups=areas.map(area=>tree.files.filter(f=>classifyPath(f.path)===area).sort((a,b)=>a.path.split('/').length-b.path.split('/').length||a.size-b.size||a.path.localeCompare(b.path)));
 const files:ProjectTree['files']=[];let characters=0;
 for(let i=0;files.length<48&&groups.some(g=>i<g.length);i++)for(const group of groups){const file=group[i];if(file&&characters+file.path.length<6500){files.push(file);characters+=file.path.length;}if(files.length===48)break;}
 return files;
}
export function representativePaths(files:ProjectTree['files']){
 const selected:typeof files=[];
 for(const area of areas){const candidate=files.find(f=>classifyPath(f.path)===area);if(candidate&&selected.length<3)selected.push(candidate);}
 for(const file of files)if(selected.length<3&&!selected.includes(file))selected.push(file);
 return selected.map(f=>f.path);
}
export function mapSnapshot(tree:ProjectTree,sample:ProjectSnapshot,catalogue:ProjectTree['files']):ProjectSnapshot{
 return {...sample,repository:tree.repository,url:tree.url,commit:tree.commit,files:catalogue.map(f=>({path:f.path,language:f.language,excerpt:sample.files.find(s=>s.path===f.path)?.excerpt||''}))};
}
export function validateRepositoryMap(value:unknown,snapshot:ProjectSnapshot){
 const parsed=repositoryMapSchema.parse(value),map={...parsed,features:parsed.features.map(f=>({...f,filePaths:[...new Set(f.filePaths)]}))},ids=new Set<string>(),paths=new Set(snapshot.files.map(f=>f.path));
 for(const feature of map.features){
  if(ids.has(feature.id))throw new Error('Repository map has duplicate features: '+feature.id);
  if(feature.filePaths.some(p=>!paths.has(p)))throw new Error('Repository map has unknown workflow source: '+feature.filePaths.filter(p=>!paths.has(p)).join(', ').slice(0,180));
  ids.add(feature.id);
 }
 return map;
}
export const repositoryMapJsonSchema={type:'object',properties:{summary:{type:'string',minLength:1,maxLength:600},features:{type:'array',minItems:1,maxItems:6,items:{type:'object',properties:{id:{type:'string',pattern:'^[a-z0-9-]{1,32}$'},area:{enum:areas},title:{type:'string',minLength:1,maxLength:80},summary:{type:'string',minLength:1,maxLength:300},concepts:{type:'array',minItems:2,maxItems:4,items:{type:'string',minLength:1,maxLength:60}},filePaths:{type:'array',minItems:1,maxItems:3,items:{type:'string',minLength:1,maxLength:200}}},required:['id','area','title','summary','concepts','filePaths'],additionalProperties:false}}},required:['summary','features'],additionalProperties:false};
