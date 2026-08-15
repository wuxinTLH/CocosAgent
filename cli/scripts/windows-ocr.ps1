param(
    [Parameter(Mandatory = $true)]
    [string]$ImagePath,
    [string]$Language = 'en-US',
    [string]$Region = ''
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Storage.FileAccessMode, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.IRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.SoftwareBitmap, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Media.Ocr, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrResult, Windows.Media.Ocr, ContentType = WindowsRuntime]
$null = [Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime]

function Await-WinRtOperation {
    param(
        [Parameter(Mandatory = $true)]
        [object]$Operation,
        [Parameter(Mandatory = $true)]
        [Type]$ResultType
    )

    $asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() |
        Where-Object {
            $_.Name -eq 'AsTask' -and
            $_.IsGenericMethodDefinition -and
            $_.GetParameters().Count -eq 1
        } |
        Select-Object -First 1
    if ($null -eq $asTask) {
        throw 'WINRT_ASTASK_UNAVAILABLE'
    }
    $task = $asTask.MakeGenericMethod($ResultType).Invoke($null, @($Operation))
    return $task.GetAwaiter().GetResult()
}

if (-not (Test-Path -LiteralPath $ImagePath -PathType Leaf)) {
    throw "IMAGE_NOT_FOUND: $ImagePath"
}

$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage(
    [Windows.Globalization.Language]::new($Language)
)
if ($null -eq $engine) {
    throw "WINDOWS_OCR_LANGUAGE_UNAVAILABLE: $Language"
}

$file = Await-WinRtOperation ([Windows.Storage.StorageFile]::GetFileFromPathAsync($ImagePath)) ([Windows.Storage.StorageFile])
$stream = Await-WinRtOperation ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
$decoder = Await-WinRtOperation ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
$bitmap = Await-WinRtOperation ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
$result = Await-WinRtOperation ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])

$bounds = $null
if ($Region) {
    $parts = $Region.Split(',') | ForEach-Object { [double]::Parse($_.Trim(), [Globalization.CultureInfo]::InvariantCulture) }
    if ($parts.Count -ne 4) {
        throw "INVALID_REGION: $Region"
    }
    $bounds = [PSCustomObject]@{ X = $parts[0]; Y = $parts[1]; W = $parts[2]; H = $parts[3] }
}

$items = [System.Collections.Generic.List[object]]::new()
foreach ($line in $result.Lines) {
    foreach ($word in $line.Words) {
        $rect = $word.BoundingRect
        if ($null -ne $bounds) {
            $intersects =
                ($rect.X -lt ($bounds.X + $bounds.W)) -and
                (($rect.X + $rect.Width) -gt $bounds.X) -and
                ($rect.Y -lt ($bounds.Y + $bounds.H)) -and
                (($rect.Y + $rect.Height) -gt $bounds.Y)
            if (-not $intersects) {
                continue
            }
        }
        $items.Add([PSCustomObject]@{
            text = $word.Text
            box = [PSCustomObject]@{
                x = [math]::Round($rect.X, 2)
                y = [math]::Round($rect.Y, 2)
                w = [math]::Round($rect.Width, 2)
                h = [math]::Round($rect.Height, 2)
            }
            confidence = 0
        })
    }
}

[PSCustomObject]@{
    items = $items
    engine = 'windows-ocr'
    language = $Language
} | ConvertTo-Json -Depth 6 -Compress
