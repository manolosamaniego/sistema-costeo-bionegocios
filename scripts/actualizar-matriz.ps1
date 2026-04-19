param(
  [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot

function Invoke-Native {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Arguments
  )

  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Falló el comando: $FilePath $($Arguments -join ' ')"
  }
}

Write-Host ""
Write-Host "Actualizando matriz local..." -ForegroundColor Cyan
Write-Host "Ruta: $repoRoot"
Write-Host "Branch: $Branch"
Write-Host ""

Set-Location $repoRoot

Invoke-Native git fetch origin
Invoke-Native git checkout $Branch
Invoke-Native git pull origin $Branch
Invoke-Native npm install
Invoke-Native npm run edition:matriz

Write-Host ""
Write-Host "Matriz actualizada correctamente." -ForegroundColor Green
Write-Host "Siguiente paso recomendado: npm run tauri dev"
