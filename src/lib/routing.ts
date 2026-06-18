const KNOWN_ROOTS = new Set(["admin", "ingreso"]);

export function routePath(): string {
  const path = window.location.pathname;
  const segments = path.split("/").filter(Boolean);

  if (segments.length === 0) return "/";
  if (KNOWN_ROOTS.has(segments[0])) return `/${segments.join("/")}`;
  if (segments.length === 1) return "/";
  return `/${segments.slice(1).join("/")}`;
}

export function basePath(): string {
  const segments = window.location.pathname.split("/").filter(Boolean);
  if (segments.length === 0 || KNOWN_ROOTS.has(segments[0])) return "";
  return `/${segments[0]}`;
}

export function appPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${basePath()}${normalized}`;
}
