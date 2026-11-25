# AccessNull Browser: the Chromium engine (Microsoft Edge's build, which ships working speech recognition)
# with Nova built in, its own profile, its own theme, and Nova's home page.
# Run:  powershell -ExecutionPolicy Bypass -File browser\AccessNull.ps1        (or the desktop shortcut from install.ps1)
$repo = Split-Path -Parent $PSScriptRoot
$ext = Join-Path $repo 'extension'
$theme = Join-Path $PSScriptRoot 'theme'
$profileDir = Join-Path $env:LOCALAPPDATA 'AccessNull\Browser'

$edge = @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { Write-Error 'Microsoft Edge (Chromium) is needed as the engine.'; exit 1 }

# an unpacked extension's id is the SHA-256 of its folder path (UTF-16), first 32 hex digits mapped 0-f -> a-p
$sha = [Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::Unicode.GetBytes($ext))
$id = -join ($sha[0..15] | ForEach-Object { [char](97 + ($_ -shr 4)); [char](97 + ($_ -band 15)) })

Start-Process $edge -ArgumentList @(
  "--user-data-dir=`"$profileDir`"",
  "--load-extension=`"$ext,$theme`"",
  '--no-first-run', '--no-default-browser-check', '--start-maximized',
  "chrome-extension://$id/home.html"
)
