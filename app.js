// DOM elements
const notesInput = document.getElementById('notesInput');
const formatBtn = document.getElementById('formatBtn');
const resultSection = document.getElementById('resultSection');
const resultContent = document.getElementById('resultContent');
const copyBtn = document.getElementById('copyBtn');
const errorMessage = document.getElementById('errorMessage');

// Format button handler
formatBtn.addEventListener('click', async () => {
    const rawNotes = notesInput.value.trim();
    
    if (!rawNotes) {
        showError('Please enter some notes to format');
        return;
    }

    formatBtn.disabled = true;
    formatBtn.querySelector('.btn-text').style.display = 'none';
    formatBtn.querySelector('.btn-loader').style.display = 'inline';
    hideError();
    resultSection.style.display = 'none';

    try {
        // Create an AbortController with a 5 minute timeout for long-running workflows
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 minutes
        
        const response = await fetch('/api/format', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                raw_notes: rawNotes
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to format notes');
        }

        const data = await response.json();
        displayResult(data.formatted_notes);
    } catch (error) {
        if (error.name === 'AbortError') {
            showError('Request timed out. The workflow is still running - please check Scout logs and try again.');
        } else {
            showError(`Error: ${error.message}`);
        }
    } finally {
        formatBtn.disabled = false;
        formatBtn.querySelector('.btn-text').style.display = 'inline';
        formatBtn.querySelector('.btn-loader').style.display = 'none';
    }
});

// Copy button handler
copyBtn.addEventListener('click', () => {
    const text = resultContent.textContent;
    navigator.clipboard.writeText(text).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✓ Copied!';
        setTimeout(() => {
            copyBtn.textContent = originalText;
        }, 2000);
    });
});

// Display formatted result
function displayResult(formattedText) {
    resultContent.textContent = formattedText;
    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

// Hide error message
function hideError() {
    errorMessage.style.display = 'none';
}
