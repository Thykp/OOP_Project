@echo off
REM Batch script to generate UML class diagram
REM This script compiles the project and runs the PlantUML diagram generator

echo === UML Class Diagram Generator ===
echo.

REM Get the script directory and navigate to backend root
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%\.."
set BACKEND_DIR=%CD%

echo Working directory: %BACKEND_DIR%
echo.

REM Check if Maven is available
where mvn >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Maven (mvn) is not found in PATH
    echo Please install Maven or add it to your PATH
    exit /b 1
)

REM Compile the project
echo Compiling project...
call mvn clean compile -q
if %ERRORLEVEL% NEQ 0 (
    echo Error: Compilation failed
    exit /b 1
)
echo [OK] Compilation successful
echo.

REM Ensure output directory exists (relative to backend directory)
set OUTPUT_DIR=scripts\out
if not exist "%OUTPUT_DIR%" (
    mkdir "%OUTPUT_DIR%"
    echo Created output directory: %OUTPUT_DIR%
)

REM Run the diagram generator
echo Generating class diagram...
REM Use relative path with forward slashes (works on Windows for Java/Maven)
set OUTPUT_PATH=scripts/out/class-diagram.puml

call mvn exec:java -Dexec.mainClass=com.is442.backend.util.PlantUmlDiagramGenerator -Dexec.args=%OUTPUT_PATH% -q

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] Diagram generated successfully!
    echo   Output file: %BACKEND_DIR%\%OUTPUT_PATH%
    echo.
    echo You can:
    echo   - View it online at: http://www.plantuml.com/plantuml
    echo   - Use VS Code PlantUML extension to preview
    echo   - Convert to image using: plantuml %OUTPUT_PATH%
) else (
    echo.
    echo Error: Diagram generation failed
    exit /b 1
)

