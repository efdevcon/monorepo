"use client";

interface MeerkatProps {
  sessionId: string;
}

export default function Meerkat({ sessionId }: MeerkatProps) {
  return (
    <div className="mt-4">
      <h2 className="font-semibold mb-2">Session Q&A</h2>
      <p className="text-gray-500">No questions yet.</p>
    </div>
  );
}
