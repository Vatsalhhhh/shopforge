import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="text-center animate-slide-up">
        <p className="text-9xl font-display font-bold text-gray-100 select-none">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-4">Page Not Found</h1>
        <p className="text-gray-500 mt-2 mb-8">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/" className="btn btn-md btn-primary">Go Home</Link>
      </div>
    </div>
  );
}
