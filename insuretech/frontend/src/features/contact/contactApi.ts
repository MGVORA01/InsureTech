import baseApi from '../../api/baseApi'

export interface ContactPayload {
  name: string
  email: string
  message: string
}

export async function submitContact(payload: ContactPayload): Promise<void> {
  await baseApi.post('/contact', payload)
}
