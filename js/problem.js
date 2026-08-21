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

    const {
        data: {
            session
        }
    } = await supabaseClient.auth.getSession();


    const userArea =
        document.getElementById("userArea");


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


    document
        .getElementById("logoutButton")
        .addEventListener(
            "click",
            logout
        );

}


// ========================================
// LOGOUT
// ========================================

async function logout() {

    await supabaseClient.auth.signOut();

    window.location.href =
        "login.html";

}


// ========================================
// LOAD PROBLEM
// ========================================

async function loadProblem() {

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


        // ==============================
        // DISPLAY PROBLEM
        // ==============================

        problemTitle.textContent =
            problem.title;


        problemCategory.textContent =
            problem.category || "ทั่วไป";


        problemDescription.textContent =
            problem.description ||
            "ไม่มีรายละเอียด";


        problemSymptoms.textContent =
            problem.symptoms ||
            "ไม่มีข้อมูล";


        problemCauses.textContent =
            problem.causes ||
            "ไม่มีข้อมูล";


        // ==============================
        // LOAD SOLUTIONS
        // ==============================

        await loadSolutions();


        // ==============================
        // SHOW
        // ==============================

        loading.style.display =
            "none";

        problemDetail.style.display =
            "block";

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


    solutionList.innerHTML = "";


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
                    ${solution.step_number}

                </div>


                <h3>

                    ${escapeHtml(
                        solution.title
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

    loading.style.display =
        "none";

    problemDetail.style.display =
        "none";

    errorMessage.textContent =
        text;

    errorMessage.style.display =
        "block";

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