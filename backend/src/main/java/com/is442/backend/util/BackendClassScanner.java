package com.is442.backend.util;

import java.io.File;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.List;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;

/**
 * Utility class to scan and discover all classes in the backend package.
 * Supports both compiled classes (from classpath) and source files.
 */
public class BackendClassScanner {

    private static final String BASE_PACKAGE = "com.is442.backend";

    /**
     * Scans and returns all classes in the backend package.
     * Tries multiple strategies to find classes.
     * 
     * @return List of all discovered classes
     */
    public static List<Class<?>> scanBackendClasses() {
        List<Class<?>> classes = new ArrayList<>();

        // Strategy 1: Try to scan from compiled classes in classpath
        classes.addAll(scanFromClasspath());

        // Strategy 2: Try to scan from source files
        if (classes.isEmpty()) {
            classes.addAll(scanFromSourceFiles());
        }

        // Strategy 3: Fallback - try to load known classes directly
        if (classes.isEmpty()) {
            classes.addAll(loadKnownClasses());
        }

        return classes;
    }

    /**
     * Scans classes from the classpath (works when project is compiled).
     */
    private static List<Class<?>> scanFromClasspath() {
        List<Class<?>> classes = new ArrayList<>();

        try {
            String packagePath = BASE_PACKAGE.replace('.', '/');
            ClassLoader classLoader = Thread.currentThread().getContextClassLoader();
            Enumeration<URL> resources = classLoader.getResources(packagePath);

            while (resources.hasMoreElements()) {
                URL resource = resources.nextElement();
                String protocol = resource.getProtocol();

                if ("file".equals(protocol)) {
                    // Scanning from file system (compiled classes)
                    File directory = new File(resource.getFile());
                    if (directory.exists()) {
                        scanDirectory(directory, BASE_PACKAGE, classes);
                    }
                } else if ("jar".equals(protocol)) {
                    // Scanning from JAR file
                    String jarPath = resource.getPath().substring(5, resource.getPath().indexOf("!"));
                    scanJar(jarPath, packagePath, classes);
                }
            }
        } catch (Exception e) {
            System.err.println("Warning: Could not scan from classpath: " + e.getMessage());
        }

        return classes;
    }

    /**
     * Scans classes from source files (works when project is not compiled).
     */
    private static List<Class<?>> scanFromSourceFiles() {
        List<Class<?>> classes = new ArrayList<>();

        try {
            // Try to find source directory
            Path sourcePath = Paths.get("src/main/java");
            if (!Files.exists(sourcePath)) {
                // Try alternative path
                sourcePath = Paths.get("backend/src/main/java");
            }

            final Path finalSourcePath = sourcePath; // Make effectively final for lambda
            if (Files.exists(finalSourcePath)) {
                String packagePath = BASE_PACKAGE.replace('.', '/');
                Path packageDir = finalSourcePath.resolve(packagePath);

                if (Files.exists(packageDir)) {
                    Files.walk(packageDir)
                            .filter(Files::isRegularFile)
                            .filter(p -> p.toString().endsWith(".java"))
                            .forEach(p -> {
                                try {
                                    String className = convertPathToClassName(p, finalSourcePath);
                                    Class<?> clazz = Class.forName(className);
                                    if (isValidClass(clazz)) {
                                        classes.add(clazz);
                                    }
                                } catch (Exception e) {
                                    // Skip classes that can't be loaded
                                }
                            });
                }
            }
        } catch (Exception e) {
            System.err.println("Warning: Could not scan from source files: " + e.getMessage());
        }

        return classes;
    }

    /**
     * Converts a file path to a fully qualified class name.
     */
    private static String convertPathToClassName(Path filePath, Path sourceRoot) {
        String path = filePath.toString().replace("\\", "/");
        String sourceRootPath = sourceRoot.toString().replace("\\", "/");

        path = path.replace(sourceRootPath + "/", "")
                .replace(".java", "")
                .replace("/", ".");

        return path;
    }

    /**
     * Scans a directory recursively for class files.
     */
    private static void scanDirectory(File directory, String packageName, List<Class<?>> classes) {
        if (!directory.exists()) {
            return;
        }

        File[] files = directory.listFiles();
        if (files == null) {
            return;
        }

        for (File file : files) {
            if (file.isDirectory()) {
                scanDirectory(file, packageName + "." + file.getName(), classes);
            } else if (file.getName().endsWith(".class")) {
                try {
                    String fileName = file.getName();
                    // Skip module-info.class and other special files
                    if (fileName.equals("module-info.class") || fileName.startsWith("package-info")) {
                        continue;
                    }

                    String className = packageName + "." + fileName.substring(0, fileName.length() - 6);
                    Class<?> clazz = Class.forName(className);

                    // Additional validation: check for empty simple name before adding
                    String simpleName = clazz.getSimpleName();
                    if (simpleName == null || simpleName.trim().isEmpty()) {
                        System.err.println("Warning: Skipping class with empty name: " + className + " (file: "
                                + file.getPath() + ")");
                        continue;
                    }

                    if (isValidClass(clazz)) {
                        classes.add(clazz);
                    }
                } catch (Exception e) {
                    // Skip classes that can't be loaded
                    System.err.println(
                            "Warning: Could not load class from file " + file.getName() + ": " + e.getMessage());
                }
            }
        }
    }

    /**
     * Scans a JAR file for classes.
     */
    private static void scanJar(String jarPath, String packagePath, List<Class<?>> classes) {
        try (JarFile jar = new JarFile(jarPath)) {
            Enumeration<JarEntry> entries = jar.entries();

            while (entries.hasMoreElements()) {
                JarEntry entry = entries.nextElement();
                String name = entry.getName();

                if (name.startsWith(packagePath) && name.endsWith(".class")) {
                    // Skip module-info.class and other special files
                    if (name.endsWith("module-info.class") || name.contains("package-info")) {
                        continue;
                    }

                    String className = name.replace("/", ".").substring(0, name.length() - 6);
                    try {
                        Class<?> clazz = Class.forName(className);

                        // Additional validation: check for empty simple name before adding
                        String simpleName = clazz.getSimpleName();
                        if (simpleName == null || simpleName.trim().isEmpty()) {
                            System.err.println("Warning: Skipping class with empty name from JAR: " + className);
                            continue;
                        }

                        if (isValidClass(clazz)) {
                            classes.add(clazz);
                        }
                    } catch (Exception e) {
                        // Skip classes that can't be loaded
                    }
                }
            }
        } catch (Exception e) {
            // Ignore JAR scanning errors
        }
    }

    /**
     * Fallback: Loads known classes directly.
     */
    private static List<Class<?>> loadKnownClasses() {
        List<Class<?>> classes = new ArrayList<>();

        // Try to load common backend classes
        String[] knownClasses = {
                "com.is442.backend.model.User",
                "com.is442.backend.model.Patient",
                "com.is442.backend.model.ClinicStaff",
                "com.is442.backend.model.SystemAdministrator",
                "com.is442.backend.model.Clinic",
                "com.is442.backend.model.GpClinic",
                "com.is442.backend.model.SpecialistClinic",
                "com.is442.backend.model.Doctor",
                "com.is442.backend.model.Appointment",
                "com.is442.backend.model.TimeSlot",
                "com.is442.backend.model.TreatmentNote"
        };

        for (String className : knownClasses) {
            try {
                Class<?> clazz = Class.forName(className);
                if (isValidClass(clazz)) {
                    classes.add(clazz);
                }
            } catch (Exception e) {
                // Skip classes that can't be loaded
            }
        }

        return classes;
    }

    /**
     * Checks if a class should be included in the diagram.
     * Excludes interfaces, enums, inner classes, classes with empty names,
     * BackendApplication, and all config classes.
     */
    private static boolean isValidClass(Class<?> clazz) {
        if (clazz == null) {
            return false;
        }

        // Exclude interfaces, enums, and annotations
        if (clazz.isInterface() || clazz.isEnum() || clazz.isAnnotation()) {
            return false;
        }

        // Exclude inner classes
        if (clazz.getSimpleName().contains("$")) {
            return false;
        }

        // Exclude classes with empty or whitespace-only names (anonymous/synthetic
        // classes
        String simpleName = clazz.getSimpleName();
        if (simpleName == null || simpleName.trim().isEmpty()) {
            return false;
        }

        // Only include classes from the backend package
        if (!clazz.getPackageName().startsWith(BASE_PACKAGE)) {
            return false;
        }

        // Exclude BackendApplication
        if (clazz.getSimpleName().equals("BackendApplication") &&
                clazz.getPackageName().equals(BASE_PACKAGE)) {
            return false;
        }

        // Exclude all classes in the config package
        if (clazz.getPackageName().equals(BASE_PACKAGE + ".config")) {
            return false;
        }

        return true;
    }
}
