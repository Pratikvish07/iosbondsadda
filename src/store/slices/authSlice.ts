import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { clearSession, loadSession, saveSession, type Session } from '@/lib/secureSession';

export type AuthStatus = 'restoring' | 'signedOut' | 'signedIn';

export interface AuthState {
  status: AuthStatus;
  session: Session | null;
}

const initialState: AuthState = { status: 'restoring', session: null };

export const restoreSession = createAsyncThunk('auth/restore', () => loadSession());

/** Persists the session to SecureStore, then marks the user signed in. */
export const startSession = createAsyncThunk('auth/start', async (session: Session) => {
  await saveSession(session);
  return session;
});

/** Clears SecureStore. Use `signOut` from `@/store` so cached API data is dropped too. */
export const endSession = createAsyncThunk('auth/end', () => clearSession());

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    profileUpdated(state, action: PayloadAction<Partial<Omit<Session, 'customerId' | 'token'>>>) {
      if (state.session) state.session = { ...state.session, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.session = action.payload;
        state.status = action.payload ? 'signedIn' : 'signedOut';
      })
      .addCase(restoreSession.rejected, (state) => {
        state.session = null;
        state.status = 'signedOut';
      })
      .addCase(startSession.fulfilled, (state, action) => {
        state.session = action.payload;
        state.status = 'signedIn';
      })
      // Sign the user out locally even if the keychain delete failed.
      .addCase(endSession.fulfilled, () => ({ status: 'signedOut', session: null }))
      .addCase(endSession.rejected, () => ({ status: 'signedOut', session: null }));
  },
});

export const { profileUpdated } = authSlice.actions;
export default authSlice.reducer;
