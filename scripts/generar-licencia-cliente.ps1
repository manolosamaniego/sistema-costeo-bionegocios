param(
  [Parameter(Mandatory = $true)]
  [string]$ClientId,
  [Parameter(Mandatory = $true)]
  [string]$ClientName,
  [string]$Version = "1.0.0",
  [string]$SupportUntil = "2027-12-31",
  [string]$UpdatesUntil = "",
  [string]$SupportLevel = "comercial",
  [string]$PublicBaseUrl = "https://manolosamaniego.github.io/sistema-costeo-bionegocios"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$clientSlug = ($ClientId -replace '[^\w\-]', '_').Trim('_')
if ([string]::IsNullOrWhiteSpace($clientSlug)) {
  throw "ClientId no es válido."
}

if ([string]::IsNullOrWhiteSpace($UpdatesUntil)) {
  $UpdatesUntil = $SupportUntil
}

$clientDir = Join-Path $repoRoot "clientes\$clientSlug"
if (!(Test-Path $clientDir)) {
  New-Item -ItemType Directory -Path $clientDir | Out-Null
}

$licensePath = Join-Path $clientDir "licencia.$Version.json"
$payload = [ordered]@{
  licenseId = ("{0}-{1}" -f $clientSlug.ToUpper(), $Version)
  clientId = $clientSlug
  clientName = $ClientName
  editionProfile = "operativa"
  currentVersion = $Version
  updateChannel = "clientes/$clientSlug/estable"
  manifestUrl = "$PublicBaseUrl/updates/clientes/$clientSlug/manifest.json"
  supportLevel = $SupportLevel
  supportUntil = $SupportUntil
  updatesUntil = $UpdatesUntil
  allowBranding = $false
  allowAdminAccess = $false
  notes = "Licencia operativa para $ClientName."
}

$payload | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $licensePath -Encoding UTF8
Write-Host "Licencia generada en: $licensePath"
