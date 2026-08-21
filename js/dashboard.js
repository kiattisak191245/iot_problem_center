// ==================================================
// ADMIN DASHBOARD
// ==================================================

let allProblems = [];

let currentProblemId = null;


// ==================================================
// ELEMENTS
// ==================================================

const problemTable =
    document.getElementById("problemTable");

const loading =
    document.getElementById("loading");

const adminEmail =
    document.getElementById("adminEmail");

const adminSearch =
    document.getElementById("adminSearch");


// ==================================================
// CHECK ADMIN LOGIN
// ==================================================

async function checkAdmin() {

    const {
        data,
        error
    } =
        await supabaseClient.auth.getSession();


    if (error) {

        console.error(error);

        window.location.href =
            "login.html";

        return false;

    }


    if (!data.session) {

        window.location.href =
            "login.html";

        return false;

    }


    const user =
        data.session.user;


    // แสดง Email
    adminEmail.textContent =
        user.email;


    // ตรวจสอบ Role
    const {
        data: profile,
        error: profileError
    } =
        await supabaseClient
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();


    if (profileError) {

        console.error(profileError);

        alert(
            "ไม่สามารถตรวจสอบสิทธิ์ Admin ได้"
        );

        window.location.href =
            "index.html";

        return false;

    }


    if (profile.role !== "admin") {

        alert(
            "คุณไม่มีสิทธิ์เข้าหน้า Admin"
        );

        window.location.href =
            "index.html";

        return false;

    }


    return true;

}


// ==================================================
// LOAD PROBLEMS
// ==================================================

async function loadProblems() {

    loading.style.display =
        "block";


    problemTable.innerHTML =
        "";


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


        updateStatistics();

        renderProblems();

    }

    catch(error) {

        console.error(
            "โหลด Problems ไม่สำเร็จ:",
            error
        );


        problemTable.innerHTML = `

            <div class="no-result">

                ❌ ไม่สามารถโหลดข้อมูลได้

                <br>

                ${escapeHtml(
                    error.message
                )}

            </div>

        `;

    }

    finally {

        loading.style.display =
            "none";

    }

}


// ==================================================
// STATISTICS
// ==================================================

function updateStatistics() {

    const total =
        allProblems.length;


    const pending =
        allProblems.filter(
            problem =>
                problem.status ===
                "pending"
        ).length;


    const published =
        allProblems.filter(
            problem =>
                problem.status ===
                "published"
        ).length;


    const rejected =
        allProblems.filter(
            problem =>
                problem.status ===
                "rejected"
        ).length;


    document.getElementById(
        "totalProblems"
    ).textContent =
        total;


    document.getElementById(
        "pendingProblems"
    ).textContent =
        pending;


    document.getElementById(
        "publishedProblems"
    ).textContent =
        published;


    document.getElementById(
        "rejectedProblems"
    ).textContent =
        rejected;

}


// ==================================================
// RENDER PROBLEMS
// ==================================================

function renderProblems() {

    const search =
        adminSearch.value
            .trim()
            .toLowerCase();


    const filtered =
        allProblems.filter(
            problem => {

                return (

                    !search ||

                    problem.title
                        ?.toLowerCase()
                        .includes(search)

                    ||

                    problem.description
                        ?.toLowerCase()
                        .includes(search)

                    ||

                    problem.category
                        ?.toLowerCase()
                        .includes(search)

                );

            }
        );


    problemTable.innerHTML =
        "";


    if (
        filtered.length === 0
    ) {

        problemTable.innerHTML = `

            <div class="no-result">

                ไม่พบข้อมูลปัญหา

            </div>

        `;

        return;

    }


    filtered.forEach(
        problem => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "admin-problem-card";


            let statusText =
                "รอตรวจสอบ";


            let statusClass =
                "pending";


            if (
                problem.status ===
                "published"
            ) {

                statusText =
                    "เผยแพร่แล้ว";

                statusClass =
                    "published";

            }


            if (
                problem.status ===
                "rejected"
            ) {

                statusText =
                    "ไม่เผยแพร่";

                statusClass =
                    "rejected";

            }


            card.innerHTML = `

                <div class="admin-problem-info">

                    <span
                        class="problem-category"
                    >
                        ${escapeHtml(
                            problem.category ||
                            "ทั่วไป"
                        )}
                    </span>


                    <h3>

                        ${escapeHtml(
                            problem.title
                        )}

                    </h3>


                    <p>

                        ${escapeHtml(
                            problem.description ||
                            "ไม่มีรายละเอียด"
                        )}

                    </p>


                    <span
                        class="status-badge ${statusClass}"
                    >

                        ${statusText}

                    </span>

                </div>


                <div
                    class="admin-problem-actions"
                >

                    <button
                        class="solution-button"
                        data-id="${problem.id}"
                    >
                        🔧 วิธีแก้ไข
                    </button>


                    <button
                        class="edit-button"
                        data-id="${problem.id}"
                    >
                        ✏️ แก้ไข
                    </button>


                    ${
                        problem.status ===
                        "pending"
                        ?

                        `

                        <button
                            class="approve-button"
                            data-id="${problem.id}"
                        >
                            ✅ อนุมัติ
                        </button>


                        <button
                            class="reject-button"
                            data-id="${problem.id}"
                        >
                            ❌ ไม่อนุมัติ
                        </button>

                        `

                        :

                        ""
                    }


                    ${
                        problem.status ===
                        "published"

                        ?

                        `

                        <button
                            class="reject-button"
                            data-id="${problem.id}"
                        >
                            🚫 ยกเลิกเผยแพร่
                        </button>

                        `

                        :

                        ""
                    }


                    <button
                        class="delete-button"
                        data-id="${problem.id}"
                    >
                        🗑️ ลบ
                    </button>

                </div>

            `;


            problemTable.appendChild(
                card
            );

        }
    );


    // ==================================================
    // BUTTON EVENTS
    // ==================================================

    document
        .querySelectorAll(
            ".approve-button"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        approveProblem(
                            button.dataset.id
                        );

                    }
                );

            }
        );


    document
        .querySelectorAll(
            ".reject-button"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        rejectProblem(
                            button.dataset.id
                        );

                    }
                );

            }
        );


    document
        .querySelectorAll(
            ".delete-button"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        deleteProblem(
                            button.dataset.id
                        );

                    }
                );

            }
        );


    document
        .querySelectorAll(
            ".solution-button"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        openSolutions(
                            button.dataset.id
                        );

                    }
                );

            }
        );


    document
        .querySelectorAll(
            ".edit-button"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        editProblem(
                            button.dataset.id
                        );

                    }
                );

            }
        );

}


// ==================================================
// APPROVE PROBLEM
// ==================================================

async function approveProblem(
    problemId
) {

    const confirmApprove =
        confirm(
            "ต้องการอนุมัติปัญหานี้และเผยแพร่หรือไม่?"
        );


    if (!confirmApprove) {

        return;

    }


    try {

        // =========================================
        // UPDATE PROBLEM
        // =========================================

        const {
            error:
            problemError
        } =
            await supabaseClient
                .from("problems")
                .update({

                    status:
                        "published"

                })
                .eq(
                    "id",
                    problemId
                );


        if (problemError) {

            throw problemError;

        }


        // =========================================
        // UPDATE SOLUTIONS
        // =========================================

        const {
            error:
            solutionError
        } =
            await supabaseClient
                .from("solutions")
                .update({

                    status:
                        "published"

                })
                .eq(
                    "problem_id",
                    problemId
                );


        if (solutionError) {

            throw solutionError;

        }


        alert(
            "✅ อนุมัติและเผยแพร่เรียบร้อยแล้ว"
        );


        await loadProblems();

    }

    catch(error) {

        console.error(error);

        alert(
            "❌ อนุมัติไม่สำเร็จ\n\n" +
            error.message
        );

    }

}


// ==================================================
// REJECT PROBLEM
// ==================================================

async function rejectProblem(
    problemId
) {

    const confirmReject =
        confirm(
            "ต้องการยกเลิก/ไม่อนุมัติปัญหานี้หรือไม่?"
        );


    if (!confirmReject) {

        return;

    }


    try {

        // =========================================
        // PROBLEM
        // =========================================

        const {
            error:
            problemError
        } =
            await supabaseClient
                .from("problems")
                .update({

                    status:
                        "rejected"

                })
                .eq(
                    "id",
                    problemId
                );


        if (problemError) {

            throw problemError;

        }


        // =========================================
        // SOLUTIONS
        // =========================================

        const {
            error:
            solutionError
        } =
            await supabaseClient
                .from("solutions")
                .update({

                    status:
                        "rejected"

                })
                .eq(
                    "problem_id",
                    problemId
                );


        if (solutionError) {

            throw solutionError;

        }


        alert(
            "เปลี่ยนสถานะเป็นไม่เผยแพร่แล้ว"
        );


        await loadProblems();

    }

    catch(error) {

        console.error(error);

        alert(
            "❌ ไม่สามารถเปลี่ยนสถานะได้\n\n" +
            error.message
        );

    }

}


// ==================================================
// DELETE PROBLEM
// ==================================================

async function deleteProblem(
    problemId
) {

    const confirmDelete =
        confirm(
            "⚠️ ต้องการลบปัญหานี้จริงหรือไม่?\n\nวิธีแก้ไขทั้งหมดจะถูกลบด้วย"
        );


    if (!confirmDelete) {

        return;

    }


    try {

        const {
            error
        } =
            await supabaseClient
                .from("problems")
                .delete()
                .eq(
                    "id",
                    problemId
                );


        if (error) {

            throw error;

        }


        alert(
            "🗑️ ลบปัญหาเรียบร้อยแล้ว"
        );


        await loadProblems();

    }

    catch(error) {

        console.error(error);

        alert(
            "❌ ลบไม่สำเร็จ\n\n" +
            error.message
        );

    }

}


// ==================================================
// OPEN SOLUTIONS
// ==================================================

async function openSolutions(
    problemId
) {

    currentProblemId =
        problemId;


    const problem =
        allProblems.find(
            item =>
                String(item.id) ===
                String(problemId)
        );


    if (!problem) {

        return;

    }


    document.getElementById(
        "solutionProblemTitle"
    ).textContent =
        problem.title;


    document.getElementById(
        "solutionModal"
    ).style.display =
        "flex";


    await loadSolutions(
        problemId
    );

}


// ==================================================
// LOAD SOLUTIONS
// ==================================================

async function loadSolutions(
    problemId
) {

    const list =
        document.getElementById(
            "solutionList"
        );


    list.innerHTML =
        "กำลังโหลด...";


    const {
        data,
        error
    } =
        await supabaseClient
            .from("solutions")
            .select(`
                id,
                step_number,
                title,
                description,
                status,
                created_by
            `)
            .eq(
                "problem_id",
                problemId
            )
            .order(
                "step_number",
                {
                    ascending: true
                }
            );


    if (error) {

        list.innerHTML =
            "โหลดข้อมูลไม่สำเร็จ";

        console.error(error);

        return;

    }


    list.innerHTML =
        "";


    if (!data || data.length === 0) {

        list.innerHTML = `

            <div class="no-result">

                ยังไม่มีวิธีแก้ไข

            </div>

        `;

        return;

    }


    data.forEach(
        solution => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "solution-item";


            let statusText =
                "รอตรวจสอบ";


            if (
                solution.status ===
                "published"
            ) {

                statusText =
                    "เผยแพร่แล้ว";

            }


            if (
                solution.status ===
                "rejected"
            ) {

                statusText =
                    "ไม่เผยแพร่";

            }


            item.innerHTML = `

                <div>

                    <strong>
                        ขั้นตอนที่
                        ${solution.step_number}
                    </strong>


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


                    <span
                        class="status-badge"
                    >
                        ${statusText}
                    </span>

                </div>


                <div>

                    ${
                        solution.status ===
                        "pending"

                        ?

                        `

                        <button
                            class="approve-solution-button"
                            data-id="${solution.id}"
                        >
                            ✅ อนุมัติ
                        </button>

                        `

                        :

                        ""
                    }


                    <button
                        class="delete-solution-button"
                        data-id="${solution.id}"
                    >
                        🗑️ ลบ
                    </button>

                </div>

            `;


            list.appendChild(
                item
            );

        }
    );


    // APPROVE SOLUTION

    document
        .querySelectorAll(
            ".approve-solution-button"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        approveSolution(
                            button.dataset.id
                        );

                    }
                );

            }
        );


    // DELETE SOLUTION

    document
        .querySelectorAll(
            ".delete-solution-button"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        deleteSolution(
                            button.dataset.id
                        );

                    }
                );

            }
        );

}


// ==================================================
// APPROVE SOLUTION
// ==================================================

async function approveSolution(
    solutionId
) {

    const confirmApprove =
        confirm(
            "ต้องการอนุมัติขั้นตอนนี้หรือไม่?"
        );


    if (!confirmApprove) {

        return;

    }


    const {
        error
    } =
        await supabaseClient
            .from("solutions")
            .update({

                status:
                    "published"

            })
            .eq(
                "id",
                solutionId
            );


    if (error) {

        alert(
            "❌ อนุมัติไม่สำเร็จ\n\n" +
            error.message
        );

        return;

    }


    alert(
        "✅ อนุมัติขั้นตอนแล้ว"
    );


    await loadSolutions(
        currentProblemId
    );

}


// ==================================================
// DELETE SOLUTION
// ==================================================

async function deleteSolution(
    solutionId
) {

    const confirmDelete =
        confirm(
            "ต้องการลบขั้นตอนนี้หรือไม่?"
        );


    if (!confirmDelete) {

        return;

    }


    const {
        error
    } =
        await supabaseClient
            .from("solutions")
            .delete()
            .eq(
                "id",
                solutionId
            );


    if (error) {

        alert(
            "❌ ลบไม่สำเร็จ\n\n" +
            error.message
        );

        return;

    }


    await loadSolutions(
        currentProblemId
    );

}


// ==================================================
// EDIT PROBLEM
// ==================================================

function editProblem(
    problemId
) {

    const problem =
        allProblems.find(
            item =>
                String(item.id) ===
                String(problemId)
        );


    if (!problem) {

        return;

    }


    document.getElementById(
        "editingProblemId"
    ).value =
        problem.id;


    document.getElementById(
        "title"
    ).value =
        problem.title || "";


    document.getElementById(
        "description"
    ).value =
        problem.description || "";


    document.getElementById(
        "category"
    ).value =
        problem.category || "";


    document.getElementById(
        "symptoms"
    ).value =
        problem.symptoms || "";


    document.getElementById(
        "causes"
    ).value =
        problem.causes || "";


    document.getElementById(
        "status"
    ).value =
        problem.status || "pending";


    document.getElementById(
        "problemModalTitle"
    ).textContent =
        "แก้ไขปัญหา";


    document.getElementById(
        "problemModal"
    ).style.display =
        "flex";

}


// ==================================================
// ESCAPE HTML
// ==================================================

function escapeHtml(
    value
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        value ?? "";


    return div.innerHTML;

}


// ==================================================
// SEARCH
// ==================================================

adminSearch.addEventListener(
    "input",
    renderProblems
);


// ==================================================
// CLOSE SOLUTION MODAL
// ==================================================

document
    .getElementById(
        "closeSolutionModal"
    )
    .addEventListener(
        "click",
        () => {

            document.getElementById(
                "solutionModal"
            ).style.display =
                "none";

        }
    );


// ==================================================
// LOGOUT
// ==================================================

document
    .getElementById(
        "logoutButton"
    )
    .addEventListener(
        "click",
        async () => {

            await supabaseClient.auth.signOut();

            window.location.href =
                "login.html";

        }
    );


// ==================================================
// START
// ==================================================

async function startDashboard() {

    const isAdmin =
        await checkAdmin();


    if (!isAdmin) {

        return;

    }


    await loadProblems();

}


startDashboard();