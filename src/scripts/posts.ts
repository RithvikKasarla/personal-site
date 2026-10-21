import { getCollection } from 'astro:content';

/** Posts newest first. Drafts are included only in dev, so they can be previewed but never ship. */
export async function getPosts() {
  const posts = await getCollection('writing', (p) => import.meta.env.DEV || !p.data.draft);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export const formatDate = (d: Date) =>
  d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
