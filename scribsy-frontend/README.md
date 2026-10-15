This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Note drafts and generation

Editable existing notes autosave after one second without typing. Saves are
serialized, and a completed request never replaces newer editor text. Failed
saves retain the current text and expose Retry. Finalized and demo records stay
read-only.

New and existing drafts keep account/note-scoped recovery copies in this tab's
sessionStorage for up to 24 hours. Refresh offers Restore or Discard; audio files
are not stored and must be reattached. Sign-out warns about unsaved changes and
clears recovery copies. Page close and application links warn about unsaved work.
Recovery is a convenience, not a substitute for a confirmed server save.

The shared GenerateButton uses actual request state for loading and disabled
behavior. Its animation is scoped to the button, supports reduced motion, and
does not change the page theme. Light remains the default; dark mode is optional.

Run `npm run test:api` for client/recovery tests. With a production frontend
running and Playwright installed, run `node tests/browser/workflow-smoke.cjs` for
the autosave/recovery/loading browser checks. Set PLAYWRIGHT_MODULE and
CHROMIUM_PATH if the development environment supplies those outside this project.
Browser tests isolate account and AI calls with fictional fixtures.

## Getting Started

Authentication is handled by the backend user database. Create an account from `/register` or seed users in the API database before signing in.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
