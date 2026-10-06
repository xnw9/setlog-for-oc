import { Button, Card } from '../../../components';
import { useLogCount } from '../api';
import styles from './LandingPage.module.css';

export function LandingPage() {
  const logCount = useLogCount();

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <h1 className={styles.title}>Setlog for OC</h1>
        <p className={styles.tagline}>A photo log of your group's day.</p>
      </header>

      <Card className={styles.nav}>
        {/* Logs once there are any; until then, straight to creating the first one. */}
        {logCount !== undefined &&
          (logCount > 0 ? (
            <Button to="/logs" block>
              Logs
            </Button>
          ) : (
            <Button to="/logs/new" block>
              + New log
            </Button>
          ))}
        <Button to="/people" variant="secondary" block>
          People
        </Button>
      </Card>

      <p className={styles.privacy}>Your photos never leave this device.</p>
    </div>
  );
}
