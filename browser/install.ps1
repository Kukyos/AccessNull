# Puts an "AccessNull" shortcut (orb icon) on the desktop and in the Start menu that opens the AccessNull Browser.
$launcher = Join-Path $PSScriptRoot 'AccessNull.ps1'
$icon = Join-Path $PSScriptRoot 'accessnull.ico'
$shell = New-Object -ComObject WScript.Shell
foreach ($dir in @([Environment]::GetFolderPath('Desktop'), (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'))) {
  $lnk = $shell.CreateShortcut((Join-Path $dir 'AccessNull.lnk'))
  $lnk.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
  $lnk.Arguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$launcher`""
  $lnk.IconLocation = $icon
  $lnk.Description = 'AccessNull Browser with Nova'
  $lnk.WindowStyle = 7
  $lnk.Save()
}
'AccessNull shortcut added to the desktop and Start menu.'
