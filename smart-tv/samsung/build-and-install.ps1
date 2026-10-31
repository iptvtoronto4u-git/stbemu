param(
 [Parameter(Mandatory=$true)][string]$CertificateProfile,
 [string]$TizenStudio = "C:\tizen-studio",
 [string]$DeviceName = ""
)
$ErrorActionPreference = "Stop"
$tizen = Join-Path $TizenStudio "tools\ide\bin\tizen.bat"
if (!(Test-Path $tizen)) { throw "Tizen CLI not found at $tizen. Set -TizenStudio to your actual installation folder." }
$source = Split-Path -Parent $MyInvocation.MyCommand.Path
$build = Join-Path $source "build"
if (Test-Path $build) { Remove-Item $build -Recurse -Force }
Write-Host "Building IPTV TORONTO Samsung TV web application..."
Push-Location $source
try {
 & $tizen build-web -out build .
 if ($LASTEXITCODE -ne 0) { throw "Tizen web build failed." }
 & $tizen package -t wgt -s $CertificateProfile -- $build
 if ($LASTEXITCODE -ne 0) { throw "Tizen signing/package failed. Check your Samsung TV certificate profile." }
 $wgt = Get-ChildItem -Path $build -Filter *.wgt -Recurse | Select-Object -First 1
 if (!$wgt) { throw "Signed .wgt not found in build output." }
 Write-Host "SIGNED WGT: $($wgt.FullName)"
 if ($DeviceName) {
   & $tizen install -n $wgt.Name -t $DeviceName -- $wgt.DirectoryName
   if ($LASTEXITCODE -ne 0) { throw "TV installation failed. Check Developer Mode, DUID and device connection." }
   Write-Host "Installed on TV device: $DeviceName"
 } else {
   Write-Host "To install: rerun with -DeviceName matching 'tizen device list'."
 }
} finally { Pop-Location }
