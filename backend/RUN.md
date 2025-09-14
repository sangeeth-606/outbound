# How to Run the Backend Server

Follow these steps to set up and run the backend application.

### 1. Navigate to the Backend Directory

```bash
cd backend
```

### 2. Activate the Virtual Environment

```bash
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Copy the example environment file.

```bash
cp env.example .env
```

**Important:** You must open the `.env` file and add your API keys and credentials for services like LiveKit, Twilio, etc.

### 5. Run the Server

This command will start the FastAPI server on `http://localhost:8000`.

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
