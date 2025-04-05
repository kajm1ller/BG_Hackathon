import express from "express";
import fetch from "node-fetch";
import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';

const app = express();
const port = 3000;
const apiKey = "sqg9bhb3rfi24i8ynvr00mbdgqjl70"; // Keep secure

// --- Database Setup ---
const dbPath = './users.db';
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error opening database", err.message);
    } else {
        console.log("Connected to the SQLite database.");
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            points INTEGER DEFAULT 0
        )`, (err) => {
            if (err) {
                console.error("Error creating table", err.message);
            } else {
                console.log("Users table ready.");
            }
        });
    }
});
const saltRounds = 10;

// --- Middleware ---
app.use(express.static("."));
app.use(express.json());

// --- Routes ---

// Existing Product Info Route
app.post("/get-product-info", async (req, res) => {
    // ... existing product info logic ...
    const { barcode } = req.body;
    const apiUrl = `https://api.barcodelookup.com/v3/products?barcode=${barcode}&key=${apiKey}`;

    try {
        const response = await fetch(apiUrl);
        // ... (keep existing product info logic) ...
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
        } else { // Handle other potential non-200 statuses
            res.status(response.status).json({ error: `API Error: ${response.statusText}` });
        }
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Existing Registration Route
app.post("/register", async (req, res) => {
    // ... existing registration logic ...
    const { name, password } = req.body;

    if (!name || !password) {
        return res.status(400).json({ error: "Name and password are required" });
    }

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert user into the database
        const sql = `INSERT INTO users (name, password, points) VALUES (?, ?, ?)`;
        db.run(sql, [name, hashedPassword, 0], function (err) { // Use function() to access this.lastID
            if (err) {
                if (err.message.includes("UNIQUE constraint failed: users.name")) {
                    console.error("Registration error:", err.message);
                    return res.status(409).json({ error: "Username already exists" }); // 409 Conflict
                } else {
                    console.error("Database insert error:", err.message);
                    return res.status(500).json({ error: "Database error during registration" });
                }
            }
            console.log(`User ${name} registered with ID: ${this.lastID}`);
            res.status(201).json({ message: "Registration successful", userId: this.lastID }); // 201 Created
        });

    } catch (error) {
        console.error("Server registration error:", error);
        res.status(500).json({ error: "Server error during registration process" });
    }
});

// --- New Login Route ---
app.post("/login", (req, res) => {
    const { name, password } = req.body;

    if (!name || !password) {
        return res.status(400).json({ error: "Name and password are required" });
    }

    const sql = `SELECT * FROM users WHERE name = ?`;

    db.get(sql, [name], async (err, user) => { // Use async here for await bcrypt.compare
        if (err) {
            console.error("Database select error:", err.message);
            return res.status(500).json({ error: "Database error during login" });
        }

        if (!user) {
            // User not found
            console.log(`Login attempt failed: User '${name}' not found.`);
            return res.status(401).json({ error: "Invalid credentials" }); // Use 401 Unauthorized for both user not found and wrong password for security
        }

        // User found, compare passwords
        try {
            const match = await bcrypt.compare(password, user.password);

            if (match) {
                // Passwords match - Login successful
                console.log(`User '${name}' logged in successfully.`);
                // Send back user info (excluding password)
                res.status(200).json({
                    message: "Login successful",
                    name: user.name,
                    points: user.points
                    // IMPORTANT: Do NOT send the password hash back to the client
                });
            } else {
                // Passwords don't match
                console.log(`Login attempt failed: Incorrect password for user '${name}'.`);
                return res.status(401).json({ error: "Invalid credentials" });
            }
        } catch (compareError) {
            console.error("Error comparing password:", compareError);
            return res.status(500).json({ error: "Server error during login process" });
        }
    });
});


// --- Start Server ---
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

// --- Graceful Shutdown ---
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Closed the database connection.');
        process.exit(0);
    });
});