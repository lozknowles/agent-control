import argparse, datetime, hashlib, json, pathlib, subprocess, time, urllib.request

p=argparse.ArgumentParser()
p.add_argument('--ssh-target',required=True); p.add_argument('--ssh-identity',required=True); p.add_argument('--ssh-port',default='8022'); p.add_argument('--suite',required=True); p.add_argument('--output',required=True); p.add_argument('--url',required=True); p.add_argument('--model',required=True)
a=p.parse_args(); root=pathlib.Path(a.output); root.mkdir(parents=True,exist_ok=False)
suite=json.loads(pathlib.Path(a.suite).read_text(encoding='utf-8-sig'))
(root/'suite.json').write_text(json.dumps(suite,indent=2))
ssh=['ssh','-n','-p',a.ssh_port,'-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=5','-i',a.ssh_identity,a.ssh_target]
def telemetry():
    try:
        r=subprocess.run(ssh+['date -u; head -8 /proc/meminfo; ps -o pid,rss,comm'],capture_output=True,text=True,timeout=12)
        return {'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exit':r.returncode,'stdout':r.stdout,'stderr':r.stderr,'battery':None,'charging':None,'temperature':None,'limitation':'Android ADB unavailable; Termux battery/thermal service access denied'}
    except Exception as e: return {'error':str(e),'battery':None,'charging':None,'temperature':None}
def verify(task,out,stem):
    if task['id']=='instruction': return {'passed':out.strip()==task['expected'],'method':'exact three-line comparison'}
    if task['id']=='json':
        try: ok=json.loads(out)==task['expected']
        except Exception: ok=False
        return {'passed':ok,'method':'JSON parse and exact typed object comparison'}
    if task['id']=='code':
        src=root/(stem+'.py'); src.write_text(out)
        check="import runpy\nf=runpy.run_path('/candidate.py')['unique_sorted']\nfor v in [[],[3,1,3,2],[-3,0,-3,2],[7,7]]:\n old=v.copy(); result=f(v); assert result==sorted(set(v)); assert v==old; assert result is not v\nprint('PASS: four cases and input preservation')\n"
        test=root/'check.py'; test.write_text(check)
        cmd=['prlimit','--as=536870912','--cpu=3','--','bwrap','--unshare-all','--die-with-parent','--new-session','--ro-bind','/usr','/usr','--ro-bind','/lib','/lib','--ro-bind','/lib64','/lib64','--proc','/proc','--dev','/dev','--tmpfs','/tmp','--ro-bind',str(src.resolve()),'/candidate.py','--ro-bind',str(test.resolve()),'/check.py','/usr/bin/python3','-I','/check.py']
        try:
            r=subprocess.run(cmd,capture_output=True,text=True,timeout=5)
            return {'passed':r.returncode==0,'method':'network and filesystem isolated bubblewrap Python execution','exit':r.returncode,'stdout':r.stdout,'stderr':r.stderr}
        except Exception as e: return {'passed':False,'error':str(e)}
    return {'passed':None,'method':'human review required against frozen criteria'}
for repeat in range(1,suite['repetitions']+1):
 for task in suite['tasks']:
    stem=f"{repeat:02d}-{task['id']}"; before=telemetry()
    body={'model':a.model,'messages':[{'role':'user','content':task['prompt']}],'temperature':suite['temperature'],'seed':suite['seed'],'max_tokens':suite['max_tokens'],'stream':True,'stream_options':{'include_usage':True},'cache_prompt':False,'chat_template_kwargs':{'enable_thinking':False}}
    (root/(stem+'-request.json')).write_text(json.dumps(body,indent=2))
    start=time.perf_counter(); first=None; output=''; usage=None; timings=None; finish=None; failure=None; events=[]
    try:
      req=urllib.request.Request(a.url.rstrip('/')+'/v1/chat/completions',data=json.dumps(body).encode(),headers={'Content-Type':'application/json'})
      with urllib.request.urlopen(req,timeout=180) as response:
       for raw in response:
        line=raw.decode().strip()
        if not line.startswith('data:'): continue
        payload=line[5:].strip()
        if payload=='[DONE]': break
        event=json.loads(payload); events.append({'elapsed_ms':(time.perf_counter()-start)*1000,'event':event})
        if event.get('usage') is not None: usage=event['usage']
        if event.get('timings') is not None: timings=event['timings']
        for choice in event.get('choices',[]):
         content=choice.get('delta',{}).get('content','') or ''
         if content and first is None: first=(time.perf_counter()-start)*1000
         output+=content
         if choice.get('finish_reason'): finish=choice['finish_reason']
    except Exception as e: failure=repr(e)
    elapsed=(time.perf_counter()-start)*1000
    (root/(stem+'-events.json')).write_text(json.dumps(events,indent=2))
    (root/(stem+'-output.txt')).write_text(output)
    record={'model':a.model,'task':task['id'],'repetition':repeat,'cache':'disabled in request','load_class':'first request after load' if repeat==1 and task==suite['tasks'][0] else 'warm','prompt':task['prompt'],'output':output,'response_ms':elapsed,'client_first_content_ms':first,'output_characters':len(output),'output_utf8_bytes':len(output.encode()),'runtime_reported_usage':usage,'runtime_timings':timings,'finish_reason':finish,'failure':failure,'before':before,'after':telemetry(),'verification':verify(task,output,stem)}
    with (root/'results.jsonl').open('a') as f: f.write(json.dumps(record)+'\n')
    print(json.dumps({k:record[k] for k in ['model','task','repetition','response_ms','client_first_content_ms','failure','verification']}),flush=True)
    if failure: raise SystemExit('Stopped after failed request; preserve attempt and investigate')