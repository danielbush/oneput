import { page } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
  it('should render load-doc container', async () => {
    render(Page);

    const container = document.getElementById('load-doc');
    expect(container).not.toBeNull();
  });
});
