import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Better UI</h1>
        <p className="text-gray-600 mb-8">AI-first UI Framework</p>
        <Link
          href="/demo"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          View Demo
        </Link>
      </div>
    </div>
  );
}
