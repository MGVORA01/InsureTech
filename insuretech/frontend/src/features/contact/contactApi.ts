import baseApi from '../../config/api'

export interface ContactPayload {
  name: string
  email: string
  message: string
}

export async function submitContact(payload: ContactPayload): Promise<void> {
  await baseApi.post('/contact', payload)
}
