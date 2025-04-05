async function handleRegister(event) {
    event.preventDefault(); // Prevent default form submission

    const form = event.target;
    const name = form.name.value;
    const password = form.password.value;
    const messageElement = document.getElementById('registerMessage');
    messageElement.textContent = ''; // Clear previous messages

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: name, password: password })
        });

        const result = await response.json();

        if (response.ok) {
            messageElement.textContent = 'Registration successful!';
            messageElement.style.color = 'green';
            form.reset(); // Clear the form
        } else {
            messageElement.textContent = `Registration failed: ${result.error}`;
            messageElement.style.color = 'red';
        }
    } catch (error) {
        console.error("Client-side registration error:", error);
        messageElement.textContent = 'An error occurred during registration.';
        messageElement.style.color = 'red';
    }
}

// Add an event listener to the form after the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    if (registerForm) { // Check if the form exists
        registerForm.addEventListener('submit', handleRegister);
    } else {
        console.error("Register form not found");
    }




});