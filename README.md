# OOP_Project

## Prerequisite
VScode or IntelliJ (Your Choice) <br>
Java 21 <br>
Maven 3.6+ <br>
Node.js <br>
Database Credentials <br>

## Folder Structure (Spring Boot)
```bash
.
├── HELP.md
├── mvnw
├── mvnw.cmd
├── pom.xml
└── src
    ├── main
    │   ├── java
    │   └── resources
    └── test
        ├── java
        └── resources
```

## Instructions

Switch to your branch before starting to code:
```bash
  git checkout -b your-branch-name
```

<br>

> Local Setup
1. Open a terminal and run the following command:
```bash
  cd backend
  mvn clean install
  mvn spring-boot:run
```

<br>

2. Open another terminal and run the following command:
```bash
  cd frontend
  npm i
  npm run dev
```

<br>
3. Setting up Kafka + Zookeeper

- Currently Kafka only has a sample file called `KafkaQueueEventConsumer` that consumer the queue created by the `KafkaQueueEventProducer`
- `ClinicService` contains a sample file showing how it can be extended potentially
- calling the GET`/test-kafka` end point should show the word 
  - `Sending message to Kafka: Hello-Kafka`
  - `Received message from Kafka: Hello-Kafka`

```bash
    cd backend
    docker-compose up -d
```

## Solution Architecture (Draft)
### Technical Architecture
<img width="720" height="565" alt="Screenshot 2025-09-08 at 8 44 08 PM" src="https://github.com/user-attachments/assets/2d9b060e-74f9-4f9b-990a-158ebe9ea670" />


### MVC Architecture
<img width="853" height="438" alt="Screenshot 2025-07-22 at 5 18 01 PM" src="https://github.com/user-attachments/assets/0ffc5bb7-eb66-4eca-a817-d3bbfd392e6c" />
<p>
  Spring MVC Architecture that abides by standard Model, View, Controller.
</p>

### Cloud Architecture
<img width="854" height="459" alt="Screenshot 2025-07-22 at 5 16 49 PM" src="https://github.com/user-attachments/assets/65a17bd1-ba1b-411d-9f09-5ea4c500cc3c" />
<p>
  Backend Spring Boot Application image built and stored on ECS and deployed via Fargate for auto scaling <br>
  Frontend deployed as static asset, stored in S3 and distributed via Cloudfront CDN
</p>

