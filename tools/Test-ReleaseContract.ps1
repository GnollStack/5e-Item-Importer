[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "Release-Contract.ps1")

function New-TestManifest {
    param([string]$Id, [string]$Version = "14.1.3")
    $companionId = Get-ImporterCompanionId $Id
    $manifest = [pscustomobject]@{
        id = $Id; version = $Version
        compatibility = [pscustomobject]@{ minimum = "14"; verified = "14.367" }
        manifest = "https://example.invalid/$Id/module.json"
        download = "https://example.invalid/$Id/V$Version/$Id.zip"
        relationships = [pscustomobject]@{
            systems = @([pscustomobject]@{
                id = "dnd5e"; type = "system"
                compatibility = [pscustomobject]@{ minimum = "5.3.0"; verified = "5.3.3" }
            })
            recommends = @([pscustomobject]@{
                id = $companionId; type = "module"
                manifest = $(if ($companionId -eq "5e-activity-importer") {
                    "https://r2.foundryvtt.com/packages-public/$companionId/module.json"
                } else { "https://example.invalid/$companionId/module.json" })
                compatibility = [pscustomobject]@{ minimum = "14.1.2"; verified = $Version }
                reason = "Optional companion features."
            })
        }
    }
    if ($Id -eq "5e-activity-importer") {
        $manifest.manifest = "https://r2.foundryvtt.com/packages-public/$Id/module.json"
        $manifest.PSObject.Properties.Remove("download")
        $manifest | Add-Member protected $true
    }
    return $manifest
}

$checks = 0
function Assert-Rejected {
    param([scriptblock]$Action, [string]$Message)
    try { & $Action | Out-Null } catch {
        if ($_.Exception.Message -notlike "*$Message*") { throw "Unexpected rejection: $($_.Exception.Message)" }
        return
    }
    throw "Expected rejection containing: $Message"
}

foreach ($id in @("5e-item-importer", "5e-activity-importer")) {
    # A future patch release is valid without editing a version literal in any script.
    Assert-ImporterReleaseManifest (New-TestManifest $id) | Out-Null
    $checks++
    $fixture = New-TestManifest $id
    $fixture.relationships.recommends[0].compatibility.verified = "14.1.2"
    Assert-ImporterReleaseManifest $fixture | Out-Null
    $checks++
    $fixture = New-TestManifest $id
    $fixture.relationships.recommends[0].compatibility.minimum = "14.2.0"
    Assert-Rejected { Assert-ImporterReleaseManifest $fixture } "minimum"
    $checks++
    $fixture = New-TestManifest $id
    $fixture.relationships | Add-Member requires @([pscustomobject]@{ id = (Get-ImporterCompanionId $id) })
    Assert-Rejected { Assert-ImporterReleaseManifest $fixture } "hard requirement"
    $checks++
    $fixture = New-TestManifest $id
    $fixture.relationships.recommends[0].compatibility | Add-Member maximum "14.1.3"
    Assert-Rejected { Assert-ImporterReleaseManifest $fixture } "companion maximum"
    $checks++
    $fixture = New-TestManifest $id
    $fixture | Add-Member -NotePropertyName download -NotePropertyValue "https://github.com/example/$id/releases/download/V14.1.2/$id.zip" -Force
    $expected = if ($id -eq "5e-activity-importer") { "omit the download field" } else { "pinned to V14.1.3" }
    Assert-Rejected { Assert-ImporterReleaseManifest $fixture } $expected
    $checks++
    foreach ($verified in @("14.1.1", "14.1.4", "not-a-version")) {
        $fixture = New-TestManifest $id
        $fixture.relationships.recommends[0].compatibility.verified = $verified
        Assert-Rejected { Assert-ImporterReleaseManifest $fixture } "companion verified version"
        $checks++
    }
    Assert-ImporterReleaseManifest (New-TestManifest $id "14.1.4") | Out-Null
    $checks++
}

foreach ($protection in @($false, "true", $null)) {
    $fixture = New-TestManifest "5e-activity-importer"
    if ($null -eq $protection) { $fixture.PSObject.Properties.Remove("protected") }
    else { $fixture.protected = $protection }
    Assert-Rejected { Assert-ImporterReleaseManifest $fixture } "protected: true"
    $checks++
}
$fixture = New-TestManifest "5e-activity-importer"
$fixture.manifest = "https://r2.foundryvtt.com/packages-public/other-module/module.json"
Assert-Rejected { Assert-ImporterReleaseManifest $fixture } "module-specific Foundry manifest"
$checks++
foreach ($download in @("", $null)) {
    $fixture = New-TestManifest "5e-activity-importer"
    $fixture | Add-Member download $download
    Assert-Rejected { Assert-ImporterReleaseManifest $fixture } "omit the download field"
    $checks++
}
$fixture = New-TestManifest "5e-item-importer"
$fixture.PSObject.Properties.Remove("download")
Assert-Rejected { Assert-ImporterReleaseManifest $fixture } "declare a download URL"
$checks++

foreach ($shape in @("omitted", "empty")) {
    $fixture = New-TestManifest "5e-item-importer"
    if ($shape -eq "omitted") { $fixture.relationships.PSObject.Properties.Remove("recommends") }
    else { $fixture.relationships.recommends = @() }
    Assert-ImporterReleaseManifest $fixture | Out-Null
    $checks++
}
$fixture = New-TestManifest "5e-activity-importer"
$fixture.relationships.PSObject.Properties.Remove("recommends")
Assert-Rejected { Assert-ImporterReleaseManifest $fixture } "must recommend exactly one"
$checks++
$fixture = New-TestManifest "5e-item-importer"
$fixture.relationships.PSObject.Properties.Remove("recommends")
$fixture.relationships | Add-Member requires @([pscustomobject]@{ id = "5e-activity-importer" })
Assert-Rejected { Assert-ImporterReleaseManifest $fixture } "hard requirement"
$checks++
$fixture = New-TestManifest "5e-item-importer"
$fixture.relationships.PSObject.Properties.Remove("recommends")
$fixture.manifest = "not-a-url"
Assert-Rejected { Assert-ImporterReleaseManifest $fixture } "absolute HTTP(S)"
$checks++
$fixture = New-TestManifest "5e-item-importer"
$fixture.relationships.PSObject.Properties.Remove("recommends")
$fixture.download = "https://github.com/example/items/releases/download/V14.1.2/items.zip"
Assert-Rejected { Assert-ImporterReleaseManifest $fixture } "pinned to V14.1.3"
$checks++
$fixture = New-TestManifest "5e-item-importer"
$fixture.relationships.recommends[0].type = "system"
Assert-Rejected { Assert-ImporterReleaseManifest $fixture } "type module"
$checks++
$fixture = New-TestManifest "5e-item-importer"
$fixture.relationships.recommends += $fixture.relationships.recommends[0]
Assert-Rejected { Assert-ImporterReleaseManifest $fixture } "must recommend exactly one"
$checks++

$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) "importer-release-test-$([guid]::NewGuid().ToString('N'))"
try {
    $itemRoot = Join-Path $testRoot "5e-item-importer"
    $activityRoot = Join-Path $testRoot "5e-activity-importer"
    New-Item -ItemType Directory -Path $itemRoot, $activityRoot -Force | Out-Null

    $readmePath = Join-Path $testRoot "README.md"
    Set-Content -LiteralPath $readmePath -Encoding UTF8 -Value @(
        '[![5e Activity Importer version 14.1.3](https://img.shields.io/badge/5e_Activity_Importer-14.1.3-blue?style=flat-square)](#)',
        '**Version:** 14.1.3'
    )
    Assert-ImporterReadmeVersion $readmePath "14.1.3"
    $checks++
    Assert-Rejected { Assert-ImporterReadmeVersion $readmePath "14.1.4" } "README states version 14.1.3"
    $checks++
    Set-Content -LiteralPath $readmePath -Encoding UTF8 -Value '[![Latest Release](https://img.shields.io/github/v/release/GnollStack/5e-Item-Importer?label=Latest%20Release)](#)'
    Assert-ImporterReadmeVersion $readmePath "14.1.4"
    $checks++

    $item = New-TestManifest "5e-item-importer"
    $activity = New-TestManifest "5e-activity-importer"
    $item | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $itemRoot "module.json")
    $activity | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $activityRoot "module.json")
    Assert-ImporterReleasePair $itemRoot $activityRoot | Out-Null
    $checks++
    $activity.version = "14.1.4"
    $activity.relationships.recommends[0].compatibility.verified = "14.1.4"
    $activity | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $activityRoot "module.json")
    Assert-Rejected { Assert-ImporterReleasePair $itemRoot $activityRoot } "versions differ"
    $checks++
    $activity = New-TestManifest "5e-activity-importer"
    $activity.relationships.recommends[0].manifest = "https://example.invalid/changed/module.json"
    $activity | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $activityRoot "module.json")
    Assert-Rejected { Assert-ImporterReleasePair $itemRoot $activityRoot } "companion URL"
    $checks++
    Assert-Rejected { Assert-ImporterReleasePair $itemRoot $itemRoot } "other importer"
    $checks++
    foreach ($platform in @("Foundry", "dnd5e")) {
        foreach ($field in @("minimum", "verified", "maximum")) {
            $activity = New-TestManifest "5e-activity-importer"
            $target = if ($platform -eq "Foundry") { $activity.compatibility } else { $activity.relationships.systems[0].compatibility }
            $different = if ($platform -eq "Foundry") { "13" } else { "5.1.10" }
            $target | Add-Member -NotePropertyName $field -NotePropertyValue $different -Force
            $activity | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $activityRoot "module.json")
            Assert-Rejected { Assert-ImporterReleasePair $itemRoot $activityRoot } "Paired $platform compatibility.$field differs"
            $checks++
        }
    }
    $activity = New-TestManifest "5e-activity-importer"
    $activity | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $activityRoot "module.json")
    $item.relationships.PSObject.Properties.Remove("recommends")
    $item | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $itemRoot "module.json")
    Assert-ImporterReleasePair $itemRoot $activityRoot | Out-Null
    $checks++
    Assert-ImporterReleasePair $activityRoot $itemRoot | Out-Null
    $checks++
    $item.version = "14.1.4"
    $item | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $itemRoot "module.json")
    Assert-Rejected { Assert-ImporterReleasePair $itemRoot $activityRoot } "versions differ"
    $checks++
    $item.version = "14.1.3"
    $item | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $itemRoot "module.json")
    $activity.relationships.recommends[0].manifest = "https://example.invalid/wrong-free-manifest.json"
    $activity | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $activityRoot "module.json")
    Assert-Rejected { Assert-ImporterReleasePair $itemRoot $activityRoot } "companion URL"
    $checks++
} finally {
    $tempPrefix = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd('\') + '\'
    $resolvedTestRoot = [System.IO.Path]::GetFullPath($testRoot)
    if ($resolvedTestRoot.StartsWith($tempPrefix, [StringComparison]::OrdinalIgnoreCase) -and
        (Split-Path $resolvedTestRoot -Leaf) -like 'importer-release-test-*' -and
        (Test-Path -LiteralPath $resolvedTestRoot)) {
        Remove-Item -LiteralPath $resolvedTestRoot -Recurse -Force
    }
}
[pscustomobject]@{ Suite = "release contract"; Passed = $checks; Failed = 0 }
