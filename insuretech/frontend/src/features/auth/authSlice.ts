import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../../store/store'
import { authApi, getAuthErrorMessage } from './authApi'
import type {
  AuthResponse,
  AuthState,
  CurrentUserResponse,
  LoginFormData,
  PasswordResponse,
  RegisterFormData,
  User,
} from './auth.types'

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  status: 'idle',
}

export const registerUser = createAsyncThunk<
  AuthResponse,
  RegisterFormData,
  { rejectValue: string }
>('auth/registerUser', async (payload, { rejectWithValue }) => {
  try {
    return await authApi.register(payload)
  } catch (error) {
    return rejectWithValue(getAuthErrorMessage(error))
  }
})

export const loginUser = createAsyncThunk<
  AuthResponse,
  LoginFormData,
  { rejectValue: string }
>('auth/loginUser', async (payload, { rejectWithValue }) => {
  try {
    return await authApi.login(payload)
  } catch (error) {
    return rejectWithValue(getAuthErrorMessage(error))
  }
})

export const fetchCurrentUser = createAsyncThunk<
  CurrentUserResponse,
  void,
  { rejectValue: string }
>('auth/fetchCurrentUser', async (_, { rejectWithValue }) => {
  try {
    return await authApi.me()
  } catch (error) {
    return rejectWithValue(getAuthErrorMessage(error))
  }
})

export const refreshToken = createAsyncThunk<
  PasswordResponse,
  void,
  { rejectValue: string }
>('auth/refreshToken', async (_, { rejectWithValue }) => {
  try {
    // TODO: Backend endpoint is pending. authApi.refreshToken currently returns a
    // typed no-op response and does not execute a network request.
    return await authApi.refreshToken()
  } catch (error) {
    return rejectWithValue(getAuthErrorMessage(error))
  }
})

export const logoutUser = createAsyncThunk<
  PasswordResponse,
  void,
  { rejectValue: string }
>('auth/logoutUser', async (_, { rejectWithValue }) => {
  try {
    // TODO: Backend endpoint is pending. authApi.logout currently returns a
    // typed no-op response and does not execute a network request.
    return await authApi.logout()
  } catch (error) {
    return rejectWithValue(getAuthErrorMessage(error))
  }
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload
      state.isAuthenticated = true
      state.status = 'authenticated'
      state.error = null
    },
    clearUser(state) {
      state.user = null
      state.isAuthenticated = false
      state.status = 'unauthenticated'
      state.error = null
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
      state.status = action.payload ? 'loading' : state.status
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload
      state.status = action.payload ? 'failed' : state.status
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true
        state.error = null
        state.status = 'loading'
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.loading = false
        state.user = null
        state.isAuthenticated = false
        state.status = 'unauthenticated'
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload ?? null
        state.isAuthenticated = false
        state.status = 'failed'
      })
      .addCase(loginUser.pending, (state) => {
        state.loading = true
        state.error = null
        state.status = 'loading'
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false
        state.error = null
        if (action.payload.user) {
          state.user = action.payload.user
          state.isAuthenticated = true
          state.status = 'authenticated'
        } else {
          state.status = 'idle'
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload ?? null
        state.isAuthenticated = false
        state.status = 'failed'
      })
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true
        state.error = null
        state.status = 'loading'
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload.user
        state.isAuthenticated = true
        state.status = 'authenticated'
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.loading = false
        state.user = null
        state.isAuthenticated = false
        state.error = action.payload ?? null
        state.status = 'unauthenticated'
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.error = action.payload ?? null
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null
        state.isAuthenticated = false
        state.loading = false
        state.error = null
        state.status = 'unauthenticated'
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload ?? null
        state.status = 'failed'
      })
  },
})

export const { clearUser, setError, setLoading, setUser } = authSlice.actions

export const selectAuth = (state: RootState) => state.auth
export const selectAuthUser = (state: RootState) => state.auth.user
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated
export const selectAuthLoading = (state: RootState) => state.auth.loading
export const selectAuthError = (state: RootState) => state.auth.error
export const selectAuthStatus = (state: RootState) => state.auth.status

export default authSlice.reducer
