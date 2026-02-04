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

2. Start the server:
```bash
npm start
```

3. Open your browser and navigate to:
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

The app uses the Scout API with:
- Workflow ID: `wf_cml8835ry000m0fs6zvob1hec`
- API Key: Configured in `server.js`

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
