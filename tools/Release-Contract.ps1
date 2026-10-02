# Shared by both importer repositories. Keep the two copies identical.
Set-StrictMode -Version Latest

function Get-ImporterCompanionId {
    param([string]$ModuleId)
    switch ($ModuleId) {
        "5e-item-importer" { return "5e-activity-importer" }
        "5e-activity-importer" { return "5e-item-importer" }
        default { throw "Unknown importer module id: $ModuleId" }
    }
}

function Assert-ImporterReleaseManifest {
    param([Parameter(Mandatory = $true)]$Manifest)
    $companionId = Get-ImporterCompanionId ([string]$Manifest.id)
    $releaseVersion = [string]$Manifest.version
    if ($releaseVersion -notmatch '^\d+\.\d+\.\d+$') {
        throw "Importer release version must use major.minor.patch: $releaseVersion"
    }
    # Check independence and the module's own URLs even when the free release
    # deliberately omits the install recommendation for its private companion.
    if ($Manifest.relationships.PSObject.Properties.Name -contains "requires") {
        if (@($Manifest.relationships.requires | Where-Object { $_.id -eq $companionId }).Count -gt 0) {
            throw "$($Manifest.id) must keep $companionId optional; a hard requirement breaks independent operation."
        }
    }
    $recommendations = @()
    if ($Manifest.relationships.PSObject.Properties.Name -contains "recommends") {
        $recommendations = @($Manifest.relationships.recommends | Where-Object { $_.id -eq $companionId })
    }
    $allowAbsentRecommendation = $Manifest.id -eq "5e-item-importer"
    if ($recommendations.Count -gt 1 -or ($recommendations.Count -eq 0 -and -not $allowAbsentRecommendation)) {
        throw "$($Manifest.id) must recommend exactly one $companionId companion."
    }
    $recommendation = $null
    $urls = @($Manifest.manifest)
    $download = $Manifest.PSObject.Properties["download"]
    if ($Manifest.id -eq "5e-activity-importer") {
        $protection = $Manifest.PSObject.Properties["protected"]
        if ($null -eq $protection -or $protection.Value -isnot [bool] -or $protection.Value -ne $true) {
            throw "Hosted premium releases must declare protected: true."
        }
        if ([string]$Manifest.manifest -cne "https://r2.foundryvtt.com/packages-public/$($Manifest.id)/module.json") {
            throw "Hosted premium releases must use the module-specific Foundry manifest URL."
        }
        if ($null -ne $download) {
            throw "Hosted premium releases must omit the download field."
        }
    } else {
        if ($null -eq $download -or [string]::IsNullOrWhiteSpace([string]$download.Value)) {
            throw "Free releases must declare a download URL."
        }
        $urls += $download.Value
    }
    if ($recommendations.Count -eq 1) {
        $recommendation = $recommendations[0]
        if ($recommendation.type -ne "module") {
            throw "$($Manifest.id) companion recommendation must have type module."
        }
        $minimum = [string]$recommendation.compatibility.minimum
        if ($minimum -notmatch '^\d+\.\d+\.\d+$' -or [version]$minimum -gt [version]$releaseVersion) {
            throw "$($Manifest.id) companion minimum must be a release version no newer than $releaseVersion."
        }
        # Recorded verification is evidence, not a value to advance with every package patch.
        $verified = [string]$recommendation.compatibility.verified
        if ($verified -notmatch '^\d+\.\d+\.\d+$' -or
            [version]$verified -lt [version]$minimum -or [version]$verified -gt [version]$releaseVersion) {
            throw "$($Manifest.id) companion verified version must be between its minimum and $releaseVersion."
        }
        if ([string]::IsNullOrWhiteSpace([string]$recommendation.reason)) {
            throw "$($Manifest.id) companion recommendation must explain its optional features."
        }
        if ($recommendation.compatibility.PSObject.Properties.Name -contains "maximum") {
            throw "$($Manifest.id) must not pin a companion maximum; compatible users may update either module first."
        }
        $urls += $recommendation.manifest
    }
    foreach ($value in $urls) {
        $parsedUri = $null
        if (-not [uri]::TryCreate([string]$value, [UriKind]::Absolute, [ref]$parsedUri) -or
            $parsedUri.Scheme -notin @("http", "https")) {
            throw "$($Manifest.id) release and companion URLs must be absolute HTTP(S) URLs."
        }
    }
    if ($null -ne $download -and [string]$download.Value -match '^https://github\.com/.+/releases/' -and
        [string]$download.Value -notmatch "/releases/download/V$([regex]::Escape($releaseVersion))/") {
        throw "$($Manifest.id) GitHub download must be pinned to V$releaseVersion."
    }
    return $recommendation
}

function Assert-ImporterReleasePair {
    param(
        [Parameter(Mandatory = $true)][string]$ModuleRoot,
        [Parameter(Mandatory = $true)][string]$CompanionRoot
    )
    $roots = @((Resolve-Path -LiteralPath $ModuleRoot).Path, (Resolve-Path -LiteralPath $CompanionRoot).Path)
    $manifests = @($roots | ForEach-Object {
        Get-Content -LiteralPath (Join-Path $_ "module.json") -Raw -Encoding UTF8 | ConvertFrom-Json
    })
    # Key by id because a null free-module recommendation has no pipeline output.
    $recommendations = @{}
    foreach ($manifest in $manifests) {
        $recommendations[$manifest.id] = Assert-ImporterReleaseManifest $manifest
    }
    if ($manifests[1].id -ne (Get-ImporterCompanionId $manifests[0].id)) {
        throw "CompanionPath must point to the other importer repository."
    }
    if ([string]$manifests[0].version -cne [string]$manifests[1].version) {
        throw "Paired release versions differ: $($manifests[0].version) / $($manifests[1].version)."
    }
    for ($index = 0; $index -lt 2; $index++) {
        $recommendation = $recommendations[$manifests[$index].id]
        if ($null -ne $recommendation -and [string]$recommendation.manifest -cne [string]$manifests[1 - $index].manifest) {
            throw "$($manifests[$index].id) companion URL does not match the companion manifest URL."
        }
    }
    $systems = @($manifests | ForEach-Object {
        $dnd5e = @($_.relationships.systems | Where-Object { $_.id -eq "dnd5e" })
        if ($dnd5e.Count -ne 1) { throw "$($_.id) must declare exactly one dnd5e system compatibility target." }
        $dnd5e[0]
    })
    foreach ($platform in @("Foundry", "dnd5e")) {
        $targets = if ($platform -eq "Foundry") {
            @($manifests[0].compatibility, $manifests[1].compatibility)
        } else {
            @($systems[0].compatibility, $systems[1].compatibility)
        }
        foreach ($field in @("minimum", "verified", "maximum")) {
            $values = @($targets | ForEach-Object {
                $property = $_.PSObject.Properties[$field]
                if ($null -eq $property) { "" } else { [string]$property.Value }
            })
            if ($field -ne "maximum" -and @($values | Where-Object { [string]::IsNullOrWhiteSpace($_) }).Count -gt 0) {
                throw "Both importers must declare $platform compatibility.$field."
            }
            if ($values[0] -cne $values[1]) {
                throw "Paired $platform compatibility.$field differs: $($values[0]) / $($values[1])."
            }
        }
    }
    return [pscustomobject]@{
        Version = [string]$manifests[0].version
        Modules = @(for ($index = 0; $index -lt 2; $index++) {
            [pscustomobject]@{ Root = $roots[$index]; Manifest = $manifests[$index] }
        })
    }
}

# Fixed versions written into the README (badges and **Version:** lines) must match the manifest.
# Dynamic GitHub release badges carry no version text and always pass.
function Assert-ImporterReadmeVersion {
    param(
        [Parameter(Mandatory = $true)][string]$ReadmePath,
        [Parameter(Mandatory = $true)][string]$Version
    )
    $readme = Get-Content -LiteralPath $ReadmePath -Raw -Encoding UTF8
    $patterns = @(
        'img\.shields\.io/badge/[^)\s"]*?-(\d+\.\d+\.\d+)-',
        '\bversion (\d+\.\d+\.\d+)\]\(https://img\.shields\.io',
        '\*\*(?:Module )?[Vv]ersion:\*\* `?(\d+\.\d+\.\d+)`?'
    )
    $stale = @(@(foreach ($pattern in $patterns) {
        [regex]::Matches($readme, $pattern) | ForEach-Object { $_.Groups[1].Value }
    }) | Where-Object { $_ -cne $Version } | Select-Object -Unique)
    if ($stale.Count -gt 0) {
        throw "README states version $($stale -join ', ') but module.json is $Version."
    }
}
