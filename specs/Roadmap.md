# Unentropy Roadmap

## 0.1
* [x] MVP
* [x] Using GitHub action artifact for storing the metrics database
* [ ] A single, convenient GH action that does it all - downloads db from GH artifact, runs analysis, uploads results to GH artifact
* [ ] Support for S3-compatible storage 
  * [ ] Storage configurable in the Unentropy config
* [ ] Thresholds 

## Next
* Support for more robust, cloud databases (Postgres, MySQL, ...)
* Scaffolding: `npx unentropy init`, an interactive CLI that creates a basic Unentropy configuration based on the current project.

## Long term ideas
* Browsing the coverage report
