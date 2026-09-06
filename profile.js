const token = localStorage.getItem("token");


// ================================
// CHECK LOGIN
// ================================

if (!token) {

    window.location.href =
        "login.html?returnTo=profile.html";

}


// ================================
// ELEMENTS
// ================================

const usernameDisplay =
    document.querySelector("#username-display");

const profileUsername =
    document.querySelector("#profile-username");

const profileAvatar =
    document.querySelector("#profile-avatar");

const profileDate =
    document.querySelector("#profile-date");

const appCount =
    document.querySelector("#app-count");

const downloadCount =
    document.querySelector("#download-count");

const reviewCount =
    document.querySelector("#review-count");

const appsList =
    document.querySelector("#apps-list");

const reviewsList =
    document.querySelector("#reviews-list");

const deleteModal =
    document.querySelector("#delete-modal");

const deleteAppName =
    document.querySelector("#delete-app-name");

const cancelDelete =
    document.querySelector("#cancel-delete");

const confirmDelete =
    document.querySelector("#confirm-delete");


let selectedAppId = null;


// ================================
// LOAD PROFILE
// ================================

async function loadProfile() {

    try {

        const response = await fetch(
            "https://tekohub.onrender.com/api/me",
            {
                headers: {
                    "Authorization":
                        `Bearer ${token}`
                }
            }
        );


        const data =
            await response.json();


        if (!response.ok || !data.loggedIn) {

            localStorage.removeItem("token");

            window.location.href =
                "login.html?returnTo=profile.html";

            return;

        }


        const user = data.user;


        usernameDisplay.textContent =
            user.username;

        profileUsername.textContent =
            user.username;

        profileAvatar.textContent =
            user.username
                .charAt(0)
                .toUpperCase();


        if (user.createdAt) {

            const date =
                new Date(user.createdAt);

            profileDate.textContent =
                "Member since " +
                date.toLocaleDateString(
                    "en-US",
                    {
                        month: "long",
                        year: "numeric"
                    }
                );

        }


        loadMyApps();

    } catch (error) {

        console.error(
            "Profile error:",
            error
        );

    }

}


// ================================
// LOAD MY APPS
// ================================

async function loadMyApps() {

    try {

        const response = await fetch(
            "https://tekohub.onrender.com/api/apps/my-apps",
            {
                headers: {
                    "Authorization":
                        `Bearer ${token}`
                }
            }
        );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Could not load apps."
            );

        }


        const apps =
            data.apps || [];


        appCount.textContent =
            apps.length;


        let downloads = 0;


        apps.forEach(function(app) {

            downloads +=
                Number(
                    app.downloads || 0
                );

        });


        downloadCount.textContent =
            downloads;


        displayApps(apps);

    } catch (error) {

        console.error(
            "Apps error:",
            error
        );


        appsList.innerHTML = `

            <p class="empty">
                Could not load your apps.
            </p>

        `;

    }

}


// ================================
// DISPLAY APPS
// ================================

function displayApps(apps) {

    appsList.innerHTML = "";


    if (apps.length === 0) {

        appsList.innerHTML = `

            <p class="empty">
                You haven't uploaded any apps yet.
            </p>

        `;

        return;

    }


    apps.forEach(function(app) {

        const card =
            document.createElement("div");

        card.className =
            "app-card";


        let icon;


        if (app.logo) {

            icon = `

                <div class="app-icon">

                    <img
                        src="${getFileURL(app.logo)}"
                        alt="App logo"
                    >

                </div>

            `;

        } else {

            icon = `

                <div class="app-icon">

                    ${app.name
                        .charAt(0)
                        .toUpperCase()}

                </div>

            `;

        }


        card.innerHTML = `

            ${icon}

            <div class="app-details">

                <h3>
                    ${escapeHTML(app.name)}
                </h3>

                <p class="category">
                    ${escapeHTML(
                        app.category || "Unknown"
                    )}
                </p>

                <div class="app-meta">

                    <span>
                        v${escapeHTML(
                            app.version || "1.0.0"
                        )}
                    </span>

                    <span>
                        ↓ ${Number(
                            app.downloads || 0
                        )}
                    </span>

                    <span>
                        ★ ${Number(
                            app.rating || 0
                        )}
                    </span>

                </div>


                <div class="app-actions">

                    <a
                        href="app.html?id=${app._id}"
                        class="view-button"
                    >
                        View
                    </a>

                    <a
                        href="edit.html?id=${app._id}"
                        class="edit-button"
                    >
                        Edit
                    </a>

                    <button
                        class="delete-button"
                        data-id="${app._id}"
                        data-name="${escapeHTML(app.name)}"
                    >
                        Delete
                    </button>

                </div>

            </div>

        `;


        appsList.appendChild(card);

    });


    // DELETE BUTTONS

    document
        .querySelectorAll(".delete-button")
        .forEach(function(button) {

            button.addEventListener(
                "click",
                function() {

                    selectedAppId =
                        button.dataset.id;

                    deleteAppName.textContent =
                        button.dataset.name;

                    deleteModal.classList.add(
                        "show"
                    );

                }
            );

        });

}


// ================================
// CANCEL DELETE
// ================================

cancelDelete.addEventListener(
    "click",
    function() {

        closeDeleteModal();

    }
);


function closeDeleteModal() {

    selectedAppId = null;

    deleteModal.classList.remove(
        "show"
    );

}


// ================================
// DELETE APP
// ================================

confirmDelete.addEventListener(
    "click",
    async function() {

        if (!selectedAppId) {
            return;
        }


        confirmDelete.disabled =
            true;

        confirmDelete.textContent =
            "Deleting...";


        try {

            const response =
                await fetch(
                    `https://tekohub.onrender.com/api/apps/${selectedAppId}`,
                    {
                        method: "DELETE",

                        headers: {
                            "Authorization":
                                `Bearer ${token}`
                        }
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Failed to delete app."
                );

            }


            closeDeleteModal();

            loadMyApps();


        } catch (error) {

            console.error(
                "Delete error:",
                error
            );

            alert(
                error.message ||
                "Could not delete app."
            );

        } finally {

            confirmDelete.disabled =
                false;

            confirmDelete.textContent =
                "Delete";

        }

    }
);


// ================================
// FILE URL
// ================================

function getFileURL(file) {

    if (
        file.startsWith("http://") ||
        file.startsWith("https://")
    ) {

        return file;

    }


    return (
        "https://tekohub.onrender.com" +
        (
            file.startsWith("/")
                ? file
                : "/" + file
        )
    );

}


// ================================
// HTML SECURITY
// ================================

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// ================================
// START
// ================================

loadProfile();