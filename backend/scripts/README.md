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

1. **generate-diagram.ps1** - PowerShell script to run the generator (Windows)
2. **generate-diagram.bat** - Batch script to run the generator (Windows)

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
3. Generate the diagram in `scripts/out/class-diagram.puml`

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

## Converting to XML/Images

### Option 1: PlantUML Online

1. Visit http://www.plantuml.com/plantuml
2. Paste the contents of `class-diagram.puml`
3. Export as XML or image format

### Option 2: PlantUML Command Line

1. Install PlantUML: https://plantuml.com/starting
2. Navigate to the output directory:
    ```bash
    cd backend/scripts/out
    ```
3. Convert to XML:
    ```bash
    plantuml -txmi class-diagram.puml
    ```
4. Convert to image:
    ```bash
    plantuml class-diagram.puml
    ```

### Option 3: VS Code Extension

1. Install "PlantUML" extension in VS Code
2. Open `backend/scripts/out/class-diagram.puml`
3. Right-click and select "Export Current Diagram" → Choose format (XML, PNG, SVG, etc.)

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

## Notes

-   The generator uses `BackendClassScanner` to automatically discover all classes in the backend package
-   Classes are scanned from compiled bytecode (preferred) or source files (fallback)
-   Fields annotated with `@Transient` are excluded
-   Methods are limited to key ones (getters, setters, constructors) to keep diagram readable
-   Output is automatically saved to `scripts/out/class-diagram.puml`
-   The output directory is created automatically if it doesn't exist
