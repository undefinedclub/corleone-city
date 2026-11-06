import { createCipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const password = process.env.IMPERIO_PASSWORD;
if (!password || password.length < 12) {
  throw new Error('IMPERIO_PASSWORD fehlt oder ist kürzer als 12 Zeichen.');
}
const supabaseUrl = process.env.VITE_SUPABASE_URL;
let validSupabaseUrl = false;
try {
  const parsedUrl = new URL(supabaseUrl);
  validSupabaseUrl = parsedUrl.protocol === 'https:'
    && parsedUrl.pathname === '/'
    && !parsedUrl.search
    && !parsedUrl.hash
    && !parsedUrl.username
    && !parsedUrl.password;
} catch {
  validSupabaseUrl = false;
}
if (!validSupabaseUrl || !process.env.VITE_SUPABASE_ANON_KEY) {
  throw new Error('VITE_SUPABASE_URL muss die HTTPS-Project-URL ohne Pfad, Query oder Fragment sein (z. B. https://<project-ref>.supabase.co); VITE_SUPABASE_ANON_KEY muss ebenfalls gesetzt sein.');
}

const path = new URL('../dist/index.html', import.meta.url);
const app = await readFile(path);
const salt = randomBytes(16);
const iv = randomBytes(12);
const key = pbkdf2Sync(password, salt, 310000, 32, 'sha256');
const cipher = createCipheriv('aes-256-gcm', key, iv);
const encrypted = Buffer.concat([cipher.update(app), cipher.final()]);
const payload = Buffer.concat([encrypted, cipher.getAuthTag()]).toString('base64');
const saltText = salt.toString('base64');
const ivText = iv.toString('base64');

const wrapper = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#10100f"><title>Imperio | Zugang</title><style>
:root{color-scheme:dark;--gold:#bf9d61;--ink:#10100f;--muted:#a19b8f}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 35%,#27231c 0,#151513 40%,#10100f 75%);color:#e8e1d5;font:15px 'DM Sans',sans-serif}.panel{width:min(420px,calc(100% - 36px));padding:42px 38px 38px;border:1px solid #49402f;background:#171715;box-shadow:0 24px 80px #0008;animation:arrive .65s ease both}.crest{display:grid;place-items:center;width:62px;height:62px;margin:0 auto 20px;border:1px solid var(--gold);color:var(--gold);font:32px Georgia,serif;transform:rotate(45deg)}.crest span{transform:rotate(-45deg)}.eyebrow{text-align:center;color:var(--gold);font-size:10px;letter-spacing:2px;text-transform:uppercase}.title{text-align:center;margin:10px 0 2px;font:600 43px 'Cormorant Garamond',Georgia,serif;letter-spacing:0}.subtitle{text-align:center;color:var(--muted);font-size:12px;letter-spacing:1.6px;text-transform:uppercase}.rule{height:1px;margin:26px 0;background:linear-gradient(90deg,transparent,#75613c,transparent)}label{display:block;margin-bottom:8px;color:#c5bdaF;font-size:12px}input{width:100%;height:46px;padding:0 13px;border:1px solid #48443b;background:#10100f;color:#eee;font:inherit;outline:none}input:focus{border-color:var(--gold)}button{width:100%;height:45px;margin-top:14px;border:1px solid #d1b276;background:var(--gold);color:#171410;font:600 12px 'DM Sans',sans-serif;letter-spacing:1.2px;text-transform:uppercase;cursor:pointer}button:hover{background:#d4b16a}#error{min-height:18px;margin:10px 0 0;color:#d07c70;font-size:12px;text-align:center}@keyframes arrive{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){*{animation:none!important}}
</style></head><body><main class="panel"><div class="crest"><span>♛</span></div><div class="eyebrow">Corleone City</div><h1 class="title">IMPERIO</h1><div class="subtitle">Zugang zum Familienarchiv</div><div class="rule"></div><form id="unlock"><label for="password">Gemeinsames Zugangspasswort</label><input id="password" type="password" autocomplete="current-password" required autofocus><button type="submit">Archiv öffnen</button><p id="error" role="alert"></p></form></main><script>
const payload='${payload}',salt='${saltText}',iv='${ivText}';
const bytes=value=>Uint8Array.from(atob(value),char=>char.charCodeAt(0));
document.querySelector('#unlock').addEventListener('submit',async event=>{event.preventDefault();const button=event.currentTarget.querySelector('button');const error=document.querySelector('#error');button.disabled=true;button.textContent='Wird geöffnet …';error.textContent='';try{const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(document.querySelector('#password').value),'PBKDF2',false,['deriveKey']);const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:bytes(salt),iterations:310000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(iv),tagLength:128},key,bytes(payload));document.open();document.write(new TextDecoder().decode(plain));document.close()}catch{error.textContent='Das Passwort ist nicht korrekt.';button.disabled=false;button.textContent='Archiv öffnen'}});
</script></body></html>`;

await writeFile(path, wrapper);
console.log('Geschützte Einzeldatei erstellt.');