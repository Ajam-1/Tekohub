const submitForm = document.querySelector("#login-form");

const usernameInput = document.querySelector("#username");
const passwordInput = document.querySelector("#password");

submitForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (username === "" || password === "") {
        alert("Please enter both username and password.");
        return;
    }

    try {

        const response = await fetch("https://tekohub.onrender.com/api/login", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        const data = await response.json();

        if (response.ok) {

            // Save the login token
            localStorage.setItem("token", data.token);

            alert("Login successful!");

            // For now, go to the home page
            window.location.href = "teko.html";

        } else {

            alert(data.message);

        }

    } catch (error) {

        console.error("Login error:", error);

        alert("Could not connect to the Tekohub server.");

    }

});