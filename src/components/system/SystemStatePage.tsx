import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SystemImage } from "./SystemImage";

type SystemStatePageProps = {
  image: string;
  eyebrow: string;
  title: string;
  description: string;
  primaryLabel?: string;
  primaryTo?: string;
  secondaryLabel?: string;
  secondaryTo?: string;
  onPrimaryClick?: () => void;
};

export function SystemStatePage({
  image,
  eyebrow,
  title,
  description,
  primaryLabel = "Voltar ao início",
  primaryTo = "/",
  secondaryLabel,
  secondaryTo,
  onPrimaryClick,
}: SystemStatePageProps) {
  const primary = onPrimaryClick ? (
    <Button onClick={onPrimaryClick}>{primaryLabel}</Button>
  ) : (
    <Button asChild>
      <Link to={primaryTo}>{primaryLabel}</Link>
    </Button>
  );

  return (
    <main className="min-h-[100dvh] bg-background px-6 py-10 text-foreground">
      <div className="mx-auto grid min-h-[calc(100dvh-5rem)] w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
        <section className="order-2 space-y-6 text-center lg:order-1 lg:text-left">
          <div className="inline-flex rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
            {eyebrow}
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {title}
            </h1>
            <p className="mx-auto max-w-xl text-sm leading-6 text-muted-foreground lg:mx-0">
              {description}
            </p>
          </div>
          <div className="flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            {primary}
            {secondaryLabel && secondaryTo ? (
              <Button variant="outline" asChild>
                <Link to={secondaryTo}>{secondaryLabel}</Link>
              </Button>
            ) : null}
          </div>
        </section>
        <section className="order-1 lg:order-2">
          <div className="mx-auto max-w-lg rounded-card border border-border bg-card/70 p-4 shadow-card">
            <SystemImage name={image} alt="" className="h-auto w-full rounded-lg" />
          </div>
        </section>
      </div>
    </main>
  );
}
