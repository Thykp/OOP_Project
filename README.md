# OOP_Project

## Prerequisite
VScode or IntelliJ (Your Choice) <br>
Java 17 <br>
Maven 3.6+ <br>
Node.js <br>
Database Credentials <br>

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

## Solution Architecture (Draft)
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

