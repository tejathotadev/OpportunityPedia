import type { ReactNode } from 'react';
import { SignalIndex } from '@/marketing/components/brand/SignalIndex';
import { cn } from '@/shared/cn';

type ProductCardProps = {
  status: string;
  wordmark: ReactNode;
  description: string;
  action?: ReactNode;
  /** `product` uses the OpportunityX navy stage; `placeholder` stays on paper. */
  tone?: 'product' | 'placeholder';
  className?: string;
};

/** Ready for additional products; only one real entry exists today. */
export function ProductCard({
  status,
  wordmark,
  description,
  action,
  tone = 'product',
  className,
}: ProductCardProps) {
  const isProduct = tone === 'product';

  return (
    <div
      className={cn(
        'flex flex-col justify-between p-6 md:p-8',
        isProduct ? 'bg-navy-deep' : 'field-dots border border-mist bg-paper',
        className,
      )}
    >
      <div>
        <p className={cn('label-meta', isProduct ? 'text-teal' : 'text-graphite/60')}>{status}</p>
        <div className="mt-5">{wordmark}</div>
        <p
          className={cn(
            'mt-4 max-w-[34rem] text-[1.0625rem] leading-relaxed',
            isProduct ? 'text-white/65' : 'text-ink/45',
          )}
        >
          {description}
        </p>
      </div>

      <div className="mt-8">
        {action ?? (
          <SignalIndex
            tone={isProduct ? 'inverse' : 'default'}
            entries={[{ key: 'Status', value: 'Research' }]}
          />
        )}
      </div>
    </div>
  );
}
