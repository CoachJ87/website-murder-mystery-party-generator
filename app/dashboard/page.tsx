'use client';

import dynamic from 'next/dynamic';

// Dynamically import the React app with no SSR
const ReactApp = dynamic(() => import('@/src/components/ReactApp'), {
  ssr: false,
});

export default function DashboardPage() {
  return <ReactApp initialRoute="/dashboard" />;
}