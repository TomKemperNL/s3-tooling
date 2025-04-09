### Handig
* ```npm run build -- -- --watch```
* ```node --env-file .env --env-file-if-exists .dev.env .\dist\canvas_client.js```

### Onhandig / Known Bugs

* Vitest wordt heel langzaam als je de data folder -in- de repo zet. Dat zou niet moeten, maar excluden/includen helpt niet? (8-4-2025)
* Kreeg heeeele rare errors (moduleresolution) toen ik dit met Node v20 probeerde, maar met Node v22 was er geen probleem meer... (9-4-2025)