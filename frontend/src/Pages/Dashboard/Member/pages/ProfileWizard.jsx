import React, { useEffect, useRef, useState } from "react";
import {
  getProfileWizard,
  uploadProfilePhoto,
  saveProfileWizard,
  getErrorMessage,
} from "../api/profileApi";
import "./ProfileWizard.css";

const STEPS = [
  { key: "profile", label: "Profile Details" },
  { key: "banking", label: "Banking Details" },
];

const ACCOUNT_TYPES = [
  { value: "savings", label: "Savings" },
  { value: "current", label: "Current" },
];

export default function ProfileWizard({ onBack }) {
  const [step, setStep] = useState(0); // 0 = Profile Details, 1 = Banking Details
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const fileInputRef = useRef(null);

  const [existing, setExisting] = useState({ profile: null, banking: null });

  const [profileForm, setProfileForm] = useState({
    fullname: "",
    date_of_birth: "",
    phone: "",
    address: "",
    aadhar_number: "",
  });
  const [email, setEmail] = useState("");

  const [bankForm, setBankForm] = useState({
    pan_number: "",
    account_number: "",
    account_holder_name: "",
    bank_name: "",
    account_type: "savings",
    ifsc_code: "",
    branch_name: "",
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingStep1, setSavingStep1] = useState(false);
  const [success, setSuccess] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await getProfileWizard();
        const { profile, banking } = res.data;
        setExisting({ profile, banking });
        setEmail(profile.email || "");
        setPhotoUrl(profile.profile_photo_url || null);
        setProfileForm({
          fullname: profile.fullname || "",
          date_of_birth: profile.date_of_birth || "",
          phone: profile.phone || "",
          address: profile.address || "",
          aadhar_number: "",
        });
        if (banking) {
          setBankForm((prev) => ({
            ...prev,
            account_holder_name: banking.account_holder_name || "",
            bank_name: banking.bank_name || "",
            account_type: banking.account_type || "savings",
            ifsc_code: banking.ifsc_code || "",
            branch_name: banking.branch_name || "",
          }));
        }
      } catch (err) {
        setLoadError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handlePhotoClick = () => fileInputRef.current?.click();

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setPhotoError("Please choose a JPEG, PNG, or WEBP image.");
      return;
    }

    try {
      setPhotoUploading(true);
      setPhotoError("");
      const res = await uploadProfilePhoto(file);
      setPhotoUrl(res.data.profile_photo_url);
    } catch (err) {
      setPhotoError(getErrorMessage(err));
    } finally {
      setPhotoUploading(false);
      e.target.value = "";
    }
  };

  const updateProfileField = (key, value) => {
    setProfileForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const updateBankField = (key, value) => {
    setBankForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const goNext = async () => {
    setFormError("");

    const errs = {};
    if (!profileForm.fullname.trim()) errs.fullname = "Name is required.";
    if (!profileForm.date_of_birth) errs.date_of_birth = "Date of birth is required.";
    if (!profileForm.phone.trim()) errs.phone = "Phone number is required.";
    if (!profileForm.address.trim()) errs.address = "Address is required.";
    if (!profileForm.aadhar_number.trim() && !existing.profile?.aadhar_number_masked) {
      errs.aadhar_number = "Aadhar number is required.";
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setFormError("Please fill in all required fields.");
      return;
    }

    const profile = {};
    if (profileForm.fullname.trim() !== (existing.profile?.fullname || "")) profile.fullname = profileForm.fullname.trim();
    if (profileForm.date_of_birth) profile.date_of_birth = profileForm.date_of_birth;
    if (profileForm.phone.trim()) profile.phone = profileForm.phone.trim();
    if (profileForm.address.trim()) profile.address = profileForm.address.trim();
    if (profileForm.aadhar_number.trim()) profile.aadhar_number = profileForm.aadhar_number.trim();

    try {
      setSavingStep1(true);
      setFieldErrors({});
      if (Object.keys(profile).length > 0) {
        await saveProfileWizard({ profile });
      }
      setStep(1);
    } catch (err) {
      if (err?.response?.status === 422) {
        const detail = err.response.data?.detail;
        if (Array.isArray(detail)) {
          const errsFromServer = {};
          detail.forEach((d) => {
            const key = d.loc?.[d.loc.length - 1];
            if (key) errsFromServer[key] = d.msg;
          });
          setFieldErrors(errsFromServer);
          setFormError("Please fix the highlighted fields.");
        } else {
          setFormError(detail || "Some information is invalid.");
        }
      } else {
        setFormError(getErrorMessage(err));
      }
    } finally {
      setSavingStep1(false);
    }
  };

  const goBack = () => {
    setFormError("");
    setStep(0);
  };

  const buildPayload = () => {
    const profile = {};
    if (profileForm.fullname.trim() && profileForm.fullname.trim() !== existing.profile?.fullname) {
      profile.fullname = profileForm.fullname.trim();
    }
    if (profileForm.date_of_birth) profile.date_of_birth = profileForm.date_of_birth;
    if (profileForm.phone.trim()) profile.phone = profileForm.phone.trim();
    if (profileForm.address.trim()) profile.address = profileForm.address.trim();
    if (profileForm.aadhar_number.trim()) profile.aadhar_number = profileForm.aadhar_number.trim();

    const banking = {};
    if (bankForm.pan_number.trim()) banking.pan_number = bankForm.pan_number.trim();
    if (bankForm.account_number.trim()) banking.account_number = bankForm.account_number.trim();
    if (bankForm.account_holder_name.trim()) banking.account_holder_name = bankForm.account_holder_name.trim();
    if (bankForm.bank_name.trim()) banking.bank_name = bankForm.bank_name.trim();
    if (bankForm.account_type) banking.account_type = bankForm.account_type;
    if (bankForm.ifsc_code.trim()) banking.ifsc_code = bankForm.ifsc_code.trim();
    if (bankForm.branch_name.trim()) banking.branch_name = bankForm.branch_name.trim();

    return {
      profile: Object.keys(profile).length ? profile : undefined,
      banking: Object.keys(banking).length ? banking : undefined,
    };
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setFormError("");
      setFieldErrors({});
      await saveProfileWizard(buildPayload());
      setSuccess(true);
      setEditMode(false);
      setTimeout(() => onBack(), 1200);
    } catch (err) {
      if (err?.response?.status === 422) {
        const detail = err.response.data?.detail;
        if (Array.isArray(detail)) {
          const errs = {};
          detail.forEach((d) => {
            const key = d.loc?.[d.loc.length - 1];
            if (key) errs[key] = d.msg;
          });
          setFieldErrors(errs);
          setFormError("Please fix the highlighted fields.");
        } else {
          setFormError(detail || "Some information is invalid.");
        }
      } else {
        setFormError(getErrorMessage(err));
      }
    } finally {
      setSaving(false);
    }
  };

  const initials = (profileForm.fullname || "M").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  if (loading) {
    return (
      <div className="pw-page">
        <div className="pw-loading">Loading your profile...</div>
      </div>
    );
  }

  return (
    <div className="pw-page">
      <div className="pw-header-row">
        <h1 className="pw-title">Complete Your Profile</h1>
        <button
          type="button"
          className={`pw-edit-toggle ${editMode ? "pw-edit-toggle--active" : ""}`}
          onClick={() => setEditMode((v) => !v)}
          title={editMode ? "Editing enabled" : "Click to edit"}
        >
          ✎ {editMode ? "Editing" : "Edit"}
        </button>
      </div>

      {/* Progress bar */}
      <div className="pw-progress">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.key}>
            <div className="pw-progress__step">
              <div className={`pw-progress__circle ${i < step ? "pw-progress__circle--done" : ""} ${i === step ? "pw-progress__circle--active" : ""}`}>
                {i < step ? "✓" : i + 1}
              </div>
              <div className={`pw-progress__label ${i === step ? "pw-progress__label--active" : ""}`}>{s.label}</div>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`pw-progress__line ${i < step ? "pw-progress__line--done" : ""}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {loadError && <div className="pw-error-banner">{loadError}</div>}
      {formError && <div className="pw-error-banner">{formError}</div>}
      {success && <div className="pw-success-banner">Saved successfully — taking you back...</div>}

      <div className="pw-card">
        {step === 0 && (
          <>
            <div className="pw-photo-row">
              <button className="pw-photo" onClick={handlePhotoClick} disabled={photoUploading || !editMode} type="button">
                {photoUrl ? (
                  <img src={`http://localhost:8000${photoUrl}`} alt="Profile" />
                ) : (
                  <span className="pw-photo__initials">{initials}</span>
                )}
                <span className="pw-photo__edit">{photoUploading ? "..." : "✎"}</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={handlePhotoChange}
              />
              <div>
                <div className="pw-photo__label">Profile Photo</div>
                <div className="pw-photo__hint">Click the circle to upload a JPEG, PNG, or WEBP image.</div>
                {photoError && <div className="pw-field-error">{photoError}</div>}
              </div>
            </div>

            <div className="pw-grid">
              <div className="pw-field">
                <label>Full Name</label>
                <input className="pw-input" value={profileForm.fullname} onChange={(e) => updateProfileField("fullname", e.target.value)} disabled={!editMode} />
                {fieldErrors.fullname && <div className="pw-field-error">{fieldErrors.fullname}</div>}
              </div>

              <div className="pw-field">
                <label>Date of Birth</label>
                <input type="date" className="pw-input" value={profileForm.date_of_birth || ""} onChange={(e) => updateProfileField("date_of_birth", e.target.value)} disabled={!editMode} />
              </div>

              <div className="pw-field">
                <label>Email</label>
                <input className="pw-input" value={email} disabled />
              </div>

              <div className="pw-field">
                <label>Phone Number</label>
                <input className="pw-input" value={profileForm.phone} onChange={(e) => updateProfileField("phone", e.target.value)} disabled={!editMode} />
                {fieldErrors.phone && <div className="pw-field-error">{fieldErrors.phone}</div>}
              </div>

              <div className="pw-field pw-field--wide">
                <label>Address</label>
                <input className="pw-input" value={profileForm.address} onChange={(e) => updateProfileField("address", e.target.value)} disabled={!editMode} />
              </div>

              <div className="pw-field pw-field--wide">
                <label>Aadhar Card Number</label>
                <input
                  className="pw-input"
                  value={profileForm.aadhar_number}
                  onChange={(e) => updateProfileField("aadhar_number", e.target.value)}
                  placeholder={existing.profile?.aadhar_number_masked || "Enter 12-digit Aadhar number"}
                  disabled={!editMode}
                />
                {existing.profile?.aadhar_number_masked && (
                  <div className="pw-field-hint">On file: {existing.profile.aadhar_number_masked} — leave blank to keep it unchanged.</div>
                )}
                {fieldErrors.aadhar_number && <div className="pw-field-error">{fieldErrors.aadhar_number}</div>}
              </div>
            </div>

            <div className="pw-actions">
              <button className="pw-btn-outline" onClick={onBack} disabled={savingStep1}>Cancel</button>
              <button className="pw-btn-primary" onClick={goNext} disabled={savingStep1}>
                {savingStep1 ? "Saving..." : "Save & Next"}
              </button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="pw-grid">
              <div className="pw-field">
                <label>PAN Card Number</label>
                <input
                  className="pw-input"
                  value={bankForm.pan_number}
                  onChange={(e) => updateBankField("pan_number", e.target.value.toUpperCase())}
                  placeholder={existing.banking?.pan_number_masked || "e.g. ABCDE1234F"}
                  disabled={!editMode}
                />
                {existing.banking?.pan_number_masked && (
                  <div className="pw-field-hint">On file: {existing.banking.pan_number_masked} — leave blank to keep it unchanged.</div>
                )}
                {fieldErrors.pan_number && <div className="pw-field-error">{fieldErrors.pan_number}</div>}
              </div>

              <div className="pw-field">
                <label>Account Number</label>
                <input
                  className="pw-input"
                  value={bankForm.account_number}
                  onChange={(e) => updateBankField("account_number", e.target.value)}
                  placeholder={existing.banking?.account_number_masked || "Enter account number"}
                  disabled={!editMode}
                />
                {existing.banking?.account_number_masked && (
                  <div className="pw-field-hint">On file: {existing.banking.account_number_masked} — leave blank to keep it unchanged.</div>
                )}
                {fieldErrors.account_number && <div className="pw-field-error">{fieldErrors.account_number}</div>}
              </div>

              <div className="pw-field">
                <label>Account Holder Name</label>
                <input className="pw-input" value={bankForm.account_holder_name} onChange={(e) => updateBankField("account_holder_name", e.target.value)} disabled={!editMode} />
              </div>

              <div className="pw-field">
                <label>Bank Name</label>
                <input className="pw-input" value={bankForm.bank_name} onChange={(e) => updateBankField("bank_name", e.target.value)} disabled={!editMode} />
              </div>

              <div className="pw-field">
                <label>Account Type</label>
                <select className="pw-input" value={bankForm.account_type} onChange={(e) => updateBankField("account_type", e.target.value)} disabled={!editMode}>
                  {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div className="pw-field">
                <label>IFSC Code</label>
                <input className="pw-input" value={bankForm.ifsc_code} onChange={(e) => updateBankField("ifsc_code", e.target.value.toUpperCase())} placeholder="e.g. HDFC0001234" disabled={!editMode} />
                {fieldErrors.ifsc_code && <div className="pw-field-error">{fieldErrors.ifsc_code}</div>}
              </div>

              <div className="pw-field pw-field--wide">
                <label>Branch Name</label>
                <input className="pw-input" value={bankForm.branch_name} onChange={(e) => updateBankField("branch_name", e.target.value)} disabled={!editMode} />
              </div>
            </div>

            <p className="pw-security-note">🔒 Your PAN and account number are encrypted before being stored and are never shown in full again.</p>

            <div className="pw-actions">
              <button className="pw-btn-outline" onClick={goBack} disabled={saving}>Back</button>
              <button className="pw-btn-outline" onClick={onBack} disabled={saving}>Cancel</button>
              <button className="pw-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}