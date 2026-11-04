import { randomBytes,scrypt,timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
const derive=promisify(scrypt);
let busy=0;
function password(value){if(typeof value!=='string'||value.length<12||value.length>128)throw Object.assign(new Error('Use a password of 12–128 characters.'),{status:400});return value;}
async function key(value,salt){if(busy>=2)throw Object.assign(new Error('Local authentication is busy. Retry shortly.'),{status:429});busy++;try{return await derive(value,salt,32,{N:131072,r:8,p:1,maxmem:256*1024*1024});}finally{busy--;}}
export async function hashPassword(value){password(value);const salt=randomBytes(16).toString('hex');const digest=await key(value,salt);return ['scrypt','131072','8','1',salt,digest.toString('hex')].join('$');}
export async function verifyPassword(value,encoded){password(value);if(typeof encoded!=='string')return false;const parts=encoded.split('$');if(parts.length!==6||parts.slice(0,4).join('$')!=='scrypt$131072$8$1'||!parts[4].match(/^[a-f0-9]{32}$/)||!parts[5].match(/^[a-f0-9]{64}$/))return false;const digest=await key(value,parts[4]);return timingSafeEqual(digest,Buffer.from(parts[5],'hex'));}
export async function authOperation(action,input){
 if(action==='auth-hash')return {hash:await hashPassword(input.password)};
 if(action==='auth-verify')return {valid:await verifyPassword(input.password,input.hash)};
 if(action==='auth-bootstrap'){
  const location=new URL('../.sites-runtime/local-login.json',import.meta.url);
  let credentials;
  try{credentials=JSON.parse(await fs.readFile(location,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;credentials={username:'developer',password:randomBytes(18).toString('base64url'),notice:'Private local-only developer credentials. Do not commit or share.'};try{await fs.writeFile(location,JSON.stringify(credentials,null,2),{flag:'wx',mode:0o600});}catch(err){if(err.code!=='EEXIST')throw err;credentials=JSON.parse(await fs.readFile(location,'utf8'));}}
  return {username:'developer',userId:'local_seedy',hash:await hashPassword(credentials.password)};
 }
 throw Object.assign(new Error('Unknown authentication operation'),{status:404});
}

