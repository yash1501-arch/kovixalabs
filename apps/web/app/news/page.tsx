import { NewsClient } from "./news-client";

export default function NewsPage() {
  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Research</p>
          <h1>News Scraper</h1>
          <p className="lede">Monitor news sources relevant to your brand. AI-powered relevance scoring and sentiment analysis.</p>
        </div>
      </div>
      <NewsClient />
    </>
  );
}
