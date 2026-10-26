import { validateData } from '../js/engine.js';
import { consoleLogin, consoleRequest } from '../js/console-api.js';

const $ = selector => document.querySelector(selector);
const sessionKey = 'travel-archive-console-session';
let session, data, state, selected, saved = '', dirty = false, rawPending = false, busy = false, previewSignature = '';
let versionOffset = 0, inquiryOffset = 0;
const pageSize = 20;
const names = { editor: '대화 데이터', versions: '게시 버전', inquiries: '문의함', account: '계정 설정' };
const date = value => value ? new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '—';
const make = (tag, className, text) => { const el = document.createElement(tag); if (className) el.className = className; if (text !== undefined) el.textContent = text; return el; };
function notify(text, error = false) { $('#notice').textContent = text; $('#notice').className = 'notice ' + (error ? 'error' : 'success'); }
function showLogin(message = '') {
  sessionStorage.removeItem(sessionKey); session = undefined; data = undefined; state = undefined; dirty = false; rawPending = false;
  saved = ''; selected = undefined; previewSignature = ''; versionOffset = 0; inquiryOffset = 0;
  $('#workspace').hidden = true; $('#login-screen').hidden = false; $('#login-status').textContent = message;
  $('#node-list').replaceChildren(); $('#node-editor').replaceChildren(); $('#inquiry-list').replaceChildren(); $('#version-list').replaceChildren(); $('#raw-json').value = '';
  $('#password-form').reset(); $('#publish-form').reset(); $('#node-search').value = '';
  $('#preview-dialog').close(); $('#publish-dialog').close(); $('#preview-frame').src = 'about:blank';
}
async function action(name, payload = {}) {
  try { return await consoleRequest(name, payload, session?.token); }
  catch (error) { if (error.status === 401) showLogin('세션이 만료되었습니다. 다시 로그인해 주세요.'); throw error; }
}
async function run(task) {
  if (busy) return;
  busy = true; $('#workspace').inert = true;
  try { return await task(); } catch (error) { notify(error.message, true); }
  finally { busy = false; $('#workspace').inert = false; if (data) toolbar(); }
}
function toolbar() {
  $('#published-label').textContent = `현재 게시 v${state.published.number}`;
  $('#draft-label').textContent = rawPending ? '적용하지 않은 JSON 수정' : dirty ? '저장되지 않은 수정' : `초안 #${state.revision} 저장됨`;
  $('#save-draft').disabled = !dirty || rawPending;
  $('#publish').disabled = dirty || rawPending || previewSignature !== JSON.stringify(data);
  $('#node-count').textContent = data.nodes.length;
}
function syncRaw() { $('#raw-json').value = JSON.stringify(data, null, 2); rawPending = false; }
function changed() { dirty = JSON.stringify(data) !== saved; previewSignature = ''; syncRaw(); toolbar(); }
function populateSelect(select, value) { select.replaceChildren(); for (const node of data.nodes) { const o = make('option', '', `${node.id} · ${node.question}`); o.value = node.id; select.append(o); } select.value = value; }
function renderList() {
  const q = $('#node-search').value.trim().toLocaleLowerCase();
  const list = $('#node-list'); list.replaceChildren();
  for (const node of data.nodes.filter(n => [n.id,n.question,...n.keywords].join(' ').toLocaleLowerCase().includes(q))) {
    const button = make('button', node.id === selected ? 'selected' : ''); button.type = 'button';
    button.append(make('small', '', node.id), make('span', '', node.question));
    button.addEventListener('click', () => { if (rawPending) { notify('전체 JSON 변경을 먼저 적용해 주세요.',true); return; } selected = node.id; renderEditor(); }); list.append(button);
  }
}
function renderButtons(node, mount) {
  mount.replaceChildren();
  node.buttons.forEach((button, index) => {
    const row = make('div','button-row');
    const label = make('input'); label.value = button.label; label.maxLength = 100; label.placeholder = '버튼 문구'; label.setAttribute('aria-label', `버튼 ${index+1} 문구`);
    label.addEventListener('input', () => { button.label = label.value; changed(); });
    const type = make('select'); type.setAttribute('aria-label', `버튼 ${index+1} 동작 종류`);
    for (const [value,text] of [['next','다음 단계'],['url','페이지 이동'],['action','공통 동작']]) { const option=make('option','',text); option.value=value; type.append(option); }
    const kind = button.url !== undefined ? 'url' : button.action !== undefined ? 'action' : 'next'; type.value=kind;
    const target = make(kind === 'url' ? 'input' : 'select'); target.setAttribute('aria-label',`버튼 ${index+1} 이동 대상`);
    if (kind === 'next') populateSelect(target,button.next);
    else if (kind === 'action') { for (const [value,text] of [['home','처음으로'],['back','이전으로'],['inquiry','제작 문의']]) { const option=make('option','',text); option.value=value; target.append(option); } target.value=button.action; }
    else { target.value=button.url; target.placeholder='https://…'; }
    target.addEventListener(kind === 'url' ? 'input' : 'change', () => { button[kind]=target.value; changed(); });
    type.addEventListener('change', () => { const label=button.label; node.buttons[index]={ label, [type.value]:type.value==='next'?data.startNode:type.value==='action'?'home':'https://' }; changed(); renderButtons(node,mount); });
    const remove=make('button','','×'); remove.type='button'; remove.setAttribute('aria-label',`버튼 ${index+1} 삭제`); remove.addEventListener('click',()=>{node.buttons.splice(index,1);changed();renderButtons(node,mount);});
    row.append(label,type,target,remove);mount.append(row);
  });
}
function renderEditor() {
  if (!data.nodes.some(n=>n.id===selected)) selected=data.startNode;
  renderList();
  const node=data.nodes.find(n=>n.id===selected); const editor=$('#node-editor');
  editor.innerHTML='<div class="node-header"><span class="node-id"></span><button type="button" class="remove-node">이 단계 삭제</button></div><label>예상 질문<input class="question" maxlength="300"></label><label>답변<textarea class="answer" maxlength="8000"></textarea></label><label>키워드<input class="keywords" placeholder="쉼표로 구분해서 입력"></label><div class="button-heading"><h3>다음 선택지 · 버튼</h3><button type="button" class="add-button">＋ 버튼 추가</button></div><div class="button-list"></div><p class="muted">버튼을 통해 다음 단계, 관련 페이지 또는 제작 문의 창으로 연결할 수 있습니다.</p>';
  editor.querySelector('.node-id').textContent=`단계 ID · ${node.id}`;
  editor.querySelector('.question').value=node.question; editor.querySelector('.answer').value=node.answer; editor.querySelector('.keywords').value=node.keywords.join(', ');
  editor.querySelector('.question').addEventListener('input',event=>{node.question=event.target.value;changed();renderList();});
  editor.querySelector('.answer').addEventListener('input',event=>{node.answer=event.target.value;changed();});
  editor.querySelector('.keywords').addEventListener('input',event=>{node.keywords=event.target.value.split(',').map(v=>v.trim()).filter(Boolean);changed();});
  const remove=editor.querySelector('.remove-node'); remove.disabled=[data.startNode,data.fallbackNode].includes(node.id);
  remove.addEventListener('click',()=>{
    if (data.nodes.some(n=>n.id!==node.id&&n.buttons.some(b=>b.next===node.id))) {notify('다른 단계에서 연결 중입니다. 연결 버튼을 먼저 수정해 주세요.',true);return;}
    if (!confirm('이 단계를 초안에서 삭제할까요? 공개 웹에는 아직 반영되지 않습니다.')) return;
    data.nodes=data.nodes.filter(n=>n.id!==node.id);selected=data.startNode;changed();renderEditor();
  });
  const mount=editor.querySelector('.button-list'); renderButtons(node,mount);
  editor.querySelector('.add-button').addEventListener('click',()=>{if(node.buttons.length>=30){notify('버튼은 단계마다 최대 30개입니다.',true);return;}node.buttons.push({label:'새 선택지',next:data.startNode});changed();renderButtons(node,mount);});
  populateSelect($('#start-node'),data.startNode);populateSelect($('#fallback-node'),data.fallbackNode); toolbar();
}
function acceptDraft(next, revision) { data=structuredClone(next);validateData(data);state.revision=revision;saved=JSON.stringify(data);dirty=false;rawPending=false;previewSignature='';syncRaw();renderEditor(); }
async function loadDraft() { const fresh=await action('get');state=fresh;selected=selected||fresh.draft.startNode;acceptDraft(fresh.draft,fresh.revision); }
async function showWorkspace() {
  await loadDraft(); $('#login-screen').hidden=true;$('#workspace').hidden=false;$('#admin-user').textContent=state.username;$('#login-form').reset();$('#notice').textContent=''; await switchTab('editor');
}
async function switchTab(tab) {
  for(const key of Object.keys(names)){ $(`#${key}-view`).hidden=key!==tab; document.querySelector(`[data-tab="${key}"]`).classList.toggle('active',key===tab); }
  $('#page-title').textContent=names[tab];
  if(tab==='versions')await loadVersions();if(tab==='inquiries')await loadInquiries();
}
function pagination(kind,total,offset) { $(`#${kind}-prev`).disabled=offset===0;$(`#${kind}-next`).disabled=offset+pageSize>=total;$(`#${kind}-page`).textContent=total?`${offset+1}–${Math.min(offset+pageSize,total)} / ${total}건`:'0건'; }
async function loadVersions() {
  const result=await action('versions',{offset:versionOffset,limit:pageSize});const mount=$('#version-list');mount.replaceChildren();
  for(const item of result.items){
    const row=make('article','version-card'),copy=make('div'),heading=make('h3');heading.append(make('span','badge',`v${item.version_number}`),document.createTextNode(item.title));
    if(item.id===result.activeId)heading.append(make('span','badge','현재 게시'));
    copy.append(heading,make('p','',`${date(item.created_at)} · ${item.created_by} · 질문 ${item.node_count}개${item.restored_from?' · 이전 버전 복원본':''}`));
    const restore=make('button','','초안으로 불러오기');restore.addEventListener('click',()=>run(async()=>{
      if((dirty||rawPending)&&!confirm('현재 저장하지 않은 수정을 버리고 선택한 버전을 초안으로 불러올까요?'))return;
      const draft=await action('restore',{versionId:item.id,expectedRevision:state.revision});acceptDraft(draft.draft,draft.revision);await switchTab('editor');notify(`v${item.version_number}을 초안으로 불러왔습니다. 미리보기 후 최종 게시를 눌러야 웹에 반영됩니다.`);
    }));row.append(copy,restore);mount.append(row);
  }
  if(!result.items.length)mount.append(make('p','empty','게시 이력이 없습니다.'));pagination('versions',result.total,versionOffset);
}
async function loadInquiries() {
  const result=await action('inquiries',{offset:inquiryOffset,limit:pageSize});const mount=$('#inquiry-list');mount.replaceChildren();
  for(const item of result.items){
    const card=make('details','inquiry-card');const summary=make('summary');summary.append(make('span','',item.title),make('span','badge',({pending:'접수',in_progress:'확인 중',completed:'완료'})[item.status]||item.status));
    card.append(summary,make('p','inquiry-meta',`${date(item.created_at)} · ${item.author_name} · ${item.contact||'연락처 없음'}`),make('div','inquiry-content',item.content));
    const form=make('form');form.innerHTML='<label>문의 상태<select name="status"><option value="pending">접수</option><option value="in_progress">확인 중</option><option value="completed">완료</option></select></label><label>관리자 답변 메모<textarea name="reply" maxlength="10000"></textarea></label><p class="muted">메모는 관리자 기록으로 저장됩니다. 이메일은 자동 발송되지 않습니다.</p><button type="submit">상태·메모 저장</button>';
    form.elements.status.value=item.status;form.elements.reply.value=item.admin_reply||'';
    form.addEventListener('submit',event=>{event.preventDefault();run(async()=>{await action('update_inquiry',{id:item.id,status:form.elements.status.value,reply:form.elements.reply.value});await loadInquiries();notify('문의 상태와 관리자 메모를 저장했습니다.');});});card.append(form);mount.append(card);
  }
  if(!result.items.length)mount.append(make('p','empty','아직 접수된 제작 문의가 없습니다.'));pagination('inquiries',result.total,inquiryOffset);
}
$('#login-form').addEventListener('submit',async event=>{
  event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;$('#login-status').textContent='로그인 확인 중…';
  try{const values=Object.fromEntries(new FormData(event.target));session=await consoleLogin(values.username,values.password);sessionStorage.setItem(sessionKey,JSON.stringify(session));await showWorkspace();}
  catch(error){showLogin(error.message);}finally{button.disabled=false;}
});
document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>run(()=>switchTab(button.dataset.tab))));
$('#node-search').addEventListener('input',renderList);
$('#add-node').addEventListener('click',()=>{if(rawPending){notify('전체 JSON을 먼저 적용해 주세요.',true);return;}if(data.nodes.length>=300){notify('단계는 최대 300개입니다.',true);return;}const node={id:`q-${Date.now()}`,question:'새 질문',answer:'답변을 입력해 주세요.',keywords:[],buttons:[]};data.nodes.push(node);selected=node.id;changed();renderEditor();});
$('#start-node').addEventListener('change',event=>{data.startNode=event.target.value;changed();renderEditor();});
$('#fallback-node').addEventListener('change',event=>{data.fallbackNode=event.target.value;changed();renderEditor();});
$('#raw-json').addEventListener('input',()=>{rawPending=true;previewSignature='';toolbar();});
$('#sync-json').addEventListener('click',()=>{if(rawPending&&!confirm('적용하지 않은 JSON 수정을 현재 편집 내용으로 바꿀까요?'))return;syncRaw();toolbar();});
$('#apply-json').addEventListener('click',()=>{try{const next=JSON.parse($('#raw-json').value);validateData(next);data=next;changed();renderEditor();notify('JSON을 로컬 편집기에 적용했습니다. 초안 저장과 최종 게시가 별도로 필요합니다.');}catch(error){notify(error.message,true);}});
$('#download-json').addEventListener('click',()=>{try{validateData(data);const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=make('a');a.href=url;a.download='chatbot-draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(error){notify(error.message,true);}});
$('#save-draft').addEventListener('click',()=>run(async()=>{
  if(rawPending)throw new Error('전체 JSON 변경을 먼저 적용해 주세요.');validateData(data);const snapshot=structuredClone(data);snapshot.updatedAt=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'});
  const result=await action('save_draft',{config:snapshot,expectedRevision:state.revision});acceptDraft(snapshot,result.revision);notify('초안을 저장했습니다. 공개 웹은 바뀌지 않았습니다. 미리보기 후 최종 게시를 눌러 주세요.');
}));
$('#reload-draft').addEventListener('click',()=>run(async()=>{if((dirty||rawPending)&&!confirm('저장하지 않은 수정을 버리고 최신 초안을 불러올까요?'))return;await loadDraft();notify('서버의 최신 초안을 불러왔습니다.');}));
$('#preview').addEventListener('click',()=>{try{if(rawPending)throw new Error('전체 JSON 변경을 먼저 적용해 주세요.');validateData(data);previewSignature=JSON.stringify(data);$('#preview-dialog').showModal();$('#preview-frame').src='../index.html?embed=1&preview=1';toolbar();}catch(error){notify(error.message,true);}});
window.addEventListener('message',event=>{if(!session||!data||event.origin!==location.origin||event.source!==$('#preview-frame').contentWindow)return;if(event.data?.type==='travel-preview-ready')$('#preview-frame').contentWindow.postMessage({type:'travel-preview-config',config:structuredClone(data)},location.origin);if(event.data?.type==='travel-chatbot-close')$('#preview-dialog').close();});
$('#close-preview').addEventListener('click',()=>$('#preview-dialog').close());
$('#publish').addEventListener('click',()=>{if(dirty||rawPending||previewSignature!==JSON.stringify(data)){notify('초안 저장과 미리보기를 완료한 후 게시해 주세요.',true);return;}$('#publish-summary').textContent=`초안 #${state.revision} · 질문 ${data.nodes.length}개 · 새 버전으로 공개됩니다.`;$('#publish-dialog').showModal();});
$('#cancel-publish').addEventListener('click',()=>$('#publish-dialog').close());
$('#publish-form').addEventListener('submit',async event=>{
  event.preventDefault();const button=event.target.querySelector('[type="submit"]');if(busy)return;button.disabled=true;
  await run(async()=>{if(dirty||rawPending||previewSignature!==JSON.stringify(data))throw new Error('저장된 미리보기 내용과 다릅니다. 다시 확인해 주세요.');const result=await action('publish',{expectedRevision:state.revision,title:event.target.elements.title.value});state.published=result;$('#publish-dialog').close();event.target.reset();previewSignature='';toolbar();notify(`v${result.number} 게시를 완료했습니다. 새로 열거나 새로고침한 챗봇에 적용됩니다.`);});button.disabled=false;
});
for(const kind of ['versions','inquiries']){
  $(`#refresh-${kind}`).addEventListener('click',()=>run(kind==='versions'?loadVersions:loadInquiries));
  $(`#${kind}-prev`).addEventListener('click',()=>run(async()=>{if(kind==='versions'){versionOffset=Math.max(0,versionOffset-pageSize);await loadVersions();}else{inquiryOffset=Math.max(0,inquiryOffset-pageSize);await loadInquiries();}}));
  $(`#${kind}-next`).addEventListener('click',()=>run(async()=>{if(kind==='versions'){versionOffset+=pageSize;await loadVersions();}else{inquiryOffset+=pageSize;await loadInquiries();}}));
}
$('#password-form').addEventListener('submit',event=>{event.preventDefault();run(async()=>{const values=Object.fromEntries(new FormData(event.target));if(values.newPassword!==values.confirmation)throw new Error('새 비밀번호 확인이 일치하지 않습니다.');await action('password',{currentPassword:values.currentPassword,newPassword:values.newPassword});event.target.reset();showLogin('비밀번호를 변경했습니다. 새 비밀번호로 다시 로그인해 주세요.');});});
$('#logout').addEventListener('click',()=>run(async()=>{if((dirty||rawPending)&&!confirm('저장하지 않은 수정을 버리고 로그아웃할까요?'))return;try{await action('logout');}finally{showLogin('로그아웃했습니다.');}}));
window.addEventListener('beforeunload',event=>{if(dirty||rawPending){event.preventDefault();event.returnValue='';}});
try{session=JSON.parse(sessionStorage.getItem(sessionKey)||'null');if(session&&new Date(session.expiresAt)>new Date())await showWorkspace();else showLogin();}catch(error){showLogin(error.status===401?'다시 로그인해 주세요.':error.message);}
