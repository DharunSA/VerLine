import { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, AlertCircle, UserPlus, Edit3, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import MemberForm, { type MemberFormValues } from './MemberForm';
export type { MemberFormValues };
import RelationshipPicker from './RelationshipPicker';
import { usePeopleStore } from '../../stores/peopleStore';
import { useUIStore } from '../../stores/uiStore';
import { useAIStore } from '../../stores/aiStore';
import { findDuplicates } from '../../lib/fuzzySearch';
import type { RelationInput } from '../../engine/types';

// ─── Zod Schema ───────────────────────────────────────────────────────────────
const memberSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  gender: z.enum(['male', 'female', 'other', 'unspecified']),
  dob: z.string().optional(),
  dod: z.string().optional(),
  photoUrl: z.string().optional().or(z.literal('')),
  profession: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
});

// ─── AddMemberModal ───────────────────────────────────────────────────────────
export default function AddMemberModal() {
  const isOpen = useUIStore(s => s.isAddMemberModalOpen);
  const closeModal = useUIStore(s => s.closeAddMemberModal);
  const isEditOpen = useUIStore(s => s.isEditModalOpen);
  const closeEdit = useUIStore(s => s.closeEditModal);
  const editingPersonId = useUIStore(s => s.editingPersonId);
  const addToast = useUIStore(s => s.addToast);

  const people = usePeopleStore(s => s.people);
  const addPerson = usePeopleStore(s => s.addPerson);
  const editPerson = usePeopleStore(s => s.editPerson);
  const selectPerson = usePeopleStore(s => s.selectPerson);
  const openDrawer = useUIStore(s => s.openMemberDrawer);

  // NL prefill from AI store
  const nlResult = useAIStore(s => s.nlResult);
  const clearNLResult = useAIStore(s => s.clearNLResult);

  const mode: 'add' | 'edit' = isEditOpen ? 'edit' : 'add';
  const editingPerson = editingPersonId ? people[editingPersonId] : null;

  const [step, setStep] = useState<'details' | 'relationship'>('details');
  const [relation, setRelation] = useState<RelationInput | null>(null);
  const [duplicates, setDuplicates] = useState<ReturnType<typeof findDuplicates>>([]);
  const [saving, setSaving] = useState(false);
  const [siblingWarning, setSiblingWarning] = useState(false);

  const methods = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: { gender: 'unspecified' },
  });

  const { watch, handleSubmit, reset, setValue } = methods;
  const nameValue = watch('name');
  const dobValue = watch('dob');

  // Pre-fill form in edit mode
  useEffect(() => {
    if (mode === 'edit' && editingPerson) {
      reset({
        name: editingPerson.name,
        gender: editingPerson.gender ?? 'unspecified',
        dob: editingPerson.dob ?? '',
        dod: editingPerson.dod ?? '',
        photoUrl: editingPerson.photoUrl ?? '',
        profession: editingPerson.profession ?? '',
        location: editingPerson.location ?? '',
        bio: editingPerson.bio ?? '',
      });
    }
  }, [mode, editingPerson, reset]);

  // Pre-fill relation anchor with currently selected person from canvas if available
  useEffect(() => {
    if (mode === 'add' && isOpen && !relation && !nlResult) {
      const selectedId = usePeopleStore.getState().selectedPersonId;
      if (selectedId && people[selectedId]) {
        setRelation({
          anchorPersonId: selectedId,
          type: 'CHILD',
        });
      }
    }
  }, [isOpen, mode, relation, nlResult, people]);

  // Pre-fill from NL result
  useEffect(() => {
    if (mode === 'add' && nlResult && isOpen) {
      if (nlResult.newPersonName) setValue('name', nlResult.newPersonName);
      if (nlResult.extractedAttributes?.gender) {
        setValue('gender', nlResult.extractedAttributes.gender as MemberFormValues['gender']);
      }
      if (nlResult.extractedAttributes?.profession) setValue('profession', nlResult.extractedAttributes.profession);
      if (nlResult.extractedAttributes?.location) setValue('location', nlResult.extractedAttributes.location);
      if (nlResult.extractedAttributes?.dob) setValue('dob', nlResult.extractedAttributes.dob);
      if (nlResult.anchorPersonId) {
        const relTypeMap: Record<string, RelationInput['type']> = {
          PARENT_OF: 'PARENT',
          CHILD_OF: 'CHILD',
          SPOUSE_OF: 'SPOUSE',
          SIBLING_OF: 'SIBLING',
        };
        setRelation({
          anchorPersonId: nlResult.anchorPersonId,
          type: relTypeMap[nlResult.relationshipType] ?? 'CHILD',
        });
      }
    }
  }, [nlResult, isOpen, mode, setValue]);

  // Fuzzy duplicate detection (add mode only)
  useEffect(() => {
    if (mode !== 'add') return;
    if (!nameValue || nameValue.length < 2) {
      setDuplicates([]);
      return;
    }
    const dupes = findDuplicates(nameValue, dobValue, Object.values(people));
    setDuplicates(dupes);
  }, [nameValue, dobValue, people, mode]);

  // SIBLING warning: check if anchor has no parents
  useEffect(() => {
    if (relation?.type === 'SIBLING' && relation.anchorPersonId) {
      const graph = usePeopleStore.getState().graph;
      const parents = graph.parentsOf.get(relation.anchorPersonId) ?? [];
      setSiblingWarning(parents.length === 0);
    } else {
      setSiblingWarning(false);
    }
  }, [relation]);

  const handleClose = () => {
    if (mode === 'edit') {
      closeEdit();
    } else {
      closeModal();
      clearNLResult();
    }
    setStep('details');
    setRelation(null);
    setSiblingWarning(false);
    reset({ gender: 'unspecified' });
  };

  const handleNextStep = async () => {
    const valid = await methods.trigger();
    if (valid) {
      setStep('relationship');
    } else {
      addToast('Please enter a valid full name (at least 2 letters)', 'error');
    }
  };

  const onSubmit = async (values: MemberFormValues) => {
    if (mode === 'add' && step === 'details') {
      await handleNextStep();
      return;
    }

    setSaving(true);
    try {
      if (mode === 'edit' && editingPersonId) {
        await editPerson(editingPersonId, {
          name: values.name,
          gender: values.gender,
          dob: values.dob || undefined,
          dod: values.dod || undefined,
          photoUrl: values.photoUrl || undefined,
          profession: values.profession || undefined,
          location: values.location || undefined,
          bio: values.bio || undefined,
        });
        addToast(`${values.name} updated successfully`, 'success');
      } else {
        const personId = await addPerson(
          {
            name: values.name,
            gender: values.gender,
            dob: values.dob || undefined,
            dod: values.dod || undefined,
            photoUrl: values.photoUrl || undefined,
            profession: values.profession || undefined,
            location: values.location || undefined,
            bio: values.bio || undefined,
          },
          relation
        );
        addToast(`${values.name} added to your family tree`, 'success');
        selectPerson(personId);
        openDrawer();
      }
      handleClose();
    } catch (err) {
      addToast('Something went wrong. Please try again.', 'error');
      console.error('Failed to save person:', err);
    } finally {
      setSaving(false);
    }
  };

  const isVisible = isOpen || isEditOpen;
  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="modal-content"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh',
            overflow: 'hidden',
            background: 'var(--surface-0)',
            border: '1px solid var(--surface-2)',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px 14px',
              borderBottom: '1px solid var(--surface-2)',
              flexShrink: 0,
            }}
          >
            <div>
              <h2 className="font-serif" style={{ fontSize: 24, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-cream)' }}>
                {mode === 'edit' ? (
                  <>
                    <Edit3 size={18} color="var(--color-amber-glow)" />
                    Edit Member
                  </>
                ) : (
                  'Add Family Member'
                )}
              </h2>
              {mode === 'add' && (
                <p style={{ fontSize: 12, color: 'var(--color-warm-gray)', margin: '4px 0 0', fontWeight: 500 }}>
                  {step === 'details' ? 'Step 1 of 2 — Personal details' : 'Step 2 of 2 — Family relationship'}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: '1px solid var(--surface-2)',
                background: 'var(--surface-1)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Interactive Step Tabs Header (add mode only) */}
          {mode === 'add' && (
            <div
              style={{
                display: 'flex',
                padding: '12px 24px 0',
                gap: 12,
                borderBottom: '1px solid var(--surface-2)',
                background: 'var(--surface-1)',
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => setStep('details')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: 'none',
                  border: 'none',
                  borderBottom: `2px solid ${step === 'details' ? 'var(--color-amber-glow)' : 'transparent'}`,
                  color: step === 'details' ? 'var(--color-amber-glow)' : 'var(--color-warm-gray)',
                  fontWeight: step === 'details' ? 600 : 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 150ms',
                }}
              >
                1. Personal Details
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: 'none',
                  border: 'none',
                  borderBottom: `2px solid ${step === 'relationship' ? 'var(--color-amber-glow)' : 'transparent'}`,
                  color: step === 'relationship' ? 'var(--color-amber-glow)' : 'var(--color-warm-gray)',
                  fontWeight: step === 'relationship' ? 600 : 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 150ms',
                }}
              >
                2. Relationship
              </button>
            </div>
          )}

          {/* Form */}
          <FormProvider {...methods}>
            <form
              onSubmit={handleSubmit(onSubmit)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && mode === 'add' && step === 'details') {
                  e.preventDefault();
                  handleNextStep();
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
            >
              <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
                {(step === 'details' || mode === 'edit') ? (
                  <>
                    <MemberForm />

                    {/* NL prefill indicator */}
                    {nlResult && mode === 'add' && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          marginTop: 14,
                          padding: '10px 14px',
                          background: 'rgba(229, 169, 60, 0.12)',
                          border: '1px solid rgba(229, 169, 60, 0.3)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 13,
                          color: 'var(--color-amber-glow)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        ✨ Pre-filled from your natural language input
                      </motion.div>
                    )}

                    {/* Duplicate warning */}
                    <AnimatePresence>
                      {mode === 'add' && duplicates.length > 0 && (nameValue?.length ?? 0) > 2 && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          style={{
                            marginTop: 16,
                            padding: '12px 14px',
                            background: 'rgba(229, 169, 60, 0.12)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid rgba(229, 169, 60, 0.3)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <AlertCircle size={14} color="var(--color-amber-glow)" />
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-amber-glow)' }}>
                              Possible duplicate
                            </span>
                          </div>
                          {duplicates.map(p => (
                            <div key={p.id} style={{ fontSize: 12, color: 'var(--color-cream)' }}>
                              Did you mean{' '}<strong>{p.name}</strong>
                              {p.dob && ` (b. ${new Date(p.dob).getFullYear()})`}?
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  <>
                    <RelationshipPicker value={relation} onChange={setRelation} />
                    {siblingWarning && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          marginTop: 12,
                          padding: '10px 14px',
                          background: 'rgba(229, 169, 60, 0.12)',
                          border: '1px solid rgba(229, 169, 60, 0.3)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 12,
                          color: 'var(--color-amber-glow)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 8,
                        }}
                      >
                        <AlertCircle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
                        <span>
                          The selected person has no parents in the tree. The sibling will be added without a direct family connection — you can add their parents later.
                        </span>
                      </motion.div>
                    )}
                  </>
                )}
              </div>

              {/* Fixed Sticky Footer */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 24px',
                  borderTop: '1px solid var(--surface-2)',
                  background: 'var(--surface-0)',
                  flexShrink: 0,
                }}
              >
                {mode === 'edit' ? (
                  <>
                    <button type="button" onClick={handleClose} className="btn-secondary">
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={saving}
                      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      {saving ? <span className="spinner" style={{ borderTopColor: '#12161A' }} /> : <Edit3 size={16} />}
                      {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                  </>
                ) : step === 'details' ? (
                  <>
                    <button type="button" onClick={handleClose} className="btn-secondary">
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      Next — Relationship <ArrowRight size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setStep('details')}
                      className="btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <ArrowLeft size={16} /> Back
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={saving}
                      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      {saving ? <span className="spinner" style={{ borderTopColor: '#12161A' }} /> : <UserPlus size={16} />}
                      {saving ? 'Adding…' : 'Add to Family'}
                    </button>
                  </>
                )}
              </div>
            </form>
          </FormProvider>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
