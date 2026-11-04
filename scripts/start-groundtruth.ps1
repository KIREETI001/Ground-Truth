$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
  if (!(Test-Path -LiteralPath '.dev.vars') -or !(Test-Path -LiteralPath 'node_modules')) { throw 'Local configuration or dependencies are missing. Read README.md first.' }
  & (Join-Path $PSScriptRoot 'start-local-model.ps1')
  & (Join-Path $PSScriptRoot 'start-local-workspace.ps1')
  $privateToken = (Get-Content -LiteralPath '.sites-runtime/workspace-key.txt' -Raw).Trim()
  $ready = $false
  for ($attempt = 0; $attempt -lt 20; $attempt++) {
    try {
      Invoke-RestMethod -Uri 'http://127.0.0.1:8082/auth-bootstrap' -Method Post -Headers @{Authorization="Bearer $privateToken"} -ContentType 'application/json' -Body '{}' | Out-Null
      $ready = $true; break
    } catch { Start-Sleep -Milliseconds 500 }
  }
  if (!$ready) { throw 'The private local companion did not become ready. Check .sites-runtime/workspace-error.log.' }
  Write-Output 'Developer credentials: .sites-runtime/local-login.json (private). Open http://127.0.0.1:5173/login'
  if (Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue) {
    Write-Output 'The website is already listening on port 5173.'
  } else {
    & corepack pnpm dev
  }
} finally { Pop-Location }
