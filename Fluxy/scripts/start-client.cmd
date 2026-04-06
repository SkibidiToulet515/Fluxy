@echo off
set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"
cd /d "%~dp0..\client"
"%NODE_EXE%" .\node_modules\react-scripts\bin\react-scripts.js start