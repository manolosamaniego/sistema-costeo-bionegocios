param(
  [string]$WorkspaceRoot = "C:\Proyectos",
  [string]$RepoUrl = "https://gitlab.com/manolo.samaniego-group/sistema-costeo-bionegocios.git"
)

$ErrorActionPreference = "Stop"

$projectPath = Join-Path $WorkspaceRoot "sistema-costeo-bionegocios"

Write-Host ""
Write-Host "Preparando laptop de soporte..." -ForegroundColor Cyan
Write-Host "Workspace: $WorkspaceRoot"
Write-Host "Proyecto:  $projectPath"
Write-Host ""

if (!(Test-Path $WorkspaceRoot)) {
  New-Item -ItemType Directory -Path $WorkspaceRoot | Out-Null
}

if (Test-Path $projectPath) {
  Write-Host "La carpeta del proyecto ya existe. No se clonará otra vez." -ForegroundColor Yellow
} else {
  & git clone $RepoUrl $projectPath
}

Set-Location $projectPath

Write-Host ""
Write-Host "Instalando dependencias NPM..." -ForegroundColor Cyan
& npm install

Write-Host ""
Write-Host "Verificando herramientas..." -ForegroundColor Cyan
& node --version
& npm --version
& rustc --version
& cargo --version
& git --version

Write-Host ""
Write-Host "Laptop lista para trabajar con la matriz." -ForegroundColor Green
Write-Host "Para abrir en desarrollo ejecuta: npm run tauri dev"
Write-Host "Para compilar instalador ejecuta: npm run tauri build"

