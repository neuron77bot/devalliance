import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/UI/Button';

export const NotFoundPage = () => {
  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <h1 className="text-9xl font-bold text-primary-600 mb-4">404</h1>
        <h2 className="text-3xl font-bold text-gray-100 mb-4">Página no encontrada</h2>
        <p className="text-gray-400 mb-8">
          La página que buscas no existe o ha sido movida.
        </p>
        <Link to="/">
          <Button variant="primary" size="lg">
            Volver al Dashboard
          </Button>
        </Link>
      </motion.div>
    </div>
  );
};
