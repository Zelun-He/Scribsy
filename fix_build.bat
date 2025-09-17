@echo off
echo Adding files to git...
git add scribsy-frontend/src/lib/utils.ts
git add scribsy-frontend/src/lib/metrics.ts
git add scribsy-frontend/src/components/ui/alert-dialog.tsx
git add scribsy-frontend/src/app/login/page.tsx
echo Committing changes...
git commit -m "Add missing lib files for Vercel build"
echo Pushing to GitHub...
git push origin version1.1
echo Done! Files should now be available for Vercel build.
pause
