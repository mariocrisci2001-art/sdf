@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@700&family=JetBrains+Mono:wght@400&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-serif: "Playfair Display", serif;
  --font-mono: "JetBrains Mono", monospace;
  
  --color-indigo-600: #4f46e5;
  --color-indigo-700: #4338ca;
  --color-zinc-800: #27272a;
  --color-zinc-900: #18181b;
}

@layer base {
  body {
    @apply antialiased text-zinc-800;
  }
}
