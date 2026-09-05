'use strict';
const el=id=>document.getElementById(id);let token=sessionStorage.getItem('agent-control-operator-token')||'';
const known=v=>v===null||v===undefined?'unavailable':String(v);
async function api(route='/api/voice-sessions'){const response=await fetch(route,{headers:{Authorization:'Bearer '+token}});if(!response.ok)throw Error('Authentication or voice history unavailable');return response.json();}
function line(parent,label,value){const p=document.createElement('p');p.textContent=label+': '+known(value);parent.append(p);}
async function refresh(){try{const state=await api();el('notice').textContent=state.state+' — '+state.reason;el('sessions').replaceChildren();
 for(const s of state.sessions){const card=document.createElement('section');card.className='card';const title=document.createElement('h2');title.textContent=s.state+' | '+s.data.display;card.append(title);
  const events=s.events,last=type=>events.filter(e=>e.type===type).at(-1),model=last('MODEL'),ended=last('CALL ENDED'),connected=last('CALL CONNECTED');
  line(card,'Session',s.id);line(card,'Transport',s.data.transport);line(card,'Voice',s.data.voice);line(card,'STT / TTS',s.data.stt+' / '+s.data.tts);line(card,'Current / last model',model?.detail.model);
  line(card,'Duration (ms)',connected?(ended?.at??Date.now())-connected.at:null);line(card,'Speaking state',s.state==='ENDED'?'ended':last('TTS FIRST AUDIO')?.at>(last('TURN COMPLETED')?.at??0)?'output started; current playout unknown':'listening / processing');
  for(const [label,type] of [['Turns','TURN COMPLETED'],['Interruptions','INTERRUPTION'],['Tools','TOOL REQUEST'],['Model changes','MODEL HANDOFF']])line(card,label,events.filter(e=>e.type===type).length);
  const usages=events.filter(e=>e.type==='MODEL').map(e=>e.detail.usage),sum=k=>usages.length&&usages.every(u=>u?.[k]!==null&&u?.[k]!==undefined)?usages.reduce((a,u)=>a+u[k],0):null;
  for(const key of ['inputTokens','outputTokens','cachedInputTokens','modelCost','sttCost','ttsCost'])line(card,key,sum(key));
  line(card,'Cached input percentage',sum('inputTokens')>0&&sum('cachedInputTokens')!==null?100*sum('cachedInputTokens')/sum('inputTokens'):null);
  line(card,'Total cost', ['modelCost','sttCost','ttsCost'].every(k=>sum(k)!==null)?sum('modelCost')+sum('sttCost')+sum('ttsCost'):null);
  const samples=events.filter(e=>e.type==='TTS FIRST AUDIO').map(e=>e.detail.endOfUtteranceToAudibleMs).filter(v=>typeof v==='number').sort((a,b)=>a-b);
  line(card,'Response latency mean (ms)',samples.length?samples.reduce((a,b)=>a+b,0)/samples.length:null);line(card,'p50 / p95 (20+ observations)',samples.length>=20?samples[Math.ceil(samples.length*.5)-1]+' / '+samples[Math.ceil(samples.length*.95)-1]:null);
  line(card,'Audio ingress / model TTFT / acoustic suppression','unavailable unless measured by an adapter');
  const button=document.createElement('button');button.textContent='Download transcript';button.onclick=async()=>{try{const data=await api('/api/voice-sessions/'+encodeURIComponent(s.id)+'/transcript'),url=URL.createObjectURL(new Blob([data.transcript],{type:'text/plain'})),a=document.createElement('a');a.href=url;a.download='voice-session-'+s.id+'.txt';a.click();URL.revokeObjectURL(url);}catch(e){el('notice').textContent=e.message;}};card.append(button);
  const details=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre');summary.textContent='Chronological measurements and events';pre.textContent=events.map(e=>new Date(e.at).toISOString()+' '+e.type+'\n'+JSON.stringify(e.detail,null,2)).join('\n\n');details.append(summary,pre);card.append(details);el('sessions').append(card);
 }
 if(!state.sessions.length)line(el('sessions'),'History','No realtime calls recorded. Voice-note history is separate.');
 }catch(e){el('notice').textContent=e.message;}}
el('auth').onsubmit=e=>{e.preventDefault();token=el('token').value;el('token').value='';sessionStorage.setItem('agent-control-operator-token',token);void refresh();};if(token)void refresh();setInterval(()=>{if(token)void refresh();},3000);
