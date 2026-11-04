import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { ApiError } from '../server/http.ts';
let busy = 0;
async function key(password: unknown, salt: string) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) throw new ApiError(400,'PASSWORD_LENGTH');
  if (busy >= 2) throw new ApiError(429,'AUTHENTICATION_BUSY','Please retry shortly.');
  busy++;
  try { return await new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,32,{N:131072,r:8,p:1,maxmem:256*1024*1024},(error,result)=>error?reject(error):resolve(result))); }
  finally { busy--; }
}
export async function cloudAuthCrypto(action: string, input: Record<string,unknown>) {
  if (action === 'auth-hash') {
    const salt=randomBytes(16).toString('hex');
    return {hash:['scrypt','131072','8','1',salt,(await key(input.password,salt)).toString('hex')].join('$')};
  }
  if (action === 'auth-verify') {
    const parts=typeof input.hash==='string'?input.hash.split('$'):[];
    if (parts.length!==6 || parts.slice(0,4).join('$')!=='scrypt$131072$8$1' || !/^[a-f0-9]{32}$/.test(parts[4]) || !/^[a-f0-9]{64}$/.test(parts[5])) return {valid:false};
    return {valid:timingSafeEqual(await key(input.password,parts[4]),Buffer.from(parts[5],'hex'))};
  }
  throw new ApiError(404,'AUTH_OPERATION_UNAVAILABLE');
}
