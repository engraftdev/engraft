interface TaskOptions<Progress, Complete> {
  onProgress?(progress: Progress): void;
  onComplete?(complete: Complete): void
}

export class Task<Progress, Complete> {
  started = false;
  cancelled = false;

  constructor(readonly generator: Generator<Progress, Complete>, readonly options: TaskOptions<Progress, Complete> = {}) {

  }

  start() {
    this.step();
  }

  cancel() {
    this.cancelled = true;
  }


  private step() {
    if (this.cancelled) { return; }
    let curr = this.generator.next();
    if (this.cancelled) { return; }

    if (curr.done) {
      this.options.onComplete && this.options.onComplete(curr.value);
    } else {
      this.options.onProgress && this.options.onProgress(curr.value);
      requestIdleCallback(() => this.step());
    }
  }
}
