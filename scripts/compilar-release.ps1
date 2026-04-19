param(
  [string]$Version = ""
)

$ErrorActionPreference = "Stop"

function Invoke-Native {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Arguments
  )

  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Fallo el comando: $FilePath $($Arguments -join ' ')"
  }
}

Write-Host ""
Write-Host "Compilando release de escritorio..." -ForegroundColor Cyan

if ($Version -ne "") {
  Write-Host "Version de referencia: $Version"
}

Invoke-Native npm install
Invoke-Native npm run tauri build

Write-Host ""
Write-Host "Compilacion terminada." -ForegroundColor Green
Write-Host "Busca los instaladores en:"
Write-Host "  src-tauri\target\release\bundle\nsis"
Write-Host "  src-tauri\target\release\bundle\msi"
