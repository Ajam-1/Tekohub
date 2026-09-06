const params = new URLSearchParams(window.location.search);

const appId = params.get("id");

const API_URL = "https://tekohub.onrender.com";

let currentApp = null;
let selectedRating = 0;


// ================================
// CHECK APP ID
// ================================

if (!appId) {

    alert("No app was selected.");

    window.location.href = "exp.html";

}


// ================================
// LOAD APP
// ================================

async function loadApp() {

    try {

        const response = await fetch(
            `${API_URL}/api/apps/${appId}`
        );

        const data = await response.json();

        if (!response.ok) {

            throw new Error(
                data.message || "Failed to load app."
            );

        }

        const app = data.app;

        currentApp = app;


        // ================================
        // APP INFORMATION
        // ================================

        document.querySelector("#app-name").textContent =
            app.name;

        document.querySelector("#rating").textContent =
            `⭐ ${app.rating || 0}`;

        document.querySelector("#downloads").textContent =
            `${app.downloads || 0} downloads`;

        document.querySelector("#dev-name").textContent =
            `By ${app.developer}`;

      document.querySelector("#version").textContent =
    `Version: ${app.version}`;

document.querySelector("#size").textContent =
    `Size: ${app.size || "Unknown"}`;

document.querySelector("#des").textContent =
    app.description;


        // ================================
        // DOWNLOAD
        // ================================

        const downloadButton =
            document.querySelector("#download-app");

        downloadButton.href =
            `${API_URL}/api/apps/${appId}/download`;


       // ================================
// APP LOGO
// ================================

const mainImage =
    document.querySelector(".icon-image img");

if (app.logo) {

    mainImage.src =
        `${API_URL}${app.logo}`;

    mainImage.style.display = "block";

} else {

    mainImage.style.display = "none";

}


        // ================================
        // SCREENSHOTS
        // ================================

        const screenshotImages =
            document.querySelectorAll(".abt-images img");

        screenshotImages.forEach(function(image, index) {

            if (app.screenshots[index]) {

                image.src =
                    `${API_URL}${app.screenshots[index]}`;

                image.style.display = "block";

            } else {

                image.style.display = "none";

            }

        });


        // ================================
        // LOAD REVIEWS
        // ================================

        loadReviews();


    } catch (error) {

        console.error(
            "Error loading app:",
            error
        );

        document.querySelector("#app-name").textContent =
            "App could not be loaded";

        alert(error.message);

    }

}


// ================================
// STAR RATING
// ================================

const stars =
    document.querySelectorAll("#stars span");

stars.forEach(function(star) {

    star.addEventListener("click", function() {

        selectedRating =
            Number(star.dataset.rating);


        stars.forEach(function(item) {

            const rating =
                Number(item.dataset.rating);

            if (rating <= selectedRating) {

                item.textContent = "★";

            } else {

                item.textContent = "☆";

            }

        });


        document.querySelector("#rating-message").textContent =
            `You selected ${selectedRating} star${selectedRating > 1 ? "s" : ""}`;

    });

});


// ================================
// SUBMIT REVIEW
// ================================

const submitReview =
    document.querySelector("#sumbit-review");

submitReview.addEventListener("click", async function(event) {

    event.preventDefault();


    // ================================
    // CHECK LOGIN
    // ================================

    const token =
        localStorage.getItem("token");

    if (!token) {

        alert(
            "You must be logged in to submit a review."
        );

        window.location.href =
            `login.html?returnTo=app.html?id=${appId}`;

        return;

    }


    // ================================
    // CHECK RATING
    // ================================

    if (selectedRating === 0) {

        alert("Please select a star rating.");

        return;

    }


    // ================================
    // GET COMMENT
    // ================================

    const textarea =
        document.querySelector(".textbox-area textarea");

    const comment =
        textarea.value.trim();


    if (comment === "") {

        alert("Please write a review.");

        return;

    }


    try {

        const response = await fetch(
            `${API_URL}/api/apps/${appId}/reviews`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },

                body: JSON.stringify({

                    rating: selectedRating,

                    comment: comment

                })

            }
        );


        const data =
            await response.json();


        if (!response.ok) {

            if (response.status === 401) {

                localStorage.removeItem("token");

                alert(
                    "Your login session has expired."
                );

                window.location.href =
                    `login.html?returnTo=app.html?id=${appId}`;

                return;

            }


            alert(
                data.message ||
                "Failed to submit review."
            );

            return;

        }


        alert(
            "Review submitted successfully!"
        );


        // ================================
        // CLEAR FORM
        // ================================

        textarea.value = "";

        selectedRating = 0;


        stars.forEach(function(star) {

            star.textContent = "☆";

        });


        document.querySelector("#rating-message").textContent =
            "Select a rating";


        // ================================
        // RELOAD REVIEWS
        // ================================

        loadReviews();


    } catch (error) {

        console.error(
            "Submit review error:",
            error
        );

        alert(
            "Could not connect to the Tekohub server."
        );

    }

});


// ================================
// LOAD REVIEWS
// ================================

async function loadReviews() {

    try {

        const response = await fetch(
            `${API_URL}/api/apps/${appId}/reviews`
        );

        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Failed to load reviews."
            );

        }


        // ================================
        // UPDATE RATING SUMMARY
        // ================================

        const reviews = data.reviews;

        let totalRating = 0;


        reviews.forEach(function(review) {

            totalRating += review.rating;

        });


        let averageRating = 0;


        if (reviews.length > 0) {

            averageRating =
                totalRating / reviews.length;

        }


        document.querySelector("#average-rating").textContent =
            averageRating.toFixed(1);


        document.querySelector("#review-count").textContent =
            `${reviews.length} reviews`;


        document.querySelector("#rating").textContent =
            `⭐ ${averageRating.toFixed(1)}`;


        // ================================
        // RATING BREAKDOWN
        // ================================

        const ratingCounts = {

            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0

        };


        reviews.forEach(function(review) {

            ratingCounts[review.rating]++;

        });


        const ratingRows =
            document.querySelectorAll(".rating-row");


        ratingRows.forEach(function(row) {

            const ratingNumber =
                Number(row.children[0].textContent);


            const count =
                ratingCounts[ratingNumber];


            let percentage = 0;


            if (reviews.length > 0) {

                percentage =
                    (count / reviews.length) * 100;

            }


            const fill =
                row.querySelector(".rating-fill");


            fill.style.width =
                `${percentage}%`;

        });


        // ================================
        // DISPLAY REVIEWS
        // ================================

        const reviewsList =
            document.querySelector("#reviews-list");

        reviewsList.innerHTML = "";


        if (reviews.length === 0) {

            reviewsList.innerHTML =
                "<p>No reviews yet. Be the first to review this app!</p>";

            return;

        }


        reviews.forEach(function(review) {

            const reviewCard =
                document.createElement("div");

            reviewCard.className =
                "review-card";


            const reviewStars =
                "★".repeat(review.rating) +
                "☆".repeat(5 - review.rating);


            const date =
                new Date(review.createdAt)
                    .toLocaleDateString();


            reviewCard.innerHTML = `

                <div class="review-top">

                    <div class="review-user">

                        <div class="user-avatar">

                            ${review.username
                                .charAt(0)
                                .toUpperCase()}

                        </div>

                        <div>

                            <h3>
                                ${review.username}
                            </h3>

                            <p class="review-date">
                                ${date}
                            </p>

                        </div>

                    </div>


                    <div class="review-rating">

                        ${reviewStars}

                    </div>

                </div>


                <p class="review-text">

                    ${review.comment}

                </p>

            `;


            reviewsList.appendChild(reviewCard);

        });


    } catch (error) {

        console.error(
            "Load reviews error:",
            error
        );

    }

}


// ================================
// START
// ================================

loadApp();