param(
  [ValidateSet("matriz", "cliente")]
  [string]$Mode = "matriz",
  [string]$ClientId = "",
  [string]$ClientName = "",
  [string]$Version = "1.0.1",
  [string]$SupportUntil = "2099-12-31",
  [string]$PublicBaseUrl = "https://manolosamaniego.github.io/sistema-costeo-bionegocios",
  [string]$InstallerUrl = "",
  [string]$ReleaseNotesUrl = "",
  [string]$PublishedBy = "Jungle Lab S.A.S."
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$publishedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssK")

if ($Mode -eq "matriz") {
  $manifestDir = Join-Path $repoRoot "updates\matriz"
  New-Item -ItemType Directory -Path $manifestDir -Force | Out-Null
  $manifestPath = Join-Path $manifestDir "manifest.json"

  $payload = [ordered]@{
    productCode = "SRC-BIO-COSTEO"
    channel = "matriz/estable"
    manifestUrl = "$PublicBaseUrl/updates/matriz/manifest.json"
    editionProfile = "matriz"
    currentVersion = $Version
    minimumSupportedVersion = $Version
    publishedAt = $publishedAt
    supportUntil = $SupportUntil
    releaseNotesUrl = $ReleaseNotesUrl
    installerUrl = $InstallerUrl
    publishedBy = $PublishedBy
    notes = "Canal base de la matriz interna para desarrollo, soporte y liberación."
  }

  $payload | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
  Write-Host "Manifiesto matriz actualizado en: $manifestPath"
  exit 0
}

$clientSlug = ($ClientId -replace '[^\w\-]', '_').Trim('_')
if ([string]::IsNullOrWhiteSpace($clientSlug)) {
  throw "Debes indicar -ClientId para el modo cliente."
}

if ([string]::IsNullOrWhiteSpace($ClientName)) {
  $ClientName = $clientSlug
}

$manifestDir = Join-Path $repoRoot "updates\clientes\$clientSlug"
New-Item -ItemType Directory -Path $manifestDir -Force | Out-Null
$manifestPath = Join-Path $manifestDir "manifest.json"

if ([string]::IsNullOrWhiteSpace($ReleaseNotesUrl)) {
  $ReleaseNotesUrl = "$PublicBaseUrl/releases/$Version/$clientSlug/NOTA-DE-ENTREGA.md"
}

if ([string]::IsNullOrWhiteSpace($InstallerUrl)) {
  $InstallerUrl = "$PublicBaseUrl/releases/$Version/$clientSlug/paquete/Sistema Comercial de Costeo para Bionegocios_${Version}_x64-setup.exe"
}

$payload = [ordered]@{
  productCode = "SRC-BIO-COSTEO"
  channel = "clientes/$clientSlug/estable"
  manifestUrl = "$PublicBaseUrl/updates/clientes/$clientSlug/manifest.json"
  editionProfile = "operativa"
  clientId = $clientSlug
  clientName = $ClientName
  currentVersion = $Version
  minimumSupportedVersion = $Version
  publishedAt = $publishedAt
  supportUntil = $SupportUntil
  releaseNotes = "releases/$Version/$clientSlug/NOTA-DE-ENTREGA.md"
  releaseNotesUrl = $ReleaseNotesUrl
  installer = "releases/$Version/$clientSlug/paquete/Sistema Comercial de Costeo para Bionegocios_${Version}_x64-setup.exe"
  installerUrl = $InstallerUrl
  publishedBy = $PublishedBy
  notes = "Canal operativo para $ClientName."
}

$payload | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
Write-Host "Manifiesto cliente actualizado en: $manifestPath"
