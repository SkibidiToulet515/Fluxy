@echo off
set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"
cd /d "%~dp0..\client"
if not defined PORT set "PORT=3000"

if defined CODESPACE_NAME if defined GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN (
  set "WDS_SOCKET_HOST=%CODESPACE_NAME%-%PORT%.%GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN%"
  set "WDS_SOCKET_PORT=443"
  set "WDS_SOCKET_PROTOCOL=wss"
)

"%NODE_EXE%" .\node_modules\react-scripts\bin\react-scripts.js start
