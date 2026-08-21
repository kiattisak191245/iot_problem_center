// ============================================================
// IoT PROBLEM CENTER - DASHBOARD.JS (FULL FIXED VERSION)
// ============================================================

let currentUser = null;
let isAdmin = false;
let allProblems = [];
let editingProblemId = null;

// Helper: ดึง Element ตาม ID
function $(id) {
    return document.getElementById(id);
}

// Helper: แปลงอักขระป้องกัน XSS
function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
}

// Helper: กำหนดข้อความให้ Element
function setText(id, value) {
    const element = $(id);
    if (element) {
        element.textContent = value;
    }
}

// Helper: ดึง Field โดยรองรับทั้ง ID หลักและ ID สำรอง
function getField(primaryId, fallbackId) {
    return $(primaryId) || $(fallbackId);
}

// แสดงข้อความ แจ้งเตือน (Toast Notification)
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
// GET CURRENT USER & AUTH
// ============================================================

async function getCurrentUser() {
    try {
        const { data, error } = await supabaseClient.auth.getSession();
        if (error) {
            console.error("GET SESSION ERROR:", error);
            return null;
        }
        if (!data.session) {
            return null;
        }
        return data.session.user;
    } catch (error) {
        console.error("GET USER ERROR:", error);
        return null;
    }
}

// ============================================================
// CHECK ADMIN PERMISSIONS
// ============================================================

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

        // วิธีที่ 1: ตรวจสอบจากตาราง admins
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
            console.log("ไม่พบ/ไม่สามารถอ่าน admins table:", err);
        }

        // วิธีที่ 2: ตรวจสอบจาก user_metadata
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

// ============================================================
// USER AREA & LOGOUT
// ============================================================

function updateUserArea() {
    if (!currentUser) return;

    // แสดง Email ใน Navbar
    const adminEmail = $("adminEmail");
    if (adminEmail) {
        adminEmail.textContent = currentUser.email || "Admin";
    }

    // ผูก Event ให้ปุ่ม Logout
    const logoutBtn = $("logoutButton");
    if (logoutBtn) {
        logoutBtn.replaceWith(logoutBtn.cloneNode(true));
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
    if (loading) {
        loading.style.display = "block";
    }

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
        console.log("PROBLEMS LOADED:", allProblems);

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
        if (loading) {
            loading.style.display = "none";
        }
    }
}

function renderProblems() {
    const container = $("problemTable") || $("problemList");
    if (!container) {
        console.warn("ไม่พบคอนเทนเนอร์แสดงรายการปัญหา");
        return;
    }

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

// ============================================================
// UPDATE STATISTICS
// ============================================================

function updateStatistics() {
    const total = allProblems.length;
    const pending = allProblems.filter((item) => item.status === "pending").length;
    const published = allProblems.filter((item) => item.status === "published").length;
    const rejected = allProblems.filter((item) => item.status === "rejected").length;

    setText("totalProblems", total);
    setText("pendingProblems", pending);
    setText("publishedProblems", published);
    setText("rejectedProblems", rejected);

    // รองรับ Element ID รูปแบบอื่น
    setText("totalCount", total);
    setText("pendingCount", pending);
    setText("publishedCount", published);
    setText("rejectedCount", rejected);
}

// ============================================================
// PROBLEM MODAL (ADD / EDIT)
// ============================================================

function openAddProblemModal() {
    editingProblemId = null;
    resetProblemForm();

    const hiddenId = $("editingProblemId");
    if (hiddenId) hiddenId.value = "";

    setText("problemModalTitle", "เพิ่มปัญหาใหม่");

    const modal = $("problemModal");
    if (modal) {
        modal.style.display = "flex";
    }
}

function closeProblemModal() {
    const modal = $("problemModal");
    if (modal) {
        modal.style.display = "none";
    }
    resetProblemForm();
}

function resetProblemForm() {
    const form = $("problemForm");
    if (form) {
        form.reset();
    }
    const statusField = getField("status", "problemStatus");
    if (statusField) {
        statusField.value = "pending";
    }
    const messageBox = $("formMessage");
    if (messageBox) {
        messageBox.textContent = "";
        messageBox.className = "form-message";
    }
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

    const titleField = getField("title", "problemTitle");
    const descField = getField("description", "problemDescription");
    const catField = getField("category", "problemCategory");
    const sympField = getField("symptoms", "problemSymptoms");
    const causesField = getField("causes", "problemCauses");
    const statusField = getField("status", "problemStatus");

    if (titleField) titleField.value = problem.title || "";
    if (descField) descField.value = problem.description || "";
    if (catField) catField.value = problem.category || "";
    if (sympField) sympField.value = problem.symptoms || "";
    if (causesField) causesField.value = problem.causes || "";
    if (statusField) statusField.value = problem.status || "pending";

    setText("problemModalTitle", "แก้ไขปัญหา");

    const modal = $("problemModal");
    if (modal) {
        modal.style.display = "flex";
    }
}

async function saveProblem(event) {
    if (event) event.preventDefault();

    if (!isAdmin || !currentUser) {
        showMessage("ไม่มีสิทธิ์ดำเนินการ", "error");
        return;
    }

    const titleField = getField("title", "problemTitle");
    const descField = getField("description", "problemDescription");
    const catField = getField("category", "problemCategory");
    const sympField = getField("symptoms", "problemSymptoms");
    const causesField = getField("causes", "problemCauses");
    const statusField = getField("status", "problemStatus");

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
            // อัปเดตข้อมูลเดิม
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
            // เพิ่มข้อมูลใหม่
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

// ============================================================
// CHANGE PROBLEM STATUS & DELETE
// ============================================================

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
        // ลบวิธีแก้ไขที่เกี่ยวข้องก่อน
        const { error: solErr } = await supabaseClient
            .from("solutions")
            .delete()
            .eq("problem_id", id);

        if (solErr && solErr.code !== "PGRST116") {
            console.warn("DELETE SOLUTIONS WARNING:", solErr);
        }

        // ลบปัญหา
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
// SOLUTION MANAGEMENT
// ============================================================

async function manageSolutions(problemId) {
    const problem = allProblems.find((item) => String(item.id) === String(problemId));
    if (!problem) {
        showMessage("ไม่พบปัญหา", "error");
        return;
    }

    const { data, error } = await supabaseClient
        .from("solutions")
        .select(`id, problem_id, step_number, content`)
        .eq("problem_id", problemId)
        .order("step_number", { ascending: true });

    if (error) {
        showMessage("โหลดวิธีแก้ไขไม่สำเร็จ: " + error.message, "error");
        return;
    }

    renderSolutionModal(problem, data || []);
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
                .map(
                    (sol, idx) => `
                    <div class="solution-item" data-solution-id="${sol.id}" style="margin-bottom:15px; padding:15px; border:1px solid #e2e8f0; border-radius:8px;">
                        <strong>ขั้นตอนที่ ${sol.step_number || idx + 1}</strong>
                        <textarea class="solution-content" rows="3" style="width:100%; margin-top:8px; padding:8px; border:1px solid #cbd5e1; border-radius:6px;">${escapeHtml(sol.content)}</textarea>
                        <div style="margin-top:8px; display:flex; gap:10px;">
                            <button type="button" class="delete-solution-button" data-id="${sol.id}" data-problem-id="${problem.id}" style="background:#dc2626; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">
                                🗑️ ลบขั้นตอน
                            </button>
                        </div>
                    </div>
                `
                )
                .join("");

            solutionList.innerHTML += `
                <button type="button" id="saveExistingSolutionsBtn" style="background:#2563eb; color:#fff; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; margin-top:10px;">
                    💾 บันทึกการแก้ไขขั้นตอน
                </button>
            `;
        }
    }

    document.querySelectorAll(".delete-solution-button").forEach((btn) => {
        btn.addEventListener("click", () => deleteSolution(btn.dataset.id, btn.dataset.problemId));
    });

    const saveExistBtn = $("saveExistingSolutionsBtn");
    if (saveExistBtn) {
        saveExistBtn.addEventListener("click", saveExistingSolutions);
    }

    const formBox = $("solutionFormBox");
    if (formBox) {
        formBox.style.display = "block";
    }

    modal.style.display = "flex";

    const addSolBtn = $("addSolutionButton");
    if (addSolBtn) {
        addSolBtn.onclick = () => addSolution(problem.id);
    }
}

async function addSolution(problemId) {
    const textarea = $("solutionDescription") || $("newSolutionContent");
    const stepInput = $("stepNumber");

    const content = textarea ? textarea.value.trim() : "";
    if (!content) {
        showMessage("กรุณากรอกรายละเอียดวิธีแก้ไข", "error");
        return;
    }

    try {
        let nextStep = 1;

        if (stepInput && stepInput.value) {
            nextStep = Number(stepInput.value);
        } else {
            const { data } = await supabaseClient
                .from("solutions")
                .select("step_number")
                .eq("problem_id", problemId)
                .order("step_number", { ascending: false })
                .limit(1);

            if (data && data.length > 0) {
                nextStep = Number(data[0].step_number) + 1;
            }
        }

        const { error } = await supabaseClient.from("solutions").insert({
            problem_id: problemId,
            step_number: nextStep,
            content: content
        });

        if (error) throw error;

        showMessage("เพิ่มวิธีแก้ไขสำเร็จ", "success");
        if (textarea) textarea.value = "";
        await manageSolutions(problemId);
    } catch (error) {
        console.error("ADD SOLUTION ERROR:", error);
        showMessage("เพิ่มวิธีแก้ไขไม่สำเร็จ: " + error.message, "error");
    }
}

async function saveExistingSolutions() {
    const items = document.querySelectorAll(".solution-item");

    try {
        for (const item of items) {
            const id = item.dataset.solutionId;
            if (!id) continue;

            const textarea = item.querySelector(".solution-content");
            if (!textarea) continue;

            const content = textarea.value.trim();

            const { error } = await supabaseClient
                .from("solutions")
                .update({ content: content })
                .eq("id", id);

            if (error) throw error;
        }

        showMessage("บันทึกวิธีแก้ไขสำเร็จ", "success");
    } catch (error) {
        console.error("SAVE SOLUTIONS ERROR:", error);
        showMessage("บันทึกวิธีแก้ไขไม่สำเร็จ: " + error.message, "error");
    }
}

async function deleteSolution(solutionId, problemId) {
    if (!confirm("ต้องการลบขั้นตอนนี้หรือไม่?")) return;

    try {
        const { error } = await supabaseClient
            .from("solutions")
            .delete()
            .eq("id", solutionId);

        if (error) throw error;

        showMessage("ลบขั้นตอนสำเร็จ", "success");
        await manageSolutions(problemId);
    } catch (error) {
        console.error("DELETE SOLUTION ERROR:", error);
        showMessage("ลบขั้นตอนไม่สำเร็จ: " + error.message, "error");
    }
}

// ============================================================
// SEARCH & FILTERS
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

        renderFilteredProblems(filtered);
    });
}

function renderFilteredProblems(problems) {
    const original = allProblems;
    allProblems = problems;
    renderProblems();
    allProblems = original;
}

function setupCategoryFilter() {
    const buttons = document.querySelectorAll("[data-category]");
    buttons.forEach((button) => {
        button.addEventListener("click", () => {
            const category = button.dataset.category;

            if (!category || category === "all") {
                renderProblems();
                return;
            }

            const filtered = allProblems.filter((p) => p.category === category);
            renderFilteredProblems(filtered);
        });
    });
}

function setupAddButton() {
    const addBtn = $("addProblemButton");
    if (addBtn) {
        addBtn.addEventListener("click", openAddProblemModal);
    }
}

// ============================================================
// EVENT LISTENERS & INITIALIZATION
// ============================================================

function setupEventListeners() {
    // ปุ่มปิด Modal
    const closeProbModal = $("closeProblemModal");
    if (closeProbModal) {
        closeProbModal.addEventListener("click", closeProblemModal);
    }

    const closeSolModal = $("closeSolutionModal");
    if (closeSolModal) {
        closeSolModal.addEventListener("click", () => {
            const modal = $("solutionModal");
            if (modal) modal.style.display = "none";
        });
    }

    // คลิกพื้นหลังเพื่อปิด Modal
    const probModal = $("problemModal");
    if (probModal) {
        probModal.addEventListener("click", (e) => {
            if (e.target === probModal) closeProblemModal();
        });
    }

    const solModal = $("solutionModal");
    if (solModal) {
        solModal.addEventListener("click", (e) => {
            if (e.target === solModal) solModal.style.display = "none";
        });
    }

    // ฟอร์มบันทึกข้อมูล
    const probForm = $("problemForm");
    if (probForm) {
        probForm.addEventListener("submit", saveProblem);
    }

    const solForm = $("solutionForm");
    if (solForm) {
        solForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const editingId = $("editingProblemId") ? $("editingProblemId").value : null;
            if (editingId) addSolution(editingId);
        });
    }
}

function setupAuthListener() {
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        console.log("AUTH EVENT:", event);
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

    // 3. เริ่มต้นการทำงานส่วน Event และ Listener
    setupAddButton();
    setupSearch();
    setupCategoryFilter();
    setupEventListeners();
    setupAuthListener();

    console.log("ADMIN DASHBOARD READY");
}

document.addEventListener("DOMContentLoaded", () => {
    startDashboard();
});
