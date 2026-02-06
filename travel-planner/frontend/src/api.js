import axios from 'axios';

// The Google Apps Script Web App URL
const GAS_URL = "https://script.google.com/macros/s/AKfycbysH0rv9g64H4j3w9wArrc39DVXQXz1YSXxaVFV3udlQUubEollRRt8-YS5O-CMUgjWdQ/exec";

const apiClient = {
    // Basic GET wrapper
    get: async (action, params = {}) => {
        const response = await axios.get(GAS_URL, {
            params: { action, ...params }
        });
        if (response.data.error) throw new Error(response.data.error);
        return response.data;
    },

    // POST wrapper
    // Note: GAS CORS can be tricky with application/json. 
    // If we see CORS errors, we might need to change to text/plain or form data.
    post: async (action, payload = {}) => {
        // Enforce action in payload for doPost to route it
        const body = { action, ...payload };

        // Using text/plain prevents preflight in some cases, 
        // but our backend checks e.postData.contents which works for JSON text too.
        const response = await axios.post(GAS_URL, JSON.stringify(body), {
            headers: {
                'Content-Type': 'text/plain'
            }
        });

        if (response.data.error) throw new Error(response.data.error);
        return response.data;
    }
};

export default apiClient;
