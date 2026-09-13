type SystemImageProps = {
  name: string;
  alt: string;
  className?: string;
};

export function SystemImage({ name, alt, className }: SystemImageProps) {
  return (
    <picture>
      <source srcSet={`/system-images/${name}.webp 1x, /system-images/${name}@2x.webp 2x`} type="image/webp" />
      <img
        src={`/system-images/${name}.png`}
        srcSet={`/system-images/${name}.png 1x, /system-images/${name}@2x.png 2x`}
        alt={alt}
        className={className}
        loading="eager"
        decoding="async"
      />
    </picture>
  );
}
