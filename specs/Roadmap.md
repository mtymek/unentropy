# Unentropy Roadmap

## 0.1
* [x] MVP
* [x] Using GitHub action artifact for storing the metrics database
* [x] JSX templating
* [ ] Support for S3-compatible storage (should it be a default?)
  * [ ] Storage configurable in the Unentropy config
  * [ ] A single, convenient GH action that does it all - downloads db from S3, runs analysis, uploads results back 
* [ ] Thresholds 

## 0.2
* [ ] Support the notion of "collectors" - plugins/scripts that can parse the output of common tools (e.g. clover coverage report)
* [ ] First-class support for standard metrics (e.g. "size in bytes", "coverage in %"). 
  * [ ] Each metric may have a default chart type.
  * [ ] MetricCard may look differently based on the metric type.

## 0.3
* [ ] Quality gates / GH comments
* [ ] "Main branch"
* [ ] Branch comparison (e.g. this PR changes metrics by X%)

## 0.4
* [ ] Scaffolding: `npx unentropy init`, an interactive CLI that creates a basic Unentropy configuration based on the current projects.
* [ ] Public config schema 

## 0.5
* [ ] Collectors and metrics gallery
* [ ] Custom collectors and metrics / simple plugins
* [ ] Heuristic alerts ("Your bundle suddenly increased in size by X%")

## TBD
* Support for more robust, cloud databases (Postgres, MySQL, ...)
* Garbage collection from metrics database

## Long term ideas
* Browsing the coverage report
* Customizable templates
