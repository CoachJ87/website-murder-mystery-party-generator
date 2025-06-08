'use client';

import dynamic from 'next/dynamic';

const ReactApp = dynamic(() => import('@/src/components/ReactApp'), {
  ssr: false,
});

export default function ContactPage() {
  return <ReactApp initialRoute="/contact" />;
}