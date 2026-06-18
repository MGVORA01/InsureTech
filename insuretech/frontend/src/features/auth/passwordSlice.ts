import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { authApi, getAuthErrorMessage } from './authApi'
import type {
  ForgotPasswordRequest,
  PasswordResponse,
  PasswordState,
  ResetPasswordRequest,
} from './auth.types'

const initialState: PasswordState = {
  loading: false,
  error: null,
  message: null,
}

export const forgotPassword = createAsyncThunk<
  PasswordResponse,
  ForgotPasswordRequest,
  { rejectValue: string }
>('password/forgotPassword', async (payload, { rejectWithValue }) => {
  try {
    return await authApi.forgotPassword(payload)
  } catch (error) {
    return rejectWithValue(getAuthErrorMessage(error))
  }
})

export const resetPassword = createAsyncThunk<
  PasswordResponse,
  ResetPasswordRequest,
  { rejectValue: string }
>('password/resetPassword', async (payload, { rejectWithValue }) => {
  try {
    return await authApi.resetPassword(payload)
  } catch (error) {
    return rejectWithValue(getAuthErrorMessage(error))
  }
})

const passwordSlice = createSlice({
  name: 'password',
  initialState,
  reducers: {
    clearPasswordState(state) {
      state.loading = false
      state.error = null
      state.message = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true
        state.error = null
        state.message = null
      })
      .addCase(forgotPassword.fulfilled, (state, action) => {
        state.loading = false
        state.message = action.payload.message
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload ?? null
      })
      .addCase(resetPassword.pending, (state) => {
        state.loading = true
        state.error = null
        state.message = null
      })
      .addCase(resetPassword.fulfilled, (state, action) => {
        state.loading = false
        state.message = action.payload.message
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload ?? null
      })
  },
})

export const { clearPasswordState } = passwordSlice.actions

export const selectPasswordState = (state: { password: PasswordState }) => state.password
export const selectPasswordLoading = (state: { password: PasswordState }) =>
  state.password.loading
export const selectPasswordError = (state: { password: PasswordState }) =>
  state.password.error
export const selectPasswordMessage = (state: { password: PasswordState }) =>
  state.password.message

export default passwordSlice.reducer
