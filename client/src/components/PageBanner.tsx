import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface PageBannerProps {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  actions?: Array<{
    label: string;
    href?: string;
    onClick?: () => void;
  }>;
}

export function PageBanner({
  title,
  subtitle,
  imageUrl,
  actions
}: PageBannerProps) {
  return (
    <div className="relative py-12 md:py-16 lg:py-20 px-6 sm:px-8 lg:px-12 rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-primary via-primary to-secondary">
      {/* 부드러운 광택 효과 */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-secondary/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-primary/40 rounded-full blur-3xl pointer-events-none" />

      {imageUrl && (
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-cover mix-blend-overlay"
          />
        </div>
      )}

      {/* 콘텐츠 */}
      <div className="relative max-w-5xl mx-auto text-center z-10">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight tracking-tight text-primary-foreground drop-shadow">
          {title}
        </h1>
        {subtitle && (
          <p className="text-base md:text-lg lg:text-xl mb-8 leading-relaxed max-w-3xl mx-auto text-primary-foreground/90">
            {subtitle}
          </p>
        )}

        {actions && actions.length > 0 && (
          <div className="flex flex-wrap gap-3 md:gap-4 justify-center">
            {actions.map((action, index) => {
              const isPrimary = index === 0;
              const buttonContent = (
                <Button
                  variant={isPrimary ? "secondary" : "outline"}
                  size="lg"
                  onClick={action.onClick}
                  className={
                    isPrimary
                      ? "font-semibold text-base px-6 py-3 min-h-[48px] shadow-md"
                      : "font-semibold text-base px-6 py-3 min-h-[48px] bg-white/10 text-primary-foreground border-white/40 hover:bg-white/20 hover:text-primary-foreground"
                  }
                >
                  {action.label}
                </Button>
              );

              if (action.href && action.href !== '#') {
                return (
                  <Link key={index} href={action.href}>
                    {buttonContent}
                  </Link>
                );
              }
              return <div key={index}>{buttonContent}</div>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
