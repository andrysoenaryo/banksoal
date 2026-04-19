import { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';

function PasswordField({ label, value, onChange, required, minLength }) {
    const [show, setShow] = useState(false);
    return (
        <label>
            <span>{label}</span>
            <div className="password-input-wrap">
                <input
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={onChange}
                    required={required}
                    minLength={minLength}
                />
                <button type="button" className="password-toggle" onClick={() => setShow((v) => !v)} tabIndex={-1}>
                    {show ? <FiEyeOff /> : <FiEye />}
                </button>
            </div>
        </label>
    );
}

export default function ChangePasswordDialog({ open, form, setForm, onCancel, onSubmit, loading }) {
    if (!open) {
        return null;
    }

    return (
        <div className="export-choice-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
            <div className="export-choice-dialog" onClick={(event) => event.stopPropagation()}>
                <h3 style={{ margin: 0 }}>Ganti Password</h3>
                <p className="muted" style={{ marginTop: 0 }}>
                    Fitur ini hanya mengganti password akun yang sedang login.
                </p>

                <form className="form-grid" onSubmit={onSubmit}>
                    <PasswordField
                        label="Password Saat Ini"
                        value={form.current_password}
                        onChange={(e) => setForm((c) => ({ ...c, current_password: e.target.value }))}
                        required
                    />
                    <PasswordField
                        label="Password Baru"
                        value={form.new_password}
                        onChange={(e) => setForm((c) => ({ ...c, new_password: e.target.value }))}
                        required
                        minLength={8}
                    />
                    <PasswordField
                        label="Konfirmasi Password Baru"
                        value={form.new_password_confirmation}
                        onChange={(e) => setForm((c) => ({ ...c, new_password_confirmation: e.target.value }))}
                        required
                        minLength={8}
                    />

                    <div className="button-row full-span">
                        <button type="submit" className="primary-button" disabled={loading}>
                            {loading ? 'Menyimpan...' : 'Simpan Password'}
                        </button>
                        <button type="button" className="ghost-button" onClick={onCancel} disabled={loading}>
                            Batal
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

