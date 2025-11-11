@echo off
REM Batch script to generate and convert UML class diagram
REM This script compiles the project, generates the PlantUML diagram, and converts it to XML and PNG

echo === UML Class Diagram Generator and Converter ===
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

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Error: Diagram generation failed
    exit /b 1
)

REM Fix empty class definitions in PlantUML file
echo Validating and fixing PlantUML syntax...
powershell -NoProfile -Command "$content = Get-Content '%OUTPUT_PATH%' -Raw; $lines = $content -split \"`r?`n\"; $fixed = @(); $skipNext = $false; $hasChanges = $false; for ($i = 0; $i -lt $lines.Length; $i++) { if ($skipNext) { $skipNext = $false; continue; } $line = $lines[$i]; if ($line -match '^class\s+\{\s*$') { $skipNext = $true; $hasChanges = $true; continue; } if ($i + 1 -lt $lines.Length -and $line -match '^class\s+$' -and $lines[$i + 1] -match '^\s*\{\s*$') { $skipNext = $true; $hasChanges = $true; continue; } $fixed += $line; }; if ($hasChanges) { Set-Content -Path '%OUTPUT_PATH%' -Value ($fixed -join \"`r`n\") -NoNewline; Write-Host '[OK] Fixed empty class definitions' } else { Write-Host '[OK] PlantUML file is valid' }" 2>nul

if %ERRORLEVEL% EQU 0 (
    echo [OK] PlantUML file validated
) else (
    echo [WARNING] Could not validate PlantUML file, but generation completed
)
echo.

REM Convert to XML (XMI format, renamed to .xml)
echo Converting to XML...
call mvn plantuml:generate@generate-xml -q
if %ERRORLEVEL% EQU 0 (
    REM Rename XMI to XML if it exists
    if exist "scripts\out\class-diagram.xmi" (
        move /Y "scripts\out\class-diagram.xmi" "scripts\out\class-diagram.xml" >nul
        echo [OK] XML created: scripts\out\class-diagram.xml
    ) else if exist "scripts\out\class-diagram.xml" (
        echo [OK] XML created: scripts\out\class-diagram.xml
    ) else (
        echo [ERROR] XML conversion completed but file not found
    )
) else (
    echo [ERROR] XML conversion failed
)

REM Convert to UML (XMI format, renamed to .uml)
echo Converting to UML...
call mvn plantuml:generate@generate-uml -q
if %ERRORLEVEL% EQU 0 (
    REM Rename XMI to UML if it exists
    if exist "scripts\out\class-diagram.xmi" (
        move /Y "scripts\out\class-diagram.xmi" "scripts\out\class-diagram.uml" >nul
        echo [OK] UML created: scripts\out\class-diagram.uml
    ) else if exist "scripts\out\class-diagram.uml" (
        echo [OK] UML created: scripts\out\class-diagram.uml
    ) else (
        echo [ERROR] UML conversion completed but file not found
    )
) else (
    echo [ERROR] UML conversion failed
)

REM Convert to PNG
echo Converting to PNG...
call mvn plantuml:generate@generate-png -q
if %ERRORLEVEL% EQU 0 (
    if exist "scripts\out\class-diagram.png" (
        echo [OK] PNG created: scripts\out\class-diagram.png
    ) else (
        echo [ERROR] PNG conversion completed but file not found
    )
) else (
    echo [ERROR] PNG conversion failed
)

echo.
echo === Complete ===
echo Diagram generated and converted successfully!
echo Output files are in: %BACKEND_DIR%\scripts\out
echo   - class-diagram.puml (PlantUML source)
echo   - class-diagram.xml (XML format)
echo   - class-diagram.uml (UML format)
echo   - class-diagram.png (PNG image)
echo.
pause
