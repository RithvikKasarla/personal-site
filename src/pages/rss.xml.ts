import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPosts } from '../scripts/posts';

export async function GET(context: APIContext) {
  const posts = await getPosts();
  return rss({
    title: 'Rithvik Kasarla · Writing',
    description: 'Notes from building AI agents that do real work.',
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/writing/${post.id}/`,
    })),
  });
}
