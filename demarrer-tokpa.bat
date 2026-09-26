@echo off

start "Mailpit"  C:\tools\mailpit\mailpit.exe

start "Backend"  cmd /k "cd /d C:\xampp\htdocs\etokpa_back && php artisan serve --port 8000"

start "Reverb"   cmd /k "cd /d C:\xampp\htdocs\etokpa_back && php artisan reverb:start"

start "Worker"   cmd /k "cd /d C:\xampp\htdocs\etokpa_back && php artisan queue:work --queue=emails,webhooks,default"

start "Front"    cmd /k "cd /d C:\xampp\htdocs\etokpa_front && npm run dev"

REM Si tu es en QUEUE_CONNECTION=sync, supprime la ligne "Worker"
REM Reverb doit rester ouvert : c'est le serveur WebSocket (localhost:8080)
