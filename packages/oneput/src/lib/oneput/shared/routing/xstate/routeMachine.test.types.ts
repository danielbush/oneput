import type { AppObject } from '../../../types.js';
import { fromChild, type MachineSnapshot } from './routeMachine.js';

type ChildSnapshot = MachineSnapshot & { context: { query: string } };
type ChildActor = {
  getSnapshot(): ChildSnapshot;
  subscribe(onChange: () => void): { unsubscribe(): void };
  send(event: { type: 'RESET' }): void;
};

declare const screen: AppObject;

// MakeApp form: annotating only `child` infers `snapshot` as ChildSnapshot.
fromChild('search', (snapshot, child: ChildActor) => {
  const _query: string = snapshot.context.query;
  void _query;
  // @ts-expect-error ChildSnapshot context has no `missing` field.
  void snapshot.context.missing;
  child.send({ type: 'RESET' });
  return screen;
});

// AppMap form: explicit actor type infers both `snapshot` and `child`.
fromChild<ChildActor>('flow', {
  idle: (snapshot, child) => {
    const _query: string = snapshot.context.query;
    void _query;
    // @ts-expect-error ChildSnapshot context has no `missing` field.
    void snapshot.context.missing;
    child.send({ type: 'RESET' });
    return screen;
  }
});
