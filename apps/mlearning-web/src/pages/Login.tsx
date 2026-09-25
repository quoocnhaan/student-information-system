import { useState } from 'react';
import { BookOpen, ShieldCheck, User, Lock, Eye, EyeOff, ArrowRight, BookMarked, HelpCircle, Mail, Globe } from 'lucide-react';
import styles from './Login.module.css';

export function Login() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={styles.container}>
      {/* Background */}
      <div className={styles.background}>
        <div className={styles.gridPattern}></div>
        <div className={styles.glowPrimary}></div>
        <div className={styles.glowSecondary}></div>
        <div className={styles.glowTertiary}></div>
      </div>

      {/* Topbar */}
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

        <div className={styles.headerActions}>
          <div className={styles.statusIndicator}>
            <span className={styles.statusDot}></span>
            <span>Hệ thống hoạt động bình thường</span>
          </div>
          <div className={styles.dividerVertical}></div>
          <div className={styles.langSelector}>
            <button className={styles.langBtnActive}>
              <Globe size={16} /> Tiếng Việt
            </button>
            <button className={styles.langBtn}>EN</button>
          </div>
          <a href="#help" className={styles.helpLink}>
            <HelpCircle size={18} />
            <span>Trợ giúp</span>
          </a>
        </div>
      </header>

      {/* Main Form Area */}
      <main className={styles.main}>
        <div className={styles.loginCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon}>
              <BookOpen size={32} />
            </div>
            <h1 className={styles.cardTitle}>Đăng nhập vào hệ thống</h1>
            <p className={styles.cardSubtitle}>
              Nhập tài khoản định danh sinh viên hoặc giảng viên của bạn để tiếp tục
            </p>
          </div>

          <button className={styles.ssoButton}>
            <ShieldCheck size={20} />
            Đăng nhập bằng tài khoản trường (@universitas.edu)
          </button>

          <div className={styles.divider}>
            <div className={styles.dividerLine}></div>
            <span className={styles.dividerText}>hoặc sử dụng tài khoản hệ thống</span>
          </div>

          <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className={styles.inputLabel}>
                Tên đăng nhập hoặc Email học đường
              </label>
              <div className={styles.inputGroup}>
                <User size={20} className={styles.inputIcon} />
                <input
                  type="text"
                  className={styles.inputField}
                  placeholder="mssv@universitas.edu hoặc user_id"
                  required
                />
              </div>
            </div>

            <div>
              <label className={styles.inputLabel}>
                Mật khẩu
              </label>
              <div className={styles.inputGroup}>
                <Lock size={20} className={styles.inputIcon} />
                <input
                  type={showPassword ? "text" : "password"}
                  className={styles.inputField}
                  placeholder="••••••••••••"
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

            <div className={styles.auxRow}>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" className={styles.checkbox} />
                Ghi nhớ đăng nhập
              </label>
              <a href="#forgot" className={styles.forgotLink}>Quên mật khẩu?</a>
            </div>

            <div style={{ marginTop: '8px' }}>
              <button type="submit" className={styles.primaryButton}>
                Đăng nhập
                <ArrowRight size={20} />
              </button>
            </div>

            <div>
              <button type="button" className={styles.guestButton}>
                <BookMarked size={18} />
                Truy cập với tư cách khách
              </button>
            </div>
          </form>

          <div className={styles.securityBadge}>
            <ShieldCheck size={16} />
            <span>Bảo mật chuẩn SSL 256-bit • Chứng thực Universitas ID</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div>
            © 2025 Đại học Universitas • Trung tâm CNTT & Đào tạo Trực tuyến
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
