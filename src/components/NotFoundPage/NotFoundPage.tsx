import { Button } from '../Button/Button';
import { PageLayout } from '../PageLayout/PageLayout';

/** `backTo` is the level above the missing page, e.g. /people for an unknown person. */
export function NotFoundPage({ backTo = '/' }: { backTo?: string }) {
  return (
    <PageLayout title="Not found" backTo={backTo}>
      <p>This page doesn't exist.</p>
      <Button to="/" variant="secondary">
        Go home
      </Button>
    </PageLayout>
  );
}
