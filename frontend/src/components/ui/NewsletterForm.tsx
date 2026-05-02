"use client";

export function NewsletterForm({ dark }: { dark?: boolean }) {
  return (
    <form
      className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
      onSubmit={(e) => e.preventDefault()}
    >
      <input
        type="email"
        required
        placeholder="Enter your email"
        className={`flex-1 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${
          dark
            ? "bg-white/10 border border-white/20 text-white placeholder-brand-300"
            : "input"
        }`}
      />
      <button
        type="submit"
        className={`shrink-0 px-6 py-3 font-semibold rounded-xl text-sm transition-colors ${
          dark
            ? "bg-white text-brand-700 hover:bg-gray-100"
            : "btn btn-md btn-primary"
        }`}
      >
        Subscribe
      </button>
    </form>
  );
}
