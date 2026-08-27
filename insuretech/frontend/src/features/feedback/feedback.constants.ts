export const RECOMMENDATION_OPTIONS = [
  { value: 'very_useful', label: 'Very useful' },
  { value: 'useful', label: 'Useful' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'not_useful', label: 'Not useful' },
] as const

export const FEEDBACK_MESSAGES = {
  submitSuccess: '🎉 Thank you!\n\nYour feedback helps us improve our recommendation engine.',
  submitError: 'Failed to submit feedback. Please try again.',
  loadError: 'Failed to load feedbacks.',
  empty: 'No feedback submitted yet.',
  submitButton: 'Help us improve',
  submittingButton: 'Submitting...',
  messageLabel: 'Tell us what we can improve',
  messagePlaceholder: 'Tell us what you liked or what we can improve',
  pastFeedback: 'Your Past Feedback',
} as const
