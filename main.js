function getElement(id) {
    return document.getElementById(id);
}

// --- Toggle Auth Forms ---
function toggleAuthForms() {
    getElement("loginSection").classList.toggle("hidden");
    getElement("registerSection").classList.toggle("hidden");
    const link = getElement("toggleAuthLink");
    const loginMsg = getElement("loginMessage");
    const registerMsg = getElement("registerMessage");

    if (getElement("loginSection").classList.contains("hidden")) {
        link.textContent = "Already have an account? Login.";
        if (loginMsg) loginMsg.textContent = "";
    } else {
        link.textContent = "Need to Register?";
        if (registerMsg) registerMsg.textContent = "";
    }
}

// --- Registration Handler (Fixed duplicate response) ---
async function handleRegister(event) {
    event.preventDefault();
    const form = event.target;
    const name = form.name.value;
    const password = form.password.value;
    const messageElement = getElement("registerMessage");
    if (!messageElement) return;
    messageElement.textContent = "Registering...";
    messageElement.style.color = "black";

    if (password.length < 4) {
        messageElement.textContent =
            "Password must be at least 4 characters long";
        messageElement.style.color = "red";
        return;
    }

    try {
        // Use relative path for API call
        const response = await fetch("/register", {
            // Use relative path
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name, password: password }),
        });
        const result = await response.json();
        if (response.ok) {
            messageElement.textContent =
                "Registration successful! Please login.";
            messageElement.style.color = "green";
            form.reset();
            toggleAuthForms(); // Switch to login form
        } else {
            messageElement.textContent = `Registration failed: ${
                result.error || response.statusText || "Unknown server error"
            }`;
            messageElement.style.color = "red";
        }
    } catch (error) {
        console.error("Client-side registration error:", error);
        messageElement.textContent = "An error occurred (check console).";
        messageElement.style.color = "red";
    }
}

// --- Login Handler (Reverted API path) ---
async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const name = form.name.value;
    const password = form.password.value;
    const messageElement = getElement("loginMessage");
    const authContainer = getElement("authContainer");
    const loggedInView = getElement("loggedInView");

    if (!messageElement || !authContainer || !loggedInView) return;
    messageElement.textContent = "Logging in...";
    messageElement.style.color = "black";

    try {
        // Use relative path for API call
        const response = await fetch("/login", {
            // Use relative path
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name, password: password }),
        });
        const result = await response.json();

        if (response.ok) {
            // Status 200-299
            authContainer.classList.add("hidden"); // Hide login form
            loggedInView.classList.remove("hidden"); // Show dashboard

            // Populate user info
            getElement("user-name-display").textContent = result.name || "User";
            getElement("user-points-display").textContent =
                result.points !== undefined ? result.points : "0";

            // Fetch leaderboard
            await fetchLeaderboard();

            form.reset();
            messageElement.textContent = ""; // Clear login message
        } else {
            messageElement.textContent = `Login failed: ${
                result.error || response.statusText || "Invalid credentials"
            }`;
            messageElement.style.color = "red";
            loggedInView.classList.add("hidden"); // Ensure dashboard is hidden
        }
    } catch (error) {
        console.error("Client-side login error:", error);
        messageElement.textContent =
            "An error occurred during login (check console).";
        messageElement.style.color = "red";
        loggedInView.classList.add("hidden");
    }
}

// --- Logout Handler (Modified) ---
function handleLogout() {
    const authContainer = getElement("authContainer");
    const loggedInView = getElement("loggedInView");
    const loginMessageElement = getElement("loginMessage");

    if (!authContainer || !loggedInView) return;

    // Hide dashboard, show auth container
    loggedInView.classList.add("hidden");
    authContainer.classList.remove("hidden");

    // Reset forms and messages
    getElement("loginForm").reset();
    getElement("registerForm").reset();
    if (loginMessageElement) {
        loginMessageElement.textContent = "Logged out.";
        loginMessageElement.style.color = "black";
        setTimeout(() => {
            if (loginMessageElement) loginMessageElement.textContent = "";
        }, 3000);
    }
    getElement("registerMessage").textContent = "";

    // Ensure login form is visible and registration is hidden on logout
    if (getElement("registerSection").classList.contains("hidden") == false) {
        toggleAuthForms(); // If register was visible, toggle back to login
    }

    console.log("User logged out");
}

// --- Leaderboard Fetching (Reverted API path) ---
async function fetchLeaderboard() {
    const listElement = getElement("leaderboard-list");
    if (!listElement) return;
    listElement.innerHTML = "<li>Loading...</li>"; // Clear previous entries

    try {
        // Use relative path for API call
        const response = await fetch("/leaderboard"); // Use relative path
        if (!response.ok) {
            // Throw error with status text to be caught below
            const errorText = await response.text(); // Get error text from server if available
            throw new Error(
                `HTTP error! status: ${response.status} - ${response.statusText} - ${errorText}`
            );
        }
        const leaders = await response.json();

        listElement.innerHTML = ""; // Clear loading message
        if (leaders && leaders.length > 0) {
            leaders.forEach((leader) => {
                const li = document.createElement("li");
                // Display name and points separately for potential styling
                li.innerHTML = `<span>${leader.name}</span><span>${leader.points} Pts</span>`;
                listElement.appendChild(li);
            });
        } else {
            listElement.innerHTML = "<li>Leaderboard is empty.</li>";
        }
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        listElement.innerHTML = `<li>Error loading leaderboard. ${
            error.message ? `(${error.message})` : ""
        }</li>`;
    }
}

// --- Event Listeners Setup ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM fully loaded");

    const registerForm = getElement("registerForm");
    const loginForm = getElement("loginForm");
    const logoutButton = getElement("logoutButton");
    const toggleLink = getElement("toggleAuthLink");
    const recycleButton = getElement("recycle-button");
    const recycleLogo = getElement("recycle-logo"); // Get logo element

    if (registerForm) registerForm.addEventListener("submit", handleRegister);
    if (loginForm) loginForm.addEventListener("submit", handleLogin);
    if (logoutButton) logoutButton.addEventListener("click", handleLogout);
    if (toggleLink)
        toggleLink.addEventListener("click", (e) => {
            e.preventDefault();
            toggleAuthForms();
        });

    // --- ADDED Hover Listeners for Recycle Button ---
    if (recycleButton && recycleLogo) {
        recycleButton.addEventListener("mouseenter", () => {
            recycleLogo.classList.add("spin-logo"); // Add class on hover over button
        });
        recycleButton.addEventListener("mouseleave", () => {
            recycleLogo.classList.remove("spin-logo"); // Remove class when mouse leaves button
        });
        console.log("Recycle button hover listeners attached.");
    }

    // Initial state: Ensure loggedInView is hidden
    getElement("loggedInView").classList.add("hidden");
    getElement("authContainer").classList.remove("hidden");
    // Ensure register section starts hidden
    getElement("registerSection").classList.add("hidden");

    console.log("Initial state set, listeners attached.");
});
