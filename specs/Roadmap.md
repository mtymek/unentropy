# Unentropy Roadmap

## 0.1 - MVP
* [x] MVP 3-step process
* [x] Using GitHub action artifact for storing the metrics database
* [x] JSX templating
* [x] Support for S3-compatible storage (should it be a default?)
  * [x] Storage configurable in the Unentropy config
  * [x] A single, convenient GH action that does it all - downloads db from S3, runs analysis, uploads results back 
* [x] Simple GitHub comment
* [x] Branch comparison: "this PR changes metrics by X% against the main branch"
 [x] Support the notion of "collectors" - plugins/scripts that can parse the output of common tools (e.g. clover coverage report)
* [x] Initial metrics gallery - built-in metrics like LOC, coverage, etc.
* [x] First-class support for standard metrics (e.g. "size in bytes", "coverage in %"). 
  * [ ] Each metric may have a default chart type.
  * [ ] MetricCard may look differently based on the metric type.
* [ ] Quality gates
* [ ] Thresholds
* [ ] Separate GH action for quality gate

## 0.2
* [ ] Properly packaged Github actions
* [ ] "Main branch"
* [ ] Scaffolding: `npx unentropy init`, an interactive CLI that creates a basic Unentropy configuration based on the current projects.
* [ ] Public config schema 

## 0.3
* [ ] Collectors and metrics gallery
* [ ] Custom collectors and metrics / simple plugins
* [ ] Heuristic alerts ("Your bundle suddenly increased in size by X%")

## TBD
* Support for more robust, cloud databases (Postgres, MySQL, ...)
* Templated PR comments
* Garbage collection from metrics database
* What to do when the number of metrics grows too large?

## Technical improvements
* [x] Cleanup queries.js - clear contract
* [ ] Use DB transactions when collecting metrics
* [ ] Make sure to keep the database connection open for as short a time as possible
* [ ] Proper tests for Storage class
* [ ] Allow replacing existing build context

## Long term ideas
* Browsing the coverage report
* Customizable templates
* A website
