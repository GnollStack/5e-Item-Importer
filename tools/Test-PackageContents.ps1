[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$output = Join-Path ([System.IO.Path]::GetTempPath()) "item-preflight-$([guid]::NewGuid().ToString('N'))"
$report = & (Join-Path $PSScriptRoot "Build-Release.ps1") -CheckOnly -OutputDirectory $output
if (Test-Path -LiteralPath $output) { throw "CheckOnly created an output directory." }
if ($report.Built -or -not $report.Valid) { throw "Expected successful non-writing preflight." }
$checks = 1
$files = @($report.Files)
$entries = [System.Collections.Generic.HashSet[string]]::new([string[]]$files, [System.StringComparer]::Ordinal)
foreach ($path in @("docs/import-window.md", "docs/automation-schema-4.md", "docs/template-authoring.md", "docs/explicit-yaml-v2.md", "docs/native-field-catalog.md", "docs/midi-field-catalog.md", "docs/examples/README.md")) {
    if (-not $entries.Contains($path)) { throw "Customer guide missing from selection: $path" }
    $checks++
}
if (@($files | Where-Object { $_ -match '^(tests|tools|dist|LLM-Instructions|\.git)/|^docs/(README\.html|verification)' }).Count) {
    throw "Selection contains developer-only files."
}
$checks++
$debug = Get-Content -LiteralPath (Join-Path $root "scripts/debugApi.js") -Raw -Encoding UTF8
$assets = [regex]::Match($debug, '(?s)const MODULE_ASSETS = Object\.freeze\(\[(.*?)\]\);')
if (-not $assets.Success) { throw "Diagnostics assets unavailable." }
foreach ($asset in [regex]::Matches($assets.Groups[1].Value, '"([^"\r\n]+)"')) {
    if (-not $entries.Contains($asset.Groups[1].Value)) { throw "Installed diagnostics asset missing: $($asset.Groups[1].Value)" }
}
$checks++
$links = 0
$prefix = $root + [System.IO.Path]::DirectorySeparatorChar
foreach ($file in $files | Where-Object { $_.EndsWith(".md") }) {
    $source = Get-Content -LiteralPath (Join-Path $root $file) -Raw -Encoding UTF8
    foreach ($match in [regex]::Matches($source, '\[[^\]]*\]\(([^)]+)\)')) {
        $href = $match.Groups[1].Value
        if ($href -match '^(https?://|mailto:|#)') { continue }
        $relative = [uri]::UnescapeDataString(($href -split '#', 2)[0])
        $target = [System.IO.Path]::GetFullPath((Join-Path (Split-Path (Join-Path $root $file) -Parent) $relative))
        if (-not $target.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) { throw "Documentation link leaves package: $file -> $href" }
        $key = $target.Substring($prefix.Length).Replace("\", "/").TrimEnd("/")
        $directoryLink = @($files | Where-Object { $_.StartsWith($key + '/', [StringComparison]::Ordinal) }).Count -gt 0
        if (-not $entries.Contains($key) -and -not $directoryLink) { throw "Documentation link not selected: $file -> $href" }
        $links++
    }
}
if ($links -lt 20) { throw "Expected real customer documentation links." }
$checks++
[pscustomobject]@{ Suite = "package documentation and non-writing preflight"; Passed = $checks; Failed = 0; Files = $files.Count; DocumentationLinks = $links }
