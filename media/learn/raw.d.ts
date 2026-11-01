// Vite-style raw imports used by apps/web/src/learn/course.ts (lib/course.ts maps them for Bun).
declare module "*?raw" {
  const text: string;
  export default text;
}
