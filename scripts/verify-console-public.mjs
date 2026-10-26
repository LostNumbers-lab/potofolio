// Read-only checks. No administrator password or session is required or stored.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const config=JSON.parse(await readFile(new URL('../chatbot/data/console-config.json',import.meta.url),'utf8'));
const headers={apikey:config.publicKey,'Content-Type':'application/json'};
const request=(url,options={})=>fetch(url,{...options,signal:AbortSignal.timeout(20000)});
const publishedResponse=await request(config.apiUrl+'/public',{headers});
assert.equal(publishedResponse.status,200);const published=await publishedResponse.json();
assert.ok(published.config.nodes.length);assert.ok(published.version.id);
assert.ok(!JSON.stringify(published.config).includes('[게시 전 미리보기 검증용 문구]'),'Unpublished test draft must not be public');
for(const action of ['get','inquiries','save_draft','publish','versions']){
  const response=await request(config.apiUrl,{method:'POST',headers,body:JSON.stringify({action,payload:{}})});
  assert.equal(response.status,401,action+' requires a valid administrator session');
}
const forged=await request(config.apiUrl,{method:'POST',headers:{...headers,'x-admin-session':'0'.repeat(64)},body:JSON.stringify({action:'get'})});
assert.equal(forged.status,401);
const deniedOrigin=await request(config.apiUrl,{method:'POST',headers:{...headers,Origin:'https://untrusted.example'},body:JSON.stringify({action:'get'})});
assert.equal(deniedOrigin.status,403);
for(const table of ['chatbot_admin_accounts','chatbot_admin_sessions','chatbot_console_state','chatbot_published_versions']){
  const response=await request(`https://mdcouftltagqmqhvckiv.supabase.co/rest/v1/${table}?select=*`,{headers});
  assert.ok([401,403].includes(response.status),table+' must not be directly accessible with a public key');
}
console.log(`PASS: public version v${published.version.number}; unpublished draft stays private; admin routes, forged sessions and direct table access are blocked.`);
