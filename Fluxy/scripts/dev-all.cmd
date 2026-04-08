@echo off
set "ROOT=%~dp0.."

start "Fluxy Server" cmd /k "cd /d \"%ROOT%\" && npm run dev:server"
start "Fluxy Client" cmd /k "cd /d \"%ROOT%\" && npm run dev:client"
