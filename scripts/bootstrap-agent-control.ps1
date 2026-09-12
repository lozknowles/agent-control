param(
  [ValidateSet('check','install')][string]$Mode='check',
  [ValidateSet('control','worker')][string]$Role='control',
  [string]$Target=(Get-Location).Path,
  [string]$Repository=''
)
$ErrorActionPreference='Stop'
foreach($required in @('git','node','npm')) { if(-not (Get-Command $required -ErrorAction SilentlyContinue)) { throw "required_prerequisite_missing:$required" } }
if(-not (Test-Path -LiteralPath $Target -PathType Container)) {
  if($Mode -ne 'install' -or [string]::IsNullOrWhiteSpace($Repository)) { throw 'target_missing_no_changes_made' }
  & git clone -- $Repository $Target
}
if(-not (Test-Path -LiteralPath (Join-Path $Target '.git') -PathType Container)) { throw 'repository_not_git' }
$dirty=& git -C $Target status --porcelain
if($dirty) { throw 'repository_dirty_no_changes_made' }
& git -C $Target rev-parse --verify HEAD | Out-Null
if(-not (Test-Path -LiteralPath (Join-Path $Target 'package-lock.json') -PathType Leaf)) { throw 'lockfile_missing' }
if($Mode -eq 'install') { & npm --prefix $Target ci; & npm --prefix $Target run build }
[ordered]@{schema='agent-control.bootstrap/v1';mode=$Mode;role=$Role;repository='verified';dashboard=$(if(Test-Path -LiteralPath (Join-Path $Target 'assets/dashboard/index.html')){'available'}else{'missing'})} | ConvertTo-Json -Compress
