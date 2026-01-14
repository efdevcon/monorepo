// Example import from lib workspace
import { leftPadNumber } from "lib/utils";

export default function Home() {
  const exampleNumber = leftPadNumber(5);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold mb-4">Hello World!</h1>
        <p className="text-lg mb-2">Welcome to Perks Portal</p>
        <p className="text-sm text-gray-600 mb-2">
          This project can import from the lib workspace ✓
        </p>
        <p className="text-sm text-gray-600">
          Example: leftPadNumber(5) = {exampleNumber}
        </p>
      </div>
    </main>
  );
}
