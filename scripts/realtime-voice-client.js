'use strict';
const $=id=>document.getElementById(id);
const state=$('state'),detail=$('detail'),orb=$('orb'),audio=$('audio'),speaker=$('speaker'),speakerTest=$('speaker-test');
let pc,stream,callId,channel,audioReady=false,outputDeviceId='',lastHeard='';
let transcriptStarted=false,pendingTranscript=[];
function status(next,text){state.textContent=next;if(text!==undefined)detail.textContent=text||'';orb.classList.toggle('active',next!=='Ready'&&next!=='Ended');}
function transcriptEntry(label,text){
  const panel=$('transcript-panel'),transcript=$('transcript'),at=new Date().toLocaleTimeString();
  panel.hidden=false;transcript.textContent+=(transcript.textContent?'\n\n':'')+at+' '+label+'\n'+text;transcript.scrollTop=transcript.scrollHeight;
}
function diagnosticTranscriptEntry(label,text){
  if(!transcriptStarted){pendingTranscript.push({label,text});return;}
  transcriptEntry(label,text);
}
function startTranscript(text){
  transcriptEntry('ORIGINATING HUMAN REQUEST / RAW STT',text);
  transcriptStarted=true;
  for(const entry of pendingTranscript)transcriptEntry(entry.label,entry.text);
  pendingTranscript=[];
}
function pulse(){orb.classList.remove('heard');void orb.offsetWidth;orb.classList.add('heard');setTimeout(()=>orb.classList.remove('heard'),500);}
async function gathering(peer){if(peer.iceGatheringState==='complete')return;await new Promise(resolve=>{const f=()=>{if(peer.iceGatheringState==='complete'){peer.removeEventListener('icegatheringstatechange',f);resolve();}};peer.addEventListener('icegatheringstatechange',f);});}
function announceAudioReady(){if(audioReady&&channel?.readyState==='open')channel.send(JSON.stringify({type:'audio_ready'}));}
async function configureSpeaker(){
  const outputs=(await navigator.mediaDevices.enumerateDevices()).filter(device=>device.kind==='audiooutput');
  const selected=outputs.find(device=>device.deviceId==='default')||outputs[0];
  if(selected){
    outputDeviceId=selected.deviceId;
    if(typeof audio.setSinkId==='function')await audio.setSinkId(outputDeviceId).catch(()=>{});
    speaker.textContent='Speaker: '+(selected.label||'system default');
  }else speaker.textContent='Speaker: browser/system default';
  speaker.hidden=false;speakerTest.hidden=false;
}
speakerTest.onclick=async()=>{
  try{
    const Context=window.AudioContext||window.webkitAudioContext,context=new Context();
    if(outputDeviceId&&typeof context.setSinkId==='function')await context.setSinkId(outputDeviceId);
    await context.resume();const oscillator=context.createOscillator(),gain=context.createGain();
    oscillator.frequency.value=620;gain.gain.setValueAtTime(.08,context.currentTime);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+.45);
    oscillator.connect(gain).connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+.45);
    setTimeout(()=>context.close(),700);speaker.textContent=speaker.textContent.replace(/ · test tone sent$/,'')+' · test tone sent';
  }catch{speaker.textContent=speaker.textContent.replace(/ · test unavailable$/,'')+' · test unavailable';}
};
$('setup').onsubmit=async event=>{
  event.preventDefault();$('connect').disabled=true;
  try{
    status('Connecting…','Allow microphone access when prompted.');
    stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1},video:false});
    const input=stream.getAudioTracks()[0],mic=$('mic');mic.textContent='Microphone: '+(input?.label||'browser default');mic.hidden=false;
    await configureSpeaker();
    audio.volume=1;pc=new RTCPeerConnection();stream.getAudioTracks().forEach(track=>pc.addTrack(track,stream));
    channel=pc.createDataChannel('agent-control-events');channel.onopen=announceAudioReady;
    channel.onmessage=async event=>{
      try{
        const value=JSON.parse(event.data);
        if(value.type==='state'&&value.event==='USER SPEECH'){pulse();status('Listening…','Speech detected…');}
        if(value.type==='state'&&value.event==='STT'){
          lastHeard=String(value.detail?.text??'').trim();status('Thinking…',lastHeard?'Heard: '+lastHeard:'Preparing the spoken response.');
          if(transcriptStarted)transcriptEntry('USER / RAW STT',lastHeard||'[empty transcription]');else startTranscript(lastHeard||'[empty transcription]');
        }
        if(value.type==='state'&&value.event==='MODEL'){status('Thinking…');transcriptEntry('AGENT CONTROL',String(value.detail?.text??'[response unavailable]'));}
        if(value.type==='state'&&value.event==='REPEAT RESPONSE'){status('Thinking…');transcriptEntry('AGENT CONTROL / REPEATED',String(value.detail?.text??'[response unavailable]'));}
        if(value.type==='state'&&value.event==='CONTROL RESPONSE'){status('Thinking…');transcriptEntry('AGENT CONTROL / DETERMINISTIC CONTROL',String(value.detail?.text??'[response unavailable]'));}
        if(value.type==='state'&&value.event==='WORK INTENT')diagnosticTranscriptEntry('WORK INTENT',String(value.detail?.kind??'unavailable')+' · Work Parcel: '+String(value.detail?.workParcelId??'not created'));
        if(value.type==='state'&&value.event==='WORK RESPONSE'){status('Thinking…');transcriptEntry('AGENT CONTROL / GOVERNED WORK',String(value.detail?.text??'[response unavailable]'));}
        if(value.type==='state'&&value.event==='TOOL REQUEST')diagnosticTranscriptEntry('TOOL REQUEST',String(value.detail?.name??'unavailable'));
        if(value.type==='state'&&value.event==='TOOL RESULT')diagnosticTranscriptEntry('TOOL RESULT',String(value.detail?.result??'unavailable'));
        if(value.type==='state'&&value.event==='MODEL HANDOFF')diagnosticTranscriptEntry('MODEL HANDOFF',String(value.detail?.from??'unavailable')+' -> '+String(value.detail?.to??'unavailable'));
        if(value.type==='state'&&value.event==='TURN FAILED')diagnosticTranscriptEntry('TURN FAILED',String(value.detail?.reason??'unavailable'));
        if(value.type==='audio_egress'){
          await audio.play();status('Speaking…',lastHeard?'Heard: '+lastHeard:'Audio stream received.');
          speaker.textContent=speaker.textContent.replace(/ · stream received$/,'')+' · stream received';
          channel.send(JSON.stringify({type:'playback',generation:value.generation,browserAt:Date.now()}));
        }
        if(value.type==='audio_complete')status('Listening…',lastHeard?'Last heard: '+lastHeard:'Speak when you are ready.');
        if(value.type==='interrupted'){status('Listening…',lastHeard?'Last heard: '+lastHeard:'I heard the interruption.');diagnosticTranscriptEntry('INTERRUPTION','Previous output stopped.');}
      }catch{status('Audio blocked','Press Connect again to enable playback.');}
    };
    pc.ontrack=async event=>{audio.srcObject=event.streams[0]??new MediaStream([event.track]);try{await audio.play();audioReady=true;announceAudioReady();}catch{status('Audio blocked','Press Connect again to enable playback.');}};
    pc.onconnectionstatechange=()=>{if(pc.connectionState==='connected')status('Listening…','Say: Hello Agent Control, can you hear me?');if(['failed','disconnected','closed'].includes(pc.connectionState))status('Ended','Connection '+pc.connectionState+'.');};
    const offer=await pc.createOffer();await pc.setLocalDescription(offer);await gathering(pc);
    const token=$('token').value,browserSession=crypto.randomUUID();$('token').value='';
    const response=await fetch('/offer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sdp:pc.localDescription.sdp,type:pc.localDescription.type,token,browserSession})});
    if(!response.ok)throw Error('Authentication or media connection failed');
    const answer=await response.json();callId=answer.callId;await pc.setRemoteDescription(answer);$('setup').hidden=true;$('end').disabled=false;
  }catch(error){status('Unable to connect',error.message);$('connect').disabled=false;stream?.getTracks().forEach(track=>track.stop());pc?.close();}
};
async function end(){if(callId)await fetch('/hangup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({callId})}).catch(()=>{});stream?.getTracks().forEach(track=>track.stop());pc?.close();$('end').disabled=true;speakerTest.hidden=true;status('Ended','Conversation ended.');}
$('end').onclick=end;
addEventListener('beforeunload',()=>{stream?.getTracks().forEach(track=>track.stop());pc?.close();});
