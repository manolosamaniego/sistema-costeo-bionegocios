Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'

$iconDir = Join-Path $PSScriptRoot '..\src-tauri\icons'
$iconDir = [System.IO.Path]::GetFullPath($iconDir)

function New-LeafPath {
  param(
    [double]$Size
  )

  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $path.AddBezier(
    [single]($Size * 0.21), [single]($Size * 0.91),
    [single]($Size * 0.18), [single]($Size * 0.55),
    [single]($Size * 0.37), [single]($Size * 0.19),
    [single]($Size * 0.67), [single]($Size * 0.10)
  )
  $path.AddBezier(
    [single]($Size * 0.67), [single]($Size * 0.10),
    [single]($Size * 0.86), [single]($Size * 0.25),
    [single]($Size * 0.86), [single]($Size * 0.57),
    [single]($Size * 0.55), [single]($Size * 0.80)
  )
  $path.AddBezier(
    [single]($Size * 0.55), [single]($Size * 0.80),
    [single]($Size * 0.41), [single]($Size * 0.90),
    [single]($Size * 0.28), [single]($Size * 0.93),
    [single]($Size * 0.21), [single]($Size * 0.91)
  )
  return $path
}

function New-JungleBitmap {
  param(
    [int]$Size
  )

  $bmp = [System.Drawing.Bitmap]::new($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bmp)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.Color]::Transparent)

  $leafPath = New-LeafPath -Size $Size

  $gradStart = [System.Drawing.Point]::new(0, 0)
  $gradEnd = [System.Drawing.Point]::new($Size, $Size)
  $leafBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    $gradStart,
    $gradEnd,
    [System.Drawing.Color]::FromArgb(255, 112, 157, 39),
    [System.Drawing.Color]::FromArgb(255, 13, 39, 30)
  )
  $graphics.FillPath($leafBrush, $leafPath)

  $highlightBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(54, 195, 235, 150))
  $graphics.FillEllipse(
    $highlightBrush,
    [single]($Size * 0.45),
    [single]($Size * 0.10),
    [single]($Size * 0.22),
    [single]($Size * 0.16)
  )

  $stemPen = [System.Drawing.Pen]::new(
    [System.Drawing.Color]::FromArgb(255, 237, 243, 238),
    [single]([Math]::Max(4, $Size * 0.055))
  )
  $stemPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $stemPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawBezier(
    $stemPen,
    [single]($Size * 0.30), [single]($Size * 0.87),
    [single]($Size * 0.38), [single]($Size * 0.57),
    [single]($Size * 0.48), [single]($Size * 0.31),
    [single]($Size * 0.59), [single]($Size * 0.15)
  )
  $graphics.DrawBezier(
    $stemPen,
    [single]($Size * 0.42), [single]($Size * 0.62),
    [single]($Size * 0.35), [single]($Size * 0.53),
    [single]($Size * 0.32), [single]($Size * 0.44),
    [single]($Size * 0.29), [single]($Size * 0.36)
  )

  $circuitPen = [System.Drawing.Pen]::new(
    [System.Drawing.Color]::FromArgb(255, 237, 243, 238),
    [single]([Math]::Max(3, $Size * 0.03))
  )
  $circuitPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $circuitPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

  $rows = @(
    @{ Y = 0.40; X1 = 0.43; X2 = 0.75 },
    @{ Y = 0.51; X1 = 0.41; X2 = 0.71 },
    @{ Y = 0.62; X1 = 0.38; X2 = 0.67 },
    @{ Y = 0.73; X1 = 0.35; X2 = 0.61 }
  )

  foreach ($row in $rows) {
    $y = [single]($Size * $row.Y)
    $x1 = [single]($Size * $row.X1)
    $x2 = [single]($Size * $row.X2)
    $graphics.DrawLine($circuitPen, $x1, $y, $x2, $y)

    $r = [single]([Math]::Max(6, $Size * 0.03))
    $nodeBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 237, 243, 238))
    $graphics.FillEllipse($nodeBrush, $x2 - ($r / 2), $y - ($r / 2), $r, $r)
    $nodeBrush.Dispose()
  }

  $shadowPen = [System.Drawing.Pen]::new(
    [System.Drawing.Color]::FromArgb(255, 19, 48, 37),
    [single]([Math]::Max(5, $Size * 0.06))
  )
  $shadowPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $shadowPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawBezier(
    $shadowPen,
    [single]($Size * 0.20), [single]($Size * 0.93),
    [single]($Size * 0.30), [single]($Size * 0.63),
    [single]($Size * 0.48), [single]($Size * 0.28),
    [single]($Size * 0.71), [single]($Size * 0.08)
  )

  $leafBrush.Dispose()
  $highlightBrush.Dispose()
  $stemPen.Dispose()
  $circuitPen.Dispose()
  $shadowPen.Dispose()
  $leafPath.Dispose()
  $graphics.Dispose()

  return $bmp
}

function Save-Png {
  param(
    [System.Drawing.Bitmap]$Bitmap,
    [string]$Name
  )

  $Bitmap.Save((Join-Path $iconDir $Name), [System.Drawing.Imaging.ImageFormat]::Png)
}

$map = @{
  32  = @('32x32.png', 'Square30x30Logo.png', 'Square44x44Logo.png')
  128 = @('128x128.png', 'Square71x71Logo.png', 'Square89x89Logo.png', 'Square107x107Logo.png')
  256 = @('128x128@2x.png', 'Square142x142Logo.png', 'Square150x150Logo.png')
  512 = @('icon.png', 'Square284x284Logo.png', 'Square310x310Logo.png', 'StoreLogo.png')
}

foreach ($size in $map.Keys) {
  $bitmap = New-JungleBitmap -Size $size
  foreach ($name in $map[$size]) {
    Save-Png -Bitmap $bitmap -Name $name
  }
  $bitmap.Dispose()
}

$iconBitmap = New-JungleBitmap -Size 256
$iconHandle = $iconBitmap.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($iconHandle)
$stream = [System.IO.File]::Open((Join-Path $iconDir 'icon.ico'), [System.IO.FileMode]::Create)
$icon.Save($stream)
$stream.Dispose()
$icon.Dispose()
$iconBitmap.Dispose()

