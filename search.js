// ========================================
// TEKOHUB SEARCH
// ========================================

const API_URL = "https://tekohub.onrender.com";


// ========================================
// GET SEARCH TERM
// ========================================

const params =
    new URLSearchParams(window.location.search);

const searchTerm =
    (params.get("q") || "").trim().toLowerCase();


// ========================================
// GET ELEMENTS
// ========================================

const resultsContainer =
    document.querySelector("#results-container");

const noResult =
    document.querySelector("#no-result");

const searchQuery =
    document.querySelector("#search-query");


// ========================================
// SHOW SEARCH TERM
// ========================================

if (searchQuery) {

    searchQuery.textContent =
        "Results for: " +
        (searchTerm || "all apps");

}


// ========================================
// LOAD APPS
// ========================================

async function loadSearchResults() {

    try {

        const response =
            await fetch(`${API_URL}/api/apps`);

        if (!response.ok) {

            throw new Error(
                "Failed to load apps"
            );

        }

        const data =
            await response.json();

        const apps =
            data.apps || [];


        // ========================================
        // FILTER APPS
        // ========================================

        const matchingApps =
            apps.filter(function (app) {

                const name =
                    (app.name || "").toLowerCase();

                const developer =
                    (app.developer || "").toLowerCase();

                const category =
                    (app.category || "").toLowerCase();

                const description =
                    (app.description || "").toLowerCase();


                return (
                    name.includes(searchTerm) ||
                    developer.includes(searchTerm) ||
                    category.includes(searchTerm) ||
                    description.includes(searchTerm)
                );

            });


        // ========================================
        // DISPLAY
        // ========================================

        displaySearchResults(matchingApps);


    } catch (error) {

        console.error(
            "Search error:",
            error
        );

        resultsContainer.innerHTML = `
            <p>
                Unable to load search results.
            </p>
        `;

    }

}


// ========================================
// DISPLAY SEARCH RESULTS
// ========================================

function displaySearchResults(apps) {

    // Remove old hard-coded results
    resultsContainer.innerHTML = "";


    // ========================================
    // NO RESULTS
    // ========================================

    if (apps.length === 0) {

        noResult.style.display = "block";

        return;

    }


    // Hide no-results message
    noResult.style.display = "none";


    // ========================================
    // CREATE APP CARDS
    // ========================================

    apps.forEach(function (app) {

        const result =
            document.createElement("div");

        result.className =
            "result-container";


        // ========================================
        // FORMAT DOWNLOADS
        // ========================================

        let downloads =
            app.downloads || 0;

        if (downloads >= 1000000) {

            downloads =
                (downloads / 1000000).toFixed(1) +
                "M";

        }

        else if (downloads >= 1000) {

            downloads =
                (downloads / 1000).toFixed(1) +
                "K";

        }


        // ========================================
        // APP CARD
        // ========================================

        result.innerHTML = `

            <div class="result-card">

                <div class="search-app-icon">

                    ${
                        app.logo

                        ? `
                            <img
                                src="${API_URL}${app.logo}"
                                alt="${app.name} logo"
                            >
                        `

                        : `
                            <div class="app-placeholder">
                                ${app.name
                                    .charAt(0)
                                    .toUpperCase()}
                            </div>
                        `
                    }

                </div>


                <div class="app-info">

                    <p>
                        ${app.name}
                    </p>

                    <p>
                        ${app.description || "No description available."}
                    </p>

                    <p>
                        ⭐ ${Number(app.rating || 0).toFixed(1)}
                        &nbsp;
                        ${downloads} downloads
                    </p>

                    <p>
                        ${app.category || "Uncategorized"}
                    </p>

                </div>


                <button
                    class="view-app-button"
                    data-id="${app._id}"
                >
                    View App
                </button>

            </div>

        `;


        // ========================================
        // VIEW APP
        // ========================================

        const button =
            result.querySelector(".view-app-button");

        button.addEventListener(
            "click",
            function () {

                const appId =
                    this.dataset.id;

                window.location.href =
                    `app.html?id=${appId}`;

            }
        );


        resultsContainer.appendChild(result);

    });

}


// ========================================
// START SEARCH
// ========================================

loadSearchResults();