const signupform = document.getElementById("sign-up-form");

const usernameInput = document.getElementById("username");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirm-password");


signupform.addEventListener("submit", async function (event) {

    event.preventDefault();

    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;


    // ================================
    // EMPTY FIELDS
    // ================================

    if (
        username === "" ||
        email === "" ||
        password === "" ||
        confirmPassword === ""
    ) {
        alert("Please fill in all fields.");
        return;
    }


    // ================================
    // PASSWORD MATCH
    // ================================

    if (password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
    }


    // ================================
    // PASSWORD LENGTH
    // ================================

    if (password.length < 6) {
        alert("Password must be at least 6 characters long.");
        return;
    }


    // ================================
    // PASSWORD LETTER
    // ================================

    if (!/[A-Za-z]/.test(password)) {
        alert("Password must contain at least one letter.");
        return;
    }


    // ================================
    // PASSWORD NUMBER
    // ================================

    if (!/[0-9]/.test(password)) {
        alert("Password must contain at least one number.");
        return;
    }


    // ================================
    // PASSWORD SYMBOL
    // ================================

    if (!/[^A-Za-z0-9]/.test(password)) {
        alert("Password must contain at least one symbol.");
        return;
    }


    // ================================
    // SEND TO SERVER
    // ================================

    try {

        const response = await fetch("https://tekohub.onrender.com/api/signup", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                username: username,
                email: email,
                password: password
            })

        });


        const data = await response.json();


        if (response.ok) {

            alert("Account created successfully!");

            signupform.reset();

            window.location.href = "login.html";

        } else {

            alert(data.message);

        }

    } catch (error) {

        console.error("Signup error:", error);

        alert("Could not connect to the Tekohub server.");

    }

});


// ================================
// GOOGLE SIGN UP
// ================================

const googleSignUpButton = document.getElementById("google-signup");

googleSignUpButton.addEventListener("click", function () {

    window.location.href = "https://accounts.google.com/login";

});


// ================================
// EMAIL SIGN UP
// ================================

const emailSignUpButton = document.getElementById("email-signup");

emailSignUpButton.addEventListener("click", function () {

    window.location.href = "signUp.html";

});