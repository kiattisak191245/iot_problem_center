// ============================================================
// IoT PROBLEM CENTER - DASHBOARD.JS (FULL FIXED VERSION)
// ============================================================

// ============================================================
// GLOBAL VARIABLES
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
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
}

function setText(id, value) {
    const element = $(id);
    if (element) {
        element.textContent = value;
    }
}

// ============================================================
// TOAST NOTIFICATION
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
        box.style.transition = "all 0.3s ease";
        document.body.appendChild(box);
    }

    box.textContent = message;

    if (type === "success") {
        box.style.background = "#16a34a";
        box.style.color = "#fff";
    } else if (type === "error") {
        box.style.background = "#dc2626";
        box.style.color = "#fff";
    } else {
        box.style.background = "#2563eb";
        box.style.color = "#fff";
    }

    box.style.display = "block";

    setTimeout(() => {
        box.style.display = "none";
    }, 4000);
}

// ============================================================
// AUTH & ADMIN CHECK
// ============================================================

async function getCurrentUser() {
    try {
        const { data, error } = await supabaseClient.auth.getSession();
        if (error || !data.session) {
            return null;
        }
        return data.session.user;
    } catch (error) {
        console.error("GET USER ERROR:", error);
        return null;
    }
}

async function checkAdmin() {
    try {
        currentUser = await getCurrentUser();

        if (!currentUser) {
            window.location.href = "login.html";
            return false;
        }

        console.log("LOGIN USER ID:", currentUser.id);
        console.log("LOGIN EMAIL:", currentUser.email);

        let adminResult = false;

        // 1. ตรวจสอบสิทธิ์จากตาราง profiles (ที่ใช้งานในระบบจริง)
        try {
            const { data, error } = await supabaseClient
                .from("profiles")
                .select("role")
                .eq("id", currentUser.id)
                .maybeSingle();

            if (!error && data && data.role === "admin") {
                adminResult = true;
            }
        } catch (err) {
            console.log("ไม่สามารถอ่านตาราง profiles ได้:", err);
        }

        // 2. สำรอง: ตรวจสอบจากตาราง admins
        if (!adminResult) {
            try {
                const { data, error } = await supabaseClient
                    .from("admins")
                    .select("user_id")
                    .eq("user_id", currentUser.id)
                    .maybeSingle();

                if (!error && data) {
                    adminResult = true;
                }
            } catch (err) {
                console.log("ไม่พบตาราง admins:", err);
            }
        }

        // 3. สำรอง: ตรวจสอบจาก user_metadata
        if (!adminResult) {
            const metadata = currentUser.user_metadata || {};
            if (metadata.role === "admin" || metadata.is_admin === true) {
                adminResult = true;
            }
        }

        isAdmin = adminResult;
        console.log("IS ADMIN:", isAdmin);

        if (!isAdmin) {
            alert("บัญชีนี้ไม่มีสิทธิ์เข้า Admin Dashboard");
            window.location.href = "index.html";
            return false;
        }

        updateUserArea();
        return true;
    } catch (error) {
        console.error("CHECK ADMIN ERROR:", error);
        alert("ไม่สามารถตรวจสอบสิทธิ์ Admin ได้");
        window.location.href = "index.html";
        return false;
    }
}

function updateUserArea() {
    if (!currentUser) return;

    const adminEmail = $("adminEmail");
    if (adminEmail) {
        adminEmail.textContent = currentUser.email || "Admin";
    }

    const logoutBtn = $("logoutButton");
    if (logoutBtn) {
        logoutBtn.replaceWith(logoutBtn.cloneNode(true)); // ลบ listener เก่า
        const newLogoutBtn = $("logoutButton");
        if (newLogoutBtn) {
            newLogoutBtn.addEventListener("click", logout);
        }
    }
}

async function logout() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        window.location.href = "login.html";
    } catch (error) {
        console.error("LOGOUT ERROR:", error);
        showMessage("ออกจากระบบไม่สำเร็จ: " + error.message, "error");
    }
}

// ============================================================
// LOAD & RENDER PROBLEMS
// ============================================================

async function loadProblems() {
    const loading = $("loading");
    if (loading) loading.style.display = "block";

    try {
        const { data, error } = await supabaseClient
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
            .order("created_at", { ascending: false });

        if (error) throw error;

        allProblems = data || [];
        renderProblems();
        updateStatistics();
    } catch (error) {
        console.error("LOAD PROBLEMS ERROR:", error);

        const container = $("problemTable") || $("problemList");
        if (container) {
            container.innerHTML = `
                <div class="no-result" style="text-align:center; padding:30px; color:#dc2626;">
                    ❌ โหลดข้อมูลไม่สำเร็จ: ${escapeHtml(error.message)}
                </div>
            `;
        }
        showMessage("โหลดข้อมูลไม่สำเร็จ: " + error.message, "error");
    } finally {
        if (loading) loading.style.display = "none";
    }
}

function renderProblems() {
    const container = $("problemTable") || $("problemList");
    if (!container) return;

    container.innerHTML = "";

    if (allProblems.length === 0) {
        container.innerHTML = `
            <div class="no-result" style="text-align:center; padding:40px; color:#666;">
                ยังไม่มีข้อมูลปัญหาในระบบ
            </div>
        `;
        return;
    }

    allProblems.forEach((problem) => {
        const card = document.createElement("div");
        card.className = "problem-card";

        let statusText = "รอตรวจสอบ";
        let statusClass = "pending";

        if (problem.status === "published") {
            statusText = "เผยแพร่แล้ว";
            statusClass = "published";
        } else if (problem.status === "rejected") {
            statusText = "ไม่เผยแพร่";
            statusClass = "rejected";
        }

        card.innerHTML = `
            <div class="problem-card-header">
                <span class="problem-category">${escapeHtml(problem.category || "ทั่วไป")}</span>
                <span class="problem-status ${statusClass}">${statusText}</span>
            </div>

            <h3>${escapeHtml(problem.title || "ไม่มีชื่อปัญหา")}</h3>
            <p>${escapeHtml(problem.description || "ไม่มีรายละเอียด")}</p>

            <div class="problem-info">
                <small>ID: ${escapeHtml(problem.id)}</small>
            </div>

            <div class="problem-actions">
                <button type="button" class="edit-problem-button" data-id="${problem.id}">
                    ✏️ แก้ไข
                </button>

                <button type="button" class="solution-problem-button" data-id="${problem.id}">
                    🛠 วิธีแก้ไข
                </button>

                ${
                    problem.status !== "published"
                        ? `<button type="button" class="publish-problem-button" data-id="${problem.id}">🟢 เผยแพร่</button>`
                        : `<button type="button" class="unpublish-problem-button" data-id="${problem.id}">🔴 ยกเลิกเผยแพร่</button>`
                }

                <button type="button" class="delete-problem-button" data-id="${problem.id}">
                    🗑️ ลบ
                </button>
            </div>
        `;

        container.appendChild(card);
    });

    bindProblemButtons();
}

function bindProblemButtons() {
    document.querySelectorAll(".edit-problem-button").forEach((btn) => {
        btn.addEventListener("click", () => editProblem(btn.dataset.id));
    });

    document.querySelectorAll(".solution-problem-button").forEach((btn) => {
        btn.addEventListener("click", () => manageSolutions(btn.dataset.id));
    });

    document.querySelectorAll(".publish-problem-button").forEach((btn) => {
        btn.addEventListener("click", () => changeProblemStatus(btn.dataset.id, "published"));
    });

    document.querySelectorAll(".unpublish-problem-button").forEach((btn) => {
        btn.addEventListener("click", () => changeProblemStatus(btn.dataset.id, "pending"));
    });

    document.querySelectorAll(".delete-problem-button").forEach((btn) => {
        btn.addEventListener("click", () => deleteProblem(btn.dataset.id));
    });
}

function updateStatistics() {
    const total = allProblems.length;
    const pending = allProblems.filter((i) => i.status === "pending").length;
    const published = allProblems.filter((i) => i.status === "published").length;
    const rejected = allProblems.filter((i) => i.status === "rejected").length;

    setText("totalProblems", total);
    setText("pendingProblems", pending);
    setText("publishedProblems", published);
    setText("rejectedProblems", rejected);
}

// ============================================================
// PROBLEM MODAL (ADD / EDIT)
// ============================================================

function openAddProblemModal() {
    editingProblemId = null;
    resetProblemForm();

    setText("problemModalTitle", "เพิ่มปัญหาใหม่");

    const modal = $("problemModal");
    if (modal) modal.style.display = "flex";
}

function closeProblemModal() {
    const modal = $("problemModal");
    if (modal) modal.style.display = "none";
    resetProblemForm();
}

function resetProblemForm() {
    const form = $("problemForm");
    if (form) form.reset();

    const hiddenId = $("editingProblemId");
    if (hiddenId) hiddenId.value = "";

    const statusField = $("status") || $("problemStatus");
    if (statusField) statusField.value = "pending";

    const msgBox = $("formMessage");
    if (msgBox) msgBox.textContent = "";
}

function editProblem(id) {
    const problem = allProblems.find((item) => String(item.id) === String(id));
    if (!problem) {
        showMessage("ไม่พบข้อมูลปัญหา", "error");
        return;
    }

    editingProblemId = id;

    const hiddenId = $("editingProblemId");
    if (hiddenId) hiddenId.value = id;

    const titleField = $("title") || $("problemTitle");
    const descField = $("description") || $("problemDescription");
    const catField = $("category") || $("problemCategory");
    const sympField = $("symptoms") || $("problemSymptoms");
    const causesField = $("causes") || $("problemCauses");
    const statusField = $("status") || $("problemStatus");

    if (titleField) titleField.value = problem.title || "";
    if (descField) descField.value = problem.description || "";
    if (catField) catField.value = problem.category || "";
    if (sympField) sympField.value = problem.symptoms || "";
    if (causesField) causesField.value = problem.causes || "";
    if (statusField) statusField.value = problem.status || "pending";

    setText("problemModalTitle", "แก้ไขปัญหา");

    const modal = $("problemModal");
    if (modal) modal.style.display = "flex";
}

async function saveProblem(event) {
    if (event) event.preventDefault();

    if (!isAdmin || !currentUser) {
        showMessage("ไม่มีสิทธิ์ดำเนินการ", "error");
        return;
    }

    const titleField = $("title") || $("problemTitle");
    const descField = $("description") || $("problemDescription");
    const catField = $("category") || $("problemCategory");
    const sympField = $("symptoms") || $("problemSymptoms");
    const causesField = $("causes") || $("problemCauses");
    const statusField = $("status") || $("problemStatus");

    const title = titleField ? titleField.value.trim() : "";
    const description = descField ? descField.value.trim() : "";
    const category = catField ? catField.value : "";
    const symptoms = sympField ? sympField.value.trim() : "";
    const causes = causesField ? causesField.value.trim() : "";
    const status = statusField ? statusField.value : "pending";

    if (!title) {
        showMessage("กรุณากรอกชื่อปัญหา", "error");
        return;
    }

    if (!description) {
        showMessage("กรุณากรอกรายละเอียดปัญหา", "error");
        return;
    }

    try {
        let result;

        if (editingProblemId) {
            result = await supabaseClient
                .from("problems")
                .update({
                    title: title,
                    description: description,
                    category: category,
                    symptoms: symptoms,
                    causes: causes,
                    status: status
                })
                .eq("id", editingProblemId);
        } else {
            result = await supabaseClient
                .from("problems")
                .insert({
                    title: title,
                    description: description,
                    category: category,
                    symptoms: symptoms,
                    causes: causes,
                    status: status,
                    created_by: currentUser.id
                });
        }

        if (result.error) throw result.error;

        showMessage(editingProblemId ? "แก้ไขข้อมูลสำเร็จ" : "เพิ่มปัญหาสำเร็จ", "success");
        closeProblemModal();
        editingProblemId = null;
        await loadProblems();
    } catch (error) {
        console.error("SAVE PROBLEM ERROR:", error);
        showMessage("บันทึกไม่สำเร็จ: " + error.message, "error");
    }
}

async function changeProblemStatus(id, newStatus) {
    if (!isAdmin) {
        showMessage("ไม่มีสิทธิ์ดำเนินการ", "error");
        return;
    }

    const confirmMsg = newStatus === "published"
        ? "ต้องการเผยแพร่ปัญหานี้หรือไม่?"
        : "ต้องการยกเลิกการเผยแพร่หรือไม่?";

    if (!confirm(confirmMsg)) return;

    try {
        const { error } = await supabaseClient
            .from("problems")
            .update({ status: newStatus })
            .eq("id", id);

        if (error) throw error;

        showMessage(newStatus === "published" ? "เผยแพร่สำเร็จ" : "ยกเลิกการเผยแพร่สำเร็จ", "success");
        await loadProblems();
    } catch (error) {
        console.error("CHANGE STATUS ERROR:", error);
        showMessage("เปลี่ยนสถานะไม่สำเร็จ: " + error.message, "error");
    }
}

async function deleteProblem(id) {
    if (!isAdmin) {
        showMessage("ไม่มีสิทธิ์ดำเนินการ", "error");
        return;
    }

    if (!confirm("ต้องการลบปัญหานี้หรือไม่?\nข้อมูลวิธีแก้ไขจะถูกลบไปด้วยและไม่สามารถกู้คืนได้")) {
        return;
    }

    try {
        const { error: solErr } = await supabaseClient
            .from("solutions")
            .delete()
            .eq("problem_id", id);

        if (solErr && solErr.code !== "PGRST116") {
            console.warn("DELETE SOLUTIONS WARNING:", solErr);
        }

        const { error } = await supabaseClient
            .from("problems")
            .delete()
            .eq("id", id);

        if (error) throw error;

        showMessage("ลบปัญหาสำเร็จ", "success");
        await loadProblems();
    } catch (error) {
        console.error("DELETE PROBLEM ERROR:", error);
        showMessage("ลบข้อมูลไม่สำเร็จ: " + error.message, "error");
    }
}

// ============================================================
// SOLUTIONS MANAGEMENT
// ============================================================

async function manageSolutions(problemId) {
    currentProblemForSolution = allProblems.find((i) => String(i.id) === String(problemId));
    if (!currentProblemForSolution) {
        showMessage("ไม่พบปัญหา", "error");
        return;
    }

    const { data, error } = await supabaseClient
        .from("solutions")
        .select(`id, problem_id, step_number, title, content`)
        .eq("problem_id", problemId)
        .order("step_number", { ascending: true });

    if (error) {
        showMessage("โหลดวิธีแก้ไขไม่สำเร็จ: " + error.message, "error");
        return;
    }

    renderSolutionModal(currentProblemForSolution, data || []);
}

function renderSolutionModal(problem, solutions) {
    const modal = $("solutionModal");
    if (!modal) return;

    setText("solutionProblemTitle", problem.title || "");

    const solutionList = $("solutionList");
    if (solutionList) {
        if (solutions.length === 0) {
            solutionList.innerHTML = `<p style="color:#888; text-align:center; padding:15px;">ยังไม่มีวิธีแก้ไข</p>`;
        } else {
            solutionList.innerHTML = solutions
                .map((sol, idx) => `
                    <div class="solution-item" data-solution-id="${sol.id}" style="margin-bottom:15px; padding:15px; border:1px solid #e2e8f0; border-radius:8px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <strong>ขั้นตอนที่ ${sol.step_number || idx + 1}: ${escapeHtml(sol.title || "")}</strong>
                            <button type="button" class="delete-solution-button" data-id="${sol.id}" style="background:#dc2626; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">
                                🗑️ ลบ
                            </button>
                        </div>
                        <p style="margin:0; color:#334155; white-space:pre-line;">${escapeHtml(sol.content || "")}</p>
                    </div>
                `)
                .join("");
        }
    }

    document.querySelectorAll(".delete-solution-button").forEach((btn) => {
        btn.addEventListener("click", () => deleteSolution(btn.dataset.id));
    });

    // ซ่อนกล่องฟอร์มไว้ก่อน
    const formBox = $("solutionFormBox");
    if (formBox) formBox.style.display = "none";

    modal.style.display = "flex";
}

function openAddSolutionForm() {
    const formBox = $("solutionFormBox");
    const form = $("solutionForm");
    if (form) form.reset();

    if (formBox) {
        formBox.style.display = "block";
        formBox.scrollIntoView({ behavior: "smooth" });
    }
}

async function saveSolution(event) {
    if (event) event.preventDefault();

    if (!currentProblemForSolution) {
        showMessage("ไม่พบบัญชีปัญหาที่จะเพิ่มวิธีแก้ไข", "error");
        return;
    }

    const stepInput = $("stepNumber");
    const titleInput = $("solutionTitle");
    const descInput = $("solutionDescription");
    const statusSelect = $("solutionStatus");

    const step = stepInput ? Number(stepInput.value) || 1 : 1;
    const title = titleInput ? titleInput.value.trim() : "";
    const content = descInput ? descInput.value.trim() : "";
    const status = statusSelect ? statusSelect.value : "pending";

    if (!title && !content) {
        showMessage("กรุณากรอกข้อมูลขั้นตอนอย่างน้อย 1 ช่อง", "error");
        return;
    }

    try {
        const { error } = await supabaseClient
            .from("solutions")
            .insert({
                problem_id: currentProblemForSolution.id,
                step_number: step,
                title: title,
                content: content,
                status: status
            });

        if (error) throw error;

        showMessage("เพิ่มขั้นตอนสำเร็จ", "success");

        const formBox = $("solutionFormBox");
        if (formBox) formBox.style.display = "none";

        await manageSolutions(currentProblemForSolution.id);
    } catch (error) {
        console.error("SAVE SOLUTION ERROR:", error);
        showMessage("บันทึกวิธีแก้ไขไม่สำเร็จ: " + error.message, "error");
    }
}

async function deleteSolution(solutionId) {
    if (!confirm("ต้องการลบขั้นตอนนี้หรือไม่?")) return;

    try {
        const { error } = await supabaseClient
            .from("solutions")
            .delete()
            .eq("id", solutionId);

        if (error) throw error;

        showMessage("ลบขั้นตอนสำเร็จ", "success");
        if (currentProblemForSolution) {
            await manageSolutions(currentProblemForSolution.id);
        }
    } catch (error) {
        console.error("DELETE SOLUTION ERROR:", error);
        showMessage("ลบขั้นตอนไม่สำเร็จ: " + error.message, "error");
    }
}

// ============================================================
// SEARCH & EVENT SETUP
// ============================================================

function setupSearch() {
    const input = $("adminSearch") || $("searchInput");
    if (!input) return;

    input.addEventListener("input", () => {
        const keyword = input.value.trim().toLowerCase();

        if (!keyword) {
            renderProblems();
            return;
        }

        const filtered = allProblems.filter((problem) => {
            return (
                (problem.title || "").toLowerCase().includes(keyword) ||
                (problem.description || "").toLowerCase().includes(keyword) ||
                (problem.category || "").toLowerCase().includes(keyword)
            );
        });

        const original = allProblems;
        allProblems = filtered;
        renderProblems();
        allProblems = original;
    });
}

function setupEventListeners() {
    // ปิด Modal ปัญหา
    const closeProbBtn = $("closeProblemModal");
    if (closeProbBtn) {
        closeProbBtn.addEventListener("click", closeProblemModal);
    }

    // ปิด Modal วิธีแก้ไข
    const closeSolBtn = $("closeSolutionModal");
    if (closeSolBtn) {
        closeSolBtn.addEventListener("click", () => {
            const modal = $("solutionModal");
            if (modal) modal.style.display = "none";
        });
    }

    // ปุ่มเปิดฟอร์มเพิ่มวิธีแก้ไข
    const addSolBtn = $("addSolutionButton");
    if (addSolBtn) {
        addSolBtn.addEventListener("click", openAddSolutionForm);
    }

    // ปุ่ม ยกเลิก ในฟอร์มวิธีแก้ไข
    const cancelSolBtn = $("cancelSolutionButton");
    if (cancelSolBtn) {
        cancelSolBtn.addEventListener("click", () => {
            const formBox = $("solutionFormBox");
            if (formBox) formBox.style.display = "none";
        });
    }

    // Submit ฟอร์มปัญหา
    const probForm = $("problemForm");
    if (probForm) {
        probForm.addEventListener("submit", saveProblem);
    }

    // Submit ฟอร์มวิธีแก้ไข
    const solForm = $("solutionForm");
    if (solForm) {
        solForm.addEventListener("submit", saveSolution);
    }

    // คลิกพื้นหลังนอก Modal เพื่อปิด
    window.addEventListener("click", (e) => {
        const probModal = $("problemModal");
        if (e.target === probModal) closeProblemModal();

        const solModal = $("solutionModal");
        if (e.target === solModal) solModal.style.display = "none";
    });
}

function setupAddButton() {
    const addBtn = $("addProblemButton");
    if (addBtn) {
        addBtn.addEventListener("click", openAddProblemModal);
    }
}

function setupAuthListener() {
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (!session) {
            window.location.href = "login.html";
            return;
        }
        if (event === "SIGNED_IN") {
            currentUser = session.user;
        }
    });
}

// ============================================================
// START DASHBOARD
// ============================================================

async function startDashboard() {
    console.log("================================");
    console.log("START ADMIN DASHBOARD");
    console.log("================================");

    // 1. ตรวจสอบสิทธิ์ Admin
    const allowed = await checkAdmin();
    if (!allowed) return;

    // 2. โหลดรายการปัญหา
    await loadProblems();

    // 3. ผูก Event Listeners ทั้งหมด
    setupAddButton();
    setupSearch();
    setupEventListeners();
    setupAuthListener();

    console.log("ADMIN DASHBOARD READY");
}

document.addEventListener("DOMContentLoaded", () => {
    startDashboard();
});
