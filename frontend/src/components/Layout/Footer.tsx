export const Footer = () => {
  return (
    <footer className="bg-navy-900 border-t border-navy-800 mt-12">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-400">
            © 2026 DevAlliance Mission Control. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/neuron77bot/devalliance"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-400 hover:text-primary-400 transition-colors"
            >
              GitHub
            </a>
            <a
              href="/docs"
              className="text-sm text-gray-400 hover:text-primary-400 transition-colors"
            >
              Documentación
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
