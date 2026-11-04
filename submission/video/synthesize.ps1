param(
  [Parameter(Mandatory=$true)][string]$Storyboard,
  [Parameter(Mandatory=$true)][string]$OutputDirectory
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$plan = Get-Content -LiteralPath $Storyboard -Raw -Encoding UTF8 | ConvertFrom-Json
$null = New-Item -ItemType Directory -Path $OutputDirectory -Force
foreach ($scene in $plan.scenes) {
  $voice = [System.Speech.Synthesis.SpeechSynthesizer]::new()
  try {
    if ($plan.voice) { $voice.SelectVoice($plan.voice) }
    $voice.Rate = [int]$plan.rate
    $voice.Volume = 100
    $target = Join-Path $OutputDirectory ($scene.id + '.wav')
    $voice.SetOutputToWaveFile($target)
    $voice.Speak([string]$scene.narration)
    $voice.SetOutputToNull()
  } finally {
    $voice.Dispose()
  }
}
Write-Output ('Prepared ' + $plan.scenes.Count + ' offline narration segments.')
