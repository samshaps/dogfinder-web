'use client';

import { useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';

type CopyLinkButtonProps = {
  text: string;
  className?: string;
  iconClassName?: string;
  onCopy?: () => void;
};

export default function CopyLinkButton({ text, className = '', iconClassName = 'w-4 h-4', onCopy }: CopyLinkButtonProps) {
  const [canCopy, setCanCopy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCanCopy(typeof navigator !== 'undefined' && !!navigator.clipboard?.writeText);
  }, []);

  const handleCopy = async () => {
    if (!canCopy) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      onCopy?.();
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!canCopy}
      aria-label={copied ? 'Link copied' : 'Copy link'}
      title={copied ? 'Link copied' : 'Copy link'}
      className={`${className} ${!canCopy ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      {copied ? (
        <Check className={`${iconClassName} flex-shrink-0`} strokeWidth={2} />
      ) : (
        <Copy className={`${iconClassName} flex-shrink-0`} strokeWidth={2} />
      )}
    </button>
  );
}

