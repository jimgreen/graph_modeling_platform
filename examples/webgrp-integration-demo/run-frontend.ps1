$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "frontend")

if (-not (Test-Path "node_modules")) {
  pnpm install
}

pnpm dev --host 127.0.0.1 --port 4173
