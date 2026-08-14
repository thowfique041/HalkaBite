import React, { useEffect, useRef, useState } from 'react';
import { Camera, ImageMinus, LoaderCircle, Save, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import UserAvatar from '../../components/common/UserAvatar';
import { useAppSelector } from '../../store/hooks';
import { useRemoveProfileAvatarMutation, useUpdateProfileMutation, useUploadProfileAvatarMutation } from '../../store/api/authApi';
import { formatAdminDate, formatAdminDateTime } from '../../utils/adminDateTime';

const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxBytes = 5 * 1024 * 1024;
const errorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'data' in error) {
    const data = (error as { data?: { message?: string } }).data;
    if (data?.message) return data.message;
  }
  return fallback;
};

const AdminProfilePage: React.FC = () => {
  const user = useAppSelector(state => state.auth.user);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState('');
  const [dragging, setDragging] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', email: '', phone: '', bio: '' });
  const [updateProfile, { isLoading: savingDetails }] = useUpdateProfileMutation();
  const [uploadAvatar, { isLoading: savingAvatar }] = useUploadProfileAvatarMutation();
  const [removeAvatar, { isLoading: removingAvatar }] = useRemoveProfileAvatarMutation();

  useEffect(() => {
    if (user) setForm({ name: user.name || '', username: user.username || '', email: user.email || '', phone: user.phone || '', bio: user.bio || '' });
  }, [user]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const chooseFile = (candidate?: File) => {
    if (!candidate) return;
    if (!acceptedTypes.includes(candidate.type)) return toast.error('Use a JPEG, PNG, or WebP image');
    if (candidate.size > maxBytes) return toast.error('Profile picture must be 5 MB or smaller');
    if (preview) URL.revokeObjectURL(preview);
    setFile(candidate);
    setPreview(URL.createObjectURL(candidate));
  };
  const saveAvatar = async () => {
    if (!file) return;
    const body = new FormData(); body.append('avatar', file);
    try {
      const result = await uploadAvatar(body).unwrap();
      toast.success(result.message || 'Profile picture updated');
      URL.revokeObjectURL(preview); setPreview(''); setFile(undefined);
    } catch (error) { toast.error(errorMessage(error, 'Profile picture upload failed')); }
  };
  const deleteAvatar = async () => {
    try { const result = await removeAvatar().unwrap(); toast.success(result.message || 'Profile picture removed'); setFile(undefined); if (preview) URL.revokeObjectURL(preview); setPreview(''); }
    catch (error) { toast.error(errorMessage(error, 'Profile picture could not be removed')); }
  };
  const saveDetails = async (event: React.FormEvent) => {
    event.preventDefault();
    try { const { name: _systemControlledName, ...editableFields } = form; void _systemControlledName; const result = await updateProfile(editableFields).unwrap(); toast.success(result.message || 'Profile updated'); }
    catch (error) { toast.error(errorMessage(error, 'Profile update failed')); }
  };

  if (!user) return <div className="card p-10 text-center text-white/50">Profile information is unavailable.</div>;
  const busy = savingAvatar || removingAvatar;

  return <div className="mx-auto max-w-5xl space-y-6">
    <header><p className="font-medium text-primary-400">Personal account</p><h1 className="mt-1 text-3xl font-bold">Admin Profile</h1><p className="mt-2 text-white/50">Manage your identity and contact information. Application preferences live in Settings.</p></header>
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <section className="card p-6">
        <div
          onDragEnter={event => { event.preventDefault(); setDragging(true); }} onDragOver={event => event.preventDefault()}
          onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files[0]); }}
          className={`rounded-3xl border-2 border-dashed p-6 text-center transition ${dragging ? 'border-primary-400 bg-primary-500/10' : 'border-white/10'}`}
        >
          <button type="button" onClick={() => inputRef.current?.click()} className="group relative mx-auto block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400" aria-label="Choose a profile picture">
            <UserAvatar name={user.name} src={preview || user.avatar} className="h-36 w-36 text-3xl" />
            <span className="absolute inset-0 grid place-items-center rounded-full bg-black/55 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"><Camera /></span>
          </button>
          <input ref={inputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={event => chooseFile(event.target.files?.[0])} />
          <h2 className="mt-4 text-xl font-bold">{user.name}</h2><p className="text-sm capitalize text-white/45">{user.role}</p>
          <p className="mt-4 text-xs leading-5 text-white/40">Click the avatar or drop an image here.<br/>JPEG, PNG or WebP · maximum 5 MB</p>
        </div>
        <div className="mt-4 grid gap-2">
          {file && <button onClick={saveAvatar} disabled={busy} className="btn btn-primary py-2.5">{savingAvatar ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin"/> : <UploadCloud className="mr-2 h-4 w-4"/>}Save New Picture</button>}
          {(user.avatar || file) && <button onClick={file ? () => { URL.revokeObjectURL(preview); setPreview(''); setFile(undefined); } : deleteAvatar} disabled={busy} className="btn btn-ghost py-2.5 text-red-300">{removingAvatar ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin"/> : <ImageMinus className="mr-2 h-4 w-4"/>}{file ? 'Discard Preview' : 'Remove Picture'}</button>}
        </div>
      </section>

      <form onSubmit={saveDetails} className="card p-6 sm:p-8">
        <h2 className="text-xl font-bold">Personal Information</h2><p className="mt-1 text-sm text-white/45">Only information related to your administrator identity.</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="text-sm text-white/60">Full Name <span className="float-right text-xs text-white/35">System controlled</span><input disabled className="input mt-2 cursor-not-allowed opacity-60" value={form.name}/></label>
          <label className="text-sm text-white/60">Username<input minLength={3} maxLength={30} pattern="[A-Za-z0-9._-]+" className="input mt-2" value={form.username} onChange={event => setForm({...form,username:event.target.value})} placeholder="admin.username"/></label>
          <label className="text-sm text-white/60">Email<input required type="email" className="input mt-2" value={form.email} onChange={event => setForm({...form,email:event.target.value})}/></label>
          <label className="text-sm text-white/60">Phone<input type="tel" className="input mt-2" value={form.phone} onChange={event => setForm({...form,phone:event.target.value})} placeholder="01XXXXXXXXX"/></label>
          <label className="text-sm text-white/60 sm:col-span-2">Bio <span className="float-right text-xs text-white/30">{form.bio.length}/300</span><textarea maxLength={300} className="input mt-2 min-h-28 resize-y" value={form.bio} onChange={event => setForm({...form,bio:event.target.value})} placeholder="A short professional biography"/></label>
        </div>
        <div className="mt-6 grid gap-3 rounded-2xl bg-white/[0.035] p-4 text-sm sm:grid-cols-3">
          <p><span className="block text-white/35">Date Joined</span><b>{user.createdAt ? formatAdminDate(user.createdAt) : 'Not recorded'}</b></p>
          <p><span className="block text-white/35">Last Login</span><b>{user.lastLogin ? formatAdminDateTime(user.lastLogin) : 'Not recorded'}</b></p>
          <p><span className="block text-white/35">Role</span><b className="capitalize">{user.role}</b></p>
        </div>
        <button disabled={savingDetails} className="btn btn-primary mt-6"><Save className="mr-2 h-4 w-4"/>{savingDetails ? 'Saving…' : 'Save Personal Information'}</button>
      </form>
    </div>
  </div>;
};

export default AdminProfilePage;
