docker-compose up -d
docker-compose run e2e npm run deploy
docker-compose run -d bridge npm run watcher:deposit
docker-compose run -d bridge npm run watcher:collected-signatures
docker-compose run -d bridge npm run watcher:withdraw
docker-compose run -d bridge npm run sender:home
docker-compose run -d bridge npm run sender:foreign
docker-compose run e2e npm start
rc=$?
docker-compose down
exit $rc
