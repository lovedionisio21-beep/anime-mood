const API='https://api.jikan.moe/v4';
const SUPABASE_URL=''; 
const SUPABASE_PUBLISHABLE_KEY='';
const supabaseClient=(SUPABASE_URL&&SUPABASE_PUBLISHABLE_KEY&&window.supabase)?window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY):null;
let authUser=null;
'https://api.jikan.moe/v4';
const fallback=[
{name:'Frieren: Beyond Journey’s End',genres:['Adventure','Drama','Fantasy'],moods:['sad','lonely','curious'],tone:['comfort','hopeful','emotional'],pace:4,emotion:7,comedy:3,episodes:28},
{name:'Haikyuu!!',genres:['Sports','Comedy'],moods:['bored','motivated','sad'],tone:['adrenaline','inspired','funny'],pace:9,emotion:8,comedy:7,episodes:85},
{name:'Spy x Family',genres:['Comedy','Action','Slice of Life'],moods:['stressed','lonely','bored'],tone:['funny','comfort','light'],pace:6,emotion:5,comedy:9,episodes:37},
{name:'Violet Evergarden',genres:['Drama','Fantasy'],moods:['sad','emotional','lonely'],tone:['catharsis','hopeful','romantic'],pace:3,emotion:10,comedy:1,episodes:13},
{name:'Mob Psycho 100',genres:['Action','Comedy','Supernatural'],moods:['bored','motivated','curious'],tone:['adrenaline','funny','inspired'],pace:8,emotion:9,comedy:8,episodes:37},
{name:'Death Note',genres:['Mystery','Psychological','Thriller'],moods:['curious','bored','dark'],tone:['dark','mysterious','thought-provoking'],pace:8,emotion:8,comedy:1,episodes:37}
];
let catalog=[...fallback],q=0,answers={current:[],desired:[],energy:'medium',pacing:'medium',length:'any',intensity:'medium',comedy:'medium'},feedbackState=null;
const questions=[
{key:'current',title:'How do you feel right now?',multi:true,opts:[['happy','Good / upbeat'],['sad','Sad / low'],['lonely','Lonely'],['stressed','Stressed'],['bored','Bored'],['motivated','Motivated'],['curious','Curious'],['emotional','Emotional']]},
{key:'desired',title:'What do you want to feel?',multi:true,opts:[['laugh','Laugh'],['comfort','Comforted'],['hope','Hopeful'],['adrenaline','Energized'],['catharsis','Emotional catharsis'],['inspired','Inspired'],['dark','Dark / intense'],['romance','Romantic'],['wonder','Mind-blown']]},
{key:'energy',title:'How much energy do you want?',multi:false,opts:[['low','Low','Easy to watch'],['medium','Medium','Balanced'],['high','High','Keep me engaged']]},
{key:'pacing',title:'What pacing sounds right?',multi:false,opts:[['low','Slow','Atmospheric'],['medium','Medium','Balanced'],['high','Fast','Constant momentum']]},
{key:'length',title:'How much commitment?',multi:false,opts:[['short','Short','~1–13 episodes'],['medium','Medium','~14–50 episodes'],['long','Long','Big commitment'],['any','Any','I don’t care']]},
{key:'intensity',title:'How emotionally intense?',multi:false,opts:[['low','Light','Low stakes'],['medium','Medium','Some weight'],['high','Heavy','Hit me hard']]},
{key:'comedy',title:'How much comedy?',multi:false,opts:[['low','Low','Mostly serious'],['medium','Some','A little balance'],['high','High','Make me laugh']]}
];
function scrollToId(id){document.getElementById(id).scrollIntoView({behavior:'smooth'})}
function renderQ(){
  const x=questions[q],v=answers[x.key]||[];
  const values=Array.isArray(v)?v:[v];
  document.getElementById('bar').style.width=((q+1)/questions.length*100)+'%';
  document.getElementById('question').innerHTML=
    '<div class="q">'+x.title+'</div>'+
    '<div class="choices">'+
    x.opts.map(o=>'<button class="choice '+(values.includes(o[0])?'selected':'')+'" data-pick="'+o[0]+'"><b>'+o[1]+'</b>'+(o[2]?'<small>'+o[2]+'</small>':'')+'</button>').join('')+
    '</div>';
}
function pick(v){let x=questions[q];if(x.multi){let a=answers[x.key];if(!Array.isArray(a))a=[];a=a.includes(v)?a.filter(z=>z!==v):a.length<3?[...a,v]:a;answers[x.key]=a}else answers[x.key]=v;renderQ()}
function next(){if(q<questions.length-1){q++;renderQ()}else showResults()}
function back(){if(q>0){q--;renderQ()}}
const MOOD_GENRES={laugh:['Comedy','Slice of Life','Family'],comfort:['Slice of Life','Fantasy','Family','Romance'],hope:['Adventure','Sports','Drama','Fantasy','Music'],adrenaline:['Action','Sports','Thriller','Adventure'],catharsis:['Drama','Romance','Supernatural','Fantasy'],inspired:['Sports','Drama','Adventure','Music'],dark:['Psychological','Horror','Thriller','Mystery'],romance:['Romance','Drama','Comedy','Slice of Life'],wonder:['Mystery','Sci-Fi','Fantasy','Psychological']};
const CURRENT_BONUS={sad:['Drama','Romance','Slice of Life'],lonely:['Drama','Romance','Slice of Life'],stressed:['Comedy','Slice of Life','Fantasy'],bored:['Action','Sports','Adventure','Comedy'],motivated:['Sports','Action','Adventure'],curious:['Mystery','Psychological','Sci-Fi','Fantasy'],emotional:['Drama','Romance','Supernatural'],happy:['Comedy','Sports','Slice of Life']};
const PACE_BY_GENRE={Action:8,Sports:8,Thriller:8,Comedy:7,Mystery:7,Adventure:7,Fantasy:6,'Sci-Fi':6,Romance:5,Drama:4,'Slice of Life':4,Horror:7,Psychological:7,Music:5,Family:4,Supernatural:6};
const EMOTION_BY_GENRE={Drama:9,Psychological:9,Thriller:8,Romance:7,Supernatural:7,Fantasy:6,Action:7,Adventure:6,Sports:7,Mystery:7,'Sci-Fi':6,Comedy:4,'Slice of Life':3,Family:3,Music:5,Horror:9};
const COMEDY_BY_GENRE={Comedy:9,'Slice of Life':6,Family:7,Sports:6,Romance:5,Adventure:4,Fantasy:4,Action:3,Drama:2,Thriller:1,Psychological:1,Horror:1,Mystery:2,'Sci-Fi':2,Supernatural:3,Music:5};
function derivedStats(a){const gs=a.genres||[];const avg=(map,def)=>gs.length?gs.reduce((n,g)=>n+(map[g]||def),0)/gs.length:def;return {pace:a.pace??avg(PACE_BY_GENRE,6),emotion:a.emotion??avg(EMOTION_BY_GENRE,6),comedy:a.comedy??avg(COMEDY_BY_GENRE,5)}}
function feedbackAdjust(a){const h=JSON.parse(localStorage.getItem('animeMoodFeedback')||'[]');if(!h.length)return 0;let adj=0;const liked=h.filter(x=>x.type==='exact').slice(-5);const disliked=h.filter(x=>x.type==='wrong').slice(-5);const likedGenres=new Set(liked.flatMap(x=>x.results?.flatMap(r=>r.genres||[])||[]));const dislikedGenres=new Set(disliked.flatMap(x=>x.results?.flatMap(r=>r.genres||[])||[]));adj+=(a.genres||[]).filter(g=>likedGenres.has(g)).length*4;adj-=(a.genres||[]).filter(g=>dislikedGenres.has(g)).length*5;return adj}
function score(a){const st=derivedStats(a),genres=a.genres||[],cur=answers.current||[],want=answers.desired||[];let s=0;const desiredGenres=new Set(want.flatMap(x=>MOOD_GENRES[x]||[]));const currentGenres=new Set(cur.flatMap(x=>CURRENT_BONUS[x]||[]));s+=genres.filter(g=>desiredGenres.has(g)).length*18;s+=genres.filter(g=>currentGenres.has(g)).length*7;const energy={low:3,medium:6,high:9}[answers.energy]||6;const pace={low:3,medium:6,high:9}[answers.pacing]||6;const intensity={low:3,medium:6,high:9}[answers.intensity]||6;const comedy={low:2,medium:5,high:9}[answers.comedy]||5;s+=Math.max(0,10-Math.abs(st.pace-energy))*2;s+=Math.max(0,10-Math.abs(st.pace-pace))*2;s+=Math.max(0,10-Math.abs(st.emotion-intensity))*2;s+=Math.max(0,10-Math.abs(st.comedy-comedy))*1.5;if(answers.length==='short')s+=a.episodes&&a.episodes<=13?15:-6;if(answers.length==='medium')s+=a.episodes&&a.episodes>13&&a.episodes<=50?12:-3;if(answers.length==='long')s+=a.episodes&&a.episodes>40?15:-2;if(answers.length==='any')s+=4;if(want.includes('comfort')&&genres.some(g=>['Horror','Psychological','Thriller'].includes(g)))s-=10;if(want.includes('laugh')&&genres.includes('Comedy'))s+=10;if(want.includes('dark')&&genres.some(g=>['Psychological','Horror','Thriller','Mystery'].includes(g)))s+=10;if(want.includes('romance')&&genres.includes('Romance'))s+=10;if(want.includes('wonder')&&genres.some(g=>['Mystery','Sci-Fi','Fantasy'].includes(g)))s+=8;s+=Math.min(10,(a.score||0));s+=feedbackAdjust(a);return Math.round(s*10)/10}
function explain(a){const st=derivedStats(a),c=(answers.current||[]).join(', ')||'your current mood',d=(answers.desired||[]).join(', ')||'a good experience';const matched=(answers.desired||[]).flatMap(x=>MOOD_GENRES[x]||[]).filter(g=>(a.genres||[]).includes(g)).slice(0,3);const reasons=matched.length?matched.join(', '):(a.genres||[]).slice(0,2).join(' + ')||'its overall tone';return 'CURRENT MOOD: '+c+'. DESIRED EXPERIENCE: '+d+'. WHY IT MATCHES: '+a.name+' delivers '+reasons+' with '+Math.round(st.pace)+'/10 pacing and '+Math.round(st.emotion)+'/10 emotional intensity.'}
function safeText(s){return String(s||'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
function imageUrl(a){return a.images?.webp?.large_image_url||a.images?.webp?.image_url||a.images?.jpg?.large_image_url||a.images?.jpg?.image_url||''}
function imageProxyUrl(raw){return raw?('https://images.weserv.nl/?url='+encodeURIComponent(raw.replace(/^https?:\/\//,''))):''}
function card(a,label){
  const rawImg=imageUrl(a);
  const img=imageProxyUrl(rawImg)||rawImg;
  const key=encodeURIComponent(a.name).replace(/'/g,'%27');
  const genres=(a.genres||[]).slice(0,3);
  return '<article class="card">'+
    '<div class="poster '+(img?'':'no-image')+'">'+
      (img?'<img src="'+img+'" data-raw-src="'+safeText(rawImg)+'" loading="lazy" referrerpolicy="no-referrer" onerror="if(this.dataset.rawSrc&&this.src!==this.dataset.rawSrc){this.src=this.dataset.rawSrc;this.dataset.rawSrc=''}else{this.onerror=null;this.closest(\'.poster\').classList.add(\'no-image\');this.remove()}" alt="'+a.name.replace(/"/g,'&quot;')+' poster">':'')+
      '<span class="rank">'+label+'</span>'+
      '<h3>'+a.name+'</h3>'+
    '</div>'+
    '<div class="body">'+
      '<div>'+genres.map(g=>'<span class="tag">'+g+'</span>').join(' ')+'</div>'+
      '<p class="why"><b>Why it matches:</b> '+explain(a)+'</p>'+
      '<div class="meta"><span>'+((a.score||0).toFixed? a.score.toFixed(0):0)+' fit</span><span>'+((a.episodes||'?'))+' eps</span></div>'+
      '<div class="buttons">'+
        '<button class="watch" data-preview="'+key+'">Preview</button>'+
        '<button data-watch="'+key+'">Where to watch</button>'+
      '</div>'+
    '</div>'+
  '</article>';
}
function showResults(){let ranked=catalog.map(a=>({...a,score:score(a)})).filter(a=>a.name).sort((a,b)=>b.score-a.score);const strong=ranked.slice(0,3),pool=ranked.slice(3,Math.min(18,ranked.length));const wild=pool.length?pool[Math.floor((answers.desired||[]).length*7+(answers.current||[]).length*3)%pool.length]:null;const picks=[...strong,...(wild?[wild]:[])];picks.forEach((a,i)=>{a.recommendationType=i<3?'strong':'wildcard'});const top=picks[0]||fallback[0],st=derivedStats(top);document.getElementById('results').classList.remove('hidden');document.getElementById('resultTitle').textContent='Your mood, translated into anime.';document.getElementById('resultIntro').textContent='3 strong matches + 1 intentional wild card. The engine separates how you feel from what you want to feel.';document.getElementById('profile').innerHTML=['Feeling: '+((answers.current||[]).join(', ')||'not specified'),'Want: '+((answers.desired||[]).join(', ')||'open'),'Energy: '+answers.energy,'Pacing: '+answers.pacing,'Commitment: '+answers.length,'Intensity: '+answers.intensity].map(x=>'<span class="chip">'+safeText(x)+'</span>').join('');document.getElementById('flow').innerHTML='<div><b>CURRENT MOOD</b><span>'+safeText((answers.current||[]).join(', ')||'not specified')+'</span></div><div><b>DESIRED EXPERIENCE</b><span>'+safeText((answers.desired||[]).join(', ')||'open')+'</span></div><div><b>ANIME CHARACTERISTICS</b><span>'+safeText((top.genres||[]).slice(0,3).join(' · '))+' · '+Math.round(st.pace)+'/10 pace</span></div><div><b>WHY IT MATCHES</b><span>'+safeText(explain(top))+'</span></div>';document.getElementById('resultsGrid').innerHTML=picks.map((a,i)=>card(a,i===0?'🥇 Strong Match':i===1?'🥈 Strong Match':i===2?'🥉 Strong Match':'🃏 Your Wild Card')).join('');localStorage.setItem('animeMoodLastResults',JSON.stringify(picks.map(a=>({name:a.name,genres:a.genres||[],type:a.recommendationType}))));scrollToId('results')}
function feedback(btn,type){document.querySelectorAll('.feedback button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');feedbackState=type;const last=JSON.parse(localStorage.getItem('animeMoodLastResults')||'[]');let h=JSON.parse(localStorage.getItem('animeMoodFeedback')||'[]');h.push({type,results:last,at:new Date().toISOString()});localStorage.setItem('animeMoodFeedback',JSON.stringify(h.slice(-20)));document.getElementById('resultIntro').textContent=type==='exact'?'Got it — future recommendations will lean toward the genres and styles you liked.':type==='wrong'?'Got it — future recommendations will reduce similar patterns.':'Thanks — the next recommendation set will use this signal.'}
function source(n){let title=decodeURIComponent(n);window.open('https://theindex.moe/library/anime?search='+encodeURIComponent(title),'_blank')}
function details(n){let a=catalog.find(x=>x.name===decodeURIComponent(n));alert(a?explain(a):'No details available.')}
function previewAnime(n){let a=catalog.find(x=>x.name===decodeURIComponent(n));if(!a)return;document.getElementById('previewTitle').textContent=a.name;let rawImg=imageUrl(a),img=imageProxyUrl(rawImg)||rawImg;let trailer=a.trailer?.embed_url||'';let synopsis=a.synopsis||explain(a);document.getElementById('previewBody').innerHTML=(img?'<img class="preview-poster" referrerpolicy="no-referrer" data-raw-src="'+safeText(rawImg)+'" onerror="if(this.dataset.rawSrc&&this.src!==this.dataset.rawSrc){this.src=this.dataset.rawSrc;this.dataset.rawSrc=''}else{this.onerror=null;this.remove()}" src="'+img+'" alt="'+safeText(a.name)+' poster">':'<div class="preview-poster"></div>')+'<div class="preview-info"><div class="chips"><span class="chip">'+safeText(a.type||'Anime')+'</span><span class="chip">'+safeText(a.status||'Metadata preview')+'</span><span class="chip">'+safeText(a.episodes||'?')+' eps</span></div><p>'+safeText(synopsis)+'</p>'+(trailer?'<iframe class="preview-video" src="'+trailer+'" title="'+safeText(a.name)+' trailer" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>':'<div class="notice">No trailer is available for this title through the current source.</div>')+'</div>';document.getElementById('previewModal').classList.add('open')}
function closePreview(){document.getElementById('previewModal').classList.remove('open');document.getElementById('previewBody').innerHTML=''}
let searchToken=0;
function normalizeTitle(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'')}
function mergeAnime(x,base){let genres=(x.genres||[]).map(g=>g.name||g);return {...base,name:x.title_english||x.title||base?.name,malId:x.mal_id,genres:genres.length?genres:(base?.genres||[]),episodes:x.episodes??base?.episodes??'?',images:x.images||base?.images||{},score:x.score??base?.score??0,synopsis:x.synopsis||base?.synopsis||'',status:x.status||base?.status||'',type:x.type||base?.type||'',trailer:x.trailer||base?.trailer||null,url:x.url||base?.url||''}}
function renderDiscover(list=catalog){let qv=(document.getElementById('search').value||'').toLowerCase().trim();let filtered=list.filter(a=>(a.name+' '+(a.genres||[]).join(' ')+' '+(a.moods||[]).join(' ')).toLowerCase().includes(qv));document.getElementById('discoverGrid').innerHTML=filtered.slice(0,36).map(a=>card(a,'✦ Discover')).join('');document.getElementById('discoverStatus').textContent=qv?'Showing matching titles. Search results are pulled from MyAnimeList through Jikan.':'Showing featured titles. Search to explore the broader catalog.'}
async function enrichFallbacks(){const ids={"Frieren: Beyond Journey’s End":52991,'Haikyuu!!':20583,'Spy x Family':50265,'Violet Evergarden':33352,'Mob Psycho 100':32182,'Death Note':1535};for(const a of catalog){const id=ids[a.name];if(!id)continue;try{const r=await fetch(API+'/anime/'+id+'/full');if(r.ok){const j=await r.json();if(j.data){Object.assign(a,mergeAnime(j.data,a))}}}catch(e){}await new Promise(res=>setTimeout(res,350))}}
async function loadTopCatalog(){try{for(let page=1;page<=3;page++){const r=await fetch(API+'/top/anime?limit=25&page='+page+'&sfw=true');if(!r.ok)break;const j=await r.json();const mapped=(j.data||[]).map(x=>mergeAnime(x,{name:x.title,genres:(x.genres||[]).map(g=>g.name),moods:[],tone:(x.genres||[]).map(g=>g.name.toLowerCase()),pace:null,emotion:null,comedy:null}));for(const a of mapped){const old=catalog.find(x=>x.malId===a.malId||normalizeTitle(x.name)===normalizeTitle(a.name));if(old)Object.assign(old,a);else catalog.push(a)}renderDiscover();await new Promise(res=>setTimeout(res,900))}document.getElementById('discoverStatus').textContent='Featured catalog loaded. Search any title to query the broader MyAnimeList catalog live.'}catch(e){console.log('Jikan top catalog unavailable',e)}}
async function searchAnimeRemote(query){const token=++searchToken;try{const r=await fetch(API+'/anime?q='+encodeURIComponent(query)+'&limit=24&sfw=true');if(!r.ok)throw new Error('search failed');const j=await r.json();if(token!==searchToken)return;const mapped=(j.data||[]).map(x=>mergeAnime(x,{name:x.title,genres:(x.genres||[]).map(g=>g.name),moods:[],tone:(x.genres||[]).map(g=>g.name.toLowerCase()),pace:6,emotion:6,comedy:(x.genres||[]).some(g=>g.name==='Comedy')?8:3}));for(const a of mapped){const old=catalog.find(x=>x.malId===a.malId||normalizeTitle(x.name)===normalizeTitle(a.name));if(old)Object.assign(old,a);else catalog.push(a)}renderDiscover(mapped)}catch(e){document.getElementById('discoverStatus').textContent='Live catalog search is temporarily unavailable; showing local matches.';renderDiscover()}}
document.getElementById('search').addEventListener('input',()=>{const qv=document.getElementById('search').value.trim();renderDiscover();if(qv.length>=2)searchAnimeRemote(qv)});
// Centralized click handling keeps static and dynamically-rendered controls interactive.
document.addEventListener('click',function(e){
  const el=e.target.closest('[data-action],[data-pick],[data-preview],[data-watch],[data-feedback],[data-overlay]');
  if(!el)return;
  if(el.dataset.overlay==='auth' && e.target===el){closeAuth();return}
  if(el.dataset.overlay==='preview' && e.target===el){closePreview();return}
  if(el.dataset.pick){pick(el.dataset.pick);return}
  if(el.dataset.preview){previewAnime(el.dataset.preview);return}
  if(el.dataset.watch){source(el.dataset.watch);return}
  if(el.dataset.feedback){feedback(el,el.dataset.feedback);return}
  switch(el.dataset.action){
    case 'scroll-quiz': scrollToId('quiz'); break;
    case 'scroll-discover': scrollToId('discover'); break;
    case 'open-auth': openAuth(); break;
    case 'close-auth': closeAuth(); break;
    case 'close-preview': closePreview(); break;
    case 'back': back(); break;
    case 'next': next(); break;
    case 'auth-signin': authSignIn(); break;
    case 'auth-signup': authSignUp(); break;
    case 'auth-signout': authSignOut(); break;
    case 'save-profile': saveProfile(); break;
  }
});

renderQ();renderDiscover();(async()=>{await enrichFallbacks();renderDiscover();await loadTopCatalog()})();

function openAuth(){document.getElementById('authModal').classList.add('open');refreshAuthUI()}
function closeAuth(){document.getElementById('authModal').classList.remove('open')}
function setAuthStatus(msg){document.getElementById('authStatus').textContent=msg}
function refreshAuthUI(){
  const signed=!!authUser;
  document.getElementById('authFields').classList.toggle('hidden',signed);
  document.getElementById('profileFields').classList.toggle('hidden',!signed);
  if(signed){
    document.getElementById('authTitle').textContent='Your Anime Mood Profile';
    document.getElementById('authSub').textContent='Signed in as '+(authUser.email||'your account')+'.';
    const p=authUser.user_metadata||{};
    document.getElementById('profileAnime').value=p.favorite_anime||'';
    document.getElementById('profilePace').value=p.preferred_pacing||'any';
    document.querySelectorAll('.profile-check input').forEach(i=>i.checked=(p.favorite_genres||[]).includes(i.value));
  }else{
    document.getElementById('authTitle').textContent='Personalize Anime Mood';
    document.getElementById('authSub').textContent='Create an account to keep your anime preferences across devices.';
  }
}
async function authSignUp(){
  if(!supabaseClient){setAuthStatus('Account login is prepared, but the site needs a Supabase project URL and publishable key.');return}
  const email=document.getElementById('authEmail').value.trim(),password=document.getElementById('authPassword').value;
  if(!email||password.length<6){setAuthStatus('Enter an email and a password with at least 6 characters.');return}
  const {data,error}=await supabaseClient.auth.signUp({email,password});
  if(error){setAuthStatus(error.message);return}
  if(data.session){authUser=data.user;refreshAuthUI();setAuthStatus('Account created and signed in.')}else setAuthStatus('Account created. Check your email if confirmation is enabled.');
}
async function authSignIn(){
  if(!supabaseClient){setAuthStatus('Account login is prepared, but the site needs a Supabase project URL and publishable key.');return}
  const email=document.getElementById('authEmail').value.trim(),password=document.getElementById('authPassword').value;
  const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});
  if(error){setAuthStatus(error.message);return}
  authUser=data.user;refreshAuthUI();
}
async function authSignOut(){if(supabaseClient)await supabaseClient.auth.signOut();authUser=null;refreshAuthUI()}
async function saveProfile(){
  if(!supabaseClient||!authUser)return;
  const genres=[...document.querySelectorAll('.profile-check input:checked')].map(i=>i.value);
  const metadata={...authUser.user_metadata,favorite_anime:document.getElementById('profileAnime').value.trim(),preferred_pacing:document.getElementById('profilePace').value,favorite_genres:genres};
  const {data,error}=await supabaseClient.auth.updateUser({data:metadata});
  document.getElementById('profileStatus').textContent=error?error.message:'Preferences saved.';
  if(!error)authUser=data.user;
}
async function initAuth(){
  if(!supabaseClient)return;
  const {data}=await supabaseClient.auth.getSession();
  authUser=data.session?.user||null;
  supabaseClient.auth.onAuthStateChange((_event,session)=>{authUser=session?.user||null;refreshAuthUI()});
}

initAuth();