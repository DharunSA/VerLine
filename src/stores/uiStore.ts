import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface UIStore {
  // Drawer/modal state
  isMemberDrawerOpen: boolean;
  isAddMemberModalOpen: boolean;
  isNLBarOpen: boolean;
  isEditModalOpen: boolean;
  editingPersonId: string | null;

  // View state
  activeRoute: 'home' | 'tree' | 'search' | 'person';
  searchQuery: string;

  // Canvas state
  focusPersonId: string | null;   // person to center canvas on
  collapsedBranches: Set<string>; // root IDs of collapsed branches

  // Toast notifications
  toasts: Toast[];

  // Actions
  openMemberDrawer: () => void;
  closeMemberDrawer: () => void;
  openAddMemberModal: () => void;
  closeAddMemberModal: () => void;
  openEditModal: (personId: string) => void;
  closeEditModal: () => void;
  toggleNLBar: () => void;
  setSearchQuery: (q: string) => void;
  setActiveRoute: (route: UIStore['activeRoute']) => void;
  focusPerson: (id: string | null) => void;
  toggleBranchCollapse: (rootId: string) => void;
  isBranchCollapsed: (rootId: string) => boolean;
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  isMemberDrawerOpen: false,
  isAddMemberModalOpen: false,
  isNLBarOpen: false,
  isEditModalOpen: false,
  editingPersonId: null,
  activeRoute: 'home',
  searchQuery: '',
  focusPersonId: null,
  collapsedBranches: new Set(),
  toasts: [],

  openMemberDrawer: () => set({ isMemberDrawerOpen: true }),
  closeMemberDrawer: () => set({ isMemberDrawerOpen: false }),
  openAddMemberModal: () => set({ isAddMemberModalOpen: true }),
  closeAddMemberModal: () => set({ isAddMemberModalOpen: false }),
  openEditModal: (personId) => set({ isEditModalOpen: true, editingPersonId: personId }),
  closeEditModal: () => set({ isEditModalOpen: false, editingPersonId: null }),
  toggleNLBar: () => set(s => ({ isNLBarOpen: !s.isNLBarOpen })),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setActiveRoute: (route) => set({ activeRoute: route }),
  focusPerson: (id) => set({ focusPersonId: id }),

  toggleBranchCollapse: (rootId) =>
    set(s => {
      const next = new Set(s.collapsedBranches);
      if (next.has(rootId)) next.delete(rootId);
      else next.add(rootId);
      return { collapsedBranches: next };
    }),

  isBranchCollapsed: (rootId) => get().collapsedBranches.has(rootId),

  addToast: (message, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }));
    // Auto-remove after 3.5 seconds
    setTimeout(() => {
      get().removeToast(id);
    }, 3500);
  },

  removeToast: (id) =>
    set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}));
