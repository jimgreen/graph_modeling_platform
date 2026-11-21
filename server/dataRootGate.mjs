export function createDataRootGate() {
  let sharedCount = 0;
  let exclusiveActive = false;
  const queue = [];

  const run = (entry) => {
    Promise.resolve()
      .then(entry.task)
      .then(entry.resolve, entry.reject)
      .finally(() => {
        if (entry.mode === "shared") {
          sharedCount -= 1;
        } else {
          exclusiveActive = false;
        }
        pump();
      });
  };

  function pump() {
    if (exclusiveActive || queue.length === 0) return;
    if (sharedCount > 0) {
      while (queue[0]?.mode === "shared") {
        const entry = queue.shift();
        sharedCount += 1;
        run(entry);
      }
      return;
    }
    if (queue[0].mode === "exclusive") {
      const entry = queue.shift();
      exclusiveActive = true;
      run(entry);
      return;
    }
    while (queue[0]?.mode === "shared") {
      const entry = queue.shift();
      sharedCount += 1;
      run(entry);
    }
  }

  const enqueue = (mode, task) => new Promise((resolve, reject) => {
    queue.push({ mode, task, resolve, reject });
    pump();
  });

  return {
    withShared(task) {
      return enqueue("shared", task);
    },
    withExclusive(task) {
      return enqueue("exclusive", task);
    }
  };
}
