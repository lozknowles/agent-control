import asyncio
import json
import os
import ssl
import struct
import time
import uuid
import wave
from fractions import Fraction
from pathlib import Path

import av
from aiohttp import web
from aiortc import MediaStreamTrack, RTCPeerConnection, RTCSessionDescription

BRIDGE_PORT=int(os.getenv("AGENT_CONTROL_REALTIME_BRIDGE_PORT","19222"))
OUTPUT_GAIN=max(1.0,min(2.0,float(os.getenv("AGENT_CONTROL_REALTIME_OUTPUT_GAIN","1.6"))))
PAGE=Path(os.environ["AGENT_CONTROL_REALTIME_PAGE"]).read_text()
CSS=Path(os.environ["AGENT_CONTROL_REALTIME_PAGE"]).with_name("realtime-voice.css")
peers={}

class OutputTrack(MediaStreamTrack):
    kind="audio"
    def __init__(self,peer):
        super().__init__();self.peer=peer;self.pts=0;self.started=None
    async def recv(self):
        if self.started is None:self.started=time.monotonic()
        target=self.started+self.pts/48000
        await asyncio.sleep(max(0,target-time.monotonic()))
        if not self.peer.audio_ready:generation,sequence,pcm=None,None,b"\0"*640
        else:
            try:generation,sequence,pcm=self.peer.output.get_nowait()
            except asyncio.QueueEmpty:generation,sequence,pcm=None,None,b"\0"*640
        if generation is not None and pcm is None:
            if self.peer.channel and self.peer.channel.readyState=="open":self.peer.channel.send(json.dumps({"type":"audio_complete","generation":generation}))
            pcm=b"\0"*640
        mono=struct.unpack("<320h",pcm);stereo=[]
        for sample in mono:stereo.extend((sample,sample,sample,sample,sample,sample))
        frame=av.AudioFrame(format="s16",layout="stereo",samples=960);frame.planes[0].update(struct.pack("<1920h",*stereo));frame.sample_rate=48000;frame.time_base=Fraction(1,48000);frame.pts=self.pts;self.pts+=960
        if generation is not None and generation not in self.peer.signalled:
            self.peer.signalled.add(generation)
            if self.peer.channel and self.peer.channel.readyState=="open":self.peer.channel.send(json.dumps({"type":"audio_egress","generation":generation,"sequence":sequence}))
            else:await self.peer.send({"type":"playback","generation":generation,"at":time.time()*1000})
        return frame

class Peer:
    def __init__(self,token,browser_session):
        self.id=str(uuid.uuid4());self.token=token;self.browser_session=browser_session;self.pc=RTCPeerConnection();self.output=asyncio.Queue(maxsize=1000);self.signalled=set();self.channel=None;self.reader=None;self.writer=None;self.sequence=0;self.tasks=[];self.closed=False;self.audio_ready=False;self.capture=None;self.output_capture=None;self.captured_bytes=0;self.output_captured_bytes=0
        if root:=os.getenv("AGENT_CONTROL_REALTIME_CAPTURE_ROOT"):
            folder=Path(root);folder.mkdir(parents=True,exist_ok=True,mode=0o700);target=folder/(self.id+".wav");self.capture=wave.open(str(target),"wb");self.capture.setnchannels(1);self.capture.setsampwidth(2);self.capture.setframerate(16000)
            output_folder=folder/"egress";output_folder.mkdir(parents=True,exist_ok=True,mode=0o700);output_target=output_folder/(self.id+".wav");self.output_capture=wave.open(str(output_target),"wb");self.output_capture.setnchannels(1);self.output_capture.setsampwidth(2);self.output_capture.setframerate(16000)
    async def send(self,message):
        if not self.writer:return
        self.writer.write((json.dumps(message,separators=(",",":"))+"\n").encode());await self.writer.drain()
    async def connect(self):
        self.reader,self.writer=await asyncio.open_connection("127.0.0.1",BRIDGE_PORT)
        await self.send({"type":"hello","token":self.token,"callId":self.id,"browserSession":self.browser_session})
        self.tasks.append(asyncio.create_task(self.read_bridge()))
    async def read_bridge(self):
        try:
            while line:=await self.reader.readline():
                message=json.loads(line)
                if message["type"]=="accepted":continue
                if message["type"]=="audio":
                    raw=__import__("base64").b64decode(message["pcm"],validate=True)
                    if len(raw)!=640:raise ValueError("invalid outbound frame")
                    samples=struct.unpack("<320h",raw);raw=struct.pack("<320h",*(max(-30000,min(30000,round(sample*OUTPUT_GAIN))) for sample in samples))
                    if self.output_capture and self.output_captured_bytes<19_200_000:self.output_capture.writeframesraw(raw);self.output_captured_bytes+=len(raw)
                    await self.output.put((int(message["generation"]),int(message["sequence"]),raw))
                elif message["type"]=="audio_end":await self.output.put((int(message["generation"]),-1,None))
                elif message["type"]=="state" and self.channel and self.channel.readyState=="open":self.channel.send(json.dumps({"type":"state","event":message.get("event"),"detail":message.get("detail")}))
                elif message["type"]=="interrupt":
                    while not self.output.empty():
                        try:self.output.get_nowait()
                        except asyncio.QueueEmpty:break
                    await self.send({"type":"interrupt_ack","generation":message["generation"],"at":time.time()*1000})
                    if self.channel and self.channel.readyState=="open":self.channel.send(json.dumps({"type":"interrupted"}))
                elif message["type"] in ("hangup","rejected"):await self.close(message.get("reason","rejected"));return
        except Exception:
            if not self.closed:await self.close("bridge_failure")
    async def consume_input(self,track):
        resampler=av.AudioResampler(format="s16",layout="mono",rate=16000);pending=bytearray()
        try:
            while True:
                frame=await track.recv()
                for converted in resampler.resample(frame):
                    pending.extend(bytes(converted.planes[0])[:converted.samples*2])
                    while len(pending)>=640:
                        audio=bytes(pending[:640]);del pending[:640]
                        if self.capture and self.captured_bytes<19_200_000:self.capture.writeframesraw(audio);self.captured_bytes+=len(audio)
                        await self.send({"type":"audio","sequence":self.sequence,"pcm":__import__("base64").b64encode(audio).decode()});self.sequence+=1
        except Exception:
            if not self.closed:await self.close("input_ended")
    async def close(self,reason):
        if self.closed:return
        self.closed=True
        try:await self.send({"type":"hangup","reason":reason})
        except Exception:pass
        current=asyncio.current_task()
        for task in self.tasks:
            if task is not current:task.cancel()
        if self.capture:self.capture.close();self.capture=None
        if self.output_capture:self.output_capture.close();self.output_capture=None
        if self.writer:self.writer.close()
        await self.pc.close();peers.pop(self.id,None)

async def index(_request):return web.Response(text=PAGE,content_type="text/html",headers={"Cache-Control":"no-store","Content-Security-Policy":"default-src 'self'; connect-src 'self'; script-src 'self'; style-src 'self'; media-src 'self' blob:"})
async def client_js(_request):return web.FileResponse(Path(os.environ["AGENT_CONTROL_REALTIME_CLIENT"]),headers={"Cache-Control":"no-store"})
async def voice_css(_request):return web.FileResponse(CSS,headers={"Cache-Control":"no-store"})
async def offer(request):
    if request.content_length is None or request.content_length>128*1024:raise web.HTTPBadRequest()
    data=await request.json();token=data.get("token","");browser_session=data.get("browserSession","")
    if not isinstance(token,str) or len(token)>512 or not isinstance(browser_session,str) or len(browser_session)>128:raise web.HTTPUnauthorized()
    peer=Peer(token,browser_session);peers[peer.id]=peer
    try:
        @peer.pc.on("track")
        def on_track(track):
            if track.kind=="audio":peer.tasks.append(asyncio.create_task(peer.consume_input(track)))
        @peer.pc.on("datachannel")
        def on_datachannel(channel):
            peer.channel=channel
            @channel.on("message")
            def on_message(message):
                try:
                    value=json.loads(message)
                    if value.get("type")=="audio_ready":peer.audio_ready=True
                    elif value.get("type")=="playback":asyncio.create_task(peer.send({"type":"playback","generation":value.get("generation"),"at":time.time()*1000}))
                except Exception:pass
        @peer.pc.on("connectionstatechange")
        async def state_change():
            if peer.pc.connectionState in ("failed","closed","disconnected"):await peer.close("webrtc_"+peer.pc.connectionState)
        await peer.connect();peer.pc.addTrack(OutputTrack(peer));await peer.pc.setRemoteDescription(RTCSessionDescription(sdp=data["sdp"],type=data["type"]));answer=await peer.pc.createAnswer();await peer.pc.setLocalDescription(answer)
        while peer.pc.iceGatheringState!="complete":await asyncio.sleep(.05)
        return web.json_response({"sdp":peer.pc.localDescription.sdp,"type":peer.pc.localDescription.type,"callId":peer.id})
    except Exception:
        await peer.close("offer_failed");raise web.HTTPUnauthorized()
async def hangup(request):
    data=await request.json();peer=peers.get(data.get("callId"));
    if peer:await peer.close("caller_hangup")
    return web.json_response({"ended":bool(peer)})

app=web.Application(client_max_size=128*1024);app.router.add_get("/",index);app.router.add_get("/voice.js",client_js);app.router.add_get("/voice.css",voice_css);app.router.add_post("/offer",offer);app.router.add_post("/hangup",hangup)
context=None
if os.getenv("AGENT_CONTROL_REALTIME_TLS_CERT") and os.getenv("AGENT_CONTROL_REALTIME_TLS_KEY"):
    context=ssl.create_default_context(ssl.Purpose.CLIENT_AUTH);context.load_cert_chain(os.environ["AGENT_CONTROL_REALTIME_TLS_CERT"],os.environ["AGENT_CONTROL_REALTIME_TLS_KEY"])
web.run_app(app,host=os.getenv("AGENT_CONTROL_REALTIME_WEB_HOST","127.0.0.1"),port=int(os.getenv("AGENT_CONTROL_REALTIME_WEB_PORT","19220")),ssl_context=context,access_log=None)
