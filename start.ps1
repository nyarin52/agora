# Agora one-click dev startup
# Starts backend (Go) and frontend (Vite), Ctrl+C to stop both

$ErrorActionPreference = "Stop"

Write-Host "`n  Agora Dev Server" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor DarkGray

# -- Prerequisites --
if (-not (Get-Command go -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Go not found. Install Go 1.23+" -ForegroundColor Red; exit 1
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js not found. Install Node.js 20+" -ForegroundColor Red; exit 1
}

# -- Auto-fix GOROOT if misconfigured --
$realGoroot = (Get-Command go).Source | Split-Path -Parent | Split-Path -Parent
if (-not (Test-Path "$realGoroot\src")) {
    Write-Host "[WARN] Cannot detect Go installation from: $realGoroot" -ForegroundColor Yellow
} elseif ($env:GOROOT -ne $realGoroot) {
    Write-Host "[go] GOROOT mismatch: env=$($env:GOROOT) actual=$realGoroot" -ForegroundColor Yellow
    Write-Host "[go] Auto-correcting GOROOT to $realGoroot" -ForegroundColor Green
    $env:GOROOT = $realGoroot
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# -- Install frontend deps --
if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "[npm] Installing frontend dependencies..." -ForegroundColor Yellow
    Push-Location frontend
    npm install
    Pop-Location
    Write-Host "[npm] Done`n" -ForegroundColor Green
}

# -- Ensure DB dir --
if (-not (Test-Path "agora-db")) {
    New-Item -ItemType Directory -Path "agora-db" | Out-Null
}

# -- Start backend --
Write-Host "[backend] Starting Go backend (http://localhost:8080)..." -ForegroundColor Yellow
$backendJob = Start-Job -Name "agora-backend" -ScriptBlock {
    $env:GOROOT = $using:realGoroot
    Set-Location $using:scriptDir\backend
    go run ./cmd/server 2>&1 | ForEach-Object {
        Write-Output "[backend] $_"
    }
}
Write-Host "[backend] Started (job: $($backendJob.Id))" -ForegroundColor Green

# -- Cleanup handler --
function Cleanup {
    Write-Host "`n[stop] Shutting down..." -ForegroundColor Yellow
    if ($frontendJob) {
        Stop-Job -Name "agora-frontend" -ErrorAction SilentlyContinue
        Remove-Job -Name "agora-frontend" -ErrorAction SilentlyContinue
    }
    if ($backendJob) {
        Stop-Job -Name "agora-backend" -ErrorAction SilentlyContinue
        Remove-Job -Name "agora-backend" -ErrorAction SilentlyContinue
    }
    Get-Job | Remove-Job -Force -ErrorAction SilentlyContinue
    Write-Host "[stop] All stopped" -ForegroundColor Cyan
}

# -- Wait for backend ready --
Write-Host "[backend] Waiting for health check..." -ForegroundColor DarkGray
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:8080/api/health" -UseBasicParsing -TimeoutSec 1
        $ready = $true
        break
    }
    catch {}
    Start-Sleep -Milliseconds 500
}
if (-not $ready) {
    Write-Host "[ERROR] Backend startup timed out" -ForegroundColor Red
    Write-Host "[backend] Last output:" -ForegroundColor Red
    Receive-Job -Name "agora-backend" -ErrorAction SilentlyContinue | Write-Host
    Remove-Job -Name "agora-backend" -Force
    exit 1
}
Write-Host "[backend] Ready`n" -ForegroundColor Green

# -- Start frontend --
Write-Host "[frontend] Starting Vite (http://localhost:5173)..." -ForegroundColor Yellow
$frontendJob = Start-Job -Name "agora-frontend" -ScriptBlock {
    Set-Location $using:scriptDir\frontend
    npm run dev 2>&1 | ForEach-Object {
        Write-Output "[frontend] $_"
    }
}
Write-Host "[frontend] Started (job: $($frontendJob.Id))`n" -ForegroundColor Green

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Agora is running!" -ForegroundColor Cyan
Write-Host "  Frontend : http://localhost:5173" -ForegroundColor White
Write-Host "  Backend  : http://localhost:8080" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Press Ctrl+C to stop`n" -ForegroundColor DarkGray

# -- Tail logs until Ctrl+C --
try {
    while ($true) {
        if ($backendJob.State -eq "Failed") {
            Write-Host "`n[ERROR] Backend crashed" -ForegroundColor Red
            Receive-Job -Name "agora-backend" -ErrorAction SilentlyContinue
            break
        }
        if ($frontendJob.State -eq "Failed") {
            Write-Host "`n[ERROR] Frontend crashed" -ForegroundColor Red
            Receive-Job -Name "agora-frontend" -ErrorAction SilentlyContinue
            break
        }

        $backOut = Receive-Job -Name "agora-backend" -ErrorAction SilentlyContinue
        if ($backOut) { Write-Host ($backOut -join "`n") }

        $frontOut = Receive-Job -Name "agora-frontend" -ErrorAction SilentlyContinue
        if ($frontOut) { Write-Host ($frontOut -join "`n") }

        Start-Sleep -Seconds 1
    }
}
finally {
    Cleanup
}
