export default function TestDeploy() {
  return (
    <html>
      <head>
        <title>Vercel Test</title>
      </head>
      <body style={{ margin: 0, padding: '50px', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ color: '#1d4ed8', fontSize: '48px' }}>
            ✅ SUCCESS!
          </h1>
          <p style={{ fontSize: '24px', color: '#374151' }}>
            Vercel deployment is working perfectly!
          </p>
          <div style={{ 
            marginTop: '32px', 
            padding: '16px', 
            backgroundColor: '#e2e8f0',
            borderRadius: '8px',
            display: 'inline-block'
          }}>
            <p style={{ color: '#334155', margin: 0 }}>
              <strong>Status:</strong> Frontend deployed successfully
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
