import { err, ok, type Result } from 'neverthrow';

export type Profile = Readonly<{ name: string; role: string }>;
export type ProfileLoadError = { type: 'load-failed' };
export type ProfileSaveError = { type: 'save-failed' };

type StoreOptions = {
  profile: Profile;
  delayMs?: number;
  failNextLoad?: boolean;
  failNextSave?: boolean;
};

/** Keep the demo profile in memory and simulate the delay of a load or save. */
export class ProfileStore {
  static create() {
    return ProfileStore.createNull({
      profile: { name: 'Grace Hopper', role: 'Computer scientist' },
      delayMs: 250
    });
  }

  static createNull({
    profile,
    delayMs = 0,
    failNextLoad = false,
    failNextSave = false
  }: StoreOptions) {
    return new ProfileStore({ ...profile }, delayMs, failNextLoad, failNextSave);
  }

  private constructor(
    private profile: Profile,
    private readonly delayMs: number,
    private failNextLoad: boolean,
    private failNextSave: boolean
  ) {}

  async load(): Promise<Result<Profile, ProfileLoadError>> {
    await this.delay();
    if (this.failNextLoad) {
      this.failNextLoad = false;
      return err({ type: 'load-failed' });
    }
    return ok({ ...this.profile });
  }

  async save(profile: Profile): Promise<Result<Profile, ProfileSaveError>> {
    await this.delay();
    if (this.failNextSave) {
      this.failNextSave = false;
      return err({ type: 'save-failed' });
    }
    this.profile = { ...profile };
    return ok({ ...this.profile });
  }

  private delay() {
    if (this.delayMs === 0) return;
    return new Promise<void>((resolve) => setTimeout(resolve, this.delayMs));
  }
}
