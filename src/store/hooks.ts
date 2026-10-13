import { useDispatch, useSelector } from 'react-redux';

import type { AppDispatch, RootState } from './index';

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

export const useSession = () => useAppSelector((state) => state.auth.session);
export const useAuthStatus = () => useAppSelector((state) => state.auth.status);

/** Customer id of the signed-in user. Screens behind the auth guard can rely on it being set. */
export const useCustomerId = () => useAppSelector((state) => state.auth.session?.customerId ?? '');
