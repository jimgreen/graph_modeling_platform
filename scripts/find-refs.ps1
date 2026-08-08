$lines = Get-Content D:\work\graph_modeling_platform\src\model-routing.ts
$before = $lines[0..5436]
$after = $lines[6543..($lines.Length-1)]
$all = $before + $after
$funcs = @('serializeProject','deserializeProject','createSavedProject','createSavedScheme','upsertSavedProject','deleteSavedProject','deleteSavedScheme','renameSavedProject','renameSavedScheme','findSavedSchemeById','findSavedProjectRecordInSchemes','flattenSavedSchemes','flattenSavedProjects','normalizeProjectLayers','normalizeModelLayers','normalizeModelGroups','orderNodesByModelLayer','filterProjectByVisibleLayers','lockProjectEdgeTerminals','createModelLayer','resolveActiveModelLayerId','mergeSavedSchemesForStartup','savedProjectPathOptions','copySavedProjectWithUniqueName','copySavedSchemeWithUniqueName','moveSavedSchemeToParent','moveProjectToScheme','upsertSavedProjectInScheme','deleteSavedProjectsFromSchemes','insertChildSavedScheme','replaceSavedSchemeById','uniqueRecordName','normalizeSavedSchemeRecordNames','normalizeSavedProjectRecordNames','hydrateSavedSchemeRuntimeIds','stripSavedSchemeRuntimeIds','nextSavedProjectAfterProjectDeletion','nextSavedProjectAfterProjectBatchDeletion','nextSavedProjectAfterSchemeDeletion','findSavedSchemeParentById','savedSchemeSiblingNames','savedChildSchemeNames','mapSavedSchemeTree','SavedProjectSelection','SavedProjectPathOption')
foreach ($f in $funcs) {
  $found = $false
  $lineNum = 0
  foreach ($line in $all) {
    $lineNum++
    if ($line -match [regex]::Escape($f)) {
      if (-not $found) { Write-Output "--- $f ---"; $found = $true }
      Write-Output "  L$lineNum"
    }
  }
}
