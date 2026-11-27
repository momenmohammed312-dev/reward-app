param(
    [string]$File = "",
    [string]$RepoRoot = "",
    [switch]$All
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

if (-not $RepoRoot) {
    # Script resides at <RepoRoot>/MO2/scripts/sync_to_github_and_notion.ps1
    $RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
}

# 1. Load Notion Token from env or ~/.gemini/config/mcp_config.json
$NotionToken = $env:NOTION_TOKEN
if (-not $NotionToken) {
    $mcpConfigPath = Join-Path $env:USERPROFILE ".gemini\config\mcp_config.json"
    if (Test-Path $mcpConfigPath) {
        $mcpConfig = Get-Content $mcpConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
        $NotionToken = $mcpConfig.mcpServers.notion.env.NOTION_TOKEN
    }
}
if (-not $NotionToken) {
    throw "NOTION_TOKEN not found in environment or ~/.gemini/config/mcp_config.json"
}

# 2. Load GitHub Token from env or git credential manager
$GitHubToken = $env:GITHUB_TOKEN
if (-not $GitHubToken) {
    $credLines = "protocol=https`nhost=github.com`n`n" | git credential fill
    $pwLine = $credLines | Where-Object { $_ -like "password=*" }
    if ($pwLine) {
        $GitHubToken = $pwLine.Substring(9).Trim()
    }
}
if (-not $GitHubToken) {
    throw "GITHUB_TOKEN not found in environment or git credential manager"
}

$ProjectName = "MO2 Loyalty App"
$GitHubRepo = "momenmohammed312-dev/reward-app"
$BugsDatabaseId = "a63061e4-eebe-4040-a057-a9dbd4454dc9"
$TasksDatabaseId = "1ab4c829-3bd9-47e6-a2cd-55a65d7a2dcb"

$NotionHeaders = @{
    "Authorization"  = "Bearer $NotionToken"
    "Notion-Version" = "2022-06-28"
    "Content-Type"   = "application/json; charset=utf-8"
}

$GitHubHeaders = @{
    "Authorization" = "Bearer $GitHubToken"
    "Accept"        = "application/vnd.github+json"
    "User-Agent"    = "MO2-Loyalty-Sync"
}

function Invoke-NotionJson($Uri, $Method, $BodyObj) {
    $json = $BodyObj | ConvertTo-Json -Depth 15 -Compress
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    return Invoke-RestMethod -Uri $Uri -Headers $NotionHeaders -Method $Method -Body $bytes
}

function Invoke-GitHubJson($Uri, $Method, $BodyObj) {
    if ($null -eq $BodyObj) {
        return Invoke-RestMethod -Uri $Uri -Headers $GitHubHeaders -Method $Method
    }
    $json = $BodyObj | ConvertTo-Json -Depth 10 -Compress
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    return Invoke-RestMethod -Uri $Uri -Headers $GitHubHeaders -Method $Method -Body $bytes -ContentType "application/json; charset=utf-8"
}

function Get-SectionText([string]$Content, [string]$HeaderPrefix) {
    $pattern = "(?ms)^##\s+$([regex]::Escape($HeaderPrefix)).*?\r?\n(.*?)(?=^##\s+|\z)"
    $m = [regex]::Match($Content, $pattern)
    if ($m.Success) {
        return $m.Groups[1].Value.Trim()
    }
    return ""
}

function Truncate-Text([string]$Text, [int]$MaxLen = 1900) {
    if ([string]::IsNullOrWhiteSpace($Text)) { return "-" }
    if ($Text.Length -le $MaxLen) { return $Text }
    return $Text.Substring(0, $MaxLen) + "..."
}

function Get-RelativeRepoPath([string]$FullPath) {
    $normRoot = [System.IO.Path]::GetFullPath($RepoRoot).TrimEnd('\', '/')
    $normFile = [System.IO.Path]::GetFullPath($FullPath)
    if ($normFile.StartsWith($normRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $normFile.Substring($normRoot.Length).TrimStart('\', '/').Replace('\', '/')
    }
    return [System.IO.Path]::GetFileName($FullPath)
}

function Sync-SingleTicketFile([string]$FilePath) {
    if (-not (Test-Path $FilePath)) {
        throw "Ticket file not found: $FilePath"
    }

    $fileName = [System.IO.Path]::GetFileName($FilePath)
    if ($fileName.StartsWith("_template-")) {
        Write-Verbose "Skipping template file $fileName"
        return
    }

    $raw = [System.IO.File]::ReadAllText($FilePath, [System.Text.Encoding]::UTF8)
    $relPath = Get-RelativeRepoPath $FilePath

    # Detect Ticket ID (MO2-BUG-XXXX, MO2-FEAT-XXXX, MO2-DELEG-XXXX)
    $ticketId = ""
    $isFeature = $false
    if ($fileName -match "^(MO2-BUG-\d+)") {
        $ticketId = $Matches[1]
    } elseif ($fileName -match "^(MO2-FEAT-\d+)") {
        $ticketId = $Matches[1]
        $isFeature = $true
    } elseif ($fileName -match "^(MO2-DELEG-\d+)") {
        $ticketId = $Matches[1]
        $isFeature = $true
    } elseif ($raw -match "\b(MO2-BUG-\d+)\b") {
        $ticketId = $Matches[1]
    } elseif ($raw -match "\b(MO2-FEAT-\d+)\b") {
        $ticketId = $Matches[1]
        $isFeature = $true
    } elseif ($raw -match "\b(MO2-DELEG-\d+)\b") {
        $ticketId = $Matches[1]
        $isFeature = $true
    }

    if (-not $ticketId) {
        Write-Warning "Skipping $fileName (no MO2-BUG-XXXX, MO2-FEAT-XXXX, or MO2-DELEG-XXXX ID found)"
        return
    }

    $headingMatch = [regex]::Match($raw, "(?m)^#\s+(.+)$")
    $headingTitle = if ($headingMatch.Success) { $headingMatch.Groups[1].Value.Trim() } else { $ticketId }

    $sec1 = Get-SectionText $raw "1."
    $ghIssueTitle = $headingTitle

    # Priority (Tasks & Bugs DBs support P0..P3; map P4 -> P3)
    $priority = "P2"
    $priMatch = [regex]::Match($sec1, "\b(P[0-4])\b")
    if ($priMatch.Success) {
        $rawPri = $priMatch.Groups[1].Value
        $priority = if ($rawPri -eq "P4") { "P3" } else { $rawPri }
    }

    # Status parsing
    $rawStatus = "open"
    $foundStatus = $null

    if ($raw -match "(?i)[-*]\s*(\*\*)?status(\*\*)?:\s*`?([^\r\n`]+)") {
        $foundStatus = $Matches[3].Trim()
    } elseif ($sec1 -match "(?i)\|\s*(\*\*)?(\u0627\u0644\u062D\u0627\u0644\u0629|status)(\*\*)?\s*\|\s*`?([^\r\n`|]+)`?\s*\|") {
        $foundStatus = $Matches[4].Trim()
    } elseif ($sec1 -match "(?i)\|\s*(done|resolved|fixed|closed|review|in-progress|open)\s*\|") {
        $foundStatus = $Matches[1].Trim()
    } elseif ($raw -match "(?i)\*\*\u0627\u0644\u062D\u0627\u0644\u0629:\*\*\s*`?([^\r\n`\u2014\-]+)") {
        $foundStatus = $Matches[1].Trim()
    }

    if ($foundStatus) {
        if ($foundStatus -match "(?i)\b(done|resolved|fixed|closed)\b") {
            $rawStatus = "done"
        } elseif ($foundStatus -match "(?i)\b(review)\b") {
            $rawStatus = "review"
        } elseif ($foundStatus -match "(?i)\b(in-progress)\b") {
            $rawStatus = "in-progress"
        } else {
            $rawStatus = "open"
        }
    }

    $ghState = if ($rawStatus -in @("done", "resolved")) { "closed" } else { "open" }
    $ghLabel = if ($isFeature) { "enhancement" } else { "bug" }

    # --- STEP A: Create or Update GitHub Issue ---
    $ghListUrl = "https://api.github.com/repos/$GitHubRepo/issues?state=all&per_page=100"
    $allGhIssues = Invoke-GitHubJson $ghListUrl "Get" $null
    $existingGh = $allGhIssues | Where-Object { $_.title -like "*$ticketId*" } | Select-Object -First 1

    $ghBody = "> **Project:** $ProjectName`n> **Ticket File:** ``$relPath```n`n$raw"

    if ($existingGh) {
        $ghIssueNumber = $existingGh.number
        $ghPatchUrl = "https://api.github.com/repos/$GitHubRepo/issues/$ghIssueNumber"
        $updatedGh = Invoke-GitHubJson $ghPatchUrl "Patch" @{
            title = $ghIssueTitle
            body  = $ghBody
            state = $ghState
        }
        $ghIssueUrl = $updatedGh.html_url
        Write-Output "[$ticketId] Updated GitHub Issue #$ghIssueNumber ($ghState): $ghIssueUrl"
    } else {
        $ghCreateUrl = "https://api.github.com/repos/$GitHubRepo/issues"
        $createdGh = Invoke-GitHubJson $ghCreateUrl "Post" @{
            title  = $ghIssueTitle
            body   = $ghBody
            labels = @($ghLabel)
        }
        $ghIssueNumber = $createdGh.number
        $ghIssueUrl = $createdGh.html_url
        if ($ghState -eq "closed") {
            $ghPatchUrl = "https://api.github.com/repos/$GitHubRepo/issues/$ghIssueNumber"
            $null = Invoke-GitHubJson $ghPatchUrl "Patch" @{
                state = "closed"
            }
        }
        Write-Output "[$ticketId] Created GitHub Issue #$ghIssueNumber ($ghState): $ghIssueUrl"
    }

    # --- STEP B: Sync to Notion (Tasks DB or Bugs DB) with Project = MO2 Loyalty App ---
    $linkEmoji = [char]::ConvertFromUtf32(0x1F517)

    if ($isFeature) {
        $targetDbId = $TasksDatabaseId
        $taskStatus = switch ($rawStatus) {
            "done"        { "Done" }
            "resolved"    { "Done" }
            "review"      { "Waiting" }
            "in-progress" { "In Progress" }
            default       { "Next" }
        }

        $secValue = Get-SectionText $raw "2."
        $secReqs = Get-SectionText $raw "3."
        $secAC = Get-SectionText $raw "4."
        $secTech = Get-SectionText $raw "5."
        $secPlan = Get-SectionText $raw "6."
        $secLog = Get-SectionText $raw "8."

        $queryBody = @{
            filter = @{
                property  = "Ticket ID"
                rich_text = @{ equals = $ticketId }
            }
        }
        $notionQueryUrl = "https://api.notion.com/v1/databases/$targetDbId/query"
        $notionSearch = Invoke-NotionJson $notionQueryUrl "Post" $queryBody
        $existingNotion = $notionSearch.results | Select-Object -First 1

        $notesSummary = "المشروع: $ProjectName | " + (Truncate-Text $secValue 1700)

        $propertiesPayload = @{
            "Task" = @{
                title = @(
                    @{ text = @{ content = $headingTitle } }
                )
            }
            "Project" = @{
                select = @{ name = $ProjectName }
            }
            "Ticket ID" = @{
                rich_text = @(
                    @{ text = @{ content = $ticketId } }
                )
            }
            "GitHub Issue" = @{
                url = $ghIssueUrl
            }
            "Status" = @{
                status = @{ name = $taskStatus }
            }
            "Priority" = @{
                select = @{ name = $priority }
            }
            "Area" = @{
                select = @{ name = "Client" }
            }
            "Notes" = @{
                rich_text = @(
                    @{ text = @{ content = $notesSummary } }
                )
            }
        }

        if ($existingNotion) {
            $notionPageId = $existingNotion.id
            $notionPatchUrl = "https://api.notion.com/v1/pages/$notionPageId"
            $updatedNotion = Invoke-NotionJson $notionPatchUrl "Patch" @{
                properties = $propertiesPayload
            }
            Write-Output "[$ticketId] Updated Notion Task Page: $($updatedNotion.url)"
        } else {
            $featEmoji = [char]::ConvertFromUtf32(0x2728)
            $childrenBlocks = @(
                @{
                    object = "block"
                    type   = "callout"
                    callout = @{
                        icon = @{ type = "emoji"; emoji = $linkEmoji }
                        rich_text = @(
                            @{ type = "text"; text = @{ content = "Project: $ProjectName`nGitHub Issue #$ghIssueNumber : " } },
                            @{ type = "text"; text = @{ content = $ghIssueUrl; link = @{ url = $ghIssueUrl } } },
                            @{ type = "text"; text = @{ content = "`nLocal File: $relPath" } }
                        )
                    }
                },
                @{
                    object = "block"
                    type   = "heading_2"
                    heading_2 = @{
                        rich_text = @(@{ type = "text"; text = @{ content = "1. Business Value & Context" } })
                    }
                },
                @{
                    object = "block"
                    type   = "paragraph"
                    paragraph = @{
                        rich_text = @(@{ type = "text"; text = @{ content = (Truncate-Text $secValue) } })
                    }
                },
                @{
                    object = "block"
                    type   = "heading_2"
                    heading_2 = @{
                        rich_text = @(@{ type = "text"; text = @{ content = "2. Requirements / Architecture" } })
                    }
                },
                @{
                    object = "block"
                    type   = "paragraph"
                    paragraph = @{
                        rich_text = @(@{ type = "text"; text = @{ content = (Truncate-Text $secReqs) } })
                    }
                },
                @{
                    object = "block"
                    type   = "heading_2"
                    heading_2 = @{
                        rich_text = @(@{ type = "text"; text = @{ content = "3. Acceptance Criteria / Implementation" } })
                    }
                },
                @{
                    object = "block"
                    type   = "paragraph"
                    paragraph = @{
                        rich_text = @(@{ type = "text"; text = @{ content = (Truncate-Text $secAC) } })
                    }
                },
                @{
                    object = "block"
                    type   = "heading_2"
                    heading_2 = @{
                        rich_text = @(@{ type = "text"; text = @{ content = "4. Technical Scope, Verification & Status Log" } })
                    }
                },
                @{
                    object = "block"
                    type   = "paragraph"
                    paragraph = @{
                        rich_text = @(@{ type = "text"; text = @{ content = (Truncate-Text ($secTech + "`n`n" + $secPlan + "`n`n" + $secLog)) } })
                    }
                }
            )

            $createPagePayload = @{
                parent     = @{ database_id = $targetDbId }
                icon       = @{ type = "emoji"; emoji = $featEmoji }
                properties = $propertiesPayload
                children   = $childrenBlocks
            }
            $notionCreateUrl = "https://api.notion.com/v1/pages"
            $createdNotion = Invoke-NotionJson $notionCreateUrl "Post" $createPagePayload
            Write-Output "[$ticketId] Created Notion Task Page: $($createdNotion.url)"
        }
    } else {
        $targetDbId = $BugsDatabaseId
        $notionStatus = switch ($rawStatus) {
            "done"        { "Closed" }
            "resolved"    { "Released" }
            "review"      { "Testing" }
            "in-progress" { "Fixing" }
            default       { "New" }
        }

        $severity = switch ($priority) {
            "P0" { "Critical" }
            "P1" { "Critical" }
            "P2" { "High" }
            "P3" { "Medium" }
            default { "Low" }
        }

        $dateMatch = [regex]::Match($sec1, "(\d{4}-\d{2}-\d{2})")
        $reportedDate = if ($dateMatch.Success) { $dateMatch.Groups[1].Value } else { (Get-Date).ToString("yyyy-MM-dd") }
        $envValue = if ($sec1 -match "(?i)production") { "Production" } elseif ($sec1 -match "(?i)staging") { "Staging" } else { "Development" }

        $secScope = Get-SectionText $raw "2."
        $secRepro = Get-SectionText $raw "3."
        $secRootCause = Get-SectionText $raw "4."
        $secFix = Get-SectionText $raw "5."
        $secTests = Get-SectionText $raw "6."
        $secImpact = Get-SectionText $raw "7."
        $secLog = Get-SectionText $raw "8."

        $hasRegressionTest = ($secTests -match "(__tests__/|\.test\.ts|vitest)")

        $queryBody = @{
            filter = @{
                property  = "Ticket ID"
                rich_text = @{ equals = $ticketId }
            }
        }
        $notionQueryUrl = "https://api.notion.com/v1/databases/$targetDbId/query"
        $notionSearch = Invoke-NotionJson $notionQueryUrl "Post" $queryBody
        $existingNotion = $notionSearch.results | Select-Object -First 1

        $nextStepText = if ($notionStatus -in @("Released", "Closed")) {
            "Resolved on MO2 Loyalty App -> Merged to main"
        } else {
            "Active investigation / fix per MO2 SOP-02"
        }

        $propertiesPayload = @{
            "Bug" = @{
                title = @(
                    @{ text = @{ content = $headingTitle } }
                )
            }
            "Project" = @{
                select = @{ name = $ProjectName }
            }
            "Ticket ID" = @{
                rich_text = @(
                    @{ text = @{ content = $ticketId } }
                )
            }
            "GitHub Issue" = @{
                url = $ghIssueUrl
            }
            "Status" = @{
                status = @{ name = $notionStatus }
            }
            "Priority" = @{
                select = @{ name = $priority }
            }
            "Severity" = @{
                select = @{ name = $severity }
            }
            "Environment" = @{
                select = @{ name = $envValue }
            }
            "Reported Date" = @{
                date = @{ start = $reportedDate }
            }
            "Root Cause" = @{
                rich_text = @(
                    @{ text = @{ content = (Truncate-Text $secRootCause 1800) } }
                )
            }
            "Fix" = @{
                rich_text = @(
                    @{ text = @{ content = (Truncate-Text $secFix 1800) } }
                )
            }
            "Regression Test" = @{
                checkbox = [bool]$hasRegressionTest
            }
            "Next Step" = @{
                rich_text = @(
                    @{ text = @{ content = $nextStepText } }
                )
            }
        }

        if ($existingNotion) {
            $notionPageId = $existingNotion.id
            $notionPatchUrl = "https://api.notion.com/v1/pages/$notionPageId"
            $updatedNotion = Invoke-NotionJson $notionPatchUrl "Patch" @{
                properties = $propertiesPayload
            }
            Write-Output "[$ticketId] Updated Notion Bug Page: $($updatedNotion.url)"
        } else {
            $bugEmoji = [char]::ConvertFromUtf32(0x1F41E)
            $childrenBlocks = @(
                @{
                    object = "block"
                    type   = "callout"
                    callout = @{
                        icon = @{ type = "emoji"; emoji = $linkEmoji }
                        rich_text = @(
                            @{ type = "text"; text = @{ content = "Project: $ProjectName`nGitHub Issue #$ghIssueNumber : " } },
                            @{ type = "text"; text = @{ content = $ghIssueUrl; link = @{ url = $ghIssueUrl } } },
                            @{ type = "text"; text = @{ content = "`nLocal File: $relPath" } }
                        )
                    }
                },
                @{
                    object = "block"
                    type   = "heading_2"
                    heading_2 = @{
                        rich_text = @(@{ type = "text"; text = @{ content = "1. Basic Info & Technical Scope" } })
                    }
                },
                @{
                    object = "block"
                    type   = "paragraph"
                    paragraph = @{
                        rich_text = @(@{ type = "text"; text = @{ content = (Truncate-Text ($sec1 + "`n`n" + $secScope)) } })
                    }
                },
                @{
                    object = "block"
                    type   = "heading_2"
                    heading_2 = @{
                        rich_text = @(@{ type = "text"; text = @{ content = "2. Reproduction Steps" } })
                    }
                },
                @{
                    object = "block"
                    type   = "paragraph"
                    paragraph = @{
                        rich_text = @(@{ type = "text"; text = @{ content = (Truncate-Text $secRepro) } })
                    }
                },
                @{
                    object = "block"
                    type   = "heading_2"
                    heading_2 = @{
                        rich_text = @(@{ type = "text"; text = @{ content = "3. Root Cause Analysis" } })
                    }
                },
                @{
                    object = "block"
                    type   = "paragraph"
                    paragraph = @{
                        rich_text = @(@{ type = "text"; text = @{ content = (Truncate-Text $secRootCause) } })
                    }
                },
                @{
                    object = "block"
                    type   = "heading_2"
                    heading_2 = @{
                        rich_text = @(@{ type = "text"; text = @{ content = "4. Solution & Fix" } })
                    }
                },
                @{
                    object = "block"
                    type   = "paragraph"
                    paragraph = @{
                        rich_text = @(@{ type = "text"; text = @{ content = (Truncate-Text $secFix) } })
                    }
                },
                @{
                    object = "block"
                    type   = "heading_2"
                    heading_2 = @{
                        rich_text = @(@{ type = "text"; text = @{ content = "5. Verification & Regression Tests" } })
                    }
                },
                @{
                    object = "block"
                    type   = "paragraph"
                    paragraph = @{
                        rich_text = @(@{ type = "text"; text = @{ content = (Truncate-Text $secTests) } })
                    }
                },
                @{
                    object = "block"
                    type   = "heading_2"
                    heading_2 = @{
                        rich_text = @(@{ type = "text"; text = @{ content = "6. Impact & Status Log" } })
                    }
                },
                @{
                    object = "block"
                    type   = "paragraph"
                    paragraph = @{
                        rich_text = @(@{ type = "text"; text = @{ content = (Truncate-Text ($secImpact + "`n`n" + $secLog)) } })
                    }
                }
            )

            $createPagePayload = @{
                parent     = @{ database_id = $targetDbId }
                icon       = @{ type = "emoji"; emoji = $bugEmoji }
                properties = $propertiesPayload
                children   = $childrenBlocks
            }
            $notionCreateUrl = "https://api.notion.com/v1/pages"
            $createdNotion = Invoke-NotionJson $notionCreateUrl "Post" $createPagePayload
            Write-Output "[$ticketId] Created Notion Bug Page: $($createdNotion.url)"
        }
    }
}

$issuesDir = Join-Path $RepoRoot "MO2\issues"
$delegDir = Join-Path $RepoRoot "MO2\delegation"

if ($All) {
    $files = @()
    if (Test-Path $issuesDir) {
        $files += Get-ChildItem -Path $issuesDir -Filter "*.md" | Where-Object { $_.Name -match "^MO2-(BUG|FEAT)-\d+" }
    }
    if (Test-Path $delegDir) {
        $files += Get-ChildItem -Path $delegDir -Filter "*.md" | Where-Object { $_.Name -match "^MO2-DELEG-\d+" }
    }
    $files = $files | Sort-Object Name
    if ($files.Count -eq 0) {
        Write-Output "No MO2-BUG / MO2-FEAT / MO2-DELEG ticket files found to sync."
        return
    }
    foreach ($f in $files) {
        Sync-SingleTicketFile $f.FullName
    }
} elseif ($File) {
    if (-not [System.IO.Path]::IsPathRooted($File)) {
        $File = Join-Path $RepoRoot $File
    }
    Sync-SingleTicketFile $File
} else {
    throw "Usage: .\MO2\scripts\sync_to_github_and_notion.ps1 -File 'MO2/issues/MO2-BUG-0001-xxx.md' OR -All"
}
