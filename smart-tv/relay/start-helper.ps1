param([string]$NodePath = "C:\Program Files\sfdx\client\bin\node.exe")
$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$private = Join-Path $repo ".local"
$config = Join-Path $private "connection-helper.json"
if (!(Test-Path -LiteralPath $config)) { throw "The PC helper has not been paired with this TV." }
if (!(Test-Path -LiteralPath $NodePath)) { throw "Node.js not found. Supply -NodePath with the installed Node.js location." }
$pidFile = Join-Path $private "connection-helper.pid"
if (Test-Path -LiteralPath $pidFile) {
 $helperPid = [int](Get-Content -LiteralPath $pidFile)
 $existing = Get-CimInstance Win32_Process -Filter "ProcessId = $helperPid" -ErrorAction SilentlyContinue
 if ($existing -and $existing.CommandLine -match 'smart-tv[/\\]relay[/\\]server\.cjs' -and $existing.CommandLine -match 'connection-helper\.json') {
  Write-Host "IPTV TORONTO connection helper is already running."
  exit
 }
}
$server = Join-Path $PSScriptRoot "server.cjs"
$process = Start-Process -FilePath $NodePath -ArgumentList @(('"' + $server + '"'), ('"' + $config + '"')) -WorkingDirectory $repo -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $private "connection-helper.log") -RedirectStandardError (Join-Path $private "connection-helper-error.log")
$process.Id | Set-Content -LiteralPath $pidFile
Write-Host "IPTV TORONTO connection helper started. Keep this PC on while testing."
