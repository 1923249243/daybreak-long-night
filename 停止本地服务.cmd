@echo off
powershell.exe -NoProfile -Command "try { $r=Invoke-WebRequest 'http://127.0.0.1:18461/health' -UseBasicParsing -TimeoutSec 2; if($r.Content -eq 'daybreak-long-night-v1'){Invoke-WebRequest 'http://127.0.0.1:18461/stop' -Method POST -UseBasicParsing -TimeoutSec 2|Out-Null} } catch {}"
