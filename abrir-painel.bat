@echo off
setlocal

title Turkista CMS - Painel Local

cd /d "%~dp0"

echo.
echo ==========================================
echo          TURKISTA CMS - PAINEL
echo ==========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo ERRO: Node.js nao foi encontrado no PATH.
    echo Instale o Node.js e tente novamente.
    echo.
    pause
    exit /b 1
)

if not exist "painel-produtos\server.js" (
    echo ERRO: painel-produtos\server.js nao foi encontrado.
    echo Verifique se este arquivo esta na raiz do projeto Turkista.
    echo.
    pause
    exit /b 1
)

echo Iniciando o painel local...
echo.
echo Painel:     http://127.0.0.1:3000
echo Publicacao: http://127.0.0.1:3000/publicacao.html
echo.
echo Nao feche esta janela enquanto estiver usando o painel.
echo.

start "" "http://127.0.0.1:3000"

node "painel-produtos\server.js"

echo.
echo O servidor foi encerrado.
pause
endlocal