// --- Helper Function ---
function getElement(id) { return document.getElementById(id); }

// --- Toggle Auth Forms ---
function toggleAuthForms() {
    getElement('loginSection').classList.toggle('hidden');
    getElement('registerSection').classList.toggle('hidden');
    const link = getElement('toggleAuthLink');
    const loginMsg = getElement('loginMessage');
    const registerMsg = getElement('registerMessage');
    if (getElement('loginSection').classList.contains('hidden')) {
        link.textContent = 'Already have an account? Login.';
        if (loginMsg) loginMsg.textContent = '';
    } else {
        link.textContent = 'Need to Register?';
        if (registerMsg) registerMsg.textContent = '';
    }
}

// --- Registration Handler ---
async function handleRegister(event) {
    event.preventDefault();
    const form = event.target;
    const name = form.name.value;
    const password = form.password.value;
    const messageElement = getElement('registerMessage');
    if (!messageElement) return;
    messageElement.textContent = 'Registering...';
    messageElement.style.color = 'black';
    if (password.length < 4) { messageElement.textContent = 'Password must be at least 4 characters long'; messageElement.style.color = 'red'; return; }
    try {
        const response = await fetch('/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name, password: password }) });
        const result = await response.json();
        if (response.ok) { messageElement.textContent = 'Registration successful! Please login.'; messageElement.style.color = 'green'; form.reset(); toggleAuthForms(); }
        else { messageElement.textContent = `Registration failed: ${result.error || response.statusText || 'Unknown server error'}`; messageElement.style.color = 'red'; }
    } catch (error) { console.error("Client-side registration error:", error); messageElement.textContent = 'An error occurred (check console).'; messageElement.style.color = 'red'; }
}

// --- Login Handler ---
async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const name = form.name.value;
    const password = form.password.value;
    const messageElement = getElement('loginMessage');
    const authContainer = getElement('authContainer');
    const loggedInView = getElement('loggedInView');
    const dormSelectDropdown = getElement('dorm-select'); // Get dorm dropdown for potential initial setting
    const dormPointsDisplay = getElement('dorm-points-display'); // Get dorm points display

    if (!messageElement || !authContainer || !loggedInView) return;
    messageElement.textContent = 'Logging in...'; messageElement.style.color = 'black';
    try {
        const response = await fetch('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name, password: password }) });
        const result = await response.json();
        if (response.ok) {
            authContainer.classList.add('hidden'); loggedInView.classList.remove('hidden');
            getElement('user-name-display').textContent = result.name || 'User';
            getElement('user-points-display').textContent = result.points !== undefined ? result.points : '0';

            // Reset leaderboard to user view on login and fetch
            currentLeaderboardType = 'user';
            const userButton = getElement('toggleUserLeaderboard');
            const dormButton = getElement('toggleDormLeaderboard');
            if (userButton) userButton.classList.add('active');
            if (dormButton) dormButton.classList.remove('active');
            // Fetch leaderboard (will now handle dummy user data correctly)
            await fetchLeaderboard();

            // Trigger dorm points update based on current selection after login
            if (dormSelectDropdown) {
                handleDormChange({ target: dormSelectDropdown });
            }


            form.reset(); messageElement.textContent = '';
        } else { messageElement.textContent = `Login failed: ${result.error || response.statusText || 'Invalid credentials'}`; messageElement.style.color = 'red'; loggedInView.classList.add('hidden'); }
    } catch (error) { console.error("Client-side login error:", error); messageElement.textContent = 'An error occurred during login (check console).'; messageElement.style.color = 'red'; loggedInView.classList.add('hidden'); }
}

// --- Logout Handler ---
function handleLogout() {
    const authContainer = getElement('authContainer');
    const loggedInView = getElement('loggedInView');
    const loginMessageElement = getElement('loginMessage');
    if (!authContainer || !loggedInView) return;
    loggedInView.classList.add('hidden'); authContainer.classList.remove('hidden');
    getElement('loginForm').reset(); getElement('registerForm').reset();
    if (loginMessageElement) { loginMessageElement.textContent = 'Logged out.'; loginMessageElement.style.color = 'black'; setTimeout(() => { if (loginMessageElement) loginMessageElement.textContent = ''; }, 3000); }
    getElement('registerMessage').textContent = '';
    if (getElement('registerSection').classList.contains('hidden') == false) { toggleAuthForms(); }
    console.log("User logged out");
    // Optionally reset dorm points display on logout
    const dormPointsDisplay = getElement('dorm-points-display');
    if (dormPointsDisplay) dormPointsDisplay.textContent = '...'; // Or 0 or empty
}

// --- Leaderboard Fetching ---
// Default leaderboard type
let currentLeaderboardType = 'user';
let currentDormLeaderboardData = []; // Store fetched dorm data

async function fetchLeaderboard() {
    const listElement = getElement('leaderboard-list');
    if (!listElement) return;
    listElement.innerHTML = ''; // Clear previous content

    console.log(`Updating leaderboard view for type: ${currentLeaderboardType}`);
    const dormSelectDropdown = getElement('dorm-select'); // Get dropdown to potentially trigger update

    if (currentLeaderboardType === 'user') {
        // --- Directly insert dummy user data for 'Per User' view ---
        console.log("-> Populating with static dummy user data.");
        const dummyUserData = [
            { name: "Alice Smith", points: 1250 },
            { name: "Bob Johnson", points: 1100 },
            { name: "Charlie Brown", points: 980 },
            { name: "Diana Prince", points: 850 },
            { name: "Ethan Hunt", points: 720 }
        ];

        if (dummyUserData.length > 0) {
            dummyUserData.forEach(leader => {
                const li = document.createElement('li');
                li.innerHTML = `<span>${leader.name}</span><span>${leader.points} Pts</span>`;
                listElement.appendChild(li);
            });
        } else {
            listElement.innerHTML = `<li>Dummy user leaderboard is empty.</li>`; // Fallback
        }
        // --- End dummy user data insertion ---

        // --- ADDED: Trigger dorm points update even when showing user list ---
        if (dormSelectDropdown) {
            handleDormChange({ target: dormSelectDropdown });
        }
        // --- End Added ---

    } else if (currentLeaderboardType === 'dorm') {
        // --- Fetch dorm data dynamically ---
        const endpoint = '/leaderboard/dorm';
        listElement.innerHTML = '<li>Loading dorm data...</li>'; // Show loading state for dorms
        console.log(`Workspaceing leaderboard from: ${endpoint}`);
        try {
            const response = await fetch(endpoint);
            if (!response.ok) { const errorText = await response.text(); throw new Error(`HTTP error! status: ${response.status} - ${response.statusText} - ${errorText}`); }
            const leaders = await response.json();
            listElement.innerHTML = ''; // Clear loading message

            // Store the fetched dorm data for later use
            currentDormLeaderboardData = leaders;
            // Trigger update of profile dorm points based on current selection
            if (dormSelectDropdown) {
                handleDormChange({ target: dormSelectDropdown });
            }

            if (leaders && leaders.length > 0) {
                leaders.forEach(leader => {
                    const li = document.createElement('li');
                    li.innerHTML = `<span>${leader.name}</span><span>${leader.points} Pts</span>`;
                    listElement.appendChild(li);
                });
            } else {
                listElement.innerHTML = `<li>Leaderboard (dorm) is empty.</li>`;
            }
        } catch (error) {
            console.error(`Error fetching dorm leaderboard:`, error);
            listElement.innerHTML = `<li>Error loading dorm leaderboard. ${error.message ? `(${error.message})` : ''}</li>`;
            currentDormLeaderboardData = []; // Clear data on error
            // Still try to update dorm points display (might show 0 or fallback)
            if (dormSelectDropdown) {
                handleDormChange({ target: dormSelectDropdown });
            }
        }
        // --- End dorm data fetching ---
    } else {
        // Fallback for unknown type
        listElement.innerHTML = `<li>Unknown leaderboard type: ${currentLeaderboardType}</li>`;
        // Also trigger update here in case needed
        if (dormSelectDropdown) {
            handleDormChange({ target: dormSelectDropdown });
        }
    }
}


// --- Leaderboard Toggle Handler ---
function handleLeaderboardToggle(event) {
    const userButton = getElement('toggleUserLeaderboard');
    const dormButton = getElement('toggleDormLeaderboard');
    const clickedButton = event.target;

    if (!userButton || !dormButton || !clickedButton) return;

    if (clickedButton === userButton && currentLeaderboardType !== 'user') {
        console.log("Switching to User Leaderboard");
        currentLeaderboardType = 'user';
        userButton.classList.add('active');
        dormButton.classList.remove('active');
        fetchLeaderboard(); // Fetch new data (will now show dummy users)
    } else if (clickedButton === dormButton && currentLeaderboardType !== 'dorm') {
        console.log("Switching to Dorm Leaderboard");
        currentLeaderboardType = 'dorm';
        dormButton.classList.add('active');
        userButton.classList.remove('active');
        fetchLeaderboard(); // Fetch new data (will fetch dorms)
    }
}

// --- Handle Redeem Button Click ---
function handleRedeemClick(event) {
    const button = event.target;
    const cost = parseInt(button.getAttribute('data-cost'), 10);
    const rewardName = button.getAttribute('data-reward');
    const userPointsElement = getElement('user-points-display');
    const messageElement = getElement('redeemMessage');
    let currentPoints = 0;
    if (messageElement) messageElement.textContent = ''; // Clear previous message
    if (userPointsElement) { currentPoints = parseInt(userPointsElement.textContent, 10) || 0; }
    console.log(`Attempting to redeem ${rewardName} for ${cost} points. User has ${currentPoints} points.`);
    if (currentPoints >= cost) {
        // TODO: Add backend call here to verify and deduct points
        console.log(`Redeemed ${rewardName}!`);
        if (messageElement) {
            messageElement.textContent = `Successfully redeemed ${rewardName}!`;
            messageElement.style.color = 'green';
        }
        // Simulate point deduction on frontend (REMOVE THIS when backend is implemented)
        const newPoints = currentPoints - cost;
        if (userPointsElement) userPointsElement.textContent = newPoints;
        // Consider visually updating button state if needed
        // button.disabled = true; button.textContent = 'Redeemed';
    } else {
        console.log(`Not enough points to redeem ${rewardName}.`);
        if (messageElement) {
            messageElement.textContent = `Not enough points for ${rewardName}.`;
            messageElement.style.color = 'red';
        }
    }
    if (messageElement) setTimeout(() => { messageElement.textContent = ''; }, 4000); // Clear message
}


// --- CORRECTED function to handle dorm selection changes ---
function handleDormChange(event) {
    const selectedDorm = event.target.value; // This comes from the HTML option value e.g., "Founders"
    const dormPointsDisplay = getElement('dorm-points-display');

    if (!dormPointsDisplay) return; // Exit if the display element isn't found

    let points = 0; // Default to 0

    // Try using the fetched data first (currentDormLeaderboardData)
    // This lookup requires the 'name' property in the fetched data to match the HTML 'value'
    if (currentDormLeaderboardData && currentDormLeaderboardData.length > 0) {
        // IMPORTANT: This assumes the backend data ALSO gets fixed to use names matching the dropdown values
        const dormData = currentDormLeaderboardData.find(dorm => dorm.name === selectedDorm);
        if (dormData) {
            points = dormData.points;
            console.log(`Points found in fetched data for ${selectedDorm}: ${points}`);
        } else {
            // If not found in fetched data, THEN use static fallback
            console.warn(`Dorm "${selectedDorm}" not found in fetched data, using static fallback.`);
            // *** Use static fallback with keys matching HTML option values ***
            const staticDormPointsData = {
                "Kreischer": 1250,       // Key matches <option value="Kreischer">
                "Founders": 1500,        // Key matches <option value="Founders">
                "Offenhaur": 1100,       // Key matches <option value="Offenhaur">
                "Falcon Heights": 950,  // Key matches <option value="Falcon Heights">
                "Mcdonald": 800,        // Key matches <option value="Mcdonald">
                "Conklin": 0            // Key matches <option value="Conklin">
                // Ensure points values here are desired placeholders
            };
            points = staticDormPointsData[selectedDorm] !== undefined ? staticDormPointsData[selectedDorm] : 0; // Default to 0 if not in fallback either
        }
    } else {
        // If fetched data is empty, use static fallback
        console.warn("Dorm leaderboard data not yet fetched or empty, using static fallback for points display.");
        // *** Use static fallback with keys matching HTML option values ***
        const staticDormPointsData = {
            "Kreischer": 1250,       // Key matches <option value="Kreischer">
            "Founders": 1500,        // Key matches <option value="Founders">
            "Offenhaur": 1100,       // Key matches <option value="Offenhaur">
            "Falcon Heights": 950,  // Key matches <option value="Falcon Heights">
            "Mcdonald": 800,        // Key matches <option value="Mcdonald">
            "Conklin": 0            // Key matches <option value="Conklin">
            // Ensure points values here are desired placeholders
        };
        points = staticDormPointsData[selectedDorm] !== undefined ? staticDormPointsData[selectedDorm] : 0; // Default to 0 if not in fallback either
    }


    console.log(`Final points determined for ${selectedDorm}: ${points}`); // Log final points

    // Update the text content of the span
    dormPointsDisplay.textContent = points;
}


// --- Event Listeners Setup ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded");
    // Existing listeners...
    const registerForm = getElement('registerForm');
    const loginForm = getElement('loginForm');
    const logoutButton = getElement('logoutButton');
    const toggleLink = getElement('toggleAuthLink');
    const recycleButton = getElement('recycle-button');
    const recycleLogo = getElement('recycle-logo');
    const userLeaderboardToggle = getElement('toggleUserLeaderboard');
    const dormLeaderboardToggle = getElement('toggleDormLeaderboard');
    const dormSelectDropdown = getElement('dorm-select'); // Get the dorm dropdown
    const dormPointsDisplay = getElement('dorm-points-display'); // Get dorm points display element


    if (registerForm) registerForm.addEventListener('submit', handleRegister);
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (logoutButton) logoutButton.addEventListener('click', handleLogout);
    if (toggleLink) toggleLink.addEventListener('click', (e) => { e.preventDefault(); toggleAuthForms(); });
    if (recycleButton && recycleLogo) {
        recycleButton.addEventListener('mouseenter', () => { recycleLogo.classList.add('spin-logo'); });
        recycleButton.addEventListener('mouseleave', () => { recycleLogo.classList.remove('spin-logo'); });
        console.log("Recycle button hover listeners attached.");
    }
    if (userLeaderboardToggle) userLeaderboardToggle.addEventListener('click', handleLeaderboardToggle);
    if (dormLeaderboardToggle) dormLeaderboardToggle.addEventListener('click', handleLeaderboardToggle);

    // --- ADDED Listener for Dorm Dropdown Change ---
    if (dormSelectDropdown) {
        dormSelectDropdown.addEventListener('change', handleDormChange);
        console.log("Attached listener to dorm dropdown.");
    }
    // --- End Added Listener ---

    // Existing Listeners for Redeem Buttons
    const redeemButtons = document.querySelectorAll('.redeem-button');
    redeemButtons.forEach(button => { button.addEventListener('click', handleRedeemClick); });
    console.log(`Attached listeners to ${redeemButtons.length} redeem buttons.`);

    // Initial state...
    getElement('loggedInView').classList.add('hidden');
    getElement('authContainer').classList.remove('hidden');
    getElement('registerSection').classList.add('hidden');

    if (userLeaderboardToggle) userLeaderboardToggle.classList.add('active');
    if (dormLeaderboardToggle) dormLeaderboardToggle.classList.remove('active');

    // Set initial dorm points display based on default dropdown or stored value if applicable
    if (dormSelectDropdown && dormPointsDisplay) {
        // Trigger change event on load to set initial points based on default selection
        // This uses the fallback static data until dorm leaderboard is loaded
        handleDormChange({ target: dormSelectDropdown });
    }


    console.log("Initial state set, listeners attached.");
});