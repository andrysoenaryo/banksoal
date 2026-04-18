import { useState } from 'react';
import { FiBookOpen, FiFileText, FiLayers, FiLogIn, FiShield } from 'react-icons/fi';

export default function LoginScreen({ onLogin, onError, status }) {
    const [form, setForm] = useState({ email: 'admin@appsoal.local', password: 'password' });
    const [submitting, setSubmitting] = useState(false);

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

    return (
        <div className="login-shell">
            <section className="login-panel hero-panel">
                <p className="shell-brand login-brand">Dashboard Guru</p>
                <p className="eyebrow">Laravel API + React SPA</p>
                <h1>Kelola bank soal dengan layout yang ringkas, rapi, dan siap dipakai harian.</h1>
                <p className="muted login-copy">
                    Cocok untuk tim akademik atau admin ujian yang perlu memecah materi per bab dan sub bab, lalu membentuk paket soal berdasarkan persentase atau jumlah tetap.
                </p>
                <div className="feature-grid">
                    <article>
                        <span className="kpi-icon tone-blue"><FiLayers /></span>
                        <strong>Bab Bertingkat</strong>
                        <span>Model hierarki mendukung bab utama dan sub bab tanpa tabel duplikat.</span>
                    </article>
                    <article>
                        <span className="kpi-icon tone-green"><FiBookOpen /></span>
                        <strong>Generator Paket</strong>
                        <span>Set komposisi per bab, tipe soal, dan total soal sesuai kebutuhan.</span>
                    </article>
                    <article>
                        <span className="kpi-icon tone-rose"><FiShield /></span>
                        <strong>Hak Akses</strong>
                        <span>Role dan permission membatasi akses CRUD per modul.</span>
                    </article>
                </div>
            </section>

            <section className="login-panel form-panel">
                <p className="eyebrow">Masuk Sistem</p>
                <h2>Masuk ke panel admin</h2>
                <p className="muted">Gunakan akun seed bawaan untuk akses awal.</p>
                {status.message ? <div className={`status-banner ${status.type}`}>{status.message}</div> : null}
                <form className="form-grid" onSubmit={submit}>
                    <label>
                        <span>Email</span>
                        <input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
                    </label>
                    <label>
                        <span>Password</span>
                        <input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
                    </label>
                    <button type="submit" className="primary-button login-submit" disabled={submitting}>
                        <FiLogIn />
                        <span>{submitting ? 'Memproses...' : 'Login'}</span>
                    </button>
                </form>
                <div className="login-hint-row">
                    <span className="chip"><FiFileText /> Import / Export siap pakai</span>
                    <span className="chip"><FiBookOpen /> Generator soal fleksibel</span>
                </div>
            </section>
        </div>
    );
}
