'use client';

import { useParams } from 'next/navigation';

export default function TestPage() {
  const params = useParams();
  
  return (
    <div className="p-4">
      <h1>Test Page</h1>
      <p>Params: {JSON.stringify(params)}</p>
      <p>ID: {params.id}</p>
    </div>
  );
}