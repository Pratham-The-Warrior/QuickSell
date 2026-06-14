@echo off
echo Building QuickSell POS...

echo Building frontend...
cd client
call npm install
call npm run build
cd ..

echo Creating dist directory...
mkdir dist
mkdir dist\client
mkdir dist\server

echo Copying server files...
xcopy server dist\server /E /H /C /I /Y
echo Copying frontend build...
xcopy client\dist dist\client\dist /E /H /C /I /Y

echo Creating start script...
echo @echo off > dist\start.bat
echo echo Starting QuickSell POS... >> dist\start.bat
echo cd server >> dist\start.bat
echo call npm install >> dist\start.bat
echo start http://localhost:3001 >> dist\start.bat
echo npm start >> dist\start.bat

echo Done! The 'dist' folder is ready to be zipped and shipped to customers.
echo Note: For a true single .exe, use tools like electron-builder, but due to better-sqlite3 native bindings, shipping a self-contained portable Node.js runtime or requiring Node.js is often more stable.
