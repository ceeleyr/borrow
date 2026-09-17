# System Architecture

## Tech Stack

| Component          | Technology            | Purpose                          |
| ------------------ | --------------------- | -------------------------------- |
| Frontend           | React Native + Expo   | Mobile application               |
| Backend            | Express.js            | Custom REST API & business logic |
| Database           | Supabase (PostgreSQL) | Data storage                     |
| Backend Deployment | Vercel                | Deploy Express.js API            |
| Mobile Build       | Expo / EAS            | Build Android `.apk`             |

---

## Architecture Overview

```text
┌─────────────────────────────┐
│     React Native + Expo     │
│                             │
│       Mobile Client         │
└──────────────┬──────────────┘
               │
               │ HTTPS / REST API
               ▼
┌─────────────────────────────┐
│         Express.js          │
│                             │
│      Custom REST API        │
│   Authentication & Logic    │
└──────────────┬──────────────┘
               │
               │ Supabase Client
               ▼
┌─────────────────────────────┐
│          Supabase           │
│                             │
│       PostgreSQL DB         │
└─────────────────────────────┘
```

## Components

### Frontend — React Native + Expo

Responsible for:

* User and admin interfaces
* Navigation
* User input
* Sending requests to the backend
* Displaying API responses

During development, the application can be tested using **Expo Go**.

### Backend — Express.js

Acts as the application's API layer.

Responsible for:

* Authentication and authorization
* Request validation
* Business logic
* Item management
* Borrowing management
* Communication with Supabase

The frontend does not access the database directly.

### Database — Supabase

Supabase provides the PostgreSQL database used to store:

* Users
* Items
* Borrowing transactions
* Borrowing status
* Borrowing history

Basic relationship:

```text
Users
  │
  │ 1:N
  ▼
Borrowings
  │
  │ N:1
  ▼
Items
```

---

## Borrowing Flow

```text
User
 │
 │ Submit borrowing request
 ▼
Express.js API
 │
 │ Validate & create request
 ▼
Supabase
 │
 ▼
Pending
 │
 ├──────────────► Rejected
 │
 ▼
Approved
 │
 ▼
Borrowed
 │
 ▼
Returned
 │
 ▼
Item Available
```

---

## Deployment

### Backend

```text
Git Repository
      │
      ▼
    Vercel
      │
      ▼
Express.js API
```

The Express.js backend is deployed through Vercel from the Git repository.

### Mobile Application

```text
React Native
      │
      ▼
     Expo
      │
      ├──► Expo Go (Development)
      │
      └──► EAS Build → Android APK
```

Environment variables are used for API and database configuration. Sensitive credentials are not stored directly in the source code.
