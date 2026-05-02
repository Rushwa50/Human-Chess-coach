$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$NodeDir = "$Root\tools\node-v24.15.0-win-x64"
$env:Path = "$NodeDir;$env:Path"

Set-Location "$Root\frontend"

& "$NodeDir\npm.cmd" run dev -- --host 127.0.0.1
