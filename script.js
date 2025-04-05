import express from "express";
import fetch from "node-fetch";
import sqlite3 from 'sqlite3'; // Needs to be imported
import bcrypt from 'bcrypt';   // Needs to be imported

const app = express();
const port = 3000;
const apiKey = "sqg9bhb3rfi24i8ynvr00mbdgqjl70"; // Keep your API key secure

// --- Database Setup ---
const dbPath = './users.db'; // Path to your SQLite database file
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error opening database", err.message);
    } else {
        console.log("Connected to the SQLite database.");
        // Create the users table if it doesn't exist
        // Use TEXT for name PRIMARY KEY for auto-indexing and uniqueness constraint
        db.run(`CREATE TABLE IF NOT EXISTS users (
            name TEXT PRIMARY KEY NOT NULL,
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
const saltRounds = 10; // For bcrypt hashing

// --- Middleware ---
// Serve static files first (like index.html, style.css)
app.use(express.static("."));
// Apply JSON parsing middleware globally for all POST/PUT requests
app.use(express.json());

// --- Routes ---

// Product Info Route (keep as is)
app.post("/get-product-info", async (req, res) => {
    const { barcode } = req.body;
    if (!barcode) {
        return res.status(400).json({ error: 'Barcode is required' });
    }
    const apiUrl = `https://api.barcodelookup.com/v3/products?barcode=${barcode}&key=${apiKey}`;

    try {
        const apiResponse = await fetch(apiUrl); // Renamed to avoid conflict

        if (apiResponse.status === 200) {
            const data = await apiResponse.json();
            if (data.products && data.products.length > 0) {
                const product = data.products[0];
                res.json({
                    name: product.title || "N/A",
                    energyEfficiency: product.description || "N/A", // Using description as efficiency placeholder
                    pic: product.images && product.images.length > 0 ? product.images[0] : null
                });
            } else {
                res.status(404).json({ error: "No product data found for this barcode" });
            }
        } else {
            // Try to parse error from barcode API if possible
            let errorPayload = { error: `API Error: ${apiResponse.statusText}` };
            try {
                const errorData = await apiResponse.json();
                if (errorData && errorData.message) {
                    errorPayload.error = errorData.message;
                }
            } catch (parseError) { /* Ignore parsing error */ }
            console.error("Barcode API Error:", apiResponse.status, errorPayload);
            res.status(apiResponse.status).json(errorPayload);
        }
    } catch (error) {
        console.error("Error fetching product data:", error);
        res.status(500).json({ error: "Internal Server Error fetching product info" });
    }
});

// Registration Route
app.post("/register", async (req, res) => {
    const { name, password } = req.body;

    if (!name || !password) {
        return res.status(400).json({ error: "Name and password are required" });
    }
    if (password.length < 4) { // Basic password length check
        return res.status(400).json({ error: "Password must be at least 4 characters long" });
    }


    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const sql = `INSERT INTO users (name, password, points) VALUES (?, ?, ?)`;

        db.run(sql, [name, hashedPassword, 0], function (err) {
            if (err) {
                if (err.message.includes("UNIQUE constraint failed") || err.message.includes("PRIMARY KEY must be unique")) {
                    console.log(`Registration failed: Username '${name}' already exists.`);
                    return res.status(409).json({ error: "Username already exists" }); // 409 Conflict
                } else {
                    console.error("Database insert error during registration:", err.message);
                    return res.status(500).json({ error: "Database error during registration" });
                }
            }
            console.log(`User ${name} registered successfully.`);
            res.status(201).json({ message: "Registration successful" }); // 201 Created
        });

    } catch (error) {
        console.error("Server registration error:", error);
        res.status(500).json({ error: "Server error during registration process" });
    }
});

// Login Route
app.post("/login", (req, res) => {
    const { name, password } = req.body;

    if (!name || !password) {
        return res.status(400).json({ error: "Name and password are required" });
    }

    const sql = `SELECT name, password, points FROM users WHERE name = ?`;

    db.get(sql, [name], async (err, user) => {
        if (err) {
            console.error("Database select error during login:", err.message);
            return res.status(500).json({ error: "Database error during login" });
        }

        if (!user) {
            console.log(`Login attempt failed: User '${name}' not found.`);
            return res.status(401).json({ error: "Invalid credentials" }); // Generic error for security
        }

        try {
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                console.log(`User '${name}' logged in successfully.`);
                res.status(200).json({
                    message: "Login successful",
                    name: user.name,
                    points: user.points
                    // Never send password hash back
                });
            } else {
                console.log(`Login attempt failed: Incorrect password for user '${name}'.`);
                return res.status(401).json({ error: "Invalid credentials" }); // Generic error
            }
        } catch (compareError) {
            console.error("Error comparing password:", compareError);
            return res.status(500).json({ error: "Server error during login process" });
        }
    });
});

// Add Point Route
app.post("/add-point", (req, res) => {
    // SECURITY NOTE: Identifying user via request body is insecure. Use sessions/tokens.
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ error: "User name not provided" });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        const updateSql = `UPDATE users SET points = points + 1 WHERE name = ?`;

        db.run(updateSql, [name], function (err) {
            if (err) {
                console.error("Database update points error:", err.message);
                db.run('ROLLBACK');
                return res.status(500).json({ error: "Database error updating points" });
            }

            if (this.changes === 0) {
                db.run('ROLLBACK');
                console.log(`Add point failed: User '${name}' not found for update.`);
                return res.status(404).json({ error: "User not found" });
            }

            const selectSql = `SELECT points FROM users WHERE name = ?`;
            db.get(selectSql, [name], (selectErr, row) => {
                if (selectErr) {
                    console.error("Database select error after point update:", selectErr.message);
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: "Database error retrieving updated points" });
                }
                if (!row) { // Should not happen if update worked, but check anyway
                    db.run('ROLLBACK');
                    console.error("Inconsistency: User found for update but not for select immediately after.");
                    return res.status(500).json({ error: "User data inconsistency" });
                }

                db.run('COMMIT', (commitErr) => {
                    if (commitErr) {
                        console.error("Database commit error:", commitErr.message);
                        // State is uncertain, maybe updated but not committed.
                        return res.status(500).json({ error: "Database commit error" });
                    }
                    console.log(`Point added for user '${name}'. New total: ${row.points}`);
                    res.status(200).json({ message: "Point added successfully", newPoints: row.points });
                });
            });
        });
    });
});

// --- Start Server ---
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`); // Log full URL
});

// --- Graceful Shutdown ---
process.on('SIGINT', () => {
    console.log('\nGracefully shutting down from SIGINT (Ctrl+C)');
    db.close((err) => {
        if (err) {
            console.error("Error closing database connection:", err.message);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(err ? 1 : 0);
    });
});