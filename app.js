// DOM elements
const notesInput = document.getElementById('notesInput');
const formatBtn = document.getElementById('formatBtn');
const resultSection = document.getElementById('resultSection');
const resultContent = document.getElementById('resultContent');
const copyBtn = document.getElementById('copyBtn');
const errorMessage = document.getElementById('errorMessage');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingMessage = document.getElementById('loadingMessage');

// Loading messages to cycle through
const loadingMessages = [
    'Reading Notes...',
    'Performing Analysis On Notes...',
    'Extracting Key Details...',
    'Formatting Notes...',
    'Finalizing Results...'
];

let loadingMessageIndex = 0;
let loadingMessageInterval = null;
let allMessagesShown = false;
let requestCompleted = false;

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
    
    // Show loading overlay with rotating messages
    showLoadingOverlay();

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
        displayResult(data.formatted_notes, data.is_structured);
    } catch (error) {
        if (error.name === 'AbortError') {
            showError('Request timed out. The workflow is still running - please check Scout logs and try again.');
        } else {
            showError(`Error: ${error.message}`);
        }
    } finally {
        // Mark request as completed, but wait for all messages to show
        requestCompleted = true;
        tryHideLoadingOverlay();
        
        formatBtn.disabled = false;
        formatBtn.querySelector('.btn-text').style.display = 'inline';
        formatBtn.querySelector('.btn-loader').style.display = 'none';
    }
});

// Copy button handler (for plain text)
copyBtn.addEventListener('click', () => {
    const text = resultContent.textContent;
    navigator.clipboard.writeText(text).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyBtn.textContent = originalText;
        }, 2000);
    });
});


// Display formatted result
function displayResult(formattedText, isStructured = false) {
    // Clean up the text - remove markdown code blocks if present
    let cleanText = formattedText;
    if (typeof cleanText === 'string') {
        // Handle: ```json { ... } ```
        cleanText = cleanText
            .replace(/^```json\s*\{/i, '{')  // ```json { at start
            .replace(/\}\s*```$/g, '}')      // } ``` at end
            .replace(/^```json\s*\n?/i, '')  // ```json\n at start
            .replace(/^```\s*\n?/i, '')      // ```\n at start
            .replace(/\n?\s*```$/g, '')      // ``` at end
            .replace(/^```json\s*/i, '')     // ```json at start (no newline)
            .replace(/\s*```$/g, '')         // ``` at end (no newline)
            .trim();
    }
    
    // Try to parse as JSON to see if it's structured meeting synthesis
    // (Try even if server didn't mark it as structured, as a fallback)
    try {
        const data = JSON.parse(cleanText);
        if (data.bluf && data.meeting_recap) {
            // Render structured meeting synthesis
            renderMeetingSynthesis(data);
            copyBtn.style.display = 'none'; // Hide plain text copy button, synthesis has its own
            resultSection.style.display = 'block';
            resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return;
        }
    } catch (e) {
        // Not JSON, continue to plain text rendering
        if (isStructured) {
            console.warn('Failed to parse structured JSON:', e);
        } else {
            console.warn('Could not parse as JSON:', e);
        }
    }
    
    // Fallback to plain text
    // Add a header with copy button for plain text output
    const plainTextHtml = `
        <div class="plain-text-header">
            <h2>Formatted Notes</h2>
            <div class="synthesis-actions">
                <button class="btn-copy" onclick="copyFormattedOutput(event)">Copy Formatted Output</button>
            </div>
        </div>
        <div class="plain-text-content">${escapeHtml(cleanText)}</div>
    `;
    resultContent.innerHTML = plainTextHtml;
    
    // Store plain text globally for copy function
    window.formattedPlainText = cleanText;
    
    copyBtn.style.display = 'none'; // Hide old plain text copy button
    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Render structured meeting synthesis
function renderMeetingSynthesis(data) {
    const { bluf, meeting_recap } = data;
    const { first_level, second_level, third_level } = meeting_recap || {};
    
    let html = `
        <div class="meeting-synthesis">
            <div class="synthesis-header">
                <h2>Meeting Synthesis</h2>
                <div class="synthesis-actions">
                    <button class="btn-copy" onclick="copySynthesisJSON(event)">Copy JSON</button>
                    <button class="btn-download" onclick="downloadSynthesisJSON()">Download JSON</button>
                    <button class="btn-copy" onclick="copyFormattedOutput(event)">Copy Formatted Output</button>
                </div>
            </div>
            
            <div class="synthesis-content">
                <h1>${formatTitle('Bluf')}</h1>
                ${renderBody(bluf)}
                
                <h1>${formatTitle('Meeting_recap')}</h1>
                
                <h2>${formatTitle('First_level')}</h2>
                
                <p class="body-label">${formatTitle('What_was_covered')}</p>
                ${renderBulletArray(first_level?.what_was_covered || [])}
                
                <p class="body-label">${formatTitle('Commitments_made')}</p>
                ${renderBulletArray(first_level?.commitments_made || [])}
                
                <p class="body-label">${formatTitle('New_information')}</p>
                ${renderBulletArray(first_level?.new_information || [])}
                
                <p class="body-label">${formatTitle('Customer_uncertainties')}</p>
                ${renderBulletArray(first_level?.customer_uncertainties || [])}
                
                <p class="body-label">${formatTitle('Open_items')}</p>
                ${renderBulletArray(first_level?.open_items || [])}
                
                <h2>${formatTitle('Second_level')}</h2>
                
                <p class="body-label">${formatTitle('Mental_model_gaps')}</p>
                ${renderBody(second_level?.mental_model_gaps)}
                
                <p class="body-label">${formatTitle('Customer_confidence_signals')}</p>
                ${renderBody(second_level?.customer_confidence_signals)}
                
                <p class="body-label">${formatTitle('Approach_limitations')}</p>
                ${renderBody(second_level?.approach_limitations)}
                
                <h2>${formatTitle('Third_level')}</h2>
                
                <p class="body-label">${formatTitle('Structural_recommendation')}</p>
                ${renderBody(third_level?.structural_recommendation)}
            </div>
        </div>
    `;
    
    resultContent.innerHTML = html;
    
    // Store data globally for copy/download functions
    window.synthesisData = data;
}

// Helper functions
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatMultiline(text) {
    if (!text) return '';
    return escapeHtml(text).replace(/\n/g, '<br />');
}

function formatTitle(text) {
    if (!text) return '';
    // Special case: BLUF should be all caps
    if (text.toLowerCase() === 'bluf') {
        return 'BLUF';
    }
    // Convert snake_case to Title Case
    return text
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

function renderBody(text) {
    if (!text || text.trim().length === 0) {
        return '<p class="text-muted">Not provided</p>';
    }
    return `<p>${formatMultiline(text)}</p>`;
}

function renderBulletArray(items) {
    if (!items || items.length === 0) {
        return '<p class="text-muted">None</p>';
    }
    return '<ul>' + items.map(item => `<li>${escapeHtml(item)}</li>`).join('') + '</ul>';
}

// Copy and download functions
window.copySynthesisJSON = function(event) {
    if (!window.synthesisData) return;
    const jsonString = JSON.stringify(window.synthesisData, null, 2);
    navigator.clipboard.writeText(jsonString).then(() => {
        const btn = event?.target || document.querySelector('.btn-copy');
        if (btn) {
            const originalText = btn.textContent;
            btn.textContent = 'Copied';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        }
    });
};

window.downloadSynthesisJSON = function() {
    if (!window.synthesisData) return;
    const jsonString = JSON.stringify(window.synthesisData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meeting-synthesis.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

window.copyFormattedOutput = function(event) {
    // Get the text content from the result (works for both structured and plain text)
    const resultContent = document.getElementById('resultContent');
    let text = '';
    
    if (window.formattedPlainText) {
        // Plain text output
        text = window.formattedPlainText;
    } else if (resultContent) {
        // Structured output - get text content from the rendered HTML
        // Clone the content to avoid modifying the original
        const clone = resultContent.cloneNode(true);
        // Remove the synthesis header buttons from the clone
        const header = clone.querySelector('.synthesis-header');
        if (header) {
            header.remove();
        }
        text = clone.textContent || clone.innerText;
    }
    
    if (!text) {
        console.error('No text content found to copy');
        return;
    }
    
    // Get the button that was clicked
    const btn = event?.target;
    if (!btn) {
        console.error('No button target found');
        return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
        const originalText = btn.textContent;
        btn.textContent = 'Copied';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        btn.textContent = 'Copy Failed';
        setTimeout(() => {
            btn.textContent = 'Copy Formatted Output';
        }, 2000);
    });
};

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

// Hide error message
function hideError() {
    errorMessage.style.display = 'none';
}

// Show loading overlay with rotating messages
function showLoadingOverlay() {
    loadingOverlay.style.display = 'flex';
    loadingMessageIndex = 0;
    allMessagesShown = false;
    requestCompleted = false;
    loadingMessage.textContent = loadingMessages[0];
    loadingMessage.style.opacity = '1';
    
    // Cycle through messages every 10 seconds with fade transition
    // Stop at the last message instead of looping
    loadingMessageInterval = setInterval(() => {
        // Check if we've reached the last message
        if (loadingMessageIndex >= loadingMessages.length - 1) {
            clearInterval(loadingMessageInterval);
            loadingMessageInterval = null;
            allMessagesShown = true;
            // Try to hide overlay if request is also completed
            tryHideLoadingOverlay();
            return;
        }
        
        // Fade out
        loadingMessage.style.opacity = '0';
        loadingMessage.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
            loadingMessageIndex = loadingMessageIndex + 1;
            loadingMessage.textContent = loadingMessages[loadingMessageIndex];
            
            // Fade in
            loadingMessage.style.opacity = '1';
            loadingMessage.style.transform = 'translateY(0)';
        }, 300);
    }, 10000); // 10 seconds per message
}

// Try to hide loading overlay (only if both conditions are met)
function tryHideLoadingOverlay() {
    if (allMessagesShown && requestCompleted) {
        hideLoadingOverlay();
    }
}

// Hide loading overlay
function hideLoadingOverlay() {
    loadingOverlay.style.display = 'none';
    if (loadingMessageInterval) {
        clearInterval(loadingMessageInterval);
        loadingMessageInterval = null;
    }
}
