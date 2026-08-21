const loginForm =
    document.getElementById("loginForm");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const loginButton =
    document.getElementById("loginButton");

const message =
    document.getElementById("message");


// ==============================
// SHOW MESSAGE
// ==============================

function showMessage(
    text,
    type = "error"
) {

    message.textContent = text;

    message.className =
        "message " + type;

}


// ==============================
// LOGIN
// ==============================

loginForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const email =
            emailInput.value.trim();

        const password =
            passwordInput.value;


        console.log(
            "กำลัง Login:",
            email
        );


        // =========================
        // CHECK INPUT
        // =========================

        if (!email) {

            showMessage(
                "กรุณากรอก Email",
                "error"
            );

            emailInput.focus();

            return;
        }


        if (!password) {

            showMessage(
                "กรุณากรอก Password",
                "error"
            );

            passwordInput.focus();

            return;
        }


        loginButton.disabled = true;

        loginButton.textContent =
            "กำลังเข้าสู่ระบบ...";


        showMessage(
            "กำลังตรวจสอบข้อมูล...",
            "success"
        );


        try {


            // =========================
            // SUPABASE LOGIN
            // =========================

            const {
                data,
                error
            } =
                await supabaseClient
                    .auth
                    .signInWithPassword({

                        email: email,

                        password: password

                    });


            console.log(
                "Login result:",
                data
            );


            console.log(
                "Login error:",
                error
            );


            if (error) {

                throw error;

            }


            if (!data.user) {

                throw new Error(
                    "ไม่พบข้อมูลผู้ใช้"
                );

            }


            // =========================
            // CHECK SESSION
            // =========================

            const {
                data: sessionData,
                error: sessionError
            } =
                await supabaseClient
                    .auth
                    .getSession();


            console.log(
                "Session:",
                sessionData
            );


            if (sessionError) {

                throw sessionError;

            }


            if (!sessionData.session) {

                throw new Error(
                    "ไม่พบ Session หลังเข้าสู่ระบบ"
                );

            }


            // =========================
            // GET PROFILE
            // =========================

            const {
                data: profile,
                error: profileError
            } =
                await supabaseClient

                    .from("profiles")

                    .select(
                        "id, name, role"
                    )

                    .eq(
                        "id",
                        data.user.id
                    )

                    .single();


            console.log(
                "Profile:",
                profile
            );


            console.log(
                "Profile error:",
                profileError
            );


            if (profileError) {

                throw profileError;

            }


            // =========================
            // SAVE USER INFO
            // =========================

            localStorage.setItem(
                "userEmail",
                data.user.email
            );


            localStorage.setItem(
                "userRole",
                profile.role
            );


            localStorage.setItem(
                "userName",
                profile.name || ""
            );


            console.log(
                "ROLE:",
                profile.role
            );


            // =========================
            // LOGIN SUCCESS
            // =========================

            showMessage(
                "เข้าสู่ระบบสำเร็จ",
                "success"
            );


            /*
             * ทุกคนไปหน้า index
             *
             * index จะตรวจเองว่า
             * เป็น user หรือ admin
             */

            setTimeout(
                function () {

                    window.location.href =
                        "index.html";

                },
                500
            );

        }


        catch (error) {


            console.error(
                "LOGIN ERROR:",
                error
            );


            let errorMessage =
                "เข้าสู่ระบบไม่สำเร็จ";


            if (
                error.message ===
                "Invalid login credentials"
            ) {

                errorMessage =
                    "❌ Email หรือ Password ไม่ถูกต้อง";

            }


            else if (
                error.message &&
                error.message
                    .toLowerCase()
                    .includes("email")
            ) {

                errorMessage =
                    "❌ Email ไม่ถูกต้อง";

            }


            else {

                errorMessage =
                    "❌ เกิดข้อผิดพลาด: " +
                    error.message;

            }


            showMessage(
                errorMessage,
                "error"
            );


            loginButton.disabled =
                false;


            loginButton.textContent =
                "เข้าสู่ระบบ";


            // ไม่ล้าง Email

            emailInput.value =
                email;

        }

    }
);