& {
  $ErrorActionPreference = 'Stop'
  $ResultSchema = 'agent-control.codex-node-result/v1'
  function Emit-Result([hashtable]$Value) { $Value.schema = $ResultSchema; [Console]::Out.WriteLine(($Value | ConvertTo-Json -Depth 20 -Compress)) }
  function Fail([string]$Operation, [string]$Code) { Emit-Result @{ operation = $Operation; ok = $false; error = $Code }; exit 0 }
  function Safe-Usage($Usage) {
    if ($null -eq $Usage) { return $null }
    $out = @{}
    foreach ($property in $Usage.PSObject.Properties) {
      if ($property.Value -is [byte] -or $property.Value -is [int16] -or $property.Value -is [int32] -or $property.Value -is [int64] -or $property.Value -is [decimal] -or $property.Value -is [double]) {
        if ([double]$property.Value -ge 0) { $out[$property.Name] = $property.Value }
      } elseif ($null -ne $property.Value -and $property.Value -isnot [string]) { $out[$property.Name] = Safe-Usage $property.Value }
    }
    return $out
  }
  try {
    $payloadLine = [Console]::In.ReadLine()
    if ([string]::IsNullOrWhiteSpace($payloadLine)) { Fail 'unknown' 'codex_node_request_missing' }
    $requestText = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payloadLine))
    $request = $requestText | ConvertFrom-Json
    $operation = [string]$request.operation
    if ($operation -notin @('accountStatus', 'execReadOnlyStructured')) { Fail $operation 'codex_node_operation_not_allowed' }
    foreach ($value in @([string]$request.providerId, [string]$request.accountProfileId, [string]$request.nodeId)) { if ($value -notmatch '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$') { Fail $operation 'codex_node_identity_invalid' } }
    $credentialEnvironment = [string]$request.credentialEnvironment
    if ($credentialEnvironment -notmatch '^[A-Z][A-Z0-9_]{0,127}$') { Fail $operation 'codex_node_credential_reference_invalid' }
    $codexHome = [Environment]::GetEnvironmentVariable($credentialEnvironment, 'Process')
    if ([string]::IsNullOrWhiteSpace($codexHome)) { $codexHome = [Environment]::GetEnvironmentVariable($credentialEnvironment, 'User') }
    if ([string]::IsNullOrWhiteSpace($codexHome) -or -not (Test-Path -LiteralPath $codexHome -PathType Container)) { Fail $operation 'account_profile_authentication_required' }
    $root = Join-Path $env:LOCALAPPDATA 'OpenAI\Codex\bin'
    if (-not (Test-Path -LiteralPath $root -PathType Container)) { Fail $operation 'codex_node_executable_missing' }
    $selected = $null
    foreach ($candidate in @(Get-ChildItem -LiteralPath $root -Directory | ForEach-Object { Join-Path $_.FullName 'codex.exe' } | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Sort-Object @{Expression={(Get-Item -LiteralPath $_).LastWriteTimeUtc};Descending=$true}, @{Expression={$_};Descending=$false})) {
      $versionOutput = @(& $candidate --version 2>$null)
      if ($LASTEXITCODE -eq 0 -and ($versionOutput -join ' ') -match '^codex-cli\s+[0-9]+\.[0-9]+\.[0-9]+') { $selected = @{ Path = $candidate; Version = ($versionOutput -join ' ').Trim() }; break }
    }
    if ($null -eq $selected) { Fail $operation 'codex_node_executable_unqualified' }
    $discoveredAt = [DateTime]::UtcNow.ToString('o')
    $executableSha256 = (Get-FileHash -LiteralPath $selected.Path -Algorithm SHA256).Hash.ToLowerInvariant()
    $env:CODEX_HOME = $codexHome
    if ($operation -eq 'accountStatus') {
      $status = @(& $selected.Path login status 2>$null)
      $authenticated = $LASTEXITCODE -eq 0 -and (($status -join ' ') -match 'ChatGPT')
      if (-not $authenticated) { Fail $operation 'codex_chatgpt_auth_required' }
      Emit-Result @{ operation = $operation; ok = $true; authenticated = $true; codexVersion = $selected.Version; executableSha256 = $executableSha256; discoveredAt = $discoveredAt }
      exit 0
    }
    foreach ($value in @([string]$request.modelId, [string]$request.providerModel)) { if ($value -notmatch '^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,255}$') { Fail $operation 'codex_node_model_identity_invalid' } }
    if ($null -eq $request.outputSchema -or [string]::IsNullOrWhiteSpace([string]$request.instruction)) { Fail $operation 'codex_node_exec_request_invalid' }
    $temporary = Join-Path ([IO.Path]::GetTempPath()) ('agent-control-codex-' + [Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $temporary | Out-Null
    try {
      $schemaFile = Join-Path $temporary 'output.schema.json'
      $request.outputSchema | ConvertTo-Json -Depth 30 -Compress | Set-Content -LiteralPath $schemaFile -Encoding UTF8
      $arguments = @('exec', '--ephemeral', '--json', '--sandbox', 'read-only', '--model', [string]$request.providerModel, '--output-schema', $schemaFile, [string]$request.instruction)
      $argumentsJson = $arguments | ConvertTo-Json -Compress
      $stopwatch = [Diagnostics.Stopwatch]::StartNew()
      $job = Start-Job -ScriptBlock { param($Executable, $ArgumentsJson, $Home) $env:CODEX_HOME = $Home; $Arguments = @($ArgumentsJson | ConvertFrom-Json); @(& $Executable @Arguments 2>&1) } -ArgumentList $selected.Path, $argumentsJson, $codexHome
      $timeoutSeconds = [Math]::Max(1, [Math]::Min(1800, [Math]::Ceiling(([double]$request.timeoutMs) / 1000)))
      if ($null -eq (Wait-Job -Job $job -Timeout $timeoutSeconds)) { Stop-Job -Job $job; Remove-Job -Job $job -Force; Fail $operation 'codex_node_exec_timeout' }
      $lines = @(Receive-Job -Job $job -ErrorAction SilentlyContinue | ForEach-Object { [string]$_ })
      $state = $job.State
      $stopwatch.Stop()
      Remove-Job -Job $job -Force
      if ($state -ne 'Completed') { Fail $operation 'codex_node_exec_failed' }
      $events = @()
      foreach ($line in $lines) { try { $event = $line | ConvertFrom-Json; if ($null -ne $event.type) { $events += $event } } catch {} }
      if (@($events | Where-Object { $_.type -in @('error', 'turn.failed') }).Count -gt 0) { Fail $operation 'codex_node_exec_turn_failed' }
      $completed = @($events | Where-Object { $_.type -eq 'turn.completed' })[-1]
      if ($null -eq $completed) { Fail $operation 'codex_node_exec_turn_incomplete' }
      $messages = @($events | Where-Object { $_.type -eq 'item.completed' -and $_.item.type -eq 'agent_message' })
      if ($messages.Count -eq 0) { Fail $operation 'codex_exec_missing_final_message' }
      $started = @($events | Where-Object { $_.type -eq 'thread.started' })[0]
      $types = @($events | Where-Object { $null -ne $_.item.type } | ForEach-Object { [string]$_.item.type } | Sort-Object -Unique)
      if ($types -contains 'file_change') { Fail $operation 'codex_exec_capability_envelope_violation' }
      $telemetry = @()
      if ($null -ne $started) { $telemetry += @{ type = 'thread.started'; threadId = [string]$started.thread_id; elapsedMs = 0 } }
      $telemetry += @{ type = 'turn.completed'; threadId = [string]$started.thread_id; elapsedMs = [int64]$stopwatch.ElapsedMilliseconds; usage = Safe-Usage $completed.usage }
      Emit-Result @{ operation = $operation; ok = $true; codexVersion = $selected.Version; executableSha256 = $executableSha256; discoveredAt = $discoveredAt; threadId = [string]$started.thread_id; finalMessage = [string]$messages[-1].item.text; usage = Safe-Usage $completed.usage; observedItemTypes = $types; telemetry = $telemetry }
    } finally { Remove-Item -LiteralPath $temporary -Recurse -Force -ErrorAction SilentlyContinue }
  } catch { Fail 'unknown' 'codex_node_internal_failure' }
}
