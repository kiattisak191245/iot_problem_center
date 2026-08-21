// ==================================================
// IoT Problem Center - INDEX.JS
// ==================================================

let allProblems = [];
let currentCategory = "all";
let solutionStepCount = 0;


// ==================================================
// DOM
// ==================================================

const userArea =
    document.getElementById("userArea");

const problemList =
    document.getElementById("problemList");

const loading =
    document.getElementById("loading");

const noResult =
    document.getElementById("noResult");

const searchInput =
    document.getElementById("searchInput");

const submitProblemModal =
    document.getElementById("submitProblemModal");

const closeSubmitModal =
    document.getElementById("closeSubmitModal");

const submitSolutions =
    document.getElementById("submitSolutions");

const addSubmitSolutionButton =
    document.getElementById("addSubmitSolutionButton");

const submitProblemForm =
    document.getElementById("submitProblemForm");


// ==================================================
// ESCAPE HTML
// ==================================================

function escapeHtml(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value ?? "";

    return div.innerHTML;
}


// ==================================================
// CHECK LOGIN
// ==================================================

async function checkLogin() {

    if (!userArea) {

        console.error(
            "ไม่พบ #userArea"
        );

        return;

    }


    try {

        const {
            data: { session },
            error
        } =
            await supabaseClient.auth.getSession();


        if (error) {

            console.error(
                "ตรวจสอบ Session ไม่สำเร็จ:",
                error
            );

            return;

        }


        // ==================================================
        // ยังไม่ได้ Login
        // ==================================================

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


        // ==================================================
        // LOGIN แล้ว
        // ==================================================

        const user =
            session.user;


        const email =
            user.email ||
            "ผู้ใช้งาน";


        console.log(
            "USER UUID:",
            user.id
        );


        // ==================================================
        // ตรวจสอบ ADMIN
        // ==================================================

        let isAdmin = false;


        const {
            data: profile,
            error: profileError
        } =
            await supabaseClient

                .from("profiles")

                .select(`
                    role
                `)

                .eq(
                    "id",
                    user.id
                )

                .maybeSingle();


        if (profileError) {

            console.error(
                "ตรวจสอบ Admin ไม่สำเร็จ:",
                profileError
            );

        }


        if (
            profile &&
            profile.role === "admin"
        ) {

            isAdmin = true;

        }


        console.log(
            "IS ADMIN:",
            isAdmin
        );


        // ==================================================
        // สร้าง NAVBAR
        // ==================================================

        let adminButton = "";


        if (isAdmin) {

            adminButton = `

                <a
                    href="dashboard.html"
                    class="add-button"
                    style="
                        text-decoration:none;
                        display:inline-block;
                    "
                >
                    🛠 Admin Dashboard
                </a>

            `;

        }


        userArea.innerHTML = `

            <span class="user-email">

                👤 ${escapeHtml(email)}

            </span>


            ${adminButton}


            <button
                id="submitProblemButton"
                class="add-button"
                type="button"
            >
                + ส่งปัญหา / วิธีแก้ไข
            </button>


            <button
                id="logoutButton"
                class="logout-button"
                type="button"
            >
                ออกจากระบบ
            </button>

        `;


        // ==================================================
        // ปุ่มส่งปัญหา
        // ==================================================

        const submitButton =
            document.getElementById(
                "submitProblemButton"
            );


        if (submitButton) {

            submitButton.addEventListener(
                "click",
                openSubmitModal
            );

        }


        // ==================================================
        // LOGOUT
        // ==================================================

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
            "CHECK LOGIN ERROR:",
            error
        );

    }

}


// ==================================================
// OPEN MODAL
// ==================================================

function openSubmitModal() {

    if (!submitProblemModal) {

        return;

    }


    submitProblemModal.style.display =
        "flex";

}


// ==================================================
// CLOSE MODAL
// ==================================================

function closeSubmitProblemModal() {

    if (!submitProblemModal) {

        return;

    }


    submitProblemModal.style.display =
        "none";

}


if (closeSubmitModal) {

    closeSubmitModal.addEventListener(
        "click",
        closeSubmitProblemModal
    );

}


if (submitProblemModal) {

    submitProblemModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                submitProblemModal
            ) {

                closeSubmitProblemModal();

            }

        }
    );

}


// ==================================================
// LOGOUT
// ==================================================

async function logout() {

    const {
        error
    } =
        await supabaseClient.auth.signOut();


    if (error) {

        alert(
            "ออกจากระบบไม่สำเร็จ: " +
            error.message
        );

        return;

    }


    window.location.href =
        "login.html";

}


// ==================================================
// LOAD PROBLEMS
// ==================================================

async function loadProblems() {

    if (!problemList) {

        return;

    }


    if (loading) {

        loading.style.display =
            "block";

    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient

                .from("problems")

                .select(`
                    id,
                    title,
                    description,
                    category,
                    symptoms,
                    causes,
                    status,
                    created_by,
                    created_at
                `)

                .eq(
                    "status",
                    "published"
                )

                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (error) {

            throw error;

        }


        allProblems =
            data || [];


        renderProblems();

    }

    catch (error) {

        console.error(
            "โหลด Problems ไม่สำเร็จ:",
            error
        );


        problemList.innerHTML = `

            <div class="no-result">

                ❌ ไม่สามารถโหลดข้อมูลได้

                <br><br>

                ${escapeHtml(
                    error.message
                )}

            </div>

        `;

    }

    finally {

        if (loading) {

            loading.style.display =
                "none";

        }

    }

}


// ==================================================
// RENDER
// ==================================================

function renderProblems() {

    if (!problemList) {

        return;

    }


    const search =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";


    const filtered =
        allProblems.filter(
            problem => {


                const title =
                    problem.title || "";


                const description =
                    problem.description || "";


                const symptoms =
                    problem.symptoms || "";


                const matchSearch =

                    !search

                    ||

                    title
                        .toLowerCase()
                        .includes(search)

                    ||

                    description
                        .toLowerCase()
                        .includes(search)

                    ||

                    symptoms
                        .toLowerCase()
                        .includes(search);


                const matchCategory =

                    currentCategory === "all"

                    ||

                    problem.category ===
                    currentCategory;


                return (
                    matchSearch &&
                    matchCategory
                );

            }
        );


    problemList.innerHTML = "";


    if (
        filtered.length === 0
    ) {

        if (noResult) {

            noResult.style.display =
                "block";

        }

        return;

    }


    if (noResult) {

        noResult.style.display =
            "none";

    }


    filtered.forEach(
        problem => {


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "problem-card";


            card.innerHTML = `

                <span class="problem-category">

                    ${escapeHtml(
                        problem.category ||
                        "ทั่วไป"
                    )}

                </span>


                <h3>

                    ${escapeHtml(
                        problem.title ||
                        "ไม่มีชื่อปัญหา"
                    )}

                </h3>


                <p>

                    ${escapeHtml(
                        problem.description ||
                        "ไม่มีรายละเอียด"
                    )}

                </p>


                <span class="problem-link">

                    ดูวิธีแก้ไข →

                </span>

            `;


            card.addEventListener(
                "click",
                () => {

                    window.location.href =
                        `problem.html?id=${problem.id}`;

                }
            );


            problemList.appendChild(
                card
            );

        }
    );

}


// ==================================================
// SEARCH
// ==================================================

if (searchInput) {

    searchInput.addEventListener(
        "input",
        renderProblems
    );

}


// ==================================================
// CATEGORY
// ==================================================

document
    .querySelectorAll(
        ".category-button"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {


                    document
                        .querySelectorAll(
                            ".category-button"
                        )
                        .forEach(
                            btn => {

                                btn.classList.remove(
                                    "active"
                                );

                            }
                        );


                    button.classList.add(
                        "active"
                    );


                    currentCategory =
                        button.dataset.category;


                    renderProblems();

                }
            );

        }
    );


// ==================================================
// SOLUTION STEP
// ==================================================

function addSolutionStep() {

    if (!submitSolutions) {

        return;

    }


    solutionStepCount++;


    const step =
        document.createElement(
            "div"
        );


    step.className =
        "solution-step";


    step.innerHTML = `

        <div class="solution-step-header">

            <h4>
                ขั้นตอนที่ ${solutionStepCount}
            </h4>

            <button
                type="button"
                class="remove-step"
            >
                ลบ
            </button>

        </div>


        <label>
            หัวข้อขั้นตอน
        </label>

        <input
            type="text"
            class="submit-solution-title"
            placeholder="เช่น ตรวจสอบสาย USB"
            required
        >


        <label>
            รายละเอียดวิธีแก้ไข
        </label>

        <textarea
            class="submit-solution-description"
            rows="4"
            placeholder="อธิบายวิธีแก้ไข"
        ></textarea>

    `;


    step
        .querySelector(
            ".remove-step"
        )
        .addEventListener(
            "click",
            () => {

                step.remove();

                renumberSteps();

            }
        );


    submitSolutions.appendChild(
        step
    );

}


// ==================================================
// RENUMBER
// ==================================================

function renumberSteps() {

    if (!submitSolutions) {

        return;

    }


    const steps =
        submitSolutions.querySelectorAll(
            ".solution-step"
        );


    steps.forEach(
        (step, index) => {

            const number =
                index + 1;


            const heading =
                step.querySelector(
                    "h4"
                );


            if (heading) {

                heading.textContent =
                    `ขั้นตอนที่ ${number}`;

            }

        }
    );


    solutionStepCount =
        steps.length;

}


// ==================================================
// ADD FIRST STEP
// ==================================================

if (submitSolutions) {

    addSolutionStep();

}


if (addSubmitSolutionButton) {

    addSubmitSolutionButton.addEventListener(
        "click",
        addSolutionStep
    );

}


// ==================================================
// SUBMIT PROBLEM
// ==================================================

if (submitProblemForm) {

    submitProblemForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const submitButton =
                document.getElementById(
                    "submitButton"
                );


            const submitMessage =
                document.getElementById(
                    "submitMessage"
                );


            try {

                if (submitButton) {

                    submitButton.disabled =
                        true;

                    submitButton.textContent =
                        "กำลังส่งข้อมูล...";

                }


                // ==========================================
                // GET CURRENT USER
                // ==========================================

                const {
                    data: {
                        user
                    },
                    error: userError
                } =
                    await supabaseClient.auth.getUser();


                if (
                    userError ||
                    !user
                ) {

                    throw new Error(
                        "กรุณาเข้าสู่ระบบก่อนส่งข้อมูล"
                    );

                }


                console.log(
                    "SUBMIT USER UUID:",
                    user.id
                );


                // ==========================================
                // FORM
                // ==========================================

                const title =
                    document
                        .getElementById(
                            "submitTitle"
                        )
                        .value
                        .trim();


                const description =
                    document
                        .getElementById(
                            "submitDescription"
                        )
                        .value
                        .trim();


                const category =
                    document
                        .getElementById(
                            "submitCategory"
                        )
                        .value;


                const symptoms =
                    document
                        .getElementById(
                            "submitSymptoms"
                        )
                        .value
                        .trim();


                const causes =
                    document
                        .getElementById(
                            "submitCauses"
                        )
                        .value
                        .trim();


                // ==========================================
                // INSERT PROBLEM
                // ==========================================

                const {
                    data: problem,
                    error: problemError
                } =
                    await supabaseClient

                        .from("problems")

                        .insert({

                            title: title,

                            description: description,

                            category: category,

                            symptoms: symptoms,

                            causes: causes,

                            status: "pending",

                            created_by: user.id

                        })

                        .select()

                        .single();


                if (problemError) {

                    throw problemError;

                }


                // ==========================================
                // SOLUTIONS
                // ==========================================

                const steps =
                    submitSolutions
                        ? submitSolutions.querySelectorAll(
                            ".solution-step"
                        )
                        : [];


                const solutionData = [];


                steps.forEach(
                    (step, index) => {


                        const solutionTitle =
                            step
                                .querySelector(
                                    ".submit-solution-title"
                                )
                                .value
                                .trim();


                        const solutionDescription =
                            step
                                .querySelector(
                                    ".submit-solution-description"
                                )
                                .value
                                .trim();


                        if (solutionTitle) {

                            solutionData.push({

                                problem_id:
                                    problem.id,

                                step_number:
                                    index + 1,

                                title:
                                    solutionTitle,

                                description:
                                    solutionDescription,

                                status:
                                    "pending",

                                created_by:
                                    user.id

                            });

                        }

                    }
                );


                // ==========================================
                // INSERT SOLUTIONS
                // ==========================================

                if (
                    solutionData.length > 0
                ) {

                    const {
                        error: solutionError
                    } =
                        await supabaseClient

                            .from("solutions")

                            .insert(
                                solutionData
                            );


                    if (solutionError) {

                        await supabaseClient
                            .from("problems")
                            .delete()
                            .eq(
                                "id",
                                problem.id
                            );


                        throw solutionError;

                    }

                }


                // ==========================================
                // SUCCESS
                // ==========================================

                if (submitMessage) {

                    submitMessage.style.display =
                        "block";

                    submitMessage.className =
                        "submit-message success-message";

                    submitMessage.textContent =
                        "✅ ส่งข้อมูลเรียบร้อยแล้ว รอ Admin ตรวจสอบและอนุมัติ";

                }


                submitProblemForm.reset();


                if (submitSolutions) {

                    submitSolutions.innerHTML = "";

                }


                solutionStepCount = 0;


                if (submitSolutions) {

                    addSolutionStep();

                }


                setTimeout(
                    () => {

                        closeSubmitProblemModal();

                        if (submitMessage) {

                            submitMessage.style.display =
                                "none";

                        }

                    },
                    2000
                );

            }

            catch (error) {

                console.error(
                    "SUBMIT ERROR:",
                    error
                );


                if (submitMessage) {

                    submitMessage.style.display =
                        "block";

                    submitMessage.className =
                        "submit-message error-message";

                    submitMessage.textContent =
                        "❌ ส่งข้อมูลไม่สำเร็จ: " +
                        error.message;

                }

            }

            finally {

                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        "🚀 ส่งปัญหาให้ Admin ตรวจสอบ";

                }

            }

        }
    );

}


// ==================================================
// START
// ==================================================

checkLogin();

loadProblems();