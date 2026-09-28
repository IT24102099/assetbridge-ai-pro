import React, { useState } from 'react';

export const DEFAULT_PROPERTY_FALLBACK =
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80';

export const DEFAULT_EVIDENCE_FALLBACK =
  'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className,
  fallbackSrc = DEFAULT_PROPERTY_FALLBACK,
  onError,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);

  // Check if src is a valid absolute URI (http/https/blob/data)
  const isValidUrl =
    typeof src === 'string' &&
    src.trim().length > 0 &&
    (src.startsWith('http://') ||
      src.startsWith('https://') ||
      src.startsWith('blob:') ||
      src.startsWith('data:'));

  const effectiveSrc = !hasError && isValidUrl ? src : fallbackSrc;

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!hasError) {
      setHasError(true);
    }
    if (onError) {
      onError(e);
    }
  };

  return (
    <img
      src={effectiveSrc}
      alt={alt || 'Image'}
      className={className}
      onError={handleError}
      {...props}
    />
  );
};

export default SafeImage;
