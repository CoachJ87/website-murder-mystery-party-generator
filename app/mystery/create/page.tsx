'use client';

import dynamic from 'next/dynamic';

const ReactApp = dynamic(() => import('@/src/components/ReactApp'), {
  ssr: false,
});

export default function MysteryCreatePage() {
  return <ReactApp initialRoute="/mystery/create" />;
}