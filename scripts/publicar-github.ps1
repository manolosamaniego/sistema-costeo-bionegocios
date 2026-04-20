param(
  [Parameter(Mandatory = $true)]
  [string]$RepositoryUrl,
  [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$gitRemotes = & git -C $repoRoot remote

if ($gitRemotes -contains "github") {
  & git -C $repoRoot remote set-url github $RepositoryUrl
  Write-Host "Remoto github actualizado."
} else {
  & git -C $repoRoot remote add github $RepositoryUrl
  Write-Host "Remoto github agregado."
}

Write-Host "Publicando rama $Branch en GitHub..."
& git -C $repoRoot push -u github $Branch

Write-Host "Publicacion completada."
