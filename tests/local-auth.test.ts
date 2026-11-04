import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from './sqlite-d1.ts';
import { handleLocalAuth,localIdentity } from '../lib/server/local-auth.ts';
import { handleApi } from '../lib/server/index.ts';
import type { RuntimeConfig } from '../lib/contracts.ts';
const base='http://127.0.0.1:5173',pass='synthetic-pass-123';
const request=(path:string,cookie?:string)=>new Request(base+'/api/local-auth/'+path,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:'{}'});
const cryptoStub=async(action:string,input:Record<string,unknown>):Promise<Record<string,unknown>>=>action==='auth-bootstrap'?{userId:'local_seedy',username:'developer',hash:'unit-hash'}:action==='auth-hash'?{hash:'unit-hash'}:{valid:input.password===pass};
const config=(db:D1Database):RuntimeConfig=>({DB:db,LOCAL_ACCOUNTS_ENABLED:'true',PILOT_ID:'pilot',STAFF_USER_ROLES:'{"local_seedy":"owner"}'});
const cookie=(response:Response)=>response.headers.get('set-cookie')!.split(';')[0];
test('local teacher signup creates pending approval and an opaque, hashed, HttpOnly session',async()=>{
 const d=createTestDb();try{const c=config(d.db);
 const response=await handleLocalAuth(request('register'),c,{username:'teacher-test',password:pass,displayName:'Synthetic teacher',role:'teacher'},cryptoStub);
 assert.equal(response?.status,200);assert.match(response!.headers.get('set-cookie')!,/HttpOnly/);assert.match(response!.headers.get('set-cookie')!,/SameSite=Strict/);
 const identity=await localIdentity(request('session',cookie(response!)),c);assert.ok(identity);
 const profile=await d.db.prepare('SELECT application_status FROM account_profiles WHERE user_id=?').bind(identity!.userId).first<{application_status:string}>();assert.equal(profile?.application_status,'pending');
 const raw=cookie(response!).split('=')[1];
 const saved=await d.db.prepare('SELECT token_hash FROM local_auth_sessions WHERE user_id=?').bind(identity!.userId).first<{token_hash:string}>();
 assert.notEqual(saved?.token_hash,raw);assert.equal(saved?.token_hash.length,64);
 assert.equal(await localIdentity(request('session','__sites_local_auth=1'),c),null);
 }finally{d.close();}
});
test('developer self-registration is rejected and the reserved account cannot be claimed',async()=>{
 const d=createTestDb();try{const c=config(d.db);
 await assert.rejects(()=>handleLocalAuth(request('register'),c,{username:'new-dev',password:pass,displayName:'No',role:'developer'},cryptoStub),/Only User or Teacher/);
 await assert.rejects(()=>handleLocalAuth(request('register'),c,{username:'developer',password:pass,displayName:'No',role:'user'},cryptoStub),/username is unavailable/);
 const owner=await d.db.prepare("SELECT user_id FROM local_auth_users WHERE username='developer'").first<{user_id:string}>();assert.equal(owner?.user_id,'local_seedy');
 }finally{d.close();}
});
test('login rotates sessions and logout revokes the actual session',async()=>{
 const d=createTestDb();try{const c=config(d.db);
 const first=await handleLocalAuth(request('login'),c,{username:'developer',password:pass},cryptoStub);
 const second=await handleLocalAuth(request('login'),c,{username:'developer',password:pass},cryptoStub);
 assert.equal(await localIdentity(request('session',cookie(first!)),c),null);
 assert.equal((await localIdentity(request('session',cookie(second!)),c))?.userId,'local_seedy');
 await handleLocalAuth(request('logout',cookie(second!)),c,{},cryptoStub);
 assert.equal(await localIdentity(request('session',cookie(second!)),c),null);
 }finally{d.close();}
});
test('local login throttling survives retries and expired sessions do not authenticate',async()=>{
 const d=createTestDb();try{const c=config(d.db);
 for(let i=0;i<5;i++)await assert.rejects(()=>handleLocalAuth(request('login'),c,{username:'developer',password:'incorrect-password'},cryptoStub),/username or password/);
 await assert.rejects(()=>handleLocalAuth(request('login'),c,{username:'developer',password:pass},cryptoStub),/Too many attempts/);
 const registered=await handleLocalAuth(request('register'),c,{username:'student-test',password:pass,displayName:'Synthetic learner',role:'user'},cryptoStub);
 await d.db.prepare("UPDATE local_auth_sessions SET expires_at='2000-01-01T00:00:00.000Z'").run();
 assert.equal(await localIdentity(request('session',cookie(registered!)),c),null);
 }finally{d.close();}
});
test('local authentication rejects remote hosts and cross-origin mutations before writing accounts',async()=>{
 const d=createTestDb();try{const c=config(d.db);
 await assert.rejects(()=>handleLocalAuth(new Request('https://remote.test/api/local-auth/login',{method:'POST'}),c,{},cryptoStub),/only on this machine/);
 const attack=new Request(base+'/api/local-auth/register',{method:'POST',headers:{Origin:'https://other.test','Content-Type':'application/json'},body:JSON.stringify({username:'attack',password:pass,displayName:'No',role:'user'})});
 assert.equal((await handleApi(attack,c,null)).status,403);
 assert.equal((await d.db.prepare('SELECT count(*) AS n FROM local_auth_users').first<{n:number}>())?.n,0);
 }finally{d.close();}
});

