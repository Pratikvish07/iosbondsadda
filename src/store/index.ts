import { combineReducers, configureStore, createAsyncThunk } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

import { bondsAddaApi } from './api/bondsAddaApi';
import authReducer, { endSession } from './slices/authSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  [bondsAddaApi.reducerPath]: bondsAddaApi.reducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefault) => getDefault().concat(bondsAddaApi.middleware),
  devTools: __DEV__,
});

// Enables refetchOnFocus / refetchOnReconnect behaviours.
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;

/** Clears the stored session and every cached API response belonging to the previous user. */
export const signOut = createAsyncThunk('auth/signOut', async (_: void, { dispatch }) => {
  await dispatch(endSession());
  dispatch(bondsAddaApi.util.resetApiState());
});
