import { Button } from '../Button/Button';
import { PageLayout } from '../PageLayout/PageLayout';

export function NotFoundPage() {
  return (
    <PageLayout title="Not found" backTo="/">
      <p>This page doesn't exist.</p>
      <Button to="/" variant="secondary">
        Go home
      </Button>
    </PageLayout>
  );
}
