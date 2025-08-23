export default function TestDeploy() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          ✅ Vercel Deployment Test
        </h1>
        <p className="text-xl text-gray-600">
          If you can see this page, your Vercel deployment is working!
        </p>
        <div className="mt-8 p-4 bg-green-100 rounded-lg">
          <p className="text-green-800">
            <strong>Status:</strong> Frontend is successfully deployed
          </p>
        </div>
      </div>
    </div>
  );
}
