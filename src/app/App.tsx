import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Home as HomeIcon, TreePine, Search, Plus, Sparkles } from 'lucide-react';
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

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--color-canvas)' }}>
      {/* Sidebar Navigation */}
      <nav className="sidebar">
        {/* Logo Header */}
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #E5A93C, #B47820)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 15px rgba(229, 169, 60, 0.35)',
              }}
            >
              <TreePine size={22} color="#12161A" />
            </div>
            <div>
              <div
                className="font-serif"
                style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-cream)', lineHeight: 1.1, letterSpacing: '-0.01em' }}
              >
                VerLine
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-warm-gray)', letterSpacing: '0.04em', marginTop: 2 }}>
                Your roots, in one line.
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div style={{ padding: '16px 8px', flex: 1 }}>
          {[
            { to: '/', icon: HomeIcon, label: 'Home' },
            { to: '/tree', icon: TreePine, label: 'Family Tree' },
            { to: '/search', icon: Search, label: 'Search & Kinship' },
          ].map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>

        {/* Add Member Button */}
        <div style={{ padding: '12px 16px 16px' }}>
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
              padding: '11px',
              fontWeight: 600,
              boxShadow: '0 4px 16px rgba(229, 169, 60, 0.3)',
            }}
          >
            <Plus size={18} />
            <span>Add Member</span>
          </button>
        </div>

        {/* Demo Mode Badge */}
        <div
          style={{
            padding: '12px 16px 16px',
            borderTop: '1px solid var(--surface-2)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Sparkles size={14} style={{ color: 'var(--color-amber-glow)', flexShrink: 0 }} />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3 }}>
            Demo Mode — Sharma Family
          </div>
        </div>
      </nav>

      {/* Main Content View */}
      <main style={{ flex: 1, overflow: 'hidden', position: 'relative', backgroundColor: 'var(--color-canvas)' }}>
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

        {/* Global Modals & Drawers */}
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
