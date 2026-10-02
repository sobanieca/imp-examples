import { component } from 'imp'
import { useState } from 'imp/state'
import { button } from 'imp/std'
import { submitForm } from 'imp/std/inputs'

// The primary button of a form. It spins while the form's onSubmit runs.
export const submitButton = component('beacon-submit-button', {
  setup: (self, label) =>
    button(
      {
        variant: 'primary',
        loading: useState(self, 'imp.form.submitting'),
        events: { click: submitForm },
      },
      label,
    ),
})
