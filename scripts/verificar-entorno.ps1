param()

$ErrorActionPreference = "Stop"

function Test-Tool {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Command,
    [Parameter(Mandatory = $true)]
    [string]$Label,
    [Parameter(Mandatory = $true)]
    [scriptblock]$VersionCommand
  )

  $exists = Get-Command $Command -ErrorAction SilentlyContinue
  if ($null -eq $exists) {
    Write-Host "[FALTA] $Label no está instalado o no está en PATH." -ForegroundColor Red
    return $false
  }

  $version = & $VersionCommand
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[FALTA] $Label está instalado pero no respondió correctamente." -ForegroundColor Red
    return $false
  }
  Write-Host "[OK] $Label -> $version" -ForegroundColor Green
  return $true
}

Write-Host ""
Write-Host "Verificando entorno de soporte..." -ForegroundColor Cyan
Write-Host ""

$results = @()
$results += Test-Tool -Command "git" -Label "Git" -VersionCommand { git --version }
$results += Test-Tool -Command "node" -Label "Node.js" -VersionCommand { node --version }
$results += Test-Tool -Command "npm" -Label "npm" -VersionCommand { npm --version }
$results += Test-Tool -Command "rustc" -Label "Rust" -VersionCommand { rustc --version }
$results += Test-Tool -Command "cargo" -Label "Cargo" -VersionCommand { cargo --version }
$results += Test-Tool -Command "npx" -Label "npx" -VersionCommand { npx --version }

$repoRoot = Split-Path -Parent $PSScriptRoot
$srcIndex = Join-Path $repoRoot "src\index.html"
$tauriConfig = Join-Path $repoRoot "src-tauri\tauri.conf.json"

if (Test-Path $srcIndex) {
  Write-Host "[OK] Interfaz principal encontrada." -ForegroundColor Green
} else {
  Write-Host "[FALTA] No se encontró src\\index.html." -ForegroundColor Red
  $results += $false
}

if (Test-Path $tauriConfig) {
  Write-Host "[OK] Configuración Tauri encontrada." -ForegroundColor Green
} else {
  Write-Host "[FALTA] No se encontró src-tauri\\tauri.conf.json." -ForegroundColor Red
  $results += $false
}

Write-Host ""
if ($results -contains $false) {
  Write-Host "Entorno incompleto. Corrige lo marcado antes de dar soporte o compilar." -ForegroundColor Yellow
  exit 1
}

Write-Host "Entorno listo para soporte y compilación." -ForegroundColor Green
