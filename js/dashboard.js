// ============================================================
// IoT PROBLEM CENTER - DASHBOARD.JS
// FULL VERSION + IMAGE UPLOAD FIX
// ============================================================

let currentUser = null;
let isAdmin = false;
let allProblems = [];
let editingProblemId = null;
let currentProblemForSolution = null;


// ============================================================
// DOM HELPERS
// ============================================================

function $(id) {
    return document.getElementById(id);
}


function escapeHtml(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value ?? "";

    return div.innerHTML;
}


function setText(id, value) {

    const element =
        $(id);

    if (element) {

        element.textContent =
            value;

    }

}


// ============================================================
// TOAST / MESSAGE
// ============================================================

function showMessage(
    message,
    type = "info"
) {

    let box =
        $("dashboardMessage");


    if (!box) {

        box =
            document.createElement("div");

        box.id =
            "dashboardMessage";

        box.style.position =
            "fixed";

        box.style.top =
            "20px";

        box.style.right =
            "20px";

        box.style.zIndex =
            "99999";

        box.style.padding =
            "14px 20px";

        box.style.borderRadius =
            "8px";

        box.style.fontSize =
            "15px";

        box.style.fontWeight =
            "500";

        box.style.maxWidth =
            "450px";

        box.style.boxShadow =
            "0 10px 25px rgba(0,0,0,0.15)";

        box.style.transition =
            "all 0.3s ease";

        document.body.appendChild(
            box
        );

    }


    box.textContent =
        message;


    if (type === "success") {

        box.style.background =
            "#16a34a";

        box.style.color =
            "#ffffff";

    }

    else if (type === "error") {

        box.style.background =
            "#dc2626";

        box.style.color =
            "#ffffff";

    }

    else {

        box.style.background =
            "#2563eb";

        box.style.color =
            "#ffffff";

    }


    box.style.display =
        "block";


    setTimeout(() => {

        box.style.display =
            "none";

    }, 4000);

}


// ============================================================
// AUTHENTICATION
// ============================================================

async function getCurrentUser() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth.getSession();


        if (
            error ||
            !data.session
        ) {

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


        if (!currentUser) {

            window.location.href =
                "login.html";

            return false;

        }


        console.log(
            "LOGIN USER EMAIL:",
            currentUser.email
        );


        const allowedAdminEmails = [

            "kiattisak.t@mws.ac.th",

            "nun160661@gmail.com",

            "teachergorobot.th@gmail.com",

            "kiattisak191245@gmail.com"

        ];


        let adminResult =
            false;


        if (
            currentUser.email &&
            allowedAdminEmails.includes(
                currentUser.email
                    .trim()
                    .toLowerCase()
            )
        ) {

            adminResult =
                true;

        }


        if (!adminResult) {

            try {

                const {
                    data,
                    error
                } =
                    await supabaseClient

                        .from("profiles")

                        .select("role")

                        .eq(
                            "id",
                            currentUser.id
                        )

                        .maybeSingle();


                if (
                    !error &&
                    data &&
                    data.role === "admin"
                ) {

                    adminResult =
                        true;

                }

            }

            catch (err) {

                console.warn(
                    "PROFILE CHECK FAILED:",
                    err
                );

            }

        }


        isAdmin =
            adminResult;


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

        window.location.href =
            "index.html";

        return false;

    }

}


// ============================================================
// USER AREA
// ============================================================

function updateUserArea() {

    if (!currentUser) return;


    const adminEmail =
        $("adminEmail");


    if (adminEmail) {

        adminEmail.textContent =
            currentUser.email ||
            "Admin";

    }


    const logoutBtn =
        $("logoutButton");


    if (logoutBtn) {

        logoutBtn.replaceWith(
            logoutBtn.cloneNode(true)
        );


        const newLogoutBtn =
            $("logoutButton");


        if (newLogoutBtn) {

            newLogoutBtn.addEventListener(
                "click",
                logout
            );

        }

    }

}


// ============================================================
// LOGOUT
// ============================================================

async function logout() {

    try {

        await supabaseClient.auth.signOut();


        window.location.href =
            "login.html";

    }

    catch (error) {

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
            "flex";

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
                    class_name,
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


        // โหลดรูปภาพของแต่ละปัญหาเพิ่มเติม
        const {
            data: imageRows,
            error: imageLoadError
        } = await supabaseClient
            .from("problem_images")
            .select("problem_id, image_url, caption, created_at")
            .order("created_at", { ascending: false });

        if (imageLoadError) {
            console.warn("LOAD PROBLEM IMAGES ERROR:", imageLoadError);
        }

        const latestImageByProblem = new Map();

        (imageRows || []).forEach((row) => {
            if (
                row &&
                row.problem_id &&
                row.image_url &&
                !latestImageByProblem.has(String(row.problem_id))
            ) {
                latestImageByProblem.set(
                    String(row.problem_id),
                    row
                );
            }
        });

        allProblems = (data || []).map((problem) => ({
            ...problem,
            image_url:
                latestImageByProblem.get(String(problem.id))?.image_url ||
                null,
            image_caption:
                latestImageByProblem.get(String(problem.id))?.caption ||
                ""
        }));

        renderProblems(
            allProblems
        );


        updateStatistics();

    }

    catch (error) {

        console.error(
            "LOAD PROBLEMS ERROR:",
            error
        );


        const container =
            $("problemTable");


        if (container) {

            container.innerHTML = `

                <div
                    style="
                        text-align:center;
                        padding:30px;
                        color:#dc2626;
                    "
                >

                    ❌ โหลดข้อมูลไม่สำเร็จ:

                    ${escapeHtml(
                        error.message
                    )}

                </div>

            `;

        }


        showMessage(
            "โหลดข้อมูลไม่สำเร็จ",
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

function renderProblems(
    problemsToRender
) {

    const container =
        $("problemTable");


    if (!container) return;


    container.innerHTML =
        "";


    if (
        !problemsToRender ||
        problemsToRender.length === 0
    ) {

        container.innerHTML = `

            <div
                style="
                    text-align:center;
                    padding:40px;
                    color:#64748b;
                "
            >

                ไม่พบข้อมูลปัญหาในระบบ

            </div>

        `;

        return;

    }


    problemsToRender.forEach(
        (problem) => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "problem-card";


            card.style.cssText =

                "background:#fff;" +
                "border:1px solid #e2e8f0;" +
                "border-radius:12px;" +
                "padding:20px;" +
                "margin-bottom:16px;" +
                "box-shadow:0 2px 4px rgba(0,0,0,0.02);";


            let statusBadge = `

                <span
                    style="
                        background:#fef3c7;
                        color:#d97706;
                        padding:4px 10px;
                        border-radius:20px;
                        font-size:13px;
                        font-weight:500;
                    "
                >
                    🟡 รอตรวจสอบ
                </span>

            `;


            if (
                problem.status ===
                "published"
            ) {

                statusBadge = `

                    <span
                        style="
                            background:#dcfce7;
                            color:#15803d;
                            padding:4px 10px;
                            border-radius:20px;
                            font-size:13px;
                            font-weight:500;
                        "
                    >
                        🟢 เผยแพร่แล้ว
                    </span>

                `;

            }

            else if (
                problem.status ===
                "rejected"
            ) {

                statusBadge = `

                    <span
                        style="
                            background:#fee2e2;
                            color:#b91c1c;
                            padding:4px 10px;
                            border-radius:20px;
                            font-size:13px;
                            font-weight:500;
                        "
                    >
                        🔴 ไม่เผยแพร่
                    </span>

                `;

            }


            card.innerHTML = `

                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        margin-bottom:12px;
                    "
                >

                    <div
                        style="
                            display:flex;
                            gap:8px;
                            align-items:center;
                            flex-wrap:wrap;
                        "
                    >

                        <span
                            style="
                                background:#e0f2fe;
                                color:#0369a1;
                                padding:4px 12px;
                                border-radius:6px;
                                font-size:13px;
                                font-weight:600;
                            "
                        >
                            ${escapeHtml(
                                problem.category ||
                                "ทั่วไป"
                            )}
                        </span>

                        <span
                            style="
                                background:#ede9fe;
                                color:#6d28d9;
                                padding:4px 12px;
                                border-radius:6px;
                                font-size:13px;
                                font-weight:600;
                            "
                        >
                            🎓 ${escapeHtml(
                                problem.class_name ||
                                "ไม่ระบุ Class"
                            )}
                        </span>

                    </div>

                    ${statusBadge}

                </div>


                ${
                    problem.image_url
                        ? `
                            <div
                                style="
                                    margin:0 0 16px 0;
                                    border-radius:12px;
                                    overflow:hidden;
                                    background:#f8fafc;
                                    border:1px solid #e2e8f0;
                                "
                            >
                                <img
                                    src="${escapeHtml(problem.image_url)}"
                                    alt="${escapeHtml(problem.title || "รูปภาพปัญหา")}"
                                    style="
                                        width:100%;
                                        max-height:240px;
                                        object-fit:contain;
                                        display:block;
                                        background:#f8fafc;
                                    "
                                    loading="lazy"
                                >
                            </div>
                        `
                        : ""
                }


                <h3
                    style="
                        margin:0 0 8px 0;
                        font-size:18px;
                        color:#0f172a;
                    "
                >

                    ${escapeHtml(
                        problem.title ||
                        "ไม่มีชื่อหัวข้อ"
                    )}

                </h3>


                <p
                    style="
                        margin:0 0 16px 0;
                        color:#475569;
                        font-size:14px;
                        line-height:1.5;
                    "
                >

                    ${escapeHtml(
                        problem.description ||
                        "ไม่มีรายละเอียด"
                    )}

                </p>


                <div
                    style="
                        display:flex;
                        gap:8px;
                        flex-wrap:wrap;
                        border-top:1px solid #f1f5f9;
                        padding-top:12px;
                    "
                >

                    <button
                        type="button"
                        class="btn-edit"
                        data-id="${problem.id}"
                        style="
                            background:#f1f5f9;
                            border:none;
                            padding:6px 12px;
                            border-radius:6px;
                            cursor:pointer;
                            font-size:13px;
                        "
                    >
                        ✏️ แก้ไข
                    </button>


                    <button
                        type="button"
                        class="btn-solution"
                        data-id="${problem.id}"
                        style="
                            background:#eff6ff;
                            color:#2563eb;
                            border:none;
                            padding:6px 12px;
                            border-radius:6px;
                            cursor:pointer;
                            font-size:13px;
                            font-weight:500;
                        "
                    >
                        🛠 วิธีแก้ไข
                    </button>


                    ${
                        problem.status !==
                        "published"

                            ? `

                                <button
                                    type="button"
                                    class="btn-publish"
                                    data-id="${problem.id}"
                                    style="
                                        background:#dcfce7;
                                        color:#15803d;
                                        border:none;
                                        padding:6px 12px;
                                        border-radius:6px;
                                        cursor:pointer;
                                        font-size:13px;
                                    "
                                >
                                    🟢 เผยแพร่
                                </button>

                            `

                            : `

                                <button
                                    type="button"
                                    class="btn-unpublish"
                                    data-id="${problem.id}"
                                    style="
                                        background:#fef3c7;
                                        color:#b45309;
                                        border:none;
                                        padding:6px 12px;
                                        border-radius:6px;
                                        cursor:pointer;
                                        font-size:13px;
                                    "
                                >
                                    🟡 ยกเลิกเผยแพร่
                                </button>

                            `
                    }


                    <button
                        type="button"
                        class="btn-delete"
                        data-id="${problem.id}"
                        style="
                            background:#fee2e2;
                            color:#b91c1c;
                            border:none;
                            padding:6px 12px;
                            border-radius:6px;
                            cursor:pointer;
                            font-size:13px;
                            margin-left:auto;
                        "
                    >
                        🗑️ ลบ
                    </button>

                </div>

            `;


            container.appendChild(
                card
            );

        }
    );


    bindProblemCardEvents();

}


// ============================================================
// PROBLEM EVENTS
// ============================================================

function bindProblemCardEvents() {

    document
        .querySelectorAll(".btn-edit")
        .forEach(
            (btn) => {

                btn.addEventListener(
                    "click",
                    () =>
                        editProblem(
                            btn.dataset.id
                        )
                );

            }
        );


    document
        .querySelectorAll(".btn-solution")
        .forEach(
            (btn) => {

                btn.addEventListener(
                    "click",
                    () =>
                        manageSolutions(
                            btn.dataset.id
                        )
                );

            }
        );


    document
        .querySelectorAll(".btn-publish")
        .forEach(
            (btn) => {

                btn.addEventListener(
                    "click",
                    () =>
                        changeProblemStatus(
                            btn.dataset.id,
                            "published"
                        )
                );

            }
        );


    document
        .querySelectorAll(".btn-unpublish")
        .forEach(
            (btn) => {

                btn.addEventListener(
                    "click",
                    () =>
                        changeProblemStatus(
                            btn.dataset.id,
                            "pending"
                        )
                );

            }
        );


    document
        .querySelectorAll(".btn-delete")
        .forEach(
            (btn) => {

                btn.addEventListener(
                    "click",
                    () =>
                        deleteProblem(
                            btn.dataset.id
                        )
                );

            }
        );

}


// ============================================================
// STATISTICS
// ============================================================

function updateStatistics() {

    setText(
        "totalProblems",
        allProblems.length
    );


    setText(
        "pendingProblems",
        allProblems.filter(
            (i) =>
                i.status ===
                "pending"
        ).length
    );


    setText(
        "publishedProblems",
        allProblems.filter(
            (i) =>
                i.status ===
                "published"
        ).length
    );


    setText(
        "rejectedProblems",
        allProblems.filter(
            (i) =>
                i.status ===
                "rejected"
        ).length
    );

}


// ============================================================
// PROBLEM MODAL
// ============================================================

function openAddProblemModal() {

    editingProblemId =
        null;


    resetProblemForm();


    setText(
        "problemModalTitle",
        "เพิ่มปัญหาใหม่"
    );


    const modal =
        $("problemModal");


    if (modal) {

        modal.style.display =
            "flex";

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


    resetProblemForm();

}


// ============================================================
// RESET PROBLEM FORM
// ============================================================

function resetProblemForm() {

    const form =
        $("problemForm");


    if (form) {

        form.reset();

    }

    document.querySelectorAll('input[name="class_name"]').forEach((el) => {
        el.checked = false;
    });


    const hiddenId =
        $("editingProblemId");


    if (hiddenId) {

        hiddenId.value =
            "";

    }


    const preview =
        $("problemImagePreview");


    if (preview) {

        preview.innerHTML =
            "";

    }


    setText(
        "formMessage",
        ""
    );

}


// ============================================================
// EDIT PROBLEM
// ============================================================

function editProblem(id) {

    const problem =
        allProblems.find(
            (item) =>
                String(item.id) ===
                String(id)
        );


    if (!problem) return;


    editingProblemId =
        id;


    if ($("editingProblemId")) {

        $("editingProblemId").value =
            id;

    }


    if ($("title")) {

        $("title").value =
            problem.title || "";

    }


    if ($("description")) {

        $("description").value =
            problem.description || "";

    }


    if ($("category")) {

        $("category").value =
            problem.category || "";

    }


    setSelectedClasses(problem.class_name || "");


    if ($("symptoms")) {

        $("symptoms").value =
            problem.symptoms || "";

    }


    if ($("causes")) {

        $("causes").value =
            problem.causes || "";

    }


    if ($("status")) {

        $("status").value =
            problem.status ||
            "pending";

    }


    setText(
        "problemModalTitle",
        "แก้ไขปัญหา"
    );


    const modal =
        $("problemModal");


    if (modal) {

        modal.style.display =
            "flex";

    }

}


// ============================================================
// CLASS SELECTION
// ============================================================
function getSelectedClasses() {
    return Array.from(document.querySelectorAll('input[name="class_name"]:checked'))
        .map((el) => el.value.trim())
        .filter(Boolean);
}

function setSelectedClasses(value) {
    const values = String(value || "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    document.querySelectorAll('input[name="class_name"]').forEach((el) => {
        el.checked = values.includes(el.value);
    });
}

// ============================================================
// IMAGE DROP / PASTE
// ============================================================
function setFileInputFile(input, file) {
    if (!input || !file) return false;
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
}

function setupDropPaste(inputId, previewId) {
    const input = $(inputId);
    const preview = $(previewId);
    if (!input || !preview) return;

    const zone = document.createElement("div");
    zone.className = "dropzone";
    zone.innerHTML = `<div class="dropzone-title">วางรูปภาพที่นี่ หรือคลิกเพื่อเลือกไฟล์</div><div class="dropzone-subtitle">ลากไฟล์ • Ctrl+V • JPG / PNG / WEBP • สูงสุด 5 MB</div>`;
    input.parentNode.insertBefore(zone, input);
    zone.appendChild(input);
    zone.addEventListener("click", (e) => { if (e.target !== input) input.click(); });
    ["dragenter", "dragover"].forEach((eventName) => zone.addEventListener(eventName, (e) => { e.preventDefault(); zone.classList.add("is-dragover"); }));
    ["dragleave", "drop"].forEach((eventName) => zone.addEventListener(eventName, (e) => { e.preventDefault(); zone.classList.remove("is-dragover"); }));
    zone.addEventListener("drop", (e) => {
        const file = Array.from(e.dataTransfer?.files || []).find((f) => f.type.startsWith("image/"));
        if (!file) return;
        try { validateImageFile(file); setFileInputFile(input, file); } catch (err) { showMessage(err.message, "error"); }
    });
    zone.addEventListener("paste", (e) => {
        const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith("image/"));
        if (!item) return;
        const file = item.getAsFile();
        if (!file) return;
        try { validateImageFile(file); setFileInputFile(input, file); } catch (err) { showMessage(err.message, "error"); }
    });
    input.addEventListener("focus", () => zone.classList.add("is-focus"));
    input.addEventListener("blur", () => zone.classList.remove("is-focus"));
    zone.setAttribute("tabindex", "0");
}

function setupGlobalImagePaste() {
    document.addEventListener("paste", (e) => {
        const active = document.activeElement;
        const target = active?.closest?.(".dropzone");
        if (target) return;
        const input = document.querySelector("#problemImage, #solutionImage");
        const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith("image/"));
        if (input && item) {
            const file = item.getAsFile();
            if (file) { try { validateImageFile(file); setFileInputFile(input, file); } catch (err) { showMessage(err.message, "error"); } }
        }
    });
}

// ============================================================
// GET FILE FROM INPUT
// ============================================================

function getSelectedFile(
    inputId
) {

    const input =
        $(inputId);


    if (
        !input ||
        !input.files ||
        input.files.length === 0
    ) {

        return null;

    }


    return input.files[0];

}


// ============================================================
// VALIDATE IMAGE
// ============================================================

function validateImageFile(
    file
) {

    if (!file) {

        return true;

    }


    const allowedTypes = [

        "image/jpeg",

        "image/png",

        "image/webp"

    ];


    if (
        !allowedTypes.includes(
            file.type
        )
    ) {

        throw new Error(
            "รองรับเฉพาะ JPG, PNG และ WEBP"
        );

    }


    const maxSize =
        5 * 1024 * 1024;


    if (
        file.size >
        maxSize
    ) {

        throw new Error(
            "รูปภาพต้องมีขนาดไม่เกิน 5 MB"
        );

    }


    return true;

}


// ============================================================
// CREATE SAFE FILE NAME
// ============================================================

function createSafeFileName(
    file
) {

    const extension =
        file.name
            .split(".")
            .pop()
            .toLowerCase();


    const randomPart =
        Math.random()
            .toString(36)
            .substring(2, 10);


    const timestamp =
        Date.now();


    return (

        timestamp +
        "_" +
        randomPart +
        "." +
        extension

    );

}


// ============================================================
// UPLOAD IMAGE TO SUPABASE STORAGE
// ============================================================

async function uploadImageToStorage(
    file,
    bucketName,
    folderName
) {

    if (!file) {

        return null;

    }


    validateImageFile(
        file
    );


    if (!currentUser) {

        throw new Error(
            "ไม่พบผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่"
        );

    }


    const fileName =
        createSafeFileName(
            file
        );


    const filePath =
        folderName +
        "/" +
        currentUser.id +
        "/" +
        fileName;


    console.log(
        "UPLOAD IMAGE:",
        {
            bucketName,
            filePath,
            fileType: file.type,
            fileSize: file.size
        }
    );


    const {
        error: uploadError
    } =
        await supabaseClient

            .storage

            .from(bucketName)

            .upload(
                filePath,
                file,
                {
                    cacheControl:
                        "3600",

                    upsert:
                        false,

                    contentType:
                        file.type
                }
            );


    if (uploadError) {

        console.error(
            "STORAGE UPLOAD ERROR:",
            uploadError
        );

        throw uploadError;

    }


    const {
        data
    } =
        supabaseClient

            .storage

            .from(bucketName)

            .getPublicUrl(
                filePath
            );


    const publicUrl =
        data?.publicUrl;


    if (!publicUrl) {

        throw new Error(
            "ไม่สามารถสร้าง Public URL ของรูปภาพได้"
        );

    }


    console.log(
        "IMAGE PUBLIC URL:",
        publicUrl
    );


    return {

        path:
            filePath,

        url:
            publicUrl

    };

}


// ============================================================
// SAVE PROBLEM IMAGE RECORD
// ============================================================

async function saveProblemImageRecord(
    problemId,
    imageUrl,
    caption = ""
) {

    if (!problemId) {

        throw new Error(
            "ไม่พบ problem_id"
        );

    }


    if (!imageUrl) {

        throw new Error(
            "ไม่พบ image_url"
        );

    }


    const {
        data,
        error
    } =
        await supabaseClient

            .from(
                "problem_images"
            )

            .insert([
                {
                    problem_id:
                        problemId,

                    image_url:
                        imageUrl,

                    caption:
                        caption || "",

                    created_by:
                        currentUser
                            ? currentUser.id
                            : null
                }
            ])

            .select()
            .single();


    if (error) {

        console.error(
            "INSERT PROBLEM IMAGE ERROR:",
            error
        );

        throw error;

    }


    console.log(
        "PROBLEM IMAGE RECORD SAVED:",
        data
    );


    return data;

}


// ============================================================
// SAVE PROBLEM
// ============================================================

async function saveProblem(
    event
) {

    if (event) {

        event.preventDefault();

    }


    const title =
        $("title")
            ? $("title").value.trim()
            : "";


    const description =
        $("description")
            ? $("description").value.trim()
            : "";


    const category =
        $("category")
            ? $("category").value
            : "";


    const className = getSelectedClasses().join(", ");


    const symptoms =
        $("symptoms")
            ? $("symptoms").value.trim()
            : "";


    const causes =
        $("causes")
            ? $("causes").value.trim()
            : "";


    const status =
        $("status")
            ? $("status").value
            : "pending";


    const imageFile =
        getSelectedFile(
            "problemImage"
        );


    if (
        !title ||
        !description ||
        !category ||
        !className
    ) {

        showMessage(
            "กรุณากรอกชื่อเรื่อง รายละเอียด เลือกหมวดหมู่ และเลือก Class",
            "error"
        );

        return;

    }


    try {

        if (imageFile) {

            validateImageFile(
                imageFile
            );

        }


        let problemId =
            editingProblemId;


        const payload = {

            title:
                title,

            description:
                description,

            category:
                category,

            class_name:
                className,

            symptoms:
                symptoms,

            causes:
                causes,

            status:
                status

        };


        // ====================================================
        // UPDATE EXISTING PROBLEM
        // ====================================================

        if (editingProblemId) {

            const {
                error
            } =
                await supabaseClient

                    .from("problems")

                    .update(
                        payload
                    )

                    .eq(
                        "id",
                        editingProblemId
                    );


            if (error) {

                throw error;

            }

        }


        // ====================================================
        // INSERT NEW PROBLEM
        // ====================================================

        else {

            payload.created_by =
                currentUser
                    ? currentUser.id
                    : null;


            const {
                data,
                error
            } =
                await supabaseClient

                    .from("problems")

                    .insert([
                        payload
                    ])

                    .select(
                        "id"
                    )

                    .single();


            if (error) {

                throw error;

            }


            if (
                !data ||
                !data.id
            ) {

                throw new Error(
                    "สร้างปัญหาสำเร็จแต่ไม่พบ ID ของปัญหา"
                );

            }


            problemId =
                data.id;

        }


        // ====================================================
        // UPLOAD PROBLEM IMAGE
        // ====================================================

        if (imageFile) {

            showMessage(
                "กำลังอัปโหลดรูปภาพ...",
                "info"
            );


            const uploaded =
                await uploadImageToStorage(

                    imageFile,

                    "problem-images",

                    "problems"

                );


            await saveProblemImageRecord(

                problemId,

                uploaded.url,

                ""

            );

        }


        // ====================================================
        // SUCCESS
        // ====================================================

        if (editingProblemId) {

            showMessage(
                imageFile
                    ? "แก้ไขปัญหาและบันทึกรูปสำเร็จ"
                    : "แก้ไขปัญหาสำเร็จ",
                "success"
            );

        }

        else {

            showMessage(
                imageFile
                    ? "เพิ่มปัญหาและอัปโหลดรูปสำเร็จ"
                    : "เพิ่มปัญหาสำเร็จ",
                "success"
            );

        }


        closeProblemModal();


        await loadProblems();

    }

    catch (error) {

        console.error(
            "SAVE PROBLEM ERROR:",
            error
        );


        showMessage(
            "บันทึกไม่สำเร็จ: " +
            (
                error?.message ||
                "เกิดข้อผิดพลาด"
            ),
            "error"
        );

    }

}


// ============================================================
// CHANGE PROBLEM STATUS
// ============================================================

async function changeProblemStatus(
    id,
    newStatus
) {

    try {

        const {
            error
        } =
            await supabaseClient

                .from("problems")

                .update({
                    status:
                        newStatus
                })

                .eq(
                    "id",
                    id
                );


        if (error) {

            throw error;

        }


        showMessage(
            "อัปเดตสถานะเรียบร้อย",
            "success"
        );


        await loadProblems();

    }

    catch (error) {

        console.error(
            "CHANGE STATUS ERROR:",
            error
        );


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

async function deleteProblem(
    id
) {

    if (
        !confirm(
            "ยืนยันการลบปัญหานี้?\n\nข้อมูลวิธีแก้ไขและรูปภาพที่เกี่ยวข้องจะถูกลบออกด้วย"
        )
    ) {

        return;

    }


    try {

        // ====================================================
        // DELETE SOLUTION IMAGES RECORDS
        // ====================================================

        const {
            data: solutions,
            error: solutionLoadError
        } =
            await supabaseClient

                .from("solutions")

                .select("id")

                .eq(
                    "problem_id",
                    id
                );


        if (solutionLoadError) {

            console.warn(
                "LOAD SOLUTIONS BEFORE DELETE:",
                solutionLoadError
            );

        }


        if (
            solutions &&
            solutions.length > 0
        ) {

            const solutionIds =
                solutions.map(
                    (item) =>
                        item.id
                );


            const {
                error:
                    solutionImageDeleteError
            } =
                await supabaseClient

                    .from(
                        "solution_images"
                    )

                    .delete()

                    .in(
                        "solution_id",
                        solutionIds
                    );


            if (
                solutionImageDeleteError
            ) {

                console.warn(
                    "DELETE SOLUTION IMAGES ERROR:",
                    solutionImageDeleteError
                );

            }

        }


        // ====================================================
        // DELETE SOLUTIONS
        // ====================================================

        const {
            error:
                solutionDeleteError
        } =
            await supabaseClient

                .from("solutions")

                .delete()

                .eq(
                    "problem_id",
                    id
                );


        if (
            solutionDeleteError
        ) {

            throw solutionDeleteError;

        }


        // ====================================================
        // DELETE PROBLEM IMAGE RECORDS
        // ====================================================

        const {
            error:
                problemImageDeleteError
        } =
            await supabaseClient

                .from(
                    "problem_images"
                )

                .delete()

                .eq(
                    "problem_id",
                    id
                );


        if (
            problemImageDeleteError
        ) {

            console.warn(
                "DELETE PROBLEM IMAGES ERROR:",
                problemImageDeleteError
            );

        }


        // ====================================================
        // DELETE PROBLEM
        // ====================================================

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
            "DELETE PROBLEM ERROR:",
            error
        );


        showMessage(
            "ลบไม่สำเร็จ: " +
            error.message,
            "error"
        );

    }

}


// ============================================================
// SOLUTIONS MODAL
// ============================================================

async function manageSolutions(
    problemId
) {

    currentProblemForSolution =
        allProblems.find(
            (i) =>
                String(i.id) ===
                String(problemId)
        );


    if (
        !currentProblemForSolution
    ) {

        return;

    }


    setText(
        "solutionProblemTitle",
        currentProblemForSolution.title ||
        ""
    );


    const {
        data,
        error
    } =
        await supabaseClient

            .from("solutions")

            .select("*")

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

        showMessage(
            "โหลดวิธีแก้ไขไม่สำเร็จ: " +
            error.message,
            "error"
        );

        return;

    }


    renderSolutionList(
        data || []
    );


    if ($("solutionFormBox")) {

        $("solutionFormBox").style.display =
            "none";

    }


    if ($("solutionModal")) {

        $("solutionModal").style.display =
            "flex";

    }

}


// ============================================================
// RENDER SOLUTION LIST
// ============================================================

function renderSolutionList(
    solutions
) {

    const list =
        $("solutionList");


    if (!list) return;


    if (
        solutions.length === 0
    ) {

        list.innerHTML = `

            <p
                style="
                    color:#64748b;
                    text-align:center;
                    padding:20px;
                "
            >
                ยังไม่มีขั้นตอนการแก้ไข
            </p>

        `;

        return;

    }


    list.innerHTML =
        solutions
            .map(
                (sol) => `

                <div
                    style="
                        background:#f8fafc;
                        border:1px solid #e2e8f0;
                        border-radius:8px;
                        padding:12px 16px;
                        margin-bottom:10px;
                        display:flex;
                        justify-content:space-between;
                        align-items:flex-start;
                    "
                >

                    <div>

                        <strong
                            style="
                                color:#1e293b;
                            "
                        >

                            ขั้นตอนที่
                            ${sol.step_number}:

                            ${escapeHtml(
                                sol.title ||
                                ""
                            )}

                        </strong>


                        <p
                            style="
                                margin:4px 0 0 0;
                                font-size:14px;
                                color:#475569;
                                white-space:pre-line;
                            "
                        >

                            ${escapeHtml(
                                sol.description ||
                                ""
                            )}

                        </p>

                    </div>


                    <button
                        type="button"
                        class="btn-del-sol"
                        data-id="${sol.id}"
                        style="
                            background:#fee2e2;
                            color:#dc2626;
                            border:none;
                            padding:4px 8px;
                            border-radius:4px;
                            cursor:pointer;
                            font-size:12px;
                        "
                    >

                        🗑️ ลบ

                    </button>

                </div>

            `
            )
            .join("");


    document
        .querySelectorAll(
            ".btn-del-sol"
        )
        .forEach(
            (btn) => {

                btn.addEventListener(
                    "click",
                    () =>
                        deleteSolutionStep(
                            btn.dataset.id
                        )
                );

            }
        );

}


// ============================================================
// OPEN ADD SOLUTION
// ============================================================

function openAddSolutionForm() {

    const form =
        $("solutionForm");


    if (form) {

        form.reset();

    }


    if ($("solutionImagePreview")) {

        $("solutionImagePreview").innerHTML =
            "";

    }


    if ($("solutionFormBox")) {

        $("solutionFormBox").style.display =
            "block";


        $("solutionFormBox")
            .scrollIntoView({
                behavior:
                    "smooth"
            });

    }

}


// ============================================================
// SAVE SOLUTION
// ============================================================

async function saveSolution(
    event
) {

    if (event) {

        event.preventDefault();

    }


    if (
        !currentProblemForSolution
    ) {

        return;

    }


    const stepNumber =
        Number(
            $("stepNumber")
                ? $("stepNumber").value
                : 1
        ) || 1;


    const title =
        $("solutionTitle")
            ? $("solutionTitle")
                .value
                .trim()
            : "";


    const description =
        $("solutionDescription")
            ? $("solutionDescription")
                .value
                .trim()
            : "";


    const status =
        $("solutionStatus")
            ? $("solutionStatus").value
            : "pending";


    const imageFile =
        getSelectedFile(
            "solutionImage"
        );


    if (!title) {

        showMessage(
            "กรุณากรอกหัวข้อขั้นตอน",
            "error"
        );

        return;

    }


    try {

        if (imageFile) {

            validateImageFile(
                imageFile
            );

        }


        // ====================================================
        // CREATE SOLUTION
        // ====================================================

        const {
            data: solution,
            error
        } =
            await supabaseClient

                .from("solutions")

                .insert([
                    {

                        problem_id:
                            currentProblemForSolution.id,

                        step_number:
                            stepNumber,

                        title:
                            title,

                        description:
                            description,

                        status:
                            status,

                        created_by:
                            currentUser
                                ? currentUser.id
                                : null

                    }
                ])

                .select(
                    "id"
                )

                .single();


        if (error) {

            throw error;

        }


        if (
            !solution ||
            !solution.id
        ) {

            throw new Error(
                "สร้างวิธีแก้ไขสำเร็จแต่ไม่พบ ID"
            );

        }


        // ====================================================
        // UPLOAD SOLUTION IMAGE
        // ====================================================

        if (imageFile) {

            showMessage(
                "กำลังอัปโหลดรูปวิธีแก้ไข...",
                "info"
            );


            const uploaded =
                await uploadImageToStorage(

                    imageFile,

                    "solution-images",

                    "solutions"

                );


            const {
                error:
                    imageInsertError
            } =
                await supabaseClient

                    .from(
                        "solution_images"
                    )

                    .insert([
                        {

                            solution_id:
                                solution.id,

                            image_url:
                                uploaded.url,

                            caption:
                                "",

                            created_by:
                                currentUser
                                    ? currentUser.id
                                    : null

                        }
                    ]);


            if (
                imageInsertError
            ) {

                throw imageInsertError;

            }

        }


        showMessage(
            imageFile
                ? "เพิ่มขั้นตอนและรูปสำเร็จ"
                : "เพิ่มขั้นตอนสำเร็จ",
            "success"
        );


        await manageSolutions(
            currentProblemForSolution.id
        );

    }

    catch (error) {

        console.error(
            "SAVE SOLUTION ERROR:",
            error
        );


        showMessage(
            "บันทึกขั้นตอนไม่สำเร็จ: " +
            error.message,
            "error"
        );

    }

}


// ============================================================
// DELETE SOLUTION
// ============================================================

async function deleteSolutionStep(
    solutionId
) {

    if (
        !confirm(
            "ต้องการลบขั้นตอนนี้ใช่หรือไม่?"
        )
    ) {

        return;

    }


    try {

        // Delete solution image records
        const {
            error:
                imageDeleteError
        } =
            await supabaseClient

                .from(
                    "solution_images"
                )

                .delete()

                .eq(
                    "solution_id",
                    solutionId
                );


        if (
            imageDeleteError
        ) {

            console.warn(
                "DELETE SOLUTION IMAGE ERROR:",
                imageDeleteError
            );

        }


        // Delete solution
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


        if (
            currentProblemForSolution
        ) {

            await manageSolutions(
                currentProblemForSolution.id
            );

        }

    }

    catch (error) {

        console.error(
            "DELETE SOLUTION ERROR:",
            error
        );


        showMessage(
            "ลบไม่สำเร็จ: " +
            error.message,
            "error"
        );

    }

}


// ============================================================
// SEARCH
// ============================================================

function setupSearch() {

    const searchInput =
        $("adminSearch");


    if (!searchInput) return;


    searchInput.addEventListener(
        "input",
        () => {

            const keyword =
                searchInput.value
                    .trim()
                    .toLowerCase();


            if (!keyword) {

                renderProblems(
                    allProblems
                );

                return;

            }


            const filtered =
                allProblems.filter(
                    (p) => {

                        return (

                            (
                                p.title ||
                                ""
                            )
                                .toLowerCase()
                                .includes(
                                    keyword
                                )

                            ||

                            (
                                p.description ||
                                ""
                            )
                                .toLowerCase()
                                .includes(
                                    keyword
                                )

                            ||

                            (
                                p.category ||
                                ""
                            )
                                .toLowerCase()
                                .includes(
                                    keyword
                                )

                            ||

                            (
                                p.class_name ||
                                ""
                            )
                                .toLowerCase()
                                .includes(
                                    keyword
                                )

                        );

                    }
                );


            renderProblems(
                filtered
            );

        }
    );

}


// ============================================================
// IMAGE PREVIEW
// ============================================================

function setupImagePreview(
    inputId,
    previewId
) {

    const input =
        $(inputId);


    const preview =
        $(previewId);


    if (
        !input ||
        !preview
    ) {

        return;

    }


    input.addEventListener(
        "change",
        () => {

            const file =
                input.files[0];


            if (!file) {

                preview.innerHTML =
                    "";

                return;

            }


            try {

                validateImageFile(
                    file
                );

            }

            catch (error) {

                input.value =
                    "";

                preview.innerHTML =
                    "";


                showMessage(
                    error.message,
                    "error"
                );


                return;

            }


            const reader =
                new FileReader();


            reader.onload =
                (e) => {

                    preview.innerHTML = `

                        <div
                            style="
                                margin-top:8px;
                            "
                        >

                            <img
                                src="${e.target.result}"
                                alt="Preview"
                                style="
                                    max-width:100%;
                                    max-height:200px;
                                    border-radius:8px;
                                    display:block;
                                    object-fit:contain;
                                "
                            />

                            <small
                                style="
                                    display:block;
                                    margin-top:6px;
                                    color:#64748b;
                                "
                            >

                                ${escapeHtml(
                                    file.name
                                )}

                                (${(
                                    file.size /
                                    1024 /
                                    1024
                                ).toFixed(2)} MB)

                            </small>

                        </div>

                    `;

                };


            reader.readAsDataURL(
                file
            );

        }
    );

}


// ============================================================
// SETUP EVENTS
// ============================================================

function setupEvents() {

    // ========================================================
    // PROBLEM BUTTONS
    // ========================================================

    if ($("addProblemButton")) {

        $("addProblemButton")
            .addEventListener(
                "click",
                openAddProblemModal
            );

    }


    if ($("closeProblemModal")) {

        $("closeProblemModal")
            .addEventListener(
                "click",
                closeProblemModal
            );

    }


    // ปิด Modal เมื่อคลิกพื้นที่ด้านนอก
    if ($("problemModal")) {

        $("problemModal").addEventListener(
            "click",
            (event) => {

                if (event.target === $("problemModal")) {
                    closeProblemModal();
                }

            }
        );

    }


    // ========================================================
    // SOLUTION BUTTONS
    // ========================================================

    if ($("closeSolutionModal")) {

        $("closeSolutionModal")
            .addEventListener(
                "click",
                () => {

                    if (
                        $("solutionModal")
                    ) {

                        $("solutionModal")
                            .style
                            .display =
                            "none";

                    }

                }
            );

    }


    if ($("addSolutionButton")) {

        $("addSolutionButton")
            .addEventListener(
                "click",
                openAddSolutionForm
            );

    }


    if ($("cancelSolutionButton")) {

        $("cancelSolutionButton")
            .addEventListener(
                "click",
                () => {

                    if (
                        $("solutionFormBox")
                    ) {

                        $("solutionFormBox")
                            .style
                            .display =
                            "none";

                    }

                }
            );

    }


    // ========================================================
    // FORMS
    // ========================================================

    if ($("problemForm")) {

        $("problemForm")
            .addEventListener(
                "submit",
                saveProblem
            );

    }


    if ($("solutionForm")) {

        $("solutionForm")
            .addEventListener(
                "submit",
                saveSolution
            );

    }


    // ========================================================
    // IMAGE PREVIEW
    // ========================================================

    setupImagePreview(
        "problemImage",
        "problemImagePreview"
    );


    setupImagePreview(
        "solutionImage",
        "solutionImagePreview"
    );

    setupDropPaste("problemImage", "problemImagePreview");
    setupDropPaste("solutionImage", "solutionImagePreview");
    setupGlobalImagePaste();


    // ========================================================
    // MODAL BACKGROUND CLICK
    // ========================================================

    window.addEventListener(
        "click",
        (e) => {

            if (
                e.target ===
                $("problemModal")
            ) {

                closeProblemModal();

            }


            if (
                e.target ===
                $("solutionModal")
            ) {

                if (
                    $("solutionModal")
                ) {

                    $("solutionModal")
                        .style
                        .display =
                        "none";

                }

            }

        }
    );

}


// ============================================================
// INITIALIZATION
// ============================================================

async function initDashboard() {

    const isOk =
        await checkAdmin();


    if (!isOk) {

        return;

    }


    await loadProblems();


    setupSearch();


    setupEvents();

}


// ============================================================
// START
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initDashboard();

    }
);
