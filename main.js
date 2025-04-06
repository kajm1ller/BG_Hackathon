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
        async function fetchLeaderboard() {
            const listElement = getElement('leaderboard-list');
            if (!listElement) return;
            listElement.innerHTML = '<li>Loading...</li>';
            try {
                const response = await fetch('/leaderboard');
                if (!response.ok) { const errorText = await response.text(); throw new Error(`HTTP error! status: ${response.status} - ${response.statusText} - ${errorText}`); }
                const leaders = await response.json();
                listElement.innerHTML = '';
                if (leaders && leaders.length > 0) {
                    leaders.forEach(leader => { const li = document.createElement('li'); li.innerHTML = `<span>${leader.name}</span><span>${leader.points} Pts</span>`; listElement.appendChild(li); });
                } else { listElement.innerHTML = '<li>Leaderboard is empty.</li>'; }
            } catch (error) { console.error("Error fetching leaderboard:", error); listElement.innerHTML = `<li>Error loading leaderboard. ${error.message ? `(${error.message})` : ''}</li>`; }
        }

        // --- Handle Redeem Button Click ---
        function handleRedeemClick(event) {
            const button = event.target;
            const cost = parseInt(button.getAttribute('data-cost'), 10);
            const rewardName = button.getAttribute('data-reward');
            const userPointsElement = getElement('user-points-display');
            const messageElement = getElement('redeemMessage');
            let currentPoints = 0;
            messageElement.textContent = ''; // Clear previous message
            if (userPointsElement) { currentPoints = parseInt(userPointsElement.textContent, 10) || 0; }
            console.log(`Attempting to redeem ${rewardName} for ${cost} points. User has ${currentPoints} points.`);
            if (currentPoints >= cost) {
                // TODO: Add backend call here
                console.log(`Redeemed ${rewardName}!`);
                messageElement.textContent = `Successfully redeemed ${rewardName}!`; messageElement.style.color = 'green';
                // Simulate point deduction on frontend (REMOVE THIS when backend is implemented)
                const newPoints = currentPoints - cost;
                if (userPointsElement) userPointsElement.textContent = newPoints;
                // button.disabled = true; button.textContent = 'Redeemed';
            } else {
                console.log(`Not enough points to redeem ${rewardName}.`);
                messageElement.textContent = `Not enough points for ${rewardName}.`; messageElement.style.color = 'red';
            }
            setTimeout(() => { messageElement.textContent = ''; }, 4000); // Clear message
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
            if (registerForm) registerForm.addEventListener('submit', handleRegister);
            if (loginForm) loginForm.addEventListener('submit', handleLogin);
            if (logoutButton) logoutButton.addEventListener('click', handleLogout);
            if (toggleLink) toggleLink.addEventListener('click', (e) => { e.preventDefault(); toggleAuthForms(); });
            if (recycleButton && recycleLogo) {
                recycleButton.addEventListener('mouseenter', () => { recycleLogo.classList.add('spin-logo'); });
                recycleButton.addEventListener('mouseleave', () => { recycleLogo.classList.remove('spin-logo'); });
                console.log("Recycle button hover listeners attached.");
            }
            // --- ADDED Listeners for Redeem Buttons ---
            const redeemButtons = document.querySelectorAll('.redeem-button');
            redeemButtons.forEach(button => { button.addEventListener('click', handleRedeemClick); });
            console.log(`Attached listeners to ${redeemButtons.length} redeem buttons.`);
            // Initial state...
            getElement('loggedInView').classList.add('hidden');
            getElement('authContainer').classList.remove('hidden');
            getElement('registerSection').classList.add('hidden');
            console.log("Initial state set, listeners attached.");
        });