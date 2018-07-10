docker-compose up -d --build
docker-compose run e2e npm run deploy
docker-compose run -d bridge npm run watcher:signature-request
docker-compose run -d bridge npm run watcher:collected-signatures
docker-compose run -d bridge npm run watcher:affirmation-request
docker-compose run -d bridge npm run watcher:erc:signature-request
docker-compose run -d bridge npm run watcher:erc:collected-signatures
docker-compose run -d bridge npm run watcher:erc:affirmation-request
docker-compose run -d bridge npm run sender:home
docker-compose run -d bridge npm run sender:foreign
docker-compose run e2e npm start
rc=$?
docker-compose down
exit $rc
