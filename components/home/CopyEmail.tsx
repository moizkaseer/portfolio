import styles from "./Contact.module.css";

/**
 * Click copies the address, with a "Copied — talk soon" toast (brief §5). Server markup; the
 * click handler arrives with the idle-loaded HomeEnhance (keeps it out of the initial JS).
 */
export function CopyEmail({ email }: { email: string }) {
  return (
    <>
      <button type="button" className={styles.email} data-copy-email={email}>
        {email}
        <span className={styles.copyHint}>Copy</span>
      </button>
      <span role="status" aria-live="polite" className={styles.toast} data-show="false" data-copy-toast>
        <span aria-hidden="true" className={styles.toastSq} />
        <span data-toast-text />
      </span>
    </>
  );
}
