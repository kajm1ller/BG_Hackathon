import express from "express";
import fetch from "node-fetch";

const app = express();
const port = 3000;
const apiKey = "sqg9bhb3rfi24i8ynvr00mbdgqjl70";

app.use(express.static("."));



app.post("/get-product-info", express.json(), async (req, res) => {
    const { barcode } = req.body;
    const apiUrl = `https://api.barcodelookup.com/v3/products?barcode=${barcode}&key=${apiKey}`;

    try {
        const response = await fetch(apiUrl);
        if (response.status === 200) {
            const data = await response.json();
            if (data.products && data.products.length > 0) {
                const product = data.products[0];
                const name = product.title || "Product Name Not Found";
                const energyEfficiency = product.description || "Not Found";
                const pic = product.images[0];

                res.json({
                    name: name,
                    energyEfficiency: energyEfficiency,
                    pic: pic,
                });
            } else {
                res.status(404).json({ error: "No product data found" });
            }
        } else if (response.status === 403) {
            res.status(403).json({ error: "Invalid API key" });
        } else if (response.status === 404) {
            res.status(404).json({ error: "No data returned" });
        } else if (response.status === 429) {
            res.status(429).json({ error: "Exceeded API call limits" });
        }
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
