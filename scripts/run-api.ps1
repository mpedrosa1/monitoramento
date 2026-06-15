# Executa a API Go a partir de um caminho ASCII (workaround Go 1.26 + pastas com acento no OneDrive).
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$src = Join-Path $root "services\api"
$build = Join-Path $env:LOCALAPPDATA "mmrtec-api-build"
$envFile = Join-Path $root ".env"

function Get-PortFromEnv([string]$path) {
  if (-not (Test-Path $path)) { return "8081" }
  foreach ($line in Get-Content $path) {
    if ($line -match '^\s*PORT\s*=\s*(\d+)\s*$') { return $Matches[1] }
  }
  return "8081"
}

function Stop-MmrtecApiProcesses([string]$port) {
  # Encerra instâncias anteriores desta API (go run / api.exe do build dir)
  Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object {
      $_.Name -in @("go.exe", "api.exe", "__debug_bin.exe") -and (
        $_.CommandLine -like "*mmrtec-api-build*" -or
        $_.CommandLine -like "*monitoramento/api/cmd/api*"
      )
    } |
    ForEach-Object {
      Write-Host "Encerrando processo anterior (PID $($_.ProcessId))..."
      Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }

  Start-Sleep -Milliseconds 500

  $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if ($conn) {
    $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
    Write-Host "Porta $port em uso pelo PID $($conn.OwningProcess) ($($proc.ProcessName))."
    if ($proc -and $proc.ProcessName -in @("go", "api", "__debug_bin")) {
      Write-Host "Encerrando..."
      Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
      Start-Sleep -Milliseconds 500
    } else {
      Write-Host "AVISO: outro programa usa a porta $port. Altere PORT no .env ou encerre esse processo."
    }
  }
}

$port = Get-PortFromEnv $envFile
Stop-MmrtecApiProcesses $port

Write-Host "Sincronizando API para $build ..."
New-Item -ItemType Directory -Force -Path $build | Out-Null
robocopy $src $build /MIR /XD vendor /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy falhou com código $LASTEXITCODE" }

if (Test-Path $envFile) {
  Copy-Item $envFile (Join-Path $build ".env") -Force
}

$firebaseCandidates = @(
  (Join-Path $root "firebase-service-account.json"),
  (Join-Path $src "firebase-service-account.json")
)
foreach ($firebase in $firebaseCandidates) {
  if (Test-Path $firebase) {
    Copy-Item $firebase (Join-Path $build "firebase-service-account.json") -Force
    Write-Host "Firebase credentials: $firebase"
    break
  }
}

function Remove-Utf8Bom([string]$path) {
  if (-not (Test-Path $path)) { return }
  $bytes = [System.IO.File]::ReadAllBytes($path)
  if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    [System.IO.File]::WriteAllBytes($path, $bytes[3..($bytes.Length - 1)])
  }
}
Remove-Utf8Bom (Join-Path $build "go.mod")

$antenasDb = Join-Path $root "base\antenas.db"
if (Test-Path $antenasDb) {
  $env:ANTENAS_DB_PATH = $antenasDb
  Write-Host "Antenas DB: $antenasDb"
} else {
  Write-Host "AVISO: base\antenas.db não encontrado — mapa de antenas ficará indisponível."
}

Set-Location $build
$env:GOFLAGS = "-mod=mod"
Write-Host "Atualizando módulos Go..."
go mod tidy

Write-Host "Iniciando API na porta $port..."
go run ./cmd/api
