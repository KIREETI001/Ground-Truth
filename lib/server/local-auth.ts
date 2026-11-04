import type { RuntimeConfig } from '../contracts.ts';
import { ApiError,fields,json,string } from './http.ts';
import { localWorkspace } from '../study/workspace.ts';
const COOKIE='gt_local_session',LIFETIME=7*86400;
type AuthCrypto=(action:'auth-bootstrap'|'auth-hash'|'auth-verify',input:Record<string,unknown>)=>Promise<Record<string,unknown>>;
async function digest(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('');}
function rawToken(request:Request){const tokens=(request.headers.get('cookie')||'').split(';').map(v=>v.trim()).filter(v=>v.startsWith(COOKIE+'=')).map(v=>v.slice(COOKIE.length+1));return tokens.length===1&&/^[a-f0-9]{64}$/.test(tokens[0])?tokens[0]:null;}
function local(request:Request,c:RuntimeConfig){return c.LOCAL_ACCOUNTS_ENABLED==='true'&&(c.CLOUD_ENABLED==='true'||['localhost','127.0.0.1','[::1]'].includes(new URL(request.url).hostname));}
export async function localIdentity(request:Request,c:RuntimeConfig){
 if(!local(request,c))return null;
 const token=rawToken(request);if(!token)return null;
 const row=await c.DB.prepare('SELECT u.user_id,u.username,u.display_name FROM local_auth_sessions s JOIN local_auth_users u ON u.user_id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').bind(await digest(token),new Date().toISOString()).first<{user_id:string;username:string;display_name:string}>();
 return row?{userId:row.user_id,displayName:row.display_name,email:'',fullName:row.display_name}:null;
}
async function ensureDeveloper(c:RuntimeConfig,call:AuthCrypto){
 if(await c.DB.prepare("SELECT user_id FROM local_auth_users WHERE username='developer'").first())return;
 let roles:Record<string,unknown>={};try{roles=JSON.parse(c.STAFF_USER_ROLES||'{}');}catch{/* Deny. */}
 if(roles?.local_seedy!=='owner')throw new ApiError(503,'LOCAL_DEVELOPER_NOT_CONFIGURED','Configure the local developer identity before enabling local accounts.');
 const bootstrap=c.CLOUD_ENABLED==='true' ? {userId:'local_seedy',username:'developer',hash:c.DEVELOPER_PASSWORD_HASH} : await call('auth-bootstrap',{});
 if(bootstrap.userId!=='local_seedy'||bootstrap.username!=='developer'||typeof bootstrap.hash!=='string')throw new ApiError(503,'BOOTSTRAP_FAILED');
 const at=new Date().toISOString(),scope=c.PILOT_ID||'groundtruth-pilot.v1';
 await c.DB.batch([
  c.DB.prepare("INSERT OR IGNORE INTO local_auth_users(user_id,username,password_hash,display_name,created_at) VALUES('local_seedy','developer',?,'Local developer',?)").bind(bootstrap.hash,at),
  c.DB.prepare("INSERT OR IGNORE INTO platform_access(user_id,pilot_id,role,granted_by,updated_at) VALUES('local_seedy',?,'developer','local-operator-bootstrap',?)").bind(scope,at),
 ]);
}
async function limit(c:RuntimeConfig,bucket:string,cap:number){
 const at=Date.now(),cutoff=at-10*60*1000;
 const attempt=await c.DB.prepare('INSERT INTO local_auth_attempts(bucket,window_started_at,attempts) VALUES(?,?,1) ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN window_started_at<=? THEN 1 ELSE attempts+1 END,window_started_at=CASE WHEN window_started_at<=? THEN excluded.window_started_at ELSE window_started_at END RETURNING attempts').bind(bucket,at,cutoff,cutoff).first<{attempts:number}>();
 if(!attempt||attempt.attempts>cap)throw new ApiError(429,'LOGIN_RATE_LIMIT','Too many attempts. Wait ten minutes before trying again.');
}
async function session(request:Request,c:RuntimeConfig,userId:string){
 const token=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b=>b.toString(16).padStart(2,'0')).join('');
 const at=new Date().toISOString(),expires=new Date(Date.now()+LIFETIME*1000).toISOString();
 await c.DB.batch([
 c.DB.prepare('DELETE FROM local_auth_sessions WHERE user_id=? OR expires_at<=?').bind(userId,at),
 c.DB.prepare('INSERT INTO local_auth_sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)').bind(await digest(token),userId,expires,at),
 ]);
 const secure=new URL(request.url).protocol==='https:'?'; Secure':'';
 return json({authenticated:true,next:'/'},200,{'Set-Cookie':COOKIE+'='+token+'; Path=/; HttpOnly; SameSite=Strict; Max-Age='+LIFETIME+secure});
}
export async function handleLocalAuth(request:Request,c:RuntimeConfig,body:Record<string,unknown>,injected?:AuthCrypto):Promise<Response|null>{
 const path=new URL(request.url).pathname;if(!path.startsWith('/api/local-auth/'))return null;
 if(!local(request,c))throw new ApiError(403,'LOCAL_AUTH_ONLY','Local accounts are available only on this machine.');
 if(request.method!=='POST')throw new ApiError(405,'METHOD_NOT_ALLOWED');
 const call:AuthCrypto=injected||((action,input)=>localWorkspace(c,action,input));
 if(path==='/api/local-auth/logout'){
  fields(body,[]);const token=rawToken(request);if(token)await c.DB.prepare('DELETE FROM local_auth_sessions WHERE token_hash=?').bind(await digest(token)).run();
  return json({signedOut:true},200,{'Set-Cookie':COOKIE+'=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'});
 }
 if(!['/api/local-auth/login','/api/local-auth/register'].includes(path))throw new ApiError(404,'NOT_FOUND');
 const register=path.endsWith('/register');
 fields(body,register?['username','password','displayName','role']:['username','password']);
 const username=string(body.username,'username',3,40).toLowerCase();
 if(!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username))throw new ApiError(400,'USERNAME_INVALID','Use a username of 3–40 letters, numbers, dots, underscores or hyphens.');
 if(typeof body.password!=='string'||body.password.length<12||body.password.length>128)throw new ApiError(400,'PASSWORD_LENGTH','Use a password of 12–128 characters.');
 if(register&&body.role!=='user'&&body.role!=='teacher')throw new ApiError(400,'SIGNUP_ROLE_INVALID','Only User or Teacher registration is available.');
 await limit(c,register?'registration':'login:'+username,register?8:5);
 await ensureDeveloper(c,call);
 if(register){
  const displayName=string(body.displayName,'displayName',1,100),result=await call('auth-hash',{password:body.password});
  if(typeof result.hash!=='string')throw new ApiError(503,'AUTHENTICATION_UNAVAILABLE');
  const id='local_'+crypto.randomUUID(),at=new Date().toISOString();
  const saved=await c.DB.batch([
   c.DB.prepare('INSERT OR IGNORE INTO local_auth_users(user_id,username,password_hash,display_name,created_at) SELECT ?,?,?,?,? WHERE (SELECT count(*) FROM local_auth_users)<64').bind(id,username,result.hash,displayName,at),
   c.DB.prepare('INSERT INTO account_profiles(user_id,pilot_id,display_name,requested_role,application_status,created_at,updated_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM local_auth_users WHERE user_id=?)').bind(id,c.PILOT_ID||'groundtruth-pilot.v1',displayName,body.role,body.role==='teacher'?'pending':'none',at,at,id),
  ]);
  if(!saved[0].meta.changes)throw new ApiError(409,'USERNAME_UNAVAILABLE','This username is unavailable or the local account limit has been reached.');
  return session(request,c,id);
 }
 const user=await c.DB.prepare('SELECT user_id,password_hash FROM local_auth_users WHERE username=?').bind(username).first<{user_id:string;password_hash:string}>();
 const dummy=user||await c.DB.prepare("SELECT user_id,password_hash FROM local_auth_users WHERE username='developer'").first<{user_id:string;password_hash:string}>();
 const checked=await call('auth-verify',{password:body.password,hash:dummy?.password_hash});
 if(!user||checked.valid!==true)throw new ApiError(401,'LOGIN_INVALID','The username or password is incorrect.');
 return session(request,c,user.user_id);
}

