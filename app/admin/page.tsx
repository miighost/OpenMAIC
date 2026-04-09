'use client';

import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { firebaseAuth, googleProvider } from '@/lib/firebase/client';
import {
  AppPlan,
  AppUser,
  AppUserRole,
  ensureUserDocument,
  getUserById,
  listUsers,
  updateUserAdminFields,
} from '@/lib/firebase/admin-users';

const ROLE_OPTIONS: AppUserRole[] = ['owner', 'admin', 'member'];
const PLAN_OPTIONS: AppPlan[] = ['free', 'pro', 'enterprise'];

function isAdminRole(role: AppUserRole): boolean {
  return role === 'owner' || role === 'admin';
}

export default function AdminPage() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingUid, setSavingUid] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, async (user) => {
      setAuthUser(user);
      setError(null);

      if (!user?.uid || !user.email) {
        setProfile(null);
        setUsers([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        await ensureUserDocument(user.uid, user.email, user.displayName);
        const me = await getUserById(user.uid);
        setProfile(me);

        if (me && isAdminRole(me.role)) {
          const allUsers = await listUsers();
          setUsers(allUsers);
        } else {
          setUsers([]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load admin data');
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.displayName ?? '').toLowerCase().includes(q) ||
        u.uid.toLowerCase().includes(q),
    );
  }, [users, search]);

  async function handleGoogleSignIn() {
    setError(null);
    try {
      await signInWithPopup(firebaseAuth, googleProvider);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed');
    }
  }

  async function handleSignOut() {
    await signOut(firebaseAuth);
  }

  async function handlePatch(uid: string, patch: Pick<AppUser, 'role' | 'plan' | 'premium' | 'isActive'>) {
    try {
      setSavingUid(uid);
      setError(null);
      await updateUserAdminFields(uid, patch);
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, ...patch } : u)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update user');
    } finally {
      setSavingUid(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-10">
        <div className="mx-auto max-w-6xl">Loading admin panel...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 md:p-6">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Admin User Management</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
            Manage user roles, subscription plans, premium access, and active status.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full px-3 py-1 bg-slate-100 dark:bg-slate-800">
              Signed in: {authUser?.email ?? 'No user'}
            </span>
            {authUser ? (
              <button
                type="button"
                className="rounded-lg border px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={handleSignOut}
              >
                Sign out
              </button>
            ) : (
              <button
                type="button"
                className="rounded-lg border px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={handleGoogleSignIn}
              >
                Sign in with Google
              </button>
            )}
          </div>
        </header>

        {error ? (
          <div className="rounded-lg border border-red-300 bg-red-50 text-red-700 px-4 py-3">{error}</div>
        ) : null}

        {!authUser ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-800 px-4 py-3">
            Please sign in first.
          </div>
        ) : profile && !isAdminRole(profile.role) ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-800 px-4 py-3">
            Access denied. Your role is <strong>{profile.role}</strong>. Ask an owner/admin to grant access.
          </div>
        ) : null}

        {authUser && profile && isAdminRole(profile.role) ? (
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:p-6">
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
              <h2 className="text-lg font-medium">Users ({filteredUsers.length})</h2>
              <input
                type="text"
                placeholder="Search email / name / uid"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full md:w-80 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2 pr-4">User</th>
                    <th className="py-2 pr-4">Role</th>
                    <th className="py-2 pr-4">Plan</th>
                    <th className="py-2 pr-4">Premium</th>
                    <th className="py-2 pr-4">Active</th>
                    <th className="py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <AdminUserRow key={u.uid} user={u} saving={savingUid === u.uid} onSave={handlePatch} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function AdminUserRow({
  user,
  saving,
  onSave,
}: {
  user: AppUser;
  saving: boolean;
  onSave: (uid: string, patch: Pick<AppUser, 'role' | 'plan' | 'premium' | 'isActive'>) => Promise<void>;
}) {
  const [role, setRole] = useState<AppUserRole>(user.role);
  const [plan, setPlan] = useState<AppPlan>(user.plan);
  const [premium, setPremium] = useState<boolean>(user.premium);
  const [isActive, setIsActive] = useState<boolean>(user.isActive);

  useEffect(() => {
    setRole(user.role);
    setPlan(user.plan);
    setPremium(user.premium);
    setIsActive(user.isActive);
  }, [user]);

  return (
    <tr className="border-b border-slate-100 dark:border-slate-800 align-top">
      <td className="py-3 pr-4">
        <p className="font-medium">{user.displayName || 'No name'}</p>
        <p className="text-slate-500">{user.email}</p>
        <p className="text-xs text-slate-400 mt-1">{user.uid}</p>
      </td>
      <td className="py-3 pr-4">
        <select
          className="rounded border px-2 py-1 bg-transparent"
          value={role}
          onChange={(e) => setRole(e.target.value as AppUserRole)}
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </td>
      <td className="py-3 pr-4">
        <select
          className="rounded border px-2 py-1 bg-transparent"
          value={plan}
          onChange={(e) => setPlan(e.target.value as AppPlan)}
        >
          {PLAN_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </td>
      <td className="py-3 pr-4">
        <input type="checkbox" checked={premium} onChange={(e) => setPremium(e.target.checked)} />
      </td>
      <td className="py-3 pr-4">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
      </td>
      <td className="py-3">
        <button
          type="button"
          disabled={saving}
          className="rounded-lg border px-3 py-1.5 disabled:opacity-60 hover:bg-slate-100 dark:hover:bg-slate-800"
          onClick={() => onSave(user.uid, { role, plan, premium, isActive })}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </td>
    </tr>
  );
}

