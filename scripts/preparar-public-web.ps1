param(
  [string]$OutputDir = "public"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$targetRoot = Join-Path $repoRoot $OutputDir
$updatesSource = Join-Path $repoRoot "updates"
$releasesSource = Join-Path $repoRoot "releases"

if (Test-Path $targetRoot) {
  Remove-Item -LiteralPath $targetRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $targetRoot | Out-Null

if (Test-Path $updatesSource) {
  Copy-Item -LiteralPath $updatesSource -Destination (Join-Path $targetRoot "updates") -Recurse -Force
}

if (Test-Path $releasesSource) {
  Copy-Item -LiteralPath $releasesSource -Destination (Join-Path $targetRoot "releases") -Recurse -Force
}

$indexPath = Join-Path $targetRoot "index.html"
$noJekyllPath = Join-Path $targetRoot ".nojekyll"
$indexHtml = @"
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Canales de actualizacion - Sistema Comercial de Costeo para Bionegocios</title>
  <style>
    body { font-family: Segoe UI, Arial, sans-serif; margin: 0; background: #f7f7f3; color: #1f2937; }
    main { max-width: 920px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #fff; border: 1px solid #d8dfd0; border-radius: 16px; padding: 24px; box-shadow: 0 6px 18px rgba(0,0,0,.06); }
    h1 { margin-top: 0; }
    a { color: #d94a1f; }
    li { margin-bottom: 10px; }
  </style>
</head>
<body>
  <main>
    <div class="card">
      <h1>Canales de actualizacion</h1>
      <p>Este sitio publica los manifiestos y las notas de entrega del Sistema Comercial de Costeo para Bionegocios.</p>
      <ul>
        <li><a href="./updates/matriz/manifest.json">Canal matriz</a></li>
        <li><a href="./updates/clientes/aliados/manifest.json">Canal cliente Aliados</a></li>
      </ul>
      <p>Publicacion generada desde la matriz de Jungle Lab S.A.S.</p>
    </div>
  </main>
</body>
</html>
"@

Set-Content -LiteralPath $indexPath -Value $indexHtml -Encoding UTF8
Set-Content -LiteralPath $noJekyllPath -Value "" -Encoding UTF8

Write-Host "Sitio publico preparado en: $targetRoot"
