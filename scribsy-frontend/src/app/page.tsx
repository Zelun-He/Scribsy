export default function Home() {
  return (
    <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#059669', fontSize: '48px' }}>
        Welcome to Scribsy
      </h1>
      <p style={{ fontSize: '24px', color: '#374151' }}>
        AI-Powered Clinical Documentation
      </p>
      <div style={{ marginTop: '32px' }}>
        <a 
          href="/login" 
          style={{ 
            backgroundColor: '#059669', 
            color: 'white', 
            padding: '12px 24px', 
            textDecoration: 'none', 
            borderRadius: '8px',
            marginRight: '16px'
          }}
        >
          Sign In
        </a>
        <a 
          href="/register" 
          style={{ 
            backgroundColor: '#10b981', 
            color: 'white', 
            padding: '12px 24px', 
            textDecoration: 'none', 
            borderRadius: '8px'
          }}
        >
          Get Started
        </a>
      </div>
    </div>
  );
}