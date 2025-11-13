# SingHealth Clinic Management System

A comprehensive clinic management system built with Spring Boot and React, featuring real-time updates, queue management, and multi-role access control. It supports three user group.

---
## 🎯 Features by Role

### 👤 Patient Features

#### Appointment Management
- **Book Appointments**: Browse & book from available timeslots across GP and specialist clinics
- **View Appointments**: View past, upcoming, and completed appointments

#### Queue & Check-in
- **Self Check-in**: Check-in for appointment 2hours before start time 
- **Real-time Queue Position**: View current position in clinic queue
- **Receive notification** : Receive notification 3 positions away & current turn 

#### Treatment Notes Access
- **View Treatment Notes**: Access completed treatment notes from appointments

---
### 👨‍⚕️ Staff Features (Nurse/Receptionist)

#### Appointment Management
- **View All Appointments**: View all upcoming & completed appointment
- **Appointment Actions**:
  - Mark as "Completed" (NURSE)
  - Add walk In (RECEPTIONIST)
  - Cancel & reschedule/ indicate No show for appointments (RECEPTIONIST)

#### Queue Management
- **Queue Dashboard**: View all checked-in patients
- **Queue Position Management**: Process queue, track and manage patient flow

#### Treatment Notes Creation 
- **Create Treatment Notes**: Add treatment notes after appointment completed (NURSE)

#### Generate Report
- **Generate Daily Report**: Generate daily report of clinic statistics

---

### 🔧 System Administrator Features

#### User Management
- **Role Management**: Create, update, delete user accounts and assign and modify user roles

#### Clinic Configuration
- Configure clinic operating hours

#### Doctor Management
- **Doctor Profiles**:
  - Add new doctors to the system
  - Edit doctor information
  - Manage doctor schedules/timeslots

#### System Monitoring
- View overall system usage
- Generate backup and restore data

---
## 📱 User Workflows

### Patient Journey
1. Sign up with email and login
2. Browse & select from available clinics and doctors
3. Select date and time slot
4. Book appointment
5. Receive confirmation
6. Check-in 2 hours before appointment day
7. Wait in queue (receive notification when called & 3 queue away)
8. Complete appointment
9. View treatment notes

### Staff Journey
1. login
2. View dashboard with today's appointments
3. Monitor check-ins and queue
4. Call next patient from queue
5. Mark appointment as Completed (NURSE)
6. Create treatment note after consultation (NURSE)
7. Add walk-in appointments (RECEPTIONIST)
8. Cancel/reschedule or mark No-show (RECEPTIONIST)

### Admin Journey
1. Login
2. Access admin dashboard
3. Add new doctors to system
4. Create time slots for doctors
5. Configure clinic operating hours
6. Manage user accounts and roles
7. Monitor system activity
8. Generate backup and restore data

---

## 🧪 Test Accounts

Use the following accounts to test different user roles:

### Patient Account
**Please book an appointment at AFFINITY MEDICAL CLINIC to test the staff account flow**
- **Email**: `geraldchee0110@gmail.com`
- **Password**: `Password1!`

### Staff Account (Nurse) - AFFINITY MEDICAL CLINIC
- **Email**: `gerald.chee.2023@scis.smu.edu.sg`
- **Password**: `Password1!`

### Staff Account (Receptionist) - AFFINITY MEDICAL CLINIC
- **Email**: `geraldchee2002@gmail.com`
- **Password**: `Password1!`

### Administrator Account
**If you wish to use your own Patient & Staff account, you may create it using this Administrator Account.**
- **Email**: `janiee.lim17@gmail.com`
- **Password**: `Password1!`

---

## 🚀 Getting Started

### Prerequisites
- **VSCode** or **IntelliJ IDEA** (Your choice)
- **Java 21** or higher
- **Maven 3.6+**
- **Node.js 18+** and npm
- **Docker** and **Docker Compose**

### Installation Steps

#### 1. Clone the Repository
```bash
git clone https://github.com/Thykp/OOP_Project.git
cd OOP_Project
```

#### 2. Backend Setup (Spring Boot + Kafka + Redis)
Open a terminal and run:
```bash
cd backend
mvn clean install
docker compose up -d --build
```

**To shut down the backend:**
```bash
docker compose down
```

#### 3. Frontend Setup (React + Vite)
Open another terminal and run:
```bash
cd frontend
npm install
npm run dev
```

#### 4. Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8080

---

## 🔧 Verification & Debugging

### Check Kafka Topics
```bash
docker exec -it kafka bash -lc 'kafka-topics --bootstrap-server localhost:9092 --list'
```

### Check Redis Queues
```bash
docker exec -it redis redis-cli

# Find all clinic queues
keys clinic:*:queue

# Check current serving patient
get clinic:123:nowServing

# Check queue sequence
get clinic:123:seq
```

---

## 📁 Project Structure

### Backend (Spring Boot)
```bash
backend/
├── src/
│   ├── main/
│   │   ├── java/com/is442/backend/
│   │   │   ├── controller/     # REST API endpoints
│   │   │   ├── model/          # JPA entities
│   │   │   ├── repository/     # Data access layer
│   │   │   ├── service/        # Business logic
│   │   │   └── config/         # Configuration classes
│   │   └── resources/
│   │       ├── application.properties
│   │       └── application-prod.properties
│   └── test/                   # Unit and integration tests
├── pom.xml                     # Maven dependencies
└── docker-compose.yml          # Docker services
```

### Frontend (React + TypeScript)
```bash
frontend/
├── src/
│   ├── components/             # Reusable UI components
│   ├── pages/                  # Page components
│   ├── context/                # React context (auth)
│   ├── lib/                    # Utilities (Supabase, WebSocket)
│   └── main.tsx                # App entry point
├── package.json                # npm dependencies
└── vite.config.ts              # Vite configuration
```





