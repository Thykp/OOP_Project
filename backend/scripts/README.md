# UML Diagram Generator

This tool automatically generates UML class diagrams for the OOP project backend by scanning all classes in the backend package.

## Architecture

### Backend Utilities (`backend/src/main/java/com/is442/backend/util/`)

1. **BackendClassScanner.java** - Utility class that dynamically discovers all classes in the backend package

    - Scans from compiled classes (classpath)
    - Falls back to scanning source files
    - Supports both file system and JAR file scanning

2. **PlantUmlDiagramGenerator.java** - Main generator class that creates PlantUML format diagrams

    - Uses `BackendClassScanner` to automatically discover all backend classes
    - Generates comprehensive class diagrams with relationships
    - Outputs to `scripts/out` directory by default

### Scripts (`backend/scripts/`)

1. **generate-diagram.ps1** - PowerShell script to generate and convert the diagram (Windows)
2. **generate-diagram.bat** - Batch script to generate and convert the diagram (Windows)

Both scripts automatically generate the PlantUML diagram and convert it to XML and PNG formats in one step.

## Usage

### Quick Start (Windows)

Simply run one of these scripts from the `backend/scripts` directory:

```powershell
# PowerShell
cd backend/scripts
.\generate-diagram.ps1

# Or Batch
cd backend/scripts
generate-diagram.bat
```

The scripts will:

1. Compile the project automatically
2. Scan all backend classes
3. Generate the PlantUML diagram in `scripts/out/class-diagram.puml`
4. Validate and fix any syntax issues
5. Convert the diagram to XML format (`class-diagram.xml`)
6. Convert the diagram to UML format (`class-diagram.uml`)
7. Convert the diagram to PNG format (`class-diagram.png`)

All output files will be saved in `scripts/out/` directory.

### Manual Execution

1. **Compile the project:**

    ```bash
    cd backend
    mvn clean compile
    ```

2. **Run the generator:**

    ```bash
    mvn exec:java -Dexec.mainClass=com.is442.backend.util.PlantUmlDiagramGenerator -Dexec.args="scripts/out/class-diagram.puml"
    ```

    Or using Java directly:

    ```bash
    java -cp target/classes com.is442.backend.util.PlantUmlDiagramGenerator scripts/out/class-diagram.puml
    ```

## Output

The generator creates a **PlantUML** file in `scripts/out/class-diagram.puml` that contains:

-   All backend classes (model, controller, service, repository, dto, etc.) with their fields and methods
-   Inheritance relationships
-   Association relationships
-   Entity annotations and stereotypes

## Output Formats

The scripts automatically generate the following files:

-   `class-diagram.puml` - PlantUML source file
-   `class-diagram.xml` - XML format (UML XMI standard, renamed from .xmi)
-   `class-diagram.uml` - UML format (UML XMI standard, renamed from .xmi)
-   `class-diagram.png` - PNG raster image

All files are saved in the `scripts/out/` directory.

## Converting to Other Formats (Manual)

If you need additional formats beyond XML and PNG, you can use Maven directly:

### Option 1: Maven Plugin (Manual)

1. **Navigate to backend directory:**

    ```bash
    cd backend
    ```

2. **Convert to various formats using Maven:**

    ```bash
    # XML (already done automatically by the script)
    mvn plantuml:generate@generate-xml

    # UML (already done automatically by the script)
    mvn plantuml:generate@generate-uml

    # PNG (already done automatically by the script)
    mvn plantuml:generate@generate-png
    ```

    **Note:** The generate scripts already convert to XML, UML, and PNG automatically. Use these commands only if you need to regenerate specific formats.

    All output files will be saved in `scripts/out/` directory.

### Option 2: PlantUML Command Line (Alternative)

If you have PlantUML installed separately, you can also use the command line:

1. **Install PlantUML:** https://plantuml.com/starting
2. **Navigate to output directory:**
    ```bash
    cd backend/scripts/out
    ```
3. **Convert to various formats:**

    ```bash
    # PNG (default, raster image)
    plantuml class-diagram.puml

    # SVG (vector, scalable)
    plantuml -tsvg class-diagram.puml

    # PDF (document)
    plantuml -tpdf class-diagram.puml

    # XMI (UML XML format)
    plantuml -txmi class-diagram.puml

    # EPS (Encapsulated PostScript)
    plantuml -teps class-diagram.puml
    ```

### Option 3: PlantUML Online

1. Visit http://www.plantuml.com/plantuml
2. Open `backend/scripts/out/class-diagram.puml` and copy its contents
3. Paste into the online editor
4. Right-click the rendered diagram → "Save image as..." or use export options

### Option 4: VS Code Extension

1. Install "PlantUML" extension in VS Code
2. Open `backend/scripts/out/class-diagram.puml`
3. Right-click in the editor → "Export Current Diagram"
4. Choose format: PNG, SVG, PDF, XMI, etc.

## Generated Diagram Includes

The diagram automatically includes **all classes** in the `com.is442.backend` package:

-   **Model Classes:**

    -   User hierarchy (User, Patient, ClinicStaff, SystemAdministrator)
    -   Clinic hierarchy (Clinic, GpClinic, SpecialistClinic)
    -   Other entities (Doctor, Appointment, TimeSlot, TreatmentNote)

-   **Controller Classes:**

    -   All REST controllers (AppointmentController, AuthController, etc.)

-   **Service Classes:**

    -   All service layer classes

-   **Repository Classes:**

    -   All data access layer classes

-   **DTO Classes:**

    -   All data transfer objects

-   **Relationships:**
    -   Inheritance (extends)
    -   Associations (field references)
    -   Dependencies

## Complete Workflow

Simply run one script to generate and convert the diagram:

```powershell
# PowerShell
cd backend/scripts
.\generate-diagram.ps1

# Or Batch
cd backend/scripts
generate-diagram.bat
```

That's it! You'll have the diagram in all formats (PUML, XML, UML, PNG) in `scripts/out/` directory.

## Maven Plugin Configuration

The project uses the **PlantUML Maven Plugin** (`com.github.jeluard:plantuml-maven-plugin`) configured in `pom.xml`. This plugin:

-   Automatically downloads the required PlantUML library (no manual installation needed)
-   Converts diagrams directly from the Maven build process
-   Outputs all converted files to `scripts/out/` directory

The plugin is configured with execution profiles for XML, UML, and PNG formats, which are automatically run by the generate scripts.

## Notes

-   The generator uses `BackendClassScanner` to automatically discover all classes in the backend package
-   Classes are scanned from compiled bytecode (preferred) or source files (fallback)
-   Fields annotated with `@Transient` are excluded
-   Methods are limited to key ones (getters, setters, constructors) to keep diagram readable
-   Output is automatically saved to `scripts/out/class-diagram.puml`
-   The output directory is created automatically if it doesn't exist
-   Format conversion uses the Maven plugin (no external PlantUML installation required)
-   The generate scripts automatically convert to XML, UML, and PNG formats
