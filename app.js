const API='https://api.jikan.moe/v4';
const SUPABASE_URL='';
const SUPABASE_PUBLISHABLE_KEY='';
const supabaseClient=(SUPABASE_URL&&SUPABASE_PUBLISHABLE_KEY&&window.supabase)?window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY):null;

const FALLBACK=[
 {name:'Frieren: Beyond Journey’s End',malId:52991,genres:['Adventure','Drama','Fantasy'],episodes:28},
 {name:'Haikyuu!!',malId:20583,genres:['Sports','Comedy'],episodes:85},
 {name:'Spy x Family',malId:50265,genres:['Comedy','Action','Slice of Life'],episodes:37},
 {name:'Violet Evergarden',malId:33352,genres:['Drama','Fantasy'],episodes:13},
 {name:'Mob Psycho 100',malId:32182,genres:['Action','Comedy','Supernatural'],episodes:37},
 {name:'Death Note',malId:1535,genres:['Mystery','Psychological','Thriller'],episodes:37}
];
let catalog=JSON.parse(localStorage.getItem('animeMoodCatalogCache')||'[]');
if(!Array.isArray(catalog)||catalog.length<6)catalog=[...FALLBACK];
let answers={current:[],desired:[],energy:'medium',pacing:'medium',length:'any',intensity:'medium',comedy:'medium'};
let q=0,searchToken=0,feedbackState=null,discoverMode='popular',listFilter='all',authUser=null;

const QUESTIONS=[
 {key:'current',title:'How do you feel right now?',multi:true,opts:[['happy','Good / upbeat'],['sad','Sad / low'],['lonely','Lonely'],['stressed','Stressed'],['bored','Bored'],['motivated','Motivated'],['curious','Curious'],['emotional','Emotional']]},
 {key:'desired',title:'What do you want to feel?',multi:true,opts:[['laugh','Laugh'],['comfort','Comforted'],['hope','Hopeful'],['adrenaline','Energized'],['catharsis','Emotional catharsis'],['inspired','Inspired'],['dark','Dark / intense'],['romance','Romantic'],['wonder','Mind-blown']]},
 {key:'energy',title:'How much energy do you want?',multi:false,opts:[['low','Low','Easy to watch'],['medium','Medium','Balanced'],['high','High','Keep me engaged']]},
 {key:'pacing',title:'What pacing sounds right?',multi:false,opts:[['low','Slow','Atmospheric'],['medium','Medium','Balanced'],['high','Fast','Constant momentum']]},
 {key:'length',title:'How much commitment?',multi:false,opts:[['short','Short','~1–13 episodes'],['medium','Medium','~14–50 episodes'],['long','Long','Big commitment'],['any','Any','I don’t care']]},
 {key:'intensity',title:'How emotionally intense?',multi:false,opts:[['low','Light','Low stakes'],['medium','Medium','Some weight'],['high','Heavy','Hit me hard']]},
 {key:'comedy',title:'How much comedy?',multi:false,opts:[['low','Low','Mostly serious'],['medium','Some','A little balance'],['high','High','Make me laugh']]}
];

const MOOD_GENRES={
 laugh:['Comedy','Slice of Life','Family'],comfort:['Slice of Life','Fantasy','Family','Romance','Music'],
 hope:['Adventure','Sports','Drama','Fantasy','Music'],adrenaline:['Action','Sports','Thriller','Adventure'],
 catharsis:['Drama','Romance','Supernatural','Fantasy'],inspired:['Sports','Drama','Adventure','Music'],
 dark:['Psychological','Horror','Thriller','Mystery'],romance:['Romance','Drama','Comedy','Slice of Life'],
 wonder:['Mystery','Sci-Fi','Fantasy','Psychological']
};
const CURRENT_BONUS={
 sad:['Drama','Romance','Slice of Life'],lonely:['Drama','Romance','Slice of Life'],
 stressed:['Comedy','Slice of Life','Fantasy'],bored:['Action','Sports','Adventure','Comedy'],
 motivated:['Sports','Action','Adventure'],curious:['Mystery','Psychological','Sci-Fi','Fantasy'],
 emotional:['Drama','Romance','Supernatural'],happy:['Comedy','Sports','Slice of Life']
};
const PACE={Action:8,Sports:8,Thriller:8,Comedy:7,Mystery:7,Adventure:7,Fantasy:6,'Sci-Fi':6,Romance:5,Drama:4,'Slice of Life':4,Horror:7,Psychological:7,Music:5,Family:4,Supernatural:6};
const EMOTION={Drama:9,Psychological:9,Thriller:8,Romance:7,Supernatural:7,Fantasy:6,Action:7,Adventure:6,Sports:7,Mystery:7,'Sci-Fi':6,Comedy:4,'Slice of Life':3,Family:3,Music:5,Horror:9};
const COMEDY={Comedy:9,'Slice of Life':6,Family:7,Sports:6,Romance:5,Adventure:4,Fantasy:4,Action:3,Drama:2,Thriller:1,Psychological:1,Horror:1,Mystery:2,'Sci-Fi':2,Supernatural:3,Music:5};
const TEXT_SIGNALS={
 comfort:['cozy','comfort','warm','relax','relaxing','wholesome','healing','peaceful','calm','safe','cozy'],
 hype:['hype','action','excited','energy','fight','fighting','badass','adrenaline','intense'],
 cry:['cry','sad','heartbreak','emotional','tears','devastated','catharsis'],
 laugh:['funny','laugh','comedy','fun','silly','goofy'],
 mind:['mind','smart','complex','mystery','twist','psychological','think','brain'],
 romance:['romance','romantic','love','relationship','couple'],
 dark:['dark','grim','disturbing','horror','thriller','violent','serious'],
 wonder:['wonder','beautiful','magical','fantasy','adventure','world'],
 inspired:['inspired','motivated','motivation','uplifting','hope','hopeful']
};
const MODE_MAP={
 comfort:{current:['stressed'],desired:['comfort','hope'],energy:'low',pacing:'low',intensity:'low',comedy:'medium'},
 hype:{current:['bored'],desired:['adrenaline','inspired'],energy:'high',pacing:'high',intensity:'high',comedy:'low'},
 cry:{current:['sad'],desired:['catharsis'],energy:'medium',pacing:'low',intensity:'high',comedy:'low'},
 laugh:{current:['bored'],desired:['laugh','comfort'],energy:'medium',pacing:'medium',intensity:'low',comedy:'high'},
 mind:{current:['curious'],desired:['wonder','dark'],energy:'medium',pacing:'medium',intensity:'high',comedy:'low'},
 surprise:{current:[],desired:[],energy:'medium',pacing:'medium',intensity:'medium',comedy:'medium'}
};

function $(id){return document.getElementById(id)}
function safeText(s){return String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function scrollToId(id){$(id)?.scrollIntoView({behavior:'smooth',block:'start'})}
function toast(msg){let t=$('toast');if(!t){t=document.createElement('div');t.id='toast';t.className='toast';document.body.appendChild(t)}t.textContent=msg;t.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove('show'),2800)}
function imageUrl(a){return a?.images?.jpg?.large_image_url||a?.images?.webp?.large_image_url||a?.images?.jpg?.image_url||a?.images?.webp?.image_url||''}
function imageSrc(a){const raw=imageUrl(a);return imageProxyUrl(raw)||raw}
function imageProxyUrl(raw){return raw?'https://images.weserv.nl/?url='+encodeURIComponent(raw.replace(/^https?:\/\//,'')):''}
function normalizeTitle(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'')}
function findAnime(key){const raw=String(key||'');return catalog.find(a=>String(a.malId||'')===raw)||catalog.find(a=>normalizeTitle(a.name)===normalizeTitle(raw))}
function getList(){return JSON.parse(localStorage.getItem('animeMoodList')||'{}')}
function setList(x){localStorage.setItem('animeMoodList',JSON.stringify(x));renderList();renderBrain()}
function getProfile(){return JSON.parse(localStorage.getItem('animeMoodProfile')||'{}')}
function setProfile(x){localStorage.setItem('animeMoodProfile',JSON.stringify(x))}
function getFeedback(){return JSON.parse(localStorage.getItem('animeMoodFeedback')||'[]')}

function renderQ(){
 const x=QUESTIONS[q],v=answers[x.key]||[],values=Array.isArray(v)?v:[v];
 $('bar').style.width=((q+1)/QUESTIONS.length*100)+'%';
 $('question').innerHTML='<div class="q">'+x.title+'</div><div class="choices">'+x.opts.map(o=>'<button class="choice '+(values.includes(o[0])?'selected':'')+'" data-pick="'+safeText(o[0])+'"><b>'+safeText(o[1])+'</b>'+(o[2]?'<small>'+safeText(o[2])+'</small>':'')+'</button>').join('')+'</div>';
}
function pick(v){const x=QUESTIONS[q];if(x.multi){let a=Array.isArray(answers[x.key])?answers[x.key]:[];a=a.includes(v)?a.filter(z=>z!==v):a.length<3?[...a,v]:a;answers[x.key]=a}else answers[x.key]=v;renderQ()}
function next(){if(q<QUESTIONS.length-1){q++;renderQ()}else showResults()}
function back(){if(q>0){q--;renderQ()}}

function parseMoodText(){
 const text=($('moodText')?.value||'').toLowerCase();
 const desired=[],current=[];
 Object.entries(TEXT_SIGNALS).forEach(([k,words])=>{if(words.some(w=>text.includes(w))){if(['laugh','comfort','hope','adrenaline','catharsis','inspired','dark','romance','wonder'].includes(k))desired.push(k);else current.push(k)}});
 if(text.includes('tired')||text.includes('exhausted')||text.includes('drained')){answers.energy='low';answers.current.push('stressed')}
 if(text.includes('need something fast')||text.includes('keep me awake'))answers.pacing='high';
 if(text.includes('short')||text.includes('one night'))answers.length='short';
 answers.current=[...new Set([...(answers.current||[]),...current])].slice(0,3);
 answers.desired=[...new Set([...(answers.desired||[]),...desired])].slice(0,3);
}
function applyMode(mode){
 const m=MODE_MAP[mode];if(!m)return;
 answers={...answers,...m,current:[...m.current],desired:[...m.desired]};
 if(mode==='surprise'){$('moodText').value='Surprise me with something I probably would not pick, but will probably enjoy.'}
 renderQ();toast('Mode applied — finish the quiz or hit Next to get recommendations.');scrollToId('quiz')
}

function profileBoost(a){
 const p=getProfile();let s=0;
 const fav=p.favorite_genres||[];const avoid=p.avoided_genres||[];
 s+=(a.genres||[]).filter(g=>fav.includes(g)).length*7;
 s-=(a.genres||[]).filter(g=>avoid.includes(g)).length*12;
 if(p.preferred_pacing&&p.preferred_pacing!=='any'){const target={low:3,medium:6,high:9}[p.preferred_pacing];const st=derivedStats(a);s+=Math.max(0,8-Math.abs(st.pace-target))*1.5}
 return s
}
function watchedPenalty(a){const list=getList();const id=String(a.malId||a.name);return list[id]?.status==='dropped'?-30:list[id]? -70:0}
function feedbackAdjust(a){
 const h=getFeedback();if(!h.length)return 0;let s=0;
 h.slice(-30).forEach(x=>{const genres=new Set(x.genres||[]);const overlap=(a.genres||[]).filter(g=>genres.has(g)).length;s+=x.type==='exact'?overlap*3:x.type==='wrong'?-overlap*4:x.type==='close'?overlap:0});
 return s
}
function textBoost(a){
 const t=($('moodText')?.value||'').toLowerCase();if(!t)return 0;let s=0;
 const blob=((a.name||'')+' '+(a.synopsis||'')+' '+(a.genres||[]).join(' ')+' '+(a.themes||[]).join(' ')).toLowerCase();
 Object.entries(TEXT_SIGNALS).forEach(([k,words])=>{if(words.some(w=>t.includes(w))&&blob.includes(k))s+=3});
 return s
}
function derivedStats(a){
 const gs=a.genres||[];const avg=(map,def)=>gs.length?gs.reduce((n,g)=>n+(map[g]||def),0)/gs.length:def;
 return {pace:a.pace??avg(PACE,6),emotion:a.emotion??avg(EMOTION,6),comedy:a.comedy??avg(COMEDY,5)}
}
function scoreAnime(a){
 const st=derivedStats(a),genres=a.genres||[],cur=answers.current||[],want=answers.desired||[];let s=0;
 const desiredGenres=new Set(want.flatMap(x=>MOOD_GENRES[x]||[])),currentGenres=new Set(cur.flatMap(x=>CURRENT_BONUS[x]||[]));
 const energy={low:3,medium:6,high:9}[answers.energy]||6,paceTarget={low:3,medium:6,high:9}[answers.pacing]||6,intensity={low:3,medium:6,high:9}[answers.intensity]||6,comedy={low:2,medium:5,high:9}[answers.comedy]||5;
 s+=genres.filter(g=>desiredGenres.has(g)).length*25;
 s+=genres.filter(g=>currentGenres.has(g)).length*8;
 s+=Math.max(0,10-Math.abs(st.pace-energy))*2;
 s+=Math.max(0,10-Math.abs(st.pace-paceTarget))*3;
 s+=Math.max(0,10-Math.abs(st.emotion-intensity))*2.5;
 s+=Math.max(0,10-Math.abs(st.comedy-comedy))*2;
 if(answers.length==='short')s+=a.episodes&&a.episodes<=13?18:-10;
 if(answers.length==='medium')s+=a.episodes&&a.episodes>13&&a.episodes<=50?14:-4;
 if(answers.length==='long')s+=a.episodes&&a.episodes>40?16:-4;
 if(answers.length==='any')s+=2;
 if(want.includes('comfort'))s+=genres.filter(g=>['Slice of Life','Family','Fantasy','Romance','Music'].includes(g)).length*6;
 if(want.includes('laugh'))s+=genres.includes('Comedy')?15:0;
 if(want.includes('dark'))s+=genres.filter(g=>['Psychological','Horror','Thriller','Mystery'].includes(g)).length*9;
 if(want.includes('romance'))s+=genres.includes('Romance')?15:0;
 if(want.includes('wonder'))s+=genres.filter(g=>['Mystery','Sci-Fi','Fantasy','Psychological'].includes(g)).length*7;
 if(want.includes('catharsis'))s+=genres.filter(g=>['Drama','Romance','Supernatural'].includes(g)).length*7;
 if(want.includes('adrenaline'))s+=genres.filter(g=>['Action','Sports','Adventure','Thriller'].includes(g)).length*7;
 if(want.includes('inspired'))s+=genres.filter(g=>['Sports','Adventure','Music','Drama'].includes(g)).length*6;
 if(want.includes('comfort')&&genres.some(g=>['Horror','Psychological','Thriller'].includes(g)))s-=14;
 if(cur.includes('stressed')&&genres.includes('Horror'))s-=10;
 s+=Math.min(12,(a.score||0)*1.2);
 if(a.popularity)s+=Math.max(0,8-Math.log10(a.popularity))*0.7;
 s+=profileBoost(a)+feedbackAdjust(a)+textBoost(a)+watchedPenalty(a);
 return Math.round(s*10)/10;
}
function explain(a){
 const st=derivedStats(a),c=(answers.current||[]).join(', ')||'your current mood',d=(answers.desired||[]).join(', ')||'a good experience';
 const matched=(answers.desired||[]).flatMap(x=>MOOD_GENRES[x]||[]).filter(g=>(a.genres||[]).includes(g)).slice(0,3);
 const reasons=matched.length?matched.join(', '):(a.genres||[]).slice(0,2).join(' + ')||'its overall tone';
 return 'You feel '+c+' and want '+d+'. '+a.name+' matches through '+reasons+', with '+Math.round(st.pace)+'/10 pacing and '+Math.round(st.emotion)+'/10 emotional intensity.';
}

function card(a,label){
 const raw=imageUrl(a),proxy=imageProxyUrl(raw),key=String(a.malId||a.name),list=getList(),saved=list[key];
 const genres=(a.genres||[]).slice(0,3);
 return '<article class="card"><div class="poster '+(raw?'':'no-image')+'">'+(raw?'<img src="'+safeText(proxy||raw)+'" data-raw-src="'+safeText(raw)+'" data-proxy-src="'+safeText(proxy)+'" loading="lazy" referrerpolicy="no-referrer" alt="'+safeText(a.name)+' poster">':'')+'<span class="rank">'+safeText(label)+'</span><h3>'+safeText(a.name)+'</h3></div><div class="body"><div>'+genres.map(g=>'<span class="tag">'+safeText(g)+'</span>').join(' ')+'</div><p class="why"><b>Why it matches:</b> '+safeText(explain(a))+'</p><div class="meta"><span>'+Math.round(a.fit||a.score||0)+' fit</span><span>'+(a.episodes||'?')+' eps</span></div><div class="buttons"><button class="watch" data-preview-id="'+safeText(key)+'">Preview</button><button data-watch-id="'+safeText(key)+'">Where to watch</button></div><div class="list-add"><select data-list-select="'+safeText(key)+'"><option value="watching" '+(saved?.status==='watching'?'selected':'')+'>Watching</option><option value="completed" '+(saved?.status==='completed'?'selected':'')+'>Completed</option><option value="plan" '+(saved?.status==='plan'?'selected':'')+'>Plan to Watch</option><option value="dropped" '+(saved?.status==='dropped'?'selected':'')+'>Dropped</option></select><button data-save-id="'+safeText(key)+'">'+(saved?'Update':'＋ My List')+'</button></div></div></article>';
}

function showResults(){
 parseMoodText();
 let ranked=catalog.filter(a=>a.name).map(a=>({...a,fit:scoreAnime(a)})).filter(a=>!getList()[String(a.malId||a.name)]).sort((a,b)=>b.fit-a.fit);
 if(!ranked.length)ranked=catalog.map(a=>({...a,fit:scoreAnime(a)})).sort((a,b)=>b.fit-a.fit);
 const strong=ranked.slice(0,3),pool=ranked.slice(3);
 let wild=null;
 if(pool.length){const idx=Math.abs((answers.desired||[]).join('').length*7+(answers.current||[]).join('').length*13)%Math.min(pool.length,25);wild=pool[idx]}
 const rest=pool.filter(a=>!wild||String(a.malId)!==String(wild.malId)).slice(0,46);
 const picks=[...strong,...(wild?[wild]:[]),...rest];
 picks.forEach((a,i)=>a.recommendationType=i<3?'strong':i===3?'wildcard':'more');
 const top=picks[0]||FALLBACK[0],st=derivedStats(top);
 $('results').classList.remove('hidden');
 $('resultTitle').textContent='Your mood, translated into anime.';
 $('resultIntro').textContent=picks.length+' mood-ranked titles. The engine combines your current state, desired feeling, pacing, intensity, commitment, profile, watch history and feedback.';
 $('profile').innerHTML=['Feeling: '+((answers.current||[]).join(', ')||'open'),'Want: '+((answers.desired||[]).join(', ')||'open'),'Energy: '+answers.energy,'Pacing: '+answers.pacing,'Commitment: '+answers.length,'Intensity: '+answers.intensity].map(x=>'<span class="chip">'+safeText(x)+'</span>').join('');
 $('flow').innerHTML='<div><b>CURRENT MOOD</b><span>'+safeText((answers.current||[]).join(', ')||'open')+'</span></div><div><b>DESIRED EXPERIENCE</b><span>'+safeText((answers.desired||[]).join(', ')||'open')+'</span></div><div><b>ANIME CHARACTERISTICS</b><span>'+safeText((top.genres||[]).slice(0,3).join(' · '))+' · '+Math.round(st.pace)+'/10 pace</span></div><div><b>WHY IT MATCHES</b><span>'+safeText(explain(top))+'</span></div>';
 $('resultsGrid').innerHTML=picks.map((a,i)=>card(a,i===0?'🥇 Strong Match':i===1?'🥈 Strong Match':i===2?'🥉 Strong Match':i===3?'🃏 Your Wild Card':'✦ More Like This')).join('');
 localStorage.setItem('animeMoodLastResults',JSON.stringify(picks.map(a=>({name:a.name,malId:a.malId,genres:a.genres||[],type:a.recommendationType}))));
 renderBrain();scrollToId('results');
}

function feedback(btn,type){
 document.querySelectorAll('.feedback button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
 const last=JSON.parse(localStorage.getItem('animeMoodLastResults')||'[]'),h=getFeedback();
 h.push({type,results:last,genres:[...new Set(last.flatMap(x=>x.genres||[]))],at:new Date().toISOString()});
 localStorage.setItem('animeMoodFeedback',JSON.stringify(h.slice(-50)));
 toast('Saved. Future recommendations will use this signal.');
}

function saveToList(key,status){
 const a=findAnime(key);if(!a)return;
 const list=getList();list[String(a.malId||a.name)]={malId:a.malId,name:a.name,status,genres:a.genres||[],image:imageUrl(a),updatedAt:new Date().toISOString()};
 setList(list);toast(a.name+' → '+statusLabel(status));
}
function statusLabel(s){return ({watching:'Watching',completed:'Completed',plan:'Plan to Watch',dropped:'Dropped'}[s]||s)}
function removeFromList(key){const list=getList();delete list[key];setList(list);toast('Removed from My List.')}
function renderList(){
 const list=getList(),items=Object.entries(list).map(([id,x])=>({...x,id})).filter(x=>listFilter==='all'||x.status===listFilter);
 $('listSummary').textContent=Object.keys(list).length?Object.keys(list).length+' saved anime.':'Nothing saved yet.';
 $('myList').innerHTML=items.length?items.slice(0,20).map(x=>'<div class="mini-item">'+(x.image?'<img src="'+safeText(x.image)+'" alt="">':'')+'<span><b>'+safeText(x.name)+'</b><br><small>'+safeText(statusLabel(x.status))+'</small></span><button class="secondary" data-remove-id="'+safeText(x.id)+'" style="margin-left:auto">×</button></div>').join(''):'<div class="empty-state">Nothing in this shelf yet. Add anime from any card.</div>';
 document.querySelectorAll('[data-list-tab]').forEach(b=>b.classList.toggle('active',b.dataset.listTab===listFilter));
}
function renderBrain(){
 const f=getFeedback(),l=getList(),p=getProfile();
 $('brainStats').innerHTML=['Saved: '+Object.keys(l).length,'Feedback: '+f.length,'Favorite genres: '+((p.favorite_genres||[]).length),'Catalog: '+catalog.length+'+'].map(x=>'<span class="chip">'+safeText(x)+'</span>').join('');
}

function source(key){const a=findAnime(key),title=a?.name||String(key||'');window.open('https://theindex.moe/library/anime?search='+encodeURIComponent(title),'_blank')}
async function previewAnime(key){
 let a=findAnime(key);if(!a){toast('Anime data is still loading. Try again in a moment.');return}
 if(a.malId&&(!a.synopsis||!a.trailer||!imageUrl(a))){try{const j=await fetchJson(API+'/anime/'+a.malId+'/full');if(j.data){a=mergeAnime(j.data,a);upsert([a]);renderDiscover();renderHeroArt()}}catch(e){}}

 $('previewTitle').textContent=a.name;$('previewBody').innerHTML='<div class="notice">Loading anime details…</div>';$('previewModal').classList.add('open');
 const raw=imageUrl(a),proxy=imageProxyUrl(raw),trailer=a.trailer?.embed_url||'',synopsis=a.synopsis||explain(a),saved=getList()[String(a.malId||a.name)];
 $('previewBody').innerHTML=(raw?'<img class="preview-poster" src="'+safeText(proxy||raw)+'" data-raw-src="'+safeText(raw)+'" data-proxy-src="'+safeText(proxy)+'" referrerpolicy="no-referrer" alt="'+safeText(a.name)+' poster">':'<div class="preview-poster no-image"></div>')+
 '<div class="preview-info"><div class="chips"><span class="chip">'+safeText(a.type||'Anime')+'</span><span class="chip">'+safeText(a.status||'Metadata preview')+'</span><span class="chip">'+safeText(a.episodes||'?')+' eps</span><span class="chip">★ '+safeText(a.score||'—')+'</span></div><div class="compat">Your current fit: '+Math.round(scoreAnime(a))+'</div><p>'+safeText(synopsis)+'</p>'+
 (trailer?'<iframe class="preview-video" src="'+safeText(trailer)+'" title="'+safeText(a.name)+' trailer" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>':'<div class="notice">No trailer is available through the current source.</div>')+
 '<div class="preview-extra"><button data-save-preview="'+safeText(a.malId||a.name)+'" data-status="watching">▶ Watching</button><button data-save-preview="'+safeText(a.malId||a.name)+'" data-status="completed">✓ Completed</button><button data-save-preview="'+safeText(a.malId||a.name)+'" data-status="plan">＋ Plan to Watch</button><button data-watch-id="'+safeText(a.malId||a.name)+'">Find where to watch →</button></div></div>';
}
function closePreview(){$('previewModal').classList.remove('open');$('previewBody').innerHTML=''}

function mergeAnime(x,base={}){
 const genres=(x.genres||[]).map(g=>g.name||g),themes=(x.themes||[]).map(g=>g.name||g);
 return {...base,name:x.title_english||x.title||base.name,malId:x.mal_id??base.malId,genres:genres.length?genres:(base.genres||[]),themes,episodes:x.episodes??base.episodes??'?',images:x.images||base.images||{},score:x.score??base.score??0,synopsis:x.synopsis||base.synopsis||'',status:x.status||base.status||'',type:x.type||base.type||'',trailer:x.trailer||base.trailer||null,popularity:x.popularity??base.popularity??0,year:x.year??base.year??null,url:x.url||base.url||''};
}
function upsert(items){
 items.forEach(a=>{const i=catalog.findIndex(x=>String(x.malId)===String(a.malId)||normalizeTitle(x.name)===normalizeTitle(a.name));if(i>=0)catalog[i]={...catalog[i],...a};else catalog.push(a)});
 localStorage.setItem('animeMoodCatalogCache',JSON.stringify(catalog.slice(-500)));
}

async function fetchJson(url){
 const r=await fetch(url);if(r.status===429){await sleep(1600);const r2=await fetch(url);if(!r2.ok)throw new Error('rate limited');return r2.json()}
 if(!r.ok)throw new Error('request failed');return r.json();
}
async function enrichFallbacks(){
 for(const a of FALLBACK){try{const j=await fetchJson(API+'/anime/'+a.malId+'/full');if(j.data)upsert([mergeAnime(j.data,a)])}catch(e){}await sleep(450)}
 renderDiscover();renderHeroArt();
}
async function loadTopCatalog(){
 try{
  for(let page=1;page<=6;page++){
   const j=await fetchJson(API+'/top/anime?limit=25&page='+page+'&sfw=true');
   upsert((j.data||[]).map(x=>mergeAnime(x,{name:x.title,malId:x.mal_id,genres:(x.genres||[]).map(g=>g.name)})));
   renderDiscover();await sleep(900);
  }
  $('discoverStatus').textContent='Featured library: '+catalog.length+' anime cached. Search can reach the broader MyAnimeList catalog.';
  renderHeroArt();renderBrain();
 }catch(e){$('discoverStatus').textContent='Featured library loaded from cache. Search remains available when the live source responds.'}
}
async function searchAnimeRemote(query){
 const token=++searchToken;
 try{
  const j=await fetchJson(API+'/anime?q='+encodeURIComponent(query)+'&limit=25&sfw=true');
  if(token!==searchToken)return;
  const mapped=(j.data||[]).map(x=>mergeAnime(x,{name:x.title,genres:(x.genres||[]).map(g=>g.name)}));
  upsert(mapped);renderDiscover(mapped);
 }catch(e){if(token===searchToken){$('discoverStatus').textContent='Live search is temporarily rate-limited. Try again in a few seconds.';renderDiscover()}}
}
function applyDiscoverFilter(list){
 const f=$('searchFilter')?.value||'all';
 return list.filter(a=>f==='all'||(f==='short'&&(a.episodes||99)<=13)||(f==='movie'&&a.type==='Movie')||(f==='series'&&(a.type==='TV'||a.type==='ONA'||a.type==='OVA'))||(f==='high'&&(a.score||0)>=8));
}
function renderDiscover(list=catalog){
 let base=list;
 if(discoverMode==='new')base=[...base].sort((a,b)=>(b.year||0)-(a.year||0));
 if(discoverMode==='hidden')base=[...base].filter(a=>(a.score||0)>=7&&(a.popularity||99999)>500).sort((a,b)=>(b.score||0)-(a.score||0));
 if(discoverMode==='random')base=[...base].sort(()=>Math.random()-.5);
 base=applyDiscoverFilter(base);
 const qv=($('search')?.value||'').toLowerCase().trim();
 if(qv)base=base.filter(a=>(a.name+' '+(a.genres||[]).join(' ')+' '+(a.themes||[]).join(' ')).toLowerCase().includes(qv));
 $('discoverGrid').innerHTML=base.slice(0,50).map(a=>card(a,'✦ Discover')).join('');
 $('discoverStatus').textContent=qv?'Showing '+Math.min(base.length,50)+' matching titles.':'Showing '+Math.min(base.length,50)+' featured titles.';
}
function renderHeroArt(){
 const box=$('heroArt');if(!box)return;
 const featured=catalog.filter(a=>imageUrl(a)).slice(0,4);if(!featured.length)return;
 box.innerHTML='<div class="hero-posters">'+featured.map((a,i)=>'<div class="hero-poster hp'+i+'"><img src="'+safeText(imageSrc(a))+'" data-raw-src="'+safeText(imageUrl(a))+'" data-proxy-src="'+safeText(imageProxyUrl(imageUrl(a)))+'" referrerpolicy="no-referrer" alt="'+safeText(a.name)+'"></div>').join('')+'</div><div class="anime-kanji">アニメ</div><div class="anime-caption">MOOD × STORY × DISCOVERY</div>';
}

window.addEventListener('error',e=>{
 const t=e.target;if(!t||t.tagName!=='IMG'||!t.dataset)return;
 if(t.dataset.proxySrc&&!t.dataset.proxyTried){t.dataset.proxyTried='1';t.src=t.dataset.proxySrc;return}
 if(t.dataset.rawSrc&&!t.dataset.rawTried){t.dataset.rawTried='1';t.src=t.dataset.rawSrc;return}
 t.removeAttribute('src');t.classList.add('image-failed');const p=t.closest('.poster,.preview-poster');if(p)p.classList.add('no-image');
},true);

function openAuth(){ $('authModal').classList.add('open');refreshAuthUI() }
function closeAuth(){ $('authModal').classList.remove('open') }
function setAuthStatus(msg){$('authStatus').textContent=msg}
function refreshAuthUI(){
 const p=getProfile(),signed=!!authUser;
 $('authFields').classList.toggle('hidden',signed);$('profileFields').classList.toggle('hidden',!signed);
 if(signed){
  $('authTitle').textContent='Your Anime Mood Profile';$('authSub').textContent='Signed in as '+(authUser.email||'your account')+'.';
  $('profileAnime').value=(authUser.user_metadata?.favorite_anime||p.favorite_anime||'');
  $('profilePace').value=(authUser.user_metadata?.preferred_pacing||p.preferred_pacing||'any');
  document.querySelectorAll('.profile-check input').forEach(i=>i.checked=(authUser.user_metadata?.favorite_genres||p.favorite_genres||[]).includes(i.value));
 }else{$('authTitle').textContent='Personalize Anime Mood';$('authSub').textContent='Your preferences work locally now; create an account later to sync across devices.'}
}
async function authSignUp(){
 if(!supabaseClient){saveGuestProfile();setAuthStatus('Guest personalization is active. Add Supabase credentials to enable accounts.');return}
 const email=$('authEmail').value.trim(),password=$('authPassword').value;if(!email||password.length<6){setAuthStatus('Enter an email and a password with at least 6 characters.');return}
 const {data,error}=await supabaseClient.auth.signUp({email,password});if(error){setAuthStatus(error.message);return}authUser=data.user;refreshAuthUI();setAuthStatus(data.session?'Account created and signed in.':'Account created. Check your email if confirmation is enabled.')
}
async function authSignIn(){
 if(!supabaseClient){saveGuestProfile();setAuthStatus('Guest personalization is active on this device. Supabase is needed for real accounts.');return}
 const {data,error}=await supabaseClient.auth.signInWithPassword({email:$('authEmail').value.trim(),password:$('authPassword').value});if(error){setAuthStatus(error.message);return}authUser=data.user;refreshAuthUI()
}
async function authSignOut(){if(supabaseClient)await supabaseClient.auth.signOut();authUser=null;refreshAuthUI()}
function saveGuestProfile(){
 const p={...getProfile(),favorite_anime:$('profileAnime')?.value.trim()||'',preferred_pacing:$('profilePace')?.value||'any',favorite_genres:[...document.querySelectorAll('.profile-check input:checked')].map(i=>i.value)};setProfile(p);renderBrain()
}
async function saveProfile(){
 saveGuestProfile();
 if(supabaseClient&&authUser){
  const p=getProfile(),{data,error}=await supabaseClient.auth.updateUser({data:p});
  $('profileStatus').textContent=error?error.message:'Preferences saved to your account.';if(!error)authUser=data.user
 }else $('profileStatus').textContent='Preferences saved on this device. Connect Supabase later for cross-device sync.'
}
async function initAuth(){if(!supabaseClient)return;const {data}=await supabaseClient.auth.getSession();authUser=data.session?.user||null;supabaseClient.auth.onAuthStateChange((_e,s)=>{authUser=s?.user||null;refreshAuthUI()})}

document.addEventListener('click',e=>{
 const el=e.target.closest('[data-action],[data-pick],[data-preview-id],[data-watch-id],[data-feedback],[data-mode],[data-save-id],[data-save-preview],[data-remove-id],[data-list-tab],[data-discover-mode],[data-overlay]');
 if(!el)return;
 if(el.dataset.overlay==='auth'&&e.target===el){closeAuth();return}
 if(el.dataset.overlay==='preview'&&e.target===el){closePreview();return}
 if(el.dataset.pick){pick(el.dataset.pick);return}
 if(el.dataset.mode){applyMode(el.dataset.mode);return}
 if(el.dataset.previewId){previewAnime(el.dataset.previewId);return}
 if(el.dataset.watchId){source(el.dataset.watchId);return}
 if(el.dataset.feedback){feedback(el,el.dataset.feedback);return}
 if(el.dataset.saveId){const sel=document.querySelector('[data-list-select="'+CSS.escape(el.dataset.saveId)+'"]');saveToList(el.dataset.saveId,sel?.value||'plan');return}
 if(el.dataset.savePreview){saveToList(el.dataset.savePreview,el.dataset.status);return}
 if(el.dataset.removeId){removeFromList(el.dataset.removeId);return}
 if(el.dataset.listTab){listFilter=el.dataset.listTab;renderList();return}
 if(el.dataset.discoverMode){discoverMode=el.dataset.discoverMode;document.querySelectorAll('[data-discover-mode]').forEach(b=>b.classList.toggle('active',b.dataset.discoverMode===discoverMode));renderDiscover();return}
 switch(el.dataset.action){
  case'scroll-quiz':scrollToId('quiz');break;case'scroll-discover':scrollToId('discover');break;case'open-auth':openAuth();break;case'close-auth':closeAuth();break;case'close-preview':closePreview();break;case'back':back();break;case'next':next();break;case'auth-signin':authSignIn();break;case'auth-signup':authSignUp();break;case'auth-signout':authSignOut();break;case'save-profile':saveProfile();break;
 }
});
$('search')?.addEventListener('input',()=>{clearTimeout(window.__search);window.__search=setTimeout(()=>{const qv=$('search').value.trim();renderDiscover();if(qv.length>=2)searchAnimeRemote(qv)},350)});
$('searchFilter')?.addEventListener('change',()=>renderDiscover());

(async()=>{
 renderQ();renderList();renderBrain();renderDiscover();renderHeroArt();refreshAuthUI();initAuth();
 await enrichFallbacks();await loadTopCatalog();
})();

function saveProfileFromAuth(){saveProfile()}