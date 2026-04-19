import { useState } from 'react';
import { FiBookOpen, FiEye, FiEyeOff, FiFileText, FiKey, FiLayers, FiLogIn } from 'react-icons/fi';
import { API_BASE_URL } from '../config/constants';
import appIcon from '../img/banksoal.png';

export default function LoginScreen({ onLogin, onError, status }) {
    const [form, setForm] = useState({ email: '', password: '' });
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showForgot, setShowForgot] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotStatus, setForgotStatus] = useState({ message: '', type: '' });
    const [forgotSubmitting, setForgotSubmitting] = useState(false);

    async function submit(event) {
        event.preventDefault();
        setSubmitting(true);
        try {
            await onLogin(form);
        } catch (error) {
            onError(error);
        } finally {
            setSubmitting(false);
        }
    }

    async function submitForgot(event) {
        event.preventDefault();
        setForgotSubmitting(true);
        setForgotStatus({ message: '', type: '' });
        try {
            const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ email: forgotEmail }),
            });
            const json = await res.json();
            if (res.ok) {
                setForgotStatus({ message: json.message, type: 'success' });
                setForgotEmail('');
            } else {
                const msg = json.errors?.email?.[0] ?? json.message ?? 'Terjadi kesalahan.';
                setForgotStatus({ message: msg, type: 'error' });
            }
        } catch {
            setForgotStatus({ message: 'Tidak dapat terhubung ke server.', type: 'error' });
        } finally {
            setForgotSubmitting(false);
        }
    }

    const decorativeContent = (
        <>
            <div className="hero-ribbon-row">
                <div className="hero-ribbon-card">
                    <strong>Lebih tertata</strong>
                    <span>Bank soal, bab, dan paket dalam satu alur kerja.</span>
                </div>
                <div className="hero-ribbon-card">
                    <strong>Lebih cepat</strong>
                    <span>Import, susun, dan distribusi soal tanpa kerja ulang.</span>
                </div>
            </div>
            <div className="hero-features">
                <div className="hero-feat-item">
                    <span className="kpi-icon tone-blue"><FiLayers /></span>
                    <div>
                        <strong>Bab Bertingkat</strong>
                        <span>Hierarki bab &amp; sub bab fleksibel</span>
                    </div>
                </div>
                <div className="hero-feat-item">
                    <span className="kpi-icon tone-green"><FiBookOpen /></span>
                    <div>
                        <strong>Generator Paket</strong>
                        <span>Komposisi soal per bab otomatis</span>
                    </div>
                </div>
                <div className="hero-feat-item">
                    <span className="kpi-icon tone-amber"><FiFileText /></span>
                    <div>
                        <strong>Import / Export</strong>
                        <span>Excel, Word, dan PDF siap pakai</span>
                    </div>
                </div>
                <div className="hero-feat-item">
                    <span className="kpi-icon tone-rose"><FiKey /></span>
                    <div>
                        <strong>Hak Akses</strong>
                        <span>Role &amp; permission per modul</span>
                    </div>
                </div>
            </div>
        </>
    );

    return (
        <div className="login-shell">
            <div className="login-stage">
                <section className="login-panel hero-panel">
                    <div className="hero-badge">Portal Manajemen Soal</div>
                    <div className="hero-center">
                        <h1 className="hero-title">Bank Soal Digital</h1>
                        <p className="hero-sub">Platform pengelolaan soal ujian terpadu untuk tim akademik yang butuh cepat, rapi, dan siap pakai setiap hari.</p>
                        <div className="hero-logo-frame">
                            <div className="hero-logo-glow" />
                            <img src={appIcon} alt="App Soal" className="login-app-icon-hero" />
                        </div>
                    </div>
                </section>

                <section className="login-panel form-panel">
                    <div className="form-panel-inner">
                        {!showForgot ? (
                            <>
                                <div className="form-panel-head">
                                    <p className="eyebrow">Masuk Sistem</p>
                                    <h2>Selamat datang kembali</h2>
                                    <p className="muted">Masukkan akun yang telah didaftarkan oleh administrator untuk melanjutkan ke dashboard.</p>
                                </div>
                                {status.message ? <div className={`status-banner-inline ${status.type}`}>{status.message}</div> : null}
                                <form className="form-list-stack login-form" onSubmit={submit}>
                                    <label>
                                        <span>Email</span>
                                        <input
                                            type="email"
                                            autoComplete="email"
                                            value={form.email}
                                            onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
                                            placeholder="nama@email.com"
                                        />
                                    </label>
                                    <label>
                                        <span>Password</span>
                                        <div className="password-input-wrap">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                autoComplete="current-password"
                                                value={form.password}
                                                onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))}
                                                placeholder="••••••••"
                                            />
                                            <button type="button" className="password-toggle" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}>
                                                {showPassword ? <FiEyeOff /> : <FiEye />}
                                            </button>
                                        </div>
                                    </label>
                                    <button type="submit" className="primary-button login-submit" disabled={submitting}>
                                        <FiLogIn />
                                        <span>{submitting ? 'Memproses...' : 'Masuk ke Dashboard'}</span>
                                    </button>
                                </form>
                                <div className="login-form-footer">
                                    <p className="login-form-note">Akses aman untuk admin, operator, dan tim akademik.</p>
                                    <p className="forgot-link">
                                        <button type="button" onClick={() => { setShowForgot(true); setForgotStatus({ message: '', type: '' }); }}>
                                            Lupa password?
                                        </button>
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="form-panel-head">
                                    <p className="eyebrow">Reset Password</p>
                                    <h2>Lupa password?</h2>
                                    <p className="muted">Masukkan email terdaftar. Konfirmasi akan dikirim ke email, dan password baru dikirim setelah link dikonfirmasi.</p>
                                </div>
                                {forgotStatus.message ? <div className={`status-banner-inline ${forgotStatus.type}`}>{forgotStatus.message}</div> : null}
                                <form className="form-list-stack login-form" onSubmit={submitForgot}>
                                    <label>
                                        <span>Email</span>
                                        <input
                                            type="email"
                                            autoComplete="email"
                                            value={forgotEmail}
                                            onChange={(e) => setForgotEmail(e.target.value)}
                                            placeholder="nama@email.com"
                                            required
                                        />
                                    </label>
                                    <button type="submit" className="primary-button login-submit" disabled={forgotSubmitting}>
                                        <span>{forgotSubmitting ? 'Mengirim...' : 'Kirim Email Konfirmasi'}</span>
                                    </button>
                                </form>
                                <div className="login-form-footer single-action">
                                    <p className="forgot-link forgot-link-back">
                                        <button type="button" onClick={() => setShowForgot(false)}>← Kembali ke login</button>
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </section>

                <section className="login-panel hero-decor-panel">
                    {decorativeContent}
                </section>
            </div>
        </div>
    );
}
