import { HttpRunner } from '@stockade/http';

const runner = new HttpRunner(null, {});
runner.run().then(() => {
  console.log('success');
}).catch((err) => {
  console.log('failure', err);
});
