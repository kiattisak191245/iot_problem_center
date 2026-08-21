// ============================================================
// IoT PROBLEM CENTER - DASHBOARD.JS (FULL WORKING VERSION)
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
// TOAST / MESSAGE NOTIFICATION
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
        box.style.padding = "14px 20px";
        box.style.borderRadius = "8px";
        box.style.fontSize = "15px";
        box.style.fontWeight = "500";
        box.style.maxWidth = "400px";
        box.style.boxShadow = "0 10px 25px rgba(0,0,0,0.15)";
        box.style.transition = "all 0.3s ease";
        document.body.appendChild(box);
    }

    box.textContent = message;

    if (type === "success") {
        box.style.background = "#16a34a";
        box.style.color = "#ffffff";
    } else if (type === "error") {
        box.style.background = "#dc2626";
        box.style.color = "#ffffff";
    } else {
        box.style.background = "#2563eb";
        box.style.color = "#ffffff";
    }

    box.style.display = "block";

    setTimeout(() => {
        box.style.display = "none";
    }, 4000);
}

// ============================================================
// AUTHENTICATION & ADMIN PERMISSION CHECK
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

        console.log("LOGIN USER EMAIL:", currentUser.email);

        // 1. อนุญาตสิทธิ์โดยตรงจาก List Email แอดมิน (ป้องกัน DB พลาด)
        const allowedAdminEmails = [
            "kiattisak.t@mws.ac.th",
            "nun160661@gmail.com",
            "teachergorobot.th@gmail.com",
            "kiattisak191245@gmail.com"
        ];

        let adminResult = false;

        if (currentUser.email && allowedAdminEmails.includes(currentUser.email.trim().toLowerCase())) {
            adminResult = true;
        }

        // 2. ตรวจสอบสำรองผ่านตาราง profiles
        if (!adminResult) {
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
                console.warn("PROFILE CHECK FAILED:", err);
            }
        }

        isAdmin = adminResult;

        if (!isAdmin) {
            alert("บัญชีนี้ไม่มีสิทธิ์เข้า Admin Dashboard");
            window.location.href = "index.html";
            return false;
        }

        updateUserArea();
        return true;
    } catch (error) {
        console.error("CHECK ADMIN ERROR:", error);
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
        logoutBtn.replaceWith(logoutBtn.cloneNode(true));
        const newLogoutBtn = $("logoutButton");
        if (newLogoutBtn) {
            newLogoutBtn.addEventListener("click", logout);
        }
    }
}

async function logout() {
    try {
        await supabaseClient.auth.signOut();
        window.location.href = "login.html";
    } catch (error) {
        showMessage("ออกจากระบบไม่สำเร็จ: " + error.message, "error");
    }
}

// ============================================================
// PROBLEMS MANAGEMENT (FETCH, RENDER, STATS)
// ============================================================

async function loadProblems() {
    const loading = $("loading");
    if (loading) loading.style.display = "flex";

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
        renderProblems(allProblems);
        updateStatistics();
    } catch (error) {
        console.error("LOAD PROBLEMS ERROR:", error);
        const container = $("problemTable");
        if (container) {
            container.innerHTML = `
                <div style="text-align:center; padding:30px; color:#dc2626;">
                    ❌ โหลดข้อมูลไม่สำเร็จ: ${escapeHtml(error.message)}
                </div>
            `;
        }
        showMessage("โหลดข้อมูลไม่สำเร็จ", "error");
    } finally {
        if (loading) loading.style.display = "none";
    }
}

function renderProblems(problemsToRender) {
    const container = $("problemTable");
    if (!container) return;

    container.innerHTML = "";

    if (!problemsToRender || problemsToRender.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px; color:#64748b;">
                ไม่พบข้อมูลปัญหาในระบบ
            </div>
        `;
        return;
    }

    problemsToRender.forEach((problem) => {
        const card = document.createElement("div");
        card.className = "problem-card";
        card.style.cssText = "background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:20px; margin-bottom:16px; box-shadow:0 2px 4px rgba(0,0,0,0.02);";

        let statusBadge = `<span style="background:#fef3c7; color:#d97706; padding:4px 10px; border-radius:20px; font-size:13px; font-weight:500;">🟡 รอตรวจสอบ</span>`;
        if (problem.status === "published") {
            statusBadge = `<span style="background:#dcfce7; color:#15803d; padding:4px 10px; border-radius:20px; font-size:13px; font-weight:500;">🟢 เผยแพร่แล้ว</span>`;
        } else if (problem.status === "rejected") {
            statusBadge = `<span style="background:#fee2e2; color:#b91c1c; padding:4px 10px; border-radius:20px; font-size:13px; font-weight:500;">🔴 ไม่เผยแพร่</span>`;
        }

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <span style="background:#e0f2fe; color:#0369a1; padding:4px 12px; border-radius:6px; font-size:13px; font-weight:600;">
                    ${escapeHtml(problem.category || "ทั่วไป")}
                </span>
                ${statusBadge}
            </div>

            <h3 style="margin:0 0 8px 0; font-size:18px; color:#0f172a;">${escapeHtml(problem.title || "ไม่มีชื่อหัวข้อ")}</h3>
            <p style="margin:0 0 16px 0; color:#475569; font-size:14px; line-height:1.5;">${escapeHtml(problem.description || "ไม่มีรายละเอียด")}</p>

            <div style="display:flex; gap:8px; flex-wrap:wrap; border-top:1px solid #f1f5f9; padding-top:12px;">
                <button type="button" class="btn-edit" data-id="${problem.id}" style="background:#f1f5f9; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:13px;">✏️ แก้ไข</button>
                <button type="button" class="btn-solution" data-id="${problem.id}" style="background:#eff6ff; color:#2563eb; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:13px; font-weight:500;">🛠 วิธีแก้ไข</button>
                
                ${
                    problem.status !== "published"
                        ? `<button type="button" class="btn-publish" data-id="${problem.id}" style="background:#dcfce7; color:#15803d; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:13px;">🟢 เผยแพร่</button>`
                        : `<button type="button" class="btn-unpublish" data-id="${problem.id}" style="background:#fef3c7; color:#b45309; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:13px;">🟡 ยกเลิกเผยแพร่</button>`
                }

                <button type="button" class="btn-delete" data-id="${problem.id}" style="background:#fee2e2; color:#b91c1c; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:13px; margin-left:auto;">🗑️ ลบ</button>
            </div>
        `;

        container.appendChild(card);
    });

    bindProblemCardEvents();
}

function bindProblemCardEvents() {
    document.querySelectorAll(".btn-edit").forEach((btn) => {
        btn.addEventListener("click", () => editProblem(btn.dataset.id));
    });
    document.querySelectorAll(".btn-solution").forEach((btn) => {
        btn.addEventListener("click", () => manageSolutions(btn.dataset.id));
    });
    document.querySelectorAll(".btn-publish").forEach((btn) => {
        btn.addEventListener("click", () => changeProblemStatus(btn.dataset.id, "published"));
    });
    document.querySelectorAll(".btn-unpublish").forEach((btn) => {
        btn.addEventListener("click", () => changeProblemStatus(btn.dataset.id, "pending"));
    });
    document.querySelectorAll(".btn-delete").forEach((btn) => {
        btn.addEventListener("click", () => deleteProblem(btn.dataset.id));
    });
}

function updateStatistics() {
    setText("totalProblems", allProblems.length);
    setText("pendingProblems", allProblems.filter((i) => i.status === "pending").length);
    setText("publishedProblems", allProblems.filter((i) => i.status === "published").length);
    setText("rejectedProblems", allProblems.filter((i) => i.status === "rejected").length);
}

// ============================================================
// PROBLEM MODAL ACTIONS (ADD/EDIT/SAVE/DELETE)
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

    const preview = $("problemImagePreview");
    if (preview) preview.innerHTML = "";

    setText("formMessage", "");
}

function editProblem(id) {
    const problem = allProblems.find((item) => String(item.id) === String(id));
    if (!problem) return;

    editingProblemId = id;
    $("editingProblemId").value = id;
    $("title").value = problem.title || "";
    $("description").value = problem.description || "";
    $("category").value = problem.category || "";
    $("symptoms").value = problem.symptoms || "";
    $("causes").value = problem.causes || "";
    $("status").value = problem.status || "pending";

    setText("problemModalTitle", "แก้ไขปัญหา");
    const modal = $("problemModal");
    if (modal) modal.style.display = "flex";
}

async function saveProblem(event) {
    if (event) event.preventDefault();

    const title = $("title").value.trim();
    const description = $("description").value.trim();
    const category = $("category").value;
    const symptoms = $("symptoms").value.trim();
    const causes = $("causes").value.trim();
    const status = $("status").value;

    if (!title || !description || !category) {
        showMessage("กรุณากรอกชื่อเรื่อง รายละเอียด และเลือกหมวดหมู่", "error");
        return;
    }

    try {
        let result;
        const payload = { title, description, category, symptoms, causes, status };

        if (editingProblemId) {
            result = await supabaseClient.from("problems").update(payload).eq("id", editingProblemId);
        } else {
            payload.created_by = currentUser.id;
            result = await supabaseClient.from("problems").insert([payload]);
        }

        if (result.error) throw result.error;

        showMessage(editingProblemId ? "แก้ไขสำเร็จ" : "เพิ่มปัญหาสำเร็จ", "success");
        closeProblemModal();
        await loadProblems();
    } catch (error) {
        console.error("SAVE PROBLEM ERROR:", error);
        showMessage("บันทึกไม่สำเร็จ: " + error.message, "error");
    }
}

async function changeProblemStatus(id, newStatus) {
    try {
        const { error } = await supabaseClient.from("problems").update({ status: newStatus }).eq("id", id);
        if (error) throw error;
        showMessage("อัปเดตสถานะเรียบร้อย", "success");
        await loadProblems();
    } catch (error) {
        showMessage("เปลี่ยนสถานะไม่สำเร็จ: " + error.message, "error");
    }
}

async function deleteProblem(id) {
    if (!confirm("ยืนยันการลบปัญหานี้? ข้อมูลขั้นตอนแก้ไขที่เกี่ยวข้องจะถูกลบออกทั้งหมด")) return;

    try {
        await supabaseClient.from("solutions").delete().eq("problem_id", id);
        const { error } = await supabaseClient.from("problems").delete().eq("id", id);
        if (error) throw error;

        showMessage("ลบปัญหาสำเร็จ", "success");
        await loadProblems();
    } catch (error) {
        showMessage("ลบไม่สำเร็จ: " + error.message, "error");
    }
}

// ============================================================
// SOLUTIONS MODAL & STEPS MANAGEMENT
// ============================================================

async function manageSolutions(problemId) {
    currentProblemForSolution = allProblems.find((i) => String(i.id) === String(problemId));
    if (!currentProblemForSolution) return;

    setText("solutionProblemTitle", currentProblemForSolution.title || "");

    const { data, error } = await supabaseClient
        .from("solutions")
        .select("*")
        .eq("problem_id", problemId)
        .order("step_number", { ascending: true });

    if (error) {
        showMessage("โหลดวิธีแก้ไขไม่สำเร็จ: " + error.message, "error");
        return;
    }

    renderSolutionList(data || []);
    $("solutionFormBox").style.display = "none";
    $("solutionModal").style.display = "flex";
}

function renderSolutionList(solutions) {
    const list = $("solutionList");
    if (!list) return;

    if (solutions.length === 0) {
        list.innerHTML = `<p style="color:#64748b; text-align:center; padding:20px;">ยังไม่มีขั้นตอนการแก้ไข</p>`;
        return;
    }

    list.innerHTML = solutions
        .map(
            (sol) => `
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px 16px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
                <strong style="color:#1e293b;">ขั้นตอนที่ ${sol.step_number}: ${escapeHtml(sol.title || "")}</strong>
                <p style="margin:4px 0 0 0; font-size:14px; color:#475569; white-space:pre-line;">${escapeHtml(sol.content || sol.description || "")}</p>
            </div>
            <button type="button" class="btn-del-sol" data-id="${sol.id}" style="background:#fee2e2; color:#dc2626; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:12px;">🗑️ ลบ</button>
        </div>
    `
        )
        .join("");

    document.querySelectorAll(".btn-del-sol").forEach((btn) => {
        btn.addEventListener("click", () => deleteSolutionStep(btn.dataset.id));
    });
}

function openAddSolutionForm() {
    const form = $("solutionForm");
    if (form) form.reset();
    $("solutionFormBox").style.display = "block";
    $("solutionFormBox").scrollIntoView({ behavior: "smooth" });
}

async function saveSolution(event) {
    if (event) event.preventDefault();

    if (!currentProblemForSolution) return;

    const stepNumber = Number($("stepNumber").value) || 1;
    const title = $("solutionTitle").value.trim();
    const content = $("solutionDescription").value.trim();
    const status = $("solutionStatus").value;

    if (!title) {
        showMessage("กรุณากรอกหัวข้อขั้นตอน", "error");
        return;
    }

    try {
        const { error } = await supabaseClient.from("solutions").insert([
            {
                problem_id: currentProblemForSolution.id,
                step_number: stepNumber,
                title: title,
                content: content,
                status: status
            }
        ]);

        if (error) throw error;

        showMessage("เพิ่มขั้นตอนสำเร็จ", "success");
        await manageSolutions(currentProblemForSolution.id);
    } catch (error) {
        showMessage("บันทึกขั้นตอนไม่สำเร็จ: " + error.message, "error");
    }
}

async function deleteSolutionStep(solutionId) {
    if (!confirm("ต้องการลบขั้นตอนนี้ใช่หรือไม่?")) return;

    try {
        const { error } = await supabaseClient.from("solutions").delete().eq("id", solutionId);
        if (error) throw error;

        showMessage("ลบขั้นตอนสำเร็จ", "success");
        if (currentProblemForSolution) {
            await manageSolutions(currentProblemForSolution.id);
        }
    } catch (error) {
        showMessage("ลบไม่สำเร็จ: " + error.message, "error");
    }
}

// ============================================================
// SEARCH & EVENT LISTENERS SETUP
// ============================================================

function setupSearch() {
    const searchInput = $("adminSearch");
    if (!searchInput) return;

    searchInput.addEventListener("input", () => {
        const keyword = searchInput.value.trim().toLowerCase();
        if (!keyword) {
            renderProblems(allProblems);
            return;
        }

        const filtered = allProblems.filter((p) => {
            return (
                (p.title || "").toLowerCase().includes(keyword) ||
                (p.description || "").toLowerCase().includes(keyword) ||
                (p.category || "").toLowerCase().includes(keyword)
            );
        });

        renderProblems(filtered);
    });
}

function setupImagePreview(inputId, previewId) {
    const input = $(inputId);
    const preview = $(previewId);
    if (!input || !preview) return;

    input.addEventListener("change", () => {
        const file = input.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML = `<img src="${e.target.result}" style="max-width:100%; max-height:150px; border-radius:8px; margin-top:8px;" />`;
            };
            reader.readAsDataURL(file);
        } else {
            preview.innerHTML = "";
        }
    });
}

function setupEvents() {
    // Buttons
    if ($("addProblemButton")) $("addProblemButton").addEventListener("click", openAddProblemModal);
    if ($("closeProblemModal")) $("closeProblemModal").addEventListener("click", closeProblemModal);

    if ($("closeSolutionModal")) {
        $("closeSolutionModal").addEventListener("click", () => {
            $("solutionModal").style.display = "none";
        });
    }

    if ($("addSolutionButton")) $("addSolutionButton").addEventListener("click", openAddSolutionForm);
    if ($("cancelSolutionButton")) {
        $("cancelSolutionButton").addEventListener("click", () => {
            $("solutionFormBox").style.display = "none";
        });
    }

    // Forms
    if ($("problemForm")) $("problemForm").addEventListener("submit", saveProblem);
    if ($("solutionForm")) $("solutionForm").addEventListener("submit", saveSolution);

    // Image Previews
    setupImagePreview("problemImage", "problemImagePreview");
    setupImagePreview("solutionImage", "solutionImagePreview");

    // Modal Background Click
    window.addEventListener("click", (e) => {
        if (e.target === $("problemModal")) closeProblemModal();
        if (e.target === $("solutionModal")) $("solutionModal").style.display = "none";
    });
}

// ============================================================
// INITIALIZATION
// ============================================================

async function initDashboard() {
    const isOk = await checkAdmin();
    if (!isOk) return;

    await loadProblems();
    setupSearch();
    setupEvents();
}

document.addEventListener("DOMContentLoaded", () => {
    initDashboard();
});
