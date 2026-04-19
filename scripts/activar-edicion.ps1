param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("matriz", "operativa")]
  [string]$Edition
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceFile = Join-Path $repoRoot "config\ediciones\edicion.$Edition.js"
$targetFile = Join-Path $repoRoot "src\edition-config.js"

if (!(Test-Path $sourceFile)) {
  throw "No existe la configuración de edición: $sourceFile"
}

Copy-Item $sourceFile $targetFile -Force

Write-Host ""
Write-Host "Edición activada: $Edition" -ForegroundColor Green
Write-Host "Archivo aplicado: $targetFile"
Write-Host ""
Write-Host "Siguiente paso sugerido:" -ForegroundColor Cyan
if ($Edition -eq "matriz") {
  Write-Host "  npm run tauri dev"
} else {
  Write-Host "  npm run tauri build"
}

