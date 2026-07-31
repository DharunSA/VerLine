import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Home as HomeIcon, TreePine, Search, Plus, Leaf } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import Home from './routes/Home';
import Tree from './routes/Tree';
import SearchPage from './routes/Search';
import Person from './routes/Person';
import AddMemberModal from '../components/member/AddMemberModal';
import MemberDrawer from '../components/member/MemberDrawer';
import ToastContainer from '../components/ui/ToastContainer';

import { usePeopleStore } from '../stores/peopleStore';
import { useUIStore } from '../stores/uiStore';

import '../styles/globals.css';

function AppLayout() {
  const seedDemoData = usePeopleStore(s => s.seedDemoData);
  const treeId = usePeopleStore(s => s.treeId);
  const openAddModal = useUIStore(s => s.openAddMemberModal);
  const location = useLocation();

  // Seed demo data on first load
  useEffect(() => {
    if (!treeId) {
      seedDemoData();
    }
  }, [treeId, seedDemoData]);

  const isTreeRoute = location.pathname === '/tree';

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <nav className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #C2672A, #8B3F12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Leaf size={20} color="white" />
            </div>
            <div>
              <div
                className="font-serif"
                style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-charcoal)', lineHeight: 1 }}
              >
                Verline
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                Your roots, in one line.
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div style={{ padding: '12px 8px', flex: 1 }}>
          {[
            { to: '/', icon: HomeIcon, label: 'Home' },
            { to: '/tree', icon: TreePine, label: 'Family Tree' },
            { to: '/search', icon: Search, label: 'Search' },
          ].map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </div>

        {/* Add Member button */}
        <div style={{ padding: '12px 16px 20px' }}>
          <button
            className="btn-primary"
            onClick={openAddModal}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              borderRadius: 'var(--radius-md)',
              padding: '10px',
            }}
          >
            <Plus size={16} />
            Add Member
          </button>
        </div>

        {/* Tree info */}
        <div
          style={{
            padding: '12px 16px 16px',
            borderTop: '1px solid var(--surface-2)',
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Demo Mode — configure Supabase to save your tree
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{ height: '100%' }}
                >
                  <Home />
                </motion.div>
              }
            />
            <Route
              path="/tree"
              element={
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{ height: '100%' }}
                >
                  <Tree />
                </motion.div>
              }
            />
            <Route
              path="/search"
              element={
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{ height: '100%', overflowY: 'auto' }}
                >
                  <SearchPage />
                </motion.div>
              }
            />
            <Route
              path="/person/:personId"
              element={
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{ height: '100%' }}
                >
                  <Person />
                </motion.div>
              }
            />
          </Routes>
        </AnimatePresence>

        {/* Global modals (available on all routes) */}
        <AddMemberModal />
        <MemberDrawer />
        <ToastContainer />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
