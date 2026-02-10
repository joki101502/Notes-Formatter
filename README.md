# Notes Formatter

A simple web application that allows users to paste notes and format them using the Scout API.

## Features

- 📝 Paste notes directly into the textarea
- 🎨 Beautiful, modern UI
- ⚡ Format notes with AI using Scout API
- 📋 Copy formatted results to clipboard
- ✅ Supports bullet points and indentation

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with your API keys:
```bash
cp .env.example .env
```

Then edit `.env` and add your API keys:
```
SCOUT_API_KEY=your_scout_api_key_here
SCOUT_WORKFLOW_ID=your_scout_workflow_id_here
EMAIL_WORKFLOW_ID=your_email_workflow_id_here
DEEPGRAM_API_KEY=your_deepgram_api_key_here
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

## Usage

1. Paste your notes into the textarea (supports bullet points and indentation)
2. Click the "Format Notes" button
3. Wait for the Scout workflow to process your notes
4. View the formatted result
5. Copy the formatted notes to your clipboard

## API Configuration

The app uses the following APIs:
- **Scout API**: For formatting notes (configured via `SCOUT_API_KEY` and `SCOUT_WORKFLOW_ID` environment variables)
- **Scout Email API**: For generating follow-up emails (configured via `EMAIL_WORKFLOW_ID` environment variable)
- **Deepgram API**: For speech-to-text transcription (configured via `DEEPGRAM_API_KEY` environment variable)

All API keys are stored in environment variables (`.env` file) and never exposed to the frontend. Deepgram calls are proxied through the backend for security.

## Project Structure

```
Notes-Formatter/
├── index.html      # Main HTML file
├── style.css       # Styling
├── app.js          # Frontend JavaScript
├── server.js       # Express server with Scout API integration
├── package.json    # Dependencies
└── README.md       # This file
```

## Technologies

- Node.js & Express
- Scout API (scoutos SDK)
- Vanilla JavaScript
- HTML5 & CSS3
