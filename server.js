import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { ScoutClient } from 'scoutos';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Scout API configuration
const SCOUT_API_KEY = "secret_QY3-4AjTY4NbE4nUvjpfmodvemovpPIsB_1yp_aQFH0";
const SCOUT_WORKFLOW_ID = "wf_cml8835ry000m0fs6zvob1hec";

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase body size limit
app.use(express.static(__dirname));

// Initialize Scout client
const client = new ScoutClient({ apiKey: SCOUT_API_KEY });

// API endpoint to format notes
app.post('/api/format', async (req, res) => {
    try {
        const { raw_notes } = req.body;
        
        console.log('Received request to format notes, length:', raw_notes?.length || 0);

        if (!raw_notes) {
            return res.status(400).json({ 
                error: 'Missing raw_notes in request body' 
            });
        }

        // Execute the workflow using ScoutClient (matching the Scout SDK interface)
        console.log('Calling Scout workflow...');
        const startTime = Date.now();
        const response = await client.workflows.run(SCOUT_WORKFLOW_ID, {
            inputs: {
                raw_notes: raw_notes
            }
        });
        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`Scout workflow completed in ${elapsedTime} seconds`);

        // Extract the formatted notes from the response
        // Scout response structure: response.run.state.llm.output (matching scoutApi.js pattern)
        const state = response?.run?.state;
        
        if (!state) {
            console.warn('No state found in Scout response');
            return res.status(500).json({ 
                error: 'Invalid response structure from Scout API',
                message: 'Response missing state'
            });
        }
        
        let formattedNotes = '';
        let isJSON = false;
        
        if (state?.llm?.output) {
            let output = state.llm.output;
            
            // Strip markdown code blocks if present (handle various formats)
            if (typeof output === 'string') {
                // Remove ```json and ``` markers (handle multiline and same-line cases)
                // Handle: ```json { ... } ```
                output = output
                    .replace(/^```json\s*\{/i, '{')  // ```json { at start
                    .replace(/\}\s*```$/g, '}')      // } ``` at end
                    .replace(/^```json\s*\n?/i, '')  // ```json\n at start
                    .replace(/^```\s*\n?/i, '')      // ```\n at start
                    .replace(/\n?\s*```$/g, '')      // ``` at end
                    .replace(/^```json\s*/i, '')     // ```json at start (no newline)
                    .replace(/\s*```$/g, '')         // ``` at end (no newline)
                    .trim();
            }
            
            // Check if output is a JSON string that needs parsing
            if (typeof output === 'string') {
                // Try to parse as JSON
                try {
                    const parsed = JSON.parse(output);
                    // If it has the meeting synthesis structure, return as object
                    if (parsed.bluf && parsed.meeting_recap) {
                        console.log('Detected meeting synthesis structure');
                        return res.json({ 
                            formatted_notes: JSON.stringify(parsed, null, 2),
                            is_structured: true
                        });
                    }
                    // Otherwise, return the parsed JSON as string
                    formattedNotes = JSON.stringify(parsed, null, 2);
                    isJSON = true;
                } catch (e) {
                    console.log('Failed to parse as JSON, using as plain text. Error:', e.message);
                    // Not JSON, use as-is
                    formattedNotes = output;
                }
            } else if (typeof output === 'object') {
                // Already an object, check if it's meeting synthesis
                if (output.bluf && output.meeting_recap) {
                    console.log('Detected meeting synthesis structure (object)');
                    return res.json({ 
                        formatted_notes: JSON.stringify(output, null, 2),
                        is_structured: true
                    });
                }
                formattedNotes = JSON.stringify(output, null, 2);
                isJSON = true;
            } else {
                formattedNotes = String(output);
            }
        } else if (state?.json_output?.output) {
            const output = state.json_output.output;
            if (typeof output === 'object') {
                if (output.bluf && output.meeting_recap) {
                    return res.json({ 
                        formatted_notes: JSON.stringify(output, null, 2),
                        is_structured: true
                    });
                }
                formattedNotes = JSON.stringify(output, null, 2);
            } else {
                formattedNotes = output;
            }
        } else {
            // Log available state keys for debugging if extraction fails
            const stateKeys = Object.keys(state).filter(key => !key.startsWith('__') && key !== 'inputs');
            console.warn('Could not extract formatted notes. Available state keys:', stateKeys);
            // Fallback: return the full response if structure is different
            formattedNotes = JSON.stringify(response, null, 2);
        }

        // Return the formatted notes (matching the frontend expectation)
        res.json({ 
            formatted_notes: formattedNotes,
            is_structured: isJSON
        });
    } catch (error) {
        console.error('Error formatting notes:', error);
        res.status(500).json({ 
            error: 'Failed to format notes',
            message: error.message
        });
    }
});

// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📝 Notes Formatter is ready!`);
});

// Set server timeout to 5 minutes for long-running Scout workflows
server.timeout = 5 * 60 * 1000; // 5 minutes
server.keepAliveTimeout = 5 * 60 * 1000; // 5 minutes
