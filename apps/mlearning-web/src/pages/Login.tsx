import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { roleRoutes } from "../routes/roleRoutes";
import { BookOpen, User, Lock, Eye, EyeOff, ArrowRight, Mail } from 'lucide-react';
import styles from './Login.module.css';

type Role = "teacher" | "student";

interface MockAccount {
  id: string;
  username: string;
  password: string;
  role: Role;
}

// Tạm thời: 2 tài khoản giả lập. Xóa khi đã có backend.
const MOCK_ACCOUNTS: MockAccount[] = [
  { id: "1", username: "teacher@universitas.edu", password: "teacher123", role: "teacher" },
  { id: "2", username: "student@universitas.edu", password: "student123", role: "student" },
];

export function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    // Giả lập backend: tìm tài khoản khớp username + password
    const account = MOCK_ACCOUNTS.find(
      (a) =>
        a.username.toLowerCase() === username.trim().toLowerCase() &&
        a.password === password
    );

    if (!account) {
      setError("Email hoặc mật khẩu không đúng.");
      return;
    }

    const response = {
      user: {
        id: account.id,
        username: account.username,
        role: account.role,
      },
      accessToken: "fake-token",
    };

    // Dùng khi có backend:
    // const response = await loginApi(username, password);

    login(response.user);
    navigate(roleRoutes[response.user.role]);
  };

  // Điền nhanh tài khoản demo
  const fillDemo = (role: Role) => {
    const acc = MOCK_ACCOUNTS.find((a) => a.role === role)!;
    setUsername(acc.username);
    setPassword(acc.password);
    setError("");
  };

  return (
    <div className={styles.container}>
      <div className={styles.background}>
        <div className={styles.gridPattern}></div>
        <div className={styles.glowPrimary}></div>
        <div className={styles.glowSecondary}></div>
        <div className={styles.glowTertiary}></div>
      </div>

      <header className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <BookOpen size={20} />
          </div>
          <div className={styles.logoText}>
            <span className={styles.logoTitle}>Universitas</span>
            <span className={styles.logoSubtitle}>Academic Portal</span>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.loginCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon}>
              <BookOpen size={32} />
            </div>
            <h1 className={styles.cardTitle}>Đăng nhập vào hệ thống</h1>
          </div>

          <div className={styles.divider}>
            <div className={styles.dividerLine}></div>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div>
              <label className={styles.inputLabel}>Email</label>
              <div className={styles.inputGroup}>
                <User size={20} className={styles.inputIcon} />
                <input
                  type="text"
                  className={styles.inputField}
                  placeholder="mssv@universitas.edu"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className={styles.inputLabel}>Mật khẩu</label>
              <div className={styles.inputGroup}>
                <Lock size={20} className={styles.inputIcon} />
                <input
                  type={showPassword ? "text" : "password"}
                  className={styles.inputField}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className={styles.eyeButton}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" style={{ color: '#d93025', fontSize: '13px' }}>
                {error}
              </div>
            )}

            <div className={styles.auxRow}>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" className={styles.checkbox} />
                Ghi nhớ đăng nhập
              </label>
            </div>

            <div style={{ marginTop: '8px' }}>
              <button type="submit" className={styles.primaryButton}>
                Đăng nhập
                <ArrowRight size={20} />
              </button>
            </div>

            {/* Tài khoản demo - xóa khi có backend */}
            <div style={{ marginTop: '12px', fontSize: '12px', textAlign: 'center' }}>
              Tài khoản demo:{" "}
              <button type="button" onClick={() => fillDemo("teacher")}
                style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', color: 'inherit' }}>
                Teacher
              </button>
              {" • "}
              <button type="button" onClick={() => fillDemo("student")}
                style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', color: 'inherit' }}>
                Student
              </button>
            </div>
          </form>
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div>
            © 2026 Đại học Universitas • Trung tâm CNTT & Đào tạo Trực tuyến
          </div>
          <div className={styles.footerLinks}>
            <a href="#support" className={styles.footerLink}>
              <Mail size={14} /> support@universitas.edu
            </a>
            <span>•</span>
            <a href="#rules" className={styles.footerLink}>Quy chế đào tạo</a>
            <span>•</span>
            <a href="#privacy" className={styles.footerLink}>Bảo mật thông tin</a>
          </div>
        </div>
      </footer>
    </div>
  );
}