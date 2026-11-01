param(
 [Parameter(Mandatory=$true)][string]$SdkRoot,
 [Parameter(Mandatory=$true)][string]$CaBundle
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$sdk = (Resolve-Path -LiteralPath $SdkRoot).Path.Replace('\','/')
$ca = (Resolve-Path -LiteralPath $CaBundle).Path
$work = Join-Path $repo '.local/native-build'
New-Item -ItemType Directory -Path $work -Force | Out-Null
$temp = (Join-Path $work 'temp').Replace('\','/')
New-Item -ItemType Directory -Path $temp -Force | Out-Null
$config = @"
EMSCRIPTEN_ROOT = '$sdk/fastcomp/emscripten'
LLVM_ROOT = '$sdk/fastcomp/fastcomp/bin'
BINARYEN_ROOT = '$sdk/fastcomp'
NODE_JS = ['$sdk/node/12.9.1_64bit/node.exe']
COMPILER_ENGINE = NODE_JS
JS_ENGINES = [NODE_JS]
TEMP_DIR = '$temp'
"@
$env:EM_CONFIG = Join-Path $work 'config.py'
[IO.File]::WriteAllText($env:EM_CONFIG,$config)
$env:EM_CACHE = Join-Path $work 'cache'
$env:EM_PORTS = Join-Path $work 'ports'
$env:EMCC_CORES = '4'
$output = Join-Path $repo 'smart-tv/shared/native/portal-http.js'
$arguments = @((Join-Path $PSScriptRoot 'portal-http.c'),'-o',$output,'-Os','-s','ENVIRONMENT_MAY_BE_TIZEN=1','-s','USE_CURL=1','-s','MODULARIZE=1','-s','EXPORT_NAME=createPortalModule','-s','ENVIRONMENT=worker','-s','ALLOW_MEMORY_GROWTH=1','-s','EXPORTED_FUNCTIONS=["_main","_portal_fetch","_portal_status","_portal_error","_portal_clear"]','-s','EXTRA_EXPORTED_RUNTIME_METHODS=["ccall"]','--embed-file',($ca+'@/cacert.pem'))
& "$sdk/python/2.7.13.1_64bit/python-2.7.13.amd64/python.exe" "$sdk/fastcomp/emscripten/emcc.py" @arguments
if ($LASTEXITCODE -ne 0) { throw 'Native HTTP build failed.' }
