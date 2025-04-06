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
            await fetchLeaderboard(); // Fetch leaderboard on successful login

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
}

// --- Leaderboard Fetching ---
// Default leaderboard type
let currentLeaderboardType = 'user';

async function fetchLeaderboard() {
    const listElement = getElement('leaderboard-list');
    if (!listElement) return;
    listElement.innerHTML = '<li>Loading...</li>'; // Show loading state

    // Determine API endpoint based on currentLeaderboardType
    // NOTE: You'll need to create these backend endpoints (e.g., /leaderboard/user, /leaderboard/dorm)
    const endpoint = currentLeaderboardType === 'dorm' ? '/leaderboard/dorm' : '/leaderboard/user'; // Default to user
    console.log(`Workspaceing leaderboard from: ${endpoint}`);

    try {
        // *** IMPORTANT: Update the fetch URL based on the endpoint ***
        const response = await fetch(endpoint); // Use the dynamic endpoint
        if (!response.ok) { const errorText = await response.text(); throw new Error(`HTTP error! status: ${response.status} - ${response.statusText} - ${errorText}`); }
        const leaders = await response.json();
        listElement.innerHTML = ''; // Clear loading/previous state
        if (leaders && leaders.length > 0) {
            leaders.forEach(leader => {
                const li = document.createElement('li');
                // Adjust display based on leaderboard type if necessary (e.g., show dorm name)
                li.innerHTML = `<span>${leader.name}</span><span>${leader.points} Pts</span>`;
                listElement.appendChild(li);
            });
        } else {
            listElement.innerHTML = `<li>Leaderboard (${currentLeaderboardType}) is empty.</li>`;
        }
    } catch (error) {
        console.error(`Error fetching ${currentLeaderboardType} leaderboard:`, error);
        listElement.innerHTML = `<li>Error loading ${currentLeaderboardType} leaderboard. ${error.message ? `(${error.message})` : ''}</li>`;
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
        fetchLeaderboard(); // Fetch new data
    } else if (clickedButton === dormButton && currentLeaderboardType !== 'dorm') {
        console.log("Switching to Dorm Leaderboard");
        currentLeaderboardType = 'dorm';
        dormButton.classList.add('active');
        userButton.classList.remove('active');
        fetchLeaderboard(); // Fetch new data
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
    const userLeaderboardToggle = getElement('toggleUserLeaderboard'); // Get toggle button
    const dormLeaderboardToggle = getElement('toggleDormLeaderboard'); // Get toggle button

    if (registerForm) registerForm.addEventListener('submit', handleRegister);
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (logoutButton) logoutButton.addEventListener('click', handleLogout);
    if (toggleLink) toggleLink.addEventListener('click', (e) => { e.preventDefault(); toggleAuthForms(); });
    if (recycleButton && recycleLogo) {
        recycleButton.addEventListener('mouseenter', () => { recycleLogo.classList.add('spin-logo'); });
        recycleButton.addEventListener('mouseleave', () => { recycleLogo.classList.remove('spin-logo'); });
        console.log("Recycle button hover listeners attached.");
    }

    // --- ADDED Listener for Leaderboard Toggles ---
    if (userLeaderboardToggle) userLeaderboardToggle.addEventListener('click', handleLeaderboardToggle);
    if (dormLeaderboardToggle) dormLeaderboardToggle.addEventListener('click', handleLeaderboardToggle);

    // --- Existing Listeners for Redeem Buttons ---
    const redeemButtons = document.querySelectorAll('.redeem-button');
    redeemButtons.forEach(button => { button.addEventListener('click', handleRedeemClick); });
    console.log(`Attached listeners to ${redeemButtons.length} redeem buttons.`);

    // Initial state...
    getElement('loggedInView').classList.add('hidden');
    getElement('authContainer').classList.remove('hidden');
    getElement('registerSection').classList.add('hidden');

    // Ensure the default toggle button is active visually
    if (userLeaderboardToggle) userLeaderboardToggle.classList.add('active');
    if (dormLeaderboardToggle) dormLeaderboardToggle.classList.remove('active');

    console.log("Initial state set, listeners attached.");
});