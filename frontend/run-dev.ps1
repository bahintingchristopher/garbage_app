# Launches the Flutter app against this PC's CURRENT Wi-Fi IP.
# Run from anywhere:  powershell -ExecutionPolicy Bypass -File .\run-dev.ps1
# Params: -Port <int> (default 5000), -Device <id>, -SkipBackendCheck
param(
    [int]$Port = 5000,
    [string]$Device = "",
    [switch]$SkipBackendCheck
)

$ErrorActionPreference = "Stop"

function Test-LocalPort {
    param([int]$TargetPort)
    $client = New-Object Net.Sockets.TcpClient
    try {
        $async = $client.BeginConnect("127.0.0.1", $TargetPort, $null, $null)
        if ($async.AsyncWaitHandle.WaitOne(1500)) {
            $client.EndConnect($async)
            return $true
        }
        return $false
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

# --- 1. Make sure the Express backend is running -----------------------------
if (-not $SkipBackendCheck -and -not (Test-LocalPort -TargetPort $Port)) {
    Write-Host ""
    Write-Host "[X] Nothing is listening on port $Port." -ForegroundColor Red
    Write-Host "    Start the backend first:" -ForegroundColor Yellow
    Write-Host "      cd backend; npm run dev" -ForegroundColor Yellow
    Write-Host "    (or re-run with -SkipBackendCheck)"
    exit 1
}

# --- 2. Auto-detect the current Wi-Fi IPv4 -----------------------------------
$wifiIp = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
        $_.InterfaceAlias -like "Wi-Fi*" -and
        $_.IPAddress -notlike "169.254.*" -and
        $_.IPAddress -ne "127.0.0.1"
    } |
    Select-Object -ExpandProperty IPAddress -First 1

if (-not $wifiIp) {
    Write-Host "[X] No Wi-Fi adapter with a valid IPv4 address found." -ForegroundColor Red
    Write-Host "    Connect this PC to Wi-Fi, then re-run this script."
    exit 1
}

$apiUrl = "http://${wifiIp}:${Port}/api"

Write-Host ""
Write-Host "Wi-Fi IP : $wifiIp"
Write-Host "API URL  : $apiUrl"
Write-Host ""
Write-Host "NOTE: If the phone cannot connect on a NEW network, allow Node.js"
Write-Host "      through Windows Firewall (Private networks)." -ForegroundColor DarkGray
Write-Host ""

# --- 3. Launch Flutter with the injected base URL ----------------------------
$flutterArgs = @("run", "--dart-define=API_BASE_URL=$apiUrl")
if ($Device -ne "") {
    $flutterArgs += @("-d", $Device)
}

Push-Location $PSScriptRoot
try {
    & flutter @flutterArgs
} finally {
    Pop-Location
}

