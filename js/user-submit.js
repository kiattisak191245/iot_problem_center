// =====================================
// USER SUBMIT
// =====================================

let currentUser = null;

let currentProblemId = null;

let solutionCount = 0;


// =====================================
// ELEMENTS
// =====================================

const problemForm =
    document.getElementById("problemForm");

const solutionSection =
    document.getElementById("solutionSection");

const solutionList =
    document.getElementById("solutionList");

const addSolutionButton =
    document.getElementById("addSolutionButton");

const submitAllButton =
    document.getElementById("submitAllButton");

const message =
    document.getElementById("message");


// =====================================
// MESSAGE
// =====================================

function showMessage(text, type = "error") {

    message.textContent = text;

    message.className =
        "form-message " + type;

}


// =====================================
// CHECK LOGIN
// =====================================

async function checkUser() {

    const {
        data,
        error
    } =
        await supabaseClient.auth.getSession();


    if (error) {

        console.error(error);

        return;

    }


    if (!data.session) {

        window.location.href =
            "login.html";

        return;

    }


    currentUser =
        data.session.user;


    document.getElementById(
        "userEmail"
    ).textContent =
        currentUser.email;

}


// =====================================
// CREATE PROBLEM
// =====================================

problemForm.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        const title =
            document.getElementById("title")
                .value.trim();


        const description =
            document.getElementById("description")
                .value.trim();


        const category =
            document.getElementById("category")
                .value;


        const symptoms =
            document.getElementById("symptoms")
                .value.trim();


        const causes =
            document.getElementById("causes")
                .value.trim();


        if (!title || !description || !category) {

            showMessage(
                "กรุณากรอกข้อมูลปัญหาให้ครบ",
                "error"
            );

            return;

        }


        try {

            document.getElementById(
                "saveProblemButton"
            ).disabled = true;


            // ==============================
            // INSERT PROBLEM
            // ==============================

            const {
                data,
                error
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

                        created_by:
                            currentUser.id

                    })
                    .select()
                    .single();


            if (error) {

                throw error;

            }


            currentProblemId =
                data.id;


            // ==============================
            // SUCCESS
            // ==============================

            showMessage(
                "บันทึกปัญหาแล้ว สามารถเพิ่มวิธีแก้ไขได้",
                "success"
            );


            solutionSection.style.display =
                "block";


            problemForm.querySelectorAll(
                "input, textarea, select, button"
            ).forEach(element => {

                element.disabled = true;

            });


            addSolution();


        }

        catch(error) {

            console.error(error);

            showMessage(
                "❌ บันทึกปัญหาไม่สำเร็จ: " +
                error.message,
                "error"
            );

        }

        finally {

            document.getElementById(
                "saveProblemButton"
            ).disabled = false;

        }

    }
);


// =====================================
// ADD SOLUTION
// =====================================

function addSolution() {

    solutionCount++;


    const box =
        document.createElement("div");


    box.className =
        "solution-form-box";


    box.dataset.step =
        solutionCount;


    box.innerHTML = `

        <h3>
            ขั้นตอนที่ ${solutionCount}
        </h3>


        <label>
            หัวข้อ
        </label>

        <input
            type="text"
            class="solution-title"
            placeholder="เช่น ตรวจสอบสาย USB"
            required
        >


        <label>
            รายละเอียดวิธีแก้ไข
        </label>

        <textarea
            class="solution-description"
            rows="5"
            placeholder="อธิบายวิธีแก้ไข..."
        ></textarea>


        <label>
            รูปภาพ
        </label>

        <input
            type="file"
            class="solution-image"
            accept="image/jpeg,image/png,image/webp"
        >


        <button
            type="button"
            class="cancel-button delete-solution"
        >
            🗑 ลบขั้นตอน
        </button>

    `;


    solutionList.appendChild(box);


    box.querySelector(
        ".delete-solution"
    ).addEventListener(
        "click",
        () => {

            box.remove();

            renumberSolutions();

        }
    );

}


// =====================================
// RENUMBER
// =====================================

function renumberSolutions() {

    const boxes =
        document.querySelectorAll(
            ".solution-form-box"
        );


    boxes.forEach(
        (box, index) => {

            box.dataset.step =
                index + 1;


            const heading =
                box.querySelector("h3");


            heading.textContent =
                "ขั้นตอนที่ " +
                (index + 1);

        }
    );

}


// =====================================
// ADD BUTTON
// =====================================

addSolutionButton.addEventListener(
    "click",
    addSolution
);


// =====================================
// SUBMIT SOLUTIONS
// =====================================

submitAllButton.addEventListener(
    "click",
    async function() {

        const boxes =
            document.querySelectorAll(
                ".solution-form-box"
            );


        if (boxes.length === 0) {

            showMessage(
                "กรุณาเพิ่มวิธีแก้ไขอย่างน้อย 1 ขั้นตอน",
                "error"
            );

            return;

        }


        try {

            submitAllButton.disabled =
                true;


            for (
                let i = 0;
                i < boxes.length;
                i++
            ) {

                const box =
                    boxes[i];


                const title =
                    box.querySelector(
                        ".solution-title"
                    ).value.trim();


                const description =
                    box.querySelector(
                        ".solution-description"
                    ).value.trim();


                const imageInput =
                    box.querySelector(
                        ".solution-image"
                    );


                if (!title) {

                    throw new Error(
                        `กรุณากรอกหัวข้อขั้นตอนที่ ${i + 1}`
                    );

                }


                // ==========================
                // INSERT SOLUTION
                // ==========================

                const {
                    data: solution,
                    error
                } =
                    await supabaseClient
                        .from("solutions")
                        .insert({

                            problem_id:
                                currentProblemId,

                            step_number:
                                i + 1,

                            title:
                                title,

                            description:
                                description,

                            status:
                                "pending",

                            created_by:
                                currentUser.id

                        })
                        .select()
                        .single();


                if (error) {

                    throw error;

                }


                // ==========================
                // IMAGE
                // ==========================

                if (
                    imageInput.files.length > 0
                ) {

                    const file =
                        imageInput.files[0];


                    const extension =
                        file.name
                            .split(".")
                            .pop();


                    const fileName =
                        `${currentUser.id}/${solution.id}.${extension}`;


                    const {
                        error:
                        uploadError
                    } =
                        await supabaseClient
                            .storage
                            .from(
                                "solution-images"
                            )
                            .upload(
                                fileName,
                                file,
                                {
                                    upsert: true,
                                    contentType:
                                        file.type
                                }
                            );


                    if (uploadError) {

                        throw uploadError;

                    }


                    // ==========================
                    // PUBLIC URL
                    // ==========================

                    const {
                        data:
                        publicUrl
                    } =
                        supabaseClient
                            .storage
                            .from(
                                "solution-images"
                            )
                            .getPublicUrl(
                                fileName
                            );


                    // ==========================
                    // SAVE IMAGE URL
                    // ==========================

                    const {
                        error:
                        imageError
                    } =
                        await supabaseClient
                            .from(
                                "solution_images"
                            )
                            .insert({

                                solution_id:
                                    solution.id,

                                image_url:
                                    publicUrl.publicUrl,

                                caption:
                                    title,

                                created_by:
                                    currentUser.id

                            });


                    if (imageError) {

                        throw imageError;

                    }

                }

            }


            showMessage(
                "✅ ส่งข้อมูลให้ Admin ตรวจสอบเรียบร้อยแล้ว",
                "success"
            );


            submitAllButton.style.display =
                "none";


            addSolutionButton.style.display =
                "none";


        }

        catch(error) {

            console.error(error);

            showMessage(
                "❌ ส่งข้อมูลไม่สำเร็จ: " +
                error.message,
                "error"
            );

        }

        finally {

            submitAllButton.disabled =
                false;

        }

    }
);


// =====================================
// LOGOUT
// =====================================

document
    .getElementById("logoutButton")
    .addEventListener(
        "click",
        async function() {

            await supabaseClient.auth.signOut();

            window.location.href =
                "login.html";

        }
    );


// =====================================
// START
// =====================================

checkUser();