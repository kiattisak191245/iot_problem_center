// ========================================
// LOAD PROBLEM
// ========================================

async function loadProblem() {

    if (!problemId) {

        showError(
            "ไม่พบรหัสปัญหา"
        );

        return;

    }


    try {

        // ==============================
        // GET PROBLEM
        // ==============================

        const {
            data: problem,
            error: problemError
        } = await supabaseClient

            .from("problems")

            .select(`
                id,
                title,
                description,
                category,
                symptoms,
                causes,
                status
            `)

            .eq(
                "id",
                problemId
            )

            .eq(
                "status",
                "published"
            )

            .single();


        if (problemError) {

            throw problemError;

        }


        // ==============================
        // DISPLAY PROBLEM
        // ==============================

        problemTitle.textContent =
            problem.title;


        problemCategory.textContent =
            problem.category || "ทั่วไป";


        problemDescription.textContent =
            problem.description ||
            "ไม่มีรายละเอียด";


        problemSymptoms.textContent =
            problem.symptoms ||
            "ไม่มีข้อมูล";


        problemCauses.textContent =
            problem.causes ||
            "ไม่มีข้อมูล";


        // ==============================
        // LOAD PROBLEM IMAGES
        // ==============================

        await loadProblemImages();


        // ==============================
        // LOAD SOLUTIONS
        // ==============================

        await loadSolutions();


        // ==============================
        // SHOW
        // ==============================

        loading.style.display =
            "none";

        problemDetail.style.display =
            "block";

    }

    catch (error) {

        console.error(
            "Load problem error:",
            error
        );


        showError(
            "ไม่สามารถโหลดข้อมูลปัญหาได้"
        );

    }

}
