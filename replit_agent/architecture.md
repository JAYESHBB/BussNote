# Architecture Documentation

## Overview

This repository contains a full-stack web application designed for invoice management, client tracking, and financial transaction recording. The application follows a modern client-server architecture with:

- A React frontend using Shadcn UI components and TailwindCSS
- An Express.js backend serving both API endpoints and the client application
- A PostgreSQL database using Drizzle ORM for data management
- Session-based authentication for user management

The application is structured to run in production as a single Node.js server process that serves both the API and static frontend assets.

## System Architecture

### High-Level Architecture

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│                 │       │                 │       │                 │
│  React Frontend │◄─────►│  Express Backend│◄─────►│  PostgreSQL DB  │
│                 │       │                 │       │                 │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

The system follows a classic three-tier architecture:

1. **Presentation Layer**: React-based SPA with React Query for data fetching and state management
2. **Application Layer**: Express.js server handling API requests and business logic
3. **Data Layer**: PostgreSQL database with Drizzle ORM for data access and schema management

### Directory Structure

```
├── client/              # Frontend React application
│   ├── src/             # React source code
│   │   ├── components/  # React components, including UI components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── lib/         # Utility functions and shared code
│   │   └── pages/       # Page components for different routes
├── db/                  # Database setup and migrations
├── server/              # Express backend
├── shared/              # Shared code between frontend and backend
```

## Key Components

### Frontend Architecture

The frontend is built with React and uses a variety of modern tools and libraries:

1. **Component Library**: Shadcn UI (based on Radix UI) for accessible UI components
2. **Styling**: TailwindCSS for utility-first styling
3. **Routing**: Wouter for lightweight client-side routing
4. **State Management & Data Fetching**: TanStack React Query
5. **Form Handling**: React Hook Form with Zod for validation

Key frontend components include:
- Layout components (Sidebar, Header)
- Page components (Dashboard, Invoices, Parties, etc.)
- Form components for data entry (PartyForm, InvoiceForm)
- UI components from Shadcn UI

### Backend Architecture

The backend uses Express.js and implements:

1. **API Routes**: RESTful endpoints for data operations
2. **Authentication**: Session-based authentication with Passport.js
3. **Database Access**: Drizzle ORM for type-safe database operations
4. **Development Tools**: Vite for development server

The Express server also serves the React application in production after it's built.

### Data Management

Data is stored in a PostgreSQL database and accessed through Drizzle ORM. The schema includes:

1. **Users**: Authentication and user management
2. **Parties**: Customer/client information
3. **Invoices**: Invoice data with items as child records
4. **Transactions**: Financial transactions
5. **Activities**: System activity logging

The database schema is defined in `shared/schema.ts` and used by both the frontend and backend for type consistency.

### Authentication System

The application uses:
- Session-based authentication with express-session
- Password hashing with scrypt for secure password storage
- PostgreSQL session store using connect-pg-simple
- Protected routes on both frontend and backend

## Data Flow

### Primary Data Flows

1. **Authentication Flow**:
   - User submits credentials → Backend validates → Session created → Frontend receives user data

2. **Data Creation Flow** (e.g., creating an invoice):
   - User submits form → Frontend validation (Zod) → API request → Backend validation → Database insertion → Response to frontend → UI update (React Query)

3. **Data Retrieval Flow**:
   - Component mounts → React Query initiates fetch → API request → Database query → Response to frontend → UI renders data

4. **Report Generation Flow**:
   - User requests report → API request with parameters → Backend aggregates data → Response to frontend → UI displays report

## External Dependencies

### Frontend Dependencies

- **UI Framework**: React
- **UI Components**: Radix UI primitives with Shadcn UI
- **Styling**: TailwindCSS
- **Form Management**: React Hook Form
- **Data Fetching**: TanStack React Query
- **Routing**: Wouter
- **Validation**: Zod
- **Date Handling**: date-fns
- **Icons**: Lucide React

### Backend Dependencies

- **Server Framework**: Express.js
- **Database ORM**: Drizzle ORM
- **Database Driver**: @neondatabase/serverless
- **Authentication**: Passport.js with local strategy
- **Session Management**: express-session with connect-pg-simple
- **Development**: Vite, ESBuild

## Deployment Strategy

The application is set up for deployment on Replit, as indicated by the `.replit` configuration file. The deployment process:

1. **Build Step**: 
   - Frontend: Vite builds static assets to `dist/public`
   - Backend: ESBuild bundles the server code to `dist/index.js`

2. **Runtime**:
   - Single Node.js process runs the Express server
   - Server serves both API endpoints and static frontend assets

3. **Environment Variables**:
   - `DATABASE_URL`: Required for PostgreSQL connection
   - `SESSION_SECRET`: For secure session management
   - `NODE_ENV`: To determine production/development mode

4. **Database**:
   - Uses Neon's serverless PostgreSQL (indicated by the driver)
   - Database migrations managed through Drizzle ORM

The application is configured to run in development mode with `npm run dev` and in production mode with `npm run start` after building with `npm run build`.

## Development Practices

1. **Type Safety**: TypeScript is used throughout the codebase
2. **Shared Types**: Schema definitions in `shared/` directory are used by both frontend and backend
3. **ORM**: Drizzle provides type-safe database access
4. **API Pattern**: RESTful API endpoints with HTTP methods corresponding to CRUD operations
5. **Component Structure**: Modular components with clear separation of concerns