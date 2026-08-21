import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import "./styles.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

/* =========================================================
   APP
========================================================= */

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [page, setPage] = useState("home");
  const [solutions, setSolutions] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadUser(sessionValue) {
    setSession(sessionValue);

    if (!sessionValue || !supabase) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id,name,role")
      .eq("id", sessionValue.user.id)
      .maybeSingle();

    if (!error) {
      setProfile(data);
    }

    setLoading(false);
  }

  async function loadPublishedSolutions() {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("solutions")
      .select(
        "id,problem_id,step_number,title,description,created_by,created_at,updated_at,status"
      )
      .eq("status", "published")
      .order("problem_id")
      .order("step_number");

    if (!error) {
      setSolutions(data || []);
    }
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      loadUser(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      loadUser(newSession);
    });

    loadPublishedSolutions();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function logout() {
    if (supabase) {
      await supabase.auth.signOut();
    }

    setPage("home");
  }

  const isAdmin = profile?.role === "admin";

  if (loading) {
    return <div className="center">กำลังโหลด...</div>;
  }

  return (
    <div className="app">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="topbar">
        <div
          className="brand"
          onClick={() => setPage("home")}
          style={{ cursor: "pointer" }}
        >
          <div className="logo">IoT</div>

          <div>
            <strong>IoT Problem Solution</strong>
            <small>คลังโจทย์และวิธีแก้ปัญหา</small>
          </div>
        </div>

        <nav>
          <button
            className={page === "home" ? "nav active" : "nav"}
            onClick={() => setPage("home")}
          >
            หน้าหลัก
          </button>

          {isAdmin && (
            <button
              className={page === "admin" ? "nav active" : "nav"}
              onClick={() => setPage("admin")}
            >
              Admin Dashboard
            </button>
          )}

          {session ? (
            <button className="logout" onClick={logout}>
              ออกจากระบบ
            </button>
          ) : (
            <button
              className="primary"
              onClick={() => setPage("login")}
            >
              เข้าสู่ระบบ
            </button>
          )}
        </nav>
      </header>

      <main>
        {!supabase && (
          <div className="warning">
            ยังไม่ได้ตั้งค่า Supabase ให้สร้างไฟล์{" "}
            <code>.env</code> จาก <code>.env.example</code>
          </div>
        )}

        {/* =====================================================
            LOGIN
        ===================================================== */}

        {page === "login" && (
          <Login
            onSuccess={() => setPage("home")}
            onForgot={() => setPage("forgot-password")}
          />
        )}

        {/* =====================================================
            FORGOT PASSWORD
        ===================================================== */}

        {page === "forgot-password" && (
          <ForgotPassword
            onBack={() => setPage("login")}
          />
        )}

        {/* =====================================================
            RESET PASSWORD
        ===================================================== */}

        {page === "reset-password" && (
          <ResetPassword
            onSuccess={() => setPage("login")}
          />
        )}

        {/* =====================================================
            HOME
        ===================================================== */}

        {page === "home" && (
          <Home
            solutions={solutions}
            reload={loadPublishedSolutions}
          />
        )}

        {/* =====================================================
            ADMIN
        ===================================================== */}

        {page === "admin" && isAdmin && (
          <AdminDashboard
            solutions={solutions}
            onRefresh={loadPublishedSolutions}
          />
        )}

        {page === "admin" && !isAdmin && (
          <div className="card">
            <h2>ไม่มีสิทธิ์</h2>
            <p>หน้านี้สำหรับ Admin เท่านั้น</p>
          </div>
        )}
      </main>
    </div>
  );
}

/* =========================================================
   LOGIN
========================================================= */

function Login({ onSuccess, onForgot }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(e) {
    e.preventDefault();

    if (!supabase) {
      setMessage("ยังไม่ได้เชื่อมต่อ Supabase");
      return;
    }

    setBusy(true);
    setMessage("");

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      setMessage(error.message);
    } else {
      onSuccess();
    }

    setBusy(false);
  }

  return (
    <section className="login-wrap">
      <form className="card login" onSubmit={submit}>
        <div className="eyebrow">
          ADMIN / USER LOGIN
        </div>

        <h1>เข้าสู่ระบบ</h1>

        <p className="muted">
          ใช้ Email และ Password ของ Supabase Authentication
        </p>

        <label>Email</label>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="กรอก Email"
          required
        />

        <label>Password</label>

        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="กรอก Password"
          required
        />

        {/* ลืมรหัสผ่าน */}

        <div
          style={{
            textAlign: "right",
            marginTop: "8px",
            marginBottom: "16px",
          }}
        >
          <button
            type="button"
            onClick={onForgot}
            style={{
              border: "none",
              background: "transparent",
              color: "#5267c9",
              cursor: "pointer",
              fontSize: "15px",
              padding: 0,
            }}
          >
            ลืมรหัสผ่าน?
          </button>
        </div>

        {message && (
          <div className="error">
            {message}
          </div>
        )}

        <button
          className="primary full"
          disabled={busy}
        >
          {busy
            ? "กำลังเข้าสู่ระบบ..."
            : "เข้าสู่ระบบ"}
        </button>
      </form>
    </section>
  );
}

/* =========================================================
   FORGOT PASSWORD
========================================================= */

function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function sendResetEmail(e) {
    e.preventDefault();

    if (!supabase) {
      setMessage("ยังไม่ได้เชื่อมต่อ Supabase");
      return;
    }

    if (!email) {
      setMessage("กรุณากรอก Email");
      return;
    }

    setBusy(true);
    setMessage("");
    setSuccess(false);

    /*
      สำคัญ:
      ใช้ URL ของเว็บที่กำลังเปิดอยู่

      เช่น
      http://localhost:5173/reset-password
    */

    const redirectTo =
      `${window.location.origin}/reset-password`;

    console.log("Reset redirect URL:", redirectTo);

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo,
        }
      );

    if (error) {
      console.error("Password recovery error:", error);

      setMessage(
        error.message ||
          "ไม่สามารถส่งลิงก์รีเซ็ตรหัสผ่านได้"
      );
    } else {
      setSuccess(true);
      setMessage(
        "ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปยัง Email แล้ว กรุณาตรวจสอบกล่องข้อความ"
      );
    }

    setBusy(false);
  }

  return (
    <section className="login-wrap">
      <div className="card login">

        <div className="eyebrow">
          PASSWORD RECOVERY
        </div>

        <h1>ลืมรหัสผ่าน?</h1>

        <p className="muted">
          กรอก Email ของคุณเพื่อรับลิงก์สำหรับตั้งรหัสผ่านใหม่
        </p>

        <form onSubmit={sendResetEmail}>
          <label>Email</label>

          <input
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            type="email"
            placeholder="กรอก Email"
            required
          />

          {message && (
            <div
              className={
                success
                  ? "success"
                  : "error"
              }
            >
              {message}
            </div>
          )}

          <button
            className="primary full"
            disabled={busy}
          >
            {busy
              ? "กำลังส่งลิงก์..."
              : "ส่งลิงก์รีเซ็ตรหัสผ่าน"}
          </button>
        </form>

        <button
          type="button"
          onClick={onBack}
          style={{
            width: "100%",
            marginTop: "12px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "#5267c9",
            padding: "10px",
          }}
        >
          ← กลับไปหน้าเข้าสู่ระบบ
        </button>
      </div>
    </section>
  );
}

/* =========================================================
   RESET PASSWORD
========================================================= */

function ResetPassword({ onSuccess }) {
  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  const [ready, setReady] =
    useState(false);

  useEffect(() => {
    if (!supabase) {
      setMessage(
        "ยังไม่ได้เชื่อมต่อ Supabase"
      );
      return;
    }

    /*
      เมื่อผู้ใช้กดลิงก์จาก Email
      Supabase จะส่ง access token กลับมา
      และสร้าง recovery session
    */

    async function prepareRecovery() {
      const hash =
        window.location.hash;

      console.log(
        "Recovery hash:",
        hash
      );

      /*
        Supabase รุ่นปัจจุบันจะจัดการ
        session จาก URL ให้เองในหลายกรณี
      */

      const {
        data,
        error,
      } =
        await supabase.auth.getSession();

      if (error) {
        console.error(
          "Recovery session error:",
          error
        );

        setMessage(error.message);
        return;
      }

      if (data.session) {
        setReady(true);
        return;
      }

      /*
        รองรับกรณีที่ URL เป็น
        ?code=...
      */

      const params =
        new URLSearchParams(
          window.location.search
        );

      const code =
        params.get("code");

      if (code) {
        const {
          error: exchangeError,
        } =
          await supabase.auth.exchangeCodeForSession(
            code
          );

        if (exchangeError) {
          setMessage(
            exchangeError.message
          );
          return;
        }

        setReady(true);
        return;
      }

      setMessage(
        "ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง หรือหมดอายุแล้ว กรุณาขอลิงก์ใหม่"
      );
    }

    prepareRecovery();
  }, []);

  async function changePassword(e) {
    e.preventDefault();

    if (!supabase) {
      setMessage(
        "ยังไม่ได้เชื่อมต่อ Supabase"
      );
      return;
    }

    if (password.length < 6) {
      setMessage(
        "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"
      );
      return;
    }

    if (password !== confirmPassword) {
      setMessage(
        "รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน"
      );
      return;
    }

    setBusy(true);
    setMessage("");
    setSuccess(false);

    const { error } =
      await supabase.auth.updateUser({
        password,
      });

    if (error) {
      console.error(
        "Update password error:",
        error
      );

      setMessage(error.message);
    } else {
      setSuccess(true);
      setMessage(
        "เปลี่ยนรหัสผ่านสำเร็จแล้ว"
      );

      /*
        ออกจาก session หลังเปลี่ยนรหัสผ่าน
        เพื่อให้ผู้ใช้เข้าสู่ระบบด้วยรหัสใหม่
      */

      await supabase.auth.signOut();

      setTimeout(() => {
        onSuccess();
      }, 1500);
    }

    setBusy(false);
  }

  return (
    <section className="login-wrap">
      <div className="card login">

        <div className="eyebrow">
          RESET PASSWORD
        </div>

        <h1>ตั้งรหัสผ่านใหม่</h1>

        <p className="muted">
          กำหนดรหัสผ่านใหม่สำหรับบัญชีของคุณ
        </p>

        {!ready && !success && (
          <div
            className={
              message
                ? "error"
                : "muted"
            }
          >
            {message ||
              "กำลังตรวจสอบลิงก์รีเซ็ตรหัสผ่าน..."}
          </div>
        )}

        {ready && !success && (
          <form onSubmit={changePassword}>

            <label>
              รหัสผ่านใหม่
            </label>

            <input
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              type="password"
              placeholder="อย่างน้อย 6 ตัวอักษร"
              minLength={6}
              required
            />

            <label>
              ยืนยันรหัสผ่านใหม่
            </label>

            <input
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(
                  e.target.value
                )
              }
              type="password"
              placeholder="กรอกรหัสผ่านอีกครั้ง"
              minLength={6}
              required
            />

            {message && (
              <div className="error">
                {message}
              </div>
            )}

            <button
              className="primary full"
              disabled={busy}
            >
              {busy
                ? "กำลังเปลี่ยนรหัสผ่าน..."
                : "เปลี่ยนรหัสผ่าน"}
            </button>
          </form>
        )}

        {success && (
          <div className="success">
            เปลี่ยนรหัสผ่านสำเร็จแล้ว
            <br />
            กำลังกลับไปหน้าเข้าสู่ระบบ...
          </div>
        )}
      </div>
    </section>
  );
}

/* =========================================================
   HOME
========================================================= */

function Home({ solutions }) {
  return (
    <section>

      <div className="hero">

        <div>
          <div className="eyebrow">
            IOT PROBLEM SOLUTION
          </div>

          <h1>
            รวมโจทย์และวิธีแก้ปัญหา
            <br />
            สำหรับการเรียนรู้ IoT
          </h1>

          <p>
            ผู้ใช้งานสามารถดูวิธีแก้ปัญหา
            ที่เผยแพร่แล้วได้จากหน้านี้
          </p>
        </div>

        <div className="hero-badge">
          Published
          <br />

          <strong>
            {solutions.length}
          </strong>

          <br />

          Solutions
        </div>

      </div>

      <div className="section-title">

        <h2>
          Solutions ที่เผยแพร่แล้ว
        </h2>

        <span>
          {solutions.length} รายการ
        </span>

      </div>

      {solutions.length === 0 ? (
        <div className="empty card">
          ยังไม่มี Solution ที่เผยแพร่
        </div>
      ) : (
        <div className="grid">

          {solutions.map((s) => (
            <article
              className="card solution"
              key={s.id}
            >

              <div className="solution-meta">

                <span>
                  Problem #{s.problem_id}
                </span>

                <span>
                  Step {s.step_number}
                </span>

              </div>

              <h3>
                {s.title}
              </h3>

              <p>
                {s.description ||
                  "ไม่มีคำอธิบาย"}
              </p>

            </article>
          ))}

        </div>
      )}

    </section>
  );
}

/* =========================================================
   ADMIN DASHBOARD
========================================================= */

function AdminDashboard({
  solutions,
  onRefresh,
}) {
  const [form, setForm] = useState({
    problem_id: "",
    step_number: 1,
    title: "",
    description: "",
  });

  const [message, setMessage] =
    useState("");

  async function createSolution(e) {
    e.preventDefault();

    if (!supabase) return;

    setMessage("");

    const { data: auth } =
      await supabase.auth.getUser();

    if (!auth.user) {
      setMessage(
        "กรุณาเข้าสู่ระบบใหม่"
      );
      return;
    }

    const { error } =
      await supabase
        .from("solutions")
        .insert({
          problem_id: Number(
            form.problem_id
          ),

          step_number: Number(
            form.step_number
          ),

          title: form.title,

          description:
            form.description,

          created_by:
            auth.user.id,

          status: "published",
        });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      "เพิ่ม Solution สำเร็จ"
    );

    setForm({
      problem_id: "",
      step_number: 1,
      title: "",
      description: "",
    });

    onRefresh();
  }

  return (
    <section>

      <div className="admin-head">

        <div>

          <div className="eyebrow">
            ADMIN DASHBOARD
          </div>

          <h1>
            จัดการ Solution
          </h1>

          <p className="muted">
            เพิ่ม Solution ที่ต้องการเผยแพร่บนเว็บไซต์
          </p>

        </div>

      </div>

      <div className="admin-grid">

        <form
          className="card"
          onSubmit={createSolution}
        >

          <h2>
            เพิ่ม Solution
          </h2>

          <label>
            Problem ID
          </label>

          <input
            type="number"
            min="1"
            value={form.problem_id}
            onChange={(e) =>
              setForm({
                ...form,
                problem_id:
                  e.target.value,
              })
            }
            required
          />

          <label>
            Step Number
          </label>

          <input
            type="number"
            min="1"
            value={form.step_number}
            onChange={(e) =>
              setForm({
                ...form,
                step_number:
                  e.target.value,
              })
            }
            required
          />

          <label>
            Title
          </label>

          <input
            value={form.title}
            onChange={(e) =>
              setForm({
                ...form,
                title: e.target.value,
              })
            }
            required
          />

          <label>
            Description
          </label>

          <textarea
            rows="6"
            value={form.description}
            onChange={(e) =>
              setForm({
                ...form,
                description:
                  e.target.value,
              })
            }
          />

          {message && (
            <div
              className={
                message.includes(
                  "สำเร็จ"
                )
                  ? "success"
                  : "error"
              }
            >
              {message}
            </div>
          )}

          <button className="primary full">
            บันทึก Solution
          </button>

        </form>

        <div>

          <div className="section-title">

            <h2>
              รายการ Solution
            </h2>

            <span>
              {solutions.length} รายการ
            </span>

          </div>

          <div className="admin-list">

            {solutions.map((s) => (
              <div
                className="card list-row"
                key={s.id}
              >

                <div>

                  <strong>
                    {s.title}
                  </strong>

                  <small>
                    Problem #{s.problem_id}
                    {" · "}
                    Step {s.step_number}
                  </small>

                </div>

                <span className="status">
                  {s.status}
                </span>

              </div>
            ))}

            {solutions.length === 0 && (
              <div className="card empty">
                ยังไม่มีข้อมูล
              </div>
            )}

          </div>

        </div>

      </div>

    </section>
  );
}

/* =========================================================
   START APP
========================================================= */

createRoot(
  document.getElementById("root")
).render(
  <App />
);