// ========================================
// GET PROBLEM ID
// ========================================

const params = new URLSearchParams(
    window.location.search
);

const problemId = params.get("id");


// ========================================
// ELEMENTS
// ========================================

const loading =
    document.getElementById("loading");

const errorMessage =
    document.getElementById("errorMessage");

const problemDetail =
    document.getElementById("problemDetail");

const problemTitle =
    document.getElementById("problemTitle");

const problemCategory =
    document.getElementById("problemCategory");

const problemDescription =
    document.getElementById("problemDescription");

const problemSymptoms =
    document.getElementById("problemSymptoms");

const problemCauses =
    document.getElementById("problemCauses");

const solutionList =
    document.getElementById("solutionList");


// ========================================
// CHECK LOGIN
// ========================================

async function checkLogin() {

    try {

        const {
            data: {
                session
            }
        } = await supabaseClient.auth.getSession();


        const userArea =
            document.getElementById("userArea");


        if (!userArea) {
            return;
        }


        // ==============================
        // NOT LOGIN
        // ==============================

        if (!session) {

            userArea.innerHTML = `

                <a
                    href="login.html"
                    class="login-link"
                >
                    เข้าสู่ระบบ
                </a>

            `;

            return;

        }


        // ==============================
        // LOGIN
        // ==============================

        const email =
            session.user.email;


        userArea.innerHTML = `

            <span class="user-email">

                👤 ${escapeHtml(email)}

            </span>

            <button
                id="logoutButton"
                class="logout-button"
            >
                ออกจากระบบ
            </button>

        `;


        const logoutButton =
            document.getElementById(
                "logoutButton"
            );


        if (logoutButton) {

            logoutButton.addEventListener(
                "click",
                logout
            );

        }

    }

    catch (error) {

        console.error(
            "Check login error:",
            error
        );

    }

}


// ========================================
// LOGOUT
// ========================================

async function logout() {

    try {

        await supabaseClient.auth.signOut();

        window.location.href =
            "login.html";

    }

    catch (error) {

        console.error(
            "Logout error:",
            error
        );

    }

}


// ========================================
// LOAD PROBLEM
// ========================================

async function loadProblem() {

    // ==============================
    // CHECK PROBLEM ID
    // ==============================

    if (!problemId) {

        showError(
            "ไม่พบรหัสปัญหา"
        );

        return;

    }


    try {

        // ==============================
        // GET PROBLEM
        // ==============================

        const {
            data: problem,
            error: problemError
        } = await supabaseClient

            .from("problems")

            .select(`
                id,
                title,
                description,
                category,
                symptoms,
                causes,
                status
            `)

            .eq(
                "id",
                problemId
            )

            .eq(
                "status",
                "published"
            )

            .single();


        if (problemError) {

            throw problemError;

        }


        if (!problem) {

            throw new Error(
                "ไม่พบข้อมูลปัญหา"
            );

        }


        // ==============================
        // DISPLAY TITLE
        // ==============================

        if (problemTitle) {

            problemTitle.textContent =
                problem.title ||
                "ไม่มีชื่อปัญหา";

        }


        // ==============================
        // DISPLAY CATEGORY
        // ==============================

        if (problemCategory) {

            problemCategory.textContent =
                problem.category ||
                "ทั่วไป";

        }


        // ==============================
        // DISPLAY DESCRIPTION
        // ==============================

        if (problemDescription) {

            problemDescription.textContent =
                problem.description ||
                "ไม่มีรายละเอียด";

        }


        // ==============================
        // DISPLAY SYMPTOMS
        // ==============================

        if (problemSymptoms) {

            problemSymptoms.textContent =
                problem.symptoms ||
                "ไม่มีข้อมูล";

        }


        // ==============================
        // DISPLAY CAUSES
        // ==============================

        if (problemCauses) {

            problemCauses.textContent =
                problem.causes ||
                "ไม่มีข้อมูล";

        }


        // ==============================
        // LOAD PROBLEM IMAGES
        // ==============================

        await loadProblemImages();


        // ==============================
        // LOAD SOLUTIONS
        // ==============================

        await loadSolutions();


        // ==============================
        // SHOW PAGE
        // ==============================

        if (loading) {

            loading.style.display =
                "none";

        }


        if (problemDetail) {

            problemDetail.style.display =
                "block";

        }

    }

    catch (error) {

        console.error(
            "Load problem error:",
            error
        );


        showError(
            "ไม่สามารถโหลดข้อมูลปัญหาได้"
        );

    }

}


// ========================================
// LOAD PROBLEM IMAGES
// ========================================

async function loadProblemImages() {

    try {

        // ==============================
        // QUERY problem_images
        // ==============================

        const {
            data: images,
            error
        } = await supabaseClient

            .from("problem_images")

            .select(`
                id,
                problem_id,
                image_url,
                caption,
                created_by,
                created_at
            `)

            .eq(
                "problem_id",
                problemId
            )

            .order(
                "created_at",
                {
                    ascending: true
                }
            );


        // ==============================
        // DATABASE ERROR
        // ==============================

        if (error) {

            console.error(
                "Load problem_images error:",
                error
            );

            return;

        }


        console.log(
            "Problem images:",
            images
        );


        // ==============================
        // FIND CONTAINER
        // ==============================

        let imageContainer =
            document.getElementById(
                "problemImages"
            );


        // ==============================
        // CREATE CONTAINER
        // ==============================

        if (!imageContainer) {

            imageContainer =
                document.createElement(
                    "section"
                );


            imageContainer.id =
                "problemImages";


            imageContainer.style.marginTop =
                "30px";


            imageContainer.style.marginBottom =
                "30px";


            imageContainer.style.width =
                "100%";


            // ==========================
            // INSERT BEFORE SOLUTIONS
            // ==========================

            if (
                solutionList &&
                solutionList.parentNode
            ) {

                solutionList.parentNode.insertBefore(
                    imageContainer,
                    solutionList
                );

            }

            // ==========================
            // OTHERWISE APPEND
            // ==========================

            else if (problemDetail) {

                problemDetail.appendChild(
                    imageContainer
                );

            }

        }


        if (!imageContainer) {

            return;

        }


        // ==============================
        // CLEAR
        // ==============================

        imageContainer.innerHTML = "";


        // ==============================
        // NO IMAGES
        // ==============================

        if (
            !images ||
            images.length === 0
        ) {

            return;

        }


        // ==============================
        // TITLE
        // ==============================

        const heading =
            document.createElement(
                "h2"
            );


        heading.textContent =
            "🖼️ รูปภาพปัญหา";


        heading.style.marginBottom =
            "15px";


        imageContainer.appendChild(
            heading
        );


        // ==============================
        // GRID
        // ==============================

        const imageGrid =
            document.createElement(
                "div"
            );


        imageGrid.style.display =
            "grid";


        imageGrid.style.gridTemplateColumns =
            "repeat(auto-fit, minmax(250px, 1fr))";


        imageGrid.style.gap =
            "20px";


        imageGrid.style.width =
            "100%";


        imageContainer.appendChild(
            imageGrid
        );


        // ==============================
        // LOOP IMAGES
        // ==============================

        images.forEach(
            image => {

                if (!image.image_url) {

                    return;

                }


                // ==========================
                // CARD
                // ==========================

                const card =
                    document.createElement(
                        "div"
                    );


                card.style.width =
                    "100%";


                card.style.boxSizing =
                    "border-box";


                // ==========================
                // IMAGE
                // ==========================

                const img =
                    document.createElement(
                        "img"
                    );


                const imageUrl =
                    getImageUrl(
                        image.image_url
                    );


                console.log(
                    "Image URL:",
                    imageUrl
                );


                img.src =
                    imageUrl;


                img.alt =
                    image.caption ||
                    "รูปภาพปัญหา";


                img.loading =
                    "lazy";


                img.style.display =
                    "block";


                img.style.width =
                    "100%";


                img.style.maxWidth =
                    "100%";


                img.style.height =
                    "auto";


                img.style.maxHeight =
                    "600px";


                img.style.objectFit =
                    "contain";


                img.style.borderRadius =
                    "10px";


                img.style.cursor =
                    "pointer";


                img.style.background =
                    "#f5f5f5";


                // ==========================
                // CLICK
                // ==========================

                img.addEventListener(
                    "click",
                    () => {

                        window.open(
                            imageUrl,
                            "_blank"
                        );

                    }
                );


                // ==========================
                // ERROR
                // ==========================

                img.addEventListener(
                    "error",
                    () => {

                        console.error(
                            "Image failed:",
                            imageUrl
                        );


                        card.innerHTML = `

                            <div
                                style="
                                    padding:20px;
                                    border:1px solid #ddd;
                                    border-radius:10px;
                                    text-align:center;
                                    color:#777;
                                "
                            >

                                ❌ ไม่สามารถโหลดรูปภาพได้

                            </div>

                        `;

                    }
                );


                card.appendChild(
                    img
                );


                // ==========================
                // CAPTION
                // ==========================

                if (image.caption) {

                    const caption =
                        document.createElement(
                            "p"
                        );


                    caption.textContent =
                        image.caption;


                    caption.style.marginTop =
                        "8px";


                    caption.style.marginBottom =
                        "0";


                    caption.style.textAlign =
                        "center";


                    card.appendChild(
                        caption
                    );

                }


                imageGrid.appendChild(
                    card
                );

            }
        );

    }

    catch (error) {

        console.error(
            "Problem image error:",
            error
        );

    }

}


// ========================================
// GET IMAGE URL
// ========================================

function getImageUrl(imageUrl) {

    // ==============================
    // EMPTY
    // ==============================

    if (!imageUrl) {

        return "";

    }


    // ==============================
    // FULL HTTP URL
    // ==============================

    if (
        imageUrl.startsWith(
            "http://"
        ) ||

        imageUrl.startsWith(
            "https://"
        )
    ) {

        return imageUrl;

    }


    // ==============================
    // REMOVE LEADING SLASH
    // ==============================

    let path =
        imageUrl;


    if (
        path.startsWith("/")
    ) {

        path =
            path.substring(1);

    }


    // ==============================
    // IF URL CONTAINS STORAGE PATH
    // ==============================

    const storageMarker =
        "/storage/v1/object/public/problem-images/";


    const markerIndex =
        path.indexOf(
            storageMarker
        );


    if (
        markerIndex !== -1
    ) {

        path =
            path.substring(
                markerIndex +
                storageMarker.length
            );

    }


    // ==============================
    // GET PUBLIC URL
    // ==============================

    const {
        data
    } = supabaseClient.storage

        .from(
            "problem-images"
        )

        .getPublicUrl(
            path
        );


    return data.publicUrl;

}


// ========================================
// LOAD SOLUTIONS
// ========================================

async function loadSolutions() {

    const {
        data: solutions,
        error
    } = await supabaseClient

        .from("solutions")

        .select(`
            id,
            step_number,
            title,
            description,
            status
        `)

        .eq(
            "problem_id",
            problemId
        )

        .eq(
            "status",
            "published"
        )

        .order(
            "step_number",
            {
                ascending: true
            }
        );


    if (error) {

        throw error;

    }


    if (!solutionList) {

        return;

    }


    solutionList.innerHTML = "";


    // ==============================
    // NO SOLUTIONS
    // ==============================

    if (
        !solutions ||
        solutions.length === 0
    ) {

        solutionList.innerHTML = `

            <div class="no-result">

                ยังไม่มีวิธีแก้ไข

            </div>

        `;

        return;

    }


    // ==============================
    // DISPLAY SOLUTIONS
    // ==============================

    solutions.forEach(
        solution => {

            const div =
                document.createElement(
                    "div"
                );


            div.className =
                "solution-card";


            div.innerHTML = `

                <div class="solution-number">

                    ขั้นตอนที่
                    ${escapeHtml(
                        String(
                            solution.step_number ??
                            ""
                        )
                    )}

                </div>

                <h3>

                    ${escapeHtml(
                        solution.title ||
                        ""
                    )}

                </h3>

                <p>

                    ${escapeHtml(
                        solution.description ||
                        ""
                    )}

                </p>

            `;


            solutionList.appendChild(
                div
            );

        }
    );

}


// ========================================
// ERROR
// ========================================

function showError(text) {

    if (loading) {

        loading.style.display =
            "none";

    }


    if (problemDetail) {

        problemDetail.style.display =
            "none";

    }


    if (errorMessage) {

        errorMessage.textContent =
            text;


        errorMessage.style.display =
            "block";

    }

}


// ========================================
// ESCAPE HTML
// ========================================

function escapeHtml(value) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        value ?? "";


    return div.innerHTML;

}


// ========================================
// START
// ========================================

checkLogin();

loadProblem();
