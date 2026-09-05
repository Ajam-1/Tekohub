const appCards = document.querySelectorAll(".trending-card");
const searchInput = document.querySelector("#search-input");

searchInput.addEventListener("keydown", function(event){

     if (event.key === "Enter") {

        console.log("Enter was pressed!");

    

 const searchTerm = searchInput.value.toLowerCase();

        console.log(searchTerm);

        if (searchTerm === ""){
return;
}

        // Go to search page ONLY when Enter is pressed
        window.location.href = `search.html?q=${encodeURIComponent(searchTerm)}`;

     }
});

// ========================================
// LOAD HOMEPAGE APPS
// ========================================

const trendingContainer =
    document.querySelector(".trending");

async function loadHomepageApps() {

    try {

        const response =
            await fetch("http://localhost:3000/api/apps");

        if (!response.ok) {
            throw new Error("Failed to load apps");
        }

        const data = await response.json();

        const apps = data.apps;

        // Sort newest apps first
        apps.sort(function(a, b) {
            return new Date(b.createdAt) -
                   new Date(a.createdAt);
        });

        // Show only the first 3 apps
        const homepageApps =
            apps.slice(0, 3);

        displayHomepageApps(homepageApps);

    } catch (error) {

        console.error(
            "Error loading homepage apps:",
            error
        );

        trendingContainer.innerHTML =
            "<p>Unable to load apps.</p>";
    }
}


// ========================================
// DISPLAY HOMEPAGE APPS
// ========================================

function displayHomepageApps(apps) {

    trendingContainer.innerHTML = "";

    if (apps.length === 0) {

        trendingContainer.innerHTML =
            "<p>No apps available yet.</p>";

        return;
    }

    apps.forEach(function(app) {

        const card =
            document.createElement("div");

        card.className =
            "trending-card";

        card.innerHTML = `

            <div class="trending-card-img">

                ${
                    app.logo
                    ? `<img
                        src="http://localhost:3000${app.logo}"
                        alt="${app.name} logo"
                      >`
                    : `<div class="app-placeholder">
                        ${app.name.charAt(0).toUpperCase()}
                       </div>`
                }

                <div class="trwords">

                    <p>${app.name}</p>

                    <a href="app.html?id=${app._id}">
                        Install
                    </a>

                </div>

            </div>

        `;

        trendingContainer.appendChild(card);

    });
}


// ========================================
// START
// ========================================

loadHomepageApps();
