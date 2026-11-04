import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from './sqlite-d1.ts';
import { handleLocalAuth, localIdentity } from '../lib/server/local-auth.ts';
import { handleApi } from '../lib/server/index.ts';
import { cloudAuthCrypto } from '../lib/cloud/auth-crypto.ts';
import { localWorkspace } from '../lib/study/workspace.ts';
import type { RuntimeConfig } from '../lib/contracts.ts';

const origin='https://groundtruth-demo.vercel.app',password='Synthetic cloud password 123';
const request=(path:string,cookie?:string,body:unknown={})=>new Request(origin+'/api/local-auth/'+path,{
 method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body),
});
const config=(db:D1Database):RuntimeConfig=>({DB:db,CLOUD_ENABLED:'true',LOCAL_ACCOUNTS_ENABLED:'true',PILOT_ID:'cloud-auth',STAFF_USER_ROLES:'{"local_seedy":"owner"}',DEVELOPER_PASSWORD_HASH:'synthetic-operator-hash'});
const cryptoStub=async(action:string,input:Record<string,unknown>):Promise<Record<string,unknown>>=>{
 assert.notEqual(action,'auth-bootstrap','Cloud bootstrap must use its configured hash, without the laptop companion.');
 return action==='auth-hash'?{hash:'synthetic-hash'}:{valid:input.password===password};
};
const cookie=(response:Response)=>response.headers.get('set-cookie')!.split(';')[0];

test('remote authentication is enabled only by explicit cloud and accounts flags',async()=>{
 const d=createTestDb();try{
  const c=config(d.db);
  for(const denied of [{...c,CLOUD_ENABLED:undefined},{...c,CLOUD_ENABLED:'false'},{...c,LOCAL_ACCOUNTS_ENABLED:'false'}]){
   await assert.rejects(()=>handleLocalAuth(request('login'),denied,{username:'developer',password},cryptoStub),/only on this machine/);
   assert.equal(await localIdentity(request('session'),denied),null);
  }
  await assert.rejects(()=>handleLocalAuth(request('login'),{...c,DEVELOPER_PASSWORD_HASH:undefined},{username:'developer',password},cryptoStub),/BOOTSTRAP_FAILED/);
  assert.equal((await d.db.prepare('SELECT count(*) AS n FROM local_auth_users').first<{n:number}>())?.n,0);
 }finally{d.close();}
});

test('cloud signup keeps teacher approval pending and uses secure opaque sessions with rotation and revocation',async()=>{
 const d=createTestDb();try{
  const c=config(d.db),signup={username:'cloud-teacher',password,displayName:'Synthetic teacher',role:'teacher'};
  const created=await handleLocalAuth(request('register'),c,signup,cryptoStub);assert.ok(created);
  const header=created.headers.get('set-cookie')!;
  assert.match(header,/; Secure(?:;|$)/);assert.match(header,/HttpOnly/);assert.match(header,/SameSite=Strict/);
  const token=cookie(created),identity=await localIdentity(request('session',token),c);assert.ok(identity);
  const saved=await d.db.prepare('SELECT token_hash FROM local_auth_sessions WHERE user_id=?').bind(identity.userId).first<{token_hash:string}>();
  assert.ok(saved);assert.equal(saved.token_hash.length,64);assert.notEqual(saved.token_hash,token.split('=')[1]);
  const profile=await d.db.prepare('SELECT application_status FROM account_profiles WHERE user_id=?').bind(identity.userId).first<{application_status:string}>();
  assert.equal(profile?.application_status,'pending');
  assert.equal(await localIdentity(request('session',token+'; '+token),c),null);
  assert.equal(await localIdentity(request('session',token),{...c,CLOUD_ENABLED:'false'}),null);
  await assert.rejects(()=>handleLocalAuth(request('register'),c,{...signup,username:'cloud-dev',role:'developer'},cryptoStub),/Only User or Teacher/);
  const signedIn=await handleLocalAuth(request('login'),c,{username:signup.username,password},cryptoStub);assert.ok(signedIn);
  assert.equal(await localIdentity(request('session',token),c),null);
  assert.ok(await localIdentity(request('session',cookie(signedIn)),c));
  await handleLocalAuth(request('logout',cookie(signedIn)),c,{},cryptoStub);
  assert.equal(await localIdentity(request('session',cookie(signedIn)),c),null);
 }finally{d.close();}
});

test('cloud API retains origin checks before creating profiles or accounts',async()=>{
 const d=createTestDb();try{
  const attack=new Request(origin+'/api/local-auth/register',{method:'POST',headers:{Origin:'https://attacker.test','Content-Type':'application/json'},body:JSON.stringify({username:'cloud-attack',password,displayName:'No',role:'user'})});
  assert.equal((await handleApi(attack,config(d.db),null)).status,403);
  assert.equal((await d.db.prepare('SELECT count(*) AS n FROM local_auth_users').first<{n:number}>())?.n,0);
 }finally{d.close();}
});

test('cloud password operations use the in-process fixed scrypt contract with no companion bootstrap',async()=>{
 const c={DB:null as unknown as D1Database,CLOUD_ENABLED:'true'};
 const first=await localWorkspace<{hash:string}>(c,'auth-hash',{password});
 assert.match(first.hash,/^scrypt\$131072\$8\$1\$[a-f0-9]{32}\$[a-f0-9]{64}$/);
 assert.equal((await cloudAuthCrypto('auth-verify',{password,hash:first.hash})).valid,true);
 assert.equal((await cloudAuthCrypto('auth-verify',{password:'A different password 123',hash:first.hash})).valid,false);
 assert.equal((await cloudAuthCrypto('auth-verify',{password,hash:'scrypt$1$8$1$bad$bad'})).valid,false);
 await assert.rejects(()=>cloudAuthCrypto('auth-hash',{password:'too-short'}),/PASSWORD_LENGTH/);
 await assert.rejects(()=>cloudAuthCrypto('auth-bootstrap',{}),/AUTH_OPERATION_UNAVAILABLE/);
});
