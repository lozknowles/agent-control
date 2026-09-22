import assert from 'node:assert/strict';
import test from 'node:test';
import {BufferedPhysicalSpeech,PhysicalPcmInput} from './mallow-physical-audio.js';

function wave(samples=640){const out=Buffer.alloc(44+samples*2);out.write('RIFF');out.writeUInt32LE(out.length-8,4);out.write('WAVEfmt ',8);out.writeUInt32LE(16,16);out.writeUInt16LE(1,20);out.writeUInt16LE(1,22);out.writeUInt32LE(16000,24);out.writeUInt32LE(32000,28);out.writeUInt16LE(2,32);out.writeUInt16LE(16,34);out.write('data',36);out.writeUInt32LE(samples*2,40);for(let i=0;i<samples;i++)out.writeInt16LE(i%2?1200:-1200,44+i*2);return out;}
const metrics={provider:'fixture',host:'test',model:'fixture',elapsedMs:4,audioSeconds:.04,rtf:.1,firstAudioMs:4,memoryBytes:null};

test('buffered physical speech exposes honest mode and 20 ms PCM frames',async()=>{
  const voice={id:'mallow-test',kind:'designed' as const,provider:'fixture',modelRevision:'1',instruction:'test voice',seed:1};
  const provider:any={synthesize:async()=>({bytes:wave(),mime:'audio/wav',metrics})};const speech=new BufferedPhysicalSpeech('fixture',provider,voice),frames=[];
  for await(const frame of speech.frames('hello',new AbortController().signal))frames.push(frame);
  assert.equal(speech.mode,'buffered-then-framed');assert.equal(frames.length,2);assert.ok(frames.every(frame=>frame.bytes.byteLength===640&&frame.durationMs===20&&frame.sampleRate===16000));assert.deepEqual(speech.lastMetrics,metrics);
});

test('physical PCM input emits opened, frame, VAD and final transcript without retaining raw audio',async()=>{
  const recognition:any={transcribe:async()=>({text:'Hello Mallow.',confidence:null,metrics})},input=new PhysicalPcmInput('physical-fixture',recognition,{threshold:.01,startFrames:2,endFrames:2,maxFrames:20,device:'fixture microphone'}),controller=new AbortController(),events:any[]=[];
  const reading=(async()=>{for await(const event of input.events(controller.signal)){events.push(event);if(event.type==='transcript_final'){input.end();}}})();
  const voiced=Buffer.alloc(640);for(let i=0;i<320;i++)voiced.writeInt16LE(i%2?1600:-1600,i*2);const silence=Buffer.alloc(640);
  input.push(voiced);input.push(voiced);input.push(voiced);input.push(silence);input.push(silence);await reading;
  assert.deepEqual(events.filter(event=>['audio_opened','speech_started','speech_ended','transcript_final','audio_closed'].includes(event.type)).map(event=>event.type),['audio_opened','speech_started','speech_ended','transcript_final','audio_closed']);
  assert.equal(events.find(event=>event.type==='transcript_final').text,'Hello Mallow.');assert.equal(JSON.stringify(events).includes('audio/wav'),false);assert.equal(events[0].detail.rawRetention,'disabled');
});

test('physical input reports device loss explicitly',async()=>{
  const recognition:any={transcribe:async()=>{throw Error('unused');}},input=new PhysicalPcmInput('physical-fixture',recognition),events:any[]=[];
  const reading=(async()=>{for await(const event of input.events(new AbortController().signal))events.push(event);})();input.deviceLost('microphone_disconnected');await reading;
  assert.equal(events.at(-1).type,'device_lost');assert.equal(events.at(-1).detail.reason,'microphone_disconnected');
});
