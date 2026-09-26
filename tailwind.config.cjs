/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.astro"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        body: ["InterVariable", "Inter", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"],
        heading: ["InterVariable", "Inter", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "'SF Mono'", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      fontSize: {
        // Fluid type scale. Each entry: [font-size clamp(), { line-height, letter-spacing }]
        // Reading size is inherited from :root (1.125rem); these are for headings & meta text.
        display: [
          "clamp(2.1rem, 1.2rem + 3.4vw, 3.2rem)",
          { lineHeight: "1.12", letterSpacing: "-0.022em", fontWeight: "800" },
        ],
        title: [
          "clamp(1.9rem, 1.3rem + 2.2vw, 2.6rem)",
          { lineHeight: "1.15", letterSpacing: "-0.015em", fontWeight: "800" },
        ],
        h2: [
          "clamp(1.45rem, 1.15rem + 1.1vw, 1.75rem)",
          { lineHeight: "1.25", letterSpacing: "-0.012em", fontWeight: "700" },
        ],
        h3: [
          "clamp(1.2rem, 1.05rem + 0.55vw, 1.4rem)",
          { lineHeight: "1.35", letterSpacing: "-0.008em", fontWeight: "700" },
        ],
        lede: ["1.125rem", { lineHeight: "1.8", letterSpacing: "0" }],
        meta: ["0.9rem", { lineHeight: "1.6", letterSpacing: "0" }],
        label: [
          "0.85rem",
          { lineHeight: "1.4", letterSpacing: "0.08em", fontWeight: "600" },
        ],
      },
      colors: {
        transparent: "transparent",
        current: "currentColor",
        primary: {
          main: "rgb(var(--color-primary-main) / <alpha-value>)",
        },
        text: {
          body: "rgb(var(--color-text-body) / <alpha-value>)",
          bold: "rgb(var(--color-text-bold) / <alpha-value>)",
          heading: "rgb(var(--color-text-heading) / <alpha-value>)",
          muted: "rgb(var(--color-text-muted) / <alpha-value>)",
          code: "rgb(var(--color-text-code) / <alpha-value>)",
          link: "rgb(var(--color-text-link) / <alpha-value>)",
          selection: "rgb(var(--color-text-selection) / <alpha-value>)",
        },
        bg: {
          body: "rgb(var(--color-bg-body) / <alpha-value>)",
          code: "rgb(var(--color-bg-code) / <alpha-value>)",
          selection: "rgb(var(--color-bg-selection) / <alpha-value>)",
        },
        border: {
          code: "rgb(var(--color-border-code) / <alpha-value>)",
        },
        accent: {
          sun: "rgb(var(--color-icon-sun) / <alpha-value>)",
          moon: "rgb(var(--color-icon-moon) / <alpha-value>)",
        },
        brand: {
          blogsterFrom: "#f57111",
          blogsterTo: "#f79605",
          netlifyFrom: "#00abda",
          netlifyTo: "#1476ff",
        },
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            a: {
              "text-decoration": "none",
              "background-repeat": "no-repeat",
              "background-size": "100% 1.5px",
              "background-position": "0 100%",
              "background-image":
                "linear-gradient(to right, rgb(var(--color-text-link)/1), rgb(var(--color-text-link)/1))",
              "&:hover": {
                color: "rgb(var(--color-text-link))",
              },
            },
            "h1, h2, h3, h4, h5": {
              color: "rgb(var(--color-text-heading))",
            },
            h1: {
              fontSize: theme("fontSize.title")[0],
              fontWeight: theme("fontSize.title")[1].fontWeight,
              lineHeight: theme("fontSize.title")[1].lineHeight,
              letterSpacing: theme("fontSize.title")[1].letterSpacing,
            },
            h2: {
              fontSize: theme("fontSize.h2")[0],
              fontWeight: theme("fontSize.h2")[1].fontWeight,
              lineHeight: theme("fontSize.h2")[1].lineHeight,
              letterSpacing: theme("fontSize.h2")[1].letterSpacing,
            },
            h3: {
              fontSize: theme("fontSize.h3")[0],
              fontWeight: theme("fontSize.h3")[1].fontWeight,
              lineHeight: theme("fontSize.h3")[1].lineHeight,
              letterSpacing: theme("fontSize.h3")[1].letterSpacing,
            },
            "code::before": {
              content: "none",
            },
            "code::after": {
              content: "none",
            },
            blockquote: {
              border: "none",
              margin: "1.25rem 0",
              "font-size": "1.0625em",
              padding: "0.5rem 1.25rem",
            },
            "blockquote p": {
              margin: "0",
            },
          },
        },
        sleek: {
          css: {
            "--tw-prose-body": "rgb(var(--color-text-body))",
            "--tw-prose-headings": "rgb(var(--color-text-heading))",
            "--tw-prose-lead": "rgb(var(--color-text-body))",
            "--tw-prose-links": "rgb(var(--color-text-body))",
            "--tw-prose-bold": "rgb(var(--color-text-bold))",
            "--tw-prose-counters": "rgb(var(--color-text-body))",
            "--tw-prose-bullets": "rgb(var(--color-text-body))",
            "--tw-prose-hr": "rgb(var(--color-text-muted))",
            "--tw-prose-quotes": "rgb(var(--color-text-body))",
            "--tw-prose-quote-borders": "rgb(var(--color-primary-main))",
            // fix: was --color-primary-heading, which was never defined
            "--tw-prose-captions": "rgb(var(--color-text-heading))",
            "--tw-prose-quote-captions": "rgb(var(--color-text-heading))",
            "--tw-prose-code": "rgb(var(--color-text-code))",
            "--tw-prose-pre-code": "rgb(var(--color-text-code))",
            "--tw-prose-pre-bg": "rgb(var(--color-bg-code-block))",
            "--tw-prose-th-borders": "rgb(var(--color-text-muted))",
            "--tw-prose-td-borders": "rgb(var(--color-text-muted))",
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
