import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageSelector } from '@/components/ui/LanguageSelector'

export const LandingPage: React.FC = () => {
  const { t } = useTranslation()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Smooth scroll to section
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setMobileMenuOpen(false)
    }
  }

  return (
    <div className="min-h-screen bg-slp-bg-dark text-slp-text-primary font-sans">
      {/* SVG Gradient Definition */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="slp-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#00A0DC' }} />
            <stop offset="100%" style={{ stopColor: '#003366' }} />
          </linearGradient>
        </defs>
      </svg>

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'py-3 bg-slp-bg-dark/98 backdrop-blur-xl'
          : 'py-4 bg-slp-bg-dark/95 backdrop-blur-lg'
      } border-b border-[var(--slp-border)]`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img
                src="/api/tenants/smartlamppost/logo"
                alt="Logo"
                className="h-10 w-10 object-contain brightness-0 invert"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              <span className="text-xl font-bold text-slp-text-primary">
                Asset <span className="text-slp-blue-bright">Management System</span>
              </span>
            </div>

            {/* Desktop Navigation */}
            <ul className="hidden lg:flex items-center gap-8">
              <li>
                <button onClick={() => scrollToSection('features')} className="text-slp-text-secondary hover:text-slp-text-primary font-medium transition-colors">
                  {t('landing.nav.features')}
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection('benefits')} className="text-slp-text-secondary hover:text-slp-text-primary font-medium transition-colors">
                  {t('landing.nav.benefits')}
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection('tech')} className="text-slp-text-secondary hover:text-slp-text-primary font-medium transition-colors">
                  {t('landing.nav.technology')}
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection('contact')} className="text-slp-text-secondary hover:text-slp-text-primary font-medium transition-colors">
                  {t('landing.nav.contact')}
                </button>
              </li>
            </ul>

            {/* CTA Buttons */}
            <div className="hidden lg:flex items-center gap-3">
              <LanguageSelector variant="icon" />
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg border border-[var(--slp-border)] text-slp-text-primary font-medium hover:border-slp-blue-bright hover:bg-slp-blue-bright/10 transition-all"
              >
                {t('landing.nav.login')}
              </Link>
              <button
                onClick={() => scrollToSection('contact')}
                className="px-4 py-2 rounded-lg bg-slp-blue-bright text-slp-navy-deep font-medium hover:bg-slp-blue-light hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slp-blue-bright/30 transition-all"
              >
                {t('landing.nav.demo')}
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden flex flex-col gap-1.5 p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
            >
              <span className={`w-6 h-0.5 bg-slp-text-primary transition-transform ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`w-6 h-0.5 bg-slp-text-primary transition-opacity ${mobileMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`w-6 h-0.5 bg-slp-text-primary transition-transform ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden mt-4 pb-4 border-t border-[var(--slp-border)] pt-4">
              <div className="flex flex-col gap-4">
                <button onClick={() => scrollToSection('features')} className="text-slp-text-secondary hover:text-slp-text-primary font-medium text-left">
                  {t('landing.nav.features')}
                </button>
                <button onClick={() => scrollToSection('benefits')} className="text-slp-text-secondary hover:text-slp-text-primary font-medium text-left">
                  {t('landing.nav.benefits')}
                </button>
                <button onClick={() => scrollToSection('tech')} className="text-slp-text-secondary hover:text-slp-text-primary font-medium text-left">
                  {t('landing.nav.technology')}
                </button>
                <button onClick={() => scrollToSection('contact')} className="text-slp-text-secondary hover:text-slp-text-primary font-medium text-left">
                  {t('landing.nav.contact')}
                </button>
                <div className="flex items-center gap-3 pt-2">
                  <LanguageSelector variant="icon" />
                  <Link to="/login" className="px-4 py-2 rounded-lg border border-[var(--slp-border)] text-slp-text-primary font-medium">
                    {t('landing.nav.login')}
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center pt-24 pb-16 relative overflow-hidden">
        {/* Background gradient effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/5 w-96 h-96 bg-slp-blue-bright/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/5 w-96 h-96 bg-slp-navy/20 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Hero Content */}
            <div className="max-w-xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-slp-blue-bright/10 border border-[var(--slp-border)] rounded-full mb-6">
                <span className="w-2 h-2 bg-slp-blue-bright rounded-full animate-pulse" />
                <span className="text-sm font-medium text-slp-blue-bright">{t('landing.hero.badge')}</span>
              </div>

              <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-6">
                {t('landing.hero.title')} <span className="text-slp-blue-bright">{t('landing.hero.titleHighlight')}</span>
              </h1>

              <p className="text-lg text-slp-text-secondary font-light mb-8">
                {t('landing.hero.description')}
              </p>

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => scrollToSection('contact')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-slp-blue-bright text-slp-navy-deep font-medium hover:bg-slp-blue-light hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slp-blue-bright/30 transition-all"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 2L13 8L20 9L15 14L16 21L10 17L4 21L5 14L0 9L7 8L10 2Z"/>
                  </svg>
                  {t('landing.hero.cta')}
                </button>
                <button
                  onClick={() => scrollToSection('features')}
                  className="px-6 py-3 rounded-lg border border-[var(--slp-border)] text-slp-text-primary font-medium hover:border-slp-blue-bright hover:bg-slp-blue-bright/10 transition-all"
                >
                  {t('landing.hero.ctaSecondary')}
                </button>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative hidden lg:flex justify-center items-center">
              <div className="absolute w-80 h-80 bg-slp-blue-bright/20 rounded-full blur-3xl animate-pulse" />
              <svg viewBox="0 0 500 400" fill="none" className="w-full max-w-md relative z-10">
                <defs>
                  <linearGradient id="hero-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#00A0DC' }} />
                    <stop offset="100%" style={{ stopColor: '#003366' }} />
                  </linearGradient>
                </defs>
                <rect x="20" y="20" width="460" height="360" rx="20" stroke="url(#hero-grad)" strokeWidth="2" fill="rgba(0,34,68,0.5)"/>
                <rect x="40" y="60" width="200" height="120" rx="12" stroke="url(#hero-grad)" strokeWidth="1.5" fill="none"/>
                <rect x="260" y="60" width="200" height="80" rx="12" stroke="url(#hero-grad)" strokeWidth="1.5" fill="none"/>
                <rect x="260" y="160" width="200" height="80" rx="12" stroke="url(#hero-grad)" strokeWidth="1.5" fill="none"/>
                <rect x="40" y="200" width="200" height="160" rx="12" stroke="url(#hero-grad)" strokeWidth="1.5" fill="none"/>
                <rect x="260" y="260" width="200" height="100" rx="12" stroke="url(#hero-grad)" strokeWidth="1.5" fill="none"/>
                {/* Chart bars */}
                <rect x="280" y="300" width="20" height="40" rx="4" fill="url(#hero-grad)" opacity="0.6"/>
                <rect x="310" y="280" width="20" height="60" rx="4" fill="url(#hero-grad)" opacity="0.8"/>
                <rect x="340" y="290" width="20" height="50" rx="4" fill="url(#hero-grad)" opacity="0.7"/>
                <rect x="370" y="270" width="20" height="70" rx="4" fill="url(#hero-grad)"/>
                <rect x="400" y="285" width="20" height="55" rx="4" fill="url(#hero-grad)" opacity="0.75"/>
                {/* Map pins */}
                <circle cx="100" cy="280" r="8" stroke="url(#hero-grad)" strokeWidth="2" fill="none"/>
                <circle cx="100" cy="280" r="3" fill="url(#hero-grad)"/>
                <circle cx="160" cy="310" r="8" stroke="url(#hero-grad)" strokeWidth="2" fill="none"/>
                <circle cx="160" cy="310" r="3" fill="url(#hero-grad)"/>
                <circle cx="130" cy="250" r="8" stroke="url(#hero-grad)" strokeWidth="2" fill="none"/>
                <circle cx="130" cy="250" r="3" fill="url(#hero-grad)"/>
                {/* Stats */}
                <text x="60" y="100" fill="#00A0DC" fontFamily="Roboto, sans-serif" fontSize="28" fontWeight="700">2,847</text>
                <text x="60" y="120" fill="#B0C4DE" fontFamily="Roboto, sans-serif" fontSize="12" fontWeight="400">{t('landing.hero.statsLabel')}</text>
                <circle cx="180" cy="140" r="25" stroke="url(#hero-grad)" strokeWidth="3" fill="none"/>
                <text x="168" y="145" fill="#00A0DC" fontFamily="Roboto, sans-serif" fontSize="14" fontWeight="700">98%</text>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-slp-bg-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block text-sm font-medium text-slp-blue-bright uppercase tracking-wider mb-4">
              {t('landing.features.label')}
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">{t('landing.features.title')}</h2>
            <p className="text-lg text-slp-text-secondary font-light">{t('landing.features.description')}</p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1: Dashboard */}
            <FeatureCard
              icon={<DashboardIcon />}
              title={t('landing.features.dashboard.title')}
              description={t('landing.features.dashboard.description')}
            />
            {/* Feature 2: Assets */}
            <FeatureCard
              icon={<AssetsIcon />}
              title={t('landing.features.assets.title')}
              description={t('landing.features.assets.description')}
            />
            {/* Feature 3: Scanner */}
            <FeatureCard
              icon={<ScannerIcon />}
              title={t('landing.features.scanner.title')}
              description={t('landing.features.scanner.description')}
            />
            {/* Feature 4: Map */}
            <FeatureCard
              icon={<MapIcon />}
              title={t('landing.features.map.title')}
              description={t('landing.features.map.description')}
            />
            {/* Feature 5: Interventions */}
            <FeatureCard
              icon={<InterventionsIcon />}
              title={t('landing.features.interventions.title')}
              description={t('landing.features.interventions.description')}
            />
            {/* Feature 6: Analytics */}
            <FeatureCard
              icon={<AnalyticsIcon />}
              title={t('landing.features.analytics.title')}
              description={t('landing.features.analytics.description')}
            />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-24 bg-slp-navy-deep">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Section Header */}
            <div>
              <span className="inline-block text-sm font-medium text-slp-blue-bright uppercase tracking-wider mb-4">
                {t('landing.benefits.label')}
              </span>
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">{t('landing.benefits.title')}</h2>
              <p className="text-lg text-slp-text-secondary font-light">{t('landing.benefits.description')}</p>
            </div>

            {/* Benefits List */}
            <div className="space-y-4">
              <BenefitItem
                icon={<CheckIcon />}
                title={t('landing.benefits.cost.title')}
                description={t('landing.benefits.cost.description')}
              />
              <BenefitItem
                icon={<MultiTenantIcon />}
                title={t('landing.benefits.multiTenant.title')}
                description={t('landing.benefits.multiTenant.description')}
              />
              <BenefitItem
                icon={<ScalabilityIcon />}
                title={t('landing.benefits.scalability.title')}
                description={t('landing.benefits.scalability.description')}
              />
              <BenefitItem
                icon={<SupportIcon />}
                title={t('landing.benefits.support.title')}
                description={t('landing.benefits.support.description')}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section id="tech" className="py-24 bg-slp-bg-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block text-sm font-medium text-slp-blue-bright uppercase tracking-wider mb-4">
              {t('landing.tech.label')}
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">{t('landing.tech.title')}</h2>
            <p className="text-lg text-slp-text-secondary font-light">{t('landing.tech.description')}</p>
          </div>

          {/* Tech Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <TechItem icon={<ReactIcon />} title="React + TypeScript" subtitle={t('landing.tech.frontend')} />
            <TechItem icon={<PythonIcon />} title="Python Flask" subtitle={t('landing.tech.backend')} />
            <TechItem icon={<DatabaseIcon />} title="SQLite Multi-DB" subtitle={t('landing.tech.database')} />
            <TechItem icon={<CloudIcon />} title="Railway Cloud" subtitle={t('landing.tech.infrastructure')} />
            <TechItem icon={<RFIDIcon />} title="RFID Integration" subtitle={t('landing.tech.hardware')} />
            <TechItem icon={<GPSIcon />} title="GPS Tracking" subtitle={t('landing.tech.geolocation')} />
            <TechItem icon={<AIIcon />} title="Analytics AI" subtitle={t('landing.tech.ml')} />
            <TechItem icon={<APIIcon />} title="REST API" subtitle={t('landing.tech.integration')} />
          </div>
        </div>
      </section>

      {/* Support/Contact Section */}
      <section id="contact" className="py-16 bg-slp-navy-deep border-t border-[var(--slp-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="text-center lg:text-left">
              <h3 className="text-2xl font-bold mb-2">{t('landing.support.title')}</h3>
              <p className="text-slp-text-secondary font-light">{t('landing.support.description')}</p>
            </div>
            <a
              href="mailto:suporte@smartlamppost.com"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-slp-blue-bright text-slp-navy-deep font-medium hover:bg-slp-blue-light hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slp-blue-bright/30 transition-all"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              {t('landing.support.cta')}
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slp-navy-darker py-16 border-t border-[var(--slp-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src="/api/tenants/smartlamppost/logo"
                  alt="Logo"
                  className="h-10 w-10 object-contain brightness-0 invert"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <span className="text-lg font-bold">
                  Asset <span className="text-slp-blue-bright">Management</span>
                </span>
              </div>
              <p className="text-slp-text-secondary text-sm font-light">
                {t('landing.footer.description')}
              </p>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="font-medium mb-4">{t('landing.footer.product')}</h4>
              <ul className="space-y-3">
                <li><button onClick={() => scrollToSection('features')} className="text-slp-text-secondary text-sm hover:text-slp-blue-bright transition-colors">{t('landing.nav.features')}</button></li>
              </ul>
            </div>

            {/* Resources Links */}
            <div>
              <h4 className="font-medium mb-4">{t('landing.footer.resources')}</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-slp-text-secondary text-sm hover:text-slp-blue-bright transition-colors">{t('landing.footer.documentation')}</a></li>
                <li><a href="#" className="text-slp-text-secondary text-sm hover:text-slp-blue-bright transition-colors">{t('landing.footer.tutorials')}</a></li>
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h4 className="font-medium mb-4">{t('landing.footer.legal')}</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-slp-text-secondary text-sm hover:text-slp-blue-bright transition-colors">{t('landing.footer.terms')}</a></li>
                <li><a href="#" className="text-slp-text-secondary text-sm hover:text-slp-blue-bright transition-colors">{t('landing.footer.privacy')}</a></li>
                <li><a href="#" className="text-slp-text-secondary text-sm hover:text-slp-blue-bright transition-colors">{t('landing.footer.gdpr')}</a></li>
                <li><a href="#" className="text-slp-text-secondary text-sm hover:text-slp-blue-bright transition-colors">{t('landing.footer.cookies')}</a></li>
              </ul>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="pt-8 border-t border-[var(--slp-border)] flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slp-text-muted text-sm">
              &copy; {new Date().getFullYear()} Smartlamppost. {t('landing.footer.rights')}
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 flex items-center justify-center border border-[var(--slp-border)] rounded-lg text-slp-text-secondary hover:border-slp-blue-bright hover:text-slp-blue-bright hover:bg-slp-blue-bright/10 transition-all" aria-label="LinkedIn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ============================================
// Feature Card Component
// ============================================
interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => (
  <div className="bg-slp-bg-card border border-[var(--slp-border)] rounded-2xl p-8 transition-all hover:border-slp-blue-bright hover:-translate-y-1 hover:shadow-xl hover:shadow-slp-blue-bright/10">
    <div className="w-16 h-16 mb-6">
      {icon}
    </div>
    <h3 className="text-xl font-medium mb-3">{title}</h3>
    <p className="text-slp-text-secondary font-light">{description}</p>
  </div>
)

// ============================================
// Benefit Item Component
// ============================================
interface BenefitItemProps {
  icon: React.ReactNode
  title: string
  description: string
}

const BenefitItem: React.FC<BenefitItemProps> = ({ icon, title, description }) => (
  <div className="flex gap-4 p-6 bg-slp-navy/30 border border-[var(--slp-border)] rounded-xl transition-all hover:border-slp-blue-bright hover:bg-slp-navy/50">
    <div className="w-12 h-12 flex-shrink-0">
      {icon}
    </div>
    <div>
      <h4 className="font-medium mb-1">{title}</h4>
      <p className="text-sm text-slp-text-secondary font-light">{description}</p>
    </div>
  </div>
)

// ============================================
// Tech Item Component
// ============================================
interface TechItemProps {
  icon: React.ReactNode
  title: string
  subtitle: string
}

const TechItem: React.FC<TechItemProps> = ({ icon, title, subtitle }) => (
  <div className="bg-slp-bg-card border border-[var(--slp-border)] rounded-xl p-6 text-center transition-all hover:border-slp-blue-bright hover:-translate-y-1">
    <div className="w-14 h-14 mx-auto mb-4">
      {icon}
    </div>
    <h4 className="font-medium mb-1">{title}</h4>
    <p className="text-xs text-slp-text-muted font-light">{subtitle}</p>
  </div>
)

// ============================================
// SVG Icons
// ============================================
const DashboardIcon = () => (
  <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
    <rect x="8" y="8" width="48" height="48" rx="8" stroke="url(#slp-gradient)" strokeWidth="2" fill="none"/>
    <rect x="14" y="14" width="18" height="14" rx="4" stroke="url(#slp-gradient)" strokeWidth="2" fill="none"/>
    <rect x="36" y="14" width="14" height="22" rx="4" stroke="url(#slp-gradient)" strokeWidth="2" fill="none"/>
    <rect x="14" y="32" width="18" height="18" rx="4" stroke="url(#slp-gradient)" strokeWidth="2" fill="none"/>
    <rect x="36" y="40" width="14" height="10" rx="4" stroke="url(#slp-gradient)" strokeWidth="2" fill="none"/>
    <circle cx="23" cy="21" r="3" fill="url(#slp-gradient)"/>
  </svg>
)

const AssetsIcon = () => (
  <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
    <rect x="8" y="16" width="48" height="40" rx="6" stroke="url(#slp-gradient)" strokeWidth="2" fill="none"/>
    <line x1="8" y1="28" x2="56" y2="28" stroke="url(#slp-gradient)" strokeWidth="2"/>
    <rect x="14" y="6" width="14" height="14" rx="4" stroke="url(#slp-gradient)" strokeWidth="2" fill="none"/>
    <circle cx="21" cy="13" r="3" fill="url(#slp-gradient)"/>
    <line x1="16" y1="36" x2="48" y2="36" stroke="url(#slp-gradient)" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
    <line x1="16" y1="44" x2="40" y2="44" stroke="url(#slp-gradient)" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
  </svg>
)

const ScannerIcon = () => (
  <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
    <path d="M16 8H8V16" stroke="url(#slp-gradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M48 8H56V16" stroke="url(#slp-gradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 56H8V48" stroke="url(#slp-gradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M48 56H56V48" stroke="url(#slp-gradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="16" y="16" width="32" height="32" rx="4" stroke="url(#slp-gradient)" strokeWidth="2" fill="none"/>
    <rect x="22" y="22" width="8" height="8" fill="url(#slp-gradient)"/>
    <rect x="34" y="22" width="8" height="8" stroke="url(#slp-gradient)" strokeWidth="1.5" fill="none"/>
    <rect x="22" y="34" width="8" height="8" stroke="url(#slp-gradient)" strokeWidth="1.5" fill="none"/>
    <rect x="34" y="34" width="8" height="8" fill="url(#slp-gradient)"/>
  </svg>
)

const MapIcon = () => (
  <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
    <path d="M8 16L22 8L42 16L56 8V48L42 56L22 48L8 56V16Z" stroke="url(#slp-gradient)" strokeWidth="2" fill="none"/>
    <line x1="22" y1="8" x2="22" y2="48" stroke="url(#slp-gradient)" strokeWidth="1.5" strokeDasharray="4 2"/>
    <line x1="42" y1="16" x2="42" y2="56" stroke="url(#slp-gradient)" strokeWidth="1.5" strokeDasharray="4 2"/>
    <circle cx="32" cy="28" r="8" stroke="url(#slp-gradient)" strokeWidth="2" fill="none"/>
    <circle cx="32" cy="28" r="3" fill="url(#slp-gradient)"/>
  </svg>
)

const InterventionsIcon = () => (
  <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
    <circle cx="32" cy="32" r="24" stroke="url(#slp-gradient)" strokeWidth="2" fill="none"/>
    <circle cx="32" cy="32" r="16" stroke="url(#slp-gradient)" strokeWidth="1.5" strokeDasharray="4 4" fill="none"/>
    <path d="M32 16V24" stroke="url(#slp-gradient)" strokeWidth="2" strokeLinecap="round"/>
    <path d="M32 40V48" stroke="url(#slp-gradient)" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 32H24" stroke="url(#slp-gradient)" strokeWidth="2" strokeLinecap="round"/>
    <path d="M40 32H48" stroke="url(#slp-gradient)" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="32" cy="32" r="4" fill="url(#slp-gradient)"/>
  </svg>
)

const AnalyticsIcon = () => (
  <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
    <circle cx="32" cy="32" r="24" stroke="url(#slp-gradient)" strokeWidth="2" fill="none"/>
    <circle cx="32" cy="32" r="16" stroke="url(#slp-gradient)" strokeWidth="1.5" strokeDasharray="6 3" fill="none"/>
    <circle cx="32" cy="32" r="8" stroke="url(#slp-gradient)" strokeWidth="1.5" fill="none"/>
    <circle cx="32" cy="32" r="3" fill="url(#slp-gradient)"/>
    <line x1="32" y1="32" x2="48" y2="16" stroke="url(#slp-gradient)" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="48" cy="16" r="5" stroke="url(#slp-gradient)" strokeWidth="2" fill="none"/>
  </svg>
)

const CheckIcon = () => (
  <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
    <circle cx="24" cy="24" r="20" stroke="url(#slp-gradient)" strokeWidth="2" fill="none"/>
    <path d="M16 24L22 30L34 18" stroke="url(#slp-gradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const MultiTenantIcon = () => (
  <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
    <rect x="8" y="8" width="32" height="32" rx="6" stroke="url(#slp-gradient)" strokeWidth="2" fill="none"/>
    <path d="M18 24H30" stroke="url(#slp-gradient)" strokeWidth="2" strokeLinecap="round"/>
    <path d="M24 18V30" stroke="url(#slp-gradient)" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

const ScalabilityIcon = () => (
  <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
    <path d="M24 4L44 14V34L24 44L4 34V14L24 4Z" stroke="url(#slp-gradient)" strokeWidth="2" fill="none"/>
    <path d="M24 4V44" stroke="url(#slp-gradient)" strokeWidth="1.5" strokeDasharray="4 2"/>
    <path d="M4 14L44 34" stroke="url(#slp-gradient)" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.5"/>
  </svg>
)

const SupportIcon = () => (
  <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
    <circle cx="24" cy="24" r="20" stroke="url(#slp-gradient)" strokeWidth="2" fill="none"/>
    <circle cx="24" cy="24" r="12" stroke="url(#slp-gradient)" strokeWidth="1.5" strokeDasharray="4 2" fill="none"/>
    <circle cx="24" cy="24" r="4" fill="url(#slp-gradient)"/>
    <path d="M24 4V12" stroke="url(#slp-gradient)" strokeWidth="2" strokeLinecap="round"/>
    <path d="M24 36V44" stroke="url(#slp-gradient)" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

const ReactIcon = () => (
  <svg viewBox="0 0 56 56" fill="none" className="w-full h-full">
    <rect x="8" y="8" width="40" height="40" rx="8" stroke="url(#slp-gradient)" strokeWidth="2" fill="none"/>
    <circle cx="28" cy="28" r="12" stroke="url(#slp-gradient)" strokeWidth="2" fill="none"/>
    <circle cx="28" cy="28" r="4" fill="url(#slp-gradient)"/>
    <path d="M28 8V16" stroke="url(#slp-gradient)" strokeWidth="2" strokeLinecap="round"/>
    <path d="M28 40V48" stroke="url(#slp-gradient)" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

const PythonIcon = () => (
  <svg viewBox="0 0 56 56" fill="none" className="w-full h-full">
    <path d="M28 8L48 18V38L28 48L8 38V18L28 8Z" stroke="url(#slp-gradient)" strokeWidth="2" fill="none"/>
    <path d="M28 8V48" stroke="url(#slp-gradient)" strokeWidth="1.5" strokeDasharray="4 2"/>
    <circle cx="28" cy="28" r="6" fill="url(#slp-gradient)" opacity="0.5"/>
  </svg>
)

const DatabaseIcon = () => (
  <svg viewBox="0 0 56 56" fill="none" className="w-full h-full">
    <rect x="8" y="16" width="40" height="32" rx="4" stroke="url(#slp-gradient)" strokeWidth="2" fill="none"/>
    <path d="M8 24H48" stroke="url(#slp-gradient)" strokeWidth="2"/>
    <circle cx="14" cy="20" r="2" fill="url(#slp-gradient)"/>
    <circle cx="20" cy="20" r="2" fill="url(#slp-gradient)" opacity="0.6"/>
    <line x1="16" y1="32" x2="40" y2="32" stroke="url(#slp-gradient)" strokeWidth="2" strokeLinecap="round"/>
    <line x1="16" y1="40" x2="32" y2="40" stroke="url(#slp-gradient)" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
  </svg>
)

const CloudIcon = () => (
  <svg viewBox="0 0 56 56" fill="none" className="w-full h-full">
    <circle cx="28" cy="28" r="20" stroke="url(#slp-gradient)" strokeWidth="2" fill="none"/>
    <ellipse cx="28" cy="28" rx="20" ry="8" stroke="url(#slp-gradient)" strokeWidth="1.5" fill="none"/>
    <ellipse cx="28" cy="28" rx="8" ry="20" stroke="url(#slp-gradient)" strokeWidth="1.5" fill="none"/>
    <circle cx="28" cy="28" r="4" fill="url(#slp-gradient)"/>
  </svg>
)

const RFIDIcon = () => (
  <svg viewBox="0 0 56 56" fill="none" className="w-full h-full">
    <path d="M16 8H8V16" stroke="url(#slp-gradient)" strokeWidth="2" strokeLinecap="round"/>
    <path d="M40 8H48V16" stroke="url(#slp-gradient)" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 48H8V40" stroke="url(#slp-gradient)" strokeWidth="2" strokeLinecap="round"/>
    <path d="M40 48H48V40" stroke="url(#slp-gradient)" strokeWidth="2" strokeLinecap="round"/>
    <rect x="16" y="16" width="24" height="24" rx="4" stroke="url(#slp-gradient)" strokeWidth="2" fill="none"/>
    <rect x="22" y="22" width="12" height="12" fill="url(#slp-gradient)" opacity="0.3"/>
  </svg>
)

const GPSIcon = () => (
  <svg viewBox="0 0 56 56" fill="none" className="w-full h-full">
    <circle cx="28" cy="28" r="20" stroke="url(#slp-gradient)" strokeWidth="2" fill="none"/>
    <circle cx="28" cy="28" r="12" stroke="url(#slp-gradient)" strokeWidth="1.5" strokeDasharray="6 3" fill="none"/>
    <path d="M28 8C28 8 40 18 40 28C40 34.6274 34.6274 40 28 40C21.3726 40 16 34.6274 16 28C16 18 28 8 28 8Z" fill="url(#slp-gradient)" opacity="0.2"/>
    <circle cx="28" cy="28" r="4" fill="url(#slp-gradient)"/>
  </svg>
)

const AIIcon = () => (
  <svg viewBox="0 0 56 56" fill="none" className="w-full h-full">
    <rect x="8" y="8" width="40" height="40" rx="8" stroke="url(#slp-gradient)" strokeWidth="2" fill="none"/>
    <rect x="14" y="28" width="8" height="14" rx="2" stroke="url(#slp-gradient)" strokeWidth="1.5" fill="none"/>
    <rect x="24" y="20" width="8" height="22" rx="2" stroke="url(#slp-gradient)" strokeWidth="1.5" fill="url(#slp-gradient)" opacity="0.3"/>
    <rect x="34" y="14" width="8" height="28" rx="2" stroke="url(#slp-gradient)" strokeWidth="1.5" fill="none"/>
  </svg>
)

const APIIcon = () => (
  <svg viewBox="0 0 56 56" fill="none" className="w-full h-full">
    <path d="M28 8L48 18V38L28 48L8 38V18L28 8Z" stroke="url(#slp-gradient)" strokeWidth="2" fill="none"/>
    <circle cx="28" cy="28" r="8" stroke="url(#slp-gradient)" strokeWidth="2" fill="none"/>
    <circle cx="28" cy="28" r="3" fill="url(#slp-gradient)"/>
    <path d="M28 8L28 20" stroke="url(#slp-gradient)" strokeWidth="1.5"/>
    <path d="M28 36L28 48" stroke="url(#slp-gradient)" strokeWidth="1.5"/>
  </svg>
)

export default LandingPage
