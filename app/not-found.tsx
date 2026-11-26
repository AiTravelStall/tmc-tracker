import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <p className="font-display text-6xl text-tmc-cyan-deep">404</p>
        <h1 className="mt-2 font-display text-h2 text-tmc-navy">Page not found</h1>
        <p className="mt-2 text-sm text-tmc-slate">The page you are looking for does not exist or you do not have access to it.</p>
        <ButtonLink href="/" className="mt-5">Go to my home page</ButtonLink>
      </div>
    </div>
  );
}
