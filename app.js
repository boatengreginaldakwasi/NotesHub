/* ---------- CONFIG ---------- */
const DB='https://ghana-ambulance-60a8d-default-rtdb.firebaseio.com';
const PAYSTACK_PK='pk_test_02c3db2f301d6831a624de4d75c5c23e830e7dc4'; // public key only. NEVER put sk_ in browser code.
const ADMIN={email:'admin@noteshub.com',pass:'admin123'}; // change this!
/* ---------- HELPERS ---------- */
const $=s=>document.querySelector(s), app=$('#app');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'GH₵ '+Number(n||0).toFixed(2);
const toast=m=>{const t=$('#toast');t.textContent=m;t.style.display='block';setTimeout(()=>t.style.display='none',2800)};
const chk=async r=>{const d=await r.json().catch(()=>null);if(d&&d.error)throw new Error('Firebase: '+d.error+' (check your database rules)');return d};
const db={
 async get(p){return chk(await fetch(`${DB}/${p}.json`))},
 async put(p,d){return chk(await fetch(`${DB}/${p}.json`,{method:'PUT',body:JSON.stringify(d)}))},
 async post(p,d){return chk(await fetch(`${DB}/${p}.json`,{method:'POST',body:JSON.stringify(d)}))},
 async patch(p,d){return chk(await fetch(`${DB}/${p}.json`,{method:'PATCH',body:JSON.stringify(d)}))},
 async del(p){return fetch(`${DB}/${p}.json`,{method:'DELETE'})}
};
const list=o=>Object.entries(o||{}).map(([id,v])=>({id,...v}));
const hash=async s=>!(window.crypto&&crypto.subtle)?'x'+[...s].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7):[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(b=>b.toString(16).padStart(2,'0')).join('');
const file64=f=>new Promise(r=>{if(!f)return r('');const x=new FileReader();x.onload=()=>r(x.result);x.readAsDataURL(f)});
let me=JSON.parse(localStorage.getItem('nh_user')||'null');
const setMe=u=>{me=u;u?localStorage.setItem('nh_user',JSON.stringify(u)):localStorage.removeItem('nh_user')};
const go=h=>location.hash=h;
const noteCard=(n,btn=true)=>`<div class="card note"><div class="cov" style="${n.cover?`background-image:url(${n.cover})`:''}">${n.cover?'':esc(n.title)}</div><b>${esc(n.title)}</b><div class="price">${money(n.price)}</div>${btn?`<button class="btn gold sm" onclick="buy('${n.id}')">Buy Now</button>`:''}</div>`;
async function notes(pub=true){const a=list(await db.get('notes'));return pub?a.filter(n=>n.status!=='draft'):a}
/* ---------- LAYOUTS ---------- */
function topbar(){return `<div class="top"><h2>🎓 NotesHub</h2><nav><a href="#/">Home</a><a href="#/browse">Notes</a>${me?`<a class="btn sm gold" href="#/${me.admin?'a':'s'}/dash">Dashboard</a>`:`<a class="btn sm out" href="#/auth">Login</a><a class="btn sm gold" href="#/auth">Register</a>`}</nav></div>`}
function shell(kind,page,html){
 const S=[['dash','Dashboard'],['browse','Browse Notes'],['purchases','My Purchases'],['downloads','My Downloads'],['profile','Profile']];
 const A=[['dash','Dashboard'],['upload','Upload Notes'],['manage','Manage Notes'],['prices','Set Prices'],['students','Students'],['sales','Sales'],['settings','Settings']];
 const m=kind==='s'?S:A;
 app.innerHTML=`<div class="layout"><aside class="side"><h2>🎓 NotesHub${kind==='a'?'<br><small>Admin Portal</small>':''}</h2>${m.map(([k,l])=>`<a class="${k===page?'on':''}" href="#/${kind}/${k}">${l}</a>`).join('')}<a onclick="logout()">Logout</a></aside><main class="main">${html}</main></div>`}
function logout(){setMe(null);go('#/')}
/* ---------- PAGES ---------- */
async function landing(){
 app.innerHTML=topbar()+`<section class="hero"><h1>Get Your Study Notes <span>Instantly!</span></h1><p>Buy and download quality academic notes with ease.</p><a class="btn gold" href="#/browse">Browse Notes →</a></section>
 <div class="perks"><span>⚡ Instant Download</span><span>🔒 Secure Payment</span><span>🕑 24/7 Support</span></div>
 <div class="wrap"><h2 style="margin-bottom:12px">Featured Notes</h2><div class="grid" id="feat"><p>Loading...</p></div></div>`+footer();
 try{const n=(await notes()).slice(0,3);$('#feat').innerHTML=n.map(x=>noteCard(x)).join('')||'<p>No notes yet.</p>'}
 catch(e){$('#feat').innerHTML=`<p style="color:var(--bad)">Could not load notes: ${esc(e.message)}</p>`}}
function footer(){return `<footer class="foot"><span>© ${new Date().getFullYear()} NotesHub</span><span><a href="#/browse">Notes</a><a href="#/auth">Student Login</a><a href="#/admin">Admin Portal</a></span></footer>`}
function adminLogin(){
 app.innerHTML=topbar()+`<div class="authbox card"><h3 style="text-align:center;margin-bottom:12px">Admin Portal</h3><input id="e" type="email" placeholder="Admin Email"><input id="pw" type="password" placeholder="Password"><button class="btn full" id="go">Login</button></div>`;
 $('#go').onclick=()=>{if($('#e').value.trim().toLowerCase()===ADMIN.email&&$('#pw').value===ADMIN.pass){setMe({admin:true,name:'Admin',email:ADMIN.email});go('#/a/dash')}else toast('Invalid admin credentials')}}
async function browse(){
 const all=await notes();
 const draw=(q='',c='')=>all.filter(n=>n.title.toLowerCase().includes(q.toLowerCase())&&(!c||n.course===c));
 const courses=[...new Set(all.map(n=>n.course).filter(Boolean))];
 const body=`<h2>Browse Notes</h2><div style="display:flex;gap:10px;margin:12px 0"><input id="q" placeholder="Search notes..."><select id="c" style="max-width:200px"><option value="">All Courses</option>${courses.map(c=>`<option>${esc(c)}</option>`).join('')}</select></div><div class="grid" id="res"></div>`;
 me&&!me.admin?shell('s','browse',body):(app.innerHTML=topbar()+`<div class="wrap">${body}</div>`);
 const upd=()=>$('#res').innerHTML=draw($('#q').value,$('#c').value).map(n=>noteCard(n)).join('')||'<p>No notes found.</p>';
 $('#q').oninput=upd;$('#c').onchange=upd;upd()}
function auth(){
 app.innerHTML=topbar()+`<div class="authbox card"><h3 style="text-align:center;margin-bottom:12px">Student Portal</h3><div class="tabs"><button id="t1" class="on">Register</button><button id="t2">Login</button></div><div id="f"></div></div>`;
 const reg=()=>{$('#t1').className='on';$('#t2').className='';$('#f').innerHTML=`<input id="n" placeholder="Full Name"><input id="e" type="email" placeholder="Email Address"><input id="p" placeholder="Phone Number"><input id="pw" type="password" placeholder="Password"><input id="pw2" type="password" placeholder="Confirm Password"><button class="btn full" id="go">Create Account</button>`;
  $('#go').onclick=async()=>{const v=id=>$('#'+id).value.trim(),email=v('e').toLowerCase();
   if(!v('n')||!email||!v('p')||v('pw').length<6)return toast('Fill all fields (password min 6)');
   if(v('pw')!==v('pw2'))return toast('Passwords do not match');
   const uid=email.replace(/[.#$\[\]\/@]/g,'_');
   if(await db.get('users/'+uid))return toast('Account already exists');
   const u={name:v('n'),email,phone:v('p'),pass:await hash(v('pw')),created:Date.now()};
   await db.put('users/'+uid,u);setMe({uid,name:u.name,email,phone:u.phone});go('#/s/dash')}};
 const log=()=>{$('#t2').className='on';$('#t1').className='';$('#f').innerHTML=`<input id="e" type="email" placeholder="Email"><input id="pw" type="password" placeholder="Password"><button class="btn full" id="go">Login</button>`;
  $('#go').onclick=async()=>{const email=$('#e').value.trim().toLowerCase(),pw=$('#pw').value;
   const uid=email.replace(/[.#$\[\]\/@]/g,'_'),u=await db.get('users/'+uid);
   if(!u||u.pass!==await hash(pw))return toast('Invalid email or password');
   setMe({uid,name:u.name,email,phone:u.phone});go('#/s/dash')}};
 $('#t1').onclick=reg;$('#t2').onclick=log;reg()}
async function myPurchases(){return list(await db.get('purchases')).filter(p=>p.uid===me.uid).sort((a,b)=>b.date-a.date)}
async function sDash(){
 const p=await myPurchases(),tot=p.reduce((s,x)=>s+x.amount,0);
 shell('s','dash',`<h2>Dashboard</h2><p>Welcome back, ${esc(me.name)}!</p><div class="stats"><div class="card stat"><small>Purchased</small><b>${p.length}</b></div><div class="card stat"><small>Downloads</small><b>${p.length}</b></div><div class="card stat"><small>Total Spent</small><b>${money(tot)}</b></div></div><h3>Recent Activity</h3><div class="card">${p.slice(0,5).map(x=>`<p style="padding:6px 0">📄 <b>${esc(x.title)}</b> — ${new Date(x.date).toLocaleDateString()} <span style="float:right">${money(x.amount)}</span></p>`).join('')||'No purchases yet.'}</div><p style="margin-top:16px"><a class="btn gold" href="#/s/browse">Browse Notes</a></p>`)}
async function sPurch(page){
 const p=await myPurchases();
 shell('s',page,`<h2>${page==='downloads'?'My Downloads':'My Purchases'}</h2><br><table><tr><th>Note</th><th>Amount</th><th>Date</th><th></th></tr>${p.map(x=>`<tr><td>${esc(x.title)}</td><td>${money(x.amount)}</td><td>${new Date(x.date).toLocaleDateString()}</td><td><button class="btn sm" onclick="dl('${x.noteId}')">Download</button></td></tr>`).join('')||'<tr><td colspan=4>Nothing yet.</td></tr>'}</table>`)}
async function dl(id){const n=await db.get('notes/'+id);if(!n?.pdf)return toast('File not available');const a=document.createElement('a');a.href=n.pdf;a.download=n.title+'.pdf';a.click()}
function sProfile(){shell('s','profile',`<h2>Profile</h2><div class="card" style="max-width:400px;margin-top:12px"><p><b>Name:</b> ${esc(me.name)}</p><p><b>Email:</b> ${esc(me.email)}</p><p><b>Phone:</b> ${esc(me.phone)}</p></div>`)}
/* ---------- CHECKOUT ---------- */
async function buy(id){
 if(!me||me.admin){toast('Please login as a student to buy');return go('#/auth')}
 const n=await db.get('notes/'+id);if(!n)return;n.id=id;
 const m=document.createElement('div');m.className='modal';
 m.innerHTML=`<div class="card"><h3>${esc(n.title)} — ${money(n.price)}</h3><p style="margin:10px 0;font-size:14px">Name: ${esc(me.name)}<br>Email: ${esc(me.email)}<br>Phone: ${esc(me.phone)}</p><label>Select Payment Method</label><div class="radio"><input type="radio" name="pm" value="mobile_money" checked> Mobile Money (MTN, AirtelTigo, Telecel)</div><div class="radio"><input type="radio" name="pm" value="card"> Card (Visa, Mastercard)</div><button class="btn gold full" id="pay">🔒 Pay Now</button><button class="btn out full" style="color:#555;border-color:#ccc;margin-top:8px" id="x">Cancel</button><p style="font-size:12px;color:var(--mut);margin-top:8px;text-align:center">Your payment is secure and encrypted</p></div>`;
 document.body.appendChild(m);$('#x').onclick=()=>m.remove();
 $('#pay').onclick=()=>{
  const ch=document.querySelector('input[name=pm]:checked').value;
  PaystackPop.setup({key:PAYSTACK_PK,email:me.email,amount:Math.round(n.price*100),currency:'GHS',channels:[ch],ref:'NH'+Date.now(),
   callback:r=>{db.post('purchases',{uid:me.uid,noteId:id,title:n.title,amount:Number(n.price),ref:r.reference,date:Date.now(),student:me.name,email:me.email}).then(()=>{m.remove();toast('Payment successful!');go('#/s/downloads')})},
   onClose:()=>toast('Payment cancelled')}).openIframe()}}
/* ---------- ADMIN ---------- */
async function aDash(){
 const [n,u,p]=await Promise.all([notes(false),db.get('users'),db.get('purchases')]),P=list(p),rev=P.reduce((s,x)=>s+x.amount,0);
 const days=[...Array(7)].map((_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return{l:d.toLocaleDateString('en',{weekday:'short'}),k:d.toDateString(),c:0}});
 P.forEach(x=>{const d=days.find(y=>y.k===new Date(x.date).toDateString());d&&d.c++});const mx=Math.max(1,...days.map(d=>d.c));
 const top={};P.forEach(x=>top[x.title]=(top[x.title]||0)+1);
 shell('a','dash',`<h2>Dashboard</h2><div class="stats"><div class="card stat"><small>Total Notes</small><b>${n.length}</b></div><div class="card stat"><small>Total Students</small><b>${Object.keys(u||{}).length}</b></div><div class="card stat"><small>Total Sales</small><b>${P.length}</b></div><div class="card stat"><small>Total Revenue</small><b>${money(rev)}</b></div></div>
 <div class="two"><div class="card"><h3>Sales Overview (7 days)</h3><div class="bars">${days.map(d=>`<div><i style="height:${d.c/mx*120}px"></i>${d.l}</div>`).join('')}</div></div><div class="card"><h3>Top Selling Notes</h3>${Object.entries(top).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([t,c])=>`<p style="padding:6px 0">${esc(t)} — ${c} sales</p>`).join('')||'No sales yet.'}</div></div>`)}
function aUpload(){
 shell('a','upload',`<h2>Upload Notes</h2><div class="card" style="max-width:560px;margin-top:12px"><label>Note Title *</label><input id="t" placeholder="e.g. Mathematics Notes"><label>Course *</label><input id="c" placeholder="e.g. SHS"><label>Subject *</label><input id="s" placeholder="e.g. Mathematics"><label>Academic Level</label><select id="l"><option>SHS</option><option>JHS</option><option>University</option></select><label>Cover Image (PNG/JPG, under 300KB)</label><input id="img" type="file" accept="image/*"><label>PDF File (under 5MB)</label><input id="pdf" type="file" accept=".pdf"><label>Description</label><textarea id="d"></textarea><label>Price (GH₵) *</label><input id="p" type="number" min="1" step="0.5"><label>Status</label><select id="st"><option value="published">Publish</option><option value="draft">Draft</option></select><button class="btn" id="up">Upload Notes</button></div>`);
 $('#up').onclick=async()=>{const i=$('#img').files[0],f=$('#pdf').files[0];
  if(!$('#t').value||!$('#p').value||!f)return toast('Title, price and PDF are required');
  if(f.size>5e6||(i&&i.size>3e5))return toast('File too large');
  await db.post('notes',{title:$('#t').value,course:$('#c').value,subject:$('#s').value,level:$('#l').value,description:$('#d').value,price:+$('#p').value,status:$('#st').value,cover:await file64(i),pdf:await file64(f),created:Date.now()});
  toast('Note uploaded');go('#/a/manage')}}
async function aManage(){
 const [n,P]=await Promise.all([notes(false),db.get('purchases').then(list)]);
 shell('a','manage',`<h2>Manage Notes</h2><br><table><tr><th>#</th><th>Title</th><th>Course</th><th>Price</th><th>Purchases</th><th>Status</th><th>Action</th></tr>${n.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.title)}</td><td>${esc(x.course)}</td><td>${money(x.price)}</td><td>${P.filter(p=>p.noteId===x.id).length}</td><td><span class="tag ${x.status==='draft'?'d':''}">${x.status==='draft'?'Draft':'Published'}</span></td><td><button class="btn sm" onclick="tog('${x.id}','${x.status}')">${x.status==='draft'?'Publish':'Unpublish'}</button> <button class="btn sm red" onclick="rm('${x.id}')">Delete</button></td></tr>`).join('')||'<tr><td colspan=7>No notes.</td></tr>'}</table>`)}
async function tog(id,s){await db.patch('notes/'+id,{status:s==='draft'?'published':'draft'});aManage()}
async function rm(id){if(confirm('Delete this note?')){await db.del('notes/'+id);aManage()}}
async function aPrices(){
 const n=await notes(false);
 shell('a','prices',`<h2>Set Prices</h2><br><table><tr><th>Note</th><th>Current</th><th>New</th><th></th></tr>${n.map(x=>`<tr><td>${esc(x.title)}</td><td>${money(x.price)}</td><td><input id="np${x.id}" type="number" value="${x.price}" style="margin:0;width:100px"></td><td><button class="btn sm" onclick="setP('${x.id}')">Update</button></td></tr>`).join('')}</table>`)}
async function setP(id){const v=+$('#np'+id).value;if(v>0){await db.patch('notes/'+id,{price:v});toast('Price updated');aPrices()}}
async function aStudents(){
 const u=list(await db.get('users'));
 shell('a','students',`<h2>Students</h2><br><table><tr><th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th></tr>${u.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.name)}</td><td>${esc(x.email)}</td><td>${esc(x.phone)}</td><td>${new Date(x.created).toLocaleDateString()}</td></tr>`).join('')||'<tr><td colspan=5>No students yet.</td></tr>'}</table>`)}
async function aSales(){
 const P=list(await db.get('purchases')).sort((a,b)=>b.date-a.date),rev=P.reduce((s,x)=>s+x.amount,0);
 shell('a','sales',`<h2>Sales</h2><div class="stats"><div class="card stat"><small>Total Sales</small><b>${P.length}</b></div><div class="card stat"><small>Total Revenue</small><b>${money(rev)}</b></div></div><button class="btn sm" onclick="csv()">Export CSV</button><br><br><table><tr><th>Student</th><th>Email</th><th>Note</th><th>Amount</th><th>Date</th><th>Status</th></tr>${P.map(x=>`<tr><td>${esc(x.student)}</td><td>${esc(x.email)}</td><td>${esc(x.title)}</td><td>${money(x.amount)}</td><td>${new Date(x.date).toLocaleDateString()}</td><td><span class="tag">Paid</span></td></tr>`).join('')}</table>`)}
async function csv(){const P=list(await db.get('purchases'));const t='Student,Email,Note,Amount,Date,Ref\n'+P.map(x=>[x.student,x.email,x.title,x.amount,new Date(x.date).toISOString(),x.ref].map(v=>`"${v}"`).join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/csv'}));a.download='sales.csv';a.click()}
async function aSettings(){
 const s=await db.get('settings')||{};
 shell('a','settings',`<h2>Settings</h2><div class="card" style="max-width:440px;margin-top:12px"><label>Website Name</label><input id="w" value="${esc(s.name||'NotesHub')}"><label>Contact Email</label><input id="e" value="${esc(s.email||'')}"><label>Phone Number</label><input id="p" value="${esc(s.phone||'')}"><label>Currency</label><input value="GH₵ (Ghana Cedi)" disabled><button class="btn" id="sv">Save Settings</button></div>`);
 $('#sv').onclick=async()=>{await db.put('settings',{name:$('#w').value,email:$('#e').value,phone:$('#p').value});toast('Saved')}}
/* ---------- ROUTER ---------- */
const routes={'':landing,'browse':browse,'auth':auth,'admin':adminLogin,'s/dash':sDash,'s/browse':browse,'s/purchases':()=>sPurch('purchases'),'s/downloads':()=>sPurch('downloads'),'s/profile':sProfile,
 'a/dash':aDash,'a/upload':aUpload,'a/manage':aManage,'a/prices':aPrices,'a/students':aStudents,'a/sales':aSales,'a/settings':aSettings};
function route(){
 const r=location.hash.replace(/^#\/?/,'');
 if(r.startsWith('s/')&&(!me||me.admin))return go('#/auth');
 if(r.startsWith('a/')&&!(me&&me.admin))return go('#/admin');
 Promise.resolve().then(()=>(routes[r]||landing)()).catch(showErr)}
function showErr(e){console.error(e);app.innerHTML=topbar()+`<div class="wrap"><div class="card"><h3>Something went wrong</h3><p style="margin-top:8px;color:var(--bad)">${esc(e.message||e)}</p><p style="margin-top:8px;font-size:13px">Check your internet connection and that the Firebase database rules allow access.</p></div></div>`}
addEventListener('error',e=>{if(!app.innerHTML.trim())showErr(e.error||e.message)});
addEventListener('hashchange',route);route();
