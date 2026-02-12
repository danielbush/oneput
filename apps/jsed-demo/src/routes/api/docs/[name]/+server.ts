import { readFile } from 'fs/promises';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params }) => {
  const { name } = params;

  try {
    const html = await readFile(`src/data/${name}.html`, 'utf-8');
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (err) {
    console.error(err);
    throw error(404, `Document '${name}' not found`);
  }
};
