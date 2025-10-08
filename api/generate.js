export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { prompt, base64ImageData } = req.body;
        
        // Securely get the API key from Vercel's environment variables
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error('API key is not configured.');
            return res.status(500).json({ error: 'API key is not configured on the server.' });
        }

        if (!prompt || !base64ImageData) {
            return res.status(400).json({ error: 'Missing prompt or image data.' });
        }
        
        // CORRECTED: Use the model specifically for image generation tasks
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;

        // The payload to send to Google's API
        const payload = {
            contents: [{
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: "image/png", data: base64ImageData } }
                ]
            }],
            // CORRECTED: Use responseModalities to request an image output, not responseMimeType
            generationConfig: {
                "responseModalities": ["IMAGE"],
            }
        };

        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!apiResponse.ok) {
            const errorData = await apiResponse.json();
            console.error('Google API Error:', errorData);
            return res.status(apiResponse.status).json({ error: errorData.error?.message || 'Failed to generate image from Google API.' });
        }

        const result = await apiResponse.json();
        
        // Find the image data in the response
        const base64Data = result?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
        
        if (!base64Data) {
            console.error('No image data found in Google API response:', result);
            return res.status(500).json({ error: "No image data was returned from the API." });
        }

        // Send the successful response back to the frontend
        res.status(200).json({ base64Data });

    } catch (error) {
        console.error('Internal Server Error:', error);
        res.status(500).json({ error: error.message || 'An unexpected error occurred on the server.' });
    }
}
