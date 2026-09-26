import { redirect } from 'next/navigation';

// Backward-compatible redirect: the old standalone Check-in page now lives as the
// "Scan Camera" tab inside the unified Check-in & Attendance workspace.
export default function CheckInRedirect() {
  redirect('/dashboard/attendance?mode=camera');
}
