docker-compose up -d --build
docker-compose run e2e npm run deploy
docker-compose run -d bridge npm run watcher:signature-request
docker-compose run -d bridge npm run watcher:collected-signatures
docker-compose run -d bridge npm run watcher:affirmation-request
docker-compose run -d bridge-erc npm run watcher:signature-request
docker-compose run -d bridge-erc npm run watcher:collected-signatures
docker-compose run -d bridge-erc npm run watcher:affirmation-request
docker-compose run -d bridge-erc-native npm run watcher:signature-request
docker-compose run -d bridge-erc-native npm run watcher:collected-signatures
docker-compose run -d bridge-erc-native npm run watcher:affirmation-request
docker-compose run -d bridge-erc-multiple npm run watcher:signature-request
docker-compose run -d bridge-erc-multiple npm run watcher:collected-signatures
docker-compose run -d bridge-erc-multiple npm run watcher:affirmation-request
docker-compose run -d bridge-erc-multiple npm run watcher:bridge-deployed
docker-compose run -d bridge npm run sender:home
docker-compose run -d bridge npm run sender:foreign
docker-compose run e2e npm start
rc=$?
docker-compose down
exit $rc
