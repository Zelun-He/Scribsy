

@echo off
echo Force adding lib files...
git add -f scribsy-frontend/src/lib/utils.ts
git add -f scribsy-frontend/src/lib/metrics.ts
git add -f scribsy-frontend/src/components/ui/alert-dialog.tsx
git add -f scribsy-frontend/src/app/login/page.tsx
echo Checking git status...
git status --porcelain
echo Committing changes...
git commit -m "Force add missing lib files for Vercel build"
echo Pushing to GitHub...
git push origin version1.1
echo Done!
pause
