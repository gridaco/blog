export function SiteHeader() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <a className="brand" href="https://grida.co/home" aria-label="Grida home">
          <img
            className="brand-symbol"
            src="/blog/brand/grida-symbol.svg"
            width="25"
            height="25"
            alt=""
          />
        </a>
        <a className="header-blog" href="/blog" aria-current="page">
          Blog
        </a>
        <nav className="site-navigation" aria-label="Main navigation">
          <a href="https://grida.co/docs">Docs</a>
          <a className="navigation-github" href="https://github.com/gridaco/grida">
            GitHub
          </a>
          <a className="navigation-product" href="https://grida.co/canvas">
            Open Canvas <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </header>
    </>
  );
}

export default SiteHeader;
