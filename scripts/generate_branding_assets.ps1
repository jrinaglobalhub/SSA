Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Muhammad J R\Downloads\SSA-logo.png"
if (-not (Test-Path $srcPath)) {
    Write-Error "Source SSA logo not found at $srcPath"
    exit 1
}

$src = [System.Drawing.Bitmap]::FromFile($srcPath)
Write-Host "Source SSA logo loaded: $($src.Width)x$($src.Height)"

# Function to crop transparent borders from bitmap to get exact bounding box
function Get-TightLogo {
    param([System.Drawing.Bitmap]$sourceBmp)
    
    $minX = $sourceBmp.Width
    $maxX = 0
    $minY = $sourceBmp.Height
    $maxY = 0

    for ($y = 0; $y -lt $sourceBmp.Height; $y++) {
        for ($x = 0; $x -lt $sourceBmp.Width; $x++) {
            $pixel = $sourceBmp.GetPixel($x, $y)
            if ($pixel.A -gt 25) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }

    $cropW = $maxX - $minX + 1
    $cropH = $maxY - $minY + 1
    Write-Host "Tight emblem bbox: ($minX, $minY) to ($maxX, $maxY), size: ${cropW}x${cropH}"

    $rect = [System.Drawing.Rectangle]::new($minX, $minY, $cropW, $cropH)
    $cropped = $sourceBmp.Clone($rect, $sourceBmp.PixelFormat)
    return $cropped
}

$tightLogo = Get-TightLogo -sourceBmp $src

function Create-PaddedIcon {
    param(
        [System.Drawing.Bitmap]$logoBmp,
        [int]$canvasWidth,
        [int]$canvasHeight,
        [double]$scaleRatio, # relative to canvas width/height
        [System.Drawing.Color]$bgColor,
        [string]$outputPath,
        [bool]$isRound = $false
    )

    $dest = [System.Drawing.Bitmap]::new($canvasWidth, $canvasHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    if ($bgColor -ne [System.Drawing.Color]::Transparent) {
        if ($isRound) {
            $g.Clear([System.Drawing.Color]::Transparent)
            $brush = [System.Drawing.SolidBrush]::new($bgColor)
            $g.FillEllipse($brush, 0, 0, $canvasWidth, $canvasHeight)
            $brush.Dispose()
        } else {
            $g.Clear($bgColor)
        }
    } else {
        $g.Clear([System.Drawing.Color]::Transparent)
    }

    $targetW = [int]($canvasWidth * $scaleRatio)
    $targetH = [int]($canvasHeight * $scaleRatio)

    # Strictly preserve original aspect ratio (contain)
    $scale = [Math]::Min($targetW / $logoBmp.Width, $targetH / $logoBmp.Height)
    $drawW = [int]($logoBmp.Width * $scale)
    $drawH = [int]($logoBmp.Height * $scale)

    # Perfectly center
    $drawX = [int](($canvasWidth - $drawW) / 2)
    $drawY = [int](($canvasHeight - $drawH) / 2)

    $destRect = [System.Drawing.Rectangle]::new($drawX, $drawY, $drawW, $drawH)
    $g.DrawImage($logoBmp, $destRect, 0, 0, $logoBmp.Width, $logoBmp.Height, [System.Drawing.GraphicsUnit]::Pixel)

    $dir = [System.IO.Path]::GetDirectoryName($outputPath)
    if (-not [System.IO.Directory]::Exists($dir)) {
        [System.IO.Directory]::CreateDirectory($dir) | Out-Null
    }

    $dest.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $dest.Dispose()

    Write-Host "Generated: $outputPath ($canvasWidth x $canvasHeight, draw: ${drawW}x${drawH})"
}

# Function to generate the SSA Stacked Wordmark Logo on white
# Contains:
# - Centered Shield Emblem
# - SSA (Heavy bold tracked)
# - SMARTSHOPPER ADMIN (Clean bold uppercase tracked)
function Create-StackedWordmarkLogo {
    param(
        [System.Drawing.Bitmap]$logoBmp,
        [int]$width = 1024,
        [int]$height = 1024,
        [string]$outputPath
    )

    $dest = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.Clear([System.Drawing.Color]::White)

    # Layout geometry:
    # Emblem size: 380px high
    # Text "SSA": ~110px font size
    # Text "SMARTSHOPPER ADMIN": ~30px font size
    $emblemH = [int]($height * 0.38)
    $emblemW = [int]($logoBmp.Width * ($emblemH / $logoBmp.Height))
    $emblemX = [int](($width - $emblemW) / 2)
    $emblemY = [int]($height * 0.16)

    $destRect = [System.Drawing.Rectangle]::new($emblemX, $emblemY, $emblemW, $emblemH)
    $g.DrawImage($logoBmp, $destRect, 0, 0, $logoBmp.Width, $logoBmp.Height, [System.Drawing.GraphicsUnit]::Pixel)

    # Title: SSA
    $fontSsa = [System.Drawing.Font]::new("Segoe UI", 84, [System.Drawing.FontStyle]::Bold)
    $brushSsa = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(15, 23, 42)) # Slate 900
    $format = [System.Drawing.StringFormat]::new()
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center

    $ssaY = $emblemY + $emblemH + 48
    $g.DrawString("SSA", $fontSsa, $brushSsa, ($width / 2), $ssaY, $format)

    # Subtitle: SMARTSHOPPER ADMIN
    $fontAdmin = [System.Drawing.Font]::new("Segoe UI", 26, [System.Drawing.FontStyle]::Bold)
    $brushAdmin = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(234, 88, 12)) # SmartShopper Orange
    $adminY = $ssaY + 68
    $g.DrawString("SMARTSHOPPER ADMIN", $fontAdmin, $brushAdmin, ($width / 2), $adminY, $format)

    # Secondary: JRINA Private Limited
    $fontJrina = [System.Drawing.Font]::new("Segoe UI", 16, [System.Drawing.FontStyle]::Regular)
    $brushJrina = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(100, 116, 139)) # Slate 500
    $jrinaY = $adminY + 44
    $g.DrawString("JRINA Private Limited", $fontJrina, $brushJrina, ($width / 2), $jrinaY, $format)

    $dir = [System.IO.Path]::GetDirectoryName($outputPath)
    if (-not [System.IO.Directory]::Exists($dir)) {
        [System.IO.Directory]::CreateDirectory($dir) | Out-Null
    }

    $dest.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $fontSsa.Dispose()
    $fontAdmin.Dispose()
    $fontJrina.Dispose()
    $brushSsa.Dispose()
    $brushAdmin.Dispose()
    $brushJrina.Dispose()
    $format.Dispose()
    $g.Dispose()
    $dest.Dispose()

    Write-Host "Generated Stacked Wordmark: $outputPath"
}

# Function to generate Horizontal Wordmark (for Desktop Header & Login top)
function Create-HorizontalWordmarkLogo {
    param(
        [System.Drawing.Bitmap]$logoBmp,
        [int]$width = 1000,
        [int]$height = 240,
        [string]$outputPath
    )

    $dest = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.Clear([System.Drawing.Color]::White)

    # Emblem on the left
    $emblemH = [int]($height * 0.72)
    $emblemW = [int]($logoBmp.Width * ($emblemH / $logoBmp.Height))
    $emblemX = 40
    $emblemY = [int](($height - $emblemH) / 2)

    $destRect = [System.Drawing.Rectangle]::new($emblemX, $emblemY, $emblemW, $emblemH)
    $g.DrawImage($logoBmp, $destRect, 0, 0, $logoBmp.Width, $logoBmp.Height, [System.Drawing.GraphicsUnit]::Pixel)

    # Text block on the right
    $textX = $emblemX + $emblemW + 36
    $fontSsa = [System.Drawing.Font]::new("Segoe UI", 56, [System.Drawing.FontStyle]::Bold)
    $brushSsa = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(15, 23, 42))
    $g.DrawString("SSA", $fontSsa, $brushSsa, $textX, ($emblemY - 4))

    $fontAdmin = [System.Drawing.Font]::new("Segoe UI", 20, [System.Drawing.FontStyle]::Bold)
    $brushAdmin = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(234, 88, 12))
    $g.DrawString("SMARTSHOPPER ADMIN", $fontAdmin, $brushAdmin, $textX, ($emblemY + 82))

    $fontJrina = [System.Drawing.Font]::new("Segoe UI", 13, [System.Drawing.FontStyle]::Regular)
    $brushJrina = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(100, 116, 139))
    $g.DrawString("JRINA Private Limited", $fontJrina, $brushJrina, $textX, ($emblemY + 120))

    $dir = [System.IO.Path]::GetDirectoryName($outputPath)
    if (-not [System.IO.Directory]::Exists($dir)) {
        [System.IO.Directory]::CreateDirectory($dir) | Out-Null
    }

    $dest.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $fontSsa.Dispose()
    $fontAdmin.Dispose()
    $fontJrina.Dispose()
    $brushSsa.Dispose()
    $brushAdmin.Dispose()
    $brushJrina.Dispose()
    $g.Dispose()
    $dest.Dispose()

    Write-Host "Generated Horizontal Wordmark: $outputPath"
}

# Function to pack multi-res PNG bitmaps into a valid Windows ICO file
function Create-WindowsIcoFile {
    param(
        [System.Drawing.Bitmap]$sourceBmp,
        [int[]]$sizes = @(256, 128, 64, 48, 32, 24, 16),
        [string]$outputPath
    )

    $pngBytesList = [System.Collections.Generic.List[byte[]]]::new()
    $dimList = [System.Collections.Generic.List[int]]::new()

    foreach ($size in $sizes) {
        $bmp = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.Clear([System.Drawing.Color]::White)

        $scaleRatio = 0.70
        $targetW = [int]($size * $scaleRatio)
        $targetH = [int]($size * $scaleRatio)
        $scale = [Math]::Min($targetW / $sourceBmp.Width, $targetH / $sourceBmp.Height)
        $drawW = [Math]::Max(1, [int]($sourceBmp.Width * $scale))
        $drawH = [Math]::Max(1, [int]($sourceBmp.Height * $scale))
        $drawX = [int](($size - $drawW) / 2)
        $drawY = [int](($size - $drawH) / 2)

        $rect = [System.Drawing.Rectangle]::new($drawX, $drawY, $drawW, $drawH)
        $g.DrawImage($sourceBmp, $rect, 0, 0, $sourceBmp.Width, $sourceBmp.Height, [System.Drawing.GraphicsUnit]::Pixel)
        $g.Dispose()

        $ms = [System.IO.MemoryStream]::new()
        $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $pngBytes = $ms.ToArray()
        $ms.Dispose()
        $bmp.Dispose()

        $pngBytesList.Add($pngBytes)
        $dimList.Add($size)
    }

    # Binary packaging of ICO format
    $fs = [System.IO.FileStream]::new($outputPath, [System.IO.FileMode]::Create)
    $bw = [System.IO.BinaryWriter]::new($fs)

    # ICONDIR
    $bw.Write([uint16]0) # Reserved
    $bw.Write([uint16]1) # Type 1 = Icon
    $bw.Write([uint16]$pngBytesList.Count) # Image count

    # Directory entries: 16 bytes per image
    # Header is 6 bytes + (16 * count) bytes
    $offset = 6 + (16 * $pngBytesList.Count)

    for ($i = 0; $i -lt $pngBytesList.Count; $i++) {
        $size = $dimList[$i]
        $w = if ($size -ge 256) { [byte]0 } else { [byte]$size }
        $h = if ($size -ge 256) { [byte]0 } else { [byte]$size }
        $data = $pngBytesList[$i]

        $bw.Write($w) # Width
        $bw.Write($h) # Height
        $bw.Write([byte]0) # Color count
        $bw.Write([byte]0) # Reserved
        $bw.Write([uint16]1) # Color planes
        $bw.Write([uint16]32) # Bits per pixel
        $bw.Write([uint32]$data.Length) # Image size
        $bw.Write([uint32]$offset) # Data offset

        $offset += $data.Length
    }

    # Image byte streams
    foreach ($data in $pngBytesList) {
        $bw.Write($data)
    }

    $bw.Flush()
    $bw.Close()
    $fs.Close()

    Write-Host "Generated Multi-Resolution Windows ICO: $outputPath ($($sizes.Count) sizes)"
}

$baseDir = "c:\Users\Muhammad J R\Documents\JRINA\SSA App"

# 1. Main Expo / React Native App Assets
Create-PaddedIcon -logoBmp $tightLogo -canvasWidth 1024 -canvasHeight 1024 -scaleRatio 0.65 -bgColor ([System.Drawing.Color]::White) -outputPath "$baseDir\assets\icon.png"
Create-PaddedIcon -logoBmp $tightLogo -canvasWidth 512 -canvasHeight 512 -scaleRatio 0.46 -bgColor ([System.Drawing.Color]::Transparent) -outputPath "$baseDir\assets\android-icon-foreground.png"

# Solid white background for adaptive icon
$bgBmp = [System.Drawing.Bitmap]::new(512, 512, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$bgG = [System.Drawing.Graphics]::FromImage($bgBmp)
$bgG.Clear([System.Drawing.Color]::White)
$bgG.Dispose()
$bgBmp.Save("$baseDir\assets\android-icon-background.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bgBmp.Dispose()
Write-Host "Generated: $baseDir\assets\android-icon-background.png"

Create-PaddedIcon -logoBmp $tightLogo -canvasWidth 512 -canvasHeight 512 -scaleRatio 0.46 -bgColor ([System.Drawing.Color]::Transparent) -outputPath "$baseDir\assets\android-icon-monochrome.png"

# Wordmark Logos
Create-StackedWordmarkLogo -logoBmp $tightLogo -width 1024 -height 1024 -outputPath "$baseDir\assets\splash-icon.png"
Create-StackedWordmarkLogo -logoBmp $tightLogo -width 800 -height 800 -outputPath "$baseDir\assets\ssa-logo-stacked.png"
Create-HorizontalWordmarkLogo -logoBmp $tightLogo -width 1000 -height 240 -outputPath "$baseDir\assets\ssa-logo.png"

# In-App 512x512 transparent emblem & 48x48 favicon
Create-PaddedIcon -logoBmp $tightLogo -canvasWidth 512 -canvasHeight 512 -scaleRatio 0.88 -bgColor ([System.Drawing.Color]::Transparent) -outputPath "$baseDir\assets\icon-192.png"
Create-PaddedIcon -logoBmp $tightLogo -canvasWidth 48 -canvasHeight 48 -scaleRatio 0.80 -bgColor ([System.Drawing.Color]::White) -outputPath "$baseDir\assets\favicon.png"

# 2. Windows Desktop Branding Assets
Create-PaddedIcon -logoBmp $tightLogo -canvasWidth 512 -canvasHeight 512 -scaleRatio 0.70 -bgColor ([System.Drawing.Color]::White) -outputPath "$baseDir\assets\windows\icon.png"
Create-WindowsIcoFile -sourceBmp $tightLogo -sizes @(256, 128, 64, 48, 32, 24, 16) -outputPath "$baseDir\assets\windows\app.ico"

# 3. Native Android Launcher Mipmaps and Splashscreen Drawables
$splashDensities = @{
    "mdpi" = 288
    "hdpi" = 432
    "xhdpi" = 576
    "xxhdpi" = 864
    "xxxhdpi" = 1152
}

foreach ($den in $splashDensities.Keys) {
    $dim = $splashDensities[$den]
    $outPath = "$baseDir\android\app\src\main\res\drawable-$den\splashscreen_logo.png"
    Create-PaddedIcon -logoBmp $tightLogo -canvasWidth $dim -canvasHeight $dim -scaleRatio 0.48 -bgColor ([System.Drawing.Color]::Transparent) -outputPath $outPath
}

$mipmapForegrounds = @{
    "mdpi" = 108
    "hdpi" = 162
    "xhdpi" = 216
    "xxhdpi" = 324
    "xxxhdpi" = 432
}

$mipmapLaunchers = @{
    "mdpi" = 48
    "hdpi" = 72
    "xhdpi" = 96
    "xxhdpi" = 144
    "xxxhdpi" = 192
}

foreach ($den in $mipmapForegrounds.Keys) {
    $fgDim = $mipmapForegrounds[$den]
    $lDim = $mipmapLaunchers[$den]

    # Foreground (ratio 0.46 within 108dp canvas)
    $fgPath = "$baseDir\android\app\src\main\res\mipmap-$den\ic_launcher_foreground.png"
    Create-PaddedIcon -logoBmp $tightLogo -canvasWidth $fgDim -canvasHeight $fgDim -scaleRatio 0.46 -bgColor ([System.Drawing.Color]::Transparent) -outputPath $fgPath

    # Background (white)
    $bgBmpM = [System.Drawing.Bitmap]::new($fgDim, $fgDim, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $bgGM = [System.Drawing.Graphics]::FromImage($bgBmpM)
    $bgGM.Clear([System.Drawing.Color]::White)
    $bgGM.Dispose()
    $bgPath = "$baseDir\android\app\src\main\res\mipmap-$den\ic_launcher_background.png"
    $bgBmpM.Save($bgPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bgBmpM.Dispose()

    # Monochrome
    $monoPath = "$baseDir\android\app\src\main\res\mipmap-$den\ic_launcher_monochrome.png"
    Create-PaddedIcon -logoBmp $tightLogo -canvasWidth $fgDim -canvasHeight $fgDim -scaleRatio 0.46 -bgColor ([System.Drawing.Color]::Transparent) -outputPath $monoPath

    # Square launcher: white background with centered logo (ratio 0.65)
    $lPath = "$baseDir\android\app\src\main\res\mipmap-$den\ic_launcher.png"
    Create-PaddedIcon -logoBmp $tightLogo -canvasWidth $lDim -canvasHeight $lDim -scaleRatio 0.65 -bgColor ([System.Drawing.Color]::White) -outputPath $lPath -isRound $false

    # Round launcher: white circle with centered logo (ratio 0.58)
    $rPath = "$baseDir\android\app\src\main\res\mipmap-$den\ic_launcher_round.png"
    Create-PaddedIcon -logoBmp $tightLogo -canvasWidth $lDim -canvasHeight $lDim -scaleRatio 0.58 -bgColor ([System.Drawing.Color]::White) -outputPath $rPath -isRound $true
}

$tightLogo.Dispose()
$src.Dispose()
Write-Host "All SSA branding assets successfully created!"
