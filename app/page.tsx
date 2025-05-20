import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to login or dashboard based on authentication status
  redirect('/login');
}