// ========================================
// SOLUTIONS ADMIN
// ========================================


let currentProblemId = null;

let editingSolutionId = null;


// ========================================
// ELEMENTS
// ========================================

const problemSelect =
    document.getElementById("problemSelect");

const solutionSection =
    document.getElementById("solutionSection");

const solutionListSection =
    document.getElementById("solutionListSection");

const solutionList =
    document.getElementById("solutionList");

const solutionForm =
    document.getElementById("solutionForm");

const stepNumber =
    document.getElementById("stepNumber");

const solutionTitle =
    document.getElementById("solutionTitle");

const solutionDescription =
    document.getElementById("solutionDescription");

const solutionImage =
    document.getElementById("solutionImage");

const saveSolutionButton =
    document.getElementById("saveSolutionButton");

const cancelButton =
    document.getElementById("cancelButton");


// ========================================
// CHECK ADMIN
// ========================================

async function checkAdmin() {

    const {
        data: {
            session
        }
    } = await supabaseClient.auth.getSession();


    if (!session) {

        window.location.href =
            "login.html";

        return false;

    }


    const {
        data: profile,
        error
    } = await supabaseClient

        .from("profiles")

        .select("role")

        .eq(
            "id",
            session.user.id
        )

        .single();


    if (error || !profile) {

        alert(
            "ไม่สามารถตรวจสอบสิทธิ์ได้"
        );

        window.location.href =
            "index.html";

        return false;

    }


    if (profile.role !== "admin") {

        alert(
            "คุณไม่มีสิทธิ์เข้าหน้านี้"
        );

        window.location.href =
            "index.html";

        return false;

    }


    return true;

}


// ========================================
// LOAD PROBLEMS
// ========================================

async function loadProblems() {

    const {
        data,
        error
    } = await supabaseClient

        .from("problems")

        .select(
            "id,title,status"
        )

        .order(
            "created_at",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(error);

        alert(
            "โหลดรายการปัญหาไม่สำเร็จ"
        );

        return;

    }


    problemSelect.innerHTML = `

        <option value="">
            -- เลือกปัญหา --
        </option>

    `;


    data.forEach(problem => {

        const option =
            document.createElement("option");


        option.value =
            problem.id;


        option.textContent =
            `${problem.title} (${problem.status})`;


        problemSelect.appendChild(
            option
        );

    });

}


// ========================================
// SELECT PROBLEM
// ========================================

problemSelect.addEventListener(
    "change",
    async function () {

        currentProblemId =
            this.value;


        editingSolutionId =
            null;


        resetForm();


        if (!currentProblemId) {

            solutionSection.style.display =
                "none";

            solutionListSection.style.display =
                "none";

            return;

        }


        solutionSection.style.display =
            "block";


        solutionListSection.style.display =
            "block";


        await loadSolutions();

    }
);


// ========================================
// LOAD SOLUTIONS
// ========================================

async function loadSolutions() {

    solutionList.innerHTML = `

        <p>
            กำลังโหลด...
        </p>

    `;


    const {
        data,
        error
    } = await supabaseClient

        .from("solutions")

        .select(`
            id,
            problem_id,
            step_number,
            title,
            description,
            status,
            created_at
        `)

        .eq(
            "problem_id",
            currentProblemId
        )

        .order(
            "step_number",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(error);

        solutionList.innerHTML = `

            <p>
                ❌ โหลดข้อมูลไม่สำเร็จ
            </p>

        `;

        return;

    }


    solutionList.innerHTML = "";


    if (!data || data.length === 0) {

        solutionList.innerHTML = `

            <div class="empty-box">

                ยังไม่มีขั้นตอนการแก้ไข

            </div>

        `;

        return;

    }


    data.forEach(solution => {

        renderSolution(solution);

    });

}


// ========================================
// RENDER SOLUTION
// ========================================

function renderSolution(solution) {

    const card =
        document.createElement("div");


    card.className =
        "solution-admin-card";


    card.innerHTML = `

        <div class="solution-header">

            <div>

                <span class="step-badge">

                    ขั้นตอนที่
                    ${solution.step_number}

                </span>

                <h3>

                    ${escapeHtml(
                        solution.title
                    )}

                </h3>

            </div>

            <span class="status-badge">

                ${solution.status || "pending"}

            </span>

        </div>


        <p>

            ${escapeHtml(
                solution.description ||
                "ไม่มีรายละเอียด"
            )}

        </p>


        <div class="solution-actions">

            <button
                class="edit-button"
                data-id="${solution.id}"
            >

                ✏️ แก้ไข

            </button>


            <button
                class="delete-button"
                data-id="${solution.id}"
            >

                🗑️ ลบ

            </button>

        </div>

    `;


    solutionList.appendChild(card);


    card
        .querySelector(".edit-button")
        .addEventListener(
            "click",
            () => editSolution(solution)
        );


    card
        .querySelector(".delete-button")
        .addEventListener(
            "click",
            () => deleteSolution(solution)
        );

}


// ========================================
// ADD / UPDATE
// ========================================

solutionForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        if (!currentProblemId) {

            alert(
                "กรุณาเลือกปัญหาก่อน"
            );

            return;

        }


        const step =
            parseInt(
                stepNumber.value
            );


        const title =
            solutionTitle.value.trim();


        const description =
            solutionDescription.value.trim();


        if (!step || step < 1) {

            alert(
                "กรุณาระบุขั้นตอน"
            );

            return;

        }


        if (!title) {

            alert(
                "กรุณาใส่ชื่อขั้นตอน"
            );

            return;

        }


        saveSolutionButton.disabled =
            true;


        saveSolutionButton.textContent =
            "กำลังบันทึก...";


        try {


            // ========================================
            // UPDATE
            // ========================================

            if (editingSolutionId) {

                const {
                    error
                } = await supabaseClient

                    .from("solutions")

                    .update({

                        step_number:
                            step,

                        title:
                            title,

                        description:
                            description

                    })

                    .eq(
                        "id",
                        editingSolutionId
                    );


                if (error) {

                    throw error;

                }


                alert(
                    "แก้ไขขั้นตอนสำเร็จ"
                );

            }


            // ========================================
            // INSERT
            // ========================================

            else {

                const {
                    data: userData
                } =
                    await supabaseClient.auth
                        .getUser();


                const user =
                    userData.user;


                const {
                    data,
                    error
                } = await supabaseClient

                    .from("solutions")

                    .insert({

                        problem_id:
                            currentProblemId,

                        step_number:
                            step,

                        title:
                            title,

                        description:
                            description,

                        created_by:
                            user.id,

                        status:
                            "pending"

                    })

                    .select()

                    .single();


                if (error) {

                    throw error;

                }


                // ========================================
                // UPLOAD IMAGE
                // ========================================

                if (
                    solutionImage.files.length > 0
                ) {

                    await uploadSolutionImage(
                        solutionImage.files[0],
                        data.id
                    );

                }


                alert(
                    "เพิ่มขั้นตอนสำเร็จ"
                );

            }


            resetForm();

            await loadSolutions();

        }

        catch (error) {

            console.error(error);

            alert(
                "❌ เกิดข้อผิดพลาด\n" +
                error.message
            );

        }

        finally {

            saveSolutionButton.disabled =
                false;

            saveSolutionButton.textContent =
                editingSolutionId
                    ? "บันทึกการแก้ไข"
                    : "➕ เพิ่มขั้นตอน";

        }

    }
);


// ========================================
// UPLOAD IMAGE
// ========================================

async function uploadSolutionImage(
    file,
    solutionId
) {

    const {
        data: userData
    } =
        await supabaseClient.auth.getUser();


    const user =
        userData.user;


    const extension =
        file.name
            .split(".")
            .pop();


    const fileName =
        `${user.id}/${solutionId}-${Date.now()}.${extension}`;


    const {
        error: uploadError
    } =
        await supabaseClient.storage

            .from("solution-images")

            .upload(
                fileName,
                file,
                {
                    contentType:
                        file.type,
                    upsert:
                        false
                }
            );


    if (uploadError) {

        throw uploadError;

    }


    const {
        data: publicUrl
    } =
        supabaseClient.storage

            .from("solution-images")

            .getPublicUrl(
                fileName
            );


    const {
        error: dbError
    } =
        await supabaseClient

            .from("solution_images")

            .insert({

                solution_id:
                    solutionId,

                image_url:
                    publicUrl.publicUrl,

                caption:
                    solutionTitle.value.trim()

            });


    if (dbError) {

        throw dbError;

    }

}


// ========================================
// EDIT
// ========================================

function editSolution(solution) {

    editingSolutionId =
        solution.id;


    stepNumber.value =
        solution.step_number;


    solutionTitle.value =
        solution.title;


    solutionDescription.value =
        solution.description || "";


    solutionImage.value =
        "";


    saveSolutionButton.textContent =
        "บันทึกการแก้ไข";


    cancelButton.style.display =
        "inline-block";


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}


// ========================================
// DELETE
// ========================================

async function deleteSolution(solution) {

    const confirmDelete =
        confirm(
            `ต้องการลบ "${solution.title}" หรือไม่?`
        );


    if (!confirmDelete) {

        return;

    }


    const {
        error
    } = await supabaseClient

        .from("solutions")

        .delete()

        .eq(
            "id",
            solution.id
        );


    if (error) {

        console.error(error);

        alert(
            "❌ ลบไม่สำเร็จ\n" +
            error.message
        );

        return;

    }


    alert(
        "ลบขั้นตอนเรียบร้อย"
    );


    await loadSolutions();

}


// ========================================
// CANCEL
// ========================================

cancelButton.addEventListener(
    "click",
    resetForm
);


// ========================================
// RESET FORM
// ========================================

function resetForm() {

    editingSolutionId =
        null;


    solutionForm.reset();


    stepNumber.value =
        getNextStepNumber();


    saveSolutionButton.textContent =
        "➕ เพิ่มขั้นตอน";


    cancelButton.style.display =
        "none";

}


// ========================================
// NEXT STEP NUMBER
// ========================================

function getNextStepNumber() {

    const cards =
        document.querySelectorAll(
            ".solution-admin-card"
        );


    return cards.length + 1;

}


// ========================================
// ESCAPE HTML
// ========================================

function escapeHtml(value) {

    const div =
        document.createElement("div");


    div.textContent =
        value ?? "";


    return div.innerHTML;

}


// ========================================
// START
// ========================================

async function start() {

    const isAdmin =
        await checkAdmin();


    if (!isAdmin) {

        return;

    }


    await loadProblems();

}


start();