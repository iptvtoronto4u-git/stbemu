param(
 [Parameter(Mandatory=$true)][string]$CertificateProfile,
 [string]$TizenStudio = "C:\tizen-studio",
 [string]$DeviceName = "",
 [string]$DeviceSerial = "",
 [switch]$Launch
)
$ErrorActionPreference = "Stop"
$tizen = Join-Path $TizenStudio "tools\ide\bin\tizen.bat"
if (!(Test-Path -LiteralPath $tizen)) { throw "Tizen CLI not found at $tizen." }
if ($DeviceName -and $DeviceSerial) { throw "Use DeviceName or DeviceSerial, not both." }
if ($Launch -and !($DeviceName -or $DeviceSerial)) { throw "Launch requires a device." }
$source = $PSScriptRoot
[xml]$manifest = Get-Content -LiteralPath (Join-Path $source "config.xml")
$application = $manifest.SelectSingleNode("//*[local-name()='application']")
if (!$application -or $application.GetAttribute("package") -cnotmatch '^[A-Za-z0-9]{10}$') {
 throw "The Tizen package ID must contain exactly 10 letters or digits."
}
# Checkout assets are in shared; staging ZIP assets are beside this script.
$assets = Join-Path (Split-Path -Parent $source) "shared"
if (!(Test-Path -LiteralPath (Join-Path $assets "index.html"))) { $assets = $source }
$files = @("icon.png", "index.html", "style.css", "app.js", "profile-utils.js", "portal-provider.js", "portal-diagnostics.js", "tizen-player.js")
foreach ($file in $files) {
 if (!(Test-Path -LiteralPath (Join-Path $assets $file))) { throw "Missing app asset: $file" }
}
# Separate inputs and outputs; preserve earlier builds without packaging them again.
$job = Join-Path $source ("build\" + [guid]::NewGuid().ToString("N"))
$stage = Join-Path $job "source"
$build = Join-Path $job "output"
New-Item -ItemType Directory -Path $stage -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $source "config.xml") -Destination $stage
foreach ($file in $files) { Copy-Item -LiteralPath (Join-Path $assets $file) -Destination $stage }
Write-Host "Building IPTV TORONTO Samsung TV prototype..."
& $tizen build-web -out $build -- $stage
if ($LASTEXITCODE -ne 0) { throw "Tizen web build failed." }
# Use only the local certificate profile; never pass passwords to this script.
& $tizen package -t wgt -s $CertificateProfile -- $build
if ($LASTEXITCODE -ne 0) { throw "Signing failed. Check the profile locally in Samsung Certificate Manager." }
$packages = @(Get-ChildItem -LiteralPath $build -Filter *.wgt -File)
if ($packages.Count -ne 1) { throw "Expected exactly one signed WGT in $build." }
$wgt = $packages[0]
# Samsung's remote installer cannot reliably handle spaces in the WGT basename.
$installName = Join-Path $build "IPTV-TORONTO.wgt"
if ($wgt.FullName -ne $installName) {
 Move-Item -LiteralPath $wgt.FullName -Destination $installName
 $wgt = Get-Item -LiteralPath $installName
}
Write-Host "SIGNED WGT: $($wgt.FullName)"
$targetArgs = @()
if ($DeviceSerial) { $targetArgs = @("-s", $DeviceSerial) }
elseif ($DeviceName) { $targetArgs = @("-t", $DeviceName) }
if ($targetArgs.Count) {
 & $tizen install -n $wgt.Name @targetArgs -- $wgt.DirectoryName
 if ($LASTEXITCODE -ne 0) { throw "Installation failed. Check Developer Mode, certificate DUID and installation permission." }
 Write-Host "Installed IPTV TORONTO."
 if ($Launch) {
  [xml]$manifest = Get-Content -LiteralPath (Join-Path $stage "config.xml")
  $app = $manifest.SelectSingleNode("//*[local-name()='application']")
  & $tizen run -p $app.GetAttribute("id") @targetArgs
  if ($LASTEXITCODE -ne 0) { throw "Installed, but launch failed." }
 }
} else { Write-Host "To install, use -DeviceSerial from 'sdb devices' or -DeviceName from Device Manager." }
