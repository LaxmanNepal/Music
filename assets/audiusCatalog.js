const API='https://api.audius.co/v1';
const STORAGE_KEY='southMusicAudiusKey';
const getKey=()=>window.SOUTH_MUSIC_CONFIG?.audiusApiKey||localStorage.getItem(STORAGE_KEY)||'';
const headers=()=>getKey()?{'X-API-Key':getKey()}:{};
async function audius(path){
  const key=getKey();
  if(!key) throw new Error('Audius API key is not configured');
  const r=await fetch(`${API}${path}`,{headers:headers()});
  if(!r.ok) throw Error(`Audius ${r.status}`);
  return r.json();
}
const clean=s=>String(s||'').trim();
function mapTrack(t){
  const genre=clean(t.genre)||'Unknown';
  const tags=Array.isArray(t.tags)?t.tags.map(clean).filter(Boolean):[];
  const mood=tags.filter(x=>/happy|sad|chill|relax|romantic|focus|workout|sleep|energetic|party/i.test(x));
  return {id:`audius-${t.id}`,title:t.title||'Unknown',slug:clean(t.permalink||t.id),artistId:`audius-user-${t.user?.id||t.user_id}`,albumId:t.album_id?`audius-album-${t.album_id}`:null,language:'Unknown',genres:[genre],moods:mood.length?mood:['Unknown'],durationSeconds:Number(t.duration)||0,artwork:t.artwork?.['150x150']||t.artwork?.['1000x1000']||null,audio:{url:`${API}/tracks/${t.id}/stream`,format:'MP3',bitrate:null,sampleRate:null,channels:null},source:{provider:'Audius',url:`https://audius.co${t.permalink?'/' + t.permalink:''}`,license:'Artist-published on Audius; verify applicable rights before commercial use',streamingAllowed:true},popularityScore:Number(t.play_count||0)};
}
function mapArtist(u){return {id:`audius-user-${u.id}`,name:u.name||'Unknown Artist',image:u.profile_picture?.['150x150']||u.profile_picture?.['1000x1000']||null,language:'Unknown',bio:u.bio||null}}
async function fetchAudiusTracks(query=''){
  const path=query?`/tracks/search?query=${encodeURIComponent(query)}&limit=50`:'/tracks/trending?limit=50';
  const data=await audius(path);return (data.data||[]).map(mapTrack).filter(s=>s.durationSeconds>0&&s.audio.url);
}
async function fetchAudiusArtists(query='music'){
  const data=await audius(`/users/search?query=${encodeURIComponent(query)}&limit=50`);return (data.data||[]).map(mapArtist);
}
window.SOUTH_AUDIO_SOURCE={fetchAudiusTracks,fetchAudiusArtists,getKey,hasKey:()=>Boolean(getKey())};
