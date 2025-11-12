# Unentropy Roadmap

## 0.1
* [x] MVP
* [x] Using GitHub action artifact for storing the metrics database
* [ ] A single, convenient GH action that does it all - downloads db from GH artifact, runs analysis, uploads results to GH artifact
* [x] JSX templating
* [ ] Support for S3-compatible storage 
  * [ ] Storage configurable in the Unentropy config
* [ ] Thresholds 

## 0.2
* [ ] Support the notion of "collectors" - plugins/scripts that can parse the output of common tools (e.g. clover coverage report)
* [ ] First-class support for standard metrics (e.g. "size in bytes", "coverage in %"). 
  * [ ] Each metric may have a default chart type.
  * [ ] MetricCard may look differently based on the metric type.

## 0.3
* [ ] Quality gates / GH comments
* [ ] Scaffolding: `npx unentropy init`, an interactive CLI that creates a basic Unentropy configuration based on the current projects.

## 0.4
* [ ] Public config schema 

## Next
* Support for more robust, cloud databases (Postgres, MySQL, ...)

## Long term ideas
* Browsing the coverage report
