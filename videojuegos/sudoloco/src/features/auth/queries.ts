import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUser,
  createUser,
  updateActiveSymbolPack,
} from '@services/firebase/users.repo';

export const userKeys = {
  profile: (uid: string) => ['user', uid, 'profile'] as const,
};

export function useUserProfile(uid: string | null | undefined) {
  return useQuery({
    queryKey: uid ? userKeys.profile(uid) : ['user', null],
    queryFn: () => getUser(uid!),
    enabled: !!uid,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      uid,
      email,
      displayName,
    }: {
      uid: string;
      email: string;
      displayName: string;
    }) => createUser(uid, email, displayName),
    onSuccess: (profile) => {
      qc.setQueryData(userKeys.profile(profile.uid), profile);
    },
  });
}

export function useUpdateSymbolPack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, packId }: { uid: string; packId: string }) =>
      updateActiveSymbolPack(uid, packId),
    onSuccess: (_, { uid, packId }) => {
      qc.setQueryData(
        userKeys.profile(uid),
        (old: Awaited<ReturnType<typeof getUser>>) => {
          if (!old) return old;
          return { ...old, active: { ...old.active, symbolPackId: packId } };
        },
      );
    },
  });
}
