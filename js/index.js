// ==================================================
// IoT Problem Center - INDEX.JS
// ==================================================

// ==================================================
// GLOBAL
// ==================================================
let allProblems = [];
let currentCategory = "all";
let currentClass = "all";
let solutionStepCount = 0;

// ==================================================
// DOM
// ==================================================
const userArea = document.getElementById("userArea");
const problemList = document.getElementById("problemList");
const loading = document.getElementById("loading");
const noResult = document.getElementById("noResult");
const searchInput = document.getElementById("searchInput");
const submitProblemModal = document.getElementById("submitProblemModal");
const closeSubmitModal = document.getElementById("closeSubmitModal");
const submitSolutions = document.getElementById("submitSolutions");
const addSubmitSolutionButton = document.getElementById("addSubmitSolutionButton");
const submitProblemForm = document.getElementById("submitProblemForm");
const submitProblemImage = document.getElementById("submitProblemImage");
const problemImagePreview = document.getElementById("problemImagePreview");
const problemPreviewImage = document.getElementById("problemPreviewImage");

// ==================================================
// ESCAPE HTML
// ==================================================
function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
}

// ==================================================
// CHECK LOGIN
// ==================================================
async function checkLogin() {
    if (!userArea) {
        console.error("ไม่พบ #userArea");
        return;
    }

    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();

        if (error) {
            console.error("ตรวจสอบ Session ไม่สำเร็จ:", error);
            return;
        }

        // NOT LOGIN
        if (!session) {
            userArea.innerHTML = `
                <a href="login.html" class="login-link">
                    เข้าสู่ระบบ
                </a>
            `;
            return;
        }

        // USER
        const user = session.user;
        const email = user.email || "ผู้ใช้งาน";
        console.log("USER UUID:", user.id);

        // CHECK ADMIN
        let isAdmin = false;
        const { data: profile, error: profileError } = await supabaseClient
            .from("profiles")
            .select(`role`)
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) {
            console.error("ตรวจสอบ Admin ไม่สำเร็จ:", profileError);
        }

        if (profile && profile.role === "admin") {
            isAdmin = true;
        }

        console.log("IS ADMIN:", isAdmin);

        // ADMIN BUTTON
        let adminButton = "";
        if (isAdmin) {
            adminButton = `
                <a href="dashboard.html" class="add-button" style="text-decoration:none; display:inline-block;">
                    🛠️ Admin Dashboard
                </a>
            `;
        }

        // NAVBAR
        userArea.innerHTML = `
            <span class="user-email">
                👤 ${escapeHtml(email)}
            </span>
            ${adminButton}
            <button id="submitProblemButton" class="add-button" type="button">
                + ส่งปัญหา / วิธีแก้ไข
            </button>
            <button id="logoutButton" class="logout-button" type="button">
                ออกจากระบบ
            </button>
        `;

        // SUBMIT BUTTON
        const submitButton = document.getElementById("submitProblemButton");
        if (submitButton) {
            submitButton.addEventListener("click", openSubmitModal);
        }

        // LOGOUT
        const logoutButton = document.getElementById("logoutButton");
        if (logoutButton) {
            logoutButton.addEventListener("click", logout);
        }

    } catch (error) {
        console.error("CHECK LOGIN ERROR:", error);
    }
}

// ==================================================
// MODAL CONTROLS
// ==================================================
function openSubmitModal() {
    if (!submitProblemModal) return;
    submitProblemModal.style.display = "flex";
    document.body.style.overflow = "hidden";
}

function closeSubmitProblemModal() {
    if (!submitProblemModal) return;
    submitProblemModal.style.display = "none";
    document.body.style.overflow = "";
}

if (closeSubmitModal) {
    closeSubmitModal.addEventListener("click", closeSubmitProblemModal);
}

if (submitProblemModal) {
    submitProblemModal.addEventListener("click", event => {
        if (event.target === submitProblemModal) {
            closeSubmitProblemModal();
        }
    });
}

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        if (submitProblemModal && submitProblemModal.style.display === "flex") {
            closeSubmitProblemModal();
        }
    }
});

// ==================================================
// LOGOUT
// ==================================================
async function logout() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        alert("ออกจากระบบไม่สำเร็จ: " + error.message);
        return;
    }
    window.location.href = "login.html";
}

// ==================================================
// LOAD PROBLEMS
// ==================================================
async function loadProblems() {
    if (!problemList) return;
    if (loading) loading.style.display = "block";

    try {
        const { data, error } = await supabaseClient
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
            .eq("status", "published")
            .order("created_at", { ascending: false });

        if (error) throw error;

        allProblems = data || [];
        renderProblems();

    } catch (error) {
        console.error("โหลด Problems ไม่สำเร็จ:", error);
        problemList.innerHTML = `
            <div class="no-result">
                ❌ ไม่สามารถโหลดข้อมูลได้
                <br><br>
                ${escapeHtml(error.message)}
            </div>
        `;
    } finally {
        if (loading) loading.style.display = "none";
    }
}

// ==================================================
// RENDER PROBLEMS (หัวใจหลักของการกรองข้อมูล)
// ==================================================
function renderProblems() {
    if (!problemList) return;

    const search = searchInput ? searchInput.value.trim().toLowerCase() : "";

    const filtered = allProblems.filter(problem => {
        const title = problem.title || "";
        const description = problem.description || "";
        const symptoms = problem.symptoms || "";
        const causes = problem.causes || "";

        // 1. เงื่อนไขการค้นหาข้อความ
        const matchSearch = !search || 
            title.toLowerCase().includes(search) || 
            description.toLowerCase().includes(search) || 
            symptoms.toLowerCase().includes(search) || 
            causes.toLowerCase().includes(search);

        // 2. เงื่อนไขหมวดหมู่ (Category)
        const matchCategory = (currentCategory === "all") || 
            (problem.category && problem.category.trim().toLowerCase() === currentCategory.trim().toLowerCase());

        // 3. เงื่อนไขระดับชั้น (Class)
        const matchClass = (currentClass === "all") || 
            (problem.class_name && problem.class_name.trim().toLowerCase() === currentClass.trim().toLowerCase());

        // ข้อมูลจะแสดงก็ต่อเมื่อผ่านทั้ง 3 เงื่อนไข
        return matchSearch && matchCategory && matchClass;
    });

    problemList.innerHTML = "";

    if (filtered.length === 0) {
        if (noResult) noResult.style.display = "block";
        return;
    }

    if (noResult) noResult.style.display = "none";

    filtered.forEach(problem => {
        const card = document.createElement("div");
        card.className = "problem-card";
        
        card.innerHTML = `
            <div class="problem-badges">
                <span class="problem-category">
                    ${escapeHtml(problem.category || "ทั่วไป")}
                </span>
                <span class="problem-class">
                    🎓 ${escapeHtml(problem.class_name || "ไม่ระบุ Class")}
                </span>
            </div>
            <h3>${escapeHtml(problem.title || "ไม่มีชื่อปัญหา")}</h3>
            <p>${escapeHtml(problem.description || "ไม่มีรายละเอียด")}</p>
            <span class="problem-link">ดูวิธีแก้ไข →</span>
        `;

        card.addEventListener("click", () => {
            window.location.href = `problem.html?id=${problem.id}`;
        });

        problemList.appendChild(card);
    });
}

// ==================================================
// SEARCH & FILTER EVENTS
// ==================================================
if (searchInput) {
    searchInput.addEventListener("input", renderProblems);
}

// คลิกปุ่ม Category
document.querySelectorAll(".category-button[data-category]").forEach(button => {
    button.addEventListener("click", () => {
        // ลบ active ออกจากปุ่มหมวดหมู่ทั้งหมด
        document.querySelectorAll(".category-button[data-category]").forEach(btn => btn.classList.remove("active"));
        
        // เพิ่ม active ให้ปุ่มที่กด
        button.classList.add("active");
        
        // อัปเดตค่าหมวดหมู่ปัจจุบัน
        currentCategory = button.dataset.category || "all";
        
        // รีเฟรชหน้าจอ
        renderProblems();
    });
});

// คลิกปุ่ม Class
document.querySelectorAll(".class-filter-button").forEach(button => {
    button.addEventListener("click", () => {
        // ลบ active ออกจากปุ่มระดับชั้นทั้งหมด
        document.querySelectorAll(".class-filter-button").forEach(btn => btn.classList.remove("active"));
        
        // เพิ่ม active ให้ปุ่มที่กด
        button.classList.add("active");
        
        // อัปเดตค่าระดับชั้นปัจจุบัน
        currentClass = button.dataset.class || "all";
        
        // รีเฟรชหน้าจอ
        renderProblems();
    });
});


// ==================================================
// SOLUTION STEP
// ==================================================
function addSolutionStep() {
    if (!submitSolutions) return;

    solutionStepCount++;

    const step = document.createElement("div");
    step.className = "solution-step";
    step.innerHTML = `
        <div class="solution-step-header">
            <h4>ขั้นตอนที่ ${solutionStepCount}</h4>
            <button type="button" class="remove-step">ลบขั้นตอน</button>
        </div>
        <label>หัวข้อขั้นตอน *</label>
        <input type="text" class="submit-solution-title" placeholder="เช่น ตรวจสอบสาย USB" required>
        <label>รายละเอียดวิธีแก้ไข</label>
        <textarea class="submit-solution-description" rows="4" placeholder="อธิบายวิธีแก้ไขขั้นตอนนี้"></textarea>
    `;

    const removeButton = step.querySelector(".remove-step");
    if (removeButton) {
        removeButton.addEventListener("click", () => {
            step.remove();
            renumberSteps();
        });
    }

    submitSolutions.appendChild(step);
}

function renumberSteps() {
    if (!submitSolutions) return;
    const steps = submitSolutions.querySelectorAll(".solution-step");
    steps.forEach((step, index) => {
        const heading = step.querySelector("h4");
        if (heading) {
            heading.textContent = `ขั้นตอนที่ ${index + 1}`;
        }
    });
    solutionStepCount = steps.length;
}

if (submitSolutions) {
    addSolutionStep();
}

if (addSubmitSolutionButton) {
    addSubmitSolutionButton.addEventListener("click", addSolutionStep);
}

// ==================================================
// IMAGE UPLOAD & PREVIEW
// ==================================================
if (submitProblemImage) {
    submitProblemImage.addEventListener("change", () => {
        const file = submitProblemImage.files[0];
        if (!file) {
            if (problemImagePreview) problemImagePreview.style.display = "none";
            return;
        }

        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
            alert("รองรับเฉพาะ JPG, PNG และ WEBP");
            submitProblemImage.value = "";
            return;
        }

        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            alert("รูปภาพต้องมีขนาดไม่เกิน 5 MB");
            submitProblemImage.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = event => {
            if (problemPreviewImage) problemPreviewImage.src = event.target.result;
            if (problemImagePreview) problemImagePreview.style.display = "block";
        };
        reader.readAsDataURL(file);
    });
}

function resetImagePreview() {
    if (submitProblemImage) submitProblemImage.value = "";
    if (problemPreviewImage) problemPreviewImage.src = "";
    if (problemImagePreview) problemImagePreview.style.display = "none";
}

function createSafeFileName(fileName) {
    return fileName
        .normalize("NFKD")
        .replace(/[^\w.\-]+/g, "_")
        .replace(/_+/g, "_")
        .substring(0, 100);
}

async function uploadProblemImage(file, problemId, userId) {
    if (!file) return null;

    const fileName = createSafeFileName(file.name);
    const filePath = `${userId}/${problemId}/${Date.now()}_${fileName}`;

    console.log("UPLOAD IMAGE PATH:", filePath);

    const { error: uploadError } = await supabaseClient
        .storage
        .from("problem-images")
        .upload(filePath, file, { cacheControl: "3600", upsert: false, contentType: file.type });

    if (uploadError) {
        throw new Error("อัปโหลดรูปไม่สำเร็จ: " + uploadError.message);
    }

    const { data: publicUrlData } = supabaseClient
        .storage
        .from("problem-images")
        .getPublicUrl(filePath);

    const imageUrl = publicUrlData?.publicUrl;
    if (!imageUrl) throw new Error("ไม่สามารถสร้าง URL รูปภาพได้");

    console.log("IMAGE URL:", imageUrl);

    const { error: imageInsertError } = await supabaseClient
        .from("problem_images")
        .insert({
            problem_id: problemId,
            image_url: imageUrl,
            caption: "รูปภาพปัญหาที่ผู้ใช้แนบ",
            created_by: userId
        });

    if (imageInsertError) {
        await supabaseClient.storage.from("problem-images").remove([filePath]);
        throw new Error("บันทึกข้อมูลรูปไม่สำเร็จ: " + imageInsertError.message);
    }

    return { imageUrl, filePath };
}

// ==================================================
// SUBMIT PROBLEM
// ==================================================
if (submitProblemForm) {
    submitProblemForm.addEventListener("submit", async event => {
        event.preventDefault();

        const submitButton = document.getElementById("submitButton");
        const submitMessage = document.getElementById("submitMessage");

        try {
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = "⏳ กำลังส่งข้อมูล...";
            }

            const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
            if (userError || !user) {
                throw new Error("กรุณาเข้าสู่ระบบก่อนส่งข้อมูล");
            }

            console.log("SUBMIT USER UUID:", user.id);

            const title = document.getElementById("submitTitle").value.trim();
            const description = document.getElementById("submitDescription").value.trim();
            const category = document.getElementById("submitCategory").value;
            const className = document.getElementById("submitClass")?.value || "";
            const symptoms = document.getElementById("submitSymptoms").value.trim();
            const causes = document.getElementById("submitCauses").value.trim();

            if (!title) throw new Error("กรุณากรอกชื่อปัญหา");
            if (!description) throw new Error("กรุณากรอกรายละเอียดปัญหา");
            if (!category) throw new Error("กรุณาเลือกหมวดหมู่");
            if (!className) throw new Error("กรุณาเลือก Class");

            const { data: problem, error: problemError } = await supabaseClient
                .from("problems")
                .insert({
                    title: title,
                    description: description,
                    category: category,
                    class_name: className,
                    symptoms: symptoms,
                    causes: causes,
                    status: "pending",
                    created_by: user.id
                })
                .select()
                .single();

            if (problemError) throw problemError;
            console.log("CREATED PROBLEM:", problem);

            const steps = submitSolutions ? submitSolutions.querySelectorAll(".solution-step") : [];
            const solutionData = [];

            steps.forEach((step, index) => {
                const solutionTitle = step.querySelector(".submit-solution-title").value.trim();
                const solutionDescription = step.querySelector(".submit-solution-description").value.trim();

                if (solutionTitle) {
                    solutionData.push({
                        problem_id: problem.id,
                        step_number: index + 1,
                        title: solutionTitle,
                        description: solutionDescription,
                        status: "pending",
                        created_by: user.id
                    });
                }
            });

            if (solutionData.length > 0) {
                const { error: solutionError } = await supabaseClient
                    .from("solutions")
                    .insert(solutionData);

                if (solutionError) {
                    await supabaseClient.from("problems").delete().eq("id", problem.id);
                    throw solutionError;
                }
            }

            const imageFile = submitProblemImage ? submitProblemImage.files[0] : null;
            if (imageFile) {
                await uploadProblemImage(imageFile, problem.id, user.id);
            }

            if (submitMessage) {
                submitMessage.style.display = "block";
                submitMessage.className = "submit-message success-message";
                submitMessage.textContent = "✅ ส่งข้อมูลเรียบร้อยแล้ว รอ Admin ตรวจสอบและอนุมัติ";
            }

            submitProblemForm.reset();
            resetImagePreview();

            if (submitSolutions) submitSolutions.innerHTML = "";
            solutionStepCount = 0;
            if (submitSolutions) addSolutionStep();

            setTimeout(() => {
                closeSubmitProblemModal();
                if (submitMessage) submitMessage.style.display = "none";
            }, 2000);

        } catch (error) {
            console.error("SUBMIT ERROR:", error);
            if (submitMessage) {
                submitMessage.style.display = "block";
                submitMessage.className = "submit-message error-message";
                submitMessage.textContent = "❌ ส่งข้อมูลไม่สำเร็จ: " + (error.message || "เกิดข้อผิดพลาด");
            }
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "🚀 ส่งปัญหาให้ Admin ตรวจสอบ";
            }
        }
    });
}

// ==================================================
// START
// ==================================================
checkLogin();
loadProblems();
