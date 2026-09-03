param([string]$PayloadLine)
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
  function Classify-CodexFailure($Events, [string]$StandardError) {
    $eventText = @($Events | Where-Object { $_.type -in @('error', 'turn.failed') } | ForEach-Object { $_ | ConvertTo-Json -Depth 10 -Compress }) -join ' '
    $failureText = "$eventText $StandardError"
    if ($failureText -match '(?i)rate.?limit|too many requests|usage.?limit|quota') { return 'codex_node_rate_limited' }
    if ($failureText -match '(?i)context.?window|context.?length|too many tokens|maximum context') { return 'codex_node_context_limit_exceeded' }
    if ($failureText -match '(?i)model.{0,80}(?:not found|unavailable|unsupported|access)|does not exist') { return 'codex_node_model_unavailable' }
    if ($failureText -match '(?i)output.?schema|json.?schema|schema.{0,40}(?:invalid|unsupported)') { return 'codex_node_output_schema_rejected' }
    if ($failureText -match '(?i)content.?policy|safety.?policy|policy.?violation') { return 'codex_node_policy_rejected' }
    if ($failureText -match '(?i)connection|network|dns|temporarily unavailable|service unavailable') { return 'codex_node_provider_unavailable' }
    return 'codex_node_exec_turn_failed'
  }
  try {
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
      $savedErrorPreference = $ErrorActionPreference
      try {
        # Codex writes login-status text to its native stderr stream. Windows
        # PowerShell must not promote that expected stream to a terminating error.
        $ErrorActionPreference = 'Continue'
        $status = @(& $selected.Path login status 2>&1)
        $statusExitCode = $LASTEXITCODE
      } finally { $ErrorActionPreference = $savedErrorPreference }
      $authenticated = $statusExitCode -eq 0 -and (($status -join ' ') -match 'ChatGPT')
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
      $promptFile = Join-Path $temporary 'prompt.txt'
      $stdoutFile = Join-Path $temporary 'events.jsonl'
      $stderrFile = Join-Path $temporary 'stderr.txt'
      $lastMessageFile = Join-Path $temporary 'last-message.json'
      $schemaJson = $request.outputSchema | ConvertTo-Json -Depth 30 -Compress
      $utf8NoBom = New-Object Text.UTF8Encoding($false)
      [IO.File]::WriteAllText($schemaFile, $schemaJson, $utf8NoBom)
      [IO.File]::WriteAllText($promptFile, [string]$request.instruction, $utf8NoBom)
      $arguments = @('exec', '--ephemeral', '--json', '--sandbox', 'read-only', '--skip-git-repo-check', '--model', [string]$request.providerModel, '--output-schema', $schemaFile, '--output-last-message', $lastMessageFile, '-')
      $stopwatch = [Diagnostics.Stopwatch]::StartNew()
      # Codex always checks stdin for additional prompt input. A background
      # PowerShell job leaves stdin open, so a fast refusal can be hidden until
      # the outer timeout. A supervised native process receives a finite prompt
      # through a finite node-local file. Provider streams also terminate in
      # node-local files, so a persistent code-mode child cannot retain the SSH
      # response pipe after the bounded Codex parent has exited.
      $process = Start-Process -FilePath $selected.Path -ArgumentList $arguments -WindowStyle Hidden -PassThru -RedirectStandardInput $promptFile -RedirectStandardOutput $stdoutFile -RedirectStandardError $stderrFile
      $timeoutMilliseconds = [Math]::Max(1000, [Math]::Min(1800000, [int64]$request.timeoutMs))
      if (-not $process.WaitForExit([int]$timeoutMilliseconds)) { $process.Kill(); $process.WaitForExit(); Fail $operation 'codex_node_exec_timeout' }
      $stdout = if (Test-Path -LiteralPath $stdoutFile -PathType Leaf) { [IO.File]::ReadAllText($stdoutFile) } else { '' }
      $standardError = if (Test-Path -LiteralPath $stderrFile -PathType Leaf) { [IO.File]::ReadAllText($stderrFile) } else { '' }
      $stopwatch.Stop()
      $lines = @($stdout -split '[\r\n]+' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
      $events = @()
      foreach ($line in $lines) { try { $event = $line | ConvertFrom-Json; if ($null -ne $event.type) { $events += $event } } catch {} }
      if (@($events | Where-Object { $_.type -in @('error', 'turn.failed') }).Count -gt 0) { Fail $operation (Classify-CodexFailure $events $standardError) }
      $completed = @($events | Where-Object { $_.type -eq 'turn.completed' })[-1]
      if ($null -eq $completed) {
        if ($null -ne $process.ExitCode -and $process.ExitCode -ne 0) { Fail $operation 'codex_node_exec_failed' }
        Fail $operation 'codex_node_exec_turn_incomplete'
      }
      $messages = @($events | Where-Object { $_.type -eq 'item.completed' -and $_.item.type -eq 'agent_message' })
      $finalMessage = if ($messages.Count -gt 0) { [string]$messages[-1].item.text } elseif (Test-Path -LiteralPath $lastMessageFile -PathType Leaf) { [IO.File]::ReadAllText($lastMessageFile) } else { '' }
      if ([string]::IsNullOrWhiteSpace($finalMessage)) { Fail $operation 'codex_exec_missing_final_message' }
      $started = @($events | Where-Object { $_.type -eq 'thread.started' })[0]
      $types = @($events | Where-Object { $null -ne $_.item.type } | ForEach-Object { [string]$_.item.type } | Sort-Object -Unique)
      if ($types -contains 'file_change') { Fail $operation 'codex_exec_capability_envelope_violation' }
      $telemetry = @()
      if ($null -ne $started) { $telemetry += @{ type = 'thread.started'; threadId = [string]$started.thread_id; elapsedMs = 0 } }
      $telemetry += @{ type = 'turn.completed'; threadId = [string]$started.thread_id; elapsedMs = [int64]$stopwatch.ElapsedMilliseconds; usage = Safe-Usage $completed.usage }
      Emit-Result @{ operation = $operation; ok = $true; codexVersion = $selected.Version; executableSha256 = $executableSha256; discoveredAt = $discoveredAt; threadId = [string]$started.thread_id; finalMessage = $finalMessage; usage = Safe-Usage $completed.usage; observedItemTypes = $types; telemetry = $telemetry }
    } finally { Remove-Item -LiteralPath $temporary -Recurse -Force -ErrorAction SilentlyContinue }
  } catch { Fail 'unknown' 'codex_node_internal_failure' }
}
