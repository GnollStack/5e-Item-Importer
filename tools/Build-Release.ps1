[CmdletBinding()]
param(
    [string]$OutputDirectory = "dist",
    [string]$ArchiveName = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$moduleRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$manifestPath = Join-Path $moduleRoot "module.json"
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
. (Join-Path $PSScriptRoot "Release-Contract.ps1")
Assert-ImporterReleaseManifest $manifest | Out-Null

if ([string]::IsNullOrWhiteSpace($ArchiveName)) {
    $ArchiveName = "$($manifest.id).zip"
}
if (-not $ArchiveName.EndsWith(".zip", [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "ArchiveName must end in .zip"
}
if ([System.IO.Path]::IsPathRooted($ArchiveName) -or
    -not [string]::Equals($ArchiveName, [System.IO.Path]::GetFileName($ArchiveName), [System.StringComparison]::Ordinal)) {
    throw "ArchiveName must be a leaf filename without directory components"
}

$outputPath = if ([System.IO.Path]::IsPathRooted($OutputDirectory)) {
    [System.IO.Path]::GetFullPath($OutputDirectory)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $moduleRoot $OutputDirectory))
}

$releaseEntries = @(
    "module.json",
    "LICENSE.txt",
    "THIRD_PARTY_NOTICES.txt",
    "README.md",
    "lang",
    "scripts",
    "styles",
    "templates"
)
$requiredRuntimeFiles = @(
    "scripts/itemImporter.js",
    "scripts/debugApi.js",
    "scripts/diagnostics/runtimeSmokeTests.js"
)

foreach ($entry in $releaseEntries + $requiredRuntimeFiles) {
    $source = Join-Path $moduleRoot $entry
    if (-not (Test-Path -LiteralPath $source)) {
        throw "Required release entry is missing: $entry"
    }
}

$stagingRoot = Join-Path ([System.IO.Path]::GetTempPath()) "$($manifest.id)-release-$([guid]::NewGuid().ToString('N'))"
$stagingModule = Join-Path $stagingRoot $manifest.id

try {
    New-Item -ItemType Directory -Path $stagingModule -Force | Out-Null
    foreach ($entry in $releaseEntries) {
        Copy-Item -LiteralPath (Join-Path $moduleRoot $entry) -Destination $stagingModule -Recurse -Force
    }

    New-Item -ItemType Directory -Path $outputPath -Force | Out-Null
    $archivePath = Join-Path $outputPath $ArchiveName
    $standaloneManifestPath = Join-Path $outputPath "module.json"
    Add-Type -AssemblyName System.IO.Compression
    $archiveStream = [System.IO.File]::Open($archivePath, [System.IO.FileMode]::Create)
    $zip = [System.IO.Compression.ZipArchive]::new(
        $archiveStream,
        [System.IO.Compression.ZipArchiveMode]::Create,
        $false
    )
    try {
        foreach ($file in Get-ChildItem -LiteralPath $stagingModule -Recurse -File) {
            $relativePath = $file.FullName.Substring($stagingModule.Length + 1).Replace("\", "/")
            $entry = $zip.CreateEntry($relativePath, [System.IO.Compression.CompressionLevel]::Optimal)
            $sourceStream = [System.IO.File]::OpenRead($file.FullName)
            $entryStream = $entry.Open()
            try {
                $sourceStream.CopyTo($entryStream)
            } finally {
                $entryStream.Dispose()
                $sourceStream.Dispose()
            }
        }
    } finally {
        $zip.Dispose()
        $archiveStream.Dispose()
    }
    Copy-Item -LiteralPath $manifestPath -Destination $standaloneManifestPath -Force

    & (Join-Path $PSScriptRoot "Verify-Release.ps1") `
        -ArchivePath $archivePath `
        -StandaloneManifestPath $standaloneManifestPath | Out-Host
    Write-Output $archivePath
} finally {
    $resolvedTemp = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
    $resolvedStaging = [System.IO.Path]::GetFullPath($stagingRoot)
    if ($resolvedStaging.StartsWith($resolvedTemp, [System.StringComparison]::OrdinalIgnoreCase) -and
        (Test-Path -LiteralPath $resolvedStaging)) {
        Remove-Item -LiteralPath $resolvedStaging -Recurse -Force
    }
}
