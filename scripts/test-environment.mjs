import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const existingState = process.env.AGENT_CONTROL_STATE_DIR?.trim();
const existingTelemetry = process.env.AGENT_CONTROL_TELEMETRY_DIR?.trim();
const generated = process.env.AGENT_CONTROL_TEST_GENERATED_ROOT;
const inheritedGenerated = generated && existingState === path.join(generated, 'state') && existingTelemetry === path.join(generated, 'telemetry');
if (!existingState || !existingTelemetry || inheritedGenerated) {
  const prefix = path.join(os.tmpdir(), 'agent-control-test-state-');
  const root = fs.mkdtempSync(prefix);
  if(process.platform==='win32'){
    const script = "$ErrorActionPreference='Stop';$p=$env:AGENT_CONTROL_TEST_ACL_ROOT;$me=[System.Security.Principal.WindowsIdentity]::GetCurrent().User;$acl=[System.Security.AccessControl.DirectorySecurity]::new();$acl.SetOwner($me);$acl.SetAccessRuleProtection($true,$false);foreach($sid in @($me,[System.Security.Principal.SecurityIdentifier]::new('S-1-5-18'))){$acl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow'))};Set-Acl -LiteralPath $p -AclObject $acl";
    const result=spawnSync(path.join(process.env.SystemRoot??'C:\\Windows','System32/WindowsPowerShell/v1.0/powershell.exe'),['-NoProfile','-NonInteractive','-Command',script],{env:{...process.env,AGENT_CONTROL_TEST_ACL_ROOT:root},timeout:10000,windowsHide:true,stdio:'pipe'});
    if(result.status!==0)throw new Error('test_environment_private_root_unavailable');
    // Fixture directories inherit the same real owner-only DACL. No global temp
    // directory or production ACL is changed.
    process.env.TEMP=root;process.env.TMP=root;
  }
  if (!existingState || inheritedGenerated) process.env.AGENT_CONTROL_STATE_DIR = path.join(root, 'state');
  if (!existingTelemetry || inheritedGenerated) process.env.AGENT_CONTROL_TELEMETRY_DIR = path.join(root, 'telemetry');
  process.env.AGENT_CONTROL_TEST_GENERATED_ROOT=root;
  process.once('exit', () => {
    if (root.startsWith(prefix)) fs.rmSync(root, {recursive: true, force: true});
  });
}
