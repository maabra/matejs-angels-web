python (Join-Path $PSScriptRoot 'generate-seo.py')
if ($LASTEXITCODE -ne 0) { throw 'SEO generation failed' }
