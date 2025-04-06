import express from "express";
import fetch from "node-fetch";
import sqlite3 from 'sqlite3'; // Needs to be imported
import bcrypt from 'bcrypt';   // Needs to be imported
import path from 'path';       // <-- Added for path joining
import { fileURLToPath } from 'url'; // <-- Added for __dirname in ES modules
import fs from 'fs';           // <-- Added for file system checks

console.log("--- Script starting ---");

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log(`SCRIPT_DIR (__dirname): ${__dirname}`); // Log directory

const app = express();
// *** Using Port 3001 ***
const port = process.env.PORT || 3001; // Use environment variable or default
const apiKey = process.env.BARCODE_API_KEY || "sqg9bhb3rfi24i8ynvr00mbdgqjl70"; // Use environment variable or default

// --- Database Setup ---
// Use path.join to create a reliable path relative to the script directory
const dbPath = path.join(__dirname, 'users.db');
console.log(`ATTEMPTING DB PATH: ${dbPath}`); // Log full path being used

// Check if file exists before trying to open
if (fs.existsSync(dbPath)) {
    console.log(`CONFIRMED: File exists at ${dbPath}`);
} else {
    // Log contents of the directory for debugging if file not found
    try {
        const filesInDir = fs.readdirSync(__dirname);
        console.error(`ERROR: File NOT FOUND at ${dbPath}. Files in ${__dirname}:`, filesInDir);
    } catch (readdirErr) {
        console.error(`ERROR: File NOT FOUND at ${dbPath}. Also failed to read directory ${__dirname}:`, readdirErr);
    }
    // Decide if you want to exit if the DB file is essential and not found
    // console.error("FATAL: Database file not found. Exiting.");
    // process.exit(1);
}

// Attempt to open the database connection
// Using explicit flags for clarity and potentially creating the file if it doesn't exist
let db; // Declare db variable here
try {
    db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
        if (err) {
            // Log the full error object for detailed diagnostics
            console.error("FATAL: Error opening database", err);
            // Consider exiting if the database connection is critical for startup
            // process.exit(1);
        } else {
            console.log("Database connection opened successfully (or file created).");
            // Create the users table if it doesn't exist - only after successful connection
            db.run(`CREATE TABLE IF NOT EXISTS users (
                name TEXT PRIMARY KEY NOT NULL,
                password TEXT NOT NULL,
                points INTEGER DEFAULT 0
            )`, (tableErr) => {
                if (tableErr) {
                    console.error("Error creating users table", tableErr.message);
                } else {
                    console.log("Users table checked/created successfully.");
                }
            });
        }
    });
} catch (error) {
    console.error("FATAL: Exception caught during database initialization.", error);
    // process.exit(1);
}

const saltRounds = 10; // For bcrypt hashing

// --- Middleware ---
// Apply JSON parsing middleware globally FIRST
app.use(express.json());
console.log("JSON Middleware configured.");

// --- Routes ---  *** MOVED BEFORE STATIC FILES ***
console.log("Defining route handlers...");

// Product Info Route
app.post("/get-product-info", async (req, res) => {
    console.log("Received request for /get-product-info");
    const { barcode } = req.body;
    if (!barcode) { console.log("-> Barcode missing"); return res.status(400).json({ error: 'Barcode is required' }); }
    const apiUrl = `https://api.barcodelookup.com/v3/products?barcode=${barcode}&key=${apiKey}`;
    console.log(`-> Calling Barcode API: ${apiUrl}`);
    try {
        const apiResponse = await fetch(apiUrl);
        console.log(`-> Barcode API responded with status: ${apiResponse.status}`);
        if (apiResponse.ok) {
            const data = await apiResponse.json();
            if (data.products && data.products.length > 0) {
                const product = data.products[0];
                console.log(`-> Found product: ${product.title}`);
                res.json({ name: product.title || "N/A", energyEfficiency: product.description || "N/A", pic: product.images && product.images.length > 0 ? product.images[0] : null });
            } else { console.log("-> No product data found in API response"); res.status(404).json({ error: "No product data found for this barcode" }); }
        } else {
            let errorPayload = { error: `API Error: ${apiResponse.statusText}` };
            try { const errorData = await apiResponse.json(); if (errorData && errorData.message) { errorPayload.error = errorData.message; } } catch (parseError) { /* Ignore */ }
            console.error("-> Barcode API Error:", apiResponse.status, errorPayload);
            res.status(apiResponse.status).json(errorPayload);
        }
    } catch (error) { console.error("-> Error fetching product data:", error); res.status(500).json({ error: "Internal Server Error fetching product info" }); }
});

// Registration Route
app.post("/register", async (req, res) => {
    console.log("Received request for /register");
    const { name, password } = req.body;
    if (!name || !password) { console.log("-> Name or password missing"); return res.status(400).json({ error: "Name and password are required" }); }
    if (password.length < 4) { console.log("-> Password too short"); return res.status(400).json({ error: "Password must be at least 4 characters long" }); }
    if (!db) { console.error("-> DB not initialized for registration"); return res.status(500).json({ error: "Database connection not ready" }); } // Check if DB exists

    try {
        console.log(`-> Hashing password for user: ${name}`);
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const sql = `INSERT INTO users (name, password, points) VALUES (?, ?, ?)`; // SQLite uses ?
        console.log("-> Executing SQL for registration");
        db.run(sql, [name, hashedPassword, 0], function (err) {
            if (err) {
                if (err.message.includes("UNIQUE constraint failed") || err.message.includes("PRIMARY KEY must be unique")) { console.log(`-> Registration failed: Username '${name}' already exists.`); return res.status(409).json({ error: "Username already exists" }); }
                else { console.error("-> Database insert error during registration:", err.message); return res.status(500).json({ error: "Database error during registration" }); }
            }
            console.log(`-> User ${name} registered successfully.`);
            res.status(201).json({ message: "Registration successful" });
        });
    } catch (error) { console.error("-> Server registration error:", error); res.status(500).json({ error: "Server error during registration process" }); }
});

// Login Route
app.post("/login", (req, res) => {
    console.log("Received request for /login");
    const { name, password } = req.body;
    if (!name || !password) { console.log("-> Name or password missing"); return res.status(400).json({ error: "Name and password are required" }); }
    if (!db) { console.error("-> DB not initialized for login"); return res.status(500).json({ error: "Database connection not ready" }); } // Check if DB exists

    const sql = `SELECT name, password, points FROM users WHERE name = ?`; // SQLite uses ?
    console.log(`-> Executing SQL for login check for user: ${name}`);
    db.get(sql, [name], async (err, user) => {
        if (err) { console.error("-> Database select error during login:", err.message); return res.status(500).json({ error: "Database error during login" }); }
        if (!user) { console.log(`-> Login attempt failed: User '${name}' not found.`); return res.status(401).json({ error: "Invalid credentials" }); }
        try {
            console.log(`-> Comparing password for user: ${name}`);
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                console.log(`-> User '${name}' logged in successfully.`);
                res.status(200).json({ message: "Login successful", name: user.name, points: user.points });
            } else { console.log(`-> Login attempt failed: Incorrect password for user '${name}'.`); return res.status(401).json({ error: "Invalid credentials" }); }
        } catch (compareError) { console.error("-> Error comparing password:", compareError); return res.status(500).json({ error: "Server error during login process" }); }
    });
});

// Add Point Route - *** Corrected: Was mistakenly duplicated as /register before ***
app.post("/add-point", (req, res) => {
    console.log("Received request for /add-point");
    const { name } = req.body;
    if (!name) { console.log("-> User name missing"); return res.status(400).json({ error: "User name not provided" }); }
    if (!db) { console.error("-> DB not initialized for add-point"); return res.status(500).json({ error: "Database connection not ready" }); } // Check if DB exists

    console.log(`-> Attempting to add point for user: ${name}`);
    db.serialize(() => { // Use serialize for ordered execution if needed, though maybe not strictly necessary here
        db.run('BEGIN TRANSACTION');
        const updateSql = `UPDATE users SET points = points + 1 WHERE name = ?`; // SQLite uses ?
        console.log("-> Executing SQL for point update");
        db.run(updateSql, [name], function (err) {
            if (err) { console.error("-> Database update points error:", err.message); db.run('ROLLBACK'); return res.status(500).json({ error: "Database error updating points" }); }
            if (this.changes === 0) { console.log(`-> Add point failed: User '${name}' not found for update.`); db.run('ROLLBACK'); return res.status(404).json({ error: "User not found" }); }
            console.log("-> Point update successful, fetching new total");
            const selectSql = `SELECT points FROM users WHERE name = ?`; // SQLite uses ?
            db.get(selectSql, [name], (selectErr, row) => {
                if (selectErr) { console.error("-> Database select error after point update:", selectErr.message); db.run('ROLLBACK'); return res.status(500).json({ error: "Database error retrieving updated points" }); }
                if (!row) { console.error("-> Inconsistency: User found for update but not for select immediately after."); db.run('ROLLBACK'); return res.status(500).json({ error: "User data inconsistency" }); }
                db.run('COMMIT', (commitErr) => {
                    if (commitErr) { console.error("-> Database commit error:", commitErr.message); return res.status(500).json({ error: "Database commit error" }); }
                    console.log(`-> Point added for user '${name}'. New total: ${row.points}`);
                    res.status(200).json({ message: "Point added successfully", newPoints: row.points });
                });
            });
        });
    });
});


// Leaderboard Route
app.get("/leaderboard", (req, res) => {
    console.log("==== Received request for /leaderboard ====");
    if (!db) { console.error("-> DB not initialized for leaderboard"); return res.status(500).json({ error: "Database connection not ready" }); } // Check if DB exists

    const sql = `SELECT name, points FROM users ORDER BY points DESC LIMIT 5`;
    console.log("-> Executing SQL for leaderboard");
    db.all(sql, [], (err, rows) => { // SQLite uses [] for params if none
        if (err) {
            console.error("-> Database error fetching leaderboard:", err.message);
            return res.status(500).json({ error: "Database error fetching leaderboard" });
        }
        console.log(`-> Leaderboard query successful, found ${rows ? rows.length : 0} users.`);
        res.status(200).json(rows);
    });
});

console.log("Route handlers defined.");


// --- Static Files Middleware --- *** MOVED AFTER ROUTES ***
// Serve static files from the directory containing script.js
app.use(express.static(__dirname));
console.log(`Static file Middleware configured to serve from: ${__dirname}`);


// --- Start Server ---
console.log(`Attempting to start server on port ${port}`);
app.listen(port, () => {
    console.log(`\n=== Server listening at http://localhost:${port} ===`); // Should show 3001
    console.log(`=== OR Azure URL if deployed ===`);
    console.log("Ready for requests.\n");
});

// --- Graceful Shutdown ---
process.on('SIGINT', () => {
    console.log('\nGracefully shutting down from SIGINT (Ctrl+C)');
    if (db) { // Check if db was successfully initialized
        db.close((err) => {
            if (err) {
                console.error("Error closing database connection:", err.message);
            } else {
                console.log('Database connection closed.');
            }
            process.exit(err ? 1 : 0);
        });
    } else {
        process.exit(0); // Exit cleanly if db wasn't initialized
    }
});

console.log("--- Script execution finished setting up ---");
