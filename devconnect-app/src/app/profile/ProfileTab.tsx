import { useUser } from '@/hooks/useUser';

export default function ProfileTab() {
  const { user, signOut, error, hasInitialized } = useUser();

  return (
    <div className="py-8 text-center">
      <div>{user?.email}</div>
      <button
        onClick={signOut}
        className="bg-blue-500 text-white p-2 rounded-md"
      >
        Sign out
      </button>
      {error && hasInitialized && <div>{error}</div>}
    </div>
  );
}
