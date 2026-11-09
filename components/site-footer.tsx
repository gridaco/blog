export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-intro">
        <a className="brand" href="https://grida.co">
          <img
            className="brand-symbol"
            src="/blog/brand/grida-symbol.svg"
            width="22"
            height="22"
            alt=""
          />
          <span>Grida</span>
        </a>
        <p>An open canvas for your ideas.</p>
      </div>
      <nav className="footer-navigation" aria-label="Footer navigation">
        <a href="https://grida.co">Grida</a>
        <a href="https://grida.co/docs">Documentation</a>
        <a href="https://github.com/gridaco/blog">Contribute</a>
        <a href="/blog/rss.xml">RSS</a>
      </nav>
      <p className="footer-copyright">© {new Date().getFullYear()} Grida Inc.</p>
    </footer>
  );
}

export default SiteFooter;
