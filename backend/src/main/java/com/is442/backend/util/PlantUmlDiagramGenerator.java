package com.is442.backend.util;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Utility class to generate PlantUML class diagram
 * Automatically scans all backend classes and generates a comprehensive class diagram
 * Output can be converted to XML or images using PlantUML tools
 */
public class PlantUmlDiagramGenerator {

    private static final String DEFAULT_OUTPUT_DIR = "scripts/out";
    private static final String DEFAULT_OUTPUT_FILE = "class-diagram.puml";
    
    private Set<Class<?>> processedClasses = new HashSet<>();
    private Map<String, ClassInfo> classInfoMap = new HashMap<>();
    private StringBuilder pumlBuilder = new StringBuilder();

    public static void main(String[] args) {
        try {
            // Determine output path
            String outputPath;
            if (args.length > 0) {
                outputPath = args[0];
            } else {
                // Default to scripts/out directory
                ensureOutputDirectory();
                outputPath = DEFAULT_OUTPUT_DIR + "/" + DEFAULT_OUTPUT_FILE;
            }
            
            PlantUmlDiagramGenerator generator = new PlantUmlDiagramGenerator();
            generator.generateDiagram(outputPath);
            System.out.println("✓ PlantUML diagram generated successfully: " + outputPath);
            System.out.println("  You can convert it to XML/image using PlantUML tools");
        } catch (Exception e) {
            System.err.println("✗ Error generating diagram: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }
    
    /**
     * Ensures the output directory exists.
     */
    private static void ensureOutputDirectory() {
        try {
            File outputDir = new File(DEFAULT_OUTPUT_DIR);
            if (!outputDir.exists()) {
                outputDir.mkdirs();
                System.out.println("Created output directory: " + DEFAULT_OUTPUT_DIR);
            }
        } catch (Exception e) {
            System.err.println("Warning: Could not create output directory: " + e.getMessage());
        }
    }

    public void generateDiagram(String outputPath) throws Exception {
        // Ensure output directory exists
        File outputFile = new File(outputPath);
        File outputDir = outputFile.getParentFile();
        if (outputDir != null && !outputDir.exists()) {
            outputDir.mkdirs();
        }
        
        // Scan all backend classes using the scanner utility
        System.out.println("Scanning backend classes...");
        List<Class<?>> backendClasses = BackendClassScanner.scanBackendClasses();
        System.out.println("Found " + backendClasses.size() + " classes");
        
        // Process each class
        for (Class<?> clazz : backendClasses) {
            processClass(clazz);
        }
        
        // Generate PlantUML output
        generatePlantUml(outputPath);
    }

    private void processClass(Class<?> clazz) {
        if (processedClasses.contains(clazz) || clazz == null || clazz == Object.class) {
            return;
        }
        
        processedClasses.add(clazz);
        ClassInfo info = new ClassInfo();
        info.name = clazz.getSimpleName();
        info.fullName = clazz.getName();
        info.isAbstract = Modifier.isAbstract(clazz.getModifiers());
        info.isEntity = clazz.isAnnotationPresent(jakarta.persistence.Entity.class);
        info.isMappedSuperclass = clazz.isAnnotationPresent(jakarta.persistence.MappedSuperclass.class);
        
        // Get superclass
        if (clazz.getSuperclass() != null && !clazz.getSuperclass().equals(Object.class)) {
            info.superClass = clazz.getSuperclass();
            processClass(clazz.getSuperclass()); // Process parent class
        }
        
        // Get interfaces
        for (Class<?> iface : clazz.getInterfaces()) {
            info.interfaces.add(iface);
        }
        
        // Get fields
        for (Field field : clazz.getDeclaredFields()) {
            if (!Modifier.isStatic(field.getModifiers()) && 
                !field.isAnnotationPresent(jakarta.persistence.Transient.class)) {
                FieldInfo fieldInfo = new FieldInfo();
                fieldInfo.name = field.getName();
                fieldInfo.type = getTypeName(field.getType(), field.getGenericType());
                fieldInfo.visibility = getVisibility(field.getModifiers());
                fieldInfo.isId = field.isAnnotationPresent(jakarta.persistence.Id.class);
                info.fields.add(fieldInfo);
            }
        }
        
        // Get key methods (getters, setters, constructors)
        for (Method method : clazz.getDeclaredMethods()) {
            if (!Modifier.isStatic(method.getModifiers())) {
                String methodName = method.getName();
                if (methodName.startsWith("get") || methodName.startsWith("set") || 
                    methodName.equals("toString") || methodName.equals("equals") ||
                    methodName.equals("hashCode")) {
                    MethodInfo methodInfo = new MethodInfo();
                    methodInfo.name = methodName;
                    methodInfo.returnType = getTypeName(method.getReturnType(), method.getGenericReturnType());
                    methodInfo.visibility = getVisibility(method.getModifiers());
                    methodInfo.parameters = Arrays.stream(method.getParameterTypes())
                        .map(c -> getTypeName(c, null))
                        .collect(Collectors.toList());
                    info.methods.add(methodInfo);
                }
            }
        }
        
        classInfoMap.put(info.name, info);
    }

    private String getTypeName(Class<?> type, Type genericType) {
        if (type == null) return "void";
        if (type.isPrimitive()) {
            return type.getName();
        }
        if (type.isArray()) {
            return getTypeName(type.getComponentType(), null) + "[]";
        }
        if (genericType instanceof ParameterizedType) {
            ParameterizedType pt = (ParameterizedType) genericType;
            String baseName = ((Class<?>) pt.getRawType()).getSimpleName();
            String args = Arrays.stream(pt.getActualTypeArguments())
                .map(t -> t instanceof Class ? ((Class<?>) t).getSimpleName() : t.getTypeName().substring(t.getTypeName().lastIndexOf('.') + 1))
                .collect(Collectors.joining(", "));
            return baseName + "<" + args + ">";
        }
        // Return simple name for backend classes
        if (type.getName().startsWith("com.is442.backend")) {
            return type.getSimpleName();
        }
        return type.getSimpleName();
    }

    private String getVisibility(int modifiers) {
        if (Modifier.isPublic(modifiers)) return "+";
        if (Modifier.isProtected(modifiers)) return "#";
        if (Modifier.isPrivate(modifiers)) return "-";
        return "~";
    }

    private void generatePlantUml(String outputPath) throws IOException {
        pumlBuilder.append("@startuml\n");
        pumlBuilder.append("!theme plain\n");
        pumlBuilder.append("skinparam classAttributeIconSize 0\n");
        pumlBuilder.append("title OOP Project - Class Diagram\n\n");
        
        // Generate classes
        for (ClassInfo info : classInfoMap.values()) {
            generateClassPuml(info);
        }
        
        // Generate relationships
        for (ClassInfo info : classInfoMap.values()) {
            generateRelationshipsPuml(info);
        }
        
        pumlBuilder.append("@enduml\n");
        
        // Write to file
        try (FileWriter writer = new FileWriter(outputPath)) {
            writer.write(pumlBuilder.toString());
        }
    }

    private void generateClassPuml(ClassInfo info) {
        pumlBuilder.append("class ").append(info.name);
        
        if (info.isAbstract) {
            pumlBuilder.append(" <<abstract>>");
        } else if (info.isEntity) {
            pumlBuilder.append(" <<Entity>>");
        } else if (info.isMappedSuperclass) {
            pumlBuilder.append(" <<MappedSuperclass>>");
        }
        
        pumlBuilder.append(" {\n");
        
        // Add fields
        for (FieldInfo field : info.fields) {
            pumlBuilder.append("  ").append(field.visibility).append(" ");
            if (field.isId) {
                pumlBuilder.append("{id} ");
            }
            pumlBuilder.append(field.type).append(" ").append(field.name).append("\n");
        }
        
        // Add separator if both fields and methods exist
        if (!info.fields.isEmpty() && !info.methods.isEmpty()) {
            pumlBuilder.append("  --\n");
        }
        
        // Add methods (limit to key ones to keep diagram readable)
        int methodCount = 0;
        for (MethodInfo method : info.methods) {
            if (methodCount++ < 5) { // Limit methods shown
                pumlBuilder.append("  ").append(method.visibility).append(" ");
                if (method.returnType != null && !method.returnType.equals("void")) {
                    pumlBuilder.append(method.returnType).append(" ");
                }
                pumlBuilder.append(method.name).append("(");
                if (!method.parameters.isEmpty()) {
                    pumlBuilder.append(String.join(", ", method.parameters));
                }
                pumlBuilder.append(")\n");
            }
        }
        
        pumlBuilder.append("}\n\n");
    }

    private void generateRelationshipsPuml(ClassInfo info) {
        // Inheritance relationship
        if (info.superClass != null && classInfoMap.containsKey(info.superClass.getSimpleName())) {
            pumlBuilder.append(info.superClass.getSimpleName())
                      .append(" <|-- ")
                      .append(info.name)
                      .append(" : extends\n");
        }
        
        // Association relationships (based on field types)
        for (FieldInfo field : info.fields) {
            String fieldType = field.type;
            // Remove generics for matching
            String simpleType = fieldType.contains("<") ? fieldType.substring(0, fieldType.indexOf("<")) : fieldType;
            
            if (classInfoMap.containsKey(simpleType) && !simpleType.equals(info.name)) {
                pumlBuilder.append(info.name)
                          .append(" --> ")
                          .append(simpleType)
                          .append(" : ")
                          .append(field.name)
                          .append("\n");
            }
        }
    }

    // Inner classes for data structures
    static class ClassInfo {
        String name;
        String fullName;
        Class<?> superClass;
        List<Class<?>> interfaces = new ArrayList<>();
        boolean isAbstract;
        boolean isEntity;
        boolean isMappedSuperclass;
        List<FieldInfo> fields = new ArrayList<>();
        List<MethodInfo> methods = new ArrayList<>();
    }

    static class FieldInfo {
        String name;
        String type;
        String visibility;
        boolean isId;
    }

    static class MethodInfo {
        String name;
        String returnType;
        String visibility;
        List<String> parameters = new ArrayList<>();
    }
}

