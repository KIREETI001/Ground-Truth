import test from 'node:test';
import assert from 'node:assert/strict';
import {hashPassword,verifyPassword} from '../scripts/local-auth-crypto.mjs';
test('local password hashes use independent salts and verify with the fixed scrypt work factor',async()=>{
 const password='Synthetic local test password 123';
 const first=await hashPassword(password),second=await hashPassword(password);
 assert.notEqual(first,second);assert.ok(first.startsWith('scrypt$131072$8$1$'));
 assert.equal(await verifyPassword(password,first),true);
 assert.equal(await verifyPassword('Different synthetic password 123',first),false);
 assert.equal(await verifyPassword(password,'invalid hash'),false);
 assert.ok(!first.includes(password));
});

