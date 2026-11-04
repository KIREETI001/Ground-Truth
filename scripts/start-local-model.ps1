param()
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $env:USERPROFILE '.groundtruth-runtime'
$serverPath = Join-Path $runtimeRoot 'llama\llama-server.exe'
$modelPath = Join-Path $runtimeRoot 'Qwen3.5-9B-Q4_K_M.gguf'
$keyPath = Join-Path $projectRoot '.sites-runtime\llm-key.txt'
if (!(Test-Path -LiteralPath $serverPath) -or !(Test-Path -LiteralPath $modelPath) -or !(Test-Path -LiteralPath $keyPath)) { throw 'Local runtime, verified model, or private key is missing. See docs/local-project-mvp.md.' }
$expectedHash = '03b74727a860a56338e042c4420bb3f04b2fec5734175f4cb9fa853daf52b7e8'
if ((Get-FileHash -LiteralPath $modelPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedHash) { throw 'Model integrity check failed.' }
$listener = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue
if ($listener) { Write-Output 'Port 8081 is already serving. Check its health before starting another model.'; exit 0 }
$arguments = @('--model',$modelPath,'--alias','groundtruth-local','--host','127.0.0.1','--port','8081','--ctx-size','8192','--parallel','1','--gpu-layers','99','--device','Vulkan1','--reasoning-budget','0','--api-key-file',('"' + $keyPath + '"'))
$process = Start-Process -FilePath $serverPath -ArgumentList $arguments -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $projectRoot '.sites-runtime\model-out.log') -RedirectStandardError (Join-Path $projectRoot '.sites-runtime\model-error.log')
$process.Id | Set-Content -LiteralPath (Join-Path $projectRoot '.sites-runtime\model.pid')
Write-Output 'Starting the local model on loopback port 8081. Startup logs are in .sites-runtime.'


