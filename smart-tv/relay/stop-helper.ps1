$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$pidFile = Join-Path $repo ".local\connection-helper.pid"
if (!(Test-Path -LiteralPath $pidFile)) { Write-Host "The connection helper is not running."; exit }
$helperPid = [int](Get-Content -LiteralPath $pidFile)
$process = Get-CimInstance Win32_Process -Filter "ProcessId = $helperPid" -ErrorAction SilentlyContinue
if ($process) {
 if ($process.CommandLine -notmatch 'smart-tv[/\\]relay[/\\]server\.cjs' -or $process.CommandLine -notmatch 'connection-helper\.json') { throw "The saved process ID belongs to another program. No process was stopped." }
 Stop-Process -Id $helperPid
}
Remove-Item -LiteralPath $pidFile
Write-Host "IPTV TORONTO connection helper stopped."
