// ============================================================
// IoT PROBLEM CENTER
// DASHBOARD.JS
// ============================================================

// ============================================================
// GLOBAL
// ============================================================

let currentUser = null;
let isAdmin = false;
let allProblems = [];
let editingProblemId = null;


// ============================================================
// DOM HELPERS
// ============================================================

function $(id) {
    return document.getElementById(id);
}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(value) {

    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}


// ============================================================
// SHOW MESSAGE
// ============================================================

function showMessage(message, type = "info") {

    let box = $("dashboardMessage");

    if (!box) {

        box = document.createElement("div");

        box.id = "dashboardMessage";

        box.style.position = "fixed";
        box.style.top = "20px";
        box.style.right = "20px";
        box.style.zIndex = "99999";
        box.style.padding = "15px 20px";
        box.style.borderRadius = "10px";
        box.style.fontSize = "16px";
        box.style.maxWidth = "400px";
        box.style.boxShadow = "0 5px 20px rgba(0,0,0,.2)";

        document.body.appendChild(box);
    }

    box.textContent = message;

    if (type === "success") {
        box.style.background = "#16a34a";
        box.style.color = "#fff";
    }
    else if (type === "error") {
        box.style.background = "#dc2626";
        box.style.color = "#fff";
    }
    else {
        box.style.background = "#2563eb";
        box.style.color = "#fff";
    }

    box.style.display = "block";

    setTimeout(() => {

        box.style.display = "none";

    }, 4000);
}


// ============================================================
// GET CURRENT USER
// ============================================================

async function getCurrentUser() {

    try {

        const {
            data,
            error
        } = await supabaseClient.auth.getSession();

        if (error) {

            console.error(error);

            return null;
        }

        if (!data.session) {

            return null;
        }

        return data.session.user;

    }
    catch (error) {

        console.error(
            "GET USER ERROR:",
            error
        );

        return null;
    }
}


// ============================================================
// CHECK ADMIN
// ============================================================

async function checkAdmin() {

    try {

        currentUser =
            await getCurrentUser();

        // ------------------------------------------
        // ยังไม่ได้ Login
        // ------------------------------------------

        if (!currentUser) {

            window.location.href =
                "login.html";

            return false;
        }


        console.log(
            "LOGIN USER:",
            currentUser.id
        );

        console.log(
            "LOGIN EMAIL:",
            currentUser.email
        );


        // ==================================================
        // วิธีตรวจ Admin
        //
        // ระบบนี้รองรับหลายรูปแบบ
        // ==================================================

        let adminResult = false;


        // ==================================================
        // วิธีที่ 1
        // ตรวจจาก table admins
        // ==================================================

        try {

            const {
                data,
                error
            } =
                await supabaseClient
                    .from("admins")
                    .select("user_id")
                    .eq(
                        "user_id",
                        currentUser.id
                    )
                    .maybeSingle();


            if (!error && data) {

                adminResult = true;
            }

        }
        catch (error) {

            console.log(
                "ไม่พบ/ไม่สามารถอ่าน admins table"
            );

        }


        // ==================================================
        // วิธีที่ 2
        // ตรวจจาก user metadata
        // ==================================================

        if (!adminResult) {

            const metadata =
                currentUser.user_metadata || {};


            if (
                metadata.role === "admin" ||
                metadata.is_admin === true
            ) {

                adminResult = true;
            }
        }


        // ==================================================
        // RESULT
        // ==================================================

        isAdmin =
            adminResult;


        console.log(
            "IS ADMIN:",
            isAdmin
        );


        if (!isAdmin) {

            alert(
                "บัญชีนี้ไม่มีสิทธิ์เข้า Admin Dashboard"
            );

            window.location.href =
                "index.html";

            return false;
        }


        updateUserArea();

        return true;

    }
    catch (error) {

        console.error(
            "CHECK ADMIN ERROR:",
            error
        );

        alert(
            "ไม่สามารถตรวจสอบสิทธิ์ Admin ได้"
        );

        window.location.href =
            "index.html";

        return false;
    }
}


// ============================================================
// USER AREA
// ============================================================

function updateUserArea() {

    const userArea =
        $("userArea");

    if (!userArea || !currentUser) {
        return;
    }


    userArea.innerHTML = `

        <span class="user-email">

            👤 ${escapeHtml(
                currentUser.email || "Admin"
            )}

        </span>

        <button
            id="logoutButton"
            class="logout-button"
            type="button"
        >
            ออกจากระบบ
        </button>

    `;


    const logoutButton =
        $("logoutButton");


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            logout
        );
    }
}


// ============================================================
// LOGOUT
// ============================================================

async function logout() {

    try {

        const {
            error
        } =
            await supabaseClient.auth.signOut();


        if (error) {

            throw error;
        }


        window.location.href =
            "login.html";

    }
    catch (error) {

        console.error(error);

        showMessage(
            "ออกจากระบบไม่สำเร็จ: " +
            error.message,
            "error"
        );
    }
}


// ============================================================
// LOAD PROBLEMS
// ============================================================

async function loadProblems() {

    const loading =
        $("loading");

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


        console.log(
            "PROBLEMS:",
            allProblems
        );


        renderProblems();

        updateStatistics();

    }
    catch (error) {

        console.error(
            "LOAD PROBLEMS ERROR:",
            error
        );


        const list =
            $("problemList");


        if (list) {

            list.innerHTML = `

                <div class="no-result">

                    ❌ โหลดข้อมูลไม่สำเร็จ

                    <br><br>

                    ${escapeHtml(
                        error.message
                    )}

                </div>

            `;
        }


        showMessage(
            "โหลดข้อมูลไม่สำเร็จ: " +
            error.message,
            "error"
        );

    }
    finally {

        if (loading) {

            loading.style.display =
                "none";
        }
    }
}


// ============================================================
// RENDER PROBLEMS
// ============================================================

function renderProblems() {

    const list =
        $("problemList");


    if (!list) {

        console.warn(
            "ไม่พบ #problemList"
        );

        return;
    }


    list.innerHTML =
        "";


    if (allProblems.length === 0) {

        list.innerHTML = `

            <div class="no-result">

                ยังไม่มีข้อมูลปัญหา

            </div>

        `;

        return;
    }


    allProblems.forEach(
        problem => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "problem-card";


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

                <div class="problem-card-header">

                    <span class="problem-category">

                        ${escapeHtml(
                            problem.category ||
                            "ทั่วไป"
                        )}

                    </span>

                    <span
                        class="problem-status ${statusClass}"
                    >

                        ${statusText}

                    </span>

                </div>


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


                <div class="problem-info">

                    <small>

                        ID:
                        ${escapeHtml(
                            problem.id
                        )}

                    </small>

                </div>


                <div class="problem-actions">

                    <button
                        type="button"
                        class="edit-problem-button"
                        data-id="${problem.id}"
                    >
                        ✏️ แก้ไข
                    </button>


                    <button
                        type="button"
                        class="solution-problem-button"
                        data-id="${problem.id}"
                    >
                        🛠 วิธีแก้ไข
                    </button>


                    ${
                        problem.status !==
                        "published"
                        ?

                        `
                        <button
                            type="button"
                            class="publish-problem-button"
                            data-id="${problem.id}"
                        >
                            🟢 เผยแพร่
                        </button>
                        `

                        :

                        `
                        <button
                            type="button"
                            class="unpublish-problem-button"
                            data-id="${problem.id}"
                        >
                            🔴 ยกเลิกเผยแพร่
                        </button>
                        `
                    }


                    <button
                        type="button"
                        class="delete-problem-button"
                        data-id="${problem.id}"
                    >
                        🗑️ ลบ
                    </button>

                </div>

            `;


            list.appendChild(card);
        }
    );


    bindProblemButtons();
}


// ============================================================
// BIND PROBLEM BUTTONS
// ============================================================

function bindProblemButtons() {

    document
        .querySelectorAll(
            ".edit-problem-button"
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


    document
        .querySelectorAll(
            ".solution-problem-button"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        manageSolutions(
                            button.dataset.id
                        );

                    }
                );
            }
        );


    document
        .querySelectorAll(
            ".publish-problem-button"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        changeProblemStatus(
                            button.dataset.id,
                            "published"
                        );

                    }
                );
            }
        );


    document
        .querySelectorAll(
            ".unpublish-problem-button"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        changeProblemStatus(
                            button.dataset.id,
                            "pending"
                        );

                    }
                );
            }
        );


    document
        .querySelectorAll(
            ".delete-problem-button"
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
}


// ============================================================
// UPDATE STATISTICS
// ============================================================

function updateStatistics() {

    const total =
        allProblems.length;


    const pending =
        allProblems.filter(
            item =>
                item.status ===
                "pending"
        ).length;


    const published =
        allProblems.filter(
            item =>
                item.status ===
                "published"
        ).length;


    const rejected =
        allProblems.filter(
            item =>
                item.status ===
                "rejected"
        ).length;


    setText(
        "totalProblems",
        total
    );

    setText(
        "pendingProblems",
        pending
    );

    setText(
        "publishedProblems",
        published
    );

    setText(
        "rejectedProblems",
        rejected
    );


    // รองรับ ID แบบอื่นที่ Dashboard เดิมอาจใช้

    setText(
        "totalCount",
        total
    );

    setText(
        "pendingCount",
        pending
    );

    setText(
        "publishedCount",
        published
    );

    setText(
        "rejectedCount",
        rejected
    );
}


// ============================================================
// SET TEXT
// ============================================================

function setText(id, value) {

    const element =
        $(id);

    if (element) {

        element.textContent =
            value;
    }
}


// ============================================================
// OPEN ADD MODAL
// ============================================================

function openAddProblemModal() {

    editingProblemId =
        null;


    const modal =
        $("problemModal");


    if (!modal) {

        createProblemModal();

        return;
    }


    resetProblemForm();


    modal.style.display =
        "flex";


    setText(
        "problemModalTitle",
        "เพิ่มปัญหา"
    );
}


// ============================================================
// CREATE MODAL IF NOT EXISTS
// ============================================================

function createProblemModal() {

    if ($("problemModal")) {

        return;
    }


    const modal =
        document.createElement(
            "div"
        );


    modal.id =
        "problemModal";


    modal.className =
        "modal";


    modal.innerHTML = `

        <div class="modal-content">

            <div class="modal-header">

                <h2 id="problemModalTitle">

                    เพิ่มปัญหา

                </h2>


                <button
                    type="button"
                    id="closeProblemModal"
                    class="close-button"
                >
                    ×
                </button>

            </div>


            <form id="problemForm">

                <label>
                    ชื่อปัญหา
                </label>

                <input
                    type="text"
                    id="problemTitle"
                    required
                    placeholder="เช่น ESP32 ไม่พบ COM Port"
                >


                <label>
                    รายละเอียด
                </label>

                <textarea
                    id="problemDescription"
                    rows="4"
                    required
                    placeholder="รายละเอียดของปัญหา"
                ></textarea>


                <label>
                    หมวดหมู่
                </label>

                <select
                    id="problemCategory"
                    required
                >

                    <option value="">
                        -- เลือกหมวดหมู่ --
                    </option>

                    <option value="ESP32">
                        ESP32
                    </option>

                    <option value="ESP8266">
                        ESP8266
                    </option>

                    <option value="Arduino">
                        Arduino
                    </option>

                    <option value="Servo">
                        Servo
                    </option>

                    <option value="Sensor">
                        Sensor
                    </option>

                    <option value="WiFi">
                        WiFi
                    </option>

                    <option value="Hardware">
                        Hardware
                    </option>

                </select>


                <label>
                    อาการ
                </label>

                <textarea
                    id="problemSymptoms"
                    rows="3"
                    placeholder="อาการที่พบ"
                ></textarea>


                <label>
                    สาเหตุ
                </label>

                <textarea
                    id="problemCauses"
                    rows="3"
                    placeholder="สาเหตุที่เป็นไปได้"
                ></textarea>


                <label>
                    สถานะ
                </label>

                <select id="problemStatus">

                    <option value="pending">
                        รอตรวจสอบ
                    </option>

                    <option value="published">
                        เผยแพร่
                    </option>

                    <option value="rejected">
                        ไม่เผยแพร่
                    </option>

                </select>


                <button
                    type="submit"
                    class="save-button"
                >

                    💾 บันทึกข้อมูล

                </button>

            </form>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    $("closeProblemModal")
        .addEventListener(
            "click",
            closeProblemModal
        );


    $("problemForm")
        .addEventListener(
            "submit",
            saveProblem
        );


    modal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                modal
            ) {

                closeProblemModal();
            }
        }
    );


    modal.style.display =
        "flex";
}


// ============================================================
// RESET FORM
// ============================================================

function resetProblemForm() {

    const form =
        $("problemForm");


    if (form) {

        form.reset();
    }


    const status =
        $("problemStatus");


    if (status) {

        status.value =
            "pending";
    }
}


// ============================================================
// CLOSE PROBLEM MODAL
// ============================================================

function closeProblemModal() {

    const modal =
        $("problemModal");


    if (modal) {

        modal.style.display =
            "none";
    }
}


// ============================================================
// EDIT PROBLEM
// ============================================================

async function editProblem(id) {

    const problem =
        allProblems.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!problem) {

        showMessage(
            "ไม่พบข้อมูลปัญหา",
            "error"
        );

        return;
    }


    editingProblemId =
        id;


    createProblemModal();


    setText(
        "problemModalTitle",
        "แก้ไขปัญหา"
    );


    $("problemTitle").value =
        problem.title || "";


    $("problemDescription").value =
        problem.description || "";


    $("problemCategory").value =
        problem.category || "";


    $("problemSymptoms").value =
        problem.symptoms || "";


    $("problemCauses").value =
        problem.causes || "";


    $("problemStatus").value =
        problem.status || "pending";


    $("problemModal").style.display =
        "flex";
}


// ============================================================
// SAVE PROBLEM
// ============================================================

async function saveProblem(event) {

    event.preventDefault();


    if (!isAdmin || !currentUser) {

        showMessage(
            "ไม่มีสิทธิ์ดำเนินการ",
            "error"
        );

        return;
    }


    const title =
        $("problemTitle")
            .value
            .trim();


    const description =
        $("problemDescription")
            .value
            .trim();


    const category =
        $("problemCategory")
            .value;


    const symptoms =
        $("problemSymptoms")
            .value
            .trim();


    const causes =
        $("problemCauses")
            .value
            .trim();


    const status =
        $("problemStatus")
            .value;


    if (!title) {

        showMessage(
            "กรุณากรอกชื่อปัญหา",
            "error"
        );

        return;
    }


    if (!description) {

        showMessage(
            "กรุณากรอกรายละเอียดปัญหา",
            "error"
        );

        return;
    }


    try {

        let result;


        // ==================================================
        // EDIT
        // ==================================================

        if (editingProblemId) {

            result =
                await supabaseClient
                    .from("problems")
                    .update({

                        title:
                            title,

                        description:
                            description,

                        category:
                            category,

                        symptoms:
                            symptoms,

                        causes:
                            causes,

                        status:
                            status

                    })
                    .eq(
                        "id",
                        editingProblemId
                    );

        }

        // ==================================================
        // INSERT
        // ==================================================

        else {

            result =
                await supabaseClient
                    .from("problems")
                    .insert({

                        title:
                            title,

                        description:
                            description,

                        category:
                            category,

                        symptoms:
                            symptoms,

                        causes:
                            causes,

                        status:
                            status,

                        created_by:
                            currentUser.id

                    });
        }


        if (result.error) {

            throw result.error;
        }


        showMessage(
            editingProblemId
                ? "แก้ไขข้อมูลสำเร็จ"
                : "เพิ่มปัญหาสำเร็จ",
            "success"
        );


        closeProblemModal();


        editingProblemId =
            null;


        await loadProblems();

    }
    catch (error) {

        console.error(
            "SAVE PROBLEM ERROR:",
            error
        );


        showMessage(
            "บันทึกไม่สำเร็จ: " +
            error.message,
            "error"
        );
    }
}


// ============================================================
// CHANGE STATUS
// ============================================================

async function changeProblemStatus(
    id,
    status
) {

    if (!isAdmin) {

        showMessage(
            "ไม่มีสิทธิ์",
            "error"
        );

        return;
    }


    const message =
        status === "published"
            ? "ต้องการเผยแพร่ปัญหานี้หรือไม่?"
            : "ต้องการยกเลิกการเผยแพร่หรือไม่?";


    if (!confirm(message)) {

        return;
    }


    try {

        const {
            error
        } =
            await supabaseClient
                .from("problems")
                .update({

                    status:
                        status

                })
                .eq(
                    "id",
                    id
                );


        if (error) {

            throw error;
        }


        showMessage(
            status === "published"
                ? "เผยแพร่สำเร็จ"
                : "ยกเลิกการเผยแพร่สำเร็จ",
            "success"
        );


        await loadProblems();

    }
    catch (error) {

        console.error(error);

        showMessage(
            "เปลี่ยนสถานะไม่สำเร็จ: " +
            error.message,
            "error"
        );
    }
}


// ============================================================
// DELETE PROBLEM
// ============================================================

async function deleteProblem(id) {

    if (!isAdmin) {

        showMessage(
            "ไม่มีสิทธิ์",
            "error"
        );

        return;
    }


    if (
        !confirm(
            "ต้องการลบปัญหานี้หรือไม่?\nข้อมูลจะไม่สามารถกู้คืนได้"
        )
    ) {

        return;
    }


    try {

        // ------------------------------------------
        // ลบ solutions ก่อน
        // ------------------------------------------

        const {
            error:
                solutionError
        } =
            await supabaseClient
                .from("solutions")
                .delete()
                .eq(
                    "problem_id",
                    id
                );


        if (
            solutionError &&
            solutionError.code !==
            "PGRST116"
        ) {

            console.warn(
                "ลบ solutions:",
                solutionError
            );
        }


        // ------------------------------------------
        // ลบ problem
        // ------------------------------------------

        const {
            error
        } =
            await supabaseClient
                .from("problems")
                .delete()
                .eq(
                    "id",
                    id
                );


        if (error) {

            throw error;
        }


        showMessage(
            "ลบปัญหาสำเร็จ",
            "success"
        );


        await loadProblems();

    }
    catch (error) {

        console.error(
            "DELETE ERROR:",
            error
        );


        showMessage(
            "ลบข้อมูลไม่สำเร็จ: " +
            error.message,
            "error"
        );
    }
}


// ============================================================
// MANAGE SOLUTIONS
// ============================================================

async function manageSolutions(id) {

    const problem =
        allProblems.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!problem) {

        showMessage(
            "ไม่พบปัญหา",
            "error"
        );

        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("solutions")
            .select(`
                id,
                problem_id,
                step_number,
                content
            `)
            .eq(
                "problem_id",
                id
            )
            .order(
                "step_number",
                {
                    ascending: true
                }
            );


    if (error) {

        showMessage(
            "โหลดวิธีแก้ไขไม่สำเร็จ: " +
            error.message,
            "error"
        );

        return;
    }


    createSolutionModal(
        problem,
        data || []
    );
}


// ============================================================
// CREATE SOLUTION MODAL
// ============================================================

function createSolutionModal(
    problem,
    solutions
) {

    const old =
        $("solutionModal");


    if (old) {

        old.remove();
    }


    const modal =
        document.createElement(
            "div"
        );


    modal.id =
        "solutionModal";


    modal.className =
        "modal";


    modal.innerHTML = `

        <div class="modal-content">

            <div class="modal-header">

                <div>

                    <h2>
                        🛠 วิธีแก้ไข
                    </h2>

                    <p>
                        ${escapeHtml(
                            problem.title
                        )}
                    </p>

                </div>


                <button
                    type="button"
                    class="close-button"
                    id="closeSolutionModal"
                >
                    ×
                </button>

            </div>


            <div id="solutionList">

                ${
                    solutions.length === 0

                    ?

                    `
                    <p>
                        ยังไม่มีวิธีแก้ไข
                    </p>
                    `

                    :

                    solutions.map(
                        (solution, index) => `

                            <div
                                class="solution-item"
                                data-solution-id="${solution.id}"
                                style="
                                    margin-bottom:15px;
                                    padding:15px;
                                    border:1px solid #ddd;
                                    border-radius:10px;
                                "
                            >

                                <strong>
                                    ขั้นตอนที่ ${index + 1}
                                </strong>


                                <textarea
                                    class="solution-content"
                                    rows="3"
                                    style="width:100%;margin-top:8px;"
                                >${escapeHtml(
                                    solution.content
                                )}</textarea>


                                <button
                                    type="button"
                                    class="delete-solution-button"
                                    data-id="${solution.id}"
                                    style="margin-top:8px;"
                                >
                                    🗑️ ลบขั้นตอน
                                </button>

                            </div>

                        `
                    ).join("")
                }

            </div>


            <hr>


            <h3>
                + เพิ่มขั้นตอน
            </h3>


            <textarea
                id="newSolutionContent"
                rows="4"
                placeholder="พิมพ์วิธีแก้ไข..."
                style="width:100%;"
            ></textarea>


            <button
                type="button"
                id="addSolutionButton"
                class="add-button"
                style="margin-top:10px;"
            >
                + เพิ่มขั้นตอน
            </button>


            <button
                type="button"
                id="saveSolutionsButton"
                class="save-button"
                style="margin-top:10px;"
            >
                💾 บันทึกการแก้ไข
            </button>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    modal.style.display =
        "flex";


    $("closeSolutionModal")
        .addEventListener(
            "click",
            () => modal.remove()
        );


    $("addSolutionButton")
        .addEventListener(
            "click",
            async () => {

                await addSolution(
                    problem.id
                );

            }
        );


    $("saveSolutionsButton")
        .addEventListener(
            "click",
            async () => {

                await saveExistingSolutions();

            }
        );


    document
        .querySelectorAll(
            ".delete-solution-button"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    async () => {

                        await deleteSolution(
                            button.dataset.id,
                            problem.id
                        );

                    }
                );
            }
        );
}


// ============================================================
// ADD SOLUTION
// ============================================================

async function addSolution(
    problemId
) {

    const textarea =
        $("newSolutionContent");


    if (!textarea) {

        return;
    }


    const content =
        textarea.value.trim();


    if (!content) {

        showMessage(
            "กรุณากรอกวิธีแก้ไข",
            "error"
        );

        return;
    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("solutions")
                .select("step_number")
                .eq(
                    "problem_id",
                    problemId
                )
                .order(
                    "step_number",
                    {
                        ascending: false
                    }
                )
                .limit(1);


        if (error) {

            throw error;
        }


        let nextStep =
            1;


        if (
            data &&
            data.length > 0
        ) {

            nextStep =
                Number(
                    data[0].step_number
                ) + 1;
        }


        const {
            error:
                insertError
        } =
            await supabaseClient
                .from("solutions")
                .insert({

                    problem_id:
                        problemId,

                    step_number:
                        nextStep,

                    content:
                        content

                });


        if (insertError) {

            throw insertError;
        }


        showMessage(
            "เพิ่มวิธีแก้ไขสำเร็จ",
            "success"
        );


        $("newSolutionContent")
            .value = "";


        await manageSolutions(
            problemId
        );

    }
    catch (error) {

        console.error(
            "ADD SOLUTION ERROR:",
            error
        );


        showMessage(
            "เพิ่มวิธีแก้ไขไม่สำเร็จ: " +
            error.message,
            "error"
        );
    }
}


// ============================================================
// SAVE EXISTING SOLUTIONS
// ============================================================

async function saveExistingSolutions() {

    const items =
        document.querySelectorAll(
            ".solution-item"
        );


    try {

        for (
            const item of items
        ) {

            const id =
                item.dataset.solutionId;


            if (!id) {
                continue;
            }


            const textarea =
                item.querySelector(
                    ".solution-content"
                );


            if (!textarea) {
                continue;
            }


            const content =
                textarea.value.trim();


            const {
                error
            } =
                await supabaseClient
                    .from("solutions")
                    .update({

                        content:
                            content

                    })
                    .eq(
                        "id",
                        id
                    );


            if (error) {

                throw error;
            }
        }


        showMessage(
            "บันทึกวิธีแก้ไขสำเร็จ",
            "success"
        );

    }
    catch (error) {

        console.error(
            "SAVE SOLUTIONS ERROR:",
            error
        );


        showMessage(
            "บันทึกวิธีแก้ไขไม่สำเร็จ: " +
            error.message,
            "error"
        );
    }
}


// ============================================================
// DELETE SOLUTION
// ============================================================

async function deleteSolution(
    solutionId,
    problemId
) {

    if (
        !confirm(
            "ต้องการลบขั้นตอนนี้หรือไม่?"
        )
    ) {

        return;
    }


    try {

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

            throw error;
        }


        showMessage(
            "ลบขั้นตอนสำเร็จ",
            "success"
        );


        await manageSolutions(
            problemId
        );

    }
    catch (error) {

        console.error(
            error
        );


        showMessage(
            "ลบขั้นตอนไม่สำเร็จ: " +
            error.message,
            "error"
        );
    }
}


// ============================================================
// SEARCH
// ============================================================

function setupSearch() {

    const input =
        $("searchInput");


    if (!input) {
        return;
    }


    input.addEventListener(
        "input",
        () => {

            const keyword =
                input.value
                    .trim()
                    .toLowerCase();


            const filtered =
                allProblems.filter(
                    problem => {

                        return (

                            (
                                problem.title ||
                                ""
                            )
                                .toLowerCase()
                                .includes(
                                    keyword
                                )

                            ||

                            (
                                problem.description ||
                                ""
                            )
                                .toLowerCase()
                                .includes(
                                    keyword
                                )

                            ||

                            (
                                problem.category ||
                                ""
                            )
                                .toLowerCase()
                                .includes(
                                    keyword
                                )

                        );

                    }
                );


            renderFilteredProblems(
                filtered
            );
        }
    );
}


// ============================================================
// RENDER FILTERED
// ============================================================

function renderFilteredProblems(
    problems
) {

    const original =
        allProblems;


    allProblems =
        problems;


    renderProblems();


    allProblems =
        original;
}


// ============================================================
// CATEGORY FILTER
// ============================================================

function setupCategoryFilter() {

    const buttons =
        document.querySelectorAll(
            "[data-category]"
        );


    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const category =
                        button.dataset.category;


                    if (
                        !category ||
                        category === "all"
                    ) {

                        renderProblems();

                        return;
                    }


                    const filtered =
                        allProblems.filter(
                            problem =>
                                problem.category ===
                                category
                        );


                    renderFilteredProblems(
                        filtered
                    );
                }
            );
        }
    );
}


// ============================================================
// ADD BUTTON
// ============================================================

function setupAddButton() {

    const buttons = [

        $("addProblemButton"),

        $("addProblem"),

        $("addButton"),

        document.querySelector(
            '[data-action="add-problem"]'
        )

    ];


    buttons.forEach(
        button => {

            if (!button) {
                return;
            }


            button.addEventListener(
                "click",
                openAddProblemModal
            );
        }
    );
}


// ============================================================
// CREATE ADD BUTTON IF MISSING
// ============================================================

function createAddButtonIfMissing() {

    const existing =
        $("addProblemButton") ||
        $("addProblem") ||
        document.querySelector(
            '[data-action="add-problem"]'
        );


    if (existing) {

        return;
    }


    const container =
        document.querySelector(
            ".section-title"
        ) ||
        document.querySelector(
            "main"
        ) ||
        document.body;


    const button =
        document.createElement(
            "button"
        );


    button.id =
        "addProblemButton";


    button.className =
        "add-button";


    button.type =
        "button";


    button.textContent =
        "+ เพิ่มปัญหา";


    button.addEventListener(
        "click",
        openAddProblemModal
    );


    container.prepend(
        button
    );
}


// ============================================================
// AUTH STATE
// ============================================================

function setupAuthListener() {

    supabaseClient.auth.onAuthStateChange(
        async (
            event,
            session
        ) => {

            console.log(
                "AUTH EVENT:",
                event
            );


            if (!session) {

                window.location.href =
                    "login.html";

                return;
            }


            if (
                event ===
                "SIGNED_IN"
            ) {

                currentUser =
                    session.user;

            }
        }
    );
}


// ============================================================
// START DASHBOARD
// ============================================================

async function startDashboard() {

    console.log(
        "================================"
    );

    console.log(
        "START ADMIN DASHBOARD"
    );

    console.log(
        "================================"
    );


    // ------------------------------------------
    // ตรวจ Admin
    // ------------------------------------------

    const allowed =
        await checkAdmin();


    if (!allowed) {

        return;
    }


    // ------------------------------------------
    // โหลดข้อมูล
    // ------------------------------------------

    await loadProblems();


    // ------------------------------------------
    // ปุ่มต่าง ๆ
    // ------------------------------------------

    setupAddButton();

    createAddButtonIfMissing();

    setupSearch();

    setupCategoryFilter();

    setupAuthListener();


    console.log(
        "ADMIN DASHBOARD READY"
    );
}


// ============================================================
// START
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        startDashboard();

    }
);
