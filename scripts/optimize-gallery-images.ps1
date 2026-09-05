Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$sourceDirectories = @(
  (Join-Path $root 'images\litters'),
  (Join-Path $root 'images\gallery')
)
$sizes = @(480, 960)
$jpegEncoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq 'image/jpeg' }
$encoderParameters = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
  [System.Drawing.Imaging.Encoder]::Quality,
  [long]82
)

foreach ($sourceDirectory in $sourceDirectories) {
  Get-ChildItem -Path $sourceDirectory -File -Recurse |
    Where-Object { $_.Extension -match '(?i)^\.(jpg|jpeg|png)$' } |
    ForEach-Object {
      $source = $_
      $relativePath = $source.FullName.Substring((Join-Path $root 'images').Length).TrimStart('\')
      $relativeDirectory = Split-Path $relativePath -Parent
      $name = [System.IO.Path]::GetFileNameWithoutExtension($source.Name)

      $image = [System.Drawing.Image]::FromFile($source.FullName)
      try {
        foreach ($size in $sizes) {
          $height = [Math]::Round($image.Height * $size / $image.Width)
          $outputDirectory = Join-Path $root (Join-Path 'images\optimized' $relativeDirectory)
          $outputPath = Join-Path $outputDirectory "$name-$size.jpg"
          New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null

          $bitmap = New-Object System.Drawing.Bitmap($size, $height)
          $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
          try {
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.DrawImage($image, 0, 0, $size, $height)
            $bitmap.Save($outputPath, $jpegEncoder, $encoderParameters)
          } finally {
            $graphics.Dispose()
            $bitmap.Dispose()
          }
        }
      } finally {
        $image.Dispose()
      }
    }
}