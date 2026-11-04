import type { RuntimeConfig } from '../contracts.ts';

// Ending retains the original guided/independent state for audit, and never fabricates a submission.
export async function endAttempts(config:RuntimeConfig,user:string,target?:{projectId:string;exerciseId:string}){
 const at=new Date().toISOString(),scope=config.PILOT_ID||'groundtruth-pilot.v1';
 const eligible=target?"e.status IN ('guided','independent') AND e.project_id=? AND e.id=?":"e.status='independent'";
 const rows=await config.DB.prepare("SELECT e.id,e.project_id FROM study_exercises e JOIN study_projects p ON p.id=e.project_id WHERE p.owner_id=? AND p.pilot_id=? AND p.expires_at>? AND e.ended_at IS NULL AND "+eligible).bind(user,scope,at,...(target?[target.projectId,target.exerciseId]:[])).all<{id:string;project_id:string}>();
 if(!rows.results.length)return {ended:0};
 const status=target?"status IN ('guided','independent')":"status='independent'";
 const statements=rows.results.flatMap(e=>[
  config.DB.prepare("INSERT OR IGNORE INTO study_events(id,project_id,exercise_id,kind,detail_json,created_at) SELECT ?,project_id,id,'attempt-ended',json_object('previousStatus',status),? FROM study_exercises WHERE id=? AND ended_at IS NULL AND "+status).bind(e.id+':ended',at,e.id),
  config.DB.prepare('UPDATE study_exercises SET ended_at=? WHERE id=? AND ended_at IS NULL AND '+status).bind(at,e.id),
 ]);
 const results=await config.DB.batch(statements);
 return {ended:results.filter((_,i)=>i%2===1).reduce((sum,r)=>sum+r.meta.changes,0)};
}
