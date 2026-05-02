$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BundledPython = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
$Python = if (Test-Path $BundledPython) { $BundledPython } else { "python" }

$env:PYTHONPATH = "$Root\backend;$Root\backend\.packages_fresh;$Root\backend\.packages"
Set-Location "$Root\backend"

& $Python "$Root\backend\run_server.py"
