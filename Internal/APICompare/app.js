/* ================================================================
   API COMPARATOR — app.js  v3
   Per-card imports | Postman-style Auth | Send | Deep Diff | Report
   ================================================================ */
'use strict';

// ── DOM helpers ────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const qs = s => document.querySelector(s);
const qsa = s => [...document.querySelectorAll(s)];

function showToast(msg, type = 'info', ms = 3200) {
  const t = document.createElement('div');
  t.className = `toast ${type}`; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function safeJson(s) { try { return JSON.parse(s); } catch { return null; } }
function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n/1024).toFixed(1)} KB`;
  return `${(n/1048576).toFixed(2)} MB`;
}
function statusClass(c) {
  if (!c) return 'status-err';
  if (c >= 200 && c < 300) return 'status-2xx';
  if (c >= 400 && c < 500) return 'status-4xx';
  return 'status-5xx';
}
function truncate(s, n) { return s.length > n ? s.slice(0,n)+'…' : s; }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function tryPrettyJson(s) { const j=safeJson(s); return j?JSON.stringify(j,null,2):(s||'(empty)'); }
function formatHeaders(h) { return Object.entries(h||{}).map(([k,v])=>`${k}: ${v}`).join('\n')||'(none)'; }

// ── Outer Tab Switching ────────────────────────────────────────────
qsa('.tab').forEach(tab => tab.addEventListener('click', () => {
  qsa('.tab').forEach(t=>t.classList.remove('active'));
  qsa('.tab-panel').forEach(p=>p.classList.add('hidden'));
  tab.classList.add('active');
  $(`tab-${tab.dataset.tab}`).classList.remove('hidden');
}));
function switchTab(name) {
  qsa('.tab').forEach(t=>t.classList.toggle('active', t.dataset.tab===name));
  qsa('.tab-panel').forEach(p=>p.classList.add('hidden'));
  $(`tab-${name}`).classList.remove('hidden');
}

// ── Inner Tabs (Request | Authorization | Console) ──────────────────
qsa('.inner-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const api = tab.dataset.api;
    const panel = tab.dataset.panel;
    qsa(`.inner-tab[data-api="${api}"]`).forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    [`api${api}-panel-request`, `api${api}-panel-auth`, `api${api}-panel-console`].forEach(id => {
      const el = $(id);
      if (el) el.classList.toggle('hidden', !id.endsWith(panel));
    });
  });
});

function logToConsole(n, msg, type = 'system') {
  const con = $(`api${n}Console`);
  if (!con) return;
  const line = document.createElement('div');
  line.className = `log-line ${type}`;
  line.textContent = msg;
  con.appendChild(line);
  con.scrollTop = con.scrollHeight;
}
qsa('.btn-console-clear').forEach(btn => {
  btn.addEventListener('click', () => {
    const con = $(`api${btn.dataset.api}Console`);
    if (con) con.innerHTML = '<div class="log-line system">Console cleared.</div>';
  });
});

// ── KV List Helpers ────────────────────────────────────────────────
function addKvRow(listId, key='', val='') {
  const list=$(listId);
  const row=document.createElement('div'); row.className='kv-row';
  row.innerHTML=`<input class="kv-key" placeholder="Key" value="${escHtml(key)}"/>
    <input class="kv-val" placeholder="Value" value="${escHtml(val)}"/>
    <button class="kv-del">✕</button>`;
  row.querySelector('.kv-del').addEventListener('click',()=>row.remove());
  list.appendChild(row);
}
function getKvPairs(listId) {
  const r={};
  qsa(`#${listId} .kv-row`).forEach(row=>{
    const k=row.querySelector('.kv-key').value.trim();
    const v=row.querySelector('.kv-val').value.trim();
    if(k) r[k]=v;
  });
  return r;
}
qsa('.add-kv-btn').forEach(btn=>btn.addEventListener('click',()=>addKvRow(btn.dataset.target)));
qsa('.kv-del').forEach(btn=>btn.addEventListener('click',()=>btn.closest('.kv-row').remove()));

// ── Auth Header Inject ─────────────────────────────────────────────
function injectHeader(sfx, key, val) {
  const rows = qsa(`#${sfx}Headers .kv-row`);
  for (const row of rows) {
    if (row.querySelector('.kv-key').value.trim().toLowerCase() === key.toLowerCase()) {
      row.querySelector('.kv-val').value = val; return;
    }
  }
  addKvRow(`${sfx}Headers`, key, val);
}
function injectQueryParam(sfx, key, val) {
  const rows = qsa(`#${sfx}Params .kv-row`);
  for (const row of rows) {
    if (row.querySelector('.kv-key').value.trim() === key) {
      row.querySelector('.kv-val').value = val; return;
    }
  }
  addKvRow(`${sfx}Params`, key, val);
}

// ── Reset ──────────────────────────────────────────────────────────
function resetCard(sfx) {
  $(`${sfx}Method`).value='POST';
  $(`${sfx}Url`).value='';
  $(`${sfx}Body`).value='';
  $(`${sfx}Headers`).innerHTML='';
  $(`${sfx}Params`).innerHTML='';
  addKvRow(`${sfx}Headers`,'Content-Type','application/json');
  const n = sfx.slice(-1);
  const ir = $(`inlineResp${n}`);
  if(ir) ir.classList.add('hidden');
  const ss = $(`send${n}Status`);
  if(ss) ss.textContent='';
  setAuthStatus(n,'','');
}
$('resetApi1Btn').addEventListener('click',()=>resetCard('api1'));
$('resetApi2Btn').addEventListener('click',()=>resetCard('api2'));
$('clearAllBtn').addEventListener('click',()=>{resetCard('api1');resetCard('api2');showToast('All inputs cleared','info');});

// ── Authorization Type Descriptions ───────────────────────────────
const authDescriptions = {
  none:    'No authentication — request sent without any credentials.',
  bearer:  'Token added to the <code>Authorization</code> header as <code>Bearer &lt;token&gt;</code>',
  basic:   'Username:Password encoded as Base64 and sent in <code>Authorization: Basic &lt;encoded&gt;</code>',
  apikey:  'API Key injected into a custom header or as a query parameter.',
  oauth2:  'Fetch an OAuth 2.0 access token and inject it as <code>Authorization: Bearer &lt;token&gt;</code>',
  jwt:     'Build and sign a JWT and inject it as <code>Authorization: Bearer &lt;token&gt;</code>',
  digest:  'Digest Auth credentials stored for server challenge-response flow.',
};

// ── Auth Type Switcher ─────────────────────────────────────────────
const AUTH_TYPES = ['none','bearer','basic','apikey','oauth2','jwt','digest'];

[1,2].forEach(n => {
  const sel = $(`api${n}AuthType`);
  sel.addEventListener('change',()=>switchAuthType(n, sel.value));
  switchAuthType(n, sel.value); // init
});

function switchAuthType(n, type) {
  AUTH_TYPES.forEach(t => {
    const el = $(`api${n}-auth-${t}`);
    if (el) el.classList.toggle('hidden', t !== type);
  });
  const desc = $(`api${n}AuthDesc`);
  if (desc) desc.innerHTML = authDescriptions[type] || '';
}

// ── Apply Auth buttons ─────────────────────────────────────────────
qsa('.btn-auth-apply').forEach(btn => {
  btn.addEventListener('click', () => applyAuth(btn.dataset.api, btn.dataset.type));
});

function applyAuth(n, type) {
  const sfx = `api${n}`;
  let msg = '';
  switch(type) {
    case 'bearer': {
      const tok = $(`${sfx}BearerToken`).value.trim();
      if (!tok) { showToast('Enter a Bearer token', 'error'); return; }
      injectHeader(sfx, 'Authorization', `Bearer ${tok}`);
      msg = `✔ Bearer token injected (${tok.slice(0,20)}…)`;
      break;
    }
    case 'basic': {
      const u = $(`${sfx}BasicUser`).value.trim();
      const p = $(`${sfx}BasicPass`).value;
      if (!u) { showToast('Enter username', 'error'); return; }
      const encoded = btoa(`${u}:${p}`);
      injectHeader(sfx, 'Authorization', `Basic ${encoded}`);
      msg = `✔ Basic Auth injected (${u}:****)`;
      break;
    }
    case 'apikey': {
      const k = $(`${sfx}ApiKeyName`).value.trim() || 'X-API-Key';
      const v = $(`${sfx}ApiKeyVal`).value.trim();
      const where = $(`${sfx}ApiKeyIn`).value;
      if (!v) { showToast('Enter API Key value', 'error'); return; }
      if (where === 'header') { injectHeader(sfx, k, v); msg = `✔ API Key header "${k}" injected`; }
      else { injectQueryParam(sfx, k, v); switchToRequestTab(n); msg = `✔ API Key added to query params`; }
      break;
    }
    case 'jwt': {
      // Simple HMAC-HS256 JWT (browser-side, no external libs)
      const secret = $(`${sfx}JwtSecret`).value.trim();
      const payloadStr = $(`${sfx}JwtPayload`).value.trim() || '{}';
      const algo = $(`${sfx}JwtAlgo`).value;
      if (!secret) { showToast('Enter JWT secret', 'error'); return; }
      const payload = safeJson(payloadStr);
      if (!payload) { showToast('Invalid JSON payload', 'error'); return; }
      if (!payload.iat) payload.iat = Math.floor(Date.now()/1000);
      generateJwt(secret, payload, algo).then(token => {
        if (token) {
          injectHeader(sfx, 'Authorization', `Bearer ${token}`);
          setAuthStatus(n, 'success', `✔ JWT (${algo}) signed & injected`);
          showToast(`API ${n}: JWT signed and injected!`, 'success');
        } else {
          setAuthStatus(n, 'error', '✘ JWT generation failed — check console');
        }
      });
      return;
    }
    case 'digest': {
      const u = $(`${sfx}DigestUser`).value.trim();
      const p = $(`${sfx}DigestPass`).value;
      if (!u) { showToast('Enter username', 'error'); return; }
      injectHeader(sfx, 'X-Digest-Username', u);
      injectHeader(sfx, 'X-Digest-Password', p);
      msg = `✔ Digest credentials stored as custom headers`;
      break;
    }
    default: return;
  }
  if (msg) {
    setAuthStatus(n, 'success', msg);
    showToast(`API ${n}: Auth applied`, 'success');
    switchToRequestTab(n);
  }
}

function switchToRequestTab(n) {
  const tab = qs(`.inner-tab[data-api="${n}"][data-panel="request"]`);
  if (tab) tab.click();
}

function setAuthStatus(n, type, msg) {
  const bar = $(`api${n}AuthStatus`);
  if (!bar) return;
  bar.textContent = msg;
  bar.className = `auth-status-bar${type ? ' '+type : ''}`;
}

// ── JWT Generation (WebCrypto API) ────────────────────────────────
async function generateJwt(secret, payload, algo = 'HS256') {
  try {
    const algoMap = { HS256:'SHA-256', HS384:'SHA-384', HS512:'SHA-512' };
    const hash = algoMap[algo];
    if (!hash) { showToast('Only HMAC algorithms supported in browser', 'error'); return null; }
    const enc = new TextEncoder();
    const header = { alg: algo, typ: 'JWT' };
    const b64u = s => btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
    const headerB64 = b64u(JSON.stringify(header));
    const payloadB64 = b64u(JSON.stringify(payload));
    const sigInput = `${headerB64}.${payloadB64}`;
    const keyData = enc.encode(secret);
    const key = await crypto.subtle.importKey('raw', keyData, {name:'HMAC',hash}, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(sigInput));
    const sigB64 = b64u(btoa(String.fromCharCode(...new Uint8Array(sig))));
    return `${sigInput}.${sigB64}`;
  } catch(e) { console.error('JWT error', e); return null; }
}

// ── OAuth 2.0 Get Token ────────────────────────────────────────────
$('getToken1Btn').addEventListener('click', ()=>fetchOauthToken(1));
$('getToken2Btn').addEventListener('click', ()=>fetchOauthToken(2));

async function fetchOauthToken(n) {
  const sfx = `api${n}`;
  const grant = $(`${sfx}OauthGrant`).value;
  const spinEl = $(`getToken${n}Spinner`);
  const btn = $(`getToken${n}Btn`);

  setAuthStatus(n,'','');

  if (grant === 'custom_token') {
    const tok = $(`${sfx}DirectToken`).value.trim();
    if (!tok) { setAuthStatus(n,'error','Paste a token first'); return; }
    injectHeader(sfx, 'Authorization', `Bearer ${tok}`);
    setAuthStatus(n,'success',`✔ Token injected (${tok.slice(0,24)}…)`);
    showToast(`API ${n} token injected`, 'success');
    switchToRequestTab(n);
    return;
  }

  const tokenUrl    = $(`${sfx}TokenUrl`).value.trim();
  const clientId    = $(`${sfx}ClientId`).value.trim();
  const clientSecret= $(`${sfx}ClientSecret`).value.trim();
  const scope       = $(`${sfx}Scope`).value.trim();
  const username    = grant==='password' ? $(`${sfx}Username`).value.trim() : '';
  const password    = grant==='password' ? $(`${sfx}Password`).value : '';

  if (!tokenUrl)    { setAuthStatus(n,'error','Token URL is required'); return; }
  if (!clientId)    { setAuthStatus(n,'error','Client ID is required'); return; }
  if (!clientSecret){ setAuthStatus(n,'error','Client Secret is required'); return; }

  btn.disabled=true; spinEl.classList.remove('hidden');
  setAuthStatus(n,'','⏳ Fetching token…');

  const body = new URLSearchParams({ grant_type:grant, client_id:clientId, client_secret:clientSecret });
  if (scope) body.set('scope', scope);
  if (grant==='password') { body.set('username',username); body.set('password',password); }

  const proxy = $('proxyUrl').value.trim();
  const url = proxy ? `${proxy.replace(/\/$/,'')}/${tokenUrl}` : tokenUrl;

  try {
    const res = await fetch(url, {
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json'},
      body: body.toString(),
    });
    const data = await res.json();
    if (!res.ok) { const m=data.error_description||data.error||`HTTP ${res.status}`; setAuthStatus(n,'error',`✘ ${m}`); return; }
    const token = data.access_token;
    if (!token) { setAuthStatus(n,'error','✘ No access_token in response'); return; }
    injectHeader(sfx,'Authorization',`Bearer ${token}`);
    const exp = data.expires_in ? ` · expires in ${data.expires_in}s`:'';
    setAuthStatus(n,'success',`✔ ${data.token_type||'Bearer'} token injected${exp}`);
    showToast(`API ${n} OAuth token injected!`,'success');
    switchToRequestTab(n);
  } catch(err) {
    setAuthStatus(n,'error',`✘ ${err.message}`);
    showToast(`Token fetch failed: ${err.message}`,'error');
  } finally {
    btn.disabled=false; spinEl.classList.add('hidden');
  }
}

function updateOauthFields(n) {
  const grant = $(`api${n}OauthGrant`).value;
  const show = (id,v) => $(id)?.classList.toggle('hidden',!v);
  const isDirect = grant==='custom_token'; const isPW = grant==='password';
  show(`api${n}TokenUrlGroup`,!isDirect); show(`api${n}ClientIdGroup`,!isDirect);
  show(`api${n}ClientSecretGroup`,!isDirect); show(`api${n}ScopeGroup`,!isDirect);
  show(`api${n}UsernameGroup`,isPW); show(`api${n}PasswordGroup`,isPW);
  show(`api${n}DirectTokenGroup`,isDirect);
}
[1,2].forEach(n=>{
  $(`api${n}OauthGrant`)?.addEventListener('change',()=>updateOauthFields(n));
  updateOauthFields(n);
});

// ── Import Modal — Per-card Buttons ───────────────────────────────
const modal = $('importModal');
let currentImportTarget = 'api1';
let currentImportMode   = 'curl';

qsa('.card-import-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentImportTarget = btn.dataset.target;
    currentImportMode   = btn.dataset.mode;
    openImportModal(btn.dataset.target, btn.dataset.mode);
  });
});

function openImportModal(target, mode) {
  const isApi1 = target==='api1';
  $('modalTitle').textContent = `Import into ${isApi1?'API 1 — OutSystems':'API 2 — .NET'}`;
  const badge = $('modalTargetBadge');
  badge.textContent = isApi1?'API 1':'API 2';
  badge.className = `api-badge ${isApi1?'api1-badge':'api2-badge'}`;
  $('modalImportTargetLabel').textContent = isApi1?'API 1':'API 2';

  setImportMode(mode);
  modal.classList.remove('hidden');
}

function setImportMode(mode) {
  currentImportMode = mode;
  $('curlInputGroup').classList.toggle('hidden', mode!=='curl');
  $('jsonInputGroup').classList.toggle('hidden', mode!=='json');
  qsa('.import-type-tab').forEach(t=>t.classList.toggle('active', t.dataset.mode===mode));
}

$('tabCurlBtn').addEventListener('click',()=>setImportMode('curl'));
$('tabJsonBtn').addEventListener('click',()=>setImportMode('json'));
$('modalClose').addEventListener('click',()=>modal.classList.add('hidden'));
$('modalCancelBtn').addEventListener('click',()=>modal.classList.add('hidden'));
modal.addEventListener('click',e=>{ if(e.target===modal) modal.classList.add('hidden'); });

$('modalImportBtn').addEventListener('click',()=>{
  if (currentImportMode==='curl') {
    const raw=$('curlInput').value.trim();
    if(!raw){showToast('Paste a cURL command first','error');return;}
    importCurl(raw, currentImportTarget);
  } else {
    const raw=$('jsonInput').value.trim();
    if(!raw){showToast('Paste JSON first','error');return;}
    importJsonCollection(raw, currentImportTarget);
  }
  modal.classList.add('hidden');
});

// ── cURL Parser ────────────────────────────────────────────────────
function importCurl(raw, target) {
  try {
    const curl = raw.replace(/\\\s*\n/g,' ').replace(/\s+/g,' ').trim();
    const methodM = curl.match(/-X\s+([A-Z]+)/i);
    let method = methodM ? methodM[1].toUpperCase() : 'GET';
    const urlM = curl.match(/curl\s+(?:-[^\s]+\s+[^\s]+\s+)*['"]?(https?:\/\/[^'" ]+)['"]?/i)
              || curl.match(/['"]?(https?:\/\/[^'" ]+)['"]?/);
    const url = urlM ? urlM[1] : '';
    const headers = {};
    [...curl.matchAll(/-H\s+['"]([^'"]+)['"]/gi)].forEach(m=>{
      const ci=m[1].indexOf(':'); if(ci>-1) headers[m[1].slice(0,ci).trim()]=m[1].slice(ci+1).trim();
    });
    const dataM = curl.match(/(?:-d|--data(?:-raw)?)\s+'([\s\S]+?)'/i)
               || curl.match(/(?:-d|--data(?:-raw)?)\s+"([\s\S]+?)"/i)
               || curl.match(/(?:-d|--data(?:-raw)?)\s+(\{[\s\S]+?\})/i);
    let body=''; if(dataM){body=dataM[1].trim(); if(method==='GET')method='POST';}
    applyToApi(target,{method,url,headers,body,params:{}});
    showToast(`cURL imported → ${target==='api1'?'API 1':'API 2'}`,'success');
  } catch(e){ showToast('cURL parse error: '+e.message,'error'); }
}

// ── Postman JSON Parser ────────────────────────────────────────────
function importJsonCollection(raw, target) {
  try {
    const obj=JSON.parse(raw);
    if(obj.method||obj.request){ applyFromPm(obj.request??obj,target); }
    else {
      const items=obj.item??obj.requests??[];
      if(!items.length) throw new Error('No requests found');
      applyFromPm(items[0].request??items[0],target);
    }
    showToast(`Collection imported → ${target==='api1'?'API 1':'API 2'}`,'success');
  } catch(e){ showToast('JSON parse error: '+e.message,'error'); }
}
function applyFromPm(req, target) {
  const method=(req.method||'GET').toUpperCase();
  let url=typeof req.url==='string'?req.url:(req.url?.raw||'');
  const headers={}; (req.header||[]).forEach(h=>{if(h.key)headers[h.key]=h.value||'';});
  let body=req.body?.raw||'';
  if(!body&&req.body?.urlencoded) body=req.body.urlencoded.map(p=>`${p.key}=${p.value}`).join('&');
  const params={}; (req.url?.query||[]).forEach(q=>{if(q.key)params[q.key]=q.value||'';});
  applyToApi(target,{method,url,headers,body,params});
}
function applyToApi(target,{method,url,headers,body,params}) {
  const sfx=target;
  $(`${sfx}Method`).value=method;
  $(`${sfx}Url`).value=url;
  try{$(`${sfx}Body`).value=JSON.stringify(JSON.parse(body),null,2);}catch{$(`${sfx}Body`).value=body;}
  $(`${sfx}Headers`).innerHTML='';
  Object.entries(headers).forEach(([k,v])=>addKvRow(`${sfx}Headers`,k,v));
  if(!Object.keys(headers).length) addKvRow(`${sfx}Headers`,'Content-Type','application/json');
  $(`${sfx}Params`).innerHTML='';
  Object.entries(params).forEach(([k,v])=>addKvRow(`${sfx}Params`,k,v));
}

// ── Build Fetch Config ─────────────────────────────────────────────
function buildFetchOptions(sfx) {
  const method  = $(`${sfx}Method`).value;
  const rawUrl  = $(`${sfx}Url`).value.trim();
  const body    = $(`${sfx}Body`).value.trim();
  const headers = getKvPairs(`${sfx}Headers`);
  const params  = getKvPairs(`${sfx}Params`);
  const proxy   = $('proxyUrl').value.trim();
  const postmanMode = $('optPostmanMode')?.checked;

  if(!rawUrl) throw new Error(`${sfx==='api1'?'API 1':'API 2'} URL is empty`);
  let finalUrl=rawUrl;
  const pe = Object.entries(params);
  if(pe.length) finalUrl+=(rawUrl.includes('?')?'&':'?')+new URLSearchParams(pe).toString();
  
  // CORS Bypass logic
  if(postmanMode) {
    // Route via local Node server proxy
    finalUrl = `/proxy?url=${encodeURIComponent(finalUrl)}`;
  } else if(proxy) {
    // External CORS proxy fallback
    finalUrl = proxy.replace(/\/$/,'')+'/'+finalUrl;
  }

  const opts={method,headers};
  if(!['GET','HEAD'].includes(method)&&body) opts.body=body;
  return {url:finalUrl,opts,rawUrl};
}

// ── Timed Fetch ────────────────────────────────────────────────────
async function timedFetch(url, opts, timeoutMs) {
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),timeoutMs);
  const t0=performance.now();
  try {
    const res=await fetch(url,{...opts,signal:ctrl.signal});
    const t1=performance.now();
    const text=await res.text(); clearTimeout(timer);
    return {ok:true,status:res.status,statusText:res.statusText,
      headers:Object.fromEntries(res.headers.entries()),
      bodyText:text,bodyJson:safeJson(text),
      elapsed:Math.round(t1-t0),size:new TextEncoder().encode(text).length};
  } catch(err) {
    clearTimeout(timer);
    return {ok:false,status:null,statusText:err.name==='AbortError'?'Timeout':err.message,
      headers:{},bodyText:'',bodyJson:null,elapsed:Math.round(performance.now()-t0),size:0};
  }
}

// ── Send Single API ────────────────────────────────────────────────
$('sendApi1Btn').addEventListener('click',()=>sendSingle('api1',1));
$('sendApi2Btn').addEventListener('click',()=>sendSingle('api2',2));

async function sendSingle(sfx,n) {
  let cfg; try{cfg=buildFetchOptions(sfx);}catch(e){showToast(e.message,'error');return;}
  const timeoutMs=parseInt($('reqTimeout').value)||30000;
  const btn=$(`send${sfx==='api1'?'Api1':'Api2'}Btn`);
  const statusEl=$(`send${n}Status`);
  const respBox=$(`inlineResp${n}`);
  btn.disabled=true;
  btn.innerHTML=`<span class="mini-spinner"></span> Sending…`;
  statusEl.textContent=''; statusEl.className='send-status';
  respBox.classList.add('hidden');
  
  logToConsole(n, `Sending ${cfg.opts.method} to ${cfg.rawUrl}`, 'req');
  logToConsole(n, `Headers: ${JSON.stringify(cfg.opts.headers)}`, 'req');

  const result=await timedFetch(cfg.url,cfg.opts,timeoutMs);
  
  btn.disabled=false;
  btn.innerHTML=`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Send Request`;
  
  if (result.ok) {
    logToConsole(n, `Received ${result.status} ${result.statusText} (${result.elapsed}ms)`, 'res');
  } else {
    logToConsole(n, `error: ${result.statusText}`, 'err');
    const postmanMode = $('optPostmanMode')?.checked;

    if (result.status === 502 && postmanMode) {
      logToConsole(n, "Proxy failed to reach the API. This usually means the target URL is incorrect, blocked by your firewall, or requires a VPN connection.", 'hint');
    } else if (result.statusText === 'Failed to fetch' || result.statusText === 'NetworkError when attempting to fetch resource') {
      logToConsole(n, "This looks like a CORS issue. Since you are on VPN, your browser blocks requests to different internal domains for security. Postman works because it is NOT a browser.", 'hint');
      logToConsole(n, "Switch to 'Postman Mode' (in options) to bypass this, or install the 'Allow CORS' extension.", 'hint');
    }
  }

  const sc=statusClass(result.status);
  statusEl.textContent=result.status
    ?`${result.status} ${result.statusText} · ${result.elapsed}ms · ${formatBytes(result.size)}`
    :`Error: ${result.statusText}`;
  statusEl.className=`send-status ${sc==='status-2xx'?'ok':'err'}`;
  $(`inline${n}StatusPill`).textContent=result.status?`${result.status} ${result.statusText}`:`ERROR: ${result.statusText}`;
  $(`inline${n}StatusPill`).className=`status-pill ${sc}`;
  $(`inline${n}TimePill`).textContent=`⏱ ${result.elapsed}ms`;
  $(`inline${n}SizePill`).textContent=formatBytes(result.size);
  $(`inline${n}Body`).textContent=tryPrettyJson(result.bodyText);
  $(`inline${n}Headers`).textContent=formatHeaders(result.headers);
  respBox.classList.remove('hidden');
  showToast(result.ok?`API ${n}: ${result.status} in ${result.elapsed}ms`:`API ${n} error: ${result.statusText}`,
    result.ok&&result.status<400?'success':'error');
}

qsa('.iresp-tab').forEach(tab=>{
  tab.addEventListener('click',()=>{
    const r=tab.dataset.resp; const p=tab.dataset.pane;
    qsa(`.iresp-tab[data-resp="${r}"]`).forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    $(`inline${r}Body`).classList.toggle('hidden',p!=='body');
    $(`inline${r}Headers`).classList.toggle('hidden',p!=='headers');
  });
});
$('closeInline1').addEventListener('click',()=>{$('inlineResp1').classList.add('hidden');$('send1Status').textContent='';});
$('closeInline2').addEventListener('click',()=>{$('inlineResp2').classList.add('hidden');$('send2Status').textContent='';});

// ── Deep JSON Diff ─────────────────────────────────────────────────
function normalizeKey(k){return String(k).toLowerCase().trim();}
function isObj(v){return v!==null&&typeof v==='object'&&!Array.isArray(v);}

function deepDiff(a,b,opts={},path='') {
  const {caseInsensitiveKey,caseInsensitiveVal,ignoreArrayOrder,ignoreExtraKeys}=opts;
  const results=[];
  if(Array.isArray(a)&&Array.isArray(b)){diffArrays(a,b,opts,path,results);return results;}
  if(isObj(a)&&isObj(b)){diffObjects(a,b,opts,path,results);return results;}
  const va=caseInsensitiveVal&&typeof a==='string'?a.toLowerCase():a;
  const vb=caseInsensitiveVal&&typeof b==='string'?b.toLowerCase():b;
  results.push({path,key:path||'(root)',type:va===vb?'match':'mismatch',valA:a,valB:b});
  return results;
}
function diffObjects(a,b,opts,path,results) {
  const {caseInsensitiveKey,ignoreExtraKeys}=opts;
  const aKeys=Object.keys(a); const bKeys=Object.keys(b);
  const normB={};
  bKeys.forEach(k=>{normB[caseInsensitiveKey?normalizeKey(k):k]=k;});
  aKeys.forEach(aKey=>{
    const nk=caseInsensitiveKey?normalizeKey(aKey):aKey;
    const cp=path?`${path}.${aKey}`:aKey;
    if(nk in normB) deepDiff(a[aKey],b[normB[nk]],opts,cp).forEach(r=>results.push(r));
    else results.push({path:cp,key:cp,type:'missing_in_b',valA:JSON.stringify(a[aKey]),valB:'—'});
  });
  if(!ignoreExtraKeys) {
    const normA={};
    aKeys.forEach(k=>{normA[caseInsensitiveKey?normalizeKey(k):k]=k;});
    bKeys.forEach(bKey=>{
      const nk=caseInsensitiveKey?normalizeKey(bKey):bKey;
      if(!(nk in normA)){
        const cp=path?`${path}.${bKey}`:bKey;
        results.push({path:cp,key:cp,type:'extra_in_b',valA:'—',valB:JSON.stringify(b[bKey])});
      }
    });
  }
}
function diffArrays(a,b,opts,path,results) {
  if(opts.ignoreArrayOrder) {
    const ser=arr=>arr.map(el=>JSON.stringify(el)).sort();
    const match=JSON.stringify(ser(a))===JSON.stringify(ser(b));
    results.push({path,key:`${path||'(root)'}[array]`,type:match?'match':'array_diff',
      valA:`[${a.length} items]`,valB:`[${b.length} items]`,
      note:match?'Order-insensitive match':`Element mismatch A:${a.length} B:${b.length}`});
    return;
  }
  const len=Math.max(a.length,b.length);
  for(let i=0;i<len;i++){
    const cp=`${path}[${i}]`;
    if(i>=a.length) results.push({path:cp,key:cp,type:'extra_in_b',valA:'—',valB:JSON.stringify(b[i])});
    else if(i>=b.length) results.push({path:cp,key:cp,type:'missing_in_b',valA:JSON.stringify(a[i]),valB:'—'});
    else deepDiff(a[i],b[i],opts,cp).forEach(r=>results.push(r));
  }
}

// ── Render Diff Table ──────────────────────────────────────────────
function renderDiffTable(diffs) {
  if(!diffs.length) return `<div class="no-diff-msg">✅ <span>Responses are identical — no differences found</span></div>`;
  const typeLabel={match:'<span class="diff-status-match">✔ MATCH</span>',mismatch:'<span class="diff-status-mismatch">✘ MISMATCH</span>',missing_in_b:'<span class="diff-status-missing">⚠ MISSING IN API 2</span>',extra_in_b:'<span class="diff-status-extra">ℹ EXTRA IN API 2</span>',array_diff:'<span class="diff-status-mismatch">✘ ARRAY DIFF</span>'};
  const rowCls={match:'diff-row-match',mismatch:'diff-row-mismatch',missing_in_b:'diff-row-missing',extra_in_b:'diff-row-extra',array_diff:'diff-row-mismatch'};
  return `<div style="overflow-x:auto"><table class="diff-table">
    <thead><tr><th>Key</th><th>JSON Path</th><th>Status</th><th>API 1 Value</th><th>API 2 Value</th><th>Note</th></tr></thead>
    <tbody>${diffs.map(d=>`<tr class="${rowCls[d.type]||''}"><td class="diff-key-col">${escHtml(d.key)}</td><td class="diff-path-col">${escHtml(d.path)}</td><td>${typeLabel[d.type]||d.type}</td><td class="diff-val-a">${escHtml(truncate(String(d.valA),200))}</td><td class="diff-val-b">${escHtml(truncate(String(d.valB),200))}</td><td>${escHtml(d.note||'')}</td></tr>`).join('')}
    </tbody></table></div>`;
}

// ── Summary Strip ──────────────────────────────────────────────────
function renderSummary(r1,r2,diffs) {
  const mm=diffs.filter(d=>d.type!=='match').length;
  const mh=diffs.filter(d=>d.type==='match').length;
  const sm=r1.status===r2.status;
  return [
    {l:'API 1 Status',v:r1.status||'ERR',c:statusClass(r1.status)==='status-2xx'?'match':'mismatch'},
    {l:'API 2 Status',v:r2.status||'ERR',c:statusClass(r2.status)==='status-2xx'?'match':'mismatch'},
    {l:'Status Match',v:sm?'✔ YES':'✘ NO',c:sm?'match':'mismatch'},
    {l:'API 1 Time',v:`${r1.elapsed}ms`,c:'neutral'},
    {l:'API 2 Time',v:`${r2.elapsed}ms`,c:'neutral'},
    {l:'Delta',v:`${Math.abs(r1.elapsed-r2.elapsed)}ms`,c:'neutral'},
    {l:'Matched',v:`${mh}/${diffs.length}`,c:mh===diffs.length?'match':'mismatch'},
    {l:'Mismatches',v:mm,c:mm===0?'match':'mismatch'},
  ].map(c=>`<div class="summary-card"><div class="summary-card-label">${c.l}</div><div class="summary-card-value ${c.c}">${c.v}</div></div>`).join('');
}

// ── Run Comparison ─────────────────────────────────────────────────
$('runCompareBtn').addEventListener('click', runComparison);

async function runComparison() {
  let c1,c2;
  try{c1=buildFetchOptions('api1');}catch(e){showToast(e.message,'error');return;}
  try{c2=buildFetchOptions('api2');}catch(e){showToast(e.message,'error');return;}
  const ms=parseInt($('reqTimeout').value)||30000;
  const opts={
    caseInsensitiveKey:$('optCaseInsensitiveKey').checked,
    caseInsensitiveVal:$('optCaseInsensitiveVal').checked,
    ignoreArrayOrder:$('optIgnoreArrayOrder').checked,
    ignoreExtraKeys:$('optIgnoreExtraKeys').checked,
  };
  showLoading(true); setLoadingStep(1);
  try {
    const r1=await timedFetch(c1.url,c1.opts,ms); setLoadingStep(2);
    const r2=await timedFetch(c2.url,c2.opts,ms); setLoadingStep(3); await sleep(200);
    const diffs=(r1.bodyJson&&r2.bodyJson)
      ?deepDiff(r1.bodyJson,r2.bodyJson,opts,'')
      :[{path:'(body)',key:'(body)',type:r1.bodyText===r2.bodyText?'match':'mismatch',valA:truncate(r1.bodyText,300),valB:truncate(r2.bodyText,300),note:'Non-JSON body — full text compared'}];
    setLoadingStep(4); await sleep(100);
    const result={timestamp:new Date().toISOString(),api1:{config:c1,response:r1},api2:{config:c2,response:r2},diffs,opts};
    state.lastResult=result;
    showLoading(false);
    renderResults(result); generateReport(result); switchTab('results');
    showToast('Comparison complete','success');
  } catch(e){ showLoading(false); showToast('Error: '+e.message,'error'); }
}

const state = { lastResult:null };

// ── Render Results ─────────────────────────────────────────────────
function renderResults({api1,api2,diffs}) {
  const r1=api1.response,r2=api2.response;
  $('resultsPlaceholder').classList.add('hidden');
  $('resultsContent').classList.remove('hidden');
  $('summaryStrip').innerHTML=renderSummary(r1,r2,diffs);
  const fill=(n,r)=>{
    $(`r${n}Status`).textContent=r.status?`${r.status} ${r.statusText}`:`ERROR: ${r.statusText}`;
    $(`r${n}Status`).className=`status-pill ${statusClass(r.status)}`;
    $(`r${n}Time`).textContent=`⏱ ${r.elapsed}ms`;
    $(`r${n}Size`).textContent=formatBytes(r.size);
    $(`r${n}Headers`).textContent=formatHeaders(r.headers);
    $(`r${n}Body`).textContent=tryPrettyJson(r.bodyText);
  };
  fill(1,r1); fill(2,r2);
  const mm=diffs.filter(d=>d.type!=='match').length;
  const badge=$('diffSummaryBadge');
  badge.textContent=mm===0?'✅ All fields match':`${mm} difference${mm>1?'s':''}`;
  badge.className=`diff-badge ${mm===0?'all-match':'has-diff'}`;
  $('diffTable').innerHTML=renderDiffTable(diffs);
}

// ── MD Report ──────────────────────────────────────────────────────
function escMd(s){return String(s).replace(/\|/g,'\\|').replace(/`/g,"'").slice(0,150);}
function generateReport({timestamp,api1,api2,diffs,opts}) {
  const r1=api1.response,r2=api2.response;
  const date=new Date(timestamp).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'});
  const mm=diffs.filter(d=>d.type!=='match');
  const mh=diffs.filter(d=>d.type==='match');
  const te={match:'✅',mismatch:'❌',missing_in_b:'⚠️',extra_in_b:'ℹ️',array_diff:'❌'};
  const rows=diffs.length?diffs.map(d=>`| \`${escMd(d.key)}\` | \`${escMd(d.path||'—')}\` | ${te[d.type]||''} ${d.type.toUpperCase().replace(/_/g,' ')} | \`${escMd(String(d.valA))}\` | \`${escMd(String(d.valB))}\` | ${d.note||''} |`).join('\n'):'| — | — | — | — | — | — |';
  const reqBlock=(cfg,r)=>`\`\`\`\n${cfg.opts.method} ${cfg.rawUrl}\n\`\`\`\n\n**Headers:**\n\`\`\`\n${Object.entries(cfg.opts.headers||{}).map(([k,v])=>`${k}: ${v}`).join('\n')||'(none)'}\n\`\`\`\n\n**Body:**\n\`\`\`json\n${tryPrettyJson(cfg.opts.body||'')}\n\`\`\`\n\n**Response:** \`${r.status||'ERROR'} ${r.statusText}\` — ${r.elapsed}ms — ${formatBytes(r.size)}\n\n\`\`\`json\n${tryPrettyJson(r.bodyText)}\n\`\`\``;
  const report=`# API Migration Comparison Report\n\n> **Generated:** ${date} (IST)\n\n---\n\n## 📋 Summary\n\n| Metric | Value |\n|--------|-------|\n| API 1 Status | \`${r1.status||'ERROR'}\` |\n| API 2 Status | \`${r2.status||'ERROR'}\` |\n| Status Match | ${r1.status===r2.status?'✅ YES':'❌ NO'} |\n| API 1 Time | ${r1.elapsed}ms |\n| API 2 Time | ${r2.elapsed}ms |\n| Matched Fields | ${mh.length}/${diffs.length} |\n| Mismatches | ${mm.length} |\n\n---\n\n## 🔵 API 1 — Old (OutSystems)\n\n${reqBlock(api1.config,r1)}\n\n---\n\n## 🟢 API 2 — New (.NET)\n\n${reqBlock(api2.config,r2)}\n\n---\n\n## 🔍 JSON Diff\n\n| Key | Path | Status | API 1 | API 2 | Note |\n|-----|------|--------|-------|-------|------|\n${rows}\n\n---\n\n## 📌 Verdict\n\n${mm.length===0?'> ✅ Migration validation **PASSED** — APIs are functionally equivalent.':mm.map(d=>`\n### ❌ \`${d.key}\`\n- **Status:** ${d.type}\n- **API 1:** \`${escMd(String(d.valA))}\`\n- **API 2:** \`${escMd(String(d.valB))}\``).join('')}\n\n---\n*Generated by API Comparator v3*`;
  $('reportPlaceholder').classList.add('hidden');
  $('reportArea').classList.remove('hidden');
  $('reportArea').value=report;
}

$('copyReportBtn').addEventListener('click',()=>{
  const v=$('reportArea').value; if(!v){showToast('No report yet','error');return;}
  navigator.clipboard.writeText(v).then(()=>showToast('Report copied!','success')).catch(()=>{$('reportArea').select();document.execCommand('copy');showToast('Copied!','success');});
});
$('downloadReportBtn').addEventListener('click',()=>{
  const v=$('reportArea').value; if(!v){showToast('No report yet','error');return;}
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.getHours().toString().padStart(2,'0') + '-' + now.getMinutes().toString().padStart(2,'0');
  const fileName = `API_Comparison_Report_${date}_${time}.md`;
  
  const blob = new Blob([v], {type: 'text/markdown'});
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.setAttribute('download', fileName);
  document.body.appendChild(a);
  a.click();
  
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
    a.remove();
  }, 100);
  
  showToast(`Report saved as ${fileName} in your Downloads folder`, 'success', 4500);
});

// ── Loading ────────────────────────────────────────────────────────
function showLoading(v){$('loadingOverlay').classList.toggle('hidden',!v);$('runCompareBtn').disabled=v;}
function setLoadingStep(step){
  ['ls1','ls2','ls3','ls4'].forEach((id,i)=>{
    const el=$(id);
    if(i+1<step){el.classList.remove('active');el.classList.add('done');}
    else if(i+1===step){el.classList.add('active');el.classList.remove('done');}
    else{el.classList.remove('active','done');}
  });
}

// ── VPN badge pulse ────────────────────────────────────────────────
setInterval(()=>{const b=$('vpnBadge');b.style.opacity=b.style.opacity==='0.5'?'1':'0.5';},2500);

console.info('%c API Comparator v3 loaded ','background:#6366f1;color:#fff;padding:4px 10px;border-radius:4px;font-weight:700');
