$root = Split-Path -Parent $PSScriptRoot
$baseUrl = 'https://maabra.github.io/matejs-angels-example'
$utf8 = New-Object System.Text.UTF8Encoding($false)

$pagePairs = @{
  'en/about.html' = 'hr/o-nama.html'; 'en/care.html' = 'hr/briga.html'
  'en/chronology.html' = 'hr/kronologija.html'; 'en/contact.html' = 'hr/kontakt.html'
  'en/faq.html' = 'hr/faq.html'; 'en/gallery.html' = 'hr/galerija.html'
  'en/litters.html' = 'hr/legla.html'; 'en/our-dogs.html' = 'hr/nasi-psi.html'
  'en/news.html' = 'hr/vijesti.html'; 'en/news-archie-grand-prvak-hrvatske.html' = 'hr/vijesti-archie-grand-prvak-hrvatske.html'
  'en/news-litter-h.html' = 'hr/vijesti-leglo-h.html'; 'en/news-pomeranians.html' = 'hr/vijesti-pomeranci.html'
  'en/news-wendy.html' = 'hr/vijesti-wendy.html'
}

foreach ($letter in @('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h')) { $pagePairs["en/litter-$letter.html"] = "hr/leglo-$letter.html" }
Get-ChildItem (Join-Path $root 'en/dogs') -Filter '*.html' | ForEach-Object {
  $pagePairs["en/dogs/$($_.Name)"] = "hr/psi/$($_.Name)"
}

$reversePairs = @{}
foreach ($englishPage in $pagePairs.Keys) { $reversePairs[$pagePairs[$englishPage]] = $englishPage }

function Get-Url([string]$relativePath) {
  return "$baseUrl/$($relativePath.Replace('\', '/'))"
}

Get-ChildItem $root -Filter '*.html' -File -Recurse | ForEach-Object {
  $file = $_
  $relativePath = $file.FullName.Substring($root.Length).TrimStart('\').Replace('\', '/')
  $html = [System.IO.File]::ReadAllText($file.FullName)
  $url = Get-Url $relativePath
  $alternateMetadata = ''

  if ($pagePairs.ContainsKey($relativePath)) {
    $partnerPath = $pagePairs[$relativePath]
    $alternateMetadata += "  <link rel=`"alternate`" hreflang=`"en`" href=`"$(Get-Url $relativePath)`">`r`n"
    $alternateMetadata += "  <link rel=`"alternate`" hreflang=`"hr`" href=`"$(Get-Url $partnerPath)`">`r`n"
    $alternateMetadata += "  <link rel=`"alternate`" hreflang=`"x-default`" href=`"$baseUrl/index.html`">`r`n"
  } elseif ($reversePairs.ContainsKey($relativePath)) {
    $partnerPath = $reversePairs[$relativePath]
    $alternateMetadata += "  <link rel=`"alternate`" hreflang=`"en`" href=`"$(Get-Url $partnerPath)`">`r`n"
    $alternateMetadata += "  <link rel=`"alternate`" hreflang=`"hr`" href=`"$(Get-Url $relativePath)`">`r`n"
    $alternateMetadata += "  <link rel=`"alternate`" hreflang=`"x-default`" href=`"$baseUrl/index.html`">`r`n"
  }

  if ($html -notmatch '(?i)<link\s+rel=["'']canonical["'']') {
    $canonicalMetadata = "  <link rel=`"canonical`" href=`"$url`">`r`n"
    $html = $html -replace '(?i)(<meta\s+name=["'']viewport["''][^>]*>\s*)', "`$1$canonicalMetadata"
  }

  if ($alternateMetadata -and $html -notmatch '(?i)hreflang=["'']en["'']') {
    $html = $html -replace '(?i)(<link\s+rel=["'']canonical["''][^>]*>\s*)', "`$1$alternateMetadata"
  }

  if ($html -notmatch '(?i)<meta\s+name=["'']description["'']' -or $html -match '(?i)<meta\s+name=["'']description["'']\s+content=["'']Discover ') {
    $titleMatch = [regex]::Match($html, '(?is)<title>(.*?)</title>')
    if ($titleMatch.Success) {
      $title = [System.Net.WebUtility]::HtmlDecode($titleMatch.Groups[1].Value).Trim()
      $description = "$title. Matej's Angels is a Cavalier King Charles Spaniel and Pomeranian kennel in Premantura, Croatia."
      $description = [System.Security.SecurityElement]::Escape($description)
      $html = $html -replace '(?i)(<title>.*?</title>\s*)', "`$1  <meta name=`"description`" content=`"$description`">`r`n"
    }
  }

  [System.IO.File]::WriteAllText($file.FullName, $html, $utf8)
}

$robots = @(
  'User-agent: *'
  'Allow: /'
  ''
  "Sitemap: $baseUrl/sitemap.xml"
) -join "`r`n"
[System.IO.File]::WriteAllText((Join-Path $root 'robots.txt'), $robots, $utf8)

$urls = Get-ChildItem $root -Filter '*.html' -File -Recurse | ForEach-Object {
  $relativePath = $_.FullName.Substring($root.Length).TrimStart('\').Replace('\', '/')
  "  <url><loc>$(Get-Url $relativePath)</loc></url>"
}
$sitemap = @(
  '<?xml version="1.0" encoding="UTF-8"?>'
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
  $urls
  '</urlset>'
) -join "`r`n"
[System.IO.File]::WriteAllText((Join-Path $root 'sitemap.xml'), $sitemap, $utf8)