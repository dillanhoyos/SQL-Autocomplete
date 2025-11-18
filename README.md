# Natural Language SQL Autocomplete

This project is a high-performance, AI-powered autocomplete system that translates natural language into SQL queries in real-time. It's built with a modern, snappy frontend and a high-performance backend, all containerized with Docker for easy setup and deployment. The primary focus is on speed and user experience, delivering multiple relevant suggestions with sub-second latency.


---

## ✨ Features

- **Real-time Suggestions:** Generates 2-3 distinct SQL query suggestions as you type.
- **Streaming Responses:** Uses Server-Sent Events (SSE) to stream suggestions, making the UI feel instantaneous (Time to First Suggestion is very low).
- **Dynamic Schema Support:** Easily switch between multiple database schemas to get context-aware suggestions.
- **Conversation History:** Remembers the context of your current session to provide more relevant follow-up queries.
- **Modern UI:** A clean, terminal-inspired interface built for speed and clarity.
- **Dockerized:** Fully containerized with Docker Compose for one-command setup.
- **Optimized for Speed:** Every component, from the frontend debounce to the backend prompts, is tuned for performance.

---

## 🛠️ Tech Stack

- **Frontend:**
  - **Framework:** Next.js (React)
  - **Language:** TypeScript
  - **Styling:** Tailwind CSS
  - **HTTP Client:** Fetch API (for streaming)

- **Backend:**
  - **Framework:** FastAPI
  - **Language:** Python
  - **LLM:** Mistral AI (Codestral)
  - **Async Support:** Uvicorn with asyncio

- **DevOps:**
  - **Containerization:** Docker & Docker Compose

---

## 🚀 Getting Started

Follow these instructions to get the project up and running on your local machine.

### Prerequisites

Make sure you have the following installed:
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)
- [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)

### 1. Clone the Repository

First, clone the project from GitHub:
```bash
git clone https://github.com/dillan-k/sql-autocomplete.git
cd sql-autocomplete/SQL-Autocomplete
```

### 2. Configure Environment Variables

The project uses a `.env` file to manage secret keys.

1.  **Create the `.env` file:**
    Duplicate the provided template file `env.template` and rename it to `.env`.

    ```bash
    cp env.template .env
    ```

2.  **Add Your Mistral API Key:**
    Open the newly created `.env` file and add your API key from [Mistral AI](https://mistral.ai/).

    ```env
    # .env

    # -------------------------------------------------------------------------
    #  Mistral AI Configuration
    # -------------------------------------------------------------------------
    # Get your API key from https://console.mistral.ai/
    MISTRAL_API_KEY="YOUR_MISTRAL_API_KEY_HERE"

    # -------------------------------------------------------------------------
    #  Application Settings (Optional)
    # -------------------------------------------------------------------------
    # Environment can be 'development' or 'production'
    ENVIRONMENT=development
    LOG_LEVEL=info

    # Backend server settings
    MAX_WORKERS=4
    LLM_TIMEOUT_MS=10000

    # Frontend settings
    NEXT_PUBLIC_API_URL=http://localhost:8000/api
    NEXT_PUBLIC_MIN_CHARS_TRIGGER=3
    NEXT_PUBLIC_SMART_TRIGGER_DELAY_MS=150
    ```

### 3. Build and Run with Docker Compose

With Docker running, execute the following command from the `SQL-Autocomplete` directory:

```bash
docker compose up --build
```

This command will:
- Build the Docker images for both the frontend and backend services.
- Create and start the containers.
- Set up the network to allow the frontend and backend to communicate.

The initial build may take a few minutes. Once it's complete, the application will be running.

---

## 🌐 Accessing the Application

- **Frontend Application:**
  Open your web browser and navigate to:
  **[http://localhost:3000](http://localhost:3000)**

- **Backend API Docs:**
  The FastAPI backend automatically generates interactive API documentation (Swagger UI). You can access it at:
  **[http://localhost:8000/docs](http://localhost:8000/docs)**

---

## 📂 Project Structure

The repository is organized into two main directories:

- **`/backend`**: Contains the FastAPI application, including the API routes, Mistral AI service integration, and logging configuration.
- **`/frontend`**: Contains the Next.js application, including all React components, hooks, and styling.

---
