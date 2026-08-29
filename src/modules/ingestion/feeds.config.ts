import { ArticleRegion } from '../articles/enums/article-region.enum';

export type FeedDefinition = {
  name: string;
  url: string;
  sourceName: string;
  sourceSlug: string;
  websiteUrl: string;
  categoryName: string;
  categorySlug: string;
  region: ArticleRegion;
};

export const DEFAULT_NEWS_FEEDS: readonly FeedDefinition[] = [
  {
    name: 'VnExpress - Thời sự',
    url: 'https://vnexpress.net/rss/thoi-su.rss',
    sourceName: 'VnExpress',
    sourceSlug: 'vnexpress',
    websiteUrl: 'https://vnexpress.net',
    categoryName: 'Thời sự',
    categorySlug: 'thoi-su',
    region: ArticleRegion.VIETNAM,
  },
  {
    name: 'VnExpress - Thế giới',
    url: 'https://vnexpress.net/rss/the-gioi.rss',
    sourceName: 'VnExpress',
    sourceSlug: 'vnexpress',
    websiteUrl: 'https://vnexpress.net',
    categoryName: 'Thời sự',
    categorySlug: 'thoi-su',
    region: ArticleRegion.WORLD,
  },
  {
    name: 'VnExpress - Kinh doanh',
    url: 'https://vnexpress.net/rss/kinh-doanh.rss',
    sourceName: 'VnExpress',
    sourceSlug: 'vnexpress',
    websiteUrl: 'https://vnexpress.net',
    categoryName: 'Kinh tế',
    categorySlug: 'kinh-te',
    region: ArticleRegion.VIETNAM,
  },
  {
    name: 'VnExpress - Khoa học công nghệ',
    url: 'https://vnexpress.net/rss/khoa-hoc-cong-nghe.rss',
    sourceName: 'VnExpress',
    sourceSlug: 'vnexpress',
    websiteUrl: 'https://vnexpress.net',
    categoryName: 'Công nghệ',
    categorySlug: 'cong-nghe',
    region: ArticleRegion.WORLD,
  },
  {
    name: 'VnExpress - Thể thao',
    url: 'https://vnexpress.net/rss/the-thao.rss',
    sourceName: 'VnExpress',
    sourceSlug: 'vnexpress',
    websiteUrl: 'https://vnexpress.net',
    categoryName: 'Thể thao',
    categorySlug: 'the-thao',
    region: ArticleRegion.WORLD,
  },
  {
    name: 'Thanh Niên - Đời sống',
    url: 'https://thanhnien.vn/rss/doi-song.rss',
    sourceName: 'Báo Thanh Niên',
    sourceSlug: 'bao-thanh-nien',
    websiteUrl: 'https://thanhnien.vn',
    categoryName: 'Đời sống',
    categorySlug: 'doi-song',
    region: ArticleRegion.VIETNAM,
  },
  {
    name: 'Thanh Niên - Giải trí',
    url: 'https://thanhnien.vn/rss/giai-tri.rss',
    sourceName: 'Báo Thanh Niên',
    sourceSlug: 'bao-thanh-nien',
    websiteUrl: 'https://thanhnien.vn',
    categoryName: 'Giải trí',
    categorySlug: 'giai-tri',
    region: ArticleRegion.VIETNAM,
  },
];
