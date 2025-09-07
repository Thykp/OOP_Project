# Spring Boot Monolith – Project Guide

This README explains **how the project is structured**, **where to add code**, and **how to keep things consistent**. It’s written for teammates who are new to Spring Boot.

---

## Quick Start

**Requirements**
- Java **21+**
- Maven (`./mvnw`)
- Docker

## Instructions
> Local Setup
Open a terminal and run the following command:
```bash
  cd backend
  mvn clean install
  mvn spring-boot:run
```

## Project Structure

```bash
.
├── docker-compose.yml
├── HELP.md
├── mvnw
├── mvnw.cmd
├── pom.xml
└── src
    ├── main
    │   ├── java
    │   │   └── com
    │   │       └── is442
    │   │           └── backend
    │   │               ├── BackendApplication.java
    │   │               ├── config
    │   │               ├── controller
    │   │               ├── dto
    │   │               ├── model
    │   │               ├── repository
    │   │               ├── service
    │   │               └── util
```

## Quick Guide

New REST endpoint? → controller → call service → return DTO

Business rule/workflow? → service

DB query/save? → repository

Database table model? → domain (@Entity)

Payloads for API? → dto

Entity ↔ DTO conversions? → mapper

Configuration/beans/CORS? → config

Common helpers? → util (stateless & small)

Custom errors? → exception

DB schema changes? → src/main/resources/db/migration (Flyway)

## Adding new feature/endpoint
Step-by-Step:

### Model
- Create/modify an @Entity in domain if persistence is needed.
- Add a Flyway migration for schema changes.

### DTOs
- Add request/response DTOs in dto.
- Add validation annotations (e.g., @NotBlank, @Email).

### Repository
- Define queries in repository interfaces.

### Mapper
- Add mappings in mapper (MapStruct or manual).

### Service
- Implement business logic in service.
- Throw meaningful exceptions.

### Controller
- Add endpoints in controller.
- Use @Valid, return appropriate status codes.

### Tests
- Service unit tests (mock repositories).
- Controller tests (@WebMvcTest).
- Integration tests (Testcontainers) if DB involved.

### Docs
- Update API docs (OpenAPI/Swagger if enabled).
- Update this README if structure or conventions changed.


## Code Style & Formatting

Java 21 <br>
Constructor injection (no field injection). <br>
Method length: keep focused and small. <br>
Naming: UserController, UserService, UserRepository, UserDto, CreateUserDto. <br>

