@echo off
cd /d "%~dp0"
echo.
echo === Painel CTO - Monitoramento FTTH ===
echo.
if not exist node_modules (
  echo Instalando dependencias - so na primeira vez, pode levar 1 minuto...
  call npm.cmd install
)
echo.
echo Iniciando o painel. Abra http://localhost:5173 no navegador.
echo Para encerrar, feche esta janela ou pressione Ctrl+C.
echo.
call npm.cmd run dev
pause
