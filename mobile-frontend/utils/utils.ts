type Style = { [key: string]: any } | undefined | null | false;
export function cn(...styles: (Style | Style[])[]): Style {
  return styles.reduce<Style>((acc, style) => {
    if (Array.isArray(style)) {
      return { ...acc, ...cn(...style) };
    } else if (style) {
      return { ...acc, ...style };
    }
    return acc;
  }, {});
}

export function formatDate(input: string | number): string {
  const date = new Date(input);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
