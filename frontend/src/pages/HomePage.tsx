import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Users, ListTodo, ArrowRight } from 'lucide-react';

export const HomePage = () => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-4xl mx-auto px-4"
      >
        {/* Hero Section */}
        <div className="mb-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-block mb-8"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/50">
              <span className="text-5xl">🚀</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-6xl md:text-7xl font-bold text-white mb-6"
          >
            DevAlliance
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-2xl md:text-3xl text-cyan-400 mb-4 font-semibold"
          >
            Mission Control
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-lg text-gray-400 max-w-2xl mx-auto"
          >
            Orchestrate AI agents, manage tasks, and monitor your development team in real-time
          </motion.p>
        </div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Link
            to="/agents"
            className="group bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-4 rounded-lg transition-all flex items-center gap-3 text-lg font-semibold shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105"
          >
            <Users size={24} />
            View Agents
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            to="/tasks"
            className="group bg-navy-800 hover:bg-navy-700 text-white border-2 border-cyan-500/30 hover:border-cyan-500/60 px-8 py-4 rounded-lg transition-all flex items-center gap-3 text-lg font-semibold hover:scale-105"
          >
            <ListTodo size={24} />
            Task Board
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        {/* Stats Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto"
        >
          <div className="bg-navy-800/50 border border-navy-700 rounded-lg p-6 backdrop-blur-sm">
            <div className="text-4xl font-bold text-cyan-400 mb-2">AI</div>
            <div className="text-gray-400">Powered Agents</div>
          </div>
          <div className="bg-navy-800/50 border border-navy-700 rounded-lg p-6 backdrop-blur-sm">
            <div className="text-4xl font-bold text-cyan-400 mb-2">24/7</div>
            <div className="text-gray-400">Real-time Monitoring</div>
          </div>
          <div className="bg-navy-800/50 border border-navy-700 rounded-lg p-6 backdrop-blur-sm">
            <div className="text-4xl font-bold text-cyan-400 mb-2">∞</div>
            <div className="text-gray-400">Scalable Tasks</div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};
