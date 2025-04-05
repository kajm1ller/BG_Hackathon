
const http = require('http');
const fetch = require('node-fetch');
const apiKey = 'sqg9bhb3rfi24i8ynvr00mbdgqjl70';
http.createServer(async (req, res) => {
    if (req.url === '/') {

        const urlParams = new URLSearchParams(req.url.split('?')[1]);
        const barcode = urlParams.get('barcode');

        if (barcode) {
            const apiUrl = `https://api.barcodelookup.com/v3/products?barcode=${barcode}&key=${apiKey}`;

            try {
                const response = await fetch(apiUrl);
                if (response.status === 200) {
                    const data = await response.json();
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(data, null, 2));
                } else if (response.status === 403) {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid API key' }));
                } else if (response.status === 404) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'No data returned' }));
                } else if (response.status === 429) {
                    res.writeHead(429, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Exceeded API call limits' }));
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal Server Error' }));
            }
        } else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Barcode parameter is missing' }));
        }
    }
}).listen(3000, () => {
    console.log('Server listening on port 3000');
});