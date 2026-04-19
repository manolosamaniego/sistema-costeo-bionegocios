param(
  [Parameter(Mandatory = $true)]
  [string]$ClientId,
  [Parameter(Mandatory = $true)]
  [string]$BrandingFile,
  [string]$LicenseFile = "",
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

function Get-PackageVersion {
  param([string]$PackageJsonPath)
  $raw = Get-Content -LiteralPath $PackageJsonPath -Raw
  $json = $raw | ConvertFrom-Json
  return [string]$json.version
}

function Invoke-MsiBuildWithRetry {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoRoot,
    [Parameter(Mandatory = $true)]
    [string]$MsiSource
  )

  $wixSource = Join-Path $RepoRoot "src-tauri\target\release\wix"

  try {
    Invoke-Native npx tauri build --bundles msi
    return $true
  } catch {
    Write-Host ""
    Write-Host "Primer intento MSI falló. Se limpiará WiX y se reintentará..." -ForegroundColor Yellow

    if (Test-Path $wixSource) {
      Remove-Item -LiteralPath $wixSource -Recurse -Force
    }
    if (Test-Path $MsiSource) {
      Remove-Item -LiteralPath $MsiSource -Recurse -Force
    }

    Start-Sleep -Seconds 2
    Invoke-Native npx tauri build --bundles msi
    return $true
  }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$packageJsonPath = Join-Path $repoRoot "package.json"
$resolvedVersion = if ($Version) { $Version } else { Get-PackageVersion -PackageJsonPath $packageJsonPath }

$clientSlug = ($ClientId -replace '[^\w\-]', '_').Trim('_')
if ([string]::IsNullOrWhiteSpace($clientSlug)) {
  throw "ClientId no es válido."
}

$brandingPath = (Resolve-Path -LiteralPath $BrandingFile -ErrorAction Stop).Path
$releaseRoot = Join-Path $repoRoot "releases\$resolvedVersion\$clientSlug"
$packageDir = Join-Path $releaseRoot "paquete"
$notesPath = Join-Path $releaseRoot "NOTA-DE-ENTREGA.md"
$clientDir = Join-Path $repoRoot "clientes\$clientSlug"
$defaultLicensePath = Join-Path $clientDir "licencia.$resolvedVersion.json"
$resolvedLicensePath = ""
$nsisSource = Join-Path $repoRoot "src-tauri\target\release\bundle\nsis"
$msiSource = Join-Path $repoRoot "src-tauri\target\release\bundle\msi"
$nsisPattern = "*_${resolvedVersion}_x64-setup.exe"
$msiPattern = "*_${resolvedVersion}_x64_en-US.msi"

Write-Host ""
Write-Host "Preparando entrega comercial para cliente..." -ForegroundColor Cyan
Write-Host "Cliente: $clientSlug"
Write-Host "Branding: $brandingPath"
Write-Host "Version: $resolvedVersion"
Write-Host ""

Set-Location $repoRoot

if (!(Test-Path $clientDir)) {
  New-Item -ItemType Directory -Path $clientDir | Out-Null
}

if (Test-Path $releaseRoot) {
  Remove-Item -LiteralPath $releaseRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $packageDir -Force | Out-Null

if ($brandingPath -ne (Join-Path $clientDir "branding.$resolvedVersion.json")) {
  Copy-Item -LiteralPath $brandingPath -Destination (Join-Path $clientDir "branding.$resolvedVersion.json") -Force
}
Copy-Item -LiteralPath $brandingPath -Destination (Join-Path $packageDir "branding.$clientSlug.$resolvedVersion.json") -Force

if ($LicenseFile) {
  $resolvedLicensePath = (Resolve-Path -LiteralPath $LicenseFile -ErrorAction Stop).Path
} elseif (Test-Path $defaultLicensePath) {
  $resolvedLicensePath = $defaultLicensePath
} else {
  throw "No se encontró licencia para el cliente. Usa -LicenseFile o crea $defaultLicensePath"
}

Copy-Item -LiteralPath $resolvedLicensePath -Destination (Join-Path $packageDir "licencia.$clientSlug.$resolvedVersion.json") -Force

$msiBuilt = $false
$msiNote = "No generado."

try {
  if (Test-Path $nsisSource) {
    Remove-Item -LiteralPath $nsisSource -Recurse -Force
  }
  if (Test-Path $msiSource) {
    Remove-Item -LiteralPath $msiSource -Recurse -Force
  }

  Invoke-Native npm run edition:operativa
  Invoke-Native -FilePath powershell -Arguments @(
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    '.\scripts\activar-licencia-cliente.ps1',
    '-Mode',
    'cliente',
    '-LicenseFile',
    $resolvedLicensePath
  )
  Invoke-Native npm install
  Invoke-Native npx tauri build --bundles nsis

  try {
    $msiBuilt = Invoke-MsiBuildWithRetry -RepoRoot $repoRoot -MsiSource $msiSource
    $msiNote = "Generado correctamente."
  } catch {
    $msiNote = "No se pudo generar MSI en esta ejecución. Se entrega el instalador EXE como paquete principal."
    Write-Host ""
    Write-Host "Advertencia: el MSI no se pudo generar. Se continuará con NSIS." -ForegroundColor Yellow
  }
} finally {
  Invoke-Native -FilePath powershell -Arguments @(
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    '.\scripts\activar-licencia-cliente.ps1',
    '-Mode',
    'matriz'
  )
  Invoke-Native npm run edition:matriz
}

if (Test-Path $nsisSource) {
  Get-ChildItem -LiteralPath $nsisSource -Filter $nsisPattern | Copy-Item -Destination $packageDir -Force
}

if ($msiBuilt -and (Test-Path $msiSource)) {
  Get-ChildItem -LiteralPath $msiSource -Filter $msiPattern | Copy-Item -Destination $packageDir -Force
}

$note = @"
# Nota de entrega - cliente $clientSlug

## Version

$resolvedVersion

## Fecha

$(Get-Date -Format "yyyy-MM-dd HH:mm")

## Contenido

- instalador `.exe`
- instalador `.msi`: $msiNote
- branding del cliente
- licencia del cliente
- edición operativa bloqueada para uso comercial

## Validación sugerida

1. instalar la app
2. abrir la app
3. cargar la marca del cliente si aplica
4. validar que la edición operativa no muestre personalización institucional
5. guardar un costeo de prueba
6. recuperar el mismo costeo
7. imprimir el informe

## Observación

Esta entrega sale en edición operativa. La personalización institucional queda reservada para la matriz.
"@

Set-Content -LiteralPath $notesPath -Value $note -Encoding UTF8

Write-Host ""
Write-Host "Entrega preparada correctamente." -ForegroundColor Green
Write-Host "Paquete: $packageDir"
Write-Host "Nota:    $notesPath"
