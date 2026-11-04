import type { RuntimeConfig } from '../contracts.ts';
import { ApiError,fields,json,string } from '../server/http.ts';
import { platformRole } from '../server/access.ts';

type ClassRow={id:string;name:string;teacher_id:string;join_code:string};
const scope=(c:RuntimeConfig)=>c.PILOT_ID||'groundtruth-pilot.v1';
export async function handleClasses(request:Request,c:RuntimeConfig,user:string|null,body:Record<string,unknown>):Promise<Response|null>{
 const path=new URL(request.url).pathname;
 if(!path.startsWith('/api/study/classes'))return null;
 if(!user)throw new ApiError(401,'AUTH_REQUIRED');
 const pilot=scope(c),at=new Date().toISOString();
 if(path==='/api/study/classes'){
  if(request.method==='GET'){
   const joined=await c.DB.prepare('SELECT x.id,x.name,x.teacher_id AS teacherId,COALESCE(p.display_name,\'Teacher\') AS teacherName,e.joined_at AS joinedAt FROM class_enrollments e JOIN teacher_classes x ON x.id=e.class_id LEFT JOIN account_profiles p ON p.user_id=x.teacher_id AND p.pilot_id=x.pilot_id WHERE e.student_id=? AND x.pilot_id=? ORDER BY e.joined_at DESC').bind(user,pilot).all();
   const role=await platformRole(c,user),owned=role==='teacher'?await c.DB.prepare('SELECT x.id,x.name,x.join_code AS joinCode,(SELECT count(*) FROM class_enrollments e WHERE e.class_id=x.id) AS studentCount FROM teacher_classes x WHERE x.teacher_id=? AND x.pilot_id=? ORDER BY x.created_at DESC').bind(user,pilot).all():{results:[]};
   return json({joined:joined.results,owned:owned.results});
  }
  if(request.method!=='POST')throw new ApiError(405,'METHOD_NOT_ALLOWED');
  if(await platformRole(c,user)!=='teacher')throw new ApiError(403,'TEACHER_REQUIRED','Only approved teachers can create classes.');
  fields(body,['name']);const name=string(body.name,'name',2,80).trim();if(name.length<2)throw new ApiError(400,'CLASS_NAME_REQUIRED');
  const code=Array.from(crypto.getRandomValues(new Uint8Array(10)),b=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b%32]).join(''),id=crypto.randomUUID();
  const result=await c.DB.prepare('INSERT INTO teacher_classes(id,teacher_id,pilot_id,name,join_code,created_at) SELECT ?,?,?,?,?,? WHERE (SELECT count(*) FROM teacher_classes WHERE teacher_id=? AND pilot_id=?)<20').bind(id,user,pilot,name,code,at,user,pilot).run();
  if(!result.meta.changes)throw new ApiError(409,'CLASS_LIMIT','This teacher already has 20 classes.');
  return json({id,name,joinCode:code,studentCount:0},201);
 }
 if(path==='/api/study/classes/join'){
  if(request.method!=='POST')throw new ApiError(405,'METHOD_NOT_ALLOWED');
  fields(body,['code','confirmed']);if(body.confirmed!==true)throw new ApiError(400,'CLASS_JOIN_CONFIRMATION_REQUIRED');
  const code=string(body.code,'code',1,30).replace(/[\s-]/g,'').toUpperCase();
  const time=Date.now(),attempt=await c.DB.prepare('INSERT INTO class_join_attempts(user_id,pilot_id,window_started_at,attempts) VALUES(?,?,?,1) ON CONFLICT(user_id,pilot_id) DO UPDATE SET window_started_at=CASE WHEN window_started_at<? THEN excluded.window_started_at ELSE window_started_at END,attempts=CASE WHEN window_started_at<? THEN 1 ELSE attempts+1 END RETURNING attempts').bind(user,pilot,time,time-600000,time-600000).first<{attempts:number}>();
  if((attempt?.attempts||0)>10)throw new ApiError(429,'CLASS_JOIN_LIMIT','Too many code attempts. Try again in 10 minutes.');
  const target=await c.DB.prepare('SELECT id,name,teacher_id,join_code FROM teacher_classes WHERE join_code=? AND pilot_id=?').bind(code,pilot).first<ClassRow>();
  if(!target||await platformRole(c,target.teacher_id)!=='teacher')throw new ApiError(404,'CLASS_NOT_FOUND','That class code is not available. Check it with your teacher.');
  if(target.teacher_id===user)throw new ApiError(400,'OWN_CLASS','You already manage this class as its teacher.');
  const alreadyJoined=await c.DB.prepare('SELECT class_id FROM class_enrollments WHERE class_id=? AND student_id=?').bind(target.id,user).first();
  if(!alreadyJoined&&await c.DB.prepare('SELECT count(*) AS n FROM class_enrollments e JOIN teacher_classes x ON x.id=e.class_id WHERE e.student_id=? AND x.pilot_id=?').bind(user,pilot).first<{n:number}>().then(row=>(row?.n||0)>=20))throw new ApiError(409,'ENROLLMENT_LIMIT');
  await c.DB.prepare('INSERT OR IGNORE INTO class_enrollments(class_id,student_id,joined_at) VALUES(?,?,?)').bind(target.id,user,at).run();
  return json({id:target.id,name:target.name,teacherId:target.teacher_id,joined:true});
 }
 if(path==='/api/study/classes/leave'){
  if(request.method!=='POST')throw new ApiError(405,'METHOD_NOT_ALLOWED');fields(body,['classId']);const id=string(body.classId,'classId',1,100);
  await c.DB.prepare('DELETE FROM class_enrollments WHERE class_id=? AND student_id=? AND EXISTS(SELECT 1 FROM teacher_classes x WHERE x.id=class_id AND x.pilot_id=?)').bind(id,user,pilot).run();return json({left:true});
 }
 throw new ApiError(404,'NOT_FOUND');
}
