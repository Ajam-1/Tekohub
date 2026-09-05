
// ================================
// TEKOHUB AUTHENTICATION
// ================================


// ================================
// CHECK USER
// ================================

async function getCurrentUser() {

    const token = localStorage.getItem("token");

    if (!token) {
        return null;
    }

    try {

        const response = await fetch(
            "http://localhost:3000/api/me",
            {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {

            localStorage.removeItem("token");

            return null;

        }

        const data = await response.json();

        return data.user;

    } catch (error) {

        console.error(
            "Authentication error:",
            error
        );

        return null;

    }

}


// ================================
// SHOW USER
// ================================

async function setupAuth() {

    const user = await getCurrentUser();

    const usernameDisplay =
        document.querySelector("#username-display");

    const logoutButton =
        document.querySelector("#logout");


    // ================================
    // LOGGED IN
    // ================================

    if (user) {

        if (usernameDisplay) {

            usernameDisplay.textContent =
                user.username;

        }

        if (logoutButton) {

            logoutButton.style.display =
                "inline-block";

            logoutButton.addEventListener(
                "click",
                function () {

                    localStorage.removeItem("token");

                    window.location.href =
                        "login.html";

                }
            );

        }

    }


    // ================================
    // NOT LOGGED IN
    // ================================

    else {

        if (usernameDisplay) {

            usernameDisplay.textContent =
                "Guest";

        }

        if (logoutButton) {

            logoutButton.style.display =
                "none";

        }

    }

}


// ================================
// START AUTHENTICATION
// ================================

setupAuth();

