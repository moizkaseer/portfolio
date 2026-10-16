"use client";

import { useState } from "react";
import styles from "./Contact.module.css";

/** Click copies the address, with a "Copied — talk soon" toast (brief §5). */
export function CopyEmail({ email }: { email: string }) {
  const [toast, setToast] = useState("");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setToast("Copied — talk soon");
    } catch {
      window.location.href = `mailto:${email}`;
      return;
    }
    window.setTimeout(() => setToast(""), 2400);
  };
  return (
    <>
      <button type="button" className={styles.email} onClick={copy}>
        {email}
        <span className={styles.copyHint}>Copy</span>
      </button>
      <span role="status" aria-live="polite" className={styles.toast} data-show={toast !== ""}>
        {toast && (
          <>
            <span aria-hidden="true" className={styles.toastSq} />
            {toast}
          </>
        )}
      </span>
    </>
  );
}
