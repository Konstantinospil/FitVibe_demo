export const formatDate = (iso: string, locale: string = "en-DE"): string => {
  const date = new Date(iso);
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};
