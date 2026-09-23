import React, { useState } from "react";
import Tesseract from "tesseract.js";
import "./DocumentScan.css";

const PAN_REGEX = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/i;
const AADHAAR_REGEX = /\b\d{4}\s?\d{4}\s?\d{4}\b/;
const PASSPORT_REGEX = /\b[A-PR-WYa-pr-wy][0-9]{7}\b/;
const DATE_REGEX = /\b(\d{2})[/-](\d{2})[/-](\d{4})\b/;

function normalizeDob(match) {
  const [, dd, mm, yyyy] = match;
  return `${yyyy}-${mm}-${dd}`;
}

function UploadSlot({ label, hint, onScan, onFileSelected, resultLabel }) {
  const [preview, setPreview] = useState("");
  const [fileName, setFileName] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [detected, setDetected] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setPreview(URL.createObjectURL(file));
    setError("");
    setDetected("");

    // Send the actual image file to ProfileWizard
    onFileSelected(file);

    setScanning(true);

    try {
      const result = await Tesseract.recognize(file, "eng");
      const text = result.data.text.replace(/\s+/g, " ").trim();

      const found = onScan(text);
      setDetected(found || "");

      if (!found) {
        setError(
          "Couldn't detect a number. Please enter it manually."
        );
      }
    } catch (err) {
      console.error("OCR error:", err);
      setError("Failed to read this image.");
    } finally {
      setScanning(false);
      e.target.value = "";
    }
  };

  return (
    <div className="ds-slot">
      <div className="ds-slot__preview">
        {preview ? (
          <img src={preview} alt={fileName} />
        ) : (
          <span className="ds-slot__icon">📷</span>
        )}
      </div>

      <div className="ds-slot__body">
        <label className="ds-slot__label">{label}</label>
        <p className="ds-slot__hint">{hint}</p>

        <label className="ds-slot__upload-btn">
          {fileName ? "Change photo" : "Upload photo"}

          <input
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            onChange={handleFile}
            hidden
          />
        </label>

        {scanning && (
          <div className="ds-slot__status">
            Reading document...
          </div>
        )}

        {detected && (
          <div className="ds-slot__detected">
            {resultLabel}: <strong>{detected}</strong>
          </div>
        )}

        {error && (
          <div className="ds-slot__error">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DocumentScan({
  onPanExtracted,
  onPanFileSelected,
  onIdExtracted,
  onIdFileSelected,
}) {
  const scanPan = (text) => {
    const match = text.match(PAN_REGEX);
    if (!match) return null;

    const pan = match[0].toUpperCase();
    onPanExtracted(pan);

    return pan;
  };

  const scanIdAndDob = (text) => {
    const aadhaarMatch = text.match(AADHAAR_REGEX);
    const passportMatch = text.match(PASSPORT_REGEX);
    const dateMatch = text.match(DATE_REGEX);

    let idNumber = null;
    let idProofType = null;

    if (aadhaarMatch) {
      idNumber = aadhaarMatch[0].replace(/\s/g, "");
      idProofType = "aadhaar";
    } else if (passportMatch) {
      idNumber = passportMatch[0].toUpperCase();
      idProofType = "passport";
    }

    const dob = dateMatch
      ? normalizeDob(dateMatch)
      : null;

    if (idNumber || dob) {
      onIdExtracted({
        idNumber,
        idProofType,
        dob,
      });
    }

    return idNumber;
  };

  return (
    <div className="ds-scan-section">
      <div className="ds-scan-section__title">
        Scan your documents
      </div>

      <p className="ds-scan-section__subtitle">
        Upload clear photos and we'll fill in the fields below automatically.
      </p>

      <div className="ds-scan-row">
        <UploadSlot
          label="PAN Card"
          hint="Upload a photo of your PAN card"
          onScan={scanPan}
          onFileSelected={onPanFileSelected}
          resultLabel="PAN detected"
        />

        <UploadSlot
          label="Aadhaar Card or Passport"
          hint="Upload whichever you have"
          onScan={scanIdAndDob}
          onFileSelected={onIdFileSelected}
          resultLabel="ID detected"
        />
      </div>
    </div>
  );
}