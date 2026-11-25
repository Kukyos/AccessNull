# Puts an "AccessNull" shortcut (Nova's orb) on the desktop and in the Start menu.
$here = $PSScriptRoot
$exe = Join-Path $here 'node_modules\electron\dist\electron.exe'
if (-not (Test-Path $exe)) { Write-Error 'Run "npm install" in the nova folder first.'; exit 1 }
$shell = New-Object -ComObject WScript.Shell
foreach ($dir in @([Environment]::GetFolderPath('Desktop'), (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'))) {
  $lnk = $shell.CreateShortcut((Join-Path $dir 'AccessNull.lnk'))
  $lnk.TargetPath = $exe
  $lnk.Arguments = "`"$here`""
  $lnk.WorkingDirectory = $here
  $lnk.IconLocation = Join-Path $here 'icon.ico'
  $lnk.Description = 'AccessNull: the browser built around Nova'
  $lnk.Save()
}
'AccessNull is on your desktop and in the Start menu.'
