param(
  [Parameter(Mandatory = $true)]
  [string]$Version
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$releaseRoot = Join-Path $repoRoot "releases\$Version"
$nsisSource = Join-Path $repoRoot "src-tauri\target\release\bundle\nsis"
$msiSource = Join-Path $repoRoot "src-tauri\target\release\bundle\msi"
$packageDir = Join-Path $releaseRoot "paquete"
$notesPath = Join-Path $releaseRoot "NOTA-DE-ENTREGA.md"

if (!(Test-Path $releaseRoot)) {
  New-Item -ItemType Directory -Path $releaseRoot | Out-Null
}

if (Test-Path $packageDir) {
  Remove-Item -Recurse -Force $packageDir
}
New-Item -ItemType Directory -Path $packageDir | Out-Null

if (Test-Path $nsisSource) {
  Get-ChildItem $nsisSource -Filter *.exe | Copy-Item -Destination $packageDir -Force
}

if (Test-Path $msiSource) {
  Get-ChildItem $msiSource -Filter *.msi | Copy-Item -Destination $packageDir -Force
}

$note = @"
# Nota de entrega - versión $Version

## Fecha

$(Get-Date -Format "yyyy-MM-dd HH:mm")

## Contenido esperado

- instalador `.exe`
- instalador `.msi`
- correcciones o mejoras según changelog

## Verificación sugerida al cliente

- abrir la app
- cargar un JSON anterior
- guardar un nuevo JSON
- confirmar que el branding se mantiene
- imprimir el informe

"@

Set-Content -Path $notesPath -Value $note -Encoding UTF8

Write-Host ""
Write-Host "Release preparada correctamente." -ForegroundColor Green
Write-Host "Ruta: $releaseRoot"
Write-Host "Paquete: $packageDir"
Write-Host "Nota: $notesPath"
