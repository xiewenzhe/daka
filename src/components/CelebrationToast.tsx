"use client";

type CelebrationToastProps = {
  message: string;
  onClose: () => void;
};

export function CelebrationToast({ message, onClose }: CelebrationToastProps) {
  if (!message) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-6 z-50 mx-auto w-full max-w-md px-5">
      <div className="rounded-lg bg-white p-4 text-center shadow-soft ring-1 ring-brand-100">
        <p className="text-lg font-black text-brand-700">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 h-10 rounded-lg bg-brand-600 px-5 text-sm font-bold text-white active:bg-brand-700"
        >
          好呀
        </button>
      </div>
    </div>
  );
}
