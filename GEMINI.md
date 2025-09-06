## Project Overview

This project is a Next.js application that serves as an integration server between AI assistants and Xero accounting data. It leverages the Model Context Protocol (MCP) to enable secure access and analysis of Xero data by AI models like Claude and ChatGPT. The project uses Prisma for database interactions and is optimized for deployment on Vercel.

## Building and Running

*   **Installation:**
    ```bash
    git clone https://github.com/hiltonbrown/xero-mcp-with-next-js.git
    cd xero-mcp-with-next-js
    pnpm install
    ```
*   **Configuration:**
    Copy `.env.example` to `.env.local` and configure Xero API credentials, database URL, and other settings.
    ```bash
    cp .env.example .env.local
    ```
*   **Database Migrations:**
    ```bash
    npx prisma migrate deploy
    ```
*   **Development Server:**
    ```bash
    pnpm run dev
    ```
    Visit `http://localhost:3000` to access the application.
*   **Building for Production:**
    ```bash
    pnpm run build
    ```
*   **Running Tests:**
    ```bash
    pnpm test
    ```
    Specific test types can be run using:
    *   `pnpm run test:unit`
    *   `pnpm run test:api`
    *   `pnpm run test:integration`
    *   `pnpm run test:components`
*   **Vercel Deployment:**
    For successful deployment on Vercel, ensure the "Build Command" in your Vercel project settings is set to `pnpm run vercel:build`. This ensures `prisma generate` is executed correctly during the build process.

## Development Conventions

*   **TypeScript:** The project uses TypeScript for strict type checking.
*   **ESLint:** Code linting is enforced with Next.js rules.
*   **Prettier:** Automated code formatting is used.
*   **Testing:** The project aims for a minimum of 80% code coverage, with unit, API, integration, and component tests.
*   **Commit Message Format:** Follows a conventional commit format (e.g., `feat:`, `fix:`, `docs:`, `test:`, `refactor:`).