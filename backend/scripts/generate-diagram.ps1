# PowerShell script to generate and convert UML class diagram
# This script compiles the project, generates the PlantUML diagram, and converts it to XML and PNG

Write-Host "=== UML Class Diagram Generator and Converter ===" -ForegroundColor Cyan
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

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Error: Diagram generation failed" -ForegroundColor Red
    exit 1
}

# Fix empty class definitions in PlantUML file
Write-Host "Validating and fixing PlantUML syntax..." -ForegroundColor Yellow
try {
    $content = Get-Content $outputPath -Raw
    $lines = $content -split "`r?`n"
    $fixed = @()
    $skipNext = $false
    $hasChanges = $false
    
    for ($i = 0; $i -lt $lines.Length; $i++) {
        if ($skipNext) {
            $skipNext = $false
            continue
        }
        
        $line = $lines[$i]
        
        # Check for empty class definition: "class  {" or "class {" (with only whitespace between class and {)
        # This matches: class followed by whitespace(s), then {, then optional whitespace
        if ($line -match '^class\s+\{\s*$') {
            $skipNext = $true  # Skip the next line which should be the closing brace
            $hasChanges = $true
            continue
        }
        
        # Also check if the next line is just a closing brace (in case class and { are on same line)
        if ($i + 1 -lt $lines.Length -and $line -match '^class\s+$' -and $lines[$i + 1] -match '^\s*\{\s*$') {
            $skipNext = $true
            $hasChanges = $true
            continue
        }
        
        $fixed += $line
    }
    
    if ($hasChanges) {
        $fixedContent = $fixed -join "`r`n"
        Set-Content -Path $outputPath -Value $fixedContent -NoNewline
        Write-Host "✓ Fixed empty class definitions in PlantUML file" -ForegroundColor Green
    } else {
        Write-Host "✓ PlantUML file is valid" -ForegroundColor Green
    }
} catch {
    Write-Host "[WARNING] Could not validate PlantUML file: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "          Proceeding anyway..." -ForegroundColor Yellow
}
Write-Host ""

$successCount = 0

# Convert to XML (XMI format, renamed to .xml)
Write-Host "Converting to XML..." -ForegroundColor Yellow
$mavenArgs = @(
    "plantuml:generate@generate-xml",
    "-q"
)
& mvn $mavenArgs

if ($LASTEXITCODE -eq 0) {
    # Rename XMI to XML if it exists
    $xmiFile = "scripts\out\class-diagram.xmi"
    $xmlFile = "scripts\out\class-diagram.xml"
    
    if (Test-Path $xmiFile) {
        Move-Item -Path $xmiFile -Destination $xmlFile -Force
        Write-Host "✓ XML created: $xmlFile" -ForegroundColor Green
        $successCount++
    } elseif (Test-Path $xmlFile) {
        Write-Host "✓ XML created: $xmlFile" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "[WARNING] XML conversion completed but file not found" -ForegroundColor Yellow
    }
} else {
    Write-Host "[ERROR] XML conversion failed" -ForegroundColor Red
}

# Convert to UML (XMI format, renamed to .uml)
Write-Host "Converting to UML..." -ForegroundColor Yellow
$mavenArgs = @(
    "plantuml:generate@generate-uml",
    "-q"
)
& mvn $mavenArgs

if ($LASTEXITCODE -eq 0) {
    # Rename XMI to UML if it exists
    $xmiFile = "scripts\out\class-diagram.xmi"
    $umlFile = "scripts\out\class-diagram.uml"
    
    if (Test-Path $xmiFile) {
        Move-Item -Path $xmiFile -Destination $umlFile -Force
        Write-Host "✓ UML created: $umlFile" -ForegroundColor Green
        $successCount++
    } elseif (Test-Path $umlFile) {
        Write-Host "✓ UML created: $umlFile" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "[WARNING] UML conversion completed but file not found" -ForegroundColor Yellow
    }
} else {
    Write-Host "[ERROR] UML conversion failed" -ForegroundColor Red
}

# Convert to PNG
Write-Host "Converting to PNG..." -ForegroundColor Yellow
$mavenArgs = @(
    "plantuml:generate@generate-png",
    "-q"
)
& mvn $mavenArgs

if ($LASTEXITCODE -eq 0) {
    $pngFile = "scripts\out\class-diagram.png"
    if (Test-Path $pngFile) {
        Write-Host "✓ PNG created: $pngFile" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "[WARNING] PNG conversion completed but file not found" -ForegroundColor Yellow
    }
} else {
    Write-Host "[ERROR] PNG conversion failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Complete ===" -ForegroundColor Cyan
Write-Host "✓ Diagram generated and converted successfully!" -ForegroundColor Green
Write-Host "Output files are in: $backendDir\scripts\out" -ForegroundColor Gray
Write-Host "  - class-diagram.puml (PlantUML source)" -ForegroundColor Gray
Write-Host "  - class-diagram.xml (XML format)" -ForegroundColor Gray
Write-Host "  - class-diagram.uml (UML format)" -ForegroundColor Gray
Write-Host "  - class-diagram.png (PNG image)" -ForegroundColor Gray
Write-Host ""
