export type MixedLiveEditState<FieldId extends string = string> =
  | { type: 'filtering' }
  | { type: 'editing'; fieldId: FieldId };

export type MixedLiveEditEvent<FieldId extends string = string> =
  | { type: 'activate-field'; fieldId: FieldId }
  | { type: 'focus-field'; fieldId: FieldId | undefined }
  | { type: 'back' };

export type MixedLiveEditIntent<FieldId extends string = string> =
  | { type: 'none' }
  | { type: 'start-editing'; fieldId: FieldId }
  | { type: 'stop-editing' }
  | { type: 'exit' };

/** Decide the input-ownership transition without applying controller effects. */
export function decideMixedLiveEdit<FieldId extends string>(
  state: MixedLiveEditState<FieldId>,
  event: MixedLiveEditEvent<FieldId>
): MixedLiveEditIntent<FieldId> {
  if (state.type === 'filtering') {
    if (event.type === 'activate-field') {
      return { type: 'start-editing', fieldId: event.fieldId };
    }
    if (event.type === 'back') {
      return { type: 'exit' };
    }
    return { type: 'none' };
  }

  if (event.type === 'activate-field') {
    return event.fieldId === state.fieldId
      ? { type: 'stop-editing' }
      : { type: 'start-editing', fieldId: event.fieldId };
  }
  if (event.type === 'focus-field') {
    return event.fieldId === state.fieldId ? { type: 'none' } : { type: 'stop-editing' };
  }
  return { type: 'stop-editing' };
}
