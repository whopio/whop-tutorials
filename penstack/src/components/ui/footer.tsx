export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white py-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4">
        <p className="text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Penstack
        </p>
        <a
          href="https://whop.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Built with Whop
        </a>
      </div>
    </footer>
  );
}
