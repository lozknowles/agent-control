import argparse, http.server, json, pathlib, time, urllib.request, urllib.error, uuid
p=argparse.ArgumentParser();p.add_argument('--port',type=int,required=True);p.add_argument('--target',required=True);p.add_argument('--output',required=True);a=p.parse_args();root=pathlib.Path(a.output);root.mkdir(parents=True,exist_ok=True)
class Proxy(http.server.BaseHTTPRequestHandler):
 def log_message(self,*args): pass
 def do_GET(self): self.forward()
 def do_POST(self): self.forward()
 def forward(self):
  identity=str(uuid.uuid4());start=time.perf_counter();body=self.rfile.read(int(self.headers.get('Content-Length','0')));response_bytes=b'';status=None;failure=None
  if body: (root/(identity+'-request.json')).write_bytes(body)
  try:
   req=urllib.request.Request(a.target.rstrip('/')+self.path,data=body if self.command=='POST' else None,headers={'Content-Type':'application/json'},method=self.command)
   try: response=urllib.request.urlopen(req,timeout=240)
   except urllib.error.HTTPError as e: response=e
   with response:
    status=response.status;self.send_response(status);self.send_header('Content-Type',response.headers.get('Content-Type','application/json'));self.end_headers()
    while True:
     data=response.read(4096)
     if not data: break
     response_bytes+=data;self.wfile.write(data);self.wfile.flush()
  except Exception as e:
   failure=repr(e)
   if status is None:
    status=502;self.send_response(status);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps({'error':'private_worker_transport_unavailable'}).encode())
  finally:
   (root/(identity+'-response.bin')).write_bytes(response_bytes)
   record={'id':identity,'method':self.command,'path':self.path,'at':time.time(),'elapsed_ms':(time.perf_counter()-start)*1000,'status':status,'failure':failure,'request_file':identity+'-request.json' if body else None,'response_file':identity+'-response.bin'}
   with (root/'requests.jsonl').open('a') as f: f.write(json.dumps(record)+'\n')
http.server.ThreadingHTTPServer(('127.0.0.1',a.port),Proxy).serve_forever()