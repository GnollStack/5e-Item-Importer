[CmdletBinding()]
param(
    [string]$CompanionPath = "",
    [string]$OutputDirectory = "",
    [switch]$CheckOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "Release-Contract.ps1")

$moduleRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$manifest = Get-Content -LiteralPath (Join-Path $moduleRoot "module.json") -Raw -Encoding UTF8 | ConvertFrom-Json
if ([string]::IsNullOrWhiteSpace($CompanionPath)) {
    $CompanionPath = Join-Path (Split-Path $moduleRoot -Parent) (Get-ImporterCompanionId $manifest.id)
}
$pair = Assert-ImporterReleasePair -ModuleRoot $moduleRoot -CompanionRoot $CompanionPath

# The same entry point works from either repository; detect tooling drift before building.
foreach ($filename in @("Release-Contract.ps1", "Build-PairedRelease.ps1", "Test-ReleaseContract.ps1")) {
    $hashes = @($pair.Modules | ForEach-Object {
        (Get-FileHash -LiteralPath (Join-Path $_.Root "tools/$filename") -Algorithm SHA256).Hash
    })
    if ($hashes[0] -cne $hashes[1]) { throw "Paired release tooling differs between repositories: $filename" }
}
foreach ($module in $pair.Modules) {
    foreach ($filename in @("Build-Release.ps1", "Verify-Release.ps1")) {
        if (-not (Test-Path -LiteralPath (Join-Path $module.Root "tools/$filename") -PathType Leaf)) {
            throw "$($module.Manifest.id) is missing tools/$filename."
        }
    }
}
& (Join-Path $PSScriptRoot "Test-ReleaseContract.ps1") | Out-Host
if ($CheckOnly) {
    [pscustomobject]@{ Version = $pair.Version; Valid = $true; Built = $false }
    return
}

if ([string]::IsNullOrWhiteSpace($OutputDirectory)) { $OutputDirectory = "dist/paired/V$($pair.Version)" }
$outputPath = if ([System.IO.Path]::IsPathRooted($OutputDirectory)) {
    [System.IO.Path]::GetFullPath($OutputDirectory)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $moduleRoot $OutputDirectory))
}
# Inside either checkout, artifacts belong under dist so future builds cannot
# accidentally package previous output or overwrite runtime source.
foreach ($module in $pair.Modules) {
    $sourceRoot = [System.IO.Path]::GetFullPath($module.Root).TrimEnd('\', '/')
    $sourcePrefix = $sourceRoot + [System.IO.Path]::DirectorySeparatorChar
    $distPrefix = (Join-Path $sourceRoot "dist") + [System.IO.Path]::DirectorySeparatorChar
    if (($outputPath -eq $sourceRoot -or $outputPath.StartsWith($sourcePrefix, [StringComparison]::OrdinalIgnoreCase)) -and
        -not ($outputPath + [System.IO.Path]::DirectorySeparatorChar).StartsWith($distPrefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Paired output inside a source checkout must be under dist: $outputPath"
    }
    $destinationPath = Join-Path $outputPath $module.Manifest.id
    if ($sourceRoot -eq $destinationPath -or $sourceRoot.StartsWith($destinationPath + [System.IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Paired output must not contain a source checkout: $destinationPath"
    }
}
New-Item -ItemType Directory -Path $outputPath -Force | Out-Null
$receiptPath = Join-Path $outputPath "release-pair.json"
# A failed rebuild must not leave a previous success receipt beside partial output.
if (Test-Path -LiteralPath $receiptPath) { Remove-Item -LiteralPath $receiptPath -Force }
$artifacts = @()
foreach ($module in ($pair.Modules | Sort-Object { $_.Manifest.id })) {
    $id = [string]$module.Manifest.id
    $destination = Join-Path $outputPath $id
    & (Join-Path $module.Root "tools/Build-Release.ps1") -OutputDirectory $destination | Out-Host
    $archivePath = Join-Path $destination "$id.zip"
    $standalonePath = Join-Path $destination "module.json"
    & (Join-Path $module.Root "tools/Verify-Release.ps1") -ArchivePath $archivePath -StandaloneManifestPath $standalonePath | Out-Host
    $builtManifest = Get-Content -LiteralPath $standalonePath -Raw -Encoding UTF8 | ConvertFrom-Json
    if (($builtManifest | ConvertTo-Json -Depth 100 -Compress) -cne
        ($module.Manifest | ConvertTo-Json -Depth 100 -Compress)) {
        throw "$id manifest changed during the paired build; rebuild from stable source."
    }
    $artifacts += [ordered]@{
        id = $id
        edition = if ($id -eq "5e-item-importer") { "free" } else { "premium" }
        version = $pair.Version
        archive = "$id/$id.zip"
        manifest = "$id/module.json"
        archiveSha256 = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash
        manifestSha256 = (Get-FileHash -LiteralPath $standalonePath -Algorithm SHA256).Hash
    }
}
$receipt = [ordered]@{
    version = $pair.Version
    builtAtUtc = [DateTime]::UtcNow.ToString("o")
    artifacts = $artifacts
}
[System.IO.File]::WriteAllText($receiptPath, ($receipt | ConvertTo-Json -Depth 10) + "`n", [System.Text.UTF8Encoding]::new($false))
[pscustomobject]@{ Version = $pair.Version; Valid = $true; Built = $true; Receipt = $receiptPath }
