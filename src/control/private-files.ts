import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

function windowsAcl(file:string,operation:'restrict'|'inspect') {
  const script = `
$ErrorActionPreference='Stop'
$p=$env:AGENT_CONTROL_ACL_TARGET
$me=[System.Security.Principal.WindowsIdentity]::GetCurrent().User
$system=[System.Security.Principal.SecurityIdentifier]::new('S-1-5-18')
if($env:AGENT_CONTROL_ACL_OPERATION -eq 'restrict'){
 $directory=(Get-Item -LiteralPath $p -Force).PSIsContainer
 if($directory){$acl=[System.Security.AccessControl.DirectorySecurity]::new()}else{$acl=[System.Security.AccessControl.FileSecurity]::new()}
 $acl.SetOwner($me);$acl.SetAccessRuleProtection($true,$false)
 foreach($sid in @($me,$system)){
  if($directory){$rule=[System.Security.AccessControl.FileSystemAccessRule]::new($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow')}
  else{$rule=[System.Security.AccessControl.FileSystemAccessRule]::new($sid,'FullControl','Allow')}
  $acl.AddAccessRule($rule)
 }
 if($directory){[System.IO.Directory]::SetAccessControl($p,$acl)}else{[System.IO.File]::SetAccessControl($p,$acl)}
}
$acl=Get-Acl -LiteralPath $p
$owner=$acl.GetOwner([System.Security.Principal.SecurityIdentifier]).Value
$rules=@($acl.GetAccessRules($true,$true,[System.Security.Principal.SecurityIdentifier])|ForEach-Object{@{sid=$_.IdentityReference.Value;type=$_.AccessControlType.ToString();rights=[int]$_.FileSystemRights}})
@{current=$me.Value;owner=$owner;rules=$rules}|ConvertTo-Json -Compress -Depth 4
`;
  const result=spawnSync(path.join(process.env.SystemRoot??'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe'),
    ['-NoProfile','-NonInteractive','-Command',script],{encoding:'utf8',timeout:10000,windowsHide:true,
    env:{...process.env,AGENT_CONTROL_ACL_TARGET:path.resolve(file),AGENT_CONTROL_ACL_OPERATION:operation}});
  if(result.status!==0)throw new Error('private_file_acl_unavailable', {cause: result.error ?? new Error(result.stderr.trim())});
  return JSON.parse(result.stdout.trim()) as {current:string;owner:string;rules:Array<{sid:string;type:string;rights:number}>};
}
/** Unix modes and Windows DACLs express the same owner-only policy, not the same bits. */
export function restrictOwnerOnly(file:string,mode:0o600|0o700) {
  const stat=fs.lstatSync(file);
  if(stat.isSymbolicLink())throw new Error('private_file_symlink_denied');
  if(process.platform==='win32')windowsAcl(file,'restrict');else fs.chmodSync(file,mode);
}
export function assertOwnerOnly(file:string) {
  const stat=fs.lstatSync(file);
  if(stat.isSymbolicLink())throw new Error('private_file_permissions_invalid');
  if(process.platform==='win32'){
    const acl=windowsAcl(file,'inspect');
    if(acl.owner!==acl.current||!acl.rules.some(r=>r.sid===acl.current&&r.type==='Allow')||
       acl.rules.some(r=>r.type==='Allow'&&r.rights!==0&&r.sid!==acl.current&&r.sid!=='S-1-5-18'))throw new Error('private_file_permissions_invalid');
  }else if((stat.mode&0o077)!==0||(typeof process.getuid==='function'&&stat.uid!==process.getuid()))throw new Error('private_file_permissions_invalid');
  return stat;
}
