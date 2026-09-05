
const appsContainer = document.querySelector("#apps");
const filters = document.querySelectorAll(".filter");
const noResults = document.querySelector("#no-results");

let apps = [];

async function loadApps() {

    try {

        const response = await fetch(
            "http://localhost:3000/api/apps"
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to load apps.");
        }

        apps = data.apps;

        displayApps("all");

    } catch (error) {

        console.error("Error loading apps:", error);

        appsContainer.innerHTML = "";
        noResults.textContent = "Could not load apps.";
        noResults.style.display = "block";
    }
}


function displayApps(category) {

    appsContainer.innerHTML = "";

    let filteredApps;

    if (category === "all") {

        filteredApps = apps;

    } else {

        filteredApps = apps.filter(function(app) {

            return app.category.toLowerCase() === category.toLowerCase();

        });

    }


    if (filteredApps.length === 0) {

        noResults.textContent =
            "No apps found in this category.";

        noResults.style.display = "block";

        return;

    }


    noResults.style.display = "none";


    filteredApps.forEach(function(app) {

        const appCard =
            document.createElement("div");

        appCard.className = "app-card";

        appCard.dataset.category =
            app.category.toLowerCase();


        appCard.innerHTML = `

            <div class="app-icon">
                ${app.name.charAt(0).toUpperCase()}
            </div>

            <h2>${app.name}</h2>

            <p>${app.category}</p>

            <span>★ ${app.rating || 0}</span>

            <a
                href="app.html?id=${app._id}"
                class="btn"
            >
                View App
            </a>

        `;


        appsContainer.appendChild(appCard);

    });

}


filters.forEach(function(filter) {

    filter.addEventListener("click", function() {

        filters.forEach(function(button) {

            button.classList.remove("active");

        });


        filter.classList.add("active");


        const category =
            filter.dataset.filter;

        displayApps(category);

    });

});


loadApps();

