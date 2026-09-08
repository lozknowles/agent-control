(()=>{
  const q=selector=>document.querySelector(selector), safe=value=>esc(value??'');
  const poeView={projection:null,conversation:null,reference:null,operator:null,recorder:null,playback:null,audio:null,audioContext:null,voiceEnabled:false,holding:false,busy:false,epoch:0,loading:null,localState:null};
  const key='agent-control-poe-dashboard-conversation';
  const announced=new Set(),speechQueue=[];let operatorSeen=false,initialLoad=true;
  async function announceNext(){if(poeView.busy||poeView.playback||!poeView.voiceEnabled||poeView.holding)return;const turn=speechQueue.shift();if(turn)await speak(turn);}
  function queueAnnouncement(turn){if(!turn||announced.has(turn.id))return;announced.add(turn.id);speechQueue.push(turn);announceNext().catch(fail);}
  function objectLink(ref){const id=encodeURIComponent(ref.id);return ref.kind==='parcel'?`/?poeView=jobs&parcel=${id}`:ref.kind==='run'?`/?poeView=jobs&messagingRun=${id}`:ref.kind==='job'?`/?poeView=jobs&job=${id}`:ref.kind==='system'?`/?poeView=systems&system=${id}`:ref.kind==='model'?`/?poeView=models&model=${id}`:ref.kind==='lane'?`/?poeView=lanes&lane=${id}`:ref.kind==='crew-member'?'/?poeView=crew':null;}
  async function request(url,options={}) {
    if(state.operatorAuth!=='authenticated'){openOperator();throw new Error('Authenticate the dashboard to talk to POE.')}
    const response=await fetch(url,{...options,headers:{Authorization:`Bearer ${state.token}`,...options.headers}});
    if(response.status===401){stopLocal();poeView.conversation=null;sessionStorage.removeItem(key);authenticationExpired();throw new Error('Operator authentication required.')}
    const value=await response.json();if(!response.ok)throw new Error(value.error||`HTTP ${response.status}`);return value;
  }
  const post=(url,body)=>request(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const endpoint=suffix=>`/api/poe/conversations/${encodeURIComponent(poeView.conversation.id)}/${suffix}`;
  function setLocal(value,message){poeView.localState=value;if(message)q('#poe-audio-message').textContent=message;paintState()}
  function paintState(){const name=poeView.localState||poeView.conversation?.state||'IDLE';q('#poe-character').dataset.state=name;q('#poe-character').dataset.focus=poeView.reference?.kind||poeView.conversation?.lastReference?.kind||'conversation';q('#poe-state').textContent=name.replaceAll('_',' ');q('#poe-interrupt').disabled=!poeView.playback&&!poeView.busy;q('#poe-speak').disabled=!poeView.projection?.voice?.recognition;q('#poe-form button[type="submit"]').disabled=poeView.busy;}
  async function load(){
    if(poeView.loading)return poeView.loading;
    poeView.loading=(async()=>{
      if(state.operatorAuth!=='authenticated'){q('#poe-turns').textContent='Authenticate this dashboard tab before starting a conversation.';paintState();return}
      poeView.projection=await request('/api/poe');
      let id=poeView.conversation?.id||sessionStorage.getItem(key);
      if(id){const own=poeView.projection.conversations.find(item=>item.id===id&&item.channel==='dashboard'&&item.actorId==='web-operator');if(!own)id=null;}
      poeView.conversation=id?await request(`/api/poe/conversations/${encodeURIComponent(id)}`):await post('/api/poe/conversations',{channel:'dashboard'});
      if(!poeView.conversation.turns.some(turn=>turn.purpose==='GREETING')){const greeting=await post(endpoint('greeting'),{});poeView.conversation=greeting.conversation;}
      sessionStorage.setItem(key,poeView.conversation.id);
      poeView.operator=await request(endpoint('operator'));
      poeView.conversation=await request(`/api/poe/conversations/${encodeURIComponent(poeView.conversation.id)}`);
      render();
      for(const turn of poeView.conversation.turns.filter(turn=>['RESULT','HANDOVER'].includes(turn.purpose))){if(initialLoad)announced.add(turn.id);else queueAnnouncement(turn);}
      initialLoad=false;
    })();try{return await poeView.loading}finally{poeView.loading=null}
  }
  function render(){
    const p=poeView.projection,c=poeView.conversation;if(!p||!c)return;
    paintState();q('#poe-conversation-title').textContent='Your dashboard conversation';
    const route=p.reasoning?.route;q('#poe-reasoning-route').textContent=route?`Reasoning: ${route.providerId} / ${route.accountProfileId||'default'} / ${route.modelId} @ ${route.nodeId}`:`Reasoning: ${p.reasoning?.state||'unavailable'}`;
    q('#poe-turns').innerHTML=c.turns.length?c.turns.map(turn=>{
      const route=turn.route?`${turn.route.providerId} / ${turn.route.modelId} @ ${turn.route.nodeId}`:turn.responseMode==='DETERMINISTIC'?'Grounded registry renderer; no model invocation':'';
      const refs=(turn.references||[]).map(ref=>`${objectLink(ref)?`<a class="text-button" href="${safe(objectLink(ref))}">Open ${safe(ref.kind)}</a>`:''}<button type="button" class="text-button" data-poe-focus-kind="${safe(ref.kind)}" data-poe-focus-id="${safe(ref.id)}">${safe(ref.label||`${ref.kind}: ${ref.id}`)}</button>`).join(' ');
      const facts=(turn.evidence||[]).map(fact=>`<li><strong>${safe(fact.label)}</strong><p>${safe(fact.value??'Unavailable')}</p><small>${safe(fact.informationKind||fact.authority)} · ${safe(fact.observedAt||'observation time unavailable')} · ${fact.evidence.map(source=>source.startsWith('/api/poe/knowledge/sources/')?`<button type="button" class="text-button" data-poe-source="${safe(source)}">View source</button>`:safe(source)).join(', ')}</small></li>`).join('');
      return `<li class="poe-turn ${safe(turn.actor)}"><header><b>${turn.actor==='poe'?'POE':'You'}${turn.modality==='voice'?' · voice transcription':''}</b><time>${safe(new Date(turn.at).toLocaleTimeString())}</time></header><div>${safe(turn.text)}</div>${refs?`<nav aria-label="Related evidence">${refs}</nav>`:''}${facts?`<details><summary>Sources and observations (${turn.evidence.length})</summary><ul>${facts}</ul></details>`:''}<footer>${safe(route)} · ${safe(turn.channel)} · ${safe(turn.contentTrust)}</footer></li>`;
    }).join(''):'<li class="poe-turn poe">Welcome. Ask about jobs, schedules, system readiness or how Agent Control works. I shall consult the records before forming an opinion.</li>';
    q('#poe-turns').scrollTop=q('#poe-turns').scrollHeight;
    q('#poe-reference').hidden=!poeView.reference;
    if(poeView.reference)q('#poe-reference').innerHTML=`In context: ${safe(poeView.reference.kind)} · ${safe(poeView.reference.id)} <button id="poe-clear-reference" type="button">Clear</button>`;
    const proposals=p.proposals.filter(item=>item.conversationId===c.id);
    q('#poe-proposal-count').textContent=proposals.length;q('#poe-proposals').innerHTML=proposals.map(renderProposal).join('');bindProposalButtons();
    renderOperator();
  }
  function renderOperator(){
    const operator=poeView.operator;if(!operator){q('#poe-job-proposals').textContent='Operator catalogue unavailable.';return}
    q('#poe-batch-summary').textContent=operator.batch?.requested?operator.batch.text:'No job requested in this conversation.';
    q('#poe-handover-list').innerHTML=(operator.handovers||[]).map(h=>`<article class="poe-handover"><span class="sealed-baton">◇ Sealed baton</span><p>${safe(h.text)}</p><small>${safe(h.batonId)} · ${safe(h.sha256)}<br>${safe(h.source)} → ${safe(h.destination)} · ${safe(h.verification)}</small></article>`).join('');
    q('#poe-job-proposals').innerHTML=operator.proposals.map(item=>`<article class="poe-proposal"><h3>${safe(item.job)}</h3><p>${safe(item.state.replaceAll('_',' '))}</p><p>Initiating request: ${safe(item.prompt)}</p><p>Inputs: ${safe(JSON.stringify(item.parameters))}</p><p>Expires: ${safe(item.expiresAt)}</p><small>Sealed SHA-256 ${safe(item.hash)}</small>${item.state==='WAITING_FOR_APPROVAL'?`<button class="button warning" data-poe-job-approve="${safe(item.id)}" data-hash="${safe(item.hash)}">${item.operation==='CANCEL'?'Approve cancellation':'Approve this job'}</button>`:`<button class="text-button" data-poe-focus-kind="parcel" data-poe-focus-id="${safe(item.parcelId)}">Inspect Work Parcel</button>`}</article>`).join('');
    const jobs=operator.jobs;
    q('#poe-catalogue').innerHTML=`<summary>${jobs.length} registered executable jobs</summary>`+jobs.map(job=>`<article class="poe-catalogue-row"><strong>${safe(job.name)}</strong><p>${safe(job.purpose||'Purpose unavailable')}</p><small>${safe(job.id)} · ${job.readiness.ready?'Eligible workers observed':'Blocked or readiness unavailable'}</small><p>${safe(job.registration?.changes||'Conversational execution effects are not registered.')}</p><button class="button secondary" data-poe-question="${safe(`Explain job ${job.id}`)}">Ask about this job</button>${job.registration?.permitted?`<button class="button secondary" data-poe-question="${safe(`Start ${job.id}`)}">Review a start request</button>`:''}</article>`).join('');
    const remote=(operator.registries||[]);q('#poe-catalogue').innerHTML+=remote.map(source=>`<article class="poe-catalogue-row"><strong>${safe(source.name)}</strong><p>${source.state==='OBSERVED'?`${source.jobs.length} registered remote jobs`:'Registry unavailable'}</p><p>${safe(source.limitation)}</p>${source.jobs.map(job=>`<p>${safe(job.metadata.name)} <button type="button" class="text-button" data-poe-question="${safe(`Explain job ${job.metadata.id}`)}">Explain</button></p>`).join('')}</article>`).join('');
    const count=operator.schedules.length+operator.savedSchedules.records.length+remote.reduce((n,source)=>n+source.schedules.length,0);
    q('#poe-schedules').innerHTML=`<summary>${count} registered schedules${operator.savedSchedules.available?'':' · saved schedules unavailable'}</summary><button class="button secondary" data-poe-question="Show me scheduled jobs">Explain schedules</button>`;
    q('#poe-job-proposals').querySelectorAll('[data-poe-job-approve]').forEach(button=>button.addEventListener('click',async()=>{
      button.disabled=true;try{const result=await post(endpoint('approve-job'),{proposalId:button.dataset.poeJobApprove,hash:button.dataset.hash});poeView.conversation=result.conversation;setLocal(null);await load();}catch(error){fail(error)}
    }));
  }
  function openPanel(){q('#poe-workspace').hidden=false;q('#poe-workspace').classList.add('poe-overlay');q('#poe-launcher').setAttribute('aria-expanded','true');load().catch(fail)}
  function focus(kind,id,label){poeView.reference={kind,id,label};openPanel();q('#poe-input').focus()}
  window.AgentControlPoe={askAbout:focus};
  function decorate(){for(const [selector,kind,key] of [['[data-parcel-id]','parcel','parcelId'],['[data-job]','job','job'],['[data-run]','run','run'],['[data-lane]','lane','lane'],['[data-model-id]','model','modelId'],['[data-bot-character-focus]','crew-member','botCharacterFocus']])for(const node of document.querySelectorAll(selector)){if(node.closest('#poe-workspace'))continue;const host=node.matches('button,a')?node.parentElement:node;if(!host||host.querySelector(`:scope > [data-poe-decoration="${kind}"]`))continue;const id=node.dataset[key];if(!id)continue;const button=document.createElement('button');button.type='button';button.className='button secondary poe-context-button';button.dataset.poeDecoration=kind;button.textContent='Ask POE about this';button.addEventListener('click',event=>{event.stopPropagation();focus(kind,id)});host.append(button)}}
  function fail(error){poeView.busy=false;setLocal('FAILED',`POE could not complete that step: ${error.message}. Typed conversation remains available.`);showError(error)}
  function stopLocal(){speechQueue.length=0;poeView.epoch++;if(poeView.audio){poeView.audio.pause();poeView.audio.currentTime=0}if(poeView.playback?.url)URL.revokeObjectURL(poeView.playback.url);poeView.playback=null;poeView.busy=false;setLocal('INTERRUPTED','Speech stopped. Executing jobs are unaffected.')}
  async function interrupt(){const turnId=poeView.playback?.turnId||poeView.conversation?.speaking?.turnId;stopLocal();if(poeView.conversation)await post(endpoint('interrupt'),{playbackTurnId:turnId});}
  async function unlock(){
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(AudioContext){poeView.audioContext??=new AudioContext();await poeView.audioContext.resume();const source=poeView.audioContext.createBufferSource();source.buffer=poeView.audioContext.createBuffer(1,1,poeView.audioContext.sampleRate);source.connect(poeView.audioContext.destination);source.start();}
    poeView.voiceEnabled=true;q('#poe-enable-audio').textContent='Audio enabled';q('#poe-audio-message').textContent='Audio enabled by your interaction. If playback is blocked, use Play reply.';
  }
  function animateMouth(){
    const mouth=q('#poe-character .poe-mouth'),samples=new Uint8Array(256);
    const frame=()=>{let opening=2.3;if(poeView.analyser&&poeView.audio&&!poeView.audio.paused&&!matchMedia('(prefers-reduced-motion: reduce)').matches){poeView.analyser.getByteTimeDomainData(samples);const energy=Math.sqrt(samples.reduce((sum,x)=>sum+((x-128)/128)**2,0)/samples.length);opening=Math.min(9,2.3+energy*35)}mouth?.setAttribute('ry',String(opening));if(poeView.playback)requestAnimationFrame(frame)};requestAnimationFrame(frame);
  }
  async function playReply(){if(!poeView.audio||!poeView.playback)return;try{await poeView.audio.play();setLocal('SPEAKING','Speaking the captioned reply. Hold to speak or Stop speaking to interrupt.')}catch{setLocal('BLOCKED','Browser playback was blocked. Select Play reply to hear the saved audio.')}}
  async function speak(turn){
    if(!poeView.voiceEnabled)return;
    const epoch=++poeView.epoch;poeView.busy=true;setLocal('THINKING','Preparing and checking OmniVoice audio.');
    let audio;try{audio=await post(endpoint('speech'),{turnId:turn.id})}catch(error){if(epoch!==poeView.epoch)return;throw error}if(epoch!==poeView.epoch)return;poeView.busy=false;
    const bytes=Uint8Array.from(atob(audio.bytes),c=>c.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes],{type:audio.mime}));
    poeView.audio??=new Audio();poeView.audio.src=url;
    if(poeView.audioContext&&!poeView.analyser){const source=poeView.audioContext.createMediaElementSource(poeView.audio);poeView.analyser=poeView.audioContext.createAnalyser();poeView.analyser.fftSize=256;source.connect(poeView.analyser);poeView.analyser.connect(poeView.audioContext.destination);}
    animateMouth();poeView.playback={url,turnId:turn.id};q('#poe-audio-caption').textContent=audio.spokenText;q('#poe-play-reply').hidden=false;
    poeView.audio.onended=()=>{if(poeView.playback?.turnId===turn.id){URL.revokeObjectURL(url);poeView.playback=null;setLocal(null,'Speech finished.')}};
    poeView.audio.onerror=()=>setLocal('FAILED','Browser audio decoding failed. The text and caption remain available.');
    await playReply();
  }
  async function sendText(text){
    if(poeView.busy)return;
    if(poeView.playback)await interrupt();poeView.busy=true;setLocal('LISTENING');
    try{const result=await post(endpoint('turns'),{text,reference:poeView.reference});poeView.conversation=result.conversation;await load();poeView.busy=false;setLocal(null);await speak(result.turn)}catch(error){fail(error)}
  }
  async function beginVoice(){
    if(poeView.holding||poeView.recorder)return;poeView.holding=true;
    if(poeView.playback||poeView.busy)await interrupt();
    try{
      await unlock();if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw new Error('Microphone capture is unavailable in this browser or insecure context');
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});if(!poeView.holding){stream.getTracks().forEach(track=>track.stop());return}
      const recorder=new MediaRecorder(stream),chunks=[];poeView.recorder=recorder;
      recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data)};
      recorder.onstop=async()=>{clearTimeout(recorder.limit);stream.getTracks().forEach(track=>track.stop());poeView.recorder=null;poeView.busy=true;setLocal('LISTENING','Transcribing your recording with the configured speech provider.');
        try{const blob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});if(!blob.size)throw new Error('The recording was empty');const result=await request(endpoint('transcribe'),{method:'POST',headers:{'Content-Type':blob.type},body:blob});poeView.conversation=result.conversation;await load();poeView.busy=false;setLocal(null);await speak(result.turn)}catch(error){fail(error)}
      };
      recorder.start();recorder.limit=setTimeout(endVoice,60000);setLocal('LISTENING','Microphone is recording. Release to send.');q('#poe-speak').textContent='Release to send';
    }catch(error){poeView.holding=false;setLocal('BLOCKED',error.name==='NotAllowedError'?'Microphone permission was denied. You can still type to POE.':error.message)}
  }
  function endVoice(){poeView.holding=false;if(poeView.recorder?.state==='recording')poeView.recorder.stop();q('#poe-speak').textContent='Hold to speak'}
  function renderProposal(item){const fair=item.fairness.comparable,findings=item.fairness.findings.map(f=>`<li><b>${safe(f.severity)}</b> ${safe(f.message)}</li>`).join('');return`<article class="poe-proposal" data-poe-proposal="${safe(item.id)}"><header><h3>${safe(item.decision)}</h3><span class="status-pill ${item.state==='FROZEN'?'waiting':''}">${safe(item.state)}</span></header><p>${safe(item.objective)}</p><p class="${fair?'poe-fair':'poe-unfair'}">${fair?'Comparable conditions recorded.':'Blocked fairness defects detected.'}</p>${findings?`<ul>${findings}</ul>`:''}<p>${safe(item.conditions.map(condition=>`${condition.route.providerId}/${condition.route.accountProfileId||'default'}/${condition.route.modelId}@${condition.route.nodeId}`).join(' ↔ '))}</p>${item.frozenSha256?`<small>Sealed SHA-256 ${safe(item.frozenSha256)}</small>`:''}${item.execution?`<p>Submitted as <button class="text-button" data-poe-focus-kind="parcel" data-poe-focus-id="${safe(item.execution.parcelId)}">${safe(item.execution.parcelId)}</button></p>`:''}<div class="control-strip">${item.state==='DRAFT'?`<button class="button secondary" data-poe-edit="${safe(item.id)}">Edit draft</button><button class="button secondary" data-poe-freeze="${safe(item.id)}" data-revision="${safe(item.revision)}" ${fair?'':'disabled'}>Freeze proposal</button>`:''}${item.state==='FROZEN'?`<button class="button warning" data-poe-approve="${safe(item.id)}" data-revision="${safe(item.revision)}" data-sha="${safe(item.frozenSha256)}">Approve &amp; submit Work Parcel</button>`:''}<button class="button secondary" data-poe-focus-kind="benchmark" data-poe-focus-id="${safe(item.id)}">Ask POE</button></div></article>`}
  function bindProposalButtons(){q('#poe-proposals').querySelectorAll('[data-poe-edit]').forEach(button=>button.addEventListener('click',()=>{const item=poeView.projection.proposals.find(proposal=>proposal.id===button.dataset.poeEdit);if(!item)return;const form=q('#poe-benchmark-form'),details=form.closest('details');form.dataset.proposalId=item.id;form.dataset.revision=String(item.revision);q('#poe-benchmark-decision').value=item.decision;q('#poe-benchmark-objective').value=item.objective;q('#poe-benchmark-reason').value=item.whyNewEvidenceIsNeeded;q('#poe-benchmark-json').value=JSON.stringify({conditions:item.conditions,stages:item.stages,metrics:item.metrics,repetitions:item.repetitions,constraints:item.constraints||[]},null,2);form.querySelector('button[type="submit"]').textContent='Save draft revision';details.open=true;details.scrollIntoView({behavior:'smooth',block:'start'})}));q('#poe-proposals').querySelectorAll('[data-poe-freeze]').forEach(button=>button.addEventListener('click',()=>request(`/api/poe/proposals/${encodeURIComponent(button.dataset.poeFreeze)}/freeze`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:Number(button.dataset.revision)})}).then(load).catch(showError)));q('#poe-proposals').querySelectorAll('[data-poe-approve]').forEach(button=>button.addEventListener('click',()=>{if(!confirm('Submit this sealed benchmark as a real governed Work Parcel?'))return;request(`/api/poe/proposals/${encodeURIComponent(button.dataset.poeApprove)}/approve`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:Number(button.dataset.revision),frozenSha256:button.dataset.sha})}).then(load).catch(showError)}))}
  const initialPlan={conditions:[{route:{providerId:'provider-a',accountProfileId:'profile-a',modelId:'model-a',nodeId:'controller'},tools:['repository.read'],contextPolicy:'same-frozen-context',fixtureSha256:'0'.repeat(64),softwareVersion:'record-exact-version',hardwareClass:'record-exact-hardware',quantization:null,cacheState:'COLD',providerEndpoint:'provider-a',authority:'QUALIFICATION',timeLimitMs:120000},{route:{providerId:'provider-b',accountProfileId:'profile-b',modelId:'model-b',nodeId:'controller'},tools:['repository.read'],contextPolicy:'same-frozen-context',fixtureSha256:'0'.repeat(64),softwareVersion:'record-exact-version',hardwareClass:'record-exact-hardware',quantization:null,cacheState:'COLD',providerEndpoint:'provider-b',authority:'QUALIFICATION',timeLimitMs:120000}],stages:[{id:'candidate-a',name:'Candidate A',job:'replace-with-registered-job@1.0.0',parameters:{},requestedRoute:{provider:'provider-a',accountProfile:'profile-a',model:'model-a',allowFallback:false,purpose:'QUALIFICATION',profile:'STANDARD',reason:'Frozen candidate A'}},{id:'candidate-b',name:'Candidate B',job:'replace-with-registered-job@1.0.0',parameters:{},requestedRoute:{provider:'provider-b',accountProfile:'profile-b',model:'model-b',allowFallback:false,purpose:'QUALIFICATION',profile:'STANDARD',reason:'Frozen candidate B'}}],metrics:[{id:'verified-a',label:'Verified outcome A',kind:'OBJECTIVE',successCriterion:'Independent verifier passes candidate A',stageId:'candidate-a'},{id:'verified-b',label:'Verified outcome B',kind:'OBJECTIVE',successCriterion:'Independent verifier passes candidate B',stageId:'candidate-b'},{id:'operator-preference',label:'Blind operator preference',kind:'HUMAN_EVALUATION',successCriterion:'Record preference as HUMAN_EVALUATION, never objective truth'}],repetitions:1,constraints:['Same immutable fixture and declared tools','No automatic production preference change']};

  document.addEventListener('DOMContentLoaded',()=>{
    const requestedView=new URL(location.href).searchParams.get('poeView');if(['jobs','systems','models','lanes','crew'].includes(requestedView))document.querySelector(`[data-view="${requestedView}"]`)?.click();
    q('#poe-benchmark-json').value=JSON.stringify(initialPlan,null,2);
    q('#poe-launcher').addEventListener('click',openPanel);
    document.querySelector('[data-view="poe"]')?.addEventListener('click',openPanel);
    q('#poe-close').addEventListener('click',()=>{interrupt().catch(fail);endVoice();q('#poe-workspace').hidden=true;q('#poe-launcher').setAttribute('aria-expanded','false')});
    q('#poe-enable-audio').addEventListener('click',async()=>{try{await unlock();const greeting=poeView.conversation?.turns.find(turn=>turn.purpose==='GREETING');if(greeting&&!sessionStorage.getItem('poe-greeting-spoken:'+greeting.id)){sessionStorage.setItem('poe-greeting-spoken:'+greeting.id,'yes');queueAnnouncement(greeting);}else await announceNext();}catch(error){fail(error)}});q('#poe-play-reply').addEventListener('click',()=>playReply().catch(fail));
    q('#poe-interrupt').addEventListener('click',()=>interrupt().catch(fail));
    q('#poe-new-conversation').addEventListener('click',async()=>{await interrupt();poeView.conversation=await post('/api/poe/conversations',{channel:'dashboard'});poeView.reference=null;setLocal(null);await load();if(poeView.voiceEnabled)queueAnnouncement(poeView.conversation.turns.find(turn=>turn.purpose==='GREETING'))});
    q('#poe-form').addEventListener('submit',event=>{event.preventDefault();const input=q('#poe-input'),text=input.value;if(!text.trim()||poeView.busy)return;input.value='';sendText(text)});
    q('#poe-reference').addEventListener('click',event=>{if(event.target.id==='poe-clear-reference'){poeView.reference=null;render()}});
    q('#poe-download-transcript').addEventListener('click',()=>request(endpoint('transcript')).then(({transcript})=>{const url=URL.createObjectURL(new Blob([transcript],{type:'text/markdown'})),link=document.createElement('a');link.href=url;link.download='poe-conversation.md';link.click();URL.revokeObjectURL(url)}).catch(fail));
    q('#poe-speak').addEventListener('pointerdown',event=>{event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);beginVoice()});
    q('#poe-speak').addEventListener('pointerup',endVoice);q('#poe-speak').addEventListener('pointercancel',endVoice);
    q('#poe-speak').addEventListener('keydown',event=>{if([' ','Enter'].includes(event.key)&&!event.repeat){event.preventDefault();beginVoice()}});q('#poe-speak').addEventListener('keyup',event=>{if([' ','Enter'].includes(event.key)){event.preventDefault();endVoice()}});
    document.addEventListener('click',event=>{const source=event.target.closest?.('[data-poe-source]');if(source){request(source.dataset.poeSource).then(value=>{q('#poe-source-text').textContent=`${value.path}\nCommit: ${value.commit}\nSHA-256: ${value.hash}\n\n${value.text}`;q('#poe-source-details').open=true;}).catch(fail);return;}const question=event.target.closest?.('[data-poe-question]');if(question)sendText(question.dataset.poeQuestion);const button=event.target.closest?.('[data-poe-focus-kind]');if(button){focus(button.dataset.poeFocusKind,button.dataset.poeFocusId);sendText(`Explain ${button.dataset.poeFocusKind} ${button.dataset.poeFocusId}`)}});
    document.addEventListener('agent-control:event-received',event=>{if(q('#poe-workspace').hidden||poeView.busy)return;const type=String(event.detail?.type||'');if(/^(poe\.|job\.|parcel\.|work\.parcel_|work_parcel\.)/.test(type))load().catch(fail)});
    new MutationObserver(()=>{decorate();if(state.operatorAuth==='authenticated'&&!operatorSeen){operatorSeen=true;openPanel();}else if(state.operatorAuth!=='authenticated')operatorSeen=false;}).observe(document.body,{childList:true,subtree:true});decorate();
q('#poe-benchmark-form').addEventListener('submit',event=>{event.preventDefault();try{const form=event.currentTarget,plan=JSON.parse(q('#poe-benchmark-json').value),input={decision:q('#poe-benchmark-decision').value,objective:q('#poe-benchmark-objective').value,whyNewEvidenceIsNeeded:q('#poe-benchmark-reason').value,...plan},editing=form.dataset.proposalId,url=editing?`/api/poe/proposals/${encodeURIComponent(editing)}`:`/api/poe/conversations/${encodeURIComponent(poeView.conversation.id)}/proposals`,body=editing?{revision:Number(form.dataset.revision),changes:input}:input;request(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(()=>{delete form.dataset.proposalId;delete form.dataset.revision;form.querySelector('button[type="submit"]').textContent='Create draft';return load()}).catch(showError)}catch(error){showError(new Error(`Benchmark JSON: ${error.message}`))}});
  });
})();
