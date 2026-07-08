/* eslint-disable @next/next/no-img-element */

const fallbackIcon = "/product-icons/generic.svg";

export function ProductIcon({
  src,
  name,
  className = "h-11 w-11",
  imgClassName = "h-8 w-8"
}: {
  src?: string | null;
  name: string;
  className?: string;
  imgClassName?: string;
}) {
  const normalizedSrc = src || fallbackIcon;

  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-teal-50 text-leaf ring-1 ring-teal-100 dark:bg-teal-950 dark:ring-teal-900 ${className}`}>
      <img
        src={normalizedSrc}
        alt={`Icona ${name}`}
        className={imgClassName}
        loading="lazy"
        onError={(event) => {
          if (event.currentTarget.src.endsWith(fallbackIcon)) return;
          event.currentTarget.src = fallbackIcon;
        }}
      />
    </div>
  );
}
