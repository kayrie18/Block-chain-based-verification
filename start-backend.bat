@echo off
cd /d "c:\Users\Kayrie\main p\v1\backend"
if not exist .env (
  echo MONGODB_URI=mongodb://localhost:27017/bbdivs > .env
  echo JWT_SECRET=supersecretchangeinproduction >> .env
  echo PORT=5000 >> .env
  echo INITIAL_ADMIN_EMAIL=admin@test.com >> .env
  echo INITIAL_ADMIN_PASSWORD=admin123 >> .env
  echo. >> .env
)
npm install
npm run dev
pause
