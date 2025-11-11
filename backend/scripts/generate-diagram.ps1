# PowerShell script to generate UML class diagram
# This script compiles the project and runs the PlantUML diagram generator

Write-Host "=== UML Class Diagram Generator ===" -ForegroundColor Cyan
Write-Host ""

# Get the script directory and navigate to backend root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Split-Path -Parent $scriptDir

# Change to backend directory
Set-Location $backendDir
Write-Host "Working directory: $backendDir" -ForegroundColor Gray
Write-Host ""

# Check if Maven is available
$mvnCmd = Get-Command mvn -ErrorAction SilentlyContinue
if (-not $mvnCmd) {
    Write-Host "Error: Maven (mvn) is not found in PATH" -ForegroundColor Red
    Write-Host "Please install Maven or add it to your PATH" -ForegroundColor Yellow
    exit 1
}

# Compile the project
Write-Host "Compiling project..." -ForegroundColor Yellow
& mvn clean compile -q
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Compilation failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Compilation successful" -ForegroundColor Green
Write-Host ""

# Ensure output directory exists (relative to backend directory)
$outputDir = "scripts\out"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    Write-Host "Created output directory: $outputDir" -ForegroundColor Gray
}

# Run the diagram generator
Write-Host "Generating class diagram..." -ForegroundColor Yellow
# Use relative path with forward slashes (works on Windows for Java/Maven)
$outputPath = "scripts/out/class-diagram.puml"

# Use argument array to properly pass Maven parameters
$mavenArgs = @(
    "exec:java",
    "-Dexec.mainClass=com.is442.backend.util.PlantUmlDiagramGenerator",
    "-Dexec.args=$outputPath",
    "-q"
)

& mvn $mavenArgs

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ Diagram generated successfully!" -ForegroundColor Green
    $fullPath = (Resolve-Path $outputPath -ErrorAction SilentlyContinue).Path
    if ($fullPath) {
        Write-Host "  Output file: $fullPath" -ForegroundColor Gray
    } else {
        Write-Host "  Output file: $outputPath" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "You can:" -ForegroundColor Cyan
    Write-Host "  - View it online at: http://www.plantuml.com/plantuml" -ForegroundColor Gray
    Write-Host "  - Use VS Code PlantUML extension to preview" -ForegroundColor Gray
    Write-Host "  - Convert to image using: plantuml $outputPath" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "Error: Diagram generation failed" -ForegroundColor Red
    exit 1
}

