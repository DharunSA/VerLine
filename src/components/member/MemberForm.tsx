import { useFormContext } from 'react-hook-form';

export interface MemberFormValues {
  name: string;
  gender: 'male' | 'female' | 'other' | 'unspecified';
  dob?: string;
  dod?: string;
  photoUrl?: string;
  profession?: string;
  location?: string;
  bio?: string;
}

interface FieldProps {
  label: string;
  name: keyof MemberFormValues;
  type?: string;
  placeholder?: string;
  required?: boolean;
}

function Field({ label, name, type = 'text', placeholder, required }: FieldProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext<MemberFormValues>();

  const error = errors[name];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--color-warm-gray)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label} {required && <span style={{ color: 'var(--color-amber-glow)' }}>*</span>}
      </label>
      <input
        {...register(name)}
        type={type}
        placeholder={placeholder}
        className="verline-input"
        style={error ? { borderColor: '#F87171' } : {}}
      />
      {error && (
        <span style={{ fontSize: 11, color: '#F87171' }}>
          {error.message as string}
        </span>
      )}
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  name: keyof MemberFormValues;
  options: { value: string; label: string }[];
  required?: boolean;
}

function SelectField({ label, name, options, required }: SelectFieldProps) {
  const { register, formState: { errors } } = useFormContext<MemberFormValues>();
  const error = errors[name];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--color-warm-gray)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label} {required && <span style={{ color: 'var(--color-amber-glow)' }}>*</span>}
      </label>
      <select
        {...register(name)}
        className="verline-input"
        style={error ? { borderColor: '#F87171' } : {}}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} style={{ background: '#1E262F', color: '#FAF7F2' }}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <span style={{ fontSize: 11, color: '#F87171' }}>
          {error.message as string}
        </span>
      )}
    </div>
  );
}

interface TextAreaFieldProps {
  label: string;
  name: keyof MemberFormValues;
  placeholder?: string;
  rows?: number;
}

function TextAreaField({ label, name, placeholder, rows = 3 }: TextAreaFieldProps) {
  const { register } = useFormContext<MemberFormValues>();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--color-warm-gray)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </label>
      <textarea
        {...register(name)}
        placeholder={placeholder}
        rows={rows}
        className="verline-input"
        style={{ resize: 'vertical', minHeight: 80 }}
      />
    </div>
  );
}

export default function MemberForm() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Name */}
      <Field label="Full Name" name="name" placeholder="e.g. Arjun Sharma" required />

      {/* Gender */}
      <SelectField
        label="Gender"
        name="gender"
        options={[
          { value: 'unspecified', label: 'Prefer not to say' },
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' },
          { value: 'other', label: 'Other' },
        ]}
      />

      {/* Dates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Date of Birth" name="dob" type="date" />
        <Field label="Date of Death" name="dod" type="date" />
      </div>

      {/* Profession & Location */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Profession" name="profession" placeholder="e.g. Doctor" />
        <Field label="Location" name="location" placeholder="e.g. Mumbai" />
      </div>

      {/* Photo URL */}
      <Field label="Photo URL" name="photoUrl" placeholder="https://..." />

      {/* Bio */}
      <TextAreaField label="Bio & Memory Notes" name="bio" placeholder="A short heirloom note about this person…" />
    </div>
  );
}

export { Field, SelectField, TextAreaField };
