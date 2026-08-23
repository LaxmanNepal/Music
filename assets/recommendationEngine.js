const KEY='southMusicSignals';
const PREF='southMusicPreferences';
const REC_KEY='southMusicRecommendationHistory';
const NEG_KEY='southMusicNegativePrefs';
const DAY=864e5;

const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||fallback)}catch{return JSON.parse(fallback)}};
const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
const get=()=>read(KEY,'{}');
const save=x=>write(KEY,x);

export function signal(id,patch={}){
  const s=get();
  s[id]??={plays:0,completed:0,skips:0,likes:0,replays:0,totalSeconds:0,lastPlayed:null};
  Object.assign(s[id],patch);
  save(s);
  return s[id];
}

export function getPreferences(){
  return read(PREF,'{"languages":[],"genres":[],"moods":[],"completed":false}');
}

const overlap=(a=[],b=[])=>{
  const A=new Set(a.filter(Boolean)),B=new Set(b.filter(Boolean));
  if(!A.size||!B.size)return 0;
  let n=0; for(const x of A)if(B.has(x))n++;
  return n/Math.max(A.size,B.size);
};
const userSignals=()=>get();
const negatives=()=>read(NEG_KEY,'{"songs":[],"artists":[],"genres":[]}');
const recommendationHistory=()=>read(REC_KEY,'{}');

function recentPenalty(id){
  const t=recommendationHistory()[id];
  if(!t)return 0;
  const age=Date.now()-new Date(t).getTime();
  return age<DAY?0.35:0;
}

function preferenceProfile(catalog){
  const sig=userSignals();
  const p=getPreferences();
  const profile={languages:new Map(),genres:new Map(),moods:new Map(),artists:new Map()};
  for(const song of catalog){
    const s=sig[song.id]; if(!s)continue;
    const weight=(s.plays||0)+(s.likes||0)*3+(s.replays||0)*2-(s.skips||0)*2;
    if(weight<=0)continue;
    if(song.language)profile.languages.set(song.language,(profile.languages.get(song.language)||0)+weight);
    for(const g of song.genres||[])profile.genres.set(g,(profile.genres.get(g)||0)+weight);
    for(const m of song.moods||[])profile.moods.set(m,(profile.moods.get(m)||0)+weight);
    if(song.artistId)profile.artists.set(song.artistId,(profile.artists.get(song.artistId)||0)+weight);
  }
  for(const x of p.languages||[])profile.languages.set(x,(profile.languages.get(x)||0)+4);
  for(const x of p.genres||[])profile.genres.set(x,(profile.genres.get(x)||0)+4);
  for(const x of p.moods||[])profile.moods.set(x,(profile.moods.get(x)||0)+4);
  return profile;
}

export function scoreSong(song,catalog){
  const p=getPreferences(), sig=userSignals(), s=sig[song.id]||{};
  const profile=preferenceProfile(catalog);
  const neg=negatives();
  if(neg.songs.includes(song.id)||neg.artists.includes(song.artistId)||((song.genres||[]).some(g=>neg.genres.includes(g))))return -999;

  const language=(p.languages||[]).includes(song.language)?1:0;
  const genre=overlap(song.genres,p.genres||[]);
  const mood=overlap(song.moods,p.moods||[]);
  const learnedLanguage=Math.min(1,(profile.languages.get(song.language)||0)/15);
  const learnedGenre=Math.min(1,(song.genres||[]).reduce((a,g)=>a+(profile.genres.get(g)||0),0)/20);
  const learnedMood=Math.min(1,(song.moods||[]).reduce((a,m)=>a+(profile.moods.get(m)||0),0)/20);
  const artist=Math.min(1,(profile.artists.get(song.artistId)||0)/15);
  const completion=s.plays?Math.min(1,s.completed/s.plays):0;
  const platformPopularity=Math.min(1,Number(song.popularityScore||song.popularity||0)/100);
  const freshness=Math.min(1,Number(song.freshnessScore||0));
  const recentUser=s.lastPlayed?Math.max(0,1-(Date.now()-new Date(s.lastPlayed).getTime())/(7*DAY)):0;
  let score=language*.10+genre*.12+mood*.10+learnedLanguage*.12+learnedGenre*.12+learnedMood*.08+artist*.12+completion*.06+platformPopularity*.04+freshness*.04+recentUser*.10;
  if(s.skips>=3)score-=.30;
  if(completion>=.8)score+=.20;
  if(s.replays>=3)score+=.25;
  if(s.likes>0)score+=.30;
  score-=recentPenalty(song.id);
  return score;
}

function ranked(catalog,exclude=[]){
  const blocked=new Set(exclude);
  return catalog.filter(s=>s.source?.streamingAllowed===true&&!blocked.has(s.id)).map(x=>({x,score:scoreSong(x,catalog)})).filter(x=>x.score>-900).sort((a,b)=>b.score-a.score);
}

function takeBucket(items,count,used,artistCount){
  const out=[];
  for(const item of items){
    const s=item.x;
    if(used.has(s.id))continue;
    const a=s.artistId||'unknown';
    if((artistCount[a]||0)>=2)continue;
    if(out.length&&out.at(-1).artistId===a)continue;
    out.push(s); used.add(s.id); artistCount[a]=(artistCount[a]||0)+1;
    if(out.length>=count)break;
  }
  return out;
}

export function recommend(catalog,{limit=10,exclude=[]}={}){
  if(!catalog?.length||limit<=0)return [];
  const rankedItems=ranked(catalog,exclude);
  const p=getPreferences();
  const familiar=rankedItems.filter(({x})=>(p.languages||[]).includes(x.language)||overlap(x.genres,p.genres||[])>.2||overlap(x.moods,p.moods||[])>.2);
  const adjacent=rankedItems.filter(({x})=>!(p.languages||[]).includes(x.language)&&((x.genres||[]).some(g=>(p.genres||[]).includes(g))||(x.moods||[]).some(m=>(p.moods||[]).includes(m))));
  const discovery=rankedItems.filter(({x})=>!familiar.includes(x)&&!adjacent.includes(x));
  const familiarN=Math.ceil(limit*.70), adjacentN=Math.round(limit*.20), discoveryN=Math.max(0,limit-familiarN-adjacentN);
  const used=new Set(exclude), artistCount={},out=[];
  out.push(...takeBucket(familiar,familiarN,used,artistCount));
  out.push(...takeBucket(adjacent,adjacentN,used,artistCount));
  out.push(...takeBucket(discovery,discoveryN,used,artistCount));
  for(const item of rankedItems){if(out.length>=limit)break;const s=item.x;if(used.has(s.id))continue;const a=s.artistId||'unknown';if((artistCount[a]||0)>=2)continue;out.push(s);used.add(s.id);artistCount[a]=(artistCount[a]||0)+1;}
  const h=recommendationHistory(); const now=new Date().toISOString(); out.forEach(s=>h[s.id]=now); write(REC_KEY,h);
  return out.slice(0,limit);
}

export function queueFor(song,catalog){
  const related=recommend(catalog,{limit:20,exclude:[song.id]});
  return [song,...related];
}

export function markPlayStart(id){
  const s=signal(id); s.plays=(s.plays||0)+1; s.lastPlayed=new Date().toISOString(); save({...get(),[id]:s});
}
export function markComplete(id){const s=signal(id);s.completed=(s.completed||0)+1;save({...get(),[id]:s});}
export function markSkip(id){const s=signal(id);s.skips=(s.skips||0)+1;save({...get(),[id]:s});}
export function markReplay(id){const s=signal(id);s.replays=(s.replays||0)+1;save({...get(),[id]:s});}
export function addListeningSeconds(id,n){const s=signal(id);s.totalSeconds=(s.totalSeconds||0)+Math.max(0,n);save({...get(),[id]:s});}
export function setLike(id,liked=true){const s=signal(id);s.likes=liked?1:0;save({...get(),[id]:s});}
export function setNotInterested({songId=null,artistId=null,genre=null}={}){const n=negatives();if(songId&&!n.songs.includes(songId))n.songs.push(songId);if(artistId&&!n.artists.includes(artistId))n.artists.push(artistId);if(genre&&!n.genres.includes(genre))n.genres.push(genre);write(NEG_KEY,n);}
export function clearNotInterested(){localStorage.removeItem(NEG_KEY);}
export function clearRecommendationHistory(){localStorage.removeItem(REC_KEY);}
export function resetModel(){localStorage.removeItem(KEY);localStorage.removeItem(REC_KEY);localStorage.removeItem(NEG_KEY);}
