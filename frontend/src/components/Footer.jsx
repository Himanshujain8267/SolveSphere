const footerLinks = ['Home', 'Features', 'Platforms', 'Company Sheets', 'Preparation'];

const Footer = ({ onOpenPreparation }) => {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-branding">
          <h3>SolveSphere</h3>
          <p>Your coding journey, organized.</p>
        </div>

        <div className="footer-links">
          {footerLinks.map((link) => {
            const opensPreparation = link === 'Preparation' || link === 'Company Sheets';
            return (
              <a
                key={link}
                href={opensPreparation ? '/preparation' : `#${link.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={opensPreparation ? (event) => {
                  event.preventDefault();
                  onOpenPreparation();
                } : undefined}
              >
                {link}
              </a>
            );
          })}
        </div>

        <div className="footer-meta">
          <a href="#">GitHub</a>
          <a href="#">Contact</a>
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
