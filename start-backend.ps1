<#
.SYNOPSIS
    Sobe todos os backends (api.py) do projeto de uma vez, cada um na sua porta.
    Opcionalmente sobe tambem o frontend (Vite, porta 3000).

.DESCRIPTION
    Em vez de entrar em cada pasta e rodar o api.py manualmente, este script
    inicia os 6 servicos FastAPI usando o venv da raiz do projeto.

    Por padrao cada servico abre em uma janela separada (para logs isolados).
    Use -Jobs para rodar tudo em background na mesma janela.
    Use -Frontend para subir tambem o frontend (npm run dev na porta 3000).

.EXAMPLE
    .\start-backend.ps1
    Abre uma janela por backend.

.EXAMPLE
    .\start-backend.ps1 -Frontend
    Sobe os backends + o frontend, cada um em uma janela.

.EXAMPLE
    .\start-backend.ps1 -Frontend -Jobs
    Roda backends e frontend em background; use 'Get-Job | Receive-Job' para
    ver logs e 'Get-Job | Stop-Job; Get-Job | Remove-Job' para parar.
#>
param(
    [switch]$Jobs,
    [switch]$Frontend
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$python = Join-Path $root "venv\Scripts\python.exe"

if (-not (Test-Path $python)) {
    Write-Error "Python do venv nao encontrado em: $python. Crie o venv e instale as dependencias primeiro."
    exit 1
}

# Mapa de servicos: pasta | modulo uvicorn | porta
$services = @(
    @{ Name = "rpa";                 App = "api:app";      Port = 8000 },
    @{ Name = "quantica";            App = "api:app";      Port = 8001 },
    @{ Name = "visao-computacional"; App = "api:app";      Port = 8002 },
    @{ Name = "genai";               App = "api:app";      Port = 8003 },
    @{ Name = "neuromorfica";        App = "api:app";      Port = 8004 },
    @{ Name = "pln";                 App = "api.main:app"; Port = 8005 }
)

Write-Host "Subindo backends a partir de: $root" -ForegroundColor Cyan

foreach ($svc in $services) {
    $dir = Join-Path $root "backend\$($svc.Name)"
    if (-not (Test-Path $dir)) {
        Write-Warning "Pasta nao encontrada, pulando: $dir"
        continue
    }

    $args = @("-m", "uvicorn", $svc.App, "--host", "0.0.0.0", "--port", "$($svc.Port)", "--reload")

    if ($Jobs) {
        Start-Job -Name $svc.Name -ScriptBlock {
            param($py, $wd, $a)
            Set-Location $wd
            & $py @a
        } -ArgumentList $python, $dir, $args | Out-Null
        Write-Host ("  [job ] {0,-20} -> http://localhost:{1}" -f $svc.Name, $svc.Port) -ForegroundColor Green
    }
    else {
        $inner = "Set-Location '$dir'; & '$python' $($args -join ' ')"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", $inner | Out-Null
        Write-Host ("  [win ] {0,-20} -> http://localhost:{1}" -f $svc.Name, $svc.Port) -ForegroundColor Green
    }
}

# ── Frontend (opcional) ──────────────────────────────────────
if ($Frontend) {
    $frontDir = Join-Path $root "frontend"
    if (-not (Test-Path (Join-Path $frontDir "package.json"))) {
        Write-Warning "package.json nao encontrado em $frontDir; frontend ignorado."
    }
    elseif (-not (Test-Path (Join-Path $frontDir "node_modules"))) {
        Write-Warning "node_modules ausente em $frontDir. Rode 'npm install' la antes de usar -Frontend."
    }
    else {
        if ($Jobs) {
            Start-Job -Name "frontend" -ScriptBlock {
                param($wd)
                Set-Location $wd
                cmd /c "npm run dev"
            } -ArgumentList $frontDir | Out-Null
            Write-Host ("  [job ] {0,-20} -> http://localhost:3000" -f "frontend") -ForegroundColor Green
        }
        else {
            $inner = "Set-Location '$frontDir'; npm run dev"
            Start-Process powershell -ArgumentList "-NoExit", "-Command", $inner | Out-Null
            Write-Host ("  [win ] {0,-20} -> http://localhost:3000" -f "frontend") -ForegroundColor Green
        }
    }
}

Write-Host ""
if ($Jobs) {
    Write-Host "Servicos rodando em background." -ForegroundColor Yellow
    Write-Host "  Ver logs:  Get-Job | Receive-Job -Keep" -ForegroundColor DarkGray
    Write-Host "  Parar:     Get-Job | Stop-Job; Get-Job | Remove-Job" -ForegroundColor DarkGray
}
else {
    Write-Host "Cada servico abriu em uma janela. Feche a janela para parar o servico." -ForegroundColor Yellow
}
