$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (!(Test-Path -LiteralPath (Join-Path $projectRoot '.sites-runtime\workspace-key.txt'))) { throw 'Private local workspace key is missing. See the local setup guide.' }
if (Get-NetTCPConnection -LocalPort 8082 -State Listen -ErrorAction SilentlyContinue) { Write-Output 'Working-copy service is already listening on port 8082.'; exit 0 }
$nodePath = (Get-Command node).Source
$entryPath = Join-Path $projectRoot 'scripts\local-workspace.mjs'
$process = Start-Process -FilePath $nodePath -ArgumentList ('"' + $entryPath + '"') -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $projectRoot '.sites-runtime\workspace-out.log') -RedirectStandardError (Join-Path $projectRoot '.sites-runtime\workspace-error.log')
$process.Id | Set-Content -LiteralPath (Join-Path $projectRoot '.sites-runtime\workspace.pid')
Write-Output 'Started the private local working-copy service on loopback port 8082.'

