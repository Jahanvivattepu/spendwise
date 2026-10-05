```js
// Same tests run locally and in Jenkins: pass -Dbase.url=http://localhost:<port> to override.
function fn() {
  return {
    baseUrl: karate.properties['base.url'] || 'http://localhost:8081'
  };
}
