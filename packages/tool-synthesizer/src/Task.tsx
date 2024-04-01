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
    this.requestStep();
  }

  cancel() {
    this.cancelled = true;
  }

  private requestStep() {
    requestIdleCallback((deadline) => this.step(deadline));
  }

  private step(deadline: IdleDeadline) {
    // We assume the task can only be cancelled outside of this function.
    if (this.cancelled) { return; }

    let curr: IteratorResult<Progress, Complete>;;
    while (true) {
      curr = this.generator.next();
      if (curr.done || deadline.timeRemaining() === 0) {
        break;
      }
    }

    if (curr.done) {
      this.options.onComplete && this.options.onComplete(curr.value);
    } else {
      this.options.onProgress && this.options.onProgress(curr.value);
      this.requestStep();
    }
  }
}

export function runToCompletion<Complete>(generator: Generator<unknown, Complete>, logProgress: boolean = false): Complete {
  while (true) {
    const curr = generator.next();
    if (curr.done) {
      return curr.value;
    } else if (logProgress) {
      console.log(curr.value);
    }
  }
}
