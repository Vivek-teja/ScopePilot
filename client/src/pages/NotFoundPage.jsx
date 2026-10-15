import { Link } from 'react-router-dom';
import styles from './NotFoundPage.module.css';

export default function NotFoundPage() {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <span className={styles.code}>404</span>
        <h1>Page not found</h1>
        <p>The page you're looking for doesn't exist or may have been moved.</p>
        <div className={styles.actions}>
          <Link to="/workspace" className={styles.homeLink}>← Back to Workspace</Link>
          <button className={styles.backBtn} onClick={() => window.history.back()}>
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}
