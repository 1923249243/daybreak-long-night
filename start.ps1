param([switch]$DefaultBrowser,[switch]$CheckOnly)
$ErrorActionPreference='Stop'
$taskBase='http://127.0.0.1:18461'
$taskReady=$false
try{$taskReady=(Invoke-WebRequest "$taskBase/health" -UseBasicParsing -TimeoutSec 2).Content -eq 'daybreak-long-night-v1'}catch{}
if(-not $taskReady){
 $taskNode=(Get-Command node -ErrorAction Stop).Source
 $taskLog=Join-Path $PSScriptRoot '.local'
 New-Item -ItemType Directory -Path $taskLog -Force|Out-Null
 $taskServer=Join-Path $PSScriptRoot 'server.cjs'
 Start-Process -FilePath $taskNode -ArgumentList @('"'+$taskServer+'"') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskLog 'server.log') -RedirectStandardError (Join-Path $taskLog 'server-error.log')
 for($taskTry=0;$taskTry -lt 30;$taskTry++){Start-Sleep -Milliseconds 200;try{$taskReady=(Invoke-WebRequest "$taskBase/health" -UseBasicParsing -TimeoutSec 1).Content -eq 'daybreak-long-night-v1'}catch{};if($taskReady){break}}
}
if(-not $taskReady){throw 'The local game did not start. Check .local/server-error.log.'}
$taskHasher=[System.Security.Cryptography.SHA256]::Create()
try{
 foreach($taskAsset in @('index.html','style.css','world.js','game.js','story.js','render.js','audio.js','app.js','vendor/three.min.js','assets/manifest.json')){
  $taskRemote=Invoke-WebRequest "$taskBase/$taskAsset" -UseBasicParsing -TimeoutSec 5
  $taskRemoteHash=([BitConverter]::ToString($taskHasher.ComputeHash($taskRemote.RawContentStream.ToArray()))).Replace('-','')
  $taskLocalHash=(Get-FileHash -LiteralPath (Join-Path $PSScriptRoot $taskAsset) -Algorithm SHA256).Hash
  if($taskRemoteHash -ne $taskLocalHash){throw 'Another folder is being served. Close the older game and use its stop launcher, then try again.'}
 }
}finally{$taskHasher.Dispose()}
if($CheckOnly){Write-Output 'Local game service and all runtime files passed verification.';return}
if($DefaultBrowser){Start-Process $taskBase;return}
$taskCandidates=@((Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),(Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),(Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe'),(Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'))
$taskBrowser=$taskCandidates|Where-Object{Test-Path -LiteralPath $_}|Select-Object -First 1
if(-not $taskBrowser){throw 'Please install Chrome or Edge, or use -DefaultBrowser.'}
$taskProfile=Join-Path $env:LOCALAPPDATA 'DaybreakLongNight\BrowserProfile'
New-Item -ItemType Directory -Path $taskProfile -Force|Out-Null
$taskArgs=@(('--user-data-dir="{0}"' -f $taskProfile),'--force-high-performance-gpu','--force_high_performance_gpu','--no-first-run','--no-default-browser-check',('--app={0}' -f $taskBase))
Start-Process -FilePath $taskBrowser -ArgumentList $taskArgs -WindowStyle Normal
