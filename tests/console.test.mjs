import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateData } from '../chatbot/js/engine.js';
const fixture=JSON.parse(await readFile(new URL('../chatbot/data/chatbot.json',import.meta.url),'utf8'));
test('서버와 브라우저는 같은 대화 검증 규칙을 사용한다',async()=>{
  assert.equal(await readFile(new URL('../chatbot/js/engine.js',import.meta.url),'utf8'),await readFile(new URL('../supabase/functions/chatbot-console/engine.js',import.meta.url),'utf8'));
});
test('관리자 입력에서 빈 답변·과도한 데이터·잘못된 단계 ID를 거절한다',()=>{
  const blank=structuredClone(fixture);blank.nodes[0].answer=' ';assert.throws(()=>validateData(blank));
  const large=structuredClone(fixture);large.nodes[0].answer='a'.repeat(8001);assert.throws(()=>validateData(large));
  const invalid=structuredClone(fixture);invalid.nodes[0].id='<script>';assert.throws(()=>validateData(invalid));
  const tooMany=structuredClone(fixture);tooMany.nodes=Array.from({length:301},(_,i)=>({...fixture.nodes[0],id:'n'+i}));assert.throws(()=>validateData(tooMany));
});
test('초안 편집은 원본 게시 스냅샷을 변경하지 않는다',()=>{
  const snapshot=JSON.stringify(fixture);const draft=structuredClone(fixture);draft.nodes[0].answer='수정된 초안';validateData(draft);assert.equal(JSON.stringify(fixture),snapshot);
});
