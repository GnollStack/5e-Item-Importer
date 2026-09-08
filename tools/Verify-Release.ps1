[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ArchivePath,

    [string]$StandaloneManifestPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "Release-Contract.ps1")

$resolvedArchive = (Resolve-Path -LiteralPath $ArchivePath).Path
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($resolvedArchive)

try {
    $rawEntryNames = @($archive.Entries | ForEach-Object { $_.FullName })
    $unsafePaths = @($rawEntryNames | Where-Object {
        $_.Contains("\") -or $_.StartsWith("/") -or $_ -match "(^|/)\.\.(/|$)"
    })
    if ($unsafePaths.Count -gt 0) {
        throw "Release contains unsafe archive paths: $($unsafePaths -join ', ')"
    }

    $entryNames = @($rawEntryNames | ForEach-Object { $_.TrimStart("/") })
    $duplicatePaths = @($entryNames | Group-Object | Where-Object Count -gt 1 | ForEach-Object Name)
    $caseCollisions = @($entryNames | Group-Object { $_.ToLowerInvariant() } | Where-Object Count -gt 1 | ForEach-Object {
        @($_.Group | Select-Object -Unique) -join " / "
    })
    if ($duplicatePaths.Count -gt 0 -or $caseCollisions.Count -gt 0) {
        throw "Release contains duplicate or case-colliding paths: $(@($duplicatePaths + $caseCollisions) -join ', ')"
    }

    $entrySet = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
    foreach ($name in $entryNames) { [void]$entrySet.Add($name) }

    $forbiddenPrefixes = @(
        "tests/",
        "tools/",
        ".github/",
        ".git/",
        "LLM-Instructions/",
        "dist/"
    )
    $forbiddenFiles = @(
        ".gitignore",
        ".gitattributes",
        "jsconfig.json",
        "scripts/itemTests.js",
        "scripts/itemCoreFeatureTests.js",
        "scripts/ui/itemPlatformFeatureTests.js"
    )

    $unexpected = @($entryNames | Where-Object {
        $name = $_
        ($forbiddenFiles -contains $name) -or @($forbiddenPrefixes | Where-Object {
            $name.StartsWith($_, [System.StringComparison]::OrdinalIgnoreCase)
        }).Count -gt 0
    })
    $unexpected += @($entryNames | Where-Object {
        $_.StartsWith("scripts/", [System.StringComparison]::OrdinalIgnoreCase) -and
        $_ -ne "scripts/diagnostics/runtimeSmokeTests.js" -and
        [System.IO.Path]::GetFileName($_) -match "Tests?\.(js|mjs)$"
    })
    $unexpected = @($unexpected | Select-Object -Unique)
    if ($unexpected.Count -gt 0) {
        throw "Release contains developer-only entries: $($unexpected -join ', ')"
    }

    $manifestEntry = $archive.Entries | Where-Object {
        $_.FullName.Replace("\", "/").TrimStart("/") -eq "module.json"
    } | Select-Object -First 1
    if ($null -eq $manifestEntry) {
        throw "Release is missing module.json at the archive root."
    }

    $stream = $manifestEntry.Open()
    $reader = [System.IO.StreamReader]::new($stream)
    try {
        $manifest = $reader.ReadToEnd() | ConvertFrom-Json
    } finally {
        $reader.Dispose()
        $stream.Dispose()
    }

    if ($manifest.id -ne "5e-item-importer") {
        throw "Unexpected module id in release manifest: $($manifest.id)"
    }
    if ([string]::IsNullOrWhiteSpace([string]$manifest.version)) {
        throw "Release manifest has no version."
    }
    if ([string]::IsNullOrWhiteSpace([string]$manifest.compatibility.minimum) -or
        [string]::IsNullOrWhiteSpace([string]$manifest.compatibility.verified)) {
        throw "Release manifest must declare minimum and verified Foundry compatibility."
    }

    Assert-ImporterReleaseManifest $manifest | Out-Null

    $requiredPaths = @("module.json", "LICENSE.txt", "THIRD_PARTY_NOTICES.txt", "README.md", "scripts/diagnostics/runtimeSmokeTests.js")
    $requiredPaths += @($manifest.esmodules)
    $requiredPaths += @($manifest.styles | ForEach-Object {
        if ($_ -is [string]) {
            throw "Manifest styles must use the Foundry v13+ object shape with a src property: $_"
        }
        if (-not ($_.PSObject.Properties.Name -contains "src") -or [string]::IsNullOrWhiteSpace([string]$_.src)) {
            throw "Manifest style entry is missing src."
        }
        $_.src
    })
    if ($manifest.PSObject.Properties.Name -contains "languages") {
        $requiredPaths += @($manifest.languages | ForEach-Object { $_.path })
    }
    foreach ($metadataProperty in @("license", "readme", "bugs", "changelog")) {
        if (-not ($manifest.PSObject.Properties.Name -contains $metadataProperty)) { continue }
        $metadataValue = [string]$manifest.$metadataProperty
        if ([string]::IsNullOrWhiteSpace($metadataValue) -or $metadataValue -match "^https?://") { continue }
        $requiredPaths += $metadataValue
    }
    $requiredPaths = @($requiredPaths | ForEach-Object {
        ([string]$_).Replace("\", "/").TrimStart(".", "/")
    } | Select-Object -Unique)

    $missing = @($requiredPaths | Where-Object { -not $entrySet.Contains($_) })
    if ($missing.Count -gt 0) {
        throw "Release is missing required runtime entries: $($missing -join ', ')"
    }

    $noticeEntry = $archive.Entries | Where-Object { $_.FullName -eq "THIRD_PARTY_NOTICES.txt" } | Select-Object -First 1
    $noticeStream = $noticeEntry.Open()
    $noticeReader = [System.IO.StreamReader]::new($noticeStream)
    try {
        $noticeText = $noticeReader.ReadToEnd()
    } finally {
        $noticeReader.Dispose()
        $noticeStream.Dispose()
    }
    if ($noticeText -notmatch "js-yaml 4\.3\.2" -or
        $noticeText -notmatch "Copyright \(C\) 2011-2015 by Vitaly Puzrin" -or
        $noticeText -notmatch "Permission is hereby granted") {
        throw "THIRD_PARTY_NOTICES.txt does not contain the required js-yaml 4.3.2 MIT notice."
    }

    $vendorEntry = $archive.Entries | Where-Object { $_.FullName -eq "scripts/vendor/js-yaml.mjs" } | Select-Object -First 1
    if ($null -eq $vendorEntry) { throw "Release is missing the vetted js-yaml bundle." }
    $vendorStream = $vendorEntry.Open()
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    try {
        $vendorHash = ([System.BitConverter]::ToString($sha256.ComputeHash($vendorStream))).Replace("-", "")
    } finally {
        $sha256.Dispose()
        $vendorStream.Dispose()
    }
    if ($vendorHash -cne "CC003EBD196EED62C0216F0C9D69EAF3593BEADD6DD9B4DB7EE696AF646238B8") {
        throw "Vendored js-yaml does not match the vetted 4.3.2 ESM bundle."
    }

    $debugEntry = $archive.Entries | Where-Object { $_.FullName -eq "scripts/debugApi.js" } | Select-Object -First 1
    if ($null -ne $debugEntry) {
        $debugStream = $debugEntry.Open()
        $debugReader = [System.IO.StreamReader]::new($debugStream)
        try {
            $debugSource = $debugReader.ReadToEnd()
        } finally {
            $debugReader.Dispose()
            $debugStream.Dispose()
        }
        $socketEnabled = ($manifest.PSObject.Properties.Name -contains "socket") -and $manifest.socket -eq $true
        if ($debugSource -match "\bgame\.socket\b" -and -not $socketEnabled) {
            throw "Runtime uses game.socket but module.json does not declare socket: true."
        }
    }

    if (($manifest.PSObject.Properties.Name -contains "download") -and
        -not [string]::IsNullOrWhiteSpace([string]$manifest.download) -and
        [string]$manifest.download -match "^https://github\.com/.+/releases/" -and
        [string]$manifest.download -notmatch "/releases/download/V$([regex]::Escape([string]$manifest.version))/") {
        throw "GitHub release downloads must be pinned to the manifest version V$($manifest.version)."
    }

    if (-not [string]::IsNullOrWhiteSpace($StandaloneManifestPath)) {
        $resolvedStandalone = (Resolve-Path -LiteralPath $StandaloneManifestPath).Path
        $standalone = Get-Content -LiteralPath $resolvedStandalone -Raw | ConvertFrom-Json
        $archiveManifestJson = $manifest | ConvertTo-Json -Depth 100 -Compress
        $standaloneManifestJson = $standalone | ConvertTo-Json -Depth 100 -Compress
        if ($archiveManifestJson -cne $standaloneManifestJson) {
            throw "Standalone module.json does not match the archive manifest."
        }
    }

    [pscustomobject]@{
        Module = $manifest.id
        Version = $manifest.version
        Archive = $resolvedArchive
        Entries = $entryNames.Count
        SizeKB = [math]::Round((Get-Item -LiteralPath $resolvedArchive).Length / 1KB, 1)
        StandaloneManifest = if ([string]::IsNullOrWhiteSpace($StandaloneManifestPath)) { $null } else { $resolvedStandalone }
        Valid = $true
    }
} finally {
    $archive.Dispose()
}
