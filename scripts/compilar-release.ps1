param(
  [string]$Version = ""
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "Compilando release de escritorio..." -ForegroundColor Cyan

if ($Version -ne "") {
  Write-Host "Version de referencia: $Version"
}

& npm install
& npm run tauri build

Write-Host ""
Write-Host "Compilación terminada." -ForegroundColor Green
Write-Host "Busca los instaladores en:"
Write-Host "  src-tauri\target\release\bundle\nsis"
Write-Host "  src-tauri\target\release\bundle\msi"

