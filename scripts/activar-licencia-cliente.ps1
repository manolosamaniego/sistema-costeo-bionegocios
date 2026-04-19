param(
  [ValidateSet("matriz", "cliente")]
  [string]$Mode = "matriz",
  [string]$LicenseFile = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceDir = Join-Path $repoRoot "config\licencias"
$targetPath = Join-Path $repoRoot "src\license-config.js"
$matrixPath = Join-Path $sourceDir "licencia.matriz.js"

function ConvertTo-SafeJsString {
  param([string]$Value)
  if ($null -eq $Value) { return "" }
  return ($Value -replace "\\", "\\\\") -replace "'", "\'"
}

if ($Mode -eq "matriz") {
  Copy-Item -LiteralPath $matrixPath -Destination $targetPath -Force
  Write-Host "Licencia activa: matriz"
  exit 0
}

if ([string]::IsNullOrWhiteSpace($LicenseFile)) {
  throw "Debes indicar -LicenseFile cuando usas -Mode cliente."
}

$resolvedLicense = (Resolve-Path -LiteralPath $LicenseFile -ErrorAction Stop).Path
$license = Get-Content -LiteralPath $resolvedLicense -Raw | ConvertFrom-Json

$js = @"
window.APP_LICENSE_CONFIG = {
  mode: 'cliente',
  licenseId: '$(ConvertTo-SafeJsString ([string]$license.licenseId))',
  clientId: '$(ConvertTo-SafeJsString ([string]$license.clientId))',
  clientName: '$(ConvertTo-SafeJsString ([string]$license.clientName))',
  editionProfile: '$(ConvertTo-SafeJsString ([string]$license.editionProfile))',
  currentVersion: '$(ConvertTo-SafeJsString ([string]$license.currentVersion))',
  updateChannel: '$(ConvertTo-SafeJsString ([string]$license.updateChannel))',
  supportLevel: '$(ConvertTo-SafeJsString ([string]$license.supportLevel))',
  supportUntil: '$(ConvertTo-SafeJsString ([string]$license.supportUntil))',
  updatesUntil: '$(ConvertTo-SafeJsString ([string]$license.updatesUntil))',
  allowBranding: $([bool]$license.allowBranding).ToString().ToLower(),
  allowAdminAccess: $([bool]$license.allowAdminAccess).ToString().ToLower(),
  notes: '$(ConvertTo-SafeJsString ([string]$license.notes))'
};
"@

Set-Content -LiteralPath $targetPath -Value $js -Encoding UTF8
Write-Host "Licencia activa desde: $resolvedLicense"
