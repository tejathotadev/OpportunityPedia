import { RouterProvider } from 'react-router-dom'

import { Toaster } from '@/app/components/feedback/Toaster'
import { router } from '@/routes/router'

export function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  )
}
